'use client';

import { FormEvent, useState } from 'react';

interface PurchaseOrder {
  vendor: string;
  expectedDate: string;
  buyer: string;
  notes: string;
  lines: Array<{ sku: string; description: string; quantity: number }>;
}

const createBlankLine = () => ({ sku: '', description: '', quantity: 1 });

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

  const updateLine = (index: number, field: 'sku' | 'description' | 'quantity', value: string) => {
    setPurchaseOrder((state) => ({
      ...state,
      lines: state.lines.map((line, lineIndex) =>
        lineIndex === index
          ? {
              ...line,
              [field]: field === 'quantity' ? Number(value) || 0 : value
            }
          : line
      )
    }));
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
  };

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
          <div className="space-y-3">
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
            <div className="grid gap-4">
              {purchaseOrder.lines.map((line, index) => (
                <div key={index} className="grid gap-3 rounded-2xl border border-white/10 bg-slate-900/80 p-4 sm:grid-cols-[1fr_2fr_minmax(88px,_120px)] sm:items-center sm:gap-4">
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
