'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import SalesTicketWorkflow, {
  type SaleDetail
} from '../../../../components/sales/sales-ticket-workflow';
import { buildAuthHeaders, getApiBase } from '../../../../lib/api';

export default function SaleDetailPage() {
  const { saleId } = useParams<{ saleId: string }>();
  const numericSaleId = saleId ? Number.parseInt(saleId, 10) : null;
  const api = useMemo(() => getApiBase(), []);
  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!numericSaleId) {
      return;
    }

    let ignore = false;
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const headers = await buildAuthHeaders({ Accept: 'application/json' });
        const response = await fetch(`${api}/sales/${numericSaleId}`, {
          signal: controller.signal,
          headers
        });
        if (!response.ok) {
          throw new Error('Failed to load sale ticket');
        }
        const detail = (await response.json()) as SaleDetail;
        if (!ignore) {
          setSale(detail);
        }
      } catch (err) {
        if (controller.signal.aborted || ignore) {
          return;
        }
        console.error(err);
        setError('Unable to load sale ticket.');
        setSale(null);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [api, numericSaleId]);

  const ocrEntries = useMemo(() => {
    if (!sale) {
      return [] as [string, unknown][];
    }
    return Object.entries(sale.ocr_fields ?? {});
  }, [sale]);

  if (!numericSaleId) {
    return (
      <main className="min-h-screen bg-slate-950/95 px-6 py-10 text-white">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
          <div className="rounded-3xl border border-rose-500/40 bg-rose-500/10 p-6 text-sm text-rose-100">
            Invalid sale selected.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950/95 px-6 py-10 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-xl shadow-slate-950/30">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Sale ticket</p>
              <h1 className="text-3xl font-semibold text-white">Ticket #{numericSaleId}</h1>
            </div>
            <Link
              href="/dashboard/items"
              className="inline-flex items-center rounded-full border border-sky-400/40 bg-sky-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-sky-100 transition hover:border-sky-300/60 hover:bg-sky-400/20"
            >
              Back to catalog
            </Link>
          </div>
          {error ? <p className="text-sm text-rose-200">{error}</p> : null}
          {sale ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Status</p>
                <p className="text-lg font-semibold text-white">{sale.status}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Total</p>
                <p className="text-lg font-semibold text-white">${sale.total.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Subtotal</p>
                <p className="text-lg font-semibold text-white">${sale.subtotal.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Tax</p>
                <p className="text-lg font-semibold text-white">${sale.tax.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Payment method</p>
                <p className="text-lg font-semibold text-white">
                  {sale.payment_method ? sale.payment_method.replace(/_/g, ' ') : 'Not recorded'}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Fulfillment</p>
                <p className="text-lg font-semibold text-white">
                  {sale.fulfillment_type ? sale.fulfillment_type.replace(/_/g, ' ') : 'Pickup'}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Delivery fee</p>
                <p className="text-lg font-semibold text-white">${sale.delivery_fee.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">OCR confidence</p>
                <p className="text-lg font-semibold text-white">{(sale.ocr_confidence * 100).toFixed(1)}%</p>
              </div>
            </div>
          ) : null}
          {loading ? <p className="text-sm text-slate-300">Loading ticket details…</p> : null}
        </header>

        <SalesTicketWorkflow
          mode="edit"
          saleId={numericSaleId}
          initialSale={sale}
          onSaleUpdated={setSale}
        />

        {sale && ocrEntries.length ? (
          <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-xl shadow-slate-950/30">
            <h2 className="text-xl font-semibold text-white">Captured fields</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              {ocrEntries.map(([key, value]) => (
                <div key={key} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <dt className="text-xs uppercase tracking-[0.3em] text-slate-400">{key}</dt>
                  <dd className="mt-2 text-sm text-slate-100">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {sale ? (
          <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-xl shadow-slate-950/30">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Attachments</h2>
              <span className="text-xs text-slate-400">{sale.attachments.length} file(s)</span>
            </div>
            {sale.attachments.length ? (
              <ul className="mt-4 space-y-3">
                {sale.attachments.map((attachment) => (
                  <li
                    key={attachment.attachment_id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100"
                  >
                    <div>
                      <p className="font-semibold text-white">{attachment.kind.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-slate-400">{new Date(attachment.created_at).toLocaleString()}</p>
                    </div>
                    <a
                      href={attachment.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-100 hover:border-emerald-300/50 hover:text-emerald-50"
                    >
                      Open
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-300">No attachments linked to this ticket.</p>
            )}
          </section>
        ) : null}
      </div>
    </main>
  );
}
