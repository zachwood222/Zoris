import {
  DashboardActivityList,
  DashboardMetrics,
  DashboardSystemStatusList
} from '../../dashboard-summary-client';

export default function ReportsDashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-16 pt-12 text-slate-100 lg:px-12">
      <header className="space-y-6 rounded-3xl border border-white/10 bg-slate-950/70 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-slate-200">
            Reporting
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">Operational reports</h1>
            <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
              Monitor KPIs, recent activity, and system health sourced from the same live dataset powering the kiosk and imports.
            </p>
          </div>
        </div>
      </header>

      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Key metrics</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardMetrics />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-xl shadow-slate-950/30">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Recent activity</h2>
          </div>
          <ol className="space-y-4">
            <DashboardActivityList />
          </ol>
        </div>
        <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-xl shadow-slate-950/30">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">System status</h2>
          </div>
          <ul className="space-y-3">
            <DashboardSystemStatusList />
          </ul>
        </div>
      </section>
    </main>
  );
}
