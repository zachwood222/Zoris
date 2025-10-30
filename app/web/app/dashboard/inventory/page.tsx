import Link from 'next/link';

const quickActions = [
  {
    id: 'receive-po',
    icon: '📦',
    title: 'Receive purchase order',
    description: 'Scan purchase order lines as freight arrives to keep inventory accurate.',
    actionHref: '/receiving',
    actionLabel: 'Open receiving'
  },
  {
    id: 'incoming-trucks',
    icon: '🚛',
    title: 'Monitor incoming trucks',
    description: 'Check dock schedules and update arrivals as loads check in.',
    actionHref: '/incoming-trucks',
    actionLabel: 'View schedule'
  },
  {
    id: 'print-labels',
    icon: '🏷️',
    title: 'Print labels on demand',
    description: 'Generate bin, shelf, and delivery labels for individual items.',
    actionHref: '/labels',
    actionLabel: 'Open labels'
  },
  {
    id: 'batch-labels',
    icon: '🖨️',
    title: 'Batch print labels',
    description: 'Send batch label jobs for morning pulls or resets straight to the printer.',
    actionHref: '/labels/batch',
    actionLabel: 'Start batch'
  }
] as const;

const supportingDashboards = [
  {
    href: '/dashboard/items',
    label: 'Item catalog dashboard',
    description: 'Audit stocked locations, availability, and catalog coverage.',
    icon: '📚'
  },
  {
    href: '/dashboard/purchase-orders',
    label: 'Purchase order dashboard',
    description: 'Confirm which purchase orders are staged for receiving and reconcile discrepancies.',
    icon: '🧾'
  }
] as const;

export default function InventoryDashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-16 pt-12 text-slate-100 lg:px-12">
      <header className="space-y-6 rounded-3xl border border-white/10 bg-slate-950/70 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-slate-200">
            Inventory
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">Inventory & receiving dashboard</h1>
            <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
              Coordinate dock activity, reconcile purchase orders, and print the labels teams need without hopping between screens.
            </p>
          </div>
        </div>
      </header>

      <section className="space-y-5">
        <header className="space-y-2">
          <h2 className="text-lg font-semibold text-white">Quick tasks</h2>
          <p className="text-sm text-slate-300">Everything required to keep stock flowing from dock to shelf.</p>
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
          <p className="text-sm text-slate-300">Use detailed views to investigate counts, commitments, and pending work.</p>
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
