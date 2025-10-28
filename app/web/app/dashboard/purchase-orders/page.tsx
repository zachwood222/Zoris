import Link from 'next/link';

import PurchaseOrderDashboardClient from './purchase-order-dashboard-client';

const managementActions = [
  {
    href: '/receiving/purchase-orders/new',
    label: 'Create purchase order',
    description: 'Draft a new PO and add line items before sending to a vendor.',
    icon: '📝'
  },
  {
    href: '/receiving',
    label: 'Receive merchandise',
    description: 'Jump into the receiving workspace to scan purchase order lines.',
    icon: '📦'
  },
  {
    href: '#po-list',
    label: 'Close purchase order',
    description: 'Select a purchase order below and mark it closed when everything is received.',
    icon: '✅'
  },
  {
    href: '#po-list',
    label: 'Delete purchase order',
    description: 'Remove a draft or training PO that should no longer appear in metrics.',
    icon: '🗑️'
  }
] as const;

export default function PurchaseOrderDashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-16 pt-12 text-slate-100 lg:px-12">
      <header className="space-y-6 rounded-3xl border border-white/10 bg-slate-950/70 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-slate-200">
            Purchasing
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">Purchase order command center</h1>
            <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
              Review open purchase orders, action receipts, and keep vendor commitments on track. Close or delete records that have
              run their course without leaving the dashboard.
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {managementActions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="group flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-5 shadow-lg shadow-slate-950/30 transition hover:border-white/30 hover:bg-slate-900/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
          >
            <span className="text-2xl" aria-hidden>
              {action.icon}
            </span>
            <div className="space-y-2">
              <p className="text-base font-semibold text-white">{action.label}</p>
              <p className="text-sm text-slate-300">{action.description}</p>
            </div>
            <span className="mt-auto inline-flex items-center gap-2 text-xs font-semibold text-sky-300 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
              Go
              <span aria-hidden>→</span>
            </span>
          </Link>
        ))}
      </section>

      <PurchaseOrderDashboardClient />
    </main>
  );
}
