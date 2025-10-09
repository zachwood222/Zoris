'use client';

import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
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

type StatusMessage = {
  kind: 'success' | 'error';
  message: string;
};

export default function KioskPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ItemSummary[]>([]);
  const [lines, setLines] = useState<SaleLineDraft[]>([]);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
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
        const response = await axios.get<ItemSummary[]>(`${api}/items/search`, {
          params: { q: query },
          signal: controller.signal
        });
        setResults(response.data);
      } catch (error) {
        if (axios.isCancel(error)) return;
        console.error(error);
        setSearchError('Unable to load matching items right now.');
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(handler);
    };
  }, [query]);

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

  const finalize = async () => {
    const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    setIsFinalizing(true);
    setStatus(null);
    try {
      const { data: create } = await axios.post(`${api}/sales`, {
        created_by: 'kiosk',
        source: 'kiosk'
      });
      const saleId = create.sale_id;
      for (const line of lines) {
        await axios.post(`${api}/sales/${saleId}/add-line`, {
          sku: line.item.sku,
          qty: line.qty,
          location_id: 1
        });
      }
      const { data: finalizeData } = await axios.post(`${api}/sales/${saleId}/finalize`);
      setStatus({ kind: 'success', message: `Sale #${finalizeData.sale_id} finalized successfully.` });
      setLines([]);
    } catch (error) {
      console.error(error);
      setStatus({ kind: 'error', message: 'We were unable to finalize that sale. Try again shortly.' });
    } finally {
      setIsFinalizing(false);
    }
  };

  const uploadPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;
    const file = event.target.files[0];
    const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const form = new FormData();
    form.append('image', file);
    setIsUploading(true);
    setStatus(null);
    try {
      const { data } = await axios.post(`${api}/ocr/sale-ticket`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setStatus({ kind: 'success', message: `Draft ticket #${data.sale_id} created from the upload.` });
    } catch (error) {
      console.error(error);
      setStatus({
        kind: 'error',
        message: 'We could not process that image. Please try another photo or re-upload the file.'
      });
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-8 py-10 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-400/80">Point of sale</p>
            <h1 className="text-4xl font-semibold text-white md:text-5xl">Sales Kiosk</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-300">
              Search the catalog, scan a barcode, or capture an existing paper ticket. Build the sale in
              seconds while keeping the live total front and center.
            </p>
          </div>

          <label className="group relative inline-flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-300 shadow-lg shadow-emerald-500/10 transition hover:border-emerald-400 hover:text-emerald-200">
            <span className="hidden sm:inline">Upload or snap ticket</span>
            <span className="sm:hidden">Upload ticket</span>
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              onChange={uploadPhoto}
              aria-label="Upload or take a photo of a written ticket"
              disabled={isUploading}
            />
            {isUploading && (
              <span className="absolute inset-0 flex items-center justify-center bg-emerald-500/20 text-xs uppercase tracking-[0.3em] text-emerald-100">
                Processing…
              </span>
            )}
          </label>
        </header>

        {status && (
          <div
            role="status"
            className={`rounded-2xl border px-5 py-4 text-sm shadow-lg transition ${
              status.kind === 'success'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-100'
            }`}
          >
            {status.message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
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
                {isSearching ? 'Searching…' : `${results.length} match${results.length === 1 ? '' : 'es'}`}
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
                          onClick={() => addLine(item)}
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
                          <span className="w-10 text-center text-base font-semibold text-white">
                            {line.qty}
                          </span>
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
        </div>
      </div>
    </main>
  );
}
