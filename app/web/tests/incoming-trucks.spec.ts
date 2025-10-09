import { expect, test } from '@playwright/test';

test.describe('incoming trucks workspace', () => {
  test('renders trucks and logs a PO-linked update', async ({ page }) => {
    const trucksResponse = {
      trucks: [
        {
          truck_id: 42,
          reference: 'TRK-2042',
          carrier: 'Cascade Freight',
          status: 'docked',
          eta: '2024-03-01T14:00:00Z',
          door: 'Door 4',
          po_numbers: ['PO-1001'],
          updates: [
            {
              update_id: 9001,
              po_id: 1001,
              po_number: 'PO-1001',
              po_line_id: 501,
              item_id: 2001,
              item_description: 'Spruce Stud 2x4',
              quantity: 40,
              status: 'checked_in',
              note: 'Driver checked in at guard shack.',
              created_at: '2024-03-01T13:00:00Z',
              created_by: 'Ops Bot'
            }
          ]
        }
      ]
    };

    await page.route('**/incoming-trucks', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(trucksResponse)
        });
      } else {
        await route.fallback();
      }
    });

    await page.route('**/po/lines/search**', async (route) => {
      const url = new URL(route.request().url());
      const query = (url.searchParams.get('q') || '').toLowerCase();
      const results = query.includes('spruce')
        ? [
            {
              po_id: 1001,
              po_number: 'PO-1001',
              po_line_id: 501,
              item_id: 2001,
              item_description: 'Spruce Stud 2x4',
              vendor: 'Summit Lumber',
              qty_remaining: 40
            }
          ]
        : [];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ results })
      });
    });

    let capturedPayload: Record<string, unknown> | null = null;
    await page.route('**/incoming-trucks/42/updates', async (route) => {
      capturedPayload = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          update: {
            update_id: 9002,
            po_id: capturedPayload?.po_id ?? 1001,
            po_number: 'PO-1001',
            po_line_id: capturedPayload?.po_line_id ?? 501,
            item_id: capturedPayload?.item_id ?? 2001,
            item_description: 'Spruce Stud 2x4',
            quantity: capturedPayload?.quantity ?? 18,
            status: capturedPayload?.status ?? 'unloading',
            note: capturedPayload?.note ?? 'Dock door 5 now unloading',
            created_at: '2024-03-01T14:05:00Z',
            created_by: 'Dock Lead'
          }
        })
      });
    });

    await page.goto('http://localhost:3000/incoming-trucks');

    await expect(page.getByRole('heading', { name: /incoming trucks/i })).toBeVisible();
    await expect(page.getByText(/PO PO-1001/i)).toBeVisible();

    await page.getByRole('button', { name: /add update/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByPlaceholder('Search PO or item').fill('Spruce');
    await expect(dialog.getByRole('option', { name: /PO-1001/ })).toBeVisible();
    await dialog.getByRole('option', { name: /PO-1001/ }).click();

    await dialog.getByRole('combobox', { name: /status/i }).selectOption('unloading');
    await dialog.getByLabel('Quantity').fill('18');
    await dialog.getByLabel('Notes').fill('Dock door 5 now unloading');

    await Promise.all([
      page.waitForResponse('**/incoming-trucks/42/updates'),
      dialog.getByRole('button', { name: /log update/i }).click()
    ]);

    await expect(page.getByText(/Update logged for PO-1001/i)).toBeVisible();

    expect(capturedPayload).toMatchObject({
      po_id: 1001,
      po_line_id: 501,
      item_id: 2001,
      status: 'unloading',
      quantity: 18,
      note: 'Dock door 5 now unloading'
    });
  });
});
