'use client';

import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import useSWR from 'swr';

import { apiBase, buildAuthHeaders } from '../../lib/api';

type LabelTemplate = {
  template_id: string;
  name: string;
  target: string;
};

type InboundQueueItem = {
  id: string;
  reference: string;
  carrier: string;
  eta: string;
  pallets: number;
  status: 'Queued' | 'Docked' | 'Printed';
};

type PurchaseOrder = {
  id: string;
  supplier: string;
  items: number;
  value: string;
  status: 'Draft' | 'Ready' | 'Printed';
  lastPrinted?: string;
};

const fetcher = async (url: string) => {
  const headers = await buildAuthHeaders();
  const response = await axios.get(url, { headers });
  return response.data;
};

const fallbackTemplates: LabelTemplate[] = [
  {
    template_id: 'fowhands-classic-shelf',
    name: 'Fowhands Classic Shelf Talker',
    target: 'DYMO LabelWriter Wireless'
  },
  {
    template_id: 'fowhands-price-burst',
    name: 'Fowhands Price Burst Label',
    target: 'DYMO LabelWriter 550 Turbo'
  },
  {
    template_id: 'fowhands-logistics-tag',
    name: 'Fowhands Logistics & Delivery Tag',
    target: 'DYMO LabelWriter 5XL'
  },
  { template_id: 'bin-label', name: 'Bin Location Label', target: 'DYMO LabelWriter 550 Turbo' },
  { template_id: 'shelf-talker', name: 'Shelf Talker 2x7', target: 'DYMO LabelWriter Wireless' }
];

type TemplateShowcase = {
  id: string;
  name: string;
  description: string;
  dimensions: string;
  bestFor: string;
  fields: string[];
};

const templateShowcase: TemplateShowcase[] = [
  {
    id: 'fowhands-classic-shelf',
    name: 'Classic Shelf Talker',
    description:
      'Story-driven merchandising card with the Fowhands crest, bold pricing, and a short hero description.',
    dimensions: '2" × 7" cardstock',
    bestFor: 'Lifestyle vignettes & seasonal campaigns',
    fields: ['Product name', 'Hero copy line', 'Price (MSRP + promo)', 'SKU & QR short code']
  },
  {
    id: 'fowhands-price-burst',
    name: 'Price Burst Label',
    description:
      'Compact price-forward badge that keeps the Fowhands monogram anchored to the left for DYMO rolls.',
    dimensions: '1.2" × 2.3" thermal',
    bestFor: 'Fast repricing & end-cap callouts',
    fields: ['Product title', 'Price & compare-at', 'SKU barcode', 'Fulfillment note']
  },
  {
    id: 'fowhands-logistics-tag',
    name: 'Logistics & Delivery Tag',
    description:
      'Oversized staging ticket that pairs the gold crest with pickup, routing, and staging metadata blocks.',
    dimensions: '4" × 6" thermal',
    bestFor: 'Dock routing & last-mile visibility',
    fields: ['Order reference', 'Customer name', 'Dock assignment', 'Handling instructions']
  }
];

