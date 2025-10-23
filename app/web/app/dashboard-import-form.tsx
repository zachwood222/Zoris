'use client';

import { FormEvent, useMemo, useState } from 'react';

import { getApiBase, buildAuthHeaders } from '../lib/api';
import type { ImportSummary } from './imports/import-summary';

type Status =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'success'; payload: ImportSummary };

const formatSummary = (summary: ImportSummary): string[] => {
  const lines: string[] = [];
  lines.push(summary.message);

  const details: string[] = [];
  if (summary.counters.vendors) {
    details.push(`${summary.counters.vendors} vendor(s)`);
  }
  if (summary.counters.locations) {
    details.push(`${summary.counters.locations} location(s)`);
  }
  if (summary.counters.items) {
    details.push(`${summary.counters.items} item(s)`);
  }
  if (summary.counters.inventoryRecords) {
    details.push(`${summary.counters.inventoryRecords} inventory record(s)`);
  }
  if (summary.counters.customers) {
    details.push(`${summary.counters.customers} customer(s)`);
  }
  if (summary.counters.sales) {
    details.push(`${summary.counters.sales} sale(s)`);
  }
  if (summary.counters.purchaseOrders) {
    details.push(`${summary.counters.purchaseOrders} purchase order(s)`);
  }
  if (summary.counters.receivings) {
    details.push(`${summary.counters.receivings} receiving event(s)`);
  }

  if (details.length > 0) {
    lines.push(`Updated: ${details.join(', ')}`);
  }

  if (summary.clearedSampleData) {
    lines.push('Removed previous demo data.');
  }

  if (summary.detail) {
    lines.push(summary.detail);
  }

  return lines;
};

export default function DashboardImportForm(): JSX.Element {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>({ state: 'idle' });

  const summaryLines = useMemo(() => {
    if (status.state !== 'success') {
      return [];
    }

    return formatSummary(status.payload);
  }, [status]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      setStatus({ state: 'error', message: 'Select a CSV or XLSX file to import.' });
      return;
    }

    setStatus({ state: 'loading' });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const headers = await buildAuthHeaders();
      const baseUrl = getApiBase();
      const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const response = await fetch(`${base}/imports/spreadsheet`, {
        method: 'POST',
        body: formData,
        headers,
        credentials: 'include'
      });

      if (!response.ok) {
        let message = 'Import failed';
        const contentType = response.headers.get('content-type') ?? '';
        if (contentType.includes('application/json')) {
          try {
            const data = (await response.json()) as { detail?: string; message?: string };
            message = data.detail || data.message || message;
          } catch (jsonError) {
            console.warn('Failed to parse import error payload', jsonError);
          }
        } else {
          const text = await response.text();
          if (text.trim().length > 0) {
            message = text;
          }
        }

        throw new Error(message);
      }

      const payload = (await response.json()) as ImportSummary;
      setStatus({ state: 'success', payload });
    } catch (error) {
      let message = error instanceof Error ? error.message : 'Import failed';
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        message = 'Unable to reach the API. Confirm the server is running and try again.';
      }
      setStatus({ state: 'error', message });
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex h-full flex-col justify-between gap-5 rounded-2xl border border-white/10 bg-white/[0.08] p-5"
    >
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-2xl" aria-hidden>
            📥
          </span>
          <h3 className="text-lg font-semibold text-white">Import spreadsheet</h3>
          <p className="text-sm text-slate-300">
            Upload a CSV or XLSX export from STORIS/Google Sheets. We will clean the data, replace the
            demo fixtures, and load it into the live tables.
          </p>
        </div>

        <label className="flex flex-col gap-2 text-sm text-slate-200">
          <span className="font-medium text-slate-100">Spreadsheet file</span>
          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={(event) => {
              const selectedFile = event.target.files?.[0] ?? null;
              setFile(selectedFile);
              if (selectedFile) {
                setStatus({ state: 'idle' });
              }
            }}
            className="block w-full rounded-md border border-slate-500/40 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 file:mr-4 file:rounded-md file:border-0 file:bg-sky-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-sky-500"
          />
        </label>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-600"
          disabled={status.state === 'loading'}
        >
          {status.state === 'loading' ? 'Importing…' : 'Upload and import'}
        </button>

        {status.state === 'error' ? (
          <p className="text-sm text-rose-400">{status.message}</p>
        ) : null}

        {summaryLines.length > 0 ? (
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-950/40 p-3 text-sm text-emerald-200">
            {summaryLines.map((line, index) => (
              <p key={index} className="whitespace-pre-line">
                {line}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </form>
  );
}

