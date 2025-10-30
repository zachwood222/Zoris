'use client';

import axios from 'axios';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { buildAuthHeaders, getApiBase } from '../../lib/api';

interface DeliverySummary {
  sale_id: number;
  ticket_number: string | null;
  customer_name: string | null;
  delivery_status: DeliveryStatus | null;
  status: string | null;
  total: number;
  scheduled_for: string | null;
}

type DeliveryStatus = 'queued' | 'scheduled' | 'out_for_delivery' | 'delivered' | 'failed';

const statusLabels: Record<DeliveryStatus, string> = {
  queued: 'Queued',
  scheduled: 'Scheduled',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  failed: 'Attention required'
};

const statusStyles: Record<DeliveryStatus, string> = {
  queued: 'border-amber-400/60 bg-amber-500/20 text-amber-100',
  scheduled: 'border-sky-400/60 bg-sky-500/20 text-sky-100',
  out_for_delivery: 'border-indigo-400/60 bg-indigo-500/20 text-indigo-100',
  delivered: 'border-emerald-400/60 bg-emerald-500/20 text-emerald-100',
  failed: 'border-rose-400/60 bg-rose-500/20 text-rose-100'
};

const badgeBaseClass =
  'inline-flex items-center rounded-full border px-4 py-1 text-sm font-semibold uppercase tracking-wide';

export default function DeliveryDashboardPage(): JSX.Element {
  const api = useMemo(() => getApiBase(), []);
  const [deliveries, setDeliveries] = useState<DeliverySummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }),
    []
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await buildAuthHeaders({ Accept: 'application/json' });
      const { data } = await axios.get<{ deliveries: DeliverySummary[] }>(`${api}/sales/deliveries`, {
        headers
      });
      setDeliveries(data.deliveries ?? []);
    } catch (err) {
      setError('Unable to load deliveries right now.');
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const hasDeliveries = deliveries.length > 0;

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 bg-slate-900 p-8 text-white">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Delivery Dashboard</h1>
        <p className="text-sm text-slate-300">
          Coordinate routes, keep crews accountable, and watch live progress in one command center.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/60 shadow-lg shadow-slate-950/20">
          <iframe
            title="Live delivery map"
            src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d24170.41788510428!2d-74.0016256!3d40.7127281!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sus!4v1700000000000!5m2!1sen!2sus"
            className="h-[320px] w-full border-0"
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
        <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-lg shadow-slate-950/20">
          <h2 className="text-lg font-semibold text-white">Quick actions</h2>
          <p className="text-sm text-slate-300">
            Launch the workflows the logistics desk touches all day.
          </p>
          <div className="grid gap-3">
            <Link
              href="/delivery/schedule"
              className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-sky-400/40 hover:text-white"
            >
              <span className="flex items-center gap-3">
                <span aria-hidden className="text-lg">
                  🚚
                </span>
                Schedule a delivery
              </span>
              <span aria-hidden className="transition group-hover:translate-x-1">→</span>
            </Link>
            <Link
              href="/delivery/complete"
              className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-emerald-400/40 hover:text-white"
            >
              <span className="flex items-center gap-3">
                <span aria-hidden className="text-lg">
                  ✅
                </span>
                Complete a delivery
              </span>
              <span aria-hidden className="transition group-hover:translate-x-1">→</span>
            </Link>
            <a
              href="#delivery-list"
              className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-indigo-400/40 hover:text-white"
            >
              <span className="flex items-center gap-3">
                <span aria-hidden className="text-lg">
                  📋
                </span>
                View delivery queue
              </span>
              <span aria-hidden className="transition group-hover:translate-x-1">→</span>
            </a>
          </div>
        </div>
      </section>

      <section id="delivery-list" className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-lg shadow-slate-950/20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Active deliveries</h2>
            <p className="text-sm text-slate-400">
              Track delivery promises from scheduled to signed and completed.
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-sky-400/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span aria-hidden className={loading ? 'animate-spin' : undefined}>⟳</span>
            Refresh
          </button>
        </div>
        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
        {loading ? (
          <p className="mt-6 text-sm text-slate-300">Loading delivery queue…</p>
        ) : hasDeliveries ? (
          <ul className="mt-6 grid gap-4">
            {deliveries.map((delivery) => {
              const status = delivery.delivery_status ?? 'queued';
              const badgeClass = `${badgeBaseClass} ${statusStyles[status as DeliveryStatus] ?? 'border-white/20 bg-white/10 text-white'}`;
              const label = statusLabels[status as DeliveryStatus] ?? 'Queued';
              const scheduledAt = delivery.scheduled_for
                ? new Date(delivery.scheduled_for).toLocaleString()
                : 'Window not assigned';
              const ticketLabel = delivery.ticket_number ?? `Sale #${delivery.sale_id}`;
              return (
                <li
                  key={delivery.sale_id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-200 shadow-sm shadow-slate-950/30"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-white">{delivery.customer_name ?? 'Customer TBD'}</p>
                      <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{ticketLabel}</p>
                      <p className="mt-2 text-sm text-slate-300">
                        Scheduled: <span className="text-white">{scheduledAt}</span>
                      </p>
                      <p className="mt-1 text-sm text-slate-300">
                        Order total: <span className="text-white">{currencyFormatter.format(delivery.total)}</span>
                      </p>
                    </div>
                    <div className="flex flex-col items-start gap-3 lg:items-end">
                      <span className={badgeClass}>{label}</span>
                      <Link
                        href={`/delivery/${delivery.sale_id}`}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-200 transition hover:border-sky-400/40 hover:text-white"
                      >
                        Manage status
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-6 text-sm text-slate-300">
            No deliveries are currently assigned. Schedule a delivery to see it appear here.
          </p>
        )}
      </section>
    </main>
  );
}
