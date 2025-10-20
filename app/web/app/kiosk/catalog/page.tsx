'use client';

import { useMemo, useState } from 'react';

interface CatalogItem {
  sku: string;
  description: string;
  location: string;
  onHand: number;
}

const sampleItems: CatalogItem[] = [
  { sku: 'SKU-1001', description: 'Smart home hub with Zigbee bridge', location: 'Aisle 3, Bay 12', onHand: 6 },
  { sku: 'SKU-2044', description: 'Outdoor LED floodlight kit', location: 'Aisle 18, Bay 02', onHand: 14 },
  { sku: 'SKU-8110', description: 'Wireless keypad door lock', location: 'Aisle 7, Bay 06', onHand: 4 },
  { sku: 'SKU-9900', description: 'Programmable thermostat (white)', location: 'Aisle 2, Bay 01', onHand: 9 }
];

export default function KioskCatalogLookupPage() {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (!query.trim()) {
      return sampleItems;
    }

    const lower = query.toLowerCase();
    return sampleItems.filter(
      (item) => item.sku.toLowerCase().includes(lower) || item.description.toLowerCase().includes(lower)
    );
  }, [query]);

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
          <span className="font-semibold text-slate-200">Search by SKU or description</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search catalog..."
            className="rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-sky-400 focus:outline-none"
          />
        </label>
        <div className="mt-6 space-y-3">
          {results.length === 0 ? (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
              No catalog items match “{query}”. Try refining your search or scanning a barcode.
            </p>
          ) : (
            <ul className="space-y-3">
              {results.map((item) => (
                <li key={item.sku} className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-white">{item.description}</p>
                      <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{item.sku}</p>
                    </div>
                    <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                      {item.onHand} on hand
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-slate-300">{item.location}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