const TemplatePreview = ({ id }: { id: TemplateShowcase['id'] }) => {
  if (id === 'fowhands-classic-shelf') {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/90 via-slate-900 to-slate-950 p-5 shadow-inner shadow-slate-950/50">
        <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.35em]">
          <span className="inline-flex items-center gap-2 text-amber-200">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-amber-400/40 bg-amber-400/15 text-xs text-amber-200">
              FH
            </span>
            Fowhands
          </span>
          <span className="text-slate-500">Est. 1894</span>
        </div>
        <p className="mt-4 text-[11px] uppercase tracking-[0.4em] text-slate-400">Heritage upholstery</p>
        <p className="mt-2 text-lg font-semibold text-white">Westbury Wingback Chair</p>
        <p className="mt-1 text-3xl font-bold text-amber-200">$1,249</p>
        <div className="mt-5 flex items-center justify-between text-[10px] uppercase tracking-[0.4em] text-slate-400">
          <span>SKU FH-81427</span>
          <span>Scan • QR-9715</span>
        </div>
        <span className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-400/0 via-amber-400/40 to-amber-400/0" />
      </div>
    );
  }

  if (id === 'fowhands-price-burst') {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-5 shadow-inner shadow-slate-950/50">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-400/20 text-lg font-semibold text-amber-300">
            FH
          </span>
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.35em] text-slate-400">New arrival</p>
            <p className="text-base font-semibold text-white">Auburn Loom Throw</p>
          </div>
        </div>
        <div className="mt-6 flex items-end justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.4em] text-slate-400">Now</p>
            <p className="text-3xl font-bold text-amber-200">$68</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-[0.4em] text-slate-500 line-through">$84</p>
            <p className="text-[11px] uppercase tracking-[0.4em] text-emerald-300">Save 19%</p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between text-[10px] uppercase tracking-[0.4em] text-slate-400">
          <span>SKU FH-20451</span>
          <span>Bin C4</span>
        </div>
        <span className="absolute -right-10 -top-10 h-24 w-24 rotate-12 rounded-full border border-amber-400/30 bg-amber-400/10" />
      </div>
    );
  }

  if (id === 'fowhands-logistics-tag') {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-5 shadow-inner shadow-slate-950/50">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-amber-200">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-400/30 text-[10px] font-semibold text-amber-100">
              FH
            </span>
            Logistics
          </span>
          <span className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Dock 3 • Lane B</span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 text-left text-xs text-white">
          <div className="rounded-xl bg-white/5 p-3 text-slate-200">
            <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">Order</p>
            <p className="mt-1 text-sm font-semibold text-white">SO-91842</p>
            <p className="text-[11px] text-slate-400">Fowhands Home - Austin</p>
          </div>
          <div className="rounded-xl bg-white/5 p-3 text-slate-200">
            <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">Customer</p>
            <p className="mt-1 text-sm font-semibold text-white">R. Sandoval</p>
            <p className="text-[11px] text-slate-400">White Glove Delivery</p>
          </div>
          <div className="rounded-xl bg-white/5 p-3 text-slate-200">
            <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">Window</p>
            <p className="mt-1 text-sm font-semibold text-white">10:00a – 12:00p</p>
            <p className="text-[11px] text-slate-400">Saturday</p>
          </div>
          <div className="rounded-xl bg-white/5 p-3 text-slate-200">
            <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">Notes</p>
            <p className="mt-1 text-[11px] text-slate-300">Stage with blankets • Side door</p>
          </div>
        </div>
        <span className="absolute inset-x-5 bottom-5 h-[2px] bg-gradient-to-r from-amber-400/0 via-amber-400/50 to-amber-400/0" />
      </div>
    );
  }

  return null;
};

const defaultQueue: InboundQueueItem[] = [
  { id: 'Q-1024', reference: 'Inbound transfer • Dallas', carrier: 'Lone Star Freight', eta: 'Arrived • Dock 3', pallets: 8, status: 'Docked' },
  { id: 'Q-1025', reference: 'PO #8451 • Seasonal decor', carrier: 'Rivertown Logistics', eta: 'ETA 22 min', pallets: 12, status: 'Queued' },
  { id: 'Q-1026', reference: 'Return consolidation', carrier: 'ParcelWorks', eta: 'ETA 48 min', pallets: 5, status: 'Queued' }
];

const defaultPurchaseOrders: PurchaseOrder[] = [
  { id: 'PO-78123', supplier: 'Hearthside Home', items: 146, value: '$18,450', status: 'Ready' },
  { id: 'PO-78148', supplier: 'Urban Glow Lighting', items: 64, value: '$9,210', status: 'Draft' },
  { id: 'PO-78162', supplier: 'Northwind Fabrics', items: 208, value: '$23,980', status: 'Ready' }
];

