'use client';

import { useMemo } from 'react';

import { fallbackDashboardSummary, type DashboardDrilldownItem } from '../../dashboard-summary-data';
import { useDashboardSummary } from '../../dashboard-summary-client';
import { analyticsSections, getSectionAnchor } from './sections';

function SectionShell({
  id,
  title,
  description,
  metric,
  items,
  kicker
}: {
  id: string;
  title: string;
  description: string;
  metric?: { value: string; change?: string; status?: string };
  items: DashboardDrilldownItem[];
  kicker: string;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-28 rounded-3xl border border-white/10 bg-slate-950/60 p-8 shadow-xl shadow-slate-950/30 backdrop-blur"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{kicker}</p>
          <h2 className="text-3xl font-semibold text-white capitalize">{title}</h2>
          <p className="text-sm text-slate-300 lg:max-w-xl">{description}</p>
        </div>
        {metric ? (
          <div className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-right">
            <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Snapshot</span>
            <span className="text-4xl font-semibold text-white">{metric.value}</span>
            {metric.change ? <span className="text-xs font-semibold text-emerald-300">{metric.change}</span> : null}
            {metric.status ? <span className="text-xs text-slate-400">{metric.status}</span> : null}
          </div>
        ) : null}
      </div>

      <div className="mt-8 space-y-4">
        {items.length ? (
          items.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-white/25 hover:bg-white/[0.08]"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-white">{item.title}</h3>
                  <p className="text-sm text-slate-300">{item.subtitle}</p>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">{item.meta}</p>
                </div>
                <span
                  className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] ${item.badgeClass}`}
                >
                  {item.badgeLabel}
                </span>
              </div>
            </article>
          ))
        ) : (
          <p className="rounded-xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            Nothing to show here yet. As activity lands, it will populate automatically.
          </p>
        )}
      </div>
    </section>
  );
}

export default function DashboardAnalyticsClient() {
  const { data, error } = useDashboardSummary();
  const isLoading = !data && !error;
  const summary = data ?? (error ? fallbackDashboardSummary : null);
  const usingFallback = Boolean(error);
  const metrics = summary?.metrics ?? [];
  const drilldowns = summary?.drilldowns ?? fallbackDashboardSummary.drilldowns ?? {};

  const metricLookup = useMemo(() => {
    const map = new Map<string, typeof metrics[number]>();
    for (const metric of metrics) {
      map.set(metric.label, metric);
    }
    return map;
  }, [metrics]);

  if (isLoading) {
    return (
      <div className="space-y-10">
        {analyticsSections.map((section) => (
          <div
            key={section.id}
            className="rounded-3xl border border-white/10 bg-slate-950/50 p-8 shadow-xl shadow-slate-950/20"
          >
            <div className="h-4 w-32 rounded-full bg-white/10" />
            <div className="mt-4 h-8 w-64 rounded-full bg-white/10" />
            <div className="mt-2 h-3 w-48 rounded-full bg-white/10" />
            <div className="mt-8 space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={`${section.id}-skeleton-${index}`} className="h-16 rounded-2xl bg-white/5" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!summary) {
    return (
      <p className="rounded-2xl border border-rose-500/50 bg-rose-500/10 p-4 text-sm text-rose-100">
        We couldn&apos;t load the detailed analytics right now. Please try again shortly.
      </p>
    );
  }

  return (
    <div className="space-y-12 pb-16">
      {usingFallback ? (
        <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-xs text-amber-100">
          Displaying demo analytics while the live data source reconnects.
        </div>
      ) : null}

      {analyticsSections.map((section) => {
        const metric = metricLookup.get(section.metricLabel);
        const items = (drilldowns?.[section.id] ?? []) as DashboardDrilldownItem[];
        const htmlId = getSectionAnchor(section.id);
        return (
          <SectionShell
            key={section.id}
            id={htmlId}
            title={section.title}
            description={section.description}
            metric={
              metric
                ? {
                    value:
                      typeof metric.value === 'number' ? metric.value.toLocaleString() : String(metric.value),
                    change: metric.change,
                    status: metric.status
                  }
                : undefined
            }
            items={items}
            kicker={section.kicker}
          />
        );
      })}
    </div>
  );
}
