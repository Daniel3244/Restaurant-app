import { test, expect } from '@playwright/test';

test.describe('Employee orders board', () => {
  test('shows orders scheduled for today', async ({ page }) => {
    const expiresAt = Date.now() + 60 * 60 * 1000;

    await page.route('**/api/auth/login', async route => {
      const json = { token: 'employee-token', role: 'employee', expiresAt };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(json) });
    });

    await page.route(/.*\/api\/orders.*/, async route => {
      const json = {
        orders: [
          {
            id: 11,
            orderNumber: 150,
            createdAt: '2025-11-04T12:30:00',
            type: 'na miejscu',
            status: 'W realizacji',
            items: [
              { id: 1, name: 'Burger', quantity: 1, price: 25.0 },
            ],
          },
        ],
        totalElements: 1,
        totalPages: 1,
        page: 0,
        size: 100,
      };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(json) });
    });

    await page.goto('/login?next=/employee');
  await page.getByLabel('Login').fill('employee');
  await page.getByLabel(/Has.*/i).fill('employee123');

    await Promise.all([
  page.waitForResponse('**/api/auth/login'),
  page.getByRole('button', { name: /Zaloguj/i }).click(),
    ]);

    await page.waitForURL('**/employee');
    await expect(page.getByRole('button', { name: /Do zrealizowania/i })).toBeVisible();
    await expect(page.getByText('150')).toBeVisible();
    await expect(page.getByText(/Burger/)).toBeVisible();
  });
});
