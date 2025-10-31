import Link from 'next/link';

import SalesDashboardClient from './sales-dashboard-client';

const managementActions = [
  {
    href: '/kiosk',
    label: 'Create sales ticket',
    description: 'Launch the guided counter workflow to start a new sale.',
    icon: '🛒'
  },
  {
    href: '/review',
    label: 'Review OCR tickets',
    description: 'Approve or reject handwritten tickets before invoicing.',
    icon: '📝'
  },
  {
    href: '/delivery/schedule',
    label: 'Schedule delivery',
    description: 'Attach fulfillment dates to open tickets awaiting delivery.',
    icon: '🚚'
  },
  {
    href: '/dashboard/analytics#open-sales',
    label: 'View sales analytics',
    description: 'Jump into live KPIs and drill into ticket performance.',
    icon: '📈'
  }
] as const;

export default function SalesDashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-16 pt-12 text-slate-100 lg:px-12">
      <header className="space-y-6 rounded-3xl border border-white/10 bg-slate-950/70 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-slate-200">
            Sales
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">Sales order command center</h1>
            <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
              Monitor open tickets, verify fulfilled orders, and jump into detailed sales activity without leaving the dashboard.
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

      <SalesDashboardClient />
    </main>
  );
}
