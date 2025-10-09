'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';

import {
  type IncomingTruck,
  type PoLineSearchResult,
  type TruckStatus,
  type TruckUpdateStatus,
  type TruckUpdateType,
  submitTruckUpdate,
  useIncomingTrucks,
  usePoLineSearch
} from '../../lib/incoming-trucks';

const truckStatusLabels: Record<TruckStatus, string> = {
  scheduled: 'Scheduled',
  arrived: 'Arrived',
  unloading: 'Unloading',
  completed: 'Completed',
  cancelled: 'Cancelled'
};

const truckStatusStyles: Record<TruckStatus, string> = {
  scheduled: 'border-sky-400/40 bg-sky-500/10 text-sky-100',
  arrived: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100',
  unloading: 'border-amber-400/40 bg-amber-500/10 text-amber-100',
  completed: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  cancelled: 'border-rose-400/40 bg-rose-500/10 text-rose-100'
};

const updateStatusLabels: Record<TruckUpdateStatus, string> = {
  scheduled: 'Scheduled',
  arrived: 'Arrived',
  unloading: 'Unloading',
  completed: 'Completed',
  cancelled: 'Cancelled'
};

const updateStatusStyles: Record<TruckUpdateStatus, string> = {
  scheduled: 'border-sky-400/40 bg-sky-500/10 text-sky-100',
  arrived: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100',
  unloading: 'border-amber-400/40 bg-amber-500/10 text-amber-100',
  completed: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  cancelled: 'border-rose-400/40 bg-rose-500/10 text-rose-100'
};

const updateTypeLabels: Record<TruckUpdateType, string> = {
  status: 'Status update',
  note: 'Note',
  line_progress: 'Line progress'
};

const updateTypeStyles: Record<TruckUpdateType, string> = {
  status: 'border-slate-400/40 bg-slate-500/10 text-slate-200',
  note: 'border-slate-400/40 bg-slate-500/10 text-slate-200',
  line_progress: 'border-amber-400/40 bg-amber-500/10 text-amber-100'
};

const statusOptions: { value: TruckUpdateStatus; label: string }[] = [
  { value: 'arrived', label: 'Arrived' },
  { value: 'unloading', label: 'Unloading' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'scheduled', label: 'Scheduled' }
];

