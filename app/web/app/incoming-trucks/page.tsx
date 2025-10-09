'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';

import {
  type IncomingTruck,
  type PoLineSearchResult,
  type TruckStatus,
  type TruckUpdateStatus,
  submitTruckUpdate,
  useIncomingTrucks,
  usePoLineSearch
} from '../../lib/incoming-trucks';

const truckStatusLabels: Record<TruckStatus, string> = {
  en_route: 'En route',
  checked_in: 'Checked in',
  docked: 'Docked',
  unloading: 'Unloading',
  complete: 'Complete',
  issue: 'Attention'
};

const truckStatusStyles: Record<TruckStatus, string> = {
  en_route: 'border-sky-400/40 bg-sky-500/10 text-sky-100',
  checked_in: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100',
  docked: 'border-indigo-400/40 bg-indigo-500/10 text-indigo-100',
  unloading: 'border-amber-400/40 bg-amber-500/10 text-amber-100',
  complete: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  issue: 'border-rose-400/40 bg-rose-500/10 text-rose-100'
};

const updateStatusLabels: Record<TruckUpdateStatus, string> = {
  en_route: 'En route',
  checked_in: 'Checked in',
  docked: 'Docked',
  unloading: 'Unloading',
  complete: 'Complete',
  issue: 'Issue'
};

const updateStatusStyles: Record<TruckUpdateStatus, string> = {
  en_route: 'border-sky-400/40 bg-sky-500/10 text-sky-100',
  checked_in: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100',
  docked: 'border-indigo-400/40 bg-indigo-500/10 text-indigo-100',
  unloading: 'border-amber-400/40 bg-amber-500/10 text-amber-100',
  complete: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  issue: 'border-rose-400/40 bg-rose-500/10 text-rose-100'
};

const statusOptions: { value: TruckUpdateStatus; label: string }[] = [
  { value: 'checked_in', label: 'Checked in' },
  { value: 'docked', label: 'Docked' },
  { value: 'unloading', label: 'Unloading' },
  { value: 'complete', label: 'Complete' },
  { value: 'issue', label: 'Issue' },
  { value: 'en_route', label: 'En route' }
];

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function uniquePoNumbers(truck: IncomingTruck): string[] {
  if (truck.po_numbers && truck.po_numbers.length > 0) {
    return truck.po_numbers;
  }
  const numbers = new Set<string>();
  truck.updates.forEach((update) => {
    if (update.po_number) {
      numbers.add(update.po_number);
    }
  });
  return Array.from(numbers);
}

