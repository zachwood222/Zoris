'use client';

import { FormEvent, useState } from 'react';

interface DeliveryCompletion {
  orderNumber: string;
  recipient: string;
  signatureCaptured: boolean;
  photosCaptured: boolean;
  notes: string;
}

const createDefaultCompletion = (): DeliveryCompletion => ({
  orderNumber: '',
  recipient: '',
  signatureCaptured: true,
  photosCaptured: true,
  notes: ''
});

export default function DeliveryCompletePage() {
  const [completion, setCompletion] = useState<DeliveryCompletion>(() => createDefaultCompletion());
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setConfirmation(`Delivery ${completion.orderNumber || 'draft'} marked complete.`);
    setCompletion(createDefaultCompletion());
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 bg-slate-900 p-8 text-white">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Complete Delivery</h1>
        <p className="text-sm text-slate-300">Finalize paperwork, capture proof of delivery, and sync with ERP instantly.</p>
      </header>
      <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-lg shadow-slate-950/20">
        <form className="grid gap-4" onSubmit={submit}>
          <label className="grid gap-2 text-sm">
            <span className="font-semibold text-slate-200">Order number</span>
            <input
              value={completion.orderNumber}
              onChange={(event) => setCompletion((state) => ({ ...state, orderNumber: event.target.value }))}
              placeholder="ORD-87234"
              className="rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-sky-400 focus:outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-semibold text-slate-200">Recipient name</span>
            <input
              value={completion.recipient}
              onChange={(event) => setCompletion((state) => ({ ...state, recipient: event.target.value }))}
              placeholder="Morgan Lee"
              className="rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-sky-400 focus:outline-none"
            />
          </label>
          <fieldset className="grid gap-3 rounded-2xl border border-white/10 bg-slate-900/80 p-4 text-sm">
            <legend className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">Proof of delivery</legend>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={completion.signatureCaptured}
                onChange={(event) => setCompletion((state) => ({ ...state, signatureCaptured: event.target.checked }))}
                className="h-4 w-4 rounded border border-white/20 bg-slate-900"
              />
              <span className="text-slate-200">Signature captured</span>
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={completion.photosCaptured}
                onChange={(event) => setCompletion((state) => ({ ...state, photosCaptured: event.target.checked }))}
                className="h-4 w-4 rounded border border-white/20 bg-slate-900"
              />
              <span className="text-slate-200">Photos captured</span>
            </label>
          </fieldset>
          <label className="grid gap-2 text-sm">
            <span className="font-semibold text-slate-200">Delivery notes</span>
            <textarea
              value={completion.notes}
              onChange={(event) => setCompletion((state) => ({ ...state, notes: event.target.value }))}
              placeholder="Document access issues, damages, or follow-up tasks."
              className="min-h-[96px] rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-sky-400 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-sky-400"
          >
            Mark delivery complete
          </button>
        </form>
        {confirmation && (
          <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">{confirmation}</p>
        )}
      </section>
    </main>
  );
}
