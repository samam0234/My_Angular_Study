import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function loadEnvFile(file) {
  if (!existsSync(file)) {
    return;
  }
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq < 1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(join(dirname(fileURLToPath(import.meta.url)), '.env'));

const secret = process.env.BOARD_TOKEN_SECRET || 'dev-only-change-me';
const posts = Array.from({ length: 100 }, (_, index) => ({
  id: index + 1,
  userId: 1,
  title: `서버 글 ${index + 1}`,
  body: `로컬 API가 보관한 본문 ${index + 1}`,
}));
let nextId = 101;
const startedAt = Date.now();

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${signature}`;
}

function verify(token) {
  const [body, signature] = String(token ?? '').split('.');
  if (!body || !signature) {
    return null;
  }
  const expected = createHmac('sha256', secret).update(body).digest('base64url');
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (typeof payload.exp !== 'number' || payload.exp < Date.now()) {
    return null;
  }
  return payload;
}

function readCookie(header, name) {
  for (const part of String(header ?? '').split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return '';
}

function userFrom(payload) {
  return { name: payload.name, email: payload.email, role: payload.role };
}

function send(response, status, body, extraHeaders = {}) {
  const requestId = extraHeaders['X-Request-Id'] ?? randomUUID();
  const payload = body === undefined ? '' : JSON.stringify(body);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Request-Id': requestId,
    ...extraHeaders,
  });
  response.end(payload);
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

function session(request) {
  return verify(readCookie(request.headers.cookie, 'board_token'));
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  const path = url.pathname;

  if (request.method === 'GET' && path === '/api/health') {
    send(response, 200, { ok: true, uptimeSec: Math.floor((Date.now() - startedAt) / 1000) });
    return;
  }

  if (request.method === 'POST' && path === '/api/login') {
    const body = await readBody(request);
    const email = String(body.email ?? '');
    const password = String(body.password ?? '');
    if (!email.includes('@') || password.length < 8) {
      send(response, 401, { message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
      return;
    }
    const role = email === 'admin@example.com' ? 'admin' : 'user';
    const name = email.split('@')[0];
    const token = sign({ email, name, role, exp: Date.now() + 12 * 60 * 60 * 1000 });
    send(response, 200, { email, name, role }, {
      'Set-Cookie': `board_token=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/`,
    });
    return;
  }

  if (request.method === 'POST' && path === '/api/logout') {
    send(response, 200, { ok: true }, {
      'Set-Cookie': 'board_token=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0',
    });
    return;
  }

  if (request.method === 'GET' && path === '/api/me') {
    const payload = session(request);
    if (!payload) {
      send(response, 401, { message: '로그인이 필요합니다.' });
      return;
    }
    send(response, 200, userFrom(payload));
    return;
  }

  if (request.method === 'GET' && path === '/api/admin/status') {
    const payload = session(request);
    if (!payload) {
      send(response, 401, { message: '로그인이 필요합니다.' });
      return;
    }
    if (payload.role !== 'admin') {
      send(response, 403, { message: '관리자만 볼 수 있습니다.' });
      return;
    }
    send(response, 200, { ok: true, email: payload.email });
    return;
  }

  if (request.method === 'POST' && path === '/api/summarize') {
    const body = await readBody(request);
    const text = String(body.text ?? '').trim();
    if (!text) {
      send(response, 200, { summary: '요약할 문장이 없습니다.' });
      return;
    }
    const key = process.env.OPENAI_API_KEY || process.env.AI_API_KEY || '';
    if (!key) {
      send(response, 200, {
        summary: `목 응답: "${text.slice(0, 40)}" — API 키가 없어 서버를 호출하지 않았습니다.`,
      });
      return;
    }
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: '한 문장으로 한국어 요약만 답한다.' },
          { role: 'user', content: text },
        ],
      }),
    });
    const result = await upstream.json();
    send(response, 200, { summary: result.choices?.[0]?.message?.content?.trim() || '요약 결과가 비어 있습니다.' });
    return;
  }

  const commentMatch = path.match(/^\/api\/posts\/(\d+)\/comments$/);
  if (request.method === 'GET' && commentMatch) {
    const postId = Number(commentMatch[1]);
    send(response, 200, [
      { id: postId * 10 + 1, postId, name: '로컬', email: 'local@example.com', body: `댓글 ${postId}` },
    ]);
    return;
  }

  const oneMatch = path.match(/^\/api\/posts\/(\d+)$/);
  if (oneMatch) {
    const id = Number(oneMatch[1]);
    const index = posts.findIndex((post) => post.id === id);
    if (request.method === 'GET') {
      if (index < 0) {
        send(response, 404, { message: '글이 없습니다.' });
        return;
      }
      send(response, 200, posts[index]);
      return;
    }
    if (request.method === 'PUT') {
      if (index < 0) {
        send(response, 404, { message: '글이 없습니다.' });
        return;
      }
      const body = await readBody(request);
      posts[index] = { ...posts[index], title: String(body.title ?? posts[index].title), body: String(body.body ?? posts[index].body) };
      send(response, 200, posts[index]);
      return;
    }
    if (request.method === 'DELETE') {
      if (index < 0) {
        send(response, 404, { message: '글이 없습니다.' });
        return;
      }
      posts.splice(index, 1);
      send(response, 200, {});
      return;
    }
  }

  if (path === '/api/posts' && request.method === 'GET') {
    const page = Number(url.searchParams.get('_page') ?? '1');
    const limit = Number(url.searchParams.get('_limit') ?? '10');
    const start = Math.max(0, (page - 1) * limit);
    send(response, 200, posts.slice(start, start + limit));
    return;
  }

  if (path === '/api/posts' && request.method === 'POST') {
    const body = await readBody(request);
    const created = {
      id: nextId++,
      userId: 1,
      title: String(body.title ?? ''),
      body: String(body.body ?? ''),
    };
    posts.unshift(created);
    send(response, 201, created);
    return;
  }

  send(response, 404, { message: '없는 주소입니다.' });
});

async function selfTest() {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  const login = await fetch(`${base}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
  });
  const cookie = login.headers.get('set-cookie') ?? '';
  const me = await fetch(`${base}/api/me`, { headers: { cookie: cookie.split(';')[0] } });
  const list = await fetch(`${base}/api/posts?_page=1&_limit=10`);
  const forbidden = await fetch(`${base}/api/admin/status`, { headers: { cookie: cookie.split(';')[0] } });
  const health = await fetch(`${base}/api/health`);
  const summary = await fetch(`${base}/api/summarize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: '키 없는 요약' }),
  });
  const user = await me.json();
  const page = await list.json();
  const summaryText = (await summary.json()).summary ?? '';
  const keyLoaded = Boolean(process.env.OPENAI_API_KEY || process.env.AI_API_KEY);
  const summaryOk = keyLoaded || summaryText.includes('API 키가 없어');
  if (!cookie.includes('HttpOnly') || user.email !== 'test@example.com' || page.length !== 10 || forbidden.status !== 403 || !(await health.json()).ok || !summaryOk) {
    console.error('board-api self-test failed');
    process.exitCode = 1;
  } else {
    console.log('board-api self-test ok');
  }
  server.close();
}

if (process.argv.includes('--self-test')) {
  selfTest();
} else {
  const port = Number(process.env.PORT ?? 5080);
  server.listen(port, '0.0.0.0', () => {
    console.log(`board-api listening on ${port}`);
  });
}
