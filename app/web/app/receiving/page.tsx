'use client';

import { useState } from 'react';
import axios from 'axios';

import { apiBase, buildAuthHeaders } from '../../lib/api';

interface LookupLine {
  po_id: number;
  po_line_id: number;
  item_id: number;
  description: string;
  qty_ordered: number;
  qty_received: number;
  qty_remaining: number;
}

interface ReceivedLine {
  po_line_id: number;
  description: string;
  qty_received: number;
  qty_remaining: number;
}

type ActivityEntry =
  | {
      type: 'success';
      poId: number;
      receiptId: number;
      billId: number;
      lines: ReceivedLine[];
      scannedCode: string;
      timestamp: string;
    }
  | {
      type: 'error';
      message: string;
      code?: string;
      scannedCode: string;
      timestamp: string;
    };

export default function ReceivingPage() {
  const [scan, setScan] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const api = apiBase;

  const appendActivity = (entry: ActivityEntry) => {
    setActivity((entries) => [entry, ...entries].slice(0, 25));
  };

  const formatTimestamp = (timestamp: string) =>
    new Date(timestamp).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

  const submit = async () => {
    if (!scan || isSubmitting) return;
    const qty = Number(quantity);
    if (Number.isNaN(qty) || qty <= 0) {
      appendActivity({
        type: 'error',
        message: 'Enter a quantity greater than zero.',
        scannedCode: scan,
        timestamp: new Date().toISOString()
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const headers = await buildAuthHeaders();
      const { data } = await axios.get<LookupLine[]>(`${api}/po/lookup/${encodeURIComponent(scan)}`, {
        headers
      });

      const grouped = data.reduce<Map<number, LookupLine[]>>((map, line) => {
        const existing = map.get(line.po_id) ?? [];
        existing.push(line);
        map.set(line.po_id, existing);
        return map;
      }, new Map());

      if (grouped.size === 0) {
        appendActivity({
          type: 'error',
          message: 'No open purchase order lines matched this scan.',
          scannedCode: scan,
          timestamp: new Date().toISOString()
        });
        return;
      }

      let hadSuccess = false;

      for (const [poId, lines] of grouped.entries()) {
        const prepared = lines.reduce<ReceivedLine[]>((acc, line) => {
          const qtyToReceive = Math.min(qty, line.qty_remaining);
          if (qtyToReceive <= 0) {
            return acc;
          }
          acc.push({
            po_line_id: line.po_line_id,
            description: line.description,
            qty_received: qtyToReceive,
            qty_remaining: Math.max(line.qty_remaining - qtyToReceive, 0)
          });
          return acc;
        }, []);

        if (prepared.length === 0) {
          appendActivity({
            type: 'error',
            message: 'All matched lines are already fully received.',
            scannedCode: scan,
            timestamp: new Date().toISOString()
          });
          continue;
        }

        const payload = prepared.map((line) => ({
          po_line_id: line.po_line_id,
          qty_received: line.qty_received
        }));

        const response = await axios.post<{ receipt_id: number; bill_id: number }>(
          `${api}/po/${poId}/receive`,
          payload,
          { headers }
        );

        appendActivity({
          type: 'success',
          poId,
          receiptId: response.data.receipt_id,
          billId: response.data.bill_id,
          lines: prepared,
          scannedCode: scan,
          timestamp: new Date().toISOString()
        });
        hadSuccess = true;
      }

      if (hadSuccess) {
        setScan('');
      }
    } catch (error) {
      let message = 'Failed to process scan.';
      let code: string | undefined;
      if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail;
        if (typeof detail === 'string') {
          message = detail;
        } else if (Array.isArray(detail)) {
          message = detail.join(', ');
        }
        code = error.response?.status ? String(error.response.status) : undefined;
      } else if (error instanceof Error) {
        message = error.message;
      }

      appendActivity({
        type: 'error',
        message,
        code,
        scannedCode: scan,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col gap-6 bg-slate-900 p-8 text-white">
      <header>
        <h1 className="text-3xl font-bold">Receiving</h1>
        <p className="text-slate-300">Scan PO line barcodes to receive inventory.</p>
      </header>

      <section className="flex flex-col gap-4 rounded bg-white p-4 text-slate-900 shadow">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-600">Scan</span>
            <input
              autoFocus
              value={scan}
              onChange={(e) => setScan(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
              }}
              className="w-full rounded border border-slate-300 px-4 py-3 text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Scan PO line barcode..."
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-600">Quantity</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
              }}
              className="w-full rounded border border-slate-300 px-4 py-3 text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </label>
          <button
            type="button"
            onClick={submit}
            disabled={isSubmitting}
            className="mt-2 rounded bg-emerald-600 px-4 py-3 text-lg font-semibold text-white shadow transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-300"
          >
            {isSubmitting ? 'Receiving…' : 'Receive'}
          </button>
        </div>
      </section>

      <section className="rounded bg-white p-4 text-slate-900 shadow">
        <h2 className="mb-3 text-lg font-semibold">Recent activity</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-slate-500">Scan a barcode to see receipts and errors here.</p>
        ) : (
          <ul className="space-y-3">
            {activity.map((entry, index) => (
              <li
                key={`${entry.timestamp}-${index}`}
                className={`rounded border px-4 py-3 text-sm ${
                  entry.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border-rose-200 bg-rose-50 text-rose-900'
                }`}
              >
                <div className="flex items-center justify-between text-xs uppercase tracking-wide">
                  <span className="font-semibold">{entry.type === 'success' ? 'Receipt posted' : 'Error'}</span>
                  <span className="text-slate-500">{formatTimestamp(entry.timestamp)}</span>
                </div>
                <div className="mt-1 text-base font-semibold">
                  {entry.type === 'success'
                    ? `PO #${entry.poId} · Receipt #${entry.receiptId}`
                    : entry.message}
                </div>
                <div className="mt-1 text-xs text-slate-500">Scan: {entry.scannedCode}</div>
                {entry.type === 'success' ? (
                  <div className="mt-2 space-y-1">
                    {entry.lines.map((line) => (
                      <div key={line.po_line_id} className="flex flex-col">
                        <span className="font-medium">{line.description}</span>
                        <span>
                          Received {line.qty_received.toFixed(2)} · Remaining {line.qty_remaining.toFixed(2)}
                        </span>
                      </div>
                    ))}
                    <div className="text-xs text-slate-500">Bill draft #{entry.billId}</div>
                  </div>
                ) : (
                  entry.code && <div className="mt-1 text-xs text-rose-700">Code: {entry.code}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
