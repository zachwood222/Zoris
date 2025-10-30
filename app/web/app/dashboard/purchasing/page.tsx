import Link from 'next/link';

const quickActions = [
  {
    id: 'import-vendors',
    icon: '📥',
    title: 'Import vendor updates',
    description: 'Upload spreadsheets to refresh vendor terms, contacts, and assortments.',
    actionHref: '/imports/spreadsheet',
    actionLabel: 'Import data'
  },
  {
    id: 'create-po',
    icon: '📝',
    title: 'Create purchase order',
    description: 'Draft a new purchase order before sending it to the vendor.',
    actionHref: '/receiving/purchase-orders/new',
    actionLabel: 'Start a PO'
  },
  {
    id: 'manage-pos',
    icon: '📊',
    title: 'Manage purchase orders',
    description: 'Review open, received, and closed purchase orders in one place.',
    actionHref: '/dashboard/purchase-orders',
    actionLabel: 'Open dashboard'
  },
  {
    id: 'review-vendors',
    icon: '🏬',
    title: 'Review vendor directory',
    description: 'Check vendor payment terms, reps, and recent purchasing activity.',
    actionHref: '/dashboard/vendors',
    actionLabel: 'View vendors'
  }
] as const;

const supportingDashboards = [
  {
    href: '/dashboard/items',
    label: 'Item catalog dashboard',
    description: 'Validate item availability and vendor assignments across the catalog.',
    icon: '📦'
  },
  {
    href: '/dashboard/invoices',
    label: 'Invoice dashboard',
    description: 'Match vendor invoices to purchase orders and confirm payment status.',
    icon: '💼'
  }
] as const;

export default function PurchasingDashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-16 pt-12 text-slate-100 lg:px-12">
      <header className="space-y-6 rounded-3xl border border-white/10 bg-slate-950/70 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-slate-200">
            Purchasing
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">Purchasing operations dashboard</h1>
            <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
              Centralize vendor updates, purchase order management, and receiving handoffs for the purchasing team.
            </p>
          </div>
        </div>
      </header>

      <section className="space-y-5">
        <header className="space-y-2">
          <h2 className="text-lg font-semibold text-white">Quick tasks</h2>
          <p className="text-sm text-slate-300">Everything needed to prep vendors and keep orders in motion.</p>
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          {quickActions.map((action) => (
            <article
              key={action.id}
              id={action.id}
              className="group flex h-full flex-col gap-4 rounded-2xl border border-white/10 bg-slate-950/60 p-6 shadow-lg shadow-slate-950/30 transition hover:border-white/30 hover:bg-slate-900/60 focus-within:border-sky-400"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl" aria-hidden>
                  {action.icon}
                </span>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-white">{action.title}</h3>
                  <p className="text-sm text-slate-300">{action.description}</p>
                </div>
              </div>
              <div className="mt-auto">
                <Link
                  href={action.actionHref}
                  className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-200 transition hover:border-sky-300 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                >
                  {action.actionLabel}
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <header className="space-y-1">
          <h2 className="text-lg font-semibold text-white">Supporting dashboards</h2>
          <p className="text-sm text-slate-300">Cross-check catalog and invoice data without leaving purchasing.</p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          {supportingDashboards.map((dashboard) => (
            <Link
              key={dashboard.href}
              href={dashboard.href}
              className="group flex h-full flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-5 shadow-md shadow-slate-950/20 transition hover:border-white/30 hover:bg-slate-900/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
            >
              <span className="text-2xl" aria-hidden>
                {dashboard.icon}
              </span>
              <div className="space-y-2">
                <p className="text-base font-semibold text-white">{dashboard.label}</p>
                <p className="text-sm text-slate-300">{dashboard.description}</p>
              </div>
              <span className="mt-auto inline-flex items-center gap-2 text-xs font-semibold text-sky-300 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                View dashboard
                <span aria-hidden>→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
