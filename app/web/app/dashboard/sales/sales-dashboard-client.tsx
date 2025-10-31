'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import useSWR from 'swr';

import { buildAuthHeaders, getApiBase } from '../../../lib/api';

type SaleDashboardEntry = {
  sale_id: number;
  ticket_number: string | null;
  customer_name: string | null;
  status: string;
  total: number;
  created_at: string | null;
  sale_date: string | null;
  created_by: string | null;
};

type SalesDashboardResponse = {
  open_sales: SaleDashboardEntry[];
  fulfilled_sales: SaleDashboardEntry[];
};

const statusBadgeClasses: Record<string, string> = {
  draft: 'border-amber-400/40 bg-amber-400/10 text-amber-100',
  open: 'border-sky-400/40 bg-sky-400/10 text-sky-100',
  fulfilled: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100',
  void: 'border-rose-400/40 bg-rose-400/10 text-rose-100'
};

const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD'
});

const formatCurrency = (value: number | null | undefined): string => currencyFormatter.format(value ?? 0);

const formatStatus = (status: string): string =>
  status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatTimestamp = (value: string | null): string => {
  if (!value) {
    return 'Unknown time';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDateOnly = (value: string | null): string => {
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

const fetchSalesDashboard = async (url: string): Promise<SalesDashboardResponse> => {
  const headers = await buildAuthHeaders({ Accept: 'application/json' });
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error('Failed to load sales dashboard');
  }
  return response.json();
};

type SalesSectionProps = {
  id: string;
  kicker: string;
  title: string;
  description: string;
  sales: SaleDashboardEntry[];
  emptyMessage: string;
};

function SalesSection({ id, kicker, title, description, sales, emptyMessage }: SalesSectionProps) {
  return (
    <section
      id={id}
      className="space-y-6 rounded-3xl border border-white/10 bg-slate-950/60 p-8 shadow-2xl shadow-slate-950/35 backdrop-blur"
    >
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{kicker}</p>
        <h2 className="text-2xl font-semibold text-white">{title}</h2>
        <p className="text-sm text-slate-300">{description}</p>
      </div>

      {!sales.length ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.04] p-6 text-sm text-slate-300">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-4">
          {sales.map((sale) => {
            const badgeClass = statusBadgeClasses[sale.status] ?? 'border-white/20 bg-white/10 text-slate-200';
            const ticketLabel = sale.ticket_number ? `Sale ${sale.ticket_number}` : `Sale #${sale.sale_id}`;
            const customerLabel = sale.customer_name ?? 'Walk-in customer';
            const metaParts = [`Created ${formatTimestamp(sale.created_at)}`];
            if (sale.created_by) {
              metaParts.push(`By ${sale.created_by}`);
            }
            if (sale.sale_date) {
              metaParts.push(`Ticket date ${formatDateOnly(sale.sale_date)}`);
            }
            const meta = metaParts.join(' • ');

            return (
              <Link
                key={sale.sale_id}
                href={`/dashboard/sales/${sale.sale_id}`}
                className="group flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-white/25 hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-white">{ticketLabel}</p>
                    <p className="text-sm text-slate-300">{customerLabel}</p>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">{meta}</p>
                  </div>
                  <div className="flex flex-col items-start gap-3 sm:items-end">
                    <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] ${badgeClass}`}>
                      {formatStatus(sale.status)}
                    </span>
                    <span className="text-sm font-semibold text-white">{formatCurrency(sale.total)}</span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-sky-300 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                  Manage order
                  <span aria-hidden>→</span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function SalesDashboardClient() {
  const api = useMemo(() => getApiBase(), []);
  const { data, error, isLoading, mutate } = useSWR<SalesDashboardResponse>(
    `${api}/sales/dashboard`,
    fetchSalesDashboard,
    {
      refreshInterval: 45000,
      revalidateOnFocus: false
    }
  );

  const openSales = data?.open_sales ?? [];
  const fulfilledSales = data?.fulfilled_sales ?? [];

  return (
    <div className="space-y-8">
      {error ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
          Unable to load sales dashboard.
          <button
            type="button"
            onClick={() => mutate()}
            className="ml-2 font-semibold text-rose-50 underline decoration-dotted underline-offset-4 hover:text-white"
          >
            Retry
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`sales-skeleton-${index}`}
              className="h-28 rounded-2xl border border-white/10 bg-white/5 animate-pulse"
            />
          ))}
        </div>
      ) : null}

      {!isLoading && !error ? (
        <>
          <SalesSection
            id="open-sales"
            kicker="Pipeline"
            title="Open sales"
            description="Tickets that still need fulfillment, payment, or delivery coordination."
            sales={openSales}
            emptyMessage="No open sales at the moment. Create a ticket to see it here."
          />

          <SalesSection
            id="closed-sales"
            kicker="Completed"
            title="Fulfilled sales"
            description="Recently completed or voided sales that you may need to edit or review."
            sales={fulfilledSales}
            emptyMessage="No fulfilled sales to review right now."
          />
        </>
      ) : null}
    </div>
  );
}
