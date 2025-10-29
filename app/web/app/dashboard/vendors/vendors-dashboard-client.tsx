'use client';

import { useEffect, useMemo, useState } from 'react';

import { buildAuthHeaders, getApiBase } from '../../../lib/api';

interface VendorSummary {
  vendor_id: number;
  name: string;
  email: string | null;
  phone: string | null;
  terms: string | null;
  city: string | null;
  state: string | null;
  active: boolean;
}

export default function VendorsDashboardClient() {
  const api = useMemo(() => getApiBase(), []);
  const [vendors, setVendors] = useState<VendorSummary[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const headers = await buildAuthHeaders({ Accept: 'application/json' });
        const url = new URL(`${api}/vendors`);
        const response = await fetch(url.toString(), { signal: controller.signal, headers });
        if (!response.ok) {
          throw new Error('Failed to load vendors');
        }
        const data = (await response.json()) as VendorSummary[];
        if (!controller.signal.aborted) {
          setVendors(data);
        }
      } catch (loadError) {
        if (controller.signal.aborted) {
          return;
        }
        console.error(loadError);
        setError('Unable to load vendors.');
        setVendors([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    load();
    return () => controller.abort();
  }, [api]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return vendors;
    }
    return vendors.filter((vendor) => {
      const haystack = [
        vendor.name,
        vendor.email ?? '',
        vendor.phone ?? '',
        vendor.terms ?? '',
        vendor.city ?? '',
        vendor.state ?? ''
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [vendors, query]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-xl shadow-slate-950/30 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1">
          <label className="block text-sm text-slate-300">
            <span className="mb-2 block font-semibold text-white">Search vendors</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by name, contact, or location"
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white focus:border-sky-400 focus:outline-none"
            />
          </label>
        </div>
        <div className="text-xs text-slate-400">
          Showing {filtered.length.toLocaleString()} vendor{filtered.length === 1 ? '' : 's'}
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80 shadow-xl shadow-slate-950/30">
        <table className="min-w-full divide-y divide-white/10 text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-[0.3em] text-slate-400">
            <tr>
              <th scope="col" className="px-6 py-3 font-semibold">Vendor</th>
              <th scope="col" className="px-6 py-3 font-semibold">Contact</th>
              <th scope="col" className="px-6 py-3 font-semibold">Terms</th>
              <th scope="col" className="px-6 py-3 font-semibold">Location</th>
              <th scope="col" className="px-6 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-400">
                  Loading vendors…
                </td>
              </tr>
            )}
            {error && !isLoading && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-rose-200">
                  {error}
                </td>
              </tr>
            )}
            {!error && !isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-400">
                  No vendors match your filters.
                </td>
              </tr>
            )}
            {!error &&
              filtered.map((vendor) => (
                <tr key={vendor.vendor_id} className="hover:bg-slate-900/60">
                  <td className="px-6 py-4 text-sm text-white">{vendor.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-300">
                    <div className="space-y-1">
                      {vendor.email && <p>{vendor.email}</p>}
                      {vendor.phone && <p>{vendor.phone}</p>}
                      {!vendor.email && !vendor.phone && <p className="text-xs text-slate-500">No contact details</p>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">{vendor.terms ?? '—'}</td>
                  <td className="px-6 py-4 text-sm text-slate-300">
                    {vendor.city || vendor.state ? `${vendor.city ?? ''}${vendor.city && vendor.state ? ', ' : ''}${vendor.state ?? ''}` : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] ${
                        vendor.active
                          ? 'border border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                          : 'border border-amber-400/30 bg-amber-500/10 text-amber-200'
                      }`}
                    >
                      {vendor.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
