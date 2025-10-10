'use client';

import axios from 'axios';
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { apiBase } from '../../lib/api';

interface ItemSummary {
  item_id: number;
  sku: string;
  description: string;
  price: number;
  short_code: string;
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

interface SaleLineDraft {
  item: ItemSummary;
  qty: number;
}

interface ItemDetailLocation {
  location_id: number;
  location_name: string;
  qty_on_hand: number;
  qty_reserved: number;
}

interface ItemDetailIncoming {
  po_id: number;
  vendor_name: string | null;
  status: string;
  expected_date: string | null;
  qty_remaining: number;
  qty_ordered: number;
}

interface ItemDetail {
  item: {
    price: number;
  };
  total_on_hand: number;
  locations: ItemDetailLocation[];
  incoming: ItemDetailIncoming[];
}

type StatusMessage = {
  kind: 'success' | 'error';
  message: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function KioskPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ItemSummary[]>([]);
  const [lines, setLines] = useState<SaleLineDraft[]>([]);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemSummary | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ItemDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) {
      setResults([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    const controller = new AbortController();
    setIsSearching(true);
    setSearchError(null);

    const handler = setTimeout(async () => {
      try {
        const response = await axios.get<ItemSummary[]>(`${apiBase}/items/search`, {
          params: { q: query },
          signal: controller.signal
        });
        setResults(response.data);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error(error);
        setSearchError('Unable to load matching items right now.');
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 200);

    return () => {
      controller.abort();
      clearTimeout(handler);
    };
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
    const controller = new AbortController();

    const loadDetail = async () => {
      setIsDetailLoading(true);
      setDetailError(null);
      setSelectedDetail(null);

      try {
        const response = await axios.get<ItemDetail>(`${apiBase}/items/${selectedItem.item_id}`);
        if (!cancelled) {
          setSelectedDetail(response.data);
        }
      } catch (error) {
        if (axios.isCancel(error)) {
          return;
        }
        console.error(error);
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
      controller.abort();
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

  const adjustQuantity = (itemId: number, delta: number) => {
    setLines((current) =>
      current
        .map((line) =>
          line.item.item_id === itemId ? { ...line, qty: Math.max(0, line.qty + delta) } : line
        )
        .filter((line) => line.qty > 0)
    );
  };

  const removeLine = (itemId: number) => {
    setLines((current) => current.filter((line) => line.item.item_id !== itemId));
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  const openItemDetail = (item: ItemSummary) => {
    setSelectedItem(item);
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
    setIsFinalizing(true);
    setStatus(null);

    try {
      const { data: create } = await axios.post<{ sale_id: number }>(`${apiBase}/sales`, {
        created_by: 'kiosk',
        source: 'kiosk'
      });
      const saleId = create.sale_id;

      for (const line of lines) {
        await axios.post(`${apiBase}/sales/${saleId}/add-line`, {
          sku: line.item.sku,
          qty: line.qty,
          location_id: 1
        });
      }

      const { data: finalizeData } = await axios.post<{ sale_id: number }>(
        `${apiBase}/sales/${saleId}/finalize`
      );

      setStatus({
        kind: 'success',
        message: `Sale #${finalizeData.sale_id} finalized successfully.`
      });
      setLines([]);
    } catch (error) {
      console.error(error);
      setStatus({
        kind: 'error',
        message: 'We were unable to finalize that sale. Try again shortly.'
      });
    } finally {
      setIsFinalizing(false);
    }
  };

  const uploadPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    if (!input.files?.length) return;

    const file = input.files[0];
    const form = new FormData();
    form.append('image', file);

    setIsUploading(true);
    setStatus(null);

    try {
      const { data } = await axios.post<{ sale_id: number }>(`${apiBase}/ocr/sale-ticket`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setStatus({
        kind: 'success',
        message: `Draft ticket #${data.sale_id} created for review.`
      });
    } catch (error) {
      console.error(error);
      setStatus({
        kind: 'error',
        message: 'We were unable to process that ticket image. Try again shortly.'
      });
    } finally {
      setIsUploading(false);
      input.value = '';
    }
  };

  return (
    <main className="flex min-h-screen flex-col gap-6 bg-slate-900 p-6 text-white">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sales Kiosk</h1>
          <p className="text-sm text-slate-300">Scan or search items to build a ticket.</p>
        </div>
        <label
          className={`rounded px-4 py-2 font-semibold shadow transition ${
            isUploading
              ? 'cursor-not-allowed bg-emerald-700/60 text-emerald-200'
              : 'cursor-pointer bg-emerald-600 hover:bg-emerald-500'
          }`}
        >
          {isUploading ? 'Uploading…' : 'Upload Ticket'}
          <input
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={uploadPhoto}
            disabled={isUploading}
          />
        </label>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="flex flex-col gap-5 rounded-3xl border border-slate-700/60 bg-slate-900/60 p-6 shadow-[0_40px_80px_-40px_rgba(15,118,110,0.35)] backdrop-blur">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
              Catalog search
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-white">Find items to add</h2>
          </div>
          <div className="relative">
            <input
              autoFocus
              placeholder="Scan barcode, type SKU, description, or short code"
              className="h-14 w-full rounded-2xl border border-slate-700/70 bg-slate-950/60 pl-5 pr-14 text-base text-white shadow-inner shadow-black/20 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && results[0]) {
                  addLine(results[0]);
                }
              }}
            />
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-5 text-sm text-slate-500">
              {isSearching
                ? 'Searching…'
                : `${results.length} match${results.length === 1 ? '' : 'es'}`}
            </div>
          </div>
          {searchError && <p className="text-sm text-rose-200/80">{searchError}</p>}

          <div className="flex-1 overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/40">
            <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3 border-b border-slate-800/60 px-5 py-3 text-xs uppercase tracking-[0.3em] text-slate-500">
              <span>Item</span>
              <span className="text-right">Price</span>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {results.length === 0 && !isSearching ? (
                <div className="flex h-32 flex-col items-center justify-center gap-2 text-sm text-slate-500">
                  <span>No results yet.</span>
                  <span>Scan a barcode or start typing to see matches.</span>
                </div>
              ) : (
                <ul className="divide-y divide-slate-800/60">
                  {results.map((item) => (
                    <li key={item.item_id}>
                      <button
                        type="button"
                        onClick={() => openItemDetail(item)}
                        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-800/60"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold tracking-wide text-slate-100">
                            {item.sku}
                          </div>
                          <div className="mt-1 truncate text-xs text-slate-400">{item.description}</div>
                          {item.short_code && (
                            <div className="mt-1 text-[0.65rem] uppercase tracking-[0.4em] text-emerald-400/70">
                              {item.short_code}
                            </div>
                          )}
                        </div>
                        <div className="text-right text-base font-semibold text-emerald-300">
                          {formatCurrency(item.price)}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <aside className="flex h-full flex-col gap-5 rounded-3xl border border-slate-700/60 bg-slate-900/60 p-6 shadow-[0_40px_80px_-40px_rgba(15,118,110,0.35)] backdrop-blur">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Ticket</div>
            <h2 className="mt-2 text-2xl font-semibold text-white">Live sale summary</h2>
          </div>

          <div className="flex-1 space-y-4">
            {lines.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-700/70 bg-slate-950/40 text-sm text-slate-500">
                <span>No items added yet.</span>
                <span>Search above to start building the ticket.</span>
              </div>
            ) : (
              <ul className="space-y-3">
                {lines.map((line) => (
                  <li
                    key={line.item.item_id}
                    className="rounded-2xl border border-slate-800/80 bg-slate-950/40 px-4 py-3 text-sm text-slate-200"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold uppercase tracking-[0.4em] text-emerald-400/70">
                          {line.item.sku}
                        </div>
                        <div className="mt-1 text-sm text-slate-200">{line.item.description}</div>
                      </div>
                      <button
                        type="button"
                        className="text-xs uppercase tracking-[0.4em] text-slate-500 transition hover:text-rose-300"
                        onClick={() => removeLine(line.item.item_id)}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700/80 text-lg leading-none text-slate-200 transition hover:border-emerald-400 hover:text-emerald-300"
                          onClick={() => adjustQuantity(line.item.item_id, -1)}
                          aria-label={`Decrease quantity for ${line.item.sku}`}
                        >
                          −
                        </button>
                        <span className="w-10 text-center text-base font-semibold text-white">{line.qty}</span>
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700/80 text-lg leading-none text-slate-200 transition hover:border-emerald-400 hover:text-emerald-300"
                          onClick={() => adjustQuantity(line.item.item_id, 1)}
                          aria-label={`Increase quantity for ${line.item.sku}`}
                        >
                          +
                        </button>
                      </div>
                      <div className="text-right text-base font-semibold text-emerald-300">
                        {formatCurrency(line.qty * line.item.price)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-950/40 p-5 text-sm text-slate-300">
            <div className="flex items-center justify-between">
              <span>Items</span>
              <span className="font-semibold text-white">{lines.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span className="font-semibold text-white">{formatCurrency(total)}</span>
            </div>
            <div className="flex items-center justify-between text-sm uppercase tracking-[0.3em] text-emerald-400/80">
              <span>Total due</span>
              <span className="text-lg font-semibold text-emerald-300">{formatCurrency(total)}</span>
            </div>
          </div>

          <button
            type="button"
            className="group relative inline-flex h-14 w-full items-center justify-center overflow-hidden rounded-2xl border border-emerald-500/40 bg-emerald-500/10 text-base font-semibold text-emerald-100 shadow-lg shadow-emerald-500/15 transition hover:border-emerald-300 hover:text-emerald-50 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800/60 disabled:text-slate-500"
            onClick={finalize}
            disabled={lines.length === 0 || isFinalizing}
          >
            <span className={`${isFinalizing ? 'opacity-0' : 'opacity-100'} transition`}>Finalize ticket</span>
            {isFinalizing && (
              <span className="absolute inset-0 flex items-center justify-center text-xs uppercase tracking-[0.4em] text-emerald-100">
                Finalizing…
              </span>
            )}
          </button>
        </aside>
      </section>

      {status && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            status.kind === 'error'
              ? 'border-rose-500/60 bg-rose-500/10 text-rose-100'
              : 'border-emerald-500/60 bg-emerald-500/10 text-emerald-100'
          }`}
        >
          {status.message}
        </div>
      )}

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
                    <span className="text-lg font-semibold text-slate-900">
                      {formatCurrency(selectedDetail.item.price)}
                    </span>
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
                              {location.qty_reserved > 0 ? ` · ${location.qty_reserved.toFixed(2)} reserved` : ''}
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
                            <li
                              key={`${incoming.po_id}-${incoming.expected_date ?? 'none'}`}
                              className="rounded border border-slate-200 px-3 py-2"
                            >
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
