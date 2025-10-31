import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../lib/incoming-trucks', async () => {
  const actual = await vi.importActual<typeof import('../../lib/incoming-trucks')>('../../lib/incoming-trucks');
  return {
    ...actual,
    useIncomingTrucks: vi.fn(),
    usePoLineSearch: vi.fn(),
    submitTruckUpdate: vi.fn()
  };
});

import IncomingTrucksPage from '../../app/incoming-trucks/page';
import {
  type IncomingTruck,
  type PoLineSearchResult,
  type TruckUpdate,
  submitTruckUpdate,
  useIncomingTrucks,
  usePoLineSearch
} from '../../lib/incoming-trucks';

const mockedUseIncomingTrucks = vi.mocked(useIncomingTrucks);
const mockedUsePoLineSearch = vi.mocked(usePoLineSearch);
const mockedSubmitTruckUpdate = vi.mocked(submitTruckUpdate);

const baseUpdate: TruckUpdate = {
  update_id: 9001,
  truck_id: 42,
  update_type: 'status',
  message: 'Driver checked in at guard shack.',
  status: 'arrived',
  po_line_id: 501,
  item_id: 2001,
  quantity: null,
  created_at: '2024-03-01T13:00:00Z',
  created_by: 'Ops Bot'
};

const incomingTruck: IncomingTruck = {
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
    history: [baseUpdate]
  }
};

const searchResult: PoLineSearchResult = {
  po_id: 1001,
  po_number: 'PO-1001',
  po_line_id: 501,
  item_id: 2001,
  item_description: 'Spruce Stud 2x4',
  vendor: 'Summit Lumber',
  qty_ordered: 80,
  qty_remaining: 40
};

describe('incoming trucks workspace component', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  beforeEach(() => {
    mockedUseIncomingTrucks.mockReturnValue({
      trucks: [incomingTruck],
      data: [incomingTruck],
      isLoading: false,
      isValidating: false,
      error: null,
      mutate: vi.fn()
    });
    mockedUsePoLineSearch.mockImplementation((query: string) => ({
      results: query.toLowerCase().includes('spruce') ? [searchResult] : [],
      isLoading: false,
      error: null,
      hasSearched: query.trim().length >= 2
    }));
    mockedSubmitTruckUpdate.mockResolvedValue({
      update_id: 9002,
      truck_id: 42,
      update_type: 'line_progress',
      message: 'Unloading pallets now.',
      status: null,
      po_line_id: 501,
      item_id: 2001,
      quantity: 20,
      created_at: '2024-03-01T13:30:00Z',
      created_by: 'Ops Bot'
    });
  });

  test('renders truck cards with linked updates', () => {
    render(<IncomingTrucksPage />);

    expect(screen.getByRole('heading', { name: /incoming trucks/i })).toBeInTheDocument();
    expect(screen.getByText(/TRK-2042/)).toBeInTheDocument();
    expect(screen.getByText(/Cascade Freight/)).toBeInTheDocument();
    expect(screen.getByText(/#1001/)).toBeInTheDocument();
    expect(screen.getByText(/Driver checked in at guard shack/i)).toBeInTheDocument();
  });

  test('submits a new update linked to a PO line', async () => {
    const user = userEvent.setup();
    render(<IncomingTrucksPage />);

    await user.click(screen.getByRole('button', { name: /add update/i }));

    const dialog = screen.getByRole('dialog');
    const searchInput = within(dialog).getByPlaceholderText(/search po or item/i);
    await user.type(searchInput, 'Spruce');

    const option = await within(dialog).findByRole('option', { name: /PO-1001/ });
    await user.click(option);

    await user.selectOptions(within(dialog).getByRole('combobox', { name: /update type/i }), 'line_progress');
    await user.type(within(dialog).getByLabelText(/quantity/i), '18');
    await user.type(within(dialog).getByLabelText(/notes/i), 'Dock door 5 now unloading');

    await user.click(within(dialog).getByRole('button', { name: /log update/i }));

    await waitFor(() => {
      expect(mockedSubmitTruckUpdate).toHaveBeenCalled();
    });

    const [truckId, payload, context] = mockedSubmitTruckUpdate.mock.calls.at(-1)!;
    expect(truckId).toBe(incomingTruck.truck_id);
    expect(payload).toMatchObject({
      po_line_id: searchResult.po_line_id,
      item_id: searchResult.item_id,
      update_type: 'line_progress',
      quantity: 18,
      message: 'Dock door 5 now unloading'
    });
    expect(context).toHaveProperty('current');
    expect(context).toHaveProperty('mutate');

    await waitFor(() => {
      expect(screen.getByText(/Update logged successfully/i)).toBeInTheDocument();
    });
  });
});
