'use client';

import { useEffect, useMemo, useState } from 'react';

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  hour: 'numeric',
  minute: '2-digit'
});

export default function HeroStatusCard() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 30_000);

    return () => clearInterval(interval);
  }, []);

  const formattedTime = useMemo(() => {
    const formatted = timeFormatter.format(now);
    return formatted.replace(', ', ' • ');
  }, [now]);

  const nextShift = useMemo(() => {
    const target = new Date(now);
    target.setMinutes(0, 0, 0);
    if (target <= now) {
      target.setHours(target.getHours() + 1);
    }
    return target;
  }, [now]);

  const minutesRemaining = useMemo(() => {
    const diffMs = nextShift.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / 60000));
  }, [nextShift, now]);

  return (
    <div
      data-testid="hero-status-card"
      className="flex items-center gap-4 rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-sm text-slate-300"
    >
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Today</p>
        <p className="mt-2 text-lg font-semibold text-white">{formattedTime}</p>
      </div>
      <div className="hidden h-12 w-px bg-white/10 lg:block" aria-hidden />
      <div className="hidden text-xs text-slate-400 sm:flex sm:flex-col sm:gap-1">
        <span>
          Next shift handoff in {minutesRemaining} minute{minutesRemaining === 1 ? '' : 's'}
        </span>
        <span className="text-emerald-300">All systems reporting healthy</span>
      </div>
    </div>
  );
}
