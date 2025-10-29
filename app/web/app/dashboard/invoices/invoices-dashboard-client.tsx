'use client';

import { useEffect, useMemo, useState } from 'react';

import { buildAuthHeaders, getApiBase } from '../../../lib/api';

interface InvoiceSummary {
  invoice_id: number;
  vendor_name: string | null;
  po_id: number | null;
  invoice_no: string | null;
  bill_date: string | null;
  due_date: string | null;
  subtotal: number;
  tax: number;
  freight: number;
  total: number;
  status: string;
}

export default function InvoicesDashboardClient() {
  const api = useMemo(() => getApiBase(), []);
  const [query, setQuery] = useState('');
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const handler = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const headers = await buildAuthHeaders({ Accept: 'application/json' });
        const url = new URL(`${api}/invoices`);
        const search = query.trim();
        if (search) {
          url.searchParams.set('q', search);
        }
        const response = await fetch(url.toString(), { signal: controller.signal, headers });
        if (!response.ok) {
          throw new Error('Failed to load invoices');
        }
        const data = (await response.json()) as InvoiceSummary[];
        if (!controller.signal.aborted) {
          setInvoices(data);
        }
      } catch (loadError) {
        if (controller.signal.aborted) {
          return;
        }
        console.error(loadError);
        setError('Unable to load invoices.');
        setInvoices([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(handler);
    };
  }, [api, query]);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium'
      }),
    []
  );
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'USD'
      }),
    []
  );

  const formatDate = (value: string | null) => {
    if (!value) {
      return '—';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return dateFormatter.format(parsed);
  };

  const statusBadge = (status: string) => {
    const normalized = status.toLowerCase();
    switch (normalized) {
      case 'paid':
        return 'border border-emerald-400/30 bg-emerald-500/10 text-emerald-200';
      case 'exported':
        return 'border border-sky-400/30 bg-sky-500/10 text-sky-200';
      case 'draft':
        return 'border border-amber-400/30 bg-amber-500/10 text-amber-200';
      default:
        return 'border border-white/20 bg-white/10 text-slate-200';
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-xl shadow-slate-950/30 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1">
          <label className="block text-sm text-slate-300">
            <span className="mb-2 block font-semibold text-white">Search invoices</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by vendor, invoice number, or status"
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white focus:border-sky-400 focus:outline-none"
            />
          </label>
        </div>
        <div className="text-xs text-slate-400">
          Showing {invoices.length.toLocaleString()} invoice{invoices.length === 1 ? '' : 's'}
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80 shadow-xl shadow-slate-950/30">
        <table className="min-w-full divide-y divide-white/10 text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-[0.3em] text-slate-400">
            <tr>
              <th scope="col" className="px-6 py-3 font-semibold">Invoice</th>
              <th scope="col" className="px-6 py-3 font-semibold">Vendor</th>
              <th scope="col" className="px-6 py-3 font-semibold">PO</th>
              <th scope="col" className="px-6 py-3 font-semibold">Bill date</th>
              <th scope="col" className="px-6 py-3 font-semibold">Due date</th>
              <th scope="col" className="px-6 py-3 font-semibold">Total</th>
              <th scope="col" className="px-6 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-400">
                  Loading invoices…
                </td>
              </tr>
            )}
            {error && !isLoading && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-sm text-rose-200">
                  {error}
                </td>
              </tr>
            )}
            {!error && !isLoading && invoices.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-400">
                  No invoices match your filters.
                </td>
              </tr>
            )}
            {!error &&
              invoices.map((invoice) => (
                <tr key={invoice.invoice_id} className="hover:bg-slate-900/60">
                  <td className="px-6 py-4 text-sm text-white">
                    {invoice.invoice_no ?? `INV-${invoice.invoice_id}`}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">{invoice.vendor_name ?? '—'}</td>
                  <td className="px-6 py-4 text-sm text-slate-300">{invoice.po_id ?? '—'}</td>
                  <td className="px-6 py-4 text-sm text-slate-300">{formatDate(invoice.bill_date)}</td>
                  <td className="px-6 py-4 text-sm text-slate-300">{formatDate(invoice.due_date)}</td>
                  <td className="px-6 py-4 text-sm text-emerald-200">
                    {currencyFormatter.format(invoice.total ?? 0)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] ${statusBadge(invoice.status)}`}
                    >
                      {invoice.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
