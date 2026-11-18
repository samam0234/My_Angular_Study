import { expect, test } from '@playwright/test';

test('logs in with the test account and blocks the admin page', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: '테스트 계정 채우기' }).click();
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page.getByText('test님')).toBeVisible();
  await page.reload();
  await expect(page.getByText('test님')).toBeVisible();
  const cookies = await page.context().cookies();
  expect(cookies.find((cookie) => cookie.name === 'board_token')?.httpOnly).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem('board_demo_jwt'))).toBeNull();

  await page.goto('/admin');
  await expect(page).toHaveURL(/\/mypage/);
  await expect(page.getByText('test@example.com, user')).toBeVisible();
});

test('an admin account opens the admin page', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: '관리자 계정 채우기' }).click();
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page.getByText('admin님')).toBeVisible();
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: '관리자 전용' })).toBeVisible();
});
