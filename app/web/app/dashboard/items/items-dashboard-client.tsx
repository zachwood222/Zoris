'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { buildAuthHeaders, getApiBase } from '../../../lib/api';
import { queueKioskCartItem } from '../../../lib/kiosk-cart';

interface CatalogLocationInfo {
  location_id: number;
  location_name: string;
  qty_on_hand: number;
}

interface CatalogItemSummary {
  item_id: number;
  sku: string;
  description: string;
  vendor_model: string | null;
  total_on_hand: number;
  top_location: CatalogLocationInfo | null;
}

export default function ItemsDashboardClient() {
  const api = useMemo(() => getApiBase(), []);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<CatalogItemSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        const data = (await response.json()) as CatalogItemSummary[];
        if (!controller.signal.aborted) {
          setItems(data);
        }
      } catch (loadError) {
        if (controller.signal.aborted) {
          return;
        }
        console.error(loadError);
        setError('Unable to load catalog items.');
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

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  const handleAddToCart = (item: CatalogItemSummary) => {
    const success = queueKioskCartItem(item.item_id);
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }

    if (success) {
      setFeedback(`Queued ${item.description} for the kiosk cart.`);
    } else {
      setFeedback('Unable to queue this item for the kiosk cart.');
    }

    feedbackTimeoutRef.current = setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-xl shadow-slate-950/30 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1">
          <label className="block text-sm text-slate-300">
            <span className="mb-2 block font-semibold text-white">Search catalog</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by SKU, vendor model, description, barcode, or location"
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white focus:border-sky-400 focus:outline-none"
            />
          </label>
        </div>
        <div className="text-xs text-slate-400">
          Showing {items.length.toLocaleString()} item{items.length === 1 ? '' : 's'}
        </div>
      </div>
      {feedback && (
        <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 px-6 py-4 text-sm text-sky-100">
          {feedback}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80 shadow-xl shadow-slate-950/30">
        <table className="min-w-full divide-y divide-white/10 text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-[0.3em] text-slate-400">
            <tr>
              <th scope="col" className="px-6 py-3 font-semibold">SKU</th>
              <th scope="col" className="px-6 py-3 font-semibold">Description</th>
              <th scope="col" className="px-6 py-3 font-semibold">Vendor model</th>
              <th scope="col" className="px-6 py-3 font-semibold">On hand</th>
              <th scope="col" className="px-6 py-3 font-semibold">Primary location</th>
              <th scope="col" className="px-6 py-3 font-semibold text-right">Quick actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading && items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-400">
                  Loading catalog items…
                </td>
              </tr>
            )}
            {error && !isLoading && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-rose-200">
                  {error}
                </td>
              </tr>
            )}
            {!error && !isLoading && items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-400">
                  No catalog items match your filters.
                </td>
              </tr>
            )}
            {!error &&
              items.map((item) => {
                const topLocation = item.top_location;
                return (
                  <tr key={item.item_id} className="hover:bg-slate-900/60">
                    <td className="px-6 py-4 font-mono text-xs uppercase tracking-[0.3em] text-slate-300">{item.sku}</td>
                    <td className="px-6 py-4 text-sm text-white">{item.description}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">{item.vendor_model ?? '—'}</td>
                    <td className="px-6 py-4 text-sm text-emerald-200">
                      {numberFormatter.format(item.total_on_hand)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {topLocation
                        ? `${topLocation.location_name} (${numberFormatter.format(topLocation.qty_on_hand)} on hand)`
                        : 'No location assigned'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleAddToCart(item)}
                        className="inline-flex items-center gap-2 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-100 transition hover:border-sky-400/70 hover:bg-sky-500/20"
                      >
                        Add to cart
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
