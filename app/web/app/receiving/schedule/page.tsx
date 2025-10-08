'use client';

import { FormEvent, useState } from 'react';

interface DockReservation {
  carrier: string;
  windowStart: string;
  windowEnd: string;
  dock: string;
  notes: string;
}

const defaultReservation: DockReservation = {
  carrier: '',
  windowStart: '',
  windowEnd: '',
  dock: 'A',
  notes: ''
};

export default function ReceivingSchedulePage() {
  const [reservation, setReservation] = useState<DockReservation>(defaultReservation);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setConfirmation(
      `Dock ${reservation.dock} reserved for ${reservation.carrier || 'unspecified carrier'} (${reservation.windowStart || 'TBD'} - ${reservation.windowEnd || 'TBD'})`
    );
    setReservation(defaultReservation);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 bg-slate-900 p-8 text-white">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Schedule Receiving Window</h1>
        <p className="text-sm text-slate-300">
          Block a dock and notify the floor that inbound freight is on the way.
        </p>
      </header>
      <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-lg shadow-slate-950/20">
        <form className="grid gap-4" onSubmit={submit}>
          <label className="grid gap-2 text-sm">
            <span className="font-semibold text-slate-200">Carrier</span>
            <input
              value={reservation.carrier}
              onChange={(event) => setReservation((state) => ({ ...state, carrier: event.target.value }))}
              placeholder="Acme Logistics"
              className="rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-sky-400 focus:outline-none"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-slate-200">Window start</span>
              <input
                type="datetime-local"
                value={reservation.windowStart}
                onChange={(event) => setReservation((state) => ({ ...state, windowStart: event.target.value }))}
                className="rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-sky-400 focus:outline-none"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-slate-200">Window end</span>
              <input
                type="datetime-local"
                value={reservation.windowEnd}
                onChange={(event) => setReservation((state) => ({ ...state, windowEnd: event.target.value }))}
                className="rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-sky-400 focus:outline-none"
              />
            </label>
          </div>
          <label className="grid gap-2 text-sm sm:max-w-xs">
            <span className="font-semibold text-slate-200">Dock</span>
            <select
              value={reservation.dock}
              onChange={(event) => setReservation((state) => ({ ...state, dock: event.target.value }))}
              className="rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-sky-400 focus:outline-none"
            >
              <option value="A">Dock A</option>
              <option value="B">Dock B</option>
              <option value="C">Dock C</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-semibold text-slate-200">Notes</span>
            <textarea
              value={reservation.notes}
              onChange={(event) => setReservation((state) => ({ ...state, notes: event.target.value }))}
              placeholder="Liftgate required, notify receiving when 30 minutes out."
              className="min-h-[96px] rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-sky-400 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            className="mt-2 inline-flex items-center justify-center rounded-lg bg-sky-500 px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-sky-400"
          >
            Reserve dock
          </button>
        </form>
        {confirmation && (
          <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            {confirmation}
          </p>
        )}
      </section>
    </main>
  );
}