export default function IncomingTrucksPage() {
  const { trucks, data, isLoading, isValidating, error, mutate } = useIncomingTrucks();
  const [activeTruckId, setActiveTruckId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState<TruckUpdateStatus>('checked_in');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [selectedLine, setSelectedLine] = useState<PoLineSearchResult | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const search = usePoLineSearch(searchQuery);

  const activeTruck = useMemo(
    () => trucks.find((truck) => truck.truck_id === activeTruckId) ?? null,
    [trucks, activeTruckId]
  );

  const openModal = (truck: IncomingTruck) => {
    setActiveTruckId(truck.truck_id);
    setIsModalOpen(true);
    setSearchQuery('');
    setStatus('checked_in');
    setQuantity('');
    setNote('');
    setSelectedLine(null);
    setFormError(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setActiveTruckId(null);
    setSelectedLine(null);
    setSearchQuery('');
    setQuantity('');
    setNote('');
    setFormError(null);
  };

  const handleSelectLine = (line: PoLineSearchResult) => {
    setSelectedLine(line);
    setSearchQuery('');
    setFormError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeTruck) {
      return;
    }
    if (!selectedLine) {
      setFormError('Select a PO line to link this update.');
      return;
    }

    const trimmedQuantity = quantity.trim();
    const parsedQuantity = trimmedQuantity ? Number(trimmedQuantity) : null;
    if (trimmedQuantity && Number.isNaN(parsedQuantity)) {
      setFormError('Enter a numeric quantity.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      await submitTruckUpdate(
        activeTruck.truck_id,
        {
          po_id: selectedLine.po_id,
          po_line_id: selectedLine.po_line_id,
          item_id: selectedLine.item_id,
          status,
          quantity: parsedQuantity,
          note: note.trim()
        },
        {
          mutate,
          current: data,
          metadata: {
            poId: selectedLine.po_id,
            poNumber: selectedLine.po_number,
            poLineId: selectedLine.po_line_id,
            itemId: selectedLine.item_id,
            itemDescription: selectedLine.item_description
          }
        }
      );
      setFeedback({
        type: 'success',
        message: `Update logged for ${selectedLine.po_number}.`
      });
      closeModal();
    } catch (err) {
      setSubmitting(false);
      setFeedback({
        type: 'error',
        message: 'Unable to save the update. Please try again.'
      });
      return;
    }

    setSubmitting(false);
  };

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-14 text-slate-100 lg:px-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_rgba(76,29,149,0.05))]" />
      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-slate-200">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
              Logistics
            </span>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-white">Incoming Trucks</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Monitor inbound loads, tie updates to purchase orders, and keep the dock crew aligned on what’s arriving next.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            {isValidating ? <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1">Refreshing…</span> : null}
          </div>
        </div>
        {error ? (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            Unable to load incoming trucks. Try reloading the workspace.
          </div>
        ) : null}
        {feedback ? (
          <div
            className={clsx(
              'flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-sm shadow-lg shadow-slate-950/20',
              feedback.type === 'success'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-100'
            )}
          >
            <p>{feedback.message}</p>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-xs uppercase tracking-[0.28em] text-white transition hover:border-white/30 hover:bg-white/20"
            >
              Close
            </button>
          </div>
        ) : null}
      </header>

      <section className="space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(2)].map((_, index) => (
              <div
                key={index}
                className="h-48 w-full animate-pulse rounded-3xl border border-white/10 bg-white/5"
              />
            ))}
          </div>
        ) : null}

        {!isLoading && trucks.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-10 text-center text-sm text-slate-300">
            No inbound trucks are scheduled right now. Updates will appear the moment a carrier checks in.
          </div>
        ) : null}

        <ul className="grid gap-6 lg:grid-cols-2">
          {trucks.map((truck) => {
            const poNumbers = uniquePoNumbers(truck);
            return (
              <li
                key={truck.truck_id}
                className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-xl shadow-slate-950/20 backdrop-blur"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold text-white">{truck.reference}</h2>
                      <p className="text-sm text-slate-300">{truck.carrier}</p>
                    </div>
                    <span
                      className={clsx(
                        'inline-flex items-center gap-2 rounded-full border px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em]',
                        truckStatusStyles[truck.status] ?? truckStatusStyles.en_route
                      )}
                    >
                      {truckStatusLabels[truck.status] ?? truckStatusLabels.en_route}
                    </span>
                  </div>
                  <div className="grid gap-3 text-xs text-slate-300 sm:grid-cols-3">
                    <div>
                      <p className="uppercase tracking-[0.35em] text-slate-400">ETA</p>
                      <p className="mt-1 text-sm text-white">{formatDateTime(truck.eta)}</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-[0.35em] text-slate-400">Door</p>
                      <p className="mt-1 text-sm text-white">{truck.door ?? '—'}</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-[0.35em] text-slate-400">Linked POs</p>
                      <p className="mt-1 text-sm text-white">{poNumbers.length > 0 ? poNumbers.join(', ') : '—'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">Updates</h3>
                  <button
                    type="button"
                    onClick={() => openModal(truck)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white transition hover:border-white/30 hover:bg-white/20"
                  >
                    Add update
                  </button>
                </div>

                {truck.updates.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-slate-300">
                    No updates logged yet. Capture a quick status to let the floor know what’s happening.
                  </p>
                ) : (
                  <ul className="space-y-4">
                    {truck.updates.map((update) => (
                      <li
                        key={update.update_id}
                        className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-200"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <span
                            className={clsx(
                              'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em]',
                              updateStatusStyles[update.status] ?? updateStatusStyles.en_route
                            )}
                          >
                            {updateStatusLabels[update.status] ?? updateStatusLabels.en_route}
                          </span>
                          <time className="text-xs text-slate-400">{formatTime(update.created_at)}</time>
                        </div>
                        <p className="mt-3 text-sm font-semibold text-white">
                          PO {update.po_number} • {update.item_description}
                        </p>
                        <p className="mt-1 text-xs text-slate-300">
                          Qty {update.quantity ?? '—'} • Logged by {update.created_by}
                        </p>
                        {update.note ? (
                          <p className="mt-3 text-sm text-slate-200">{update.note}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {isModalOpen && activeTruck ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="incoming-truck-update-title"
            className="relative w-full max-w-xl rounded-3xl border border-white/10 bg-slate-900/90 p-8 text-slate-100 shadow-2xl shadow-slate-950/40 backdrop-blur"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="incoming-truck-update-title" className="text-xl font-semibold text-white">
                  Log update for {activeTruck.reference}
                </h2>
                <p className="text-sm text-slate-300">{activeTruck.carrier}</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-lg text-white transition hover:border-white/30 hover:bg-white/20"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-6">
              <div className="space-y-2">
                <label htmlFor="po-search" className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                  Link to PO line
                </label>
                <input
                  id="po-search"
                  type="text"
                  placeholder="Search PO or item"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setFormError(null);
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                />
                <div
                  className="max-h-52 overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/70"
                  role="listbox"
                  aria-label="Purchase order results"
                >
                  {!search.hasSearched ? (
                    <p className="px-4 py-3 text-xs text-slate-400">Start typing to search purchase order lines.</p>
                  ) : search.isLoading ? (
                    <p className="px-4 py-3 text-xs text-slate-400">Searching…</p>
                  ) : search.results.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-slate-400">No open PO lines matched that search.</p>
                  ) : (
                    <ul className="divide-y divide-white/5">
                      {search.results.map((line) => (
                        <li key={line.po_line_id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={selectedLine?.po_line_id === line.po_line_id}
                            className={clsx(
                              'w-full px-4 py-3 text-left text-sm transition',
                              selectedLine?.po_line_id === line.po_line_id
                                ? 'bg-sky-500/20 text-white'
                                : 'text-slate-200 hover:bg-white/5'
                            )}
                            onClick={() => handleSelectLine(line)}
                          >
                            <span className="block text-sm font-semibold text-white">{line.po_number}</span>
                            <span className="block text-xs text-slate-300">{line.item_description}</span>
                            <span className="block text-xs text-slate-400">
                              Item #{line.item_id}
                              {typeof line.qty_remaining === 'number'
                                ? ` • ${line.qty_remaining} remaining`
                                : ''}
                              {line.vendor ? ` • ${line.vendor}` : ''}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {selectedLine ? (
                  <p className="text-xs text-emerald-200">
                    Linked to {selectedLine.po_number} • {selectedLine.item_description}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                  <span>Status</span>
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value as TruckUpdateStatus)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value} className="bg-slate-900 text-slate-900">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                  <span>Quantity</span>
                  <input
                    id="quantity"
                    type="number"
                    inputMode="decimal"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  />
                </label>
              </div>

              <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                <span>Notes</span>
                <textarea
                  id="notes"
                  rows={3}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                />
              </label>

              {formError ? (
                <p className="text-sm text-rose-200">{formError}</p>
              ) : null}

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white transition hover:border-white/30 hover:bg-white/20"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-full border border-sky-400/40 bg-sky-500/20 px-5 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-sky-100 transition hover:border-sky-300/60 hover:bg-sky-500/30 disabled:opacity-60"
                >
                  {submitting ? 'Saving…' : 'Log update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
