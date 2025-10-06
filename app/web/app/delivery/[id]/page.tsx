'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';

export default function DeliveryPage() {
  const { id } = useParams<{ id: string }>();
  const [status, setStatus] = useState<string>('queued');

  const actions: { label: string; next: string }[] = [
    { label: 'Arrived', next: 'scheduled' },
    { label: 'Delivered', next: 'delivered' },
    { label: 'Problem', next: 'failed' }
  ];

  return (
    <main className="flex min-h-screen flex-col gap-4 bg-slate-900 p-8 text-white">
      <h1 className="text-3xl font-bold">Delivery #{id}</h1>
      <p className="text-slate-300">Current status: {status}</p>
      <div className="grid gap-4 sm:grid-cols-3">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            className="rounded bg-emerald-600 px-4 py-6 text-xl font-semibold shadow hover:bg-emerald-500"
            onClick={() => setStatus(action.next)}
          >
            {action.label}
          </button>
        ))}
      </div>
    </main>
  );
}
