'use client';

import axios from 'axios';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { apiBase, buildAuthHeaders } from '../../../lib/api';

type DeliveryStatus =
  | 'queued'
  | 'scheduled'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed';

const statusLabels: Record<DeliveryStatus, string> = {
  queued: 'Queued',
  scheduled: 'Scheduled',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  failed: 'Attention required'
};

const statusClasses: Record<DeliveryStatus, string> = {
  queued: 'border-amber-400/60 bg-amber-500/20 text-amber-100',
  scheduled: 'border-sky-400/60 bg-sky-500/20 text-sky-100',
  out_for_delivery: 'border-indigo-400/60 bg-indigo-500/20 text-indigo-100',
  delivered: 'border-emerald-400/60 bg-emerald-500/20 text-emerald-100',
  failed: 'border-rose-400/60 bg-rose-500/20 text-rose-100'
};

interface DeliveryStatusResponse {
  sale_id: number;
  delivery_status: DeliveryStatus | null;
}

export default function DeliveryPage() {
  const { id } = useParams<{ id: string }>();
  const api = apiBase;

  const [status, setStatus] = useState<DeliveryStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const badgeClass = useMemo(() => {
    const base = 'inline-flex items-center rounded-full border px-4 py-1 text-sm font-semibold uppercase tracking-wide';
    if (!status) {
      return `${base} border-slate-400/60 bg-slate-800 text-slate-200`;
    }
    return `${base} ${statusClasses[status]}`;
  }, [status]);

  const friendlyStatus = status ? statusLabels[status] : loading ? 'Loading…' : 'Unknown';

  useEffect(() => {
    let ignore = false;
    const fetchStatus = async () => {
      if (!id) {
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const headers = await buildAuthHeaders();
        const { data } = await axios.get<DeliveryStatusResponse>(
          `${api}/sales/${id}/delivery-status`,
          { headers }
        );
        if (!ignore) {
          setStatus(data.delivery_status ?? 'queued');
        }
      } catch (err) {
        if (!ignore) {
          setError('Unable to load delivery status.');
          setStatus(null);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchStatus();

    return () => {
      ignore = true;
    };
  }, [api, id]);

  const handleUpdate = useCallback(
    async (next: DeliveryStatus) => {
      if (!id) {
        return;
      }
      setUpdating(true);
      setError(null);
      try {
        const headers = await buildAuthHeaders();
        const { data } = await axios.patch<DeliveryStatusResponse>(
          `${api}/sales/${id}/delivery-status`,
          { delivery_status: next },
          { headers }
        );
        setStatus(data.delivery_status ?? next);
      } catch (err) {
        setError('Unable to update delivery status.');
      } finally {
        setUpdating(false);
      }
    },
    [api, id]
  );

  const actions: { label: string; next: DeliveryStatus; tone: 'primary' | 'danger' }[] = [
    { label: 'Scheduled', next: 'scheduled', tone: 'primary' },
    { label: 'Out for Delivery', next: 'out_for_delivery', tone: 'primary' },
    { label: 'Delivered', next: 'delivered', tone: 'primary' },
    { label: 'Problem', next: 'failed', tone: 'danger' }
  ];

  return (
    <main className="flex min-h-screen flex-col gap-6 bg-slate-900 p-8 text-white">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Delivery #{id}</h1>
        <div className="flex items-center gap-3 text-slate-300">
          <span>Current status</span>
          <span className={badgeClass}>{friendlyStatus}</span>
        </div>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      </header>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            disabled={updating || loading}
            className={`rounded px-4 py-6 text-lg font-semibold shadow transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 ${
              action.tone === 'danger'
                ? 'bg-rose-600 hover:bg-rose-500 focus:ring-rose-300 disabled:bg-rose-800/60'
                : 'bg-emerald-600 hover:bg-emerald-500 focus:ring-emerald-300 disabled:bg-emerald-800/60'
            }`}
            onClick={() => handleUpdate(action.next)}
          >
            {action.label}
          </button>
        ))}
      </section>
    </main>
  );
}
