'use client';

import { FormEvent, useMemo, useState } from 'react';
import useSWR from 'swr';
import axios from 'axios';

import { getApiBase, buildAuthHeaders } from '../../../lib/api';

const fetcher = async (url: string) => {
  const headers = await buildAuthHeaders();
  const response = await axios.get(url, { headers });
  return response.data;
};

interface LabelTemplate {
  template_id: number;
  name: string;
  target: string;
}

export default function BatchLabelsPage() {
  const api = useMemo(() => getApiBase(), []);
  const { data } = useSWR<LabelTemplate[]>(`${api}/labels/templates`, fetcher);
  const templates = data ?? [];

  const [templateId, setTemplateId] = useState<number | null>(null);
  const [entries, setEntries] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const itemCount = useMemo(() => {
    if (!entries) return 0;
    return entries
      .split(/[\s,;]+/)
      .map((entry) => entry.trim())
      .filter(Boolean).length;
  }, [entries]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!templateId) {
      setStatus('Select a label template.');
      return;
    }
    if (itemCount === 0) {
      setStatus('Add at least one SKU or short code to print.');
      return;
    }
    const templateName = templates.find((template) => template.template_id === templateId)?.name ?? 'Selected template';
    setStatus(`Queued ${itemCount} labels using ${templateName}.`);
    setEntries('');
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 bg-slate-900 p-8 text-white">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Batch Print Labels</h1>
        <p className="text-sm text-slate-300">
          Paste SKUs or short codes to build a label job and send it to the DYMO worker.
        </p>
      </header>
      <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-lg shadow-slate-950/20">
        <form className="grid gap-4" onSubmit={submit}>
          <label className="grid gap-2 text-sm">
            <span className="font-semibold text-slate-200">Label template</span>
            <select
              value={templateId ?? ''}
              onChange={(event) => setTemplateId(event.target.value ? Number(event.target.value) : null)}
              className="rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-sky-400 focus:outline-none"
            >
              <option value="">Select template…</option>
              {templates.map((template) => (
                <option key={template.template_id} value={template.template_id}>
                  {template.name} ({template.target})
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-semibold text-slate-200">Items</span>
            <textarea
              value={entries}
              onChange={(event) => setEntries(event.target.value)}
              placeholder="SKU-0001, SKU-0002, FLOOR-1234"
              className="min-h-[160px] rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-sky-400 focus:outline-none"
            />
            <span className="text-xs text-slate-400">{itemCount} entries ready to print.</span>
          </label>
          <button
            type="submit"
            className="mt-2 inline-flex items-center justify-center rounded-lg bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-emerald-400"
          >
            Queue print job
          </button>
        </form>
        {status && (
          <p className="mt-4 rounded-lg border border-sky-500/40 bg-sky-500/10 p-4 text-sm text-sky-200">{status}</p>
        )}
      </section>
    </main>
  );
}
