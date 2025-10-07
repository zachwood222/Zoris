import Link from 'next/link';

const links = [
  {
    href: '/kiosk',
    label: 'Sales Kiosk',
    description: 'Accelerate assisted sales with fast lookup, barcode capture, and ticket automation.',
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
    href: '/labels',
    label: 'Labels',
    description: 'Generate bin, shelf, and delivery labels with one-tap DYMO printing.',
    icon: '🏷️'
  }
];

export default function HomePage() {
  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center gap-16 px-6 py-24 text-center">
      <div className="pointer-events-none absolute inset-x-12 top-32 -z-10 h-72 rounded-full bg-sky-500/20 blur-3xl" />
      <div className="flex flex-col items-center gap-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-slate-200">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
          Operations Suite
        </span>
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
          Command your retail operations
        </h1>
        <p className="max-w-2xl text-base text-slate-300 sm:text-lg">
          Choose the workspace that aligns with your task—whether you are closing a sale, auditing OCR tickets, or receiving a truck.
        </p>
      </div>
      <div className="grid w-full gap-6 md:grid-cols-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/10 p-8 text-left shadow-xl shadow-slate-950/20 backdrop-blur transition duration-300 hover:border-white/40 hover:shadow-sky-500/20"
          >
            <span className="absolute inset-0 -z-10 bg-gradient-to-br from-sky-400/30 via-transparent to-indigo-500/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="flex items-center justify-between text-3xl">
              <span aria-hidden>{link.icon}</span>
              <span className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-300 transition duration-300 group-hover:text-white">
                Open
              </span>
            </div>
            <h2 className="mt-6 text-2xl font-semibold text-white">{link.label}</h2>
            <p className="mt-3 text-sm text-slate-300">{link.description}</p>
          </Link>
        ))}
      </div>
      <div className="flex flex-col items-center gap-3 text-sm text-slate-400">
        <p>Celery workers, OCR flows, and kiosk tickets all share the same data backbone.</p>
        <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur">
          <span className="inline-flex h-2 w-2 rounded-full bg-sky-400" aria-hidden />
          <span className="text-xs uppercase tracking-[0.35em] text-slate-200">Ready</span>
        </div>
      </div>
    </main>
  );
}