export default function LabelsPage() {
  const api = apiBase;
  const { data } = useSWR<LabelTemplate[]>(`${api}/labels/templates`, fetcher, {
    revalidateOnFocus: false
  });

  const templates = useMemo<LabelTemplate[]>(() => {
    if (Array.isArray(data) && data.length > 0) {
      return data.map((template) => ({
        ...template,
        template_id: String(template.template_id)
      }));
    }
    return fallbackTemplates;
  }, [data]);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    itemName: '',
    sku: '',
    quantity: 1,
    notes: ''
  });
  const [printJobs, setPrintJobs] = useState<
    { id: string; template: string; item: string; quantity: number; timestamp: string; notes?: string }[]
  >([]);
  const [queue, setQueue] = useState<InboundQueueItem[]>(defaultQueue);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(defaultPurchaseOrders);

  useEffect(() => {
    if (templates.length === 0) {
      setSelectedTemplateId(null);
      return;
    }

    if (!selectedTemplateId) {
      setSelectedTemplateId(templates[0].template_id);
      return;
    }

    const templateExists = templates.some((template) => template.template_id === selectedTemplateId);
    if (!templateExists) {
      setSelectedTemplateId(templates[0].template_id);
    }
  }, [selectedTemplateId, templates]);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.template_id === selectedTemplateId) ?? null,
    [selectedTemplateId, templates]
  );

  const handleInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormState((prev) => ({
      ...prev,
      [name]: name === 'quantity' ? Number(value) || 1 : value
    }));
  };

  const handlePrintLabels = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTemplate) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setPrintJobs((prev) => [
      {
        id: `JOB-${prev.length + 1}`,
        template: selectedTemplate.name,
        item: formState.itemName || 'Unnamed item',
        quantity: formState.quantity,
        notes: formState.notes || undefined,
        timestamp
      },
      ...prev
    ]);

    setFormState({ itemName: '', sku: '', quantity: 1, notes: '' });
  };

  const handleAdvanceQueue = (id: string) => {
    setQueue((prev) =>
      prev.map((entry) => {
        if (entry.id !== id) return entry;

        if (entry.status === 'Queued') {
          return { ...entry, status: 'Docked', eta: 'At staging lane' };
        }

        if (entry.status === 'Docked') {
          return { ...entry, status: 'Printed', eta: 'Labels sent' };
        }

        return entry;
      })
    );
  };

  const handlePrintPurchaseOrder = (id: string) => {
    const printedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setPurchaseOrders((prev) =>
      prev.map((po) =>
        po.id === id
          ? {
              ...po,
              status: 'Printed',
              lastPrinted: printedAt
            }
          : po
      )
    );
  };

  return (
    <main className="relative min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.35),_rgba(15,23,42,0.1))]" />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-14 lg:px-10">
        <header className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-10 shadow-2xl shadow-sky-900/25 backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-slate-200">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
                Labels cockpit
              </span>
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">Print labels with confidence</h1>
              <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
                Orchestrate templates, inbound queues, and purchase order paperwork from one sleek surface.
              </p>
            </div>
            {selectedTemplate && (
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-sm text-slate-300">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Active template</p>
                <p className="mt-3 text-lg font-semibold text-white">{selectedTemplate.name}</p>
                <p className="mt-1 text-xs text-slate-400">{selectedTemplate.target}</p>
              </div>
            )}
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.15fr_1fr]">
          <div className="space-y-8">
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-xl shadow-slate-950/30 backdrop-blur">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-semibold text-white">Label builder</h2>
                <span className="text-xs uppercase tracking-[0.35em] text-slate-400">Compose &amp; print</span>
              </div>
              <form className="mt-6 space-y-6" onSubmit={handlePrintLabels}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium text-slate-200">Item name</span>
                    <input
                      type="text"
                      name="itemName"
                      value={formState.itemName}
                      onChange={handleInputChange}
                      placeholder="Winter Luxe Throw"
                      className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium text-slate-200">SKU</span>
                    <input
                      type="text"
                      name="sku"
                      value={formState.sku}
                      onChange={handleInputChange}
                      placeholder="SKU-44781"
                      className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium text-slate-200">Quantity</span>
                    <input
                      type="number"
                      min={1}
                      name="quantity"
                      value={formState.quantity}
                      onChange={handleInputChange}
                      className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm">
                    <span className="font-medium text-slate-200">Template</span>
                    <div className="relative">
                      <select
                        value={selectedTemplateId ?? ''}
                        onChange={(event) => {
                          const nextTemplateId = event.target.value;
                          setSelectedTemplateId(nextTemplateId ? String(nextTemplateId) : null);
                        }}
                        className="w-full appearance-none rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                      >
                        {templates.map((template) => (
                          <option key={template.template_id} value={template.template_id}>
                            {template.name}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-500" aria-hidden>
                        ⌄
                      </span>
                    </div>
                  </label>
                </div>
                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium text-slate-200">Notes for this batch</span>
                  <textarea
                    name="notes"
                    value={formState.notes}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Mark as rush for curbside staging."
                    className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  />
                </label>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <p className="text-xs text-slate-400">
                    Labels render instantly and ship to the DYMO Web Service for on-demand printing.
                  </p>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-full border border-sky-500/40 bg-sky-500/20 px-6 py-3 text-sm font-semibold uppercase tracking-[0.28em] text-sky-200 transition hover:border-sky-300/60 hover:bg-sky-500/30"
                  >
                    <span aria-hidden>🖨️</span>
                    Print labels
                  </button>
                </div>
              </form>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-xl shadow-slate-950/30 backdrop-blur">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">Fowhands template suite</h2>
                  <p className="mt-2 text-sm text-slate-300">
                    Curated label designs with the latest crest lockups ready to plug into your printer queue.
                  </p>
                </div>
                <span className="inline-flex h-fit rounded-full border border-white/10 bg-white/10 px-4 py-1 text-xs uppercase tracking-[0.35em] text-slate-400">
                  Brand kit
                </span>
              </div>
              <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {templateShowcase.map((template) => (
                  <div
                    key={template.id}
                    className="group flex h-full flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-left shadow-sm shadow-slate-950/40 transition hover:border-white/30 hover:bg-white/10"
                  >
                    <TemplatePreview id={template.id} />
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-white">{template.name}</p>
                        <p className="text-xs text-slate-300">{template.description}</p>
                      </div>
                      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-xs">
                        <dt className="font-semibold uppercase tracking-[0.35em] text-slate-400">Size</dt>
                        <dd className="text-slate-200">{template.dimensions}</dd>
                        <dt className="font-semibold uppercase tracking-[0.35em] text-slate-400">Best for</dt>
                        <dd className="text-slate-200">{template.bestFor}</dd>
                      </dl>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">Merge fields</p>
                        <ul className="mt-2 space-y-1 text-xs text-slate-300">
                          {template.fields.map((field) => (
                            <li key={field} className="flex items-start gap-2">
                              <span
                                aria-hidden
                                className="mt-1 inline-flex h-1.5 w-1.5 flex-none rounded-full bg-amber-300/70"
                              />
                              <span>{field}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-xl shadow-slate-950/30 backdrop-blur">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Recent print jobs</h2>
                <span className="text-xs uppercase tracking-[0.35em] text-slate-400">Activity</span>
              </div>
              <ul className="mt-6 space-y-4">
                {printJobs.length === 0 ? (
                  <li className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-slate-300">
                    Jobs you submit will appear here with timestamps and notes.
                  </li>
                ) : (
                  printJobs.map((job) => (
                    <li
                      key={job.id}
                      className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-slate-200 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-white">{job.item}</p>
                        <p className="text-xs text-slate-400">
                          {job.template} • Qty {job.quantity} • {job.timestamp}
                        </p>
                        {job.notes && <p className="text-xs text-slate-400">{job.notes}</p>}
                      </div>
                      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200">
                        <span aria-hidden>✓</span> Sent
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>

          <aside className="space-y-8">
            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-xl shadow-slate-950/30 backdrop-blur">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Inbound truck queue</h2>
                <span className="text-xs uppercase tracking-[0.35em] text-slate-400">Live feed</span>
              </div>
              <ul className="mt-6 space-y-4">
                {queue.map((entry) => (
                  <li key={entry.id} className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-200">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">{entry.reference}</p>
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] ${
                          entry.status === 'Queued'
                            ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                            : entry.status === 'Docked'
                              ? 'border-sky-500/30 bg-sky-500/10 text-sky-200'
                              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                        }`}
                      >
                        {entry.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{entry.carrier}</p>
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-300">
                      <span>{entry.eta}</span>
                      <span>{entry.pallets} pallets</span>
                    </div>
                    {entry.status !== 'Printed' && (
                      <button
                        type="button"
                        onClick={() => handleAdvanceQueue(entry.id)}
                        className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-white transition hover:border-white/30 hover:bg-white/20"
                      >
                        Advance
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-xl shadow-slate-950/30 backdrop-blur">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Purchase orders</h2>
                <span className="text-xs uppercase tracking-[0.35em] text-slate-400">Paper trail</span>
              </div>
              <ul className="mt-6 space-y-4">
                {purchaseOrders.map((po) => (
                  <li key={po.id} className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-200">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{po.id}</p>
                        <p className="text-xs text-slate-400">{po.supplier}</p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] ${
                          po.status === 'Printed'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                            : po.status === 'Ready'
                              ? 'border-sky-500/30 bg-sky-500/10 text-sky-200'
                              : 'border-slate-500/30 bg-slate-500/10 text-slate-200'
                        }`}
                      >
                        {po.status}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-300">
                      <span>{po.items} items</span>
                      <span>{po.value}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                      <span>{po.lastPrinted ? `Printed ${po.lastPrinted}` : 'Not yet printed'}</span>
                      <button
                        type="button"
                        onClick={() => handlePrintPurchaseOrder(po.id)}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-white transition hover:border-white/30 hover:bg-white/20"
                      >
                        Print
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
