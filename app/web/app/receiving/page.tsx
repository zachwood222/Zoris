'use client';

import { useState } from 'react';
import axios from 'axios';

export default function ReceivingPage() {
  const [scan, setScan] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const submit = async () => {
    if (!scan) return;
    setLog((entries) => [`Received ${scan}`, ...entries].slice(0, 20));
    setScan('');
  };

  return (
    <main className="flex min-h-screen flex-col gap-4 bg-slate-900 p-8 text-white">
      <header>
        <h1 className="text-3xl font-bold">Receiving</h1>
        <p className="text-slate-300">Scan PO line barcodes to receive inventory.</p>
      </header>
      <input
        autoFocus
        value={scan}
        onChange={(e) => setScan(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
        className="rounded bg-white px-4 py-3 text-lg text-slate-900"
        placeholder="Scan PO line barcode..."
      />
      <section className="rounded bg-white p-4 text-slate-900 shadow">
        <h2 className="mb-2 font-semibold">Recent activity</h2>
        <ul className="space-y-1 text-sm">
          {log.map((entry, index) => (
            <li key={index}>{entry}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
