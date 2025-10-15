import axios from 'axios';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { KeyedMutator } from 'swr';

import {
  type CreateTruckUpdatePayload,
  type IncomingTruck,
  type TruckUpdate,
  submitTruckUpdate
} from '../lib/incoming-trucks';

vi.mock('axios');

describe('submitTruckUpdate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('replaces optimistic history entry with the confirmed update', async () => {
    const initialHistory: TruckUpdate[] = [
      {
        update_id: 1,
        truck_id: 42,
        update_type: 'status',
        message: 'Driver checked in.',
        status: 'arrived',
        po_line_id: null,
        item_id: null,
        quantity: null,
        created_at: '2024-03-01T12:00:00Z',
        created_by: 'Ops Bot'
      }
    ];

    let state: IncomingTruck[] = [
      {
        truck_id: 42,
        po_id: 1001,
        reference: 'TRK-2042',
        carrier: 'Cascade Freight',
        status: 'scheduled',
        scheduled_arrival: '2024-03-01T14:00:00Z',
        arrived_at: null,
        created_at: '2024-02-28T10:00:00Z',
        lines: [
          {
            truck_line_id: 1,
            po_line_id: 501,
            item_id: 2001,
            description: 'Spruce Stud 2x4',
            qty_expected: 80
          }
        ],
        updates: {
          latest_status: 'arrived',
          note_count: 0,
          line_progress: [],
          history: initialHistory
        }
      }
    ];

    const mutate: KeyedMutator<IncomingTruck[]> = vi.fn(
      async (dataOrMutator, options): Promise<IncomingTruck[] | undefined> => {
        if (options?.optimisticData) {
          state = options.optimisticData as IncomingTruck[];
        }

        if (typeof dataOrMutator === 'function') {
          const result = await dataOrMutator(state);
          if (result) {
            state = result;
          }
          return state;
        }

        if (dataOrMutator) {
          const resolved = await dataOrMutator;
          state = resolved as IncomingTruck[];
          return state;
        }

        return state;
      }
    );

    const payload: CreateTruckUpdatePayload = {
      update_type: 'line_progress',
      message: 'Dock door 5 now unloading',
      po_line_id: 501,
      item_id: 2001,
      quantity: 20
    };

    const serverUpdate: TruckUpdate = {
      update_id: 2,
      truck_id: 42,
      update_type: 'line_progress',
      message: 'Dock door 5 now unloading',
      status: null,
      po_line_id: 501,
      item_id: 2001,
      quantity: 20,
      created_at: '2024-03-01T13:30:00.000Z',
      created_by: 'Ops Bot'
    };

    vi.mocked(axios.post).mockResolvedValue({ data: serverUpdate });

    const result = await submitTruckUpdate(42, payload, {
      current: state,
      mutate
    });

    expect(result).toEqual(serverUpdate);

    const history = state[0]?.updates.history ?? [];
    expect(history).toHaveLength(2);
    expect(history.filter((entry) => entry.message === serverUpdate.message)).toHaveLength(1);
    expect(history.some((entry) => entry.created_by === 'You')).toBe(false);
    expect(state[0]?.updates.line_progress[0]).toMatchObject({
      po_line_id: 501,
      total_quantity: 20
    });
    expect(state[0]?.updates.latest_status).toBe('arrived');
    expect(state[0]?.updates.note_count).toBe(0);
  });
});

