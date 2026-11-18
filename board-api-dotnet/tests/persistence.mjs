import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const base = process.env.API_BASE_URL ?? 'http://127.0.0.1:5080';
const compose = fileURLToPath(new URL('../../project/docker-compose.yml', import.meta.url));
const headers = { 'Content-Type': 'application/json', 'X-Board-Request': '1' };
const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers,
  body: JSON.stringify({ email: 'test@example.com', password: 'password123' }) });
assert.equal(login.status, 200);
const { accessToken } = (await login.json()).data;
headers.Authorization = `Bearer ${accessToken}`;
const created = await fetch(`${base}/api/posts`, { method: 'POST', headers,
  body: JSON.stringify({ title: `재시작-${Date.now()}`, body: '볼륨과 SQL 저장 확인', tags: ['persistence'] }) });
assert.equal(created.status, 201);
const post = (await created.json()).data;
try {
  execFileSync('docker', ['compose', '-f', compose, 'restart', 'db', 'api'], { stdio: 'pipe', timeout: 90000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try { ready = (await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(2000) })).ok; } catch {}
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  assert.ok(ready, 'API / SQL Server restart readiness');
  const response = await fetch(`${base}/api/posts/${post.id}`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).data.title, post.title);
  const me = await fetch(`${base}/api/auth/me`, { headers });
  assert.equal(me.status, 200, 'JWT and user must survive restart');
  console.log('PASS: SQL Server + API restart preserves posts, users and signed session');
} finally {
  await fetch(`${base}/api/posts/${post.id}`, { method: 'DELETE', headers });
}
