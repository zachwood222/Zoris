import Link from 'next/link';

import {
  DashboardActivityList,
  DashboardMetrics,
  DashboardSystemStatusList
} from './dashboard-summary-client';
import HeroStatusCard from './hero-status-card';
import DashboardImportForm from './dashboard-import-form';

const workspaces = [
  {
    href: '/kiosk',
    label: 'Sales Kiosk',
    description:
      'Accelerate assisted sales with fast lookup, barcode capture, and ticket automation.',
    icon: '🛒'
  },
  {
    href: '/review',
    label: 'OCR Review',
    description: 'Triaging queue for handwritten tickets that need verification before invoicing.',
    icon: '📝'
  },
  {
    href: '/receiving',
    label: 'Receiving',
    description: 'Scan purchase order lines as trucks arrive to keep inventory in sync.',
    icon: '🚚'
  },
  {
    href: '/incoming-trucks',
    label: 'Incoming Trucks',
    description: 'Track dock activity and log PO-linked updates as loads check in.',
    icon: '🚛'
  },
  {
    href: '/labels',
    label: 'Labels',
    description: 'Generate bin, shelf, and delivery labels with one-tap DYMO printing.',
    icon: '🏷️'
  }
];

const quickActions = [
  {
    href: '/kiosk/new-ticket',
    label: 'Create ticket',
    description: 'Kick off a guided assisted-sale ticket from the kiosk.',
    icon: '⚡'
  },
  {
    href: '/receiving/purchase-orders/new',
    label: 'Create purchase order',
    description: 'Draft a PO for inbound merchandise before it leaves the vendor.',
    icon: '📄'
  },
  {
    href: '/receiving',
    label: 'Receive purchase order',
    description: 'Scan line items and reconcile inventory at the dock door.',
    icon: '📦'
  },
  {
    href: '/kiosk/catalog/new-item',
    label: 'Add new item',
    description: 'Extend the catalog with pricing, stocking, and barcode details.',
    icon: '➕'
  },
  {
    href: '/kiosk/catalog',
    label: 'Lookup item',
    description: 'Search inventory availability and pull up ticket-ready details.',
    icon: '🔍'
  },
  {
    href: '/delivery/schedule',
    label: 'Schedule a delivery',
    description: 'Reserve a delivery window and dispatch the logistics crew.',
    icon: '🚚'
  },
  {
    href: '/delivery/complete',
    label: 'Complete a delivery',
    description: 'Capture signatures, photos, and notes after drop-off.',
    icon: '✅'
  },
  {
    href: '/labels/batch',
    label: 'Batch print labels',
    description: 'Send the morning pick list straight to the label printer.',
    icon: '🖨️'
  }
];

export default function HomePage() {
  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-16 px-6 py-16 text-slate-100 lg:px-12 lg:py-20">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.3),_rgba(76,29,149,0.05))]" />
      <header className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-slate-900/80 p-10 shadow-2xl shadow-sky-900/20 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-slate-200">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
              Live dashboard
            </span>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">Command your retail operations</h1>
            <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
              Monitor the pulse of every workspace, surface quick actions for your team, and stay ahead of inbound activity.
            </p>
          </div>
          <HeroStatusCard />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardMetrics />
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-xl shadow-slate-950/20 backdrop-blur">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Workspaces</h2>
              <span className="text-xs uppercase tracking-[0.35em] text-slate-400">Navigate</span>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {workspaces.map((workspace) => (
                <Link
                  key={workspace.href}
                  href={workspace.href}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.08] p-6 text-left transition hover:border-white/40"
                >
                  <span className="absolute inset-0 -z-10 bg-gradient-to-br from-sky-400/20 via-transparent to-indigo-500/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="flex items-start justify-between text-2xl">
                    <span aria-hidden>{workspace.icon}</span>
                    <span className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-300 transition duration-300 group-hover:text-white">
                      Open
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-white">{workspace.label}</h3>
                  <p className="mt-2 text-sm text-slate-300">{workspace.description}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-xl shadow-slate-950/20 backdrop-blur">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Quick actions</h2>
              <span className="text-xs uppercase tracking-[0.35em] text-slate-400">Do more</span>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <DashboardImportForm />
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.08] p-5 text-left transition hover:border-white/40"
                >
                  <span className="text-2xl" aria-hidden>
                    {action.icon}
                  </span>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">{action.label}</p>
                    <p className="text-xs text-slate-300">{action.description}</p>
                  </div>
                  <span className="mt-auto text-xs font-semibold uppercase tracking-[0.35em] text-slate-400 transition group-hover:text-white">
                    Launch
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-6">
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-xl shadow-slate-950/20 backdrop-blur">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Activity feed</h2>
              <span className="text-xs uppercase tracking-[0.35em] text-slate-400">Live</span>
            </div>
            <ul className="mt-6 space-y-5">
              <DashboardActivityList />
            </ul>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-xl shadow-slate-950/20 backdrop-blur">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">System status</h2>
              <span className="text-xs uppercase tracking-[0.35em] text-slate-400">Health</span>
            </div>
            <ul className="mt-6 space-y-5">
              <DashboardSystemStatusList />
            </ul>
          </div>
        </aside>
      </section>

      <footer className="flex flex-col items-center justify-between gap-4 rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-center text-xs text-slate-400 shadow-xl shadow-slate-950/20 backdrop-blur sm:flex-row sm:text-left">
        <p>Celery workers, OCR flows, and kiosk tickets all share the same data backbone.</p>
        <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-sky-400" aria-hidden />
          <span className="text-xs uppercase tracking-[0.35em] text-slate-200">Ready</span>
        </div>
      </footer>
    </main>
  );
}
