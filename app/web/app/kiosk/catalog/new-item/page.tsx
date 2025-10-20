'use client';

import { FormEvent, useState } from 'react';

interface NewItem {
  sku: string;
  description: string;
  price: string;
  department: string;
  barcode: string;
  notes: string;
}

const createDefaultItem = (): NewItem => ({
  sku: '',
  description: '',
  price: '',
  department: 'Lighting',
  barcode: '',
  notes: ''
});

export default function KioskCatalogNewItemPage() {
  const [item, setItem] = useState<NewItem>(() => createDefaultItem());
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setConfirmation(`Item ${item.sku || 'draft'} staged for review.`);
    setItem(createDefaultItem());
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 bg-slate-900 p-8 text-white">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Add New Item</h1>
        <p className="text-sm text-slate-300">Capture product data so the sales floor can start selling immediately.</p>
      </header>
      <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-lg shadow-slate-950/20">
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-slate-200">SKU</span>
              <input
                value={item.sku}
                onChange={(event) => setItem((state) => ({ ...state, sku: event.target.value }))}
                placeholder="SKU-5550"
                className="rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-sky-400 focus:outline-none"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-slate-200">Department</span>
              <select
                value={item.department}
                onChange={(event) => setItem((state) => ({ ...state, department: event.target.value }))}
                className="rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-sky-400 focus:outline-none"
              >
                <option value="Lighting">Lighting</option>
                <option value="Appliances">Appliances</option>
                <option value="Hardware">Hardware</option>
                <option value="Seasonal">Seasonal</option>
              </select>
            </label>
          </div>
          <label className="grid gap-2 text-sm">
            <span className="font-semibold text-slate-200">Description</span>
            <input
              value={item.description}
              onChange={(event) => setItem((state) => ({ ...state, description: event.target.value }))}
              placeholder="Wi-Fi Dimmer Switch, 2-pack"
              className="rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-sky-400 focus:outline-none"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-slate-200">Price</span>
              <input
                value={item.price}
                onChange={(event) => setItem((state) => ({ ...state, price: event.target.value }))}
                placeholder="$39.99"
                className="rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-sky-400 focus:outline-none"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-slate-200">Barcode</span>
              <input
                value={item.barcode}
                onChange={(event) => setItem((state) => ({ ...state, barcode: event.target.value }))}
                placeholder="012345678905"
                className="rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-sky-400 focus:outline-none"
              />
            </label>
          </div>
          <label className="grid gap-2 text-sm">
            <span className="font-semibold text-slate-200">Notes</span>
            <textarea
              value={item.notes}
              onChange={(event) => setItem((state) => ({ ...state, notes: event.target.value }))}
              placeholder="Include install add-ons or safety callouts."
              className="min-h-[96px] rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-sky-400 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-sky-400"
          >
            Stage for review
          </button>
        </form>
        {confirmation && (
          <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">{confirmation}</p>
        )}
      </section>
    </main>
  );
}
