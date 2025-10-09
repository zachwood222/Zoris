import axios from 'axios';
import useSWR, { KeyedMutator } from 'swr';

import { apiBase } from './api';

export const authHeaders = {
  'X-User-Id': 'demo',
  'X-User-Roles': 'Purchasing'
};

export type TruckStatus =
  | 'en_route'
  | 'checked_in'
  | 'docked'
  | 'unloading'
  | 'complete'
  | 'issue';

export type TruckUpdateStatus =
  | 'en_route'
  | 'checked_in'
  | 'docked'
  | 'unloading'
  | 'complete'
  | 'issue';

export interface TruckUpdate {
  update_id: number;
  po_id: number;
  po_number: string;
  po_line_id: number;
  item_id: number;
  item_description: string;
  quantity: number | null;
  status: TruckUpdateStatus;
  note: string;
  created_at: string;
  created_by: string;
}

export interface IncomingTruck {
  truck_id: number;
  reference: string;
  carrier: string;
  status: TruckStatus;
  eta: string;
  door?: string | null;
  po_numbers?: string[];
  updates: TruckUpdate[];
}

export interface IncomingTruckApiResponse {
  trucks: IncomingTruck[];
}

export interface CreateTruckUpdatePayload {
  po_id: number;
  po_line_id: number;
  item_id: number;
  status: TruckUpdateStatus;
  quantity: number | null;
  note: string;
}

export interface TruckUpdateApiResponse {
  update?: Partial<TruckUpdate> & {
    po?: {
      po_id?: number;
      po_number?: string;
    };
    line?: {
      po_line_id?: number;
      item_id?: number;
      item_description?: string;
      description?: string;
      quantity?: number | null;
    };
  };
}

export interface PoLineSearchResult {
  po_id: number;
  po_number: string;
  po_line_id: number;
  item_id: number;
  item_description: string;
  vendor?: string;
  qty_ordered?: number;
  qty_remaining?: number;
}

export interface UsePoLineSearchResult {
  results: PoLineSearchResult[];
  isLoading: boolean;
  error: unknown;
  hasSearched: boolean;
}

export interface UseIncomingTrucksResult {
  trucks: IncomingTruck[];
  data: IncomingTruck[] | undefined;
  isLoading: boolean;
  isValidating: boolean;
  error: unknown;
  mutate: KeyedMutator<IncomingTruck[]>;
}

const fetcher = async <T>(url: string): Promise<T> => {
  const { data } = await axios.get<T>(url, { headers: authHeaders });
  return data;
};

const trucksUrl = `${apiBase}/incoming-trucks`;

export function useIncomingTrucks(): UseIncomingTrucksResult {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate
  } = useSWR<IncomingTruck[]>(trucksUrl, async (url) => {
    const payload = await fetcher<IncomingTruckApiResponse>(url);
    return payload.trucks;
  }, {
    refreshInterval: 30000,
    revalidateOnFocus: true
  });

  return {
    trucks: data ?? [],
    data,
    isLoading: Boolean(!data && !error && isLoading),
    isValidating,
    error,
    mutate
  };
}

export function usePoLineSearch(query: string): UsePoLineSearchResult {
  const trimmed = query.trim();
  const shouldFetch = trimmed.length >= 2;
  const {
    data,
    error,
    isLoading
  } = useSWR<PoLineSearchResult[]>(
    shouldFetch ? `${apiBase}/po/lines/search?q=${encodeURIComponent(trimmed)}` : null,
    async (url) => {
      const { data } = await axios.get(url, { headers: authHeaders });
      if (Array.isArray(data)) {
        return data as PoLineSearchResult[];
      }
      if (Array.isArray((data as { results?: PoLineSearchResult[] }).results)) {
        return ((data as { results?: PoLineSearchResult[] }).results ?? []) as PoLineSearchResult[];
      }
      return [] as PoLineSearchResult[];
    },
    {
      keepPreviousData: true,
      revalidateOnFocus: false
    }
  );

  return {
    results: shouldFetch ? data ?? [] : [],
    isLoading: shouldFetch && Boolean(isLoading && !data && !error),
    error,
    hasSearched: shouldFetch
  };
}

