import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../lib/incoming-trucks', async () => {
  const actual = await vi.importActual<typeof import('../lib/incoming-trucks')>('../lib/incoming-trucks');
  return {
    ...actual,
    useIncomingTrucks: vi.fn(),
    usePoLineSearch: vi.fn(),
    submitTruckUpdate: vi.fn()
  };
});

import IncomingTrucksPage from '../app/incoming-trucks/page';
import {
  type IncomingTruck,
  type PoLineSearchResult,
  type TruckUpdate,
  submitTruckUpdate,
  useIncomingTrucks,
  usePoLineSearch
} from '../lib/incoming-trucks';

const mockedUseIncomingTrucks = vi.mocked(useIncomingTrucks);
const mockedUsePoLineSearch = vi.mocked(usePoLineSearch);
const mockedSubmitTruckUpdate = vi.mocked(submitTruckUpdate);

const baseUpdate: TruckUpdate = {
  update_id: 9001,
  po_id: 1001,
  po_number: 'PO-1001',
  po_line_id: 501,
  item_id: 2001,
  item_description: 'Spruce Stud 2x4',
  quantity: 40,
  status: 'checked_in',
  note: 'Driver checked in at guard shack.',
  created_at: '2024-03-01T13:00:00Z',
  created_by: 'Ops Bot'
};

const incomingTruck: IncomingTruck = {
  truck_id: 42,
  reference: 'TRK-2042',
  carrier: 'Cascade Freight',
  status: 'docked',
  eta: '2024-03-01T14:00:00Z',
  door: 'Door 4',
  po_numbers: ['PO-1001'],
  updates: [baseUpdate]
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
      ...baseUpdate,
      update_id: 9002,
      status: 'unloading',
      note: 'Unloading pallets now.',
      quantity: 20
    });
  });

  test('renders truck cards with linked updates', () => {
    render(<IncomingTrucksPage />);

    expect(screen.getByRole('heading', { name: /incoming trucks/i })).toBeInTheDocument();
    expect(screen.getByText(/TRK-2042/)).toBeInTheDocument();
    expect(screen.getByText(/Cascade Freight/)).toBeInTheDocument();
    expect(screen.getByText(/PO PO-1001/i)).toBeInTheDocument();
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

    await user.selectOptions(within(dialog).getByRole('combobox', { name: /status/i }), 'unloading');
    await user.type(within(dialog).getByLabelText(/quantity/i), '18');
    await user.type(within(dialog).getByLabelText(/notes/i), 'Dock door 5 now unloading');

    await user.click(within(dialog).getByRole('button', { name: /log update/i }));

    await waitFor(() => {
      expect(mockedSubmitTruckUpdate).toHaveBeenCalled();
    });

    const [truckId, payload, context] = mockedSubmitTruckUpdate.mock.calls.at(-1)!;
    expect(truckId).toBe(incomingTruck.truck_id);
    expect(payload).toMatchObject({
      po_id: searchResult.po_id,
      po_line_id: searchResult.po_line_id,
      item_id: searchResult.item_id,
      status: 'unloading',
      quantity: 18,
      note: 'Dock door 5 now unloading'
    });
    expect(context.metadata).toMatchObject({
      poId: searchResult.po_id,
      poNumber: searchResult.po_number,
      poLineId: searchResult.po_line_id,
      itemId: searchResult.item_id
    });

    await waitFor(() => {
      expect(screen.getByText(/Update logged for PO-1001/i)).toBeInTheDocument();
    });
  });
});
