import { test, expect } from '@playwright/test';

const shouldRunLive = process.env.PLAYWRIGHT_LIVE === 'true';
const apiInfo = `Set PLAYWRIGHT_LIVE=true and ensure backend is running (profile test) to execute live API tests.`;

test.describe.configure({ retries: shouldRunLive ? 1 : 0 });

test.describe('Live API - Manager flow', () => {
  test.skip(!shouldRunLive, apiInfo);

  test('logs in against real backend', async ({ page }) => {
    await page.goto('/login?next=/manager/menu');

    await page.getByLabel('Login').fill('manager');
    await page.getByLabel('Haslo').fill('manager123');

    await Promise.all([
      page.waitForNavigation({ url: /\/manager\/menu$/ }),
      page.getByRole('button', { name: /Zaloguj sie/i }).click(),
    ]);

    await expect(page.getByRole('heading', { name: /Zarzadzanie menu/i })).toBeVisible();
    await expect(page.getByRole('cell', { name: /Burger Klasyczny/i })).toBeVisible();
  });
});

test.describe('Live API - Employee flow', () => {
  test.skip(!shouldRunLive, apiInfo);

  test('shows today orders after login', async ({ page }) => {
    await page.goto('/login?next=/employee');
    await page.getByLabel('Login').fill('employee');
    await page.getByLabel('Haslo').fill('employee123');

    await Promise.all([
      page.waitForNavigation({ url: /\/employee$/ }),
      page.getByRole('button', { name: /Zaloguj sie/i }).click(),
    ]);

    await expect(page.getByText(/Panel pracownika/i)).toBeVisible();
    await expect(page.getByRole('cell', { name: /Burger/i })).toBeVisible();
  });
});

