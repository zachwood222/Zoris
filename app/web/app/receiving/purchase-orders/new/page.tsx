'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

import { buildAuthHeaders, getApiBase } from '../../../../lib/api';

interface InventoryItemSummary {
  item_id: number;
  sku: string;
  description: string;
  price: number;
  short_code: string;
  unit_cost: number;
}

interface PurchaseOrderLine {
  itemId: number | null;
  sku: string;
  description: string;
  quantity: number;
  unitCost: number;
  lastUnitCost: number | null;
}

interface PurchaseOrder {
  vendor: string;
  expectedDate: string;
  buyer: string;
  notes: string;
  lines: PurchaseOrderLine[];
}

const createBlankLine = (): PurchaseOrderLine => ({
  itemId: null,
  sku: '',
  description: '',
  quantity: 1,
  unitCost: 0,
  lastUnitCost: null
});

const createDefaultPurchaseOrder = (): PurchaseOrder => ({
  vendor: '',
  expectedDate: '',
  buyer: '',
  notes: '',
  lines: [createBlankLine()]
});

export default function ReceivingCreatePurchaseOrderPage() {
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder>(() => createDefaultPurchaseOrder());
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const api = useMemo(() => getApiBase(), []);
  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
    []
  );
  const [itemSearch, setItemSearch] = useState('');
  const [searchResults, setSearchResults] = useState<InventoryItemSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const updateLine = (
    index: number,
    field: 'sku' | 'description' | 'quantity' | 'unitCost',
    value: string
  ) => {
    setPurchaseOrder((state) => ({
      ...state,
      lines: state.lines.map((line, lineIndex) =>
        lineIndex === index
          ? {
              ...line,
              [field]: field === 'quantity' || field === 'unitCost' ? Number(value) || 0 : value
            }
          : line
      )
    }));
  };

  const addInventoryLine = (item: InventoryItemSummary) => {
    setPurchaseOrder((state) => {
      const mappedLine: PurchaseOrderLine = {
        itemId: item.item_id,
        sku: item.sku,
        description: item.description,
        quantity: 1,
        unitCost: item.unit_cost ?? 0,
        lastUnitCost: item.unit_cost ?? null
      };

      const nextLines = [...state.lines];
      const blankIndex = nextLines.findIndex((line) => !line.itemId && !line.sku);
      if (blankIndex >= 0) {
        nextLines[blankIndex] = mappedLine;
      } else {
        nextLines.push(mappedLine);
      }

      return {
        ...state,
        lines: nextLines
      };
    });
    setItemSearch('');
    setSearchResults([]);
    setSearchError(null);
    setHasSearched(false);
    setIsSearching(false);
  };

  const addLine = () => {
    setPurchaseOrder((state) => ({
      ...state,
      lines: [...state.lines, createBlankLine()]
    }));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setConfirmation(
      `PO drafted for ${purchaseOrder.vendor || 'unspecified vendor'} with ${purchaseOrder.lines.length} line item(s).`
    );
    setPurchaseOrder(createDefaultPurchaseOrder());
    setItemSearch('');
    setSearchResults([]);
    setSearchError(null);
    setHasSearched(false);
    setIsSearching(false);
  };

  useEffect(() => {
    const trimmed = itemSearch.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearchError(null);
      setIsSearching(false);
      setHasSearched(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setIsSearching(true);

    const timeoutId = window.setTimeout(async () => {
      try {
        const headers = await buildAuthHeaders({ Accept: 'application/json' });
        const response = await fetch(`${api}/items/search?q=${encodeURIComponent(trimmed)}`, {
          headers,
          signal: controller.signal
        });
        if (!response.ok) {
          throw new Error('search_failed');
        }
        const data = (await response.json()) as InventoryItemSummary[];
        if (!cancelled) {
          setSearchResults(data);
          setSearchError(null);
          setHasSearched(true);
        }
      } catch (error) {
        if (controller.signal.aborted || cancelled) {
          return;
        }
        setSearchResults([]);
        setHasSearched(false);
        setSearchError('Unable to search inventory right now.');
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [api, itemSearch]);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 bg-slate-900 p-8 text-white">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Create Purchase Order</h1>
        <p className="text-sm text-slate-300">
          Capture vendor details and planned quantities before the truck hits the road.
        </p>
      </header>
      <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-lg shadow-slate-950/20">
        <form className="grid gap-5" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-slate-200">Vendor</span>
              <input
                value={purchaseOrder.vendor}
                onChange={(event) => setPurchaseOrder((state) => ({ ...state, vendor: event.target.value }))}
                placeholder="Acme Suppliers"
                className="rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-sky-400 focus:outline-none"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-slate-200">Expected arrival</span>
              <input
                type="date"
                value={purchaseOrder.expectedDate}
                onChange={(event) => setPurchaseOrder((state) => ({ ...state, expectedDate: event.target.value }))}
                className="rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-sky-400 focus:outline-none"
              />
            </label>
          </div>
          <label className="grid gap-2 text-sm sm:max-w-sm">
            <span className="font-semibold text-slate-200">Buyer</span>
            <input
              value={purchaseOrder.buyer}
              onChange={(event) => setPurchaseOrder((state) => ({ ...state, buyer: event.target.value }))}
              placeholder="Taylor Reed"
              className="rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-sky-400 focus:outline-none"
            />
          </label>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Line items</h2>
              <button
                type="button"
                onClick={addLine}
                className="inline-flex items-center rounded-lg border border-sky-400/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-sky-200 transition hover:border-sky-300 hover:text-sky-100"
              >
                Add line
              </button>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
              <label className="grid gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                <span>Search inventory</span>
                <input
                  value={itemSearch}
                  onChange={(event) => setItemSearch(event.target.value)}
                  placeholder="Search by SKU, description, or short code"
                  className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none"
                />
              </label>
              {itemSearch.trim().length >= 2 && (
                <div className="mt-3 divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10 bg-slate-950/70">
                  {isSearching ? (
                    <p className="px-4 py-3 text-xs text-slate-300">Searching inventory…</p>
                  ) : searchError ? (
                    <p className="px-4 py-3 text-xs text-rose-300">{searchError}</p>
                  ) : hasSearched && searchResults.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-slate-300">
                      No inventory items matched “{itemSearch}”.
                    </p>
                  ) : (
                    <ul className="divide-y divide-white/5 text-sm">
                      {searchResults.map((item) => (
                        <li key={item.item_id}>
                          <button
                            type="button"
                            onClick={() => addInventoryLine(item)}
                            className="flex w-full flex-col gap-1 px-4 py-3 text-left transition hover:bg-sky-500/10 focus:outline-none focus-visible:bg-sky-500/10"
                          >
                            <span className="text-sm font-semibold text-slate-100">{item.sku}</span>
                            <span className="text-xs text-slate-300">{item.description}</span>
                            <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                              Last cost {currencyFormatter.format(item.unit_cost)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <div className="grid gap-4">
              {purchaseOrder.lines.map((line, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-2xl border border-white/10 bg-slate-900/80 p-4 sm:grid-cols-[1fr_2fr_minmax(88px,_120px)_minmax(120px,_160px)] sm:items-start sm:gap-4"
                >
                  <label className="grid gap-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                    <span>SKU</span>
                    <input
                      value={line.sku}
                      onChange={(event) => updateLine(index, 'sku', event.target.value)}
                      placeholder="SKU-12345"
                      className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none"
                    />
                  </label>
                  <label className="grid gap-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                    <span>Description</span>
                    <input
                      value={line.description}
                      onChange={(event) => updateLine(index, 'description', event.target.value)}
                      placeholder={'4" dimmable smart bulb'}
                      className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none"
                    />
                  </label>
                  <label className="grid gap-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                    <span>Quantity</span>
                    <input
                      type="number"
                      min={0}
                      value={line.quantity}
                      onChange={(event) => updateLine(index, 'quantity', event.target.value)}
                      className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none"
                    />
                  </label>
                  <label className="grid gap-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                    <span>Unit cost</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.unitCost}
                      onChange={(event) => updateLine(index, 'unitCost', event.target.value)}
                      className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-sky-400 focus:outline-none"
                    />
                  </label>
                  {line.lastUnitCost !== null && (
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 sm:col-span-4">
                      Last catalog cost{' '}
                      <span className="font-semibold text-slate-200">
                        {currencyFormatter.format(line.lastUnitCost)}
                      </span>
                      {Math.abs(line.unitCost - line.lastUnitCost) > 0.009 && (
                        <span className="ml-2 text-amber-300">
                          Adjusted to {currencyFormatter.format(line.unitCost)}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
          <label className="grid gap-2 text-sm">
            <span className="font-semibold text-slate-200">Notes</span>
            <textarea
              value={purchaseOrder.notes}
              onChange={(event) => setPurchaseOrder((state) => ({ ...state, notes: event.target.value }))}
              placeholder="Add routing instructions or special handling alerts."
              className="min-h-[96px] rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-sky-400 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-sky-400"
          >
            Draft purchase order
          </button>
        </form>
        {confirmation && (
          <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">{confirmation}</p>
        )}
      </section>
    </main>
  );
}
