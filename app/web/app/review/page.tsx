'use client';

import useSWR from 'swr';
import axios from 'axios';

interface DraftSale {
  sale_id: number;
  ocr_confidence: number;
}

const fetcher = (url: string) => axios.get(url).then((res) => res.data);

export default function ReviewPage() {
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const { data } = useSWR(`${api}/sales`, fetcher, { suspense: false });

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-8">
      <header>
        <h1 className="text-3xl font-bold">OCR Review Queue</h1>
        <p className="text-slate-600">Review and approve draft tickets from OCR ingestion.</p>
      </header>
      <section className="rounded border border-slate-200 bg-white">
        <table className="w-full table-auto">
          <thead className="bg-slate-100 text-left text-sm uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Sale</th>
              <th className="px-4 py-2">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {(data?.drafts ?? []).map((sale: DraftSale) => (
              <tr key={sale.sale_id} className="border-t">
                <td className="px-4 py-2">#{sale.sale_id}</td>
                <td className="px-4 py-2">{(sale.ocr_confidence * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
