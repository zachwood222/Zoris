import axios from 'axios';
import useSWR, { KeyedMutator } from 'swr';

import { apiBase } from './api';

export const authHeaders = {
  'X-User-Id': 'demo',
  'X-User-Roles': 'Purchasing'
};

export type TruckStatus =
  | 'scheduled'
  | 'arrived'
  | 'unloading'
  | 'completed'
  | 'cancelled';

export type TruckUpdateStatus = TruckStatus;

export type TruckUpdateType = 'status' | 'note' | 'line_progress';

export interface IncomingTruckLine {
  truck_line_id: number;
  po_line_id: number;
  item_id: number;
  description?: string | null;
  qty_expected?: number | null;
}

export interface TruckUpdate {
  update_id: number;
  truck_id: number;
  update_type: TruckUpdateType;
  message: string | null;
  status: TruckUpdateStatus | null;
  po_line_id: number | null;
  item_id: number | null;
  quantity: number | null;
  created_at: string;
  created_by: string | null;
}

export interface IncomingTruckLineProgress {
  po_line_id: number;
  item_id: number | null;
  total_quantity: number;
}

export interface IncomingTruckUpdates {
  latest_status: TruckStatus | null;
  note_count: number;
  line_progress: IncomingTruckLineProgress[];
  history: TruckUpdate[];
}

export interface IncomingTruck {
  truck_id: number;
  po_id: number;
  reference: string;
  carrier: string | null;
  status: TruckStatus;
  scheduled_arrival: string | null;
  arrived_at: string | null;
  created_at: string;
  lines: IncomingTruckLine[];
  updates: IncomingTruckUpdates;
}

export interface CreateTruckUpdatePayload {
  update_type: TruckUpdateType;
  message?: string;
  status?: TruckUpdateStatus;
  po_line_id?: number;
  item_id?: number;
  quantity?: number | null;
}

export interface TruckUpdateApiResponse {
  update?: Partial<TruckUpdate>;
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

const fetcher = async <T,>(url: string): Promise<T> => {
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
  } = useSWR<IncomingTruck[]>(trucksUrl, async (url) => fetcher<IncomingTruck[]>(url), {
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

function aggregateUpdatesFromHistory(history: TruckUpdate[]): IncomingTruckUpdates {
  const sortedHistory = [...history].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  let latestStatus: TruckStatus | null = null;
  let noteCount = 0;
  const lineTotals = new Map<number, IncomingTruckLineProgress>();

  for (const entry of sortedHistory) {
    if (entry.update_type === 'status' && entry.status) {
      latestStatus = entry.status;
    }
    if (entry.update_type === 'note') {
      noteCount += 1;
    }
    if (entry.update_type === 'line_progress' && entry.po_line_id !== null) {
      const quantity = typeof entry.quantity === 'number' ? entry.quantity : 0;
      const existing = lineTotals.get(entry.po_line_id);
      if (existing) {
        existing.total_quantity += quantity;
      } else {
        lineTotals.set(entry.po_line_id, {
          po_line_id: entry.po_line_id,
          item_id: entry.item_id ?? null,
          total_quantity: quantity
        });
      }
    }
  }

  const line_progress = Array.from(lineTotals.values()).sort(
    (a, b) => a.po_line_id - b.po_line_id
  );

  return {
    latest_status: latestStatus,
    note_count: noteCount,
    line_progress,
    history: sortedHistory
  };
}

function applyTruckUpdate(
  trucks: IncomingTruck[] | undefined,
  truckId: number,
  update: TruckUpdate,
  options?: {
    replaceUpdateId?: number | null;
  }
): IncomingTruck[] | undefined {
  if (!trucks) {
    return trucks;
  }

  return trucks.map((truck) => {
    if (truck.truck_id !== truckId) {
      return truck;
    }
    const existingHistory = truck.updates?.history ?? [];
    const filteredHistory =
      options?.replaceUpdateId != null
        ? existingHistory.filter((entry) => entry.update_id !== options.replaceUpdateId)
        : existingHistory;
    const mergedHistory = [...filteredHistory, update];
    return {
      ...truck,
      updates: aggregateUpdatesFromHistory(mergedHistory)
    };
  });
}

function normalizeTruckUpdate(
  raw: Partial<TruckUpdate>,
  fallback: {
    truckId: number;
    updateType: TruckUpdateType;
    status?: TruckUpdateStatus | null;
    poLineId?: number | null;
    itemId?: number | null;
    quantity?: number | null;
  }
): TruckUpdate {
  const rawCreatedAt = raw.created_at ? new Date(raw.created_at) : new Date();
  const createdAt = Number.isNaN(rawCreatedAt.getTime())
    ? new Date().toISOString()
    : rawCreatedAt.toISOString();
  const quantityValue =
    typeof raw.quantity === 'number'
      ? raw.quantity
      : raw.quantity != null
        ? Number(raw.quantity)
        : fallback.quantity ?? null;

  return {
    update_id: raw.update_id ?? Date.now(),
    truck_id: raw.truck_id ?? fallback.truckId,
    update_type: (raw.update_type as TruckUpdateType) ?? fallback.updateType,
    message: raw.message ?? null,
    status: (raw.status as TruckUpdateStatus | null | undefined) ?? fallback.status ?? null,
    po_line_id: raw.po_line_id ?? fallback.poLineId ?? null,
    item_id: raw.item_id ?? fallback.itemId ?? null,
    quantity: quantityValue ?? null,
    created_at: createdAt,
    created_by: raw.created_by ?? null
  };
}

export async function submitTruckUpdate(
  truckId: number,
  payload: CreateTruckUpdatePayload,
  context: {
    mutate: KeyedMutator<IncomingTruck[]>;
    current: IncomingTruck[] | undefined;
  }
): Promise<TruckUpdate> {
  const optimisticUpdate: TruckUpdate = {
    update_id: Date.now(),
    truck_id: truckId,
    update_type: payload.update_type,
    message: payload.message ?? null,
    status: payload.status ?? null,
    po_line_id: payload.po_line_id ?? null,
    item_id: payload.item_id ?? null,
    quantity: payload.quantity ?? null,
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
          ? normalizeTruckUpdate((data as TruckUpdateApiResponse).update ?? {}, {
              truckId,
              updateType: payload.update_type,
              status: payload.status ?? null,
              poLineId: payload.po_line_id ?? null,
              itemId: payload.item_id ?? null,
              quantity: payload.quantity ?? null
            })
          : normalizeTruckUpdate((data as TruckUpdate) ?? {}, {
              truckId,
              updateType: payload.update_type,
              status: payload.status ?? null,
              poLineId: payload.po_line_id ?? null,
              itemId: payload.item_id ?? null,
              quantity: payload.quantity ?? null
            });
      resolvedUpdate = normalized;
      return applyTruckUpdate(current ?? [], truckId, normalized, {
        replaceUpdateId: optimisticUpdate.update_id
      });
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
