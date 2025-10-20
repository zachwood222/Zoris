'use client';

import { FormEvent, useState } from 'react';

interface DeliveryWindow {
  customer: string;
  address: string;
  windowStart: string;
  windowEnd: string;
  crew: string;
  specialInstructions: string;
}

const createDefaultWindow = (): DeliveryWindow => ({
  customer: '',
  address: '',
  windowStart: '',
  windowEnd: '',
  crew: 'North route',
  specialInstructions: ''
});

export default function DeliverySchedulePage() {
  const [window, setWindow] = useState<DeliveryWindow>(() => createDefaultWindow());
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setConfirmation(
      `Delivery scheduled for ${window.customer || 'TBD'} (${window.windowStart || 'unscheduled'} - ${window.windowEnd || 'unscheduled'})`
    );
    setWindow(createDefaultWindow());
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 bg-slate-900 p-8 text-white">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Schedule Delivery</h1>
        <p className="text-sm text-slate-300">Coordinate last-mile logistics and keep the crew aligned with customer expectations.</p>
      </header>
      <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-lg shadow-slate-950/20">
        <form className="grid gap-4" onSubmit={submit}>
          <label className="grid gap-2 text-sm">
            <span className="font-semibold text-slate-200">Customer</span>
            <input
              value={window.customer}
              onChange={(event) => setWindow((state) => ({ ...state, customer: event.target.value }))}
              placeholder="Jordan Smith"
              className="rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-sky-400 focus:outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-semibold text-slate-200">Address</span>
            <textarea
              value={window.address}
              onChange={(event) => setWindow((state) => ({ ...state, address: event.target.value }))}
              placeholder="123 Market Street, Springfield, NY 12345"
              className="min-h-[72px] rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-sky-400 focus:outline-none"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-slate-200">Window start</span>
              <input
                type="datetime-local"
                value={window.windowStart}
                onChange={(event) => setWindow((state) => ({ ...state, windowStart: event.target.value }))}
                className="rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-sky-400 focus:outline-none"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-slate-200">Window end</span>
              <input
                type="datetime-local"
                value={window.windowEnd}
                onChange={(event) => setWindow((state) => ({ ...state, windowEnd: event.target.value }))}
                className="rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-sky-400 focus:outline-none"
              />
            </label>
          </div>
          <label className="grid gap-2 text-sm sm:max-w-xs">
            <span className="font-semibold text-slate-200">Crew assignment</span>
            <select
              value={window.crew}
              onChange={(event) => setWindow((state) => ({ ...state, crew: event.target.value }))}
              className="rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-sky-400 focus:outline-none"
            >
              <option value="North route">North route</option>
              <option value="South route">South route</option>
              <option value="East route">East route</option>
              <option value="West route">West route</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-semibold text-slate-200">Special instructions</span>
            <textarea
              value={window.specialInstructions}
              onChange={(event) => setWindow((state) => ({ ...state, specialInstructions: event.target.value }))}
              placeholder="Gate code 4321, call 15 minutes prior, bring appliance dolly."
              className="min-h-[96px] rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-sky-400 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-sky-400"
          >
            Schedule delivery
          </button>
        </form>
        {confirmation && (
          <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">{confirmation}</p>
        )}
      </section>
    </main>
  );
}
