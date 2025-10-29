'use client';

import { useEffect, useMemo, useState } from 'react';

import { buildAuthHeaders, getApiBase } from '../../../lib/api';

interface CatalogLocationInfo {
  location_id: number;
  location_name: string;
  qty_on_hand: number;
}

interface CatalogItem {
  item_id: number;
  sku: string;
  description: string;
  vendor_model: string | null;
  total_on_hand: number;
  top_location: CatalogLocationInfo | null;
}

export default function KioskCatalogLookupPage() {
  const api = useMemo(() => getApiBase(), []);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const handler = setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const headers = await buildAuthHeaders({ Accept: 'application/json' });
        const url = new URL(`${api}/items/catalog`);
        const search = query.trim();
        if (search) {
          url.searchParams.set('q', search);
        }

        const response = await fetch(url.toString(), {
          signal: controller.signal,
          headers
        });
        if (!response.ok) {
          throw new Error('Failed to load catalog items');
        }

        const data = (await response.json()) as CatalogItem[];
        if (!controller.signal.aborted) {
          setItems(data);
        }
      } catch (fetchError) {
        if (controller.signal.aborted) {
          return;
        }
        console.error(fetchError);
        setError('Unable to load the live catalog right now.');
        setItems([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 200);

    return () => {
      controller.abort();
      clearTimeout(handler);
    };
  }, [api, query]);

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 2
      }),
    []
  );

  const hasResults = items.length > 0;
  const trimmedQuery = query.trim();

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 bg-slate-900 p-8 text-white">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Lookup Item</h1>
        <p className="text-sm text-slate-300">
          Search the live catalog to assist guests and queue ticket line items instantly.
        </p>
      </header>
      <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-lg shadow-slate-950/20">
        <label className="grid gap-2 text-sm">
          <span className="font-semibold text-slate-200">
            Search by SKU, vendor model, description, barcode, or location
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search catalog..."
            className="rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-sky-400 focus:outline-none"
          />
        </label>
        <div className="mt-6 space-y-3">
          {error && (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
              {error}
            </p>
          )}
          {isLoading && !hasResults && !error && (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`catalog-skeleton-${index}`}
                  className="animate-pulse rounded-2xl border border-white/10 bg-slate-900/60 p-4"
                >
                  <div className="h-4 w-1/2 rounded bg-white/10" />
                  <div className="mt-2 h-3 w-1/3 rounded bg-white/5" />
                  <div className="mt-4 h-3 w-1/4 rounded bg-white/5" />
                </div>
              ))}
            </div>
          )}
          {!isLoading && !hasResults && !error && (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
              {trimmedQuery
                ? `No catalog items match “${trimmedQuery}”. Try refining your search or scanning a barcode.`
                : 'No catalog items are available yet. Import your spreadsheet to populate the live catalog.'}
            </p>
          )}
          {hasResults && (
            <ul className="space-y-3">
              {items.map((item) => {
                const topLocation = item.top_location;
                return (
                  <li key={item.item_id} className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">{item.description}</p>
                        <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{item.sku}</p>
                        {item.vendor_model && (
                          <p className="mt-1 text-xs text-slate-400">Vendor model: {item.vendor_model}</p>
                        )}
                      </div>
                      <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                        {numberFormatter.format(item.total_on_hand)} on hand
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-slate-300">
                      {topLocation
                        ? `${topLocation.location_name} • ${numberFormatter.format(topLocation.qty_on_hand)} in stock`
                        : 'No primary location assigned'}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
