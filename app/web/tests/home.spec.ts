import { test, expect } from '@playwright/test';

test.describe('dashboard home', () => {
  test('shows live hero status and navigation tiles', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await expect(page.getByRole('heading', { name: 'Command your retail operations' })).toBeVisible();
    const hero = page.getByTestId('hero-status-card');
    await expect(hero).toContainText(/Today/i);
    await expect(hero).toContainText(/\d{1,2}:\d{2}/);
    await expect(page.getByRole('link', { name: 'Sales Kiosk' })).toBeVisible();
  });

  test('quick actions route to real pages', async ({ page }) => {
    await page.goto('http://localhost:3000');
    const actions = [
      { name: /Create assisted sale/i, heading: /Sales Kiosk/i },
      { name: /Schedule receiving window/i, heading: /Schedule Receiving Window/i },
      { name: /Batch print labels/i, heading: /Batch Print Labels/i },
      { name: /Log truck update/i, heading: /Incoming Trucks/i }
    ];

    for (const action of actions) {
      const link = page.getByRole('link', { name: action.name });
      await expect(link).toBeVisible();
      const href = await link.getAttribute('href');
      if (!href) {
        throw new Error('Quick action link is missing an href attribute.');
      }
      await Promise.all([page.waitForURL(`**${href}`), link.click()]);
      await expect(page.getByRole('heading', { name: action.heading })).toBeVisible();
      await page.goBack();
      await page.waitForURL('http://localhost:3000/');
    }
  });
});
