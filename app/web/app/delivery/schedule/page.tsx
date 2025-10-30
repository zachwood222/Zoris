'use client';

import axios from 'axios';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import { buildAuthHeaders, getApiBase } from '../../../lib/api';

interface DeliveryWindow {
  saleId: number | null;
  customer: string;
  address: string;
  windowStart: string;
  windowEnd: string;
  crew: string;
  specialInstructions: string;
}

const createDefaultWindow = (): DeliveryWindow => ({
  saleId: null,
  customer: '',
  address: '',
  windowStart: '',
  windowEnd: '',
  crew: 'North route',
  specialInstructions: ''
});

interface SaleOption {
  sale_id: number;
  ticket_number: string | null;
  customer_name: string | null;
  delivery_status: string | null;
  status: string | null;
}

export default function DeliverySchedulePage() {
  const [window, setWindow] = useState<DeliveryWindow>(() => createDefaultWindow());
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [saleOptions, setSaleOptions] = useState<SaleOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState<boolean>(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  const api = useMemo(() => getApiBase(), []);

  useEffect(() => {
    let ignore = false;
    const fetchSales = async () => {
      setOptionsLoading(true);
      setOptionsError(null);
      try {
        const headers = await buildAuthHeaders({ Accept: 'application/json' });
        const { data } = await axios.get<{ sales: SaleOption[] }>(`${api}/sales/delivery-options`, {
          headers
        });
        if (!ignore) {
          setSaleOptions(data.sales ?? []);
        }
      } catch (error) {
        if (!ignore) {
          setOptionsError('We could not load sales tickets. Try again soon.');
          setSaleOptions([]);
        }
      } finally {
        if (!ignore) {
          setOptionsLoading(false);
        }
      }
    };

    fetchSales();

    return () => {
      ignore = true;
    };
  }, [api]);

  const filteredSaleOptions = useMemo(() => {
    const query = window.customer.trim().toLowerCase();
    if (!query) {
      return saleOptions.slice(0, 8);
    }
    return saleOptions
      .filter((sale) => {
        const ticket = sale.ticket_number?.toLowerCase() ?? '';
        const name = sale.customer_name?.toLowerCase() ?? '';
        const status = sale.delivery_status?.replace(/_/g, ' ').toLowerCase() ?? '';
        return (
          ticket.includes(query) ||
          name.includes(query) ||
          status.includes(query) ||
          `#${sale.sale_id}`.includes(query)
        );
      })
      .slice(0, 8);
  }, [saleOptions, window.customer]);

  const handleSelectSale = (sale: SaleOption) => {
    const label = sale.customer_name
      ? `${sale.customer_name} (${sale.ticket_number ?? `Sale #${sale.sale_id}`})`
      : sale.ticket_number ?? `Sale #${sale.sale_id}`;
    setWindow((state) => ({
      ...state,
      saleId: sale.sale_id,
      customer: label
    }));
    setShowSuggestions(false);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setConfirmation(
      `Delivery scheduled for ${
        window.customer || 'TBD'
      } (${window.windowStart || 'unscheduled'} - ${window.windowEnd || 'unscheduled'})${
        window.saleId ? ` · Attached to sale #${window.saleId}` : ''
      }`
    );
    setWindow(createDefaultWindow());
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 bg-slate-900 p-8 text-white">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Schedule Delivery</h1>
        <p className="text-sm text-slate-300">
          Coordinate last-mile logistics and keep the crew aligned with customer expectations.
        </p>
      </header>
      <section className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-lg shadow-slate-950/20">
        <form className="grid gap-4" onSubmit={submit}>
          <label className="grid gap-2 text-sm">
            <span className="font-semibold text-slate-200">Customer</span>
            <div className="relative">
              <input
                value={window.customer}
                onChange={(event) =>
                  setWindow((state) => ({ ...state, customer: event.target.value, saleId: null }))
                }
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  setTimeout(() => setShowSuggestions(false), 120);
                }}
                placeholder="Search by customer or ticket number"
                className="w-full rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-sky-400 focus:outline-none"
              />
              {optionsLoading ? (
                <span className="absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">Loading…</span>
              ) : null}
              {showSuggestions && filteredSaleOptions.length > 0 ? (
                <ul className="absolute z-20 mt-2 max-h-60 w-full overflow-y-auto rounded-lg border border-white/10 bg-slate-900/95 text-sm shadow-xl shadow-slate-950/40">
                  {filteredSaleOptions.map((sale) => {
                    const ticket = sale.ticket_number ?? `Sale #${sale.sale_id}`;
                    const statusLabel = sale.delivery_status
                      ? sale.delivery_status.replace(/_/g, ' ')
                      : sale.status ?? 'Open';
                    return (
                      <li key={sale.sale_id}>
                        <button
                          type="button"
                          className="flex w-full flex-col items-start gap-1 px-4 py-3 text-left text-slate-200 transition hover:bg-slate-800"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            handleSelectSale(sale);
                          }}
                        >
                          <span className="font-semibold text-white">{sale.customer_name ?? ticket}</span>
                          <span className="text-xs uppercase tracking-[0.28em] text-slate-400">{ticket}</span>
                          <span className="text-xs text-slate-400">{statusLabel}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
            {optionsError ? <p className="text-xs text-rose-300">{optionsError}</p> : null}
            {!optionsError && !optionsLoading ? (
              <p className="text-xs text-slate-400">
                Choose a sales ticket to attach or type a customer name to create a manual entry.
              </p>
            ) : null}
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-semibold text-slate-200">Address</span>
            <textarea
              value={window.address}
              onChange={(event) => setWindow((state) => ({ ...state, address: event.target.value }))}
              placeholder="123 Market Street, Springfield, NY 12345"
              className="min-h-[72px] rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-sky-400 focus:outline-none"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-slate-200">Window start</span>
              <input
                type="datetime-local"
                value={window.windowStart}
                onChange={(event) => setWindow((state) => ({ ...state, windowStart: event.target.value }))}
                className="rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-sky-400 focus:outline-none"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-semibold text-slate-200">Window end</span>
              <input
                type="datetime-local"
                value={window.windowEnd}
                onChange={(event) => setWindow((state) => ({ ...state, windowEnd: event.target.value }))}
                className="rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-sky-400 focus:outline-none"
              />
            </label>
          </div>
          <label className="grid gap-2 text-sm sm:max-w-xs">
            <span className="font-semibold text-slate-200">Crew assignment</span>
            <select
              value={window.crew}
              onChange={(event) => setWindow((state) => ({ ...state, crew: event.target.value }))}
              className="rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-sky-400 focus:outline-none"
            >
              <option value="North route">North route</option>
              <option value="South route">South route</option>
              <option value="East route">East route</option>
              <option value="West route">West route</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-semibold text-slate-200">Special instructions</span>
            <textarea
              value={window.specialInstructions}
              onChange={(event) => setWindow((state) => ({ ...state, specialInstructions: event.target.value }))}
              placeholder="Gate code 4321, call 15 minutes prior, bring appliance dolly."
              className="min-h-[96px] rounded-lg border border-white/10 bg-slate-900 px-4 py-3 text-white focus:border-sky-400 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-sky-400"
          >
            Schedule delivery
          </button>
        </form>
        {confirmation && (
          <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">{confirmation}</p>
        )}
      </section>
    </main>
  );
}
