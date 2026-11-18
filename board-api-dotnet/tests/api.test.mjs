import assert from 'node:assert/strict';
import { test } from 'node:test';

const base = process.env.API_BASE_URL ?? 'http://127.0.0.1:5080';
const suffix = `${Date.now()}-${process.pid}`;
let owner, other, admin, postId, commentId;
const accounts = [
  { email: `owner-${suffix}@example.com`, password: 'password123', nickname: '작성자' },
  { email: `other-${suffix}@example.com`, password: 'password123', nickname: '다른 사용자' },
];
async function call(path, { method = 'GET', body, token, cookie, headers = {} } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(method !== 'GET' ? { 'X-Board-Request': '1' } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(cookie ? { Cookie: cookie } : {}), ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : undefined;
  if (response.status >= 400) {
    assert.equal(typeof json?.error?.code, 'string', text);
    assert.equal(json.error.requestId, response.headers.get('x-request-id'));
    assert.ok(json.error.fields);
  }
  return { status: response.status, headers: response.headers, json, text };
}
async function login(account) {
  const response = await call('/api/auth/login', { method: 'POST', body: account });
  assert.equal(response.status, 200, response.text);
  return { ...response.json.data, cookie: response.headers.get('set-cookie').split(';')[0], headers: response.headers };
}

test('health and generated OpenAPI identify the live ASP.NET Core / SQL Server service', async () => {
  assert.equal((await call('/health')).json.status, 'ok');
  const health = await call('/api/health');
  assert.equal(health.json.database, 'sqlserver');
  assert.equal(health.json.backend, 'aspnetcore');
  const docs = await call('/api-docs');
  assert.equal(docs.status, 200);
  assert.ok(docs.json.paths['/api/posts/{id}'].patch);
});
test('signup validates fields, hashes passwords, rejects duplicate email and ignores injected role', async () => {
  assert.equal((await call('/api/auth/signup', { method: 'POST', body: { email: 'bad', password: 'short' } })).status, 400);
  for (const account of accounts) {
    const response = await call('/api/auth/signup', { method: 'POST', body: { ...account, role: 'admin' } });
    assert.equal(response.status, 201, response.text);
    assert.equal(response.json.data.role, 'user');
    assert.ok(!/password|hash/i.test(response.text));
  }
  assert.equal((await call('/api/auth/signup', { method: 'POST', body: accounts[0] })).status, 409);
});
test('login checks the actual password and returns uniform failure', async () => {
  for (const email of [accounts[0].email, 'nobody@example.com']) {
    const response = await call('/api/auth/login', { method: 'POST', body: { email, password: 'incorrect123' } });
    assert.equal(response.status, 401);
    assert.equal(response.json.error.code, 'INVALID_CREDENTIALS');
  }
  owner = await login(accounts[0]); other = await login(accounts[1]);
  admin = await login({ email: 'admin@example.com', password: 'password123' });
  assert.match(owner.headers.get('set-cookie'), /httponly/i);
  assert.match(owner.headers.get('set-cookie'), /samesite=lax/i);
  assert.equal(owner.accessToken.split('.').length, 3);
});
test('me accepts signed JWT bearer and HttpOnly cookie; missing and forged tokens fail', async () => {
  assert.equal((await call('/api/auth/me', { token: owner.accessToken })).json.data.email, accounts[0].email);
  assert.equal((await call('/api/auth/me', { cookie: owner.cookie })).json.data.email, accounts[0].email);
  assert.equal((await call('/api/auth/me')).status, 401);
  const [header, payload, signature] = owner.accessToken.split('.');
  const forged = `${header}.${payload}.${signature[0] === 'a' ? 'b' : 'a'}${signature.slice(1)}`;
  assert.equal((await call('/api/auth/me', { token: forged })).status, 401);
});
test('anonymous writes receive 401 and ordinary users receive 403 for the admin API', async () => {
  assert.equal((await call('/api/posts', { method: 'POST', body: { title: 'a', body: 'b' } })).status, 401);
  assert.equal((await call('/api/admin/status', { token: owner.accessToken })).status, 403);
  assert.equal((await call('/api/admin/status', { token: admin.accessToken })).status, 200);
});
test('server validates blank title, title length, body length and tags', async () => {
  for (const body of [{ title: ' ', body: 'b' }, { title: 'a'.repeat(201), body: 'b' }, { title: 'a', body: 'b'.repeat(20001) }, { title: 'a', body: 'b', tags: [''] }]) {
    const response = await call('/api/posts', { method: 'POST', body, token: owner.accessToken });
    assert.equal(response.status, 400);
    assert.equal(response.json.error.code, 'VALIDATION_ERROR');
    assert.ok(Object.keys(response.json.error.fields).length);
  }
});
test('create persists server author and returns 201, data and Location', async () => {
  const response = await call('/api/posts', { method: 'POST', token: owner.accessToken,
    body: { title: `Contract-${suffix}`, body: 'FindMe BODY', tags: ['intro'], userId: other.user.id } });
  assert.equal(response.status, 201, response.text);
  postId = response.json.data.id;
  assert.equal(response.headers.get('location'), `/api/posts/${postId}`);
  assert.equal(response.json.data.author.id, owner.user.id);
  assert.deepEqual(response.json.data.tags, ['intro']);
  assert.match(response.json.data.createdAt, /Z$/);
});
test('search covers title and body case-insensitively, with totalPages and bounded pagination', async () => {
  const response = await call(`/api/posts?q=findme%20body&page=1&limit=10`);
  assert.equal(response.json.meta.total, 1);
  assert.equal(response.json.meta.totalPages, 1);
  assert.equal(response.json.data[0].id, postId);
  assert.equal((await call('/api/posts?limit=999')).json.meta.limit, 50);
  assert.equal((await call('/api/posts?page=bad')).status, 400);
  assert.equal((await call('/api/posts?sort=bad')).status, 400);
  assert.equal((await call('/api/posts?sort=createdAt')).status, 200);
  assert.equal((await call('/api/posts?sort=-commentCount')).status, 200);
});
test('another author cannot PATCH or DELETE, including forged userId and admin', async () => {
  for (const token of [other.accessToken, admin.accessToken]) {
    assert.equal((await call(`/api/posts/${postId}`, { method: 'PATCH', token, body: { title: 'stolen', userId: other.user.id } })).status, 403);
    assert.equal((await call(`/api/posts/${postId}`, { method: 'DELETE', token })).status, 403);
  }
});
test('author PATCH updates only supplied fields and subsequent GET sees SQL data', async () => {
  assert.equal((await call(`/api/posts/${postId}`, { method: 'PATCH', token: owner.accessToken, body: { title: 'changed' } })).status, 200);
  const response = await call(`/api/posts/${postId}`);
  assert.equal(response.json.data.title, 'changed');
  assert.equal(response.json.data.body, 'FindMe BODY');
  assert.deepEqual(response.json.data.tags, ['intro']);
});
test('comment creation and deletion enforce authorship and update commentCount', async () => {
  assert.equal((await call(`/api/posts/${postId}/comments`, { method: 'POST', body: { body: 'comment' } })).status, 401);
  const response = await call(`/api/posts/${postId}/comments`, { method: 'POST', token: other.accessToken, body: { body: 'comment' } });
  assert.equal(response.status, 201); commentId = response.json.data.id;
  assert.equal((await call(`/api/posts/${postId}/comments`)).json.data[0].body, 'comment');
  assert.equal((await call(`/api/posts/${postId}`)).json.data.commentCount, 1);
  assert.equal((await call(`/api/comments/${commentId}`, { method: 'DELETE', token: owner.accessToken })).status, 403);
  assert.equal((await call(`/api/comments/${commentId}`, { method: 'DELETE', token: other.accessToken })).status, 204);
});
test('cookie mutations require the custom header and reject untrusted Origin', async () => {
  const options = { method: 'PATCH', cookie: owner.cookie, body: { title: 'changed' } };
  assert.equal((await call(`/api/posts/${postId}`, { ...options, headers: { 'X-Board-Request': '' } })).status, 403);
  assert.equal((await call(`/api/posts/${postId}`, { ...options, headers: { Origin: 'https://evil.example' } })).status, 403);
  assert.equal((await call(`/api/posts/${postId}`, { ...options, headers: { Origin: 'http://127.0.0.1:8080' } })).status, 200);
});
test('bad JSON and numeric ids return structured 400; missing resources return structured 404 with matching request id', async () => {
  const malformed = await fetch(`${base}/api/posts`, { method: 'POST', headers: { Authorization: `Bearer ${owner.accessToken}`, 'X-Board-Request': '1', 'Content-Type': 'application/json' }, body: '{bad' });
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).error.code, 'BAD_REQUEST');
  assert.equal((await call('/api/posts/not-number')).status, 400);
  for (const path of ['/api/posts/2147483647', '/api/posts/2147483647/comments', '/api/unknown']) {
    const response = await call(path, { headers: { 'X-Request-Id': 'contract-req-9' } });
    assert.equal(response.status, 404);
    assert.equal(response.json.error.requestId, 'contract-req-9');
  }
});
test('AI has an explicit keyless mock, and requires login', async () => {
  assert.equal((await call('/api/summarize', { method: 'POST', body: { text: 'hello' } })).status, 401);
  const response = await call('/api/summarize', { method: 'POST', token: owner.accessToken, body: { text: 'hello' } });
  assert.equal(response.status, 200);
  assert.equal(response.json.data.mode, 'mock');
});
test('delete returns empty 204 and GET returns 404 afterwards', async () => {
  const response = await call(`/api/posts/${postId}`, { method: 'DELETE', token: owner.accessToken });
  assert.equal(response.status, 204); assert.equal(response.text, '');
  assert.equal((await call(`/api/posts/${postId}`)).status, 404);
});
test('logout clears the browser cookie and returns empty 204', async () => {
  const response = await call('/api/auth/logout', { method: 'POST', cookie: owner.cookie });
  assert.equal(response.status, 204);
  assert.equal(response.text, '');
  assert.match(response.headers.get('set-cookie'), /expires=Thu, 01 Jan 1970|expires=Thu, 01 Jan 0001/i);
});
