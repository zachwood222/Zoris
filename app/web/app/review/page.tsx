'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import axios from 'axios';

interface DraftSale {
  sale_id: number;
  ocr_confidence: number;
  total: number;
  customer_name?: string | null;
}

interface SaleAttachment {
  attachment_id: number;
  file_url: string;
  kind: string;
  created_at: string;
}

interface DraftSaleDetail {
  sale_id: number;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  ocr_confidence: number;
  ocr_fields: Record<string, string | number | null>;
  attachments: SaleAttachment[];
}

const fetcher = (url: string) => axios.get(url).then((res) => res.data);

export default function ReviewPage() {
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const { data, mutate } = useSWR<{ drafts: DraftSale[] }>(`${api}/sales`, fetcher, {
    suspense: false
  });
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
  const { data: saleDetail, mutate: mutateSaleDetail } = useSWR<DraftSaleDetail>(
    () => (selectedSaleId ? `${api}/sales/${selectedSaleId}` : null),
    fetcher
  );

  useEffect(() => {
    const drafts = data?.drafts ?? [];
    if (!drafts.length) {
      if (selectedSaleId !== null) {
        setSelectedSaleId(null);
      }
      return;
    }
    if (!selectedSaleId || !drafts.some((sale) => sale.sale_id === selectedSaleId)) {
      setSelectedSaleId(drafts[0].sale_id);
    }
  }, [data?.drafts, selectedSaleId]);

  const parsedFields = useMemo(() => {
    if (!saleDetail?.ocr_fields) {
      return [] as [string, string | number | null][];
    }
    return Object.entries(saleDetail.ocr_fields);
  }, [saleDetail?.ocr_fields]);

  const handleApprove = async () => {
    if (!selectedSaleId) return;
    await axios.post(`${api}/sales/${selectedSaleId}/approve`);
    await mutate();
    await mutateSaleDetail();
  };

  const handleReject = async () => {
    if (!selectedSaleId) return;
    await axios.post(`${api}/sales/${selectedSaleId}/reject`);
    await mutate();
    await mutateSaleDetail();
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 p-8">
      <header>
        <h1 className="text-3xl font-bold">OCR Review Queue</h1>
        <p className="text-slate-600">Review and approve draft tickets from OCR ingestion.</p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="overflow-hidden rounded border border-slate-200 bg-white">
          <table className="w-full table-auto text-sm">
            <thead className="bg-slate-100 text-left uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Sale</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {(data?.drafts ?? []).map((sale) => {
                const isSelected = sale.sale_id === selectedSaleId;
                return (
                  <tr
                    key={sale.sale_id}
                    onClick={() => setSelectedSaleId(sale.sale_id)}
                    className={`cursor-pointer border-t transition hover:bg-slate-50 ${
                      isSelected ? 'bg-slate-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">#{sale.sale_id}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {sale.customer_name ? sale.customer_name : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">${sale.total.toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {(sale.ocr_confidence * 100).toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
              {data?.drafts?.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                    No draft OCR tickets in the queue.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
        <aside className="space-y-4">
          {!selectedSaleId && (
            <div className="rounded border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
              Select a draft ticket to view OCR details and take action.
            </div>
          )}
          {selectedSaleId && saleDetail && (
            <div className="space-y-4 rounded border border-slate-200 bg-white p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-800">Sale #{saleDetail.sale_id}</h2>
                  <p className="text-sm text-slate-500">Status: {saleDetail.status}</p>
                </div>
                <div className="text-right text-sm text-slate-500">
                  <p>Confidence</p>
                  <p className="text-lg font-semibold text-slate-800">
                    {(saleDetail.ocr_confidence * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm text-slate-600">
                <div>
                  <dt className="font-semibold text-slate-500">Subtotal</dt>
                  <dd>${saleDetail.subtotal.toFixed(2)}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">Tax</dt>
                  <dd>${saleDetail.tax.toFixed(2)}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="font-semibold text-slate-500">Total</dt>
                  <dd className="text-lg font-semibold text-slate-800">
                    ${saleDetail.total.toFixed(2)}
                  </dd>
                </div>
              </dl>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  OCR Fields
                </h3>
                <ul className="mt-2 space-y-2 text-sm text-slate-600">
                  {parsedFields.map(([label, value]) => (
                    <li key={label} className="flex items-center justify-between gap-4">
                      <span className="font-medium capitalize text-slate-500">
                        {label.replace(/_/g, ' ')}
                      </span>
                      <span className="text-right text-slate-700">{value ?? '—'}</span>
                    </li>
                  ))}
                  {parsedFields.length === 0 && (
                    <li className="text-slate-500">No parsed fields stored for this ticket.</li>
                  )}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Ticket Image
                </h3>
                {saleDetail.attachments.length ? (
                  <div className="mt-3 space-y-3">
                    {saleDetail.attachments.map((attachment) => (
                      <figure key={attachment.attachment_id} className="space-y-2">
                        <img
                          src={attachment.file_url}
                          alt={`Ticket attachment ${attachment.attachment_id}`}
                          className="w-full rounded border border-slate-200 object-contain"
                        />
                        <figcaption className="text-xs text-slate-500">
                          Uploaded {new Date(attachment.created_at).toLocaleString()}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">No attachments linked to this sale.</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleApprove}
                  className="inline-flex flex-1 items-center justify-center rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  className="inline-flex flex-1 items-center justify-center rounded border border-rose-500 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                >
                  Reject
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
