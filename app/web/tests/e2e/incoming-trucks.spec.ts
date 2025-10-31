import { expect, test } from '@playwright/test';

test.describe('incoming trucks workspace', () => {
  test('renders trucks and logs a PO-linked update', async ({ page }) => {
    const trucksResponse = [
      {
        truck_id: 42,
        po_id: 1001,
        reference: 'TRK-2042',
        carrier: 'Cascade Freight',
        status: 'scheduled',
        scheduled_arrival: '2024-03-01T14:00:00Z',
        arrived_at: null,
        created_at: '2024-02-28T10:00:00Z',
        lines: [
          {
            truck_line_id: 1,
            po_line_id: 501,
            item_id: 2001,
            description: 'Spruce Stud 2x4',
            qty_expected: 80
          }
        ],
        updates: {
          latest_status: 'arrived',
          note_count: 1,
          line_progress: [
            {
              po_line_id: 501,
              item_id: 2001,
              total_quantity: 20
            }
          ],
          history: [
            {
              update_id: 9001,
              truck_id: 42,
              update_type: 'note',
              message: 'Driver checked in at guard shack.',
              status: null,
              po_line_id: 501,
              item_id: 2001,
              quantity: null,
              created_at: '2024-03-01T13:00:00Z',
              created_by: 'Ops Bot'
            }
          ]
        }
      }
    ];

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
            truck_id: 42,
            update_type: capturedPayload?.update_type ?? 'line_progress',
            message: capturedPayload?.message ?? 'Dock door 5 now unloading',
            status: capturedPayload?.status ?? null,
            po_line_id: capturedPayload?.po_line_id ?? 501,
            item_id: capturedPayload?.item_id ?? 2001,
            quantity: capturedPayload?.quantity ?? 18,
            created_at: '2024-03-01T14:05:00Z',
            created_by: 'Dock Lead'
          }
        })
      });
    });

    await page.goto('/incoming-trucks');

    await expect(page.getByRole('heading', { name: /incoming trucks/i })).toBeVisible();
    await expect(page.getByText(/#1001/)).toBeVisible();

    await page.getByRole('button', { name: /add update/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByPlaceholder('Search PO or item').fill('Spruce');
    await expect(dialog.getByRole('option', { name: /PO-1001/ })).toBeVisible();
    await dialog.getByRole('option', { name: /PO-1001/ }).click();

    await dialog.getByRole('combobox', { name: /update type/i }).selectOption('line_progress');
    await dialog.getByLabel('Quantity').fill('18');
    await dialog.getByLabel('Notes').fill('Dock door 5 now unloading');

    await Promise.all([
      page.waitForResponse('**/incoming-trucks/42/updates'),
      dialog.getByRole('button', { name: /log update/i }).click()
    ]);

    await expect(page.getByText(/Update logged successfully/i)).toBeVisible();

    expect(capturedPayload).toMatchObject({
      po_line_id: 501,
      item_id: 2001,
      update_type: 'line_progress',
      quantity: 18,
      message: 'Dock door 5 now unloading'
    });
  });
});
