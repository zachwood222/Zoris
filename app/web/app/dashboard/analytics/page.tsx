import Link from 'next/link';

import DashboardAnalyticsClient from './dashboard-analytics-client';
import { analyticsSections, getSectionAnchor } from './sections';

const anchorLinks = analyticsSections.map((section) => ({
  href: `#${getSectionAnchor(section.id)}`,
  label: section.title
}));

export default function DashboardAnalyticsPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-16 pt-12 text-slate-100 lg:px-12">
      <header className="space-y-8 rounded-3xl border border-white/10 bg-slate-950/70 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-slate-200">
            Analytics
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">Operations pulseboard</h1>
            <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
              Drill into the live counters behind each top-line metric. Monitor sales momentum, OCR follow-ups, inbound purchase
              orders, and dock activity from one view.
            </p>
          </div>
        </div>
        <nav className="flex flex-wrap gap-3">
          {anchorLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:border-white/30 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>

      <DashboardAnalyticsClient />
    </main>
  );
}
