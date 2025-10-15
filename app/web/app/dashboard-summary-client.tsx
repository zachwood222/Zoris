'use client';

import useSWR from 'swr';

import { apiBase, buildAuthHeaders } from '../lib/api';

type DashboardMetric = {
  label: string;
  value: number;
  change: string;
  status: string;
};

type DashboardActivity = {
  title: string;
  description: string;
  time: string;
};

type DashboardSystemStatus = {
  label: string;
  state: string;
  badge: string;
  description: string;
};

type DashboardSummaryResponse = {
  metrics: DashboardMetric[];
  activity: DashboardActivity[];
  system_status: DashboardSystemStatus[];
};

const fetcher = async (url: string): Promise<DashboardSummaryResponse> => {
  const headers = await buildAuthHeaders({ Accept: 'application/json' });
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error('Failed to load dashboard summary');
  }
  return response.json();
};

function useDashboardSummary() {
  return useSWR<DashboardSummaryResponse>(`${apiBase}/dashboard/summary`, fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: false,
  });
}

export function DashboardMetrics() {
  const { data, error } = useDashboardSummary();
  const metrics = data?.metrics ?? [];
  const isLoading = !data && !error;

  if (error) {
    return (
      <div className="col-span-full rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-sm text-rose-100">
        Unable to load metrics.
      </div>
    );
  }

  if (isLoading) {
    return (
      <>
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={`metric-skeleton-${index}`}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-slate-950/20"
          >
            <div className="h-3 w-24 rounded-full bg-white/10" />
            <div className="mt-6 h-8 w-20 rounded-full bg-white/10" />
            <div className="mt-3 h-3 w-32 rounded-full bg-white/10" />
            <div className="mt-2 h-3 w-28 rounded-full bg-white/10" />
          </div>
        ))}
      </>
    );
  }

  return (
    <>
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="group rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-slate-950/20 transition hover:border-white/30 hover:bg-white/10"
        >
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{metric.label}</p>
          <p className="mt-4 text-3xl font-semibold text-white">
            {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
          </p>
          <p className="mt-2 text-xs font-semibold text-emerald-300">{metric.change}</p>
          <p className="mt-1 text-xs text-slate-400">{metric.status}</p>
        </div>
      ))}
    </>
  );
}

export function DashboardActivityList() {
  const { data, error } = useDashboardSummary();
  const activity = data?.activity ?? [];
  const isLoading = !data && !error;

  if (error) {
    return (
      <li className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
        Unable to load recent activity.
      </li>
    );
  }

  if (isLoading) {
    return (
      <>
        {Array.from({ length: 3 }).map((_, index) => (
          <li key={`activity-skeleton-${index}`} className="border-l-2 border-sky-500/20 pl-4">
            <div className="h-4 w-36 rounded-full bg-white/10" />
            <div className="mt-2 h-3 w-48 rounded-full bg-white/10" />
            <div className="mt-3 h-2 w-24 rounded-full bg-white/10" />
          </li>
        ))}
      </>
    );
  }

  return (
    <>
      {activity.map((item) => (
        <li key={`${item.title}-${item.time}`} className="border-l-2 border-sky-500/60 pl-4">
          <p className="text-sm font-semibold text-white">{item.title}</p>
          <p className="mt-1 text-xs text-slate-300">{item.description}</p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-slate-500">{item.time}</p>
        </li>
      ))}
      {!activity.length && (
        <li className="text-xs text-slate-400">No recent activity recorded.</li>
      )}
    </>
  );
}

export function DashboardSystemStatusList() {
  const { data, error } = useDashboardSummary();
  const statuses = data?.system_status ?? [];
  const isLoading = !data && !error;

  if (error) {
    return (
      <li className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
        Unable to load system status.
      </li>
    );
  }

  if (isLoading) {
    return (
      <>
        {Array.from({ length: 3 }).map((_, index) => (
          <li key={`status-skeleton-${index}`} className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
            <div className="space-y-2">
              <div className="h-3 w-24 rounded-full bg-white/10" />
              <div className="h-3 w-40 rounded-full bg-white/10" />
            </div>
            <span className="inline-flex h-6 w-20 items-center justify-center rounded-full bg-white/10 text-[10px] uppercase tracking-[0.35em] text-slate-900">
               
            </span>
          </li>
        ))}
      </>
    );
  }

  return (
    <>
      {statuses.map((status) => (
        <li
          key={status.label}
          className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.05] p-4"
        >
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">{status.label}</p>
            <p className="text-xs text-slate-300">{status.description}</p>
          </div>
          <span
            className={`inline-flex items-center gap-2 rounded-full ${status.badge} px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-900`}
          >
            {status.state}
          </span>
        </li>
      ))}
      {!statuses.length && (
        <li className="text-xs text-slate-400">No status signals available.</li>
      )}
    </>
  );
}
