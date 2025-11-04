import { test, expect } from '@playwright/test';

test.describe('Public order screen', () => {
  test('displays active orders returned by API', async ({ page }) => {
    await page.route('**/api/public/orders/active', async route => {
      const json = [
        { id: 1, orderNumber: 45, status: 'W realizacji' },
        { id: 2, orderNumber: 46, status: 'Gotowe' },
      ];
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(json) });
    });

    await page.goto('/screen');

    await expect(page.getByRole('heading', { name: /Numerki zamowien/i })).toBeVisible();
    await expect(page.getByText('45')).toBeVisible();
    await expect(page.getByText('46')).toBeVisible();
  });
});
