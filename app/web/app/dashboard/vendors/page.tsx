import VendorsDashboardClient from './vendors-dashboard-client';

export default function VendorsDashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-16 pt-12 text-slate-100 lg:px-12">
      <header className="space-y-6 rounded-3xl border border-white/10 bg-slate-950/70 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-slate-200">
            Vendors
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">Vendor directory</h1>
            <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
              Browse vendor contact details, payment terms, and activity as soon as new spreadsheets are imported.
            </p>
          </div>
        </div>
      </header>

      <VendorsDashboardClient />
    </main>
  );
}
