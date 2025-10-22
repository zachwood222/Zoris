'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const HIDDEN_PATHS = new Set(['/']);

export default function BackToDashboardButton() {
  const pathname = usePathname();

  if (!pathname || HIDDEN_PATHS.has(pathname)) {
    return null;
  }

  return (
    <div className="z-20 w-full px-6 pt-6 sm:px-10">
      <div className="mx-auto w-full max-w-6xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-slate-200 shadow-lg shadow-slate-950/20 transition hover:border-white/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
        >
          <span aria-hidden>←</span>
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
