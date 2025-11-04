import { test, expect } from '@playwright/test';

test.describe('Manager flow', () => {
  test('allows manager to log in and view menu items', async ({ page }) => {
    const expiresAt = Date.now() + 60 * 60 * 1000;

    await page.route('**/api/auth/login', async route => {
      const json = { token: 'manager-token', role: 'manager', expiresAt };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(json) });
    });

    await page.route('**/api/manager/menu', async route => {
      const json = [
        { id: 1, name: 'Burger Specjal', description: 'Z serem i bekonem', price: 29.5, imageUrl: '/img/burgery.jpg', category: 'burgery', active: true },
        { id: 2, name: 'Lemoniada', description: 'Cytrynowa', price: 12, imageUrl: '/img/napoje.jpg', category: 'napoje', active: true },
      ];
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(json) });
    });

    await page.goto('/login?next=/manager/menu');
  await page.getByLabel('Login').fill('manager');
  await page.getByLabel(/Has.*/i).fill('manager123');

    await Promise.all([
  page.waitForResponse('**/api/auth/login'),
  // match any button that starts with "Zaloguj" to allow presence/absence of diacritics
  page.getByRole('button', { name: /Zaloguj/i }).click(),
    ]);

    await page.waitForURL('**/manager/menu');
    await expect(page.getByRole('link', { name: /Edycja menu/i })).toBeVisible();
    await expect(page.getByRole('cell', { name: /^Burger Specjal$/i }).first()).toBeVisible();
  });
});
