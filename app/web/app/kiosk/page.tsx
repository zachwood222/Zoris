'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';

interface ItemSummary {
  item_id: number;
  sku: string;
  description: string;
  price: number;
  short_code: string;
}

interface SaleLineDraft {
  item: ItemSummary;
  qty: number;
}

interface ItemLocationInfo {
  location_id: number;
  location_name: string;
  qty_on_hand: number;
  qty_reserved: number;
}

interface IncomingPurchaseInfo {
  po_id: number;
  status: string;
  expected_date: string | null;
  vendor_name: string | null;
  qty_ordered: number;
  qty_received: number;
  qty_remaining: number;
}

interface ItemDetail {
  item: ItemSummary;
  total_on_hand: number;
  locations: ItemLocationInfo[];
  incoming: IncomingPurchaseInfo[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function KioskPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ItemSummary[]>([]);
  const [lines, setLines] = useState<SaleLineDraft[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ItemSummary | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ItemDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (!query) {
        setResults([]);
        return;
      }
      const response = await axios.get<ItemSummary[]>(`${API_BASE}/items/search`, {
        params: { q: query }
      });
      setResults(response.data);
    }, 200);
    return () => clearTimeout(handler);
  }, [query]);

  const closeDetail = useCallback(() => {
    setSelectedItem(null);
    setSelectedDetail(null);
    setIsDetailLoading(false);
    setDetailError(null);
  }, []);

  useEffect(() => {
    if (!selectedItem) {
      return;
    }
    let cancelled = false;
    const loadDetail = async () => {
      setIsDetailLoading(true);
      setDetailError(null);
      try {
        const response = await axios.get<ItemDetail>(`${API_BASE}/items/${selectedItem.item_id}`);
        if (!cancelled) {
          setSelectedDetail(response.data);
        }
      } catch (error) {
        if (!cancelled) {
          setDetailError('Unable to load item details.');
        }
      } finally {
        if (!cancelled) {
          setIsDetailLoading(false);
        }
      }
    };

    loadDetail();

    return () => {
      cancelled = true;
    };
  }, [selectedItem]);

  useEffect(() => {
    if (!selectedItem) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDetail();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem, closeDetail]);

  const total = useMemo(
    () =>
      lines.reduce((sum, line) => {
        return sum + line.qty * line.item.price;
      }, 0),
    [lines]
  );

  const addLine = (item: ItemSummary) => {
    setLines((current) => {
      const existing = current.find((line) => line.item.item_id === item.item_id);
      if (existing) {
        return current.map((line) =>
          line.item.item_id === item.item_id ? { ...line, qty: line.qty + 1 } : line
        );
      }
      return [...current, { item, qty: 1 }];
    });
    setQuery('');
    setResults([]);
  };

  const openItemDetail = (item: ItemSummary) => {
    setSelectedItem(item);
    setSelectedDetail(null);
    setDetailError(null);
    setIsDetailLoading(true);
  };

  const handleAddToTicket = () => {
    if (!selectedItem) {
      return;
    }
    addLine(selectedItem);
    closeDetail();
  };

  const formatExpectedDate = (value: string | null) => {
    if (!value) {
      return 'TBD';
    }
    return new Date(value).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const finalize = async () => {
    const { data: create } = await axios.post(`${API_BASE}/sales`, { created_by: 'kiosk', source: 'kiosk' });
    const saleId = create.sale_id;
    for (const line of lines) {
      await axios.post(`${API_BASE}/sales/${saleId}/add-line`, {
        sku: line.item.sku,
        qty: line.qty,
        location_id: 1
      });
    }
    const { data: finalizeData } = await axios.post(`${API_BASE}/sales/${saleId}/finalize`);
    setStatus(`Sale #${finalizeData.sale_id} finalized!`);
    setLines([]);
  };

  const uploadPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;
    const file = event.target.files[0];
    const form = new FormData();
    form.append('image', file);
    const { data } = await axios.post(`${API_BASE}/ocr/sale-ticket`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    setStatus(`Draft ticket #${data.sale_id} created for review.`);
  };

  return (
    <main className="flex min-h-screen flex-col gap-6 bg-slate-900 p-6 text-white">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sales Kiosk</h1>
          <p className="text-sm text-slate-300">Scan or search items to build a ticket.</p>
        </div>
        <label className="rounded bg-emerald-600 px-4 py-2 font-semibold shadow">
          Upload Ticket
          <input type="file" accept="image/*" className="hidden" onChange={uploadPhoto} />
        </label>
      </header>

      <input
        autoFocus
        placeholder="Scan barcode, type SKU or short code..."
        className="w-full rounded bg-white px-4 py-3 text-lg text-slate-900 focus:outline-none"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && results[0]) {
            addLine(results[0]);
          }
        }}
      />

      <section className="grid gap-2">
        {results.map((item) => (
          <button
            key={item.item_id}
            type="button"
            onClick={() => openItemDetail(item)}
            className="flex items-center justify-between rounded bg-slate-800 px-4 py-3 text-left hover:bg-slate-700"
          >
            <div>
              <div className="text-lg font-semibold">{item.sku}</div>
              <div className="text-sm text-slate-300">{item.description}</div>
            </div>
            <div className="text-xl font-bold">${item.price.toFixed(2)}</div>
          </button>
        ))}
      </section>

      <section className="rounded bg-white p-4 text-slate-900 shadow">
        <h2 className="mb-2 text-xl font-semibold">Ticket</h2>
        {lines.length === 0 && <p className="text-sm text-slate-500">No items yet.</p>}
        <ul className="space-y-2">
          {lines.map((line) => (
            <li key={line.item.item_id} className="flex justify-between">
              <span>
                {line.item.sku} × {line.qty}
              </span>
              <span>${(line.qty * line.item.price).toFixed(2)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between text-lg font-bold">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
        <button
          type="button"
          className="mt-4 w-full rounded bg-emerald-600 px-4 py-3 text-lg font-semibold text-white hover:bg-emerald-500"
          onClick={finalize}
          disabled={lines.length === 0}
        >
          Finalize Ticket
        </button>
        {status && <p className="mt-2 text-sm text-emerald-600">{status}</p>}
      </section>

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-xl overflow-hidden rounded-lg bg-white text-slate-900 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Item</p>
                <h2 className="text-xl font-semibold text-slate-900">{selectedItem.sku}</h2>
                <p className="text-sm text-slate-500">{selectedItem.description}</p>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="rounded-full border border-slate-200 p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close item details"
              >
                ×
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              {detailError ? (
                <div className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{detailError}</div>
              ) : isDetailLoading || !selectedDetail ? (
                <div className="py-6 text-center text-sm text-slate-500">Loading item details…</div>
              ) : (
                <>
                  <div className="flex items-center justify-between rounded-lg bg-slate-100 px-4 py-3">
                    <span className="text-sm font-medium text-slate-600">Price</span>
                    <span className="text-lg font-semibold text-slate-900">${selectedDetail.item.price.toFixed(2)}</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-600">Quantity on hand</h3>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{selectedDetail.total_on_hand.toFixed(2)}</p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                      {selectedDetail.locations.length ? (
                        selectedDetail.locations.map((location) => (
                          <li
                            key={location.location_id}
                            className="flex items-center justify-between rounded border border-slate-200 px-3 py-2"
                          >
                            <span className="font-medium">{location.location_name}</span>
                            <span>
                              {location.qty_on_hand.toFixed(2)} on hand
                              {location.qty_reserved > 0
                                ? ` · ${location.qty_reserved.toFixed(2)} reserved`
                                : ''}
                            </span>
                          </li>
                        ))
                      ) : (
                        <li className="rounded border border-dashed border-slate-200 px-3 py-2 text-slate-400">
                          No stock locations recorded.
                        </li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-600">Incoming</h3>
                    {selectedDetail.incoming.length ? (
                      <>
                        <div className="mt-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-slate-700">
                          <p className="font-semibold text-sky-700">Next arrival</p>
                          <p>
                            {selectedDetail.incoming[0].qty_remaining.toFixed(2)} units expected{' '}
                            {selectedDetail.incoming[0].expected_date
                              ? `on ${formatExpectedDate(selectedDetail.incoming[0].expected_date)}`
                              : 'soon'}{' '}
                            from {selectedDetail.incoming[0].vendor_name ?? 'vendor TBD'} (PO #{selectedDetail.incoming[0].po_id}).
                          </p>
                        </div>
                        <ul className="mt-3 space-y-2 text-sm text-slate-600">
                          {selectedDetail.incoming.map((incoming) => (
                            <li key={`${incoming.po_id}-${incoming.expected_date ?? 'none'}`} className="rounded border border-slate-200 px-3 py-2">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">PO #{incoming.po_id}</span>
                                <span className="text-xs uppercase tracking-wide text-slate-400">{incoming.status}</span>
                              </div>
                              <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                                <span>{incoming.vendor_name ?? 'Vendor TBD'}</span>
                                <span>
                                  {incoming.expected_date
                                    ? `Expected ${formatExpectedDate(incoming.expected_date)}`
                                    : 'Expected date TBD'}
                                </span>
                              </div>
                              <div className="mt-2 text-xs text-slate-500">
                                {incoming.qty_remaining.toFixed(2)} of {incoming.qty_ordered.toFixed(2)} remaining
                              </div>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">No incoming purchase orders for this item.</p>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={closeDetail}
                className="rounded border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleAddToTicket}
                disabled={isDetailLoading}
                className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-500 disabled:opacity-60"
              >
                Add to Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
