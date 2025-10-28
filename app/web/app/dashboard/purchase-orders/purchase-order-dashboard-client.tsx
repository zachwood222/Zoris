'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';

import { buildAuthHeaders, getApiBase } from '../../../lib/api';

type PurchaseOrderSummary = {
  po_id: number;
  status: string;
  vendor_name: string | null;
  expected_date: string | null;
  total_lines: number;
  open_lines: number;
  received_lines: number;
  qty_ordered: number;
  qty_received: number;
  notes: string | null;
};

type ActionMessage = {
  type: 'success' | 'error';
  text: string;
};

const statusBadgeClasses: Record<string, string> = {
  draft: 'border-white/20 bg-white/10 text-slate-200',
  open: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100',
  partial: 'border-amber-400/40 bg-amber-400/10 text-amber-100',
  received: 'border-sky-400/40 bg-sky-400/10 text-sky-100',
  closed: 'border-slate-500/40 bg-slate-500/10 text-slate-200'
};

const fetchPurchaseOrders = async (url: string): Promise<PurchaseOrderSummary[]> => {
  const headers = await buildAuthHeaders({ Accept: 'application/json' });
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error('Failed to load purchase orders');
  }
  return response.json();
};

const formatDate = (value: string | null): string => {
  if (!value) {
    return 'Not scheduled';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Not scheduled';
  }
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const formatQuantity = (value: number): string =>
  value.toLocaleString(undefined, {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  });

const normaliseStatus = (status: string): string =>
  status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

const safeReadDetail = async (response: Response): Promise<string | null> => {
  try {
    const payload = await response.json();
    if (typeof payload?.detail === 'string') {
      return payload.detail;
    }
  } catch (readError) {
    return null;
  }
  return null;
};

export default function PurchaseOrderDashboardClient() {
  const api = useMemo(() => getApiBase(), []);
  const { data, error, isLoading, mutate } = useSWR<PurchaseOrderSummary[]>(
    `${api}/po`,
    fetchPurchaseOrders,
    {
      refreshInterval: 45000,
      revalidateOnFocus: false
    }
  );
  const [message, setMessage] = useState<ActionMessage | null>(null);
  const [pendingAction, setPendingAction] = useState<{ id: number; type: 'close' | 'delete' } | null>(null);

  const setErrorMessage = (text: string) => setMessage({ type: 'error', text });

  const closePo = async (poId: number) => {
    setPendingAction({ id: poId, type: 'close' });
    setMessage(null);
    try {
      const headers = await buildAuthHeaders({
        'Content-Type': 'application/json',
        Accept: 'application/json'
      });
      const response = await fetch(`${api}/po/${poId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'closed' })
      });
      if (!response.ok) {
        const detail = await safeReadDetail(response);
        throw new Error(detail ?? 'Unable to close purchase order');
      }
      setMessage({ type: 'success', text: `Purchase order ${poId} closed.` });
      await mutate();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to close purchase order');
    } finally {
      setPendingAction(null);
    }
  };

  const deletePo = async (poId: number) => {
    if (typeof window !== 'undefined' && !window.confirm(`Delete purchase order ${poId}? This cannot be undone.`)) {
      return;
    }
    setPendingAction({ id: poId, type: 'delete' });
    setMessage(null);
    try {
      const headers = await buildAuthHeaders();
      const response = await fetch(`${api}/po/${poId}`, {
        method: 'DELETE',
        headers
      });
      if (!response.ok) {
        const detail = await safeReadDetail(response);
        throw new Error(detail ?? 'Unable to delete purchase order');
      }
      setMessage({ type: 'success', text: `Purchase order ${poId} deleted.` });
      await mutate();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to delete purchase order');
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <section
      id="po-list"
      className="space-y-6 rounded-3xl border border-white/10 bg-slate-950/60 p-8 shadow-2xl shadow-slate-950/35 backdrop-blur"
    >
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Purchase orders</p>
        <h2 className="text-2xl font-semibold text-white">Live purchase order queue</h2>
        <p className="text-sm text-slate-300">
          Monitor open commitments, see what is fully received, and take action without leaving the dashboard.
        </p>
      </div>

      {message ? (
        <div
          className={`rounded-2xl border p-4 text-sm ${
            message.type === 'success'
              ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100'
              : 'border-rose-400/40 bg-rose-400/10 text-rose-100'
          }`}
        >
          {message.text}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
          Failed to load purchase orders.{' '}
          <button
            type="button"
            onClick={() => mutate()}
            className="font-semibold text-rose-50 underline decoration-dotted underline-offset-4 hover:text-white"
          >
            Retry
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`po-skeleton-${index}`}
              className="h-24 rounded-2xl border border-white/10 bg-white/5 animate-pulse"
            />
          ))}
        </div>
      ) : null}

      {!isLoading && data && data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.04] p-6 text-sm text-slate-300">
          No purchase orders found. Create a new draft or import vendor confirmations to see them here.
        </div>
      ) : null}

      {!isLoading && data && data.length ? (
        <div className="space-y-4">
          {data.map((po) => {
            const badge = statusBadgeClasses[po.status] ?? 'border-white/20 bg-white/10 text-slate-200';
            const completion = po.qty_ordered > 0 ? Math.min(Math.round((po.qty_received / po.qty_ordered) * 100), 100) : 0;
            const isClosing = pendingAction?.id === po.po_id && pendingAction.type === 'close';
            const isDeleting = pendingAction?.id === po.po_id && pendingAction.type === 'delete';
            return (
              <article
                key={po.po_id}
                className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-lg shadow-slate-950/25"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-semibold text-white">PO-{po.po_id}</h3>
                      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] ${badge}`}>
                        {normaliseStatus(po.status)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300">
                      Vendor: <span className="font-medium text-slate-100">{po.vendor_name ?? 'Unknown vendor'}</span>
                    </p>
                    <p className="text-xs text-slate-400">
                      Expected arrival: <span className="text-slate-200">{formatDate(po.expected_date)}</span>
                    </p>
                    {po.notes ? <p className="text-xs text-slate-400">Notes: {po.notes}</p> : null}
                  </div>
                  <div className="flex flex-col items-start gap-2 text-sm text-slate-200 sm:flex-row sm:items-center sm:gap-6">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Open lines</p>
                      <p className="text-base font-semibold text-white">
                        {po.open_lines} / {po.total_lines}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Received</p>
                      <p className="text-base font-semibold text-white">{formatQuantity(po.qty_received)}</p>
                      <p className="text-[11px] text-slate-400">
                        of {formatQuantity(po.qty_ordered)} ordered ({completion}% complete)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-emerald-400/80"
                    style={{ width: `${completion}%` }}
                    role="presentation"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/receiving?po=${po.po_id}`}
                    className="inline-flex items-center gap-2 rounded-full border border-sky-400/40 bg-sky-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-sky-100 transition hover:border-sky-300/60 hover:bg-sky-400/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                  >
                    Receive
                  </Link>
                  <button
                    type="button"
                    onClick={() => closePo(po.po_id)}
                    disabled={isClosing || isDeleting}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-100 transition hover:border-emerald-300/60 hover:bg-emerald-400/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isClosing ? 'Closing…' : 'Close'}
                  </button>
                  <button
                    type="button"
                    onClick={() => deletePo(po.po_id)}
                    disabled={isDeleting || isClosing}
                    className="inline-flex items-center gap-2 rounded-full border border-rose-400/40 bg-rose-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-rose-100 transition hover:border-rose-300/60 hover:bg-rose-400/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDeleting ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
