'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

interface ItemSummary {
  item_id: number;
  sku: string;
  description: string;
  price: number;
  short_code: string;
}

interface SaleLineDraft {
  item: ItemSummary;
  qty: number;
}

export default function KioskPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ItemSummary[]>([]);
  const [lines, setLines] = useState<SaleLineDraft[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (!query) {
        setResults([]);
        return;
      }
      const response = await axios.get<ItemSummary[]>(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/items/search`, {
        params: { q: query }
      });
      setResults(response.data);
    }, 200);
    return () => clearTimeout(handler);
  }, [query]);

  const total = useMemo(
    () =>
      lines.reduce((sum, line) => {
        return sum + line.qty * line.item.price;
      }, 0),
    [lines]
  );

  const addLine = (item: ItemSummary) => {
    setLines((current) => {
      const existing = current.find((line) => line.item.item_id === item.item_id);
      if (existing) {
        return current.map((line) =>
          line.item.item_id === item.item_id ? { ...line, qty: line.qty + 1 } : line
        );
      }
      return [...current, { item, qty: 1 }];
    });
    setQuery('');
    setResults([]);
  };

  const finalize = async () => {
    const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const { data: create } = await axios.post(`${api}/sales`, { created_by: 'kiosk', source: 'kiosk' });
    const saleId = create.sale_id;
    for (const line of lines) {
      await axios.post(`${api}/sales/${saleId}/add-line`, {
        sku: line.item.sku,
        qty: line.qty,
        location_id: 1
      });
    }
    const { data: finalizeData } = await axios.post(`${api}/sales/${saleId}/finalize`);
    setStatus(`Sale #${finalizeData.sale_id} finalized!`);
    setLines([]);
  };

  const uploadPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;
    const file = event.target.files[0];
    const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const form = new FormData();
    form.append('image', file);
    const { data } = await axios.post(`${api}/ocr/sale-ticket`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    setStatus(`Draft ticket #${data.sale_id} created for review.`);
  };

  return (
    <main className="flex min-h-screen flex-col gap-6 bg-slate-900 p-6 text-white">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sales Kiosk</h1>
          <p className="text-sm text-slate-300">Scan or search items to build a ticket.</p>
        </div>
        <label className="rounded bg-emerald-600 px-4 py-2 font-semibold shadow">
          Upload Ticket
          <input type="file" accept="image/*" className="hidden" onChange={uploadPhoto} />
        </label>
      </header>

      <input
        autoFocus
        placeholder="Scan barcode, type SKU or short code..."
        className="w-full rounded bg-white px-4 py-3 text-lg text-slate-900 focus:outline-none"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && results[0]) {
            addLine(results[0]);
          }
        }}
      />

      <section className="grid gap-2">
        {results.map((item) => (
          <button
            key={item.item_id}
            type="button"
            onClick={() => addLine(item)}
            className="flex items-center justify-between rounded bg-slate-800 px-4 py-3 text-left hover:bg-slate-700"
          >
            <div>
              <div className="text-lg font-semibold">{item.sku}</div>
              <div className="text-sm text-slate-300">{item.description}</div>
            </div>
            <div className="text-xl font-bold">${item.price.toFixed(2)}</div>
          </button>
        ))}
      </section>

      <section className="rounded bg-white p-4 text-slate-900 shadow">
        <h2 className="mb-2 text-xl font-semibold">Ticket</h2>
        {lines.length === 0 && <p className="text-sm text-slate-500">No items yet.</p>}
        <ul className="space-y-2">
          {lines.map((line) => (
            <li key={line.item.item_id} className="flex justify-between">
              <span>
                {line.item.sku} × {line.qty}
              </span>
              <span>${(line.qty * line.item.price).toFixed(2)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between text-lg font-bold">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
        <button
          type="button"
          className="mt-4 w-full rounded bg-emerald-600 px-4 py-3 text-lg font-semibold text-white hover:bg-emerald-500"
          onClick={finalize}
          disabled={lines.length === 0}
        >
          Finalize Ticket
        </button>
        {status && <p className="mt-2 text-sm text-emerald-600">{status}</p>}
      </section>
    </main>
  );
}
