import { expect, test } from '@playwright/test';

test('an actual API 401 redirects to login and preserves its request id', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('새 글 제목').fill('비로그인 작성 검사');
  await page.getByPlaceholder('내용', { exact: true }).fill('권한 검사');
  const response = page.waitForResponse(
    (r) => r.url().endsWith('/api/posts') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: '등록', exact: true }).click();
  const denied = await response;
  expect(denied.status()).toBe(401);
  const requestId = denied.headers()['x-request-id'];
  await expect(page).toHaveURL(/\/login\?returnUrl=/);
  await expect(page.locator('header')).toContainText(`X-Request-Id ${requestId}`);
});

test('wrong password displays an error without logging in', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('이메일', { exact: true }).fill('test@example.com');
  await page.getByLabel('비밀번호', { exact: true }).fill('wrongpassword');
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('이메일 또는 비밀번호');
  await expect(page).toHaveURL(/\/login/);
});

test('signup, login, persistent CRUD and server search work through the browser', async ({
  page,
}) => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const email = `browser-${suffix}@example.com`;
  const title = `브라우저-${suffix}`;
  await page.goto('/login');
  await page.getByLabel('가입 이메일', { exact: true }).fill(email);
  await page.getByLabel('가입 비밀번호', { exact: true }).fill('password123');
  await page.getByLabel('닉네임', { exact: true }).fill('새사용자');
  await page.getByRole('button', { name: '회원가입', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('가입했습니다');
  await page.getByLabel('비밀번호', { exact: true }).fill('password123');
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page.getByText('새사용자님')).toBeVisible();
  await page.getByPlaceholder('새 글 제목').fill(title);
  await page.getByPlaceholder('내용', { exact: true }).fill(`본문-${suffix}`);
  await page.getByRole('button', { name: '등록', exact: true }).click();
  await expect(page.getByRole('link', { name: title, exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('link', { name: title, exact: true })).toBeVisible();
  const row = page
    .locator('li')
    .filter({ has: page.getByRole('link', { name: title, exact: true }) });
  await row.getByRole('button', { name: '수정', exact: true }).click();
  await expect(page.getByRole('link', { name: `[수정] ${title}`, exact: true })).toBeVisible();
  await page.getByPlaceholder('제목·본문 검색').fill(`본문-${suffix}`);
  await expect(page.getByText('전체 1개', { exact: false })).toBeVisible();
  await page.getByRole('link', { name: `[수정] ${title}`, exact: true }).click();
  await expect(page.getByRole('heading', { name: `[수정] ${title}`, exact: true })).toBeVisible();
  await page.goto('/');
  const updated = page
    .locator('li')
    .filter({ has: page.getByRole('link', { name: `[수정] ${title}`, exact: true }) });
  await updated.getByRole('button', { name: '삭제', exact: true }).click();
  await expect(page.getByRole('link', { name: `[수정] ${title}`, exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('link', { name: `[수정] ${title}`, exact: true })).toHaveCount(0);
});
