'use client';

import useSWR from 'swr';
import axios from 'axios';

const fetcher = (url: string) => axios.get(url).then((res) => res.data);

export default function LabelsPage() {
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const { data } = useSWR(`${api}/labels/templates`, fetcher);

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-8">
      <header>
        <h1 className="text-3xl font-bold">Label Templates</h1>
        <p className="text-slate-600">Send rendered XML to DYMO Web Service for printing.</p>
      </header>
      <section className="grid gap-4 sm:grid-cols-2">
        {(data ?? []).map((template: any) => (
          <div key={template.template_id} className="rounded border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold">{template.name}</h2>
            <p className="text-sm text-slate-500">Target: {template.target}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
