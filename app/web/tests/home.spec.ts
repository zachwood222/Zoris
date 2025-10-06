import { test, expect } from '@playwright/test';

test('home page has navigation tiles', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page.getByText('Zoris Control Center')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sales Kiosk' })).toBeVisible();
});
