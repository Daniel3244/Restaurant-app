import { test, expect } from '@playwright/test';

const shouldRunLive = process.env.PLAYWRIGHT_LIVE === 'true';
const apiInfo = `Set PLAYWRIGHT_LIVE=true and ensure backend is running (profile test) to execute live API tests.`;

test.describe.configure({ retries: shouldRunLive ? 1 : 0 });

test.describe('Live API - Manager flow', () => {
  test.skip(!shouldRunLive, apiInfo);

  test('logs in against real backend', async ({ page }) => {
    await page.goto('/login?next=/manager/menu');

  await page.getByLabel('Login').fill('manager');
  await page.getByLabel(/Has.*/i).fill('manager123');

    // Sometimes the first login request may fail due to transient networking/CORS timing
    // issues when the preview/backend start together. Retry the click+wait a few times
    // before giving up so the test is more robust in local/CI runs.
    const maxLoginAttempts = 3;
    let loggedIn = false;
    for (let attempt = 1; attempt <= maxLoginAttempts; attempt++) {
      await page.getByRole('button', { name: /Zaloguj/i }).click();
      try {
        await page.waitForURL('**/manager/menu', { timeout: 5000 });
        loggedIn = true;
        break;
      } catch {
        // If we see an inline error like 'Failed to fetch', wait and retry
        const failedAlert = await page.locator('text=Failed to fetch').first().count();
        if (failedAlert) {
          // wait a bit for backend/preview to settle and retry
          await page.waitForTimeout(800);
          continue;
        }
        // otherwise short backoff and retry
        await page.waitForTimeout(300);
      }
    }

    if (!loggedIn) {
      // final attempt with longer timeout to let Playwright throw a helpful error if still failing
      await Promise.all([
        page.waitForURL('**/manager/menu', { timeout: 10000 }),
        page.getByRole('button', { name: /Zaloguj/i }).click(),
      ]);
    }

  // match any heading containing the word 'menu' to be tolerant to diacritics/wording
  await expect(page.getByRole('heading', { name: /menu/i })).toBeVisible();
  // there may be multiple matching elements (image alt + cell), assert the first visible one
  await expect(page.getByRole('cell', { name: /Burger Klasyczny/i }).first()).toBeVisible();
  });
});

test.describe('Live API - Employee flow', () => {
  test.skip(!shouldRunLive, apiInfo);

  test('shows today orders after login', async ({ page }) => {
    await page.goto('/login?next=/employee');
  await page.getByLabel('Login').fill('employee');
  await page.getByLabel(/Has.*/i).fill('employee123');

    // Retry login similarly to manager flow to reduce flakes when backend/preview are warming up.
    const maxAttempts = 3;
    let ok = false;
    for (let i = 1; i <= maxAttempts; i++) {
      await page.getByRole('button', { name: /Zaloguj/i }).click();
      try {
        await page.waitForURL('**/employee', { timeout: 5000 });
        ok = true;
        break;
      } catch {
        const failedAlert = await page.locator('text=Failed to fetch').first().count();
        if (failedAlert) {
          await page.waitForTimeout(800);
          continue;
        }
        await page.waitForTimeout(300);
      }
    }
    if (!ok) {
      await Promise.all([
        page.waitForURL('**/employee', { timeout: 10000 }),
        page.getByRole('button', { name: /Zaloguj/i }).click(),
      ]);
    }

  await expect(page.getByText(/Panel pracownika|Panel pracowni|Panel pracownik/i)).toBeVisible();
  // Orders seeded in the backend can contain different items (Frytki, Burger, Wrap).
  // Assert that at least one seeded item name appears in the orders table.
  await expect(page.locator('text=/Frytki|Burger|Wrap/i')).toBeVisible();
  });
});