function applyTruckUpdate(trucks: IncomingTruck[] | undefined, truckId: number, update: TruckUpdate): IncomingTruck[] | undefined {
  if (!trucks) {
    return trucks;
  }
  return trucks.map((truck) => {
    if (truck.truck_id !== truckId) {
      return truck;
    }
    const existing = truck.updates ?? [];
    const merged = [update, ...existing];
    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const poNumbers = new Set(truck.po_numbers ?? []);
    if (update.po_number) {
      poNumbers.add(update.po_number);
    }
    return {
      ...truck,
      po_numbers: Array.from(poNumbers),
      updates: merged
    };
  });
}

function normalizeTruckUpdate(
  raw: Partial<TruckUpdate> & {
    po?: { po_id?: number; po_number?: string };
    line?: { po_line_id?: number; item_id?: number; item_description?: string; description?: string; quantity?: number | null };
  },
  fallback: {
    poId: number;
    poNumber: string;
    poLineId: number;
    itemId: number;
    itemDescription: string;
  }
): TruckUpdate {
  const po = raw.po ?? {};
  const line = raw.line ?? {};
  const quantity =
    raw.quantity ??
    line.quantity ??
    (typeof (raw as { qty?: number | null }).qty === 'number' ? (raw as { qty?: number | null }).qty : null);

  return {
    update_id: raw.update_id ?? Date.now(),
    po_id: raw.po_id ?? po.po_id ?? fallback.poId,
    po_number: raw.po_number ?? po.po_number ?? fallback.poNumber,
    po_line_id: raw.po_line_id ?? line.po_line_id ?? fallback.poLineId,
    item_id: raw.item_id ?? line.item_id ?? fallback.itemId,
    item_description:
      raw.item_description ??
      line.item_description ??
      line.description ??
      fallback.itemDescription,
    quantity: quantity ?? null,
    status: (raw.status as TruckUpdateStatus) ?? 'checked_in',
    note: raw.note ?? '',
    created_at: raw.created_at ?? new Date().toISOString(),
    created_by: raw.created_by ?? 'system'
  };
}

export async function submitTruckUpdate(
  truckId: number,
  payload: CreateTruckUpdatePayload,
  context: {
    mutate: KeyedMutator<IncomingTruck[]>;
    current: IncomingTruck[] | undefined;
    metadata: {
      poId: number;
      poNumber: string;
      poLineId: number;
      itemId: number;
      itemDescription: string;
    };
  }
): Promise<TruckUpdate> {
  const optimisticUpdate: TruckUpdate = {
    update_id: Date.now(),
    po_id: payload.po_id,
    po_number: context.metadata.poNumber,
    po_line_id: payload.po_line_id,
    item_id: payload.item_id,
    item_description: context.metadata.itemDescription,
    quantity: payload.quantity,
    status: payload.status,
    note: payload.note,
    created_at: new Date().toISOString(),
    created_by: 'You'
  };

  let resolvedUpdate: TruckUpdate = optimisticUpdate;

  await context.mutate(
    async (current) => {
      const { data } = await axios.post<TruckUpdate | TruckUpdateApiResponse>(
        `${trucksUrl}/${truckId}/updates`,
        payload,
        { headers: authHeaders }
      );
      const normalized =
        (data as TruckUpdateApiResponse)?.update
          ? normalizeTruckUpdate((data as TruckUpdateApiResponse).update ?? {}, context.metadata)
          : normalizeTruckUpdate((data as TruckUpdate) ?? {}, context.metadata);
      resolvedUpdate = normalized;
      return applyTruckUpdate(current ?? [], truckId, normalized);
    },
    {
      optimisticData: applyTruckUpdate(context.current ?? [], truckId, optimisticUpdate),
      rollbackOnError: true,
      populateCache: true,
      revalidate: false
    }
  );

  return resolvedUpdate;
}