const updateTypeOptions: { value: TruckUpdateType; label: string }[] = [
  { value: 'status', label: 'Status update' },
  { value: 'note', label: 'Note' },
  { value: 'line_progress', label: 'Line progress' }
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

export default function IncomingTrucksPage() {
  const { trucks, data, isLoading, isValidating, error, mutate } = useIncomingTrucks();
  const [activeTruckId, setActiveTruckId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [updateType, setUpdateType] = useState<TruckUpdateType>('status');
  const [status, setStatus] = useState<TruckUpdateStatus>('arrived');
  const [quantity, setQuantity] = useState('');
  const [message, setMessage] = useState('');
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
    setUpdateType('status');
    setStatus('arrived');
    setQuantity('');
    setMessage('');
    setSelectedLine(null);
    setFormError(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setActiveTruckId(null);
    setSelectedLine(null);
    setSearchQuery('');
    setQuantity('');
    setMessage('');
    setFormError(null);
    setSubmitting(false);
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
    const trimmedQuantity = quantity.trim();
    const parsedQuantity = trimmedQuantity ? Number(trimmedQuantity) : null;

    if (updateType === 'line_progress') {
      if (!selectedLine) {
        setFormError('Select a PO line to record progress.');
        return;
      }
      if (!trimmedQuantity) {
        setFormError('Enter a quantity for line progress updates.');
        return;
      }
      if (Number.isNaN(parsedQuantity)) {
        setFormError('Enter a numeric quantity.');
        return;
      }
    } else if (trimmedQuantity && Number.isNaN(parsedQuantity)) {
      setFormError('Enter a numeric quantity.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const payload = {
        update_type: updateType,
        message: message.trim() ? message.trim() : undefined,
        status: updateType === 'status' ? status : undefined,
        quantity:
          updateType === 'line_progress'
            ? parsedQuantity
            : trimmedQuantity
              ? parsedQuantity
              : undefined,
        po_line_id: selectedLine?.po_line_id ?? undefined,
        item_id: selectedLine?.item_id ?? undefined
      };

      await submitTruckUpdate(
        activeTruck.truck_id,
        payload,
        {
          mutate,
          current: data
        }
      );
      setSubmitting(false);
      setFeedback({
        type: 'success',
        message: 'Update logged successfully.'
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
            const currentStatus = truck.updates.latest_status ?? truck.status;
            return (
              <li
                key={truck.truck_id}
                className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-xl shadow-slate-950/20 backdrop-blur"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold text-white">{truck.reference}</h2>
                      <p className="text-sm text-slate-300">{truck.carrier ?? '—'}</p>
                    </div>
                    <span
                      className={clsx(
                        'inline-flex items-center gap-2 rounded-full border px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em]',
                        truckStatusStyles[currentStatus] ?? truckStatusStyles.scheduled
                      )}
                    >
                      {truckStatusLabels[currentStatus] ?? truckStatusLabels.scheduled}
                    </span>
                  </div>
                  <div className="grid gap-3 text-xs text-slate-300 sm:grid-cols-3">
                    <div>
                      <p className="uppercase tracking-[0.35em] text-slate-400">Scheduled</p>
                      <p className="mt-1 text-sm text-white">{truck.scheduled_arrival ? formatDateTime(truck.scheduled_arrival) : '—'}</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-[0.35em] text-slate-400">Arrived</p>
                      <p className="mt-1 text-sm text-white">{truck.arrived_at ? formatDateTime(truck.arrived_at) : '—'}</p>
                    </div>
                    <div>
                      <p className="uppercase tracking-[0.35em] text-slate-400">PO</p>
                      <p className="mt-1 text-sm text-white">#{truck.po_id}</p>
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

                {truck.updates.history.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-slate-300">
                    No updates logged yet. Capture a quick status to let the floor know what’s happening.
                  </p>
                ) : (
                  <div className="space-y-5">
                    {truck.updates.line_progress.length > 0 ? (
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                        <h4 className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">Line progress</h4>
                        <ul className="mt-4 space-y-3 text-xs text-slate-200">
                          {truck.updates.line_progress.map((entry) => (
                            <li key={entry.po_line_id} className="flex items-center justify-between gap-4">
                              <span className="text-sm text-white">PO Line #{entry.po_line_id}</span>
                              <span className="text-xs text-slate-300">
                                Item {entry.item_id ?? '—'} • Qty {entry.total_quantity}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    <ul className="space-y-4">
                      {truck.updates.history.map((update) => {
                        const isStatusUpdate = update.update_type === 'status' && update.status;
                        const badgeClass = isStatusUpdate
                          ? updateStatusStyles[update.status as TruckUpdateStatus]
                          : updateTypeStyles[update.update_type];
                        const badgeLabel = isStatusUpdate
                          ? updateStatusLabels[update.status as TruckUpdateStatus]
                          : updateTypeLabels[update.update_type];

                        return (
                          <li
                            key={update.update_id}
                            className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-200"
                          >
                            <div className="flex items-center justify-between gap-4">
                              <span
                                className={clsx(
                                  'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em]',
                                  badgeClass
                                )}
                              >
                                {badgeLabel}
                              </span>
                              <time className="text-xs text-slate-400">{formatTime(update.created_at)}</time>
                            </div>
                            <p className="mt-1 text-xs text-slate-300">
                              {update.po_line_id ? `PO Line ${update.po_line_id}` : 'General'}
                              {update.item_id ? ` • Item ${update.item_id}` : ''}
                              {typeof update.quantity === 'number' ? ` • Qty ${update.quantity}` : ''}
                              {update.created_by ? ` • Logged by ${update.created_by}` : ''}
                            </p>
                            {update.message ? (
                              <p className="mt-3 text-sm text-slate-200">{update.message}</p>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
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
              <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                <span>Update type</span>
                <select
                  value={updateType}
                  onChange={(event) => {
                    setUpdateType(event.target.value as TruckUpdateType);
                    setFormError(null);
                  }}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                >
                  {updateTypeOptions.map((option) => (
                    <option key={option.value} value={option.value} className="bg-slate-900 text-slate-900">
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="space-y-2">
                <label htmlFor="po-search" className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                  Link to PO line {updateType === 'line_progress' ? '(required)' : '(optional)'}
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

              {updateType === 'status' ? (
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
              ) : null}

              {updateType === 'line_progress' ? (
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
              ) : null}

              <label className="space-y-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                <span>Notes</span>
                <textarea
                  id="notes"
                  rows={3}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
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
