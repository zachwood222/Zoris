import Link from 'next/link';

import DashboardImportForm from '../../dashboard-import-form';

export const metadata = {
  title: 'Import spreadsheet'
};

export default function ImportSpreadsheetPage(): JSX.Element {
  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-10 px-6 py-16 text-slate-100 lg:px-12 lg:py-20">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[24rem] bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.25),_rgba(76,29,149,0.05))]" />
      <header className="rounded-3xl border border-white/10 bg-slate-900/80 p-10 shadow-2xl shadow-sky-900/20 backdrop-blur">
        <div className="flex flex-col gap-4">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-300 transition hover:text-white"
          >
            ← Back to dashboard
          </Link>
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-slate-200">
              <span className="inline-flex h-2 w-2 rounded-full bg-sky-400" aria-hidden />
              Data tools
            </span>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">Import operational data</h1>
            <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
              Import your operational records one dataset at a time. Upload separate spreadsheets for{' '}
              <strong>Products</strong>, <strong>Customers</strong>, <strong>Vendors</strong>, <strong>Orders</strong>, or{' '}
              <strong>Purchase Orders</strong> so we can cleanse each source and keep the database in sync.
            </p>
          </div>
        </div>
      </header>

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-xl shadow-slate-950/20 backdrop-blur">
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white">Import spreadsheet</h2>
            <p className="text-sm text-slate-300">
              Choose the dataset you are loading, attach the corresponding XLSX file, and let us normalise headers, clean cell
              values, and deduplicate records before they land in production. Product imports continue to wipe demo fixtures so
              subsequent customer, vendor, sales, and purchase order uploads build on a clean slate.
            </p>
          </div>
          <DashboardImportForm />
        </div>
      </section>
    </main>
  );
}
