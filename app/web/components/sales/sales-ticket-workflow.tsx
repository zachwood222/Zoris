'use client';

import Link from 'next/link';
import axios from 'axios';
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';

import { getApiBase, buildAuthHeaders } from '../../lib/api';
import {
  consumeQueuedKioskCartItems,
  KIOSK_CART_QUEUE_KEY
} from '../../lib/kiosk-cart';

interface ItemSummary {
  item_id: number;
  sku: string;
  description: string;
  price: number;
  short_code: string;
}

interface ItemLocationInfo {
  location_id: number;
  location_name: string;
  qty_on_hand: number;
  qty_reserved: number;
}

interface IncomingPurchaseInfo {
  po_id: number;
  status: string;
  expected_date: string | null;
  vendor_name: string | null;
  qty_ordered: number;
  qty_received: number;
  qty_remaining: number;
}

interface ItemDetail {
  item: ItemSummary;
  total_on_hand: number;
  locations: ItemLocationInfo[];
  incoming: IncomingPurchaseInfo[];
}

interface SaleLineSummary {
  sale_line_id: number;
  item_id: number;
  sku: string;
  description: string;
  qty: number;
  unit_price: number;
  location_id: number;
  short_code: string | null;
}

interface SaleCustomerSummary {
  customer_id: number;
  name: string;
  phone: string | null;
  email: string | null;
}

interface AttachmentSummary {
  attachment_id: number;
  file_url: string;
  kind: string;
  created_at: string;
}

export interface SaleDetail {
  sale_id: number;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  ocr_confidence: number;
  ocr_fields: Record<string, unknown>;
  attachments: AttachmentSummary[];
  customer: SaleCustomerSummary | null;
  payment_method: string | null;
  fulfillment_type: string | null;
  delivery_fee: number;
  lines: SaleLineSummary[];
}

interface SaleLineDraft {
  item: ItemSummary;
  qty: number;
}

interface CustomerSummary {
  customer_id: number;
  name: string;
  email: string | null;
  phone: string | null;
}

type PaymentMethod =
  | 'cash'
  | 'check'
  | 'credit_card'
  | 'syncrony'
  | 'wells_fargo'
  | 'giftcard'
  | 'credit_on_file';

type FulfillmentType = 'pickup' | 'delivery';

type StatusMessage = {
  kind: 'success' | 'error';
  message: string;
};

export type SalesTicketWorkflowMode = 'create' | 'edit';

export type SalesTicketWorkflowProps = {
  mode: SalesTicketWorkflowMode;
  saleId?: number;
  initialSale?: SaleDetail | null;
  onSaleUpdated?: (detail: SaleDetail) => void;
};

export default function SalesTicketWorkflow({
  mode,
  saleId,
  initialSale,
  onSaleUpdated
}: SalesTicketWorkflowProps) {
  const api = useMemo(() => getApiBase(), []);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ItemSummary[]>([]);
  const [lines, setLines] = useState<SaleLineDraft[]>([]);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemSummary | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ItemDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>('pickup');
  const [deliveryFee, setDeliveryFee] = useState(120);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<CustomerSummary[]>([]);
  const [isCustomerLoading, setIsCustomerLoading] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null);

  const title = mode === 'edit' ? 'Manage sale ticket' : 'Sales Kiosk';
  const subtitle =
    mode === 'edit'
      ? 'Review and adjust an existing order with the same tools used to create tickets.'
      : 'Scan or search items to build a ticket.';
  const finalizeLabel = mode === 'edit' ? 'Save sale changes' : 'Finalize ticket';

  const paymentMethodOptions = useMemo(
    () => [
      { value: 'cash', label: 'Cash' },
      { value: 'check', label: 'Check' },
      { value: 'credit_card', label: 'CC (Mastercard, Visa, American Express)' },
      { value: 'syncrony', label: 'Syncrony' },
      { value: 'wells_fargo', label: 'Wells Fargo' },
      { value: 'giftcard', label: 'Gift card' },
      { value: 'credit_on_file', label: 'Credit on file' }
    ],
    []
  );

  const fulfillmentOptions = useMemo(
    () => [
      { value: 'pickup', label: 'Customer pickup' },
      { value: 'delivery', label: 'Delivery' }
    ],
    []
  );

  const normalizePaymentMethod = useCallback(
    (value: string | null | undefined): PaymentMethod => {
      const fallback: PaymentMethod = 'cash';
      if (!value) {
        return fallback;
      }
      const match = paymentMethodOptions.find((option) => option.value === value);
      return match ? (match.value as PaymentMethod) : fallback;
    },
    [paymentMethodOptions]
  );

  const normalizeFulfillment = useCallback((value: string | null | undefined): FulfillmentType => {
    return value === 'delivery' ? 'delivery' : 'pickup';
  }, []);

  const applySaleDetail = useCallback(
    (detail: SaleDetail) => {
      setLines(
        detail.lines.map((line) => ({
          item: {
            item_id: line.item_id,
            sku: line.sku,
            description: line.description,
            price: line.unit_price,
            short_code: line.short_code ?? ''
          },
          qty: line.qty
        }))
      );

      if (detail.customer) {
        const summary: CustomerSummary = {
          customer_id: detail.customer.customer_id,
          name: detail.customer.name,
          email: detail.customer.email,
          phone: detail.customer.phone
        };
        setSelectedCustomerId(detail.customer.customer_id);
        setSelectedCustomer(summary);
        setCustomerSearch('');
        setCustomerResults((current) => {
          const exists = current.some((customer) => customer.customer_id === summary.customer_id);
          return exists ? current : [...current, summary];
        });
      } else {
        setSelectedCustomerId(null);
        setSelectedCustomer(null);
        setCustomerSearch('');
      }

      const normalizedPayment = normalizePaymentMethod(detail.payment_method);
      setPaymentMethod(normalizedPayment);

      const normalizedFulfillment = normalizeFulfillment(detail.fulfillment_type);
      setFulfillmentType(normalizedFulfillment);

      setDeliveryFee(detail.delivery_fee ?? 0);
    },
    [normalizeFulfillment, normalizePaymentMethod]
  );

  useEffect(() => {
    if (mode === 'edit' && initialSale) {
      applySaleDetail(initialSale);
    }
  }, [mode, initialSale, applySaleDetail]);

  useEffect(() => {
    if (!query) {
      setResults([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    const controller = new AbortController();
    setIsSearching(true);
    setSearchError(null);

    const handler = setTimeout(async () => {
      try {
        const headers = await buildAuthHeaders();
        const response = await axios.get<ItemSummary[]>(`${api}/items/search`, {
          params: { q: query },
          signal: controller.signal,
          headers
        });
        setResults(response.data);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error(error);
        setSearchError('Unable to load matching items right now.');
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 200);

    return () => {
      controller.abort();
      clearTimeout(handler);
    };
  }, [query]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let cancelled = false;
    let controller: AbortController | null = null;

    const addItemToCart = (item: ItemSummary) => {
      setLines((current) => {
        const existing = current.find((line) => line.item.item_id === item.item_id);
        if (existing) {
          return current.map((line) =>
            line.item.item_id === item.item_id ? { ...line, qty: line.qty + 1 } : line
          );
        }
        return [...current, { item, qty: 1 }];
      });
    };

    const processQueuedItems = async () => {
      if (cancelled) {
        return;
      }

      const queued = consumeQueuedKioskCartItems();
      if (queued.length === 0) {
        return;
      }

      controller?.abort();
      controller = new AbortController();

      let headers: Record<string, string>;
      try {
        headers = await buildAuthHeaders();
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setStatus({
            kind: 'error',
            message: 'Unable to authenticate while adding catalog items to the cart.'
          });
        }
        return;
      }

      const added: string[] = [];
      let hadError = false;

      for (const itemId of queued) {
        try {
          const { data } = await axios.get<ItemDetail>(`${api}/items/${itemId}`, {
            signal: controller.signal,
            headers
          });
          if (cancelled) {
            return;
          }
          addItemToCart(data.item);
          added.push(data.item.description);
        } catch (error) {
          if (controller?.signal.aborted) {
            return;
          }
          hadError = true;
          console.error(error);
        }
      }

      if (cancelled) {
        return;
      }

      if (added.length > 0) {
        setStatus({
          kind: hadError ? 'error' : 'success',
          message:
            added.length === 1
              ? `${added[0]} added to the cart from the catalog queue.`
              : `Added ${added.length} catalog items to the cart. ${hadError ? 'Some items could not be added.' : ''}`
        });
      } else if (hadError) {
        setStatus({
          kind: 'error',
          message: 'Unable to add queued catalog items to the cart.'
        });
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === KIOSK_CART_QUEUE_KEY) {
        void processQueuedItems();
      }
    };

    void processQueuedItems();
    window.addEventListener('storage', handleStorage);

    return () => {
      cancelled = true;
      controller?.abort();
      window.removeEventListener('storage', handleStorage);
    };
  }, [api]);

  const closeDetail = useCallback(() => {
    setSelectedItem(null);
    setSelectedDetail(null);
    setIsDetailLoading(false);
    setDetailError(null);
  }, []);

  useEffect(() => {
    if (!selectedItem) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const loadDetail = async () => {
      setIsDetailLoading(true);
      setDetailError(null);
      setSelectedDetail(null);

      try {
        const headers = await buildAuthHeaders();
        const response = await axios.get<ItemDetail>(`${api}/items/${selectedItem.item_id}`, {
          signal: controller.signal,
          headers
        });
        if (!cancelled) {
          setSelectedDetail(response.data);
        }
      } catch (error) {
        if (axios.isCancel(error)) {
          return;
        }
        console.error(error);
        if (!cancelled) {
          setDetailError('Unable to load item details.');
        }
      } finally {
        if (!cancelled) {
          setIsDetailLoading(false);
        }
      }
    };

    loadDetail();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [selectedItem]);

  useEffect(() => {
    if (!selectedItem) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDetail();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem, closeDetail]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const loadCustomers = async () => {
      setIsCustomerLoading(true);
      setCustomerError(null);

      try {
        const headers = await buildAuthHeaders();
        const params = customerSearch.trim() ? { q: customerSearch.trim() } : undefined;
        const { data } = await axios.get<CustomerSummary[]>(`${api}/customers/search`, {
          params,
          signal: controller.signal,
          headers
        });
        if (!cancelled) {
          setCustomerResults(data);
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error(error);
        if (!cancelled) {
          setCustomerError('Unable to load customers right now.');
        }
      } finally {
        if (!cancelled) {
          setIsCustomerLoading(false);
        }
      }
    };

    const handler = setTimeout(() => {
      void loadCustomers();
    }, 200);

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(handler);
    };
  }, [api, customerSearch]);

  const subtotal = useMemo(
    () =>
      lines.reduce((sum, line) => {
        return sum + line.qty * line.item.price;
      }, 0),
    [lines]
  );

  const cardFeeRate = 0.035;
  const federalTaxRate = 0.07;
  const localTaxRate = 0.01;
  const isCreditCard = paymentMethod === 'credit_card';
  const isDelivery = fulfillmentType === 'delivery';

  const cardFee = useMemo(() => (isCreditCard ? subtotal * cardFeeRate : 0), [isCreditCard, subtotal]);
  const appliedDeliveryFee = useMemo(
    () => (isDelivery ? Math.max(0, deliveryFee) : 0),
    [deliveryFee, isDelivery]
  );
  const taxBase = useMemo(
    () => subtotal + cardFee + appliedDeliveryFee,
    [appliedDeliveryFee, cardFee, subtotal]
  );
  const federalTax = useMemo(() => taxBase * federalTaxRate, [taxBase]);
  const localTax = useMemo(() => taxBase * localTaxRate, [taxBase]);
  const tax = useMemo(() => federalTax + localTax, [federalTax, localTax]);
  const totalDue = useMemo(
    () => subtotal + cardFee + appliedDeliveryFee + tax,
    [appliedDeliveryFee, cardFee, subtotal, tax]
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

  const adjustQuantity = (itemId: number, delta: number) => {
    setLines((current) =>
      current
        .map((line) =>
          line.item.item_id === itemId ? { ...line, qty: Math.max(0, line.qty + delta) } : line
        )
        .filter((line) => line.qty > 0)
    );
  };

  const removeLine = (itemId: number) => {
    setLines((current) => current.filter((line) => line.item.item_id !== itemId));
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  const openItemDetail = (item: ItemSummary) => {
    setSelectedItem(item);
  };

  useEffect(() => {
    if (selectedCustomerId === null) {
      setSelectedCustomer(null);
      return;
    }
    const match = customerResults.find((customer) => customer.customer_id === selectedCustomerId);
    if (match) {
      setSelectedCustomer(match);
    }
  }, [customerResults, selectedCustomerId]);

  const handleCustomerChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target;
    if (!value) {
      setSelectedCustomerId(null);
      setSelectedCustomer(null);
      return;
    }

    const id = Number.parseInt(value, 10);
    if (Number.isNaN(id)) {
      setSelectedCustomerId(null);
      setSelectedCustomer(null);
      return;
    }

    setSelectedCustomerId(id);
    const match = customerResults.find((customer) => customer.customer_id === id);
    if (match) {
      setSelectedCustomer(match);
    } else {
      setSelectedCustomer((current) => (current && current.customer_id === id ? current : null));
    }
  };

  const handleAddToTicket = () => {
    if (!selectedItem) {
      return;
    }
    addLine(selectedItem);
    closeDetail();
  };

  const formatExpectedDate = (value: string | null) => {
    if (!value) {
      return 'TBD';
    }
    return new Date(value).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const finalize = async () => {
    setIsFinalizing(true);
    setStatus(null);
    if (mode === 'edit') {
      if (!saleId) {
        setStatus({
          kind: 'error',
          message: 'Sale is still loading. Try again shortly.'
        });
        setIsFinalizing(false);
        return;
      }

      try {
        const headers = await buildAuthHeaders();
        const { data } = await axios.put<SaleDetail>(
          `${api}/sales/${saleId}`,
          {
            customer_id: selectedCustomerId,
            payment_method: paymentMethod,
            fulfillment_type: fulfillmentType,
            delivery_fee: appliedDeliveryFee,
            lines: lines.map((line) => ({
              sku: line.item.sku,
              qty: line.qty,
              location_id: 1
            }))
          },
          { headers }
        );

        applySaleDetail(data);
        onSaleUpdated?.(data);

        const updatedCustomerName = data.customer?.name ?? selectedCustomer?.name ?? null;
        setStatus({
          kind: 'success',
          message: `Sale #${data.sale_id} updated successfully${
            updatedCustomerName ? ` for ${updatedCustomerName}` : ''
          }.`
        });
      } catch (error) {
        console.error(error);
        setStatus({
          kind: 'error',
          message: 'We were unable to update that sale. Try again shortly.'
        });
      } finally {
        setIsFinalizing(false);
      }
      return;
    }

    const finalizedCustomerName = selectedCustomer?.name ?? null;

    try {
      const headers = await buildAuthHeaders();
      const payload: Record<string, unknown> = {
        created_by: 'kiosk',
        source: 'kiosk'
      };
      if (selectedCustomerId !== null) {
        payload.customer_id = selectedCustomerId;
      }
      const { data: create } = await axios.post<{ sale_id: number }>(`${api}/sales`, payload, {
        headers
      });
      const newSaleId = create.sale_id;

      for (const line of lines) {
        await axios.post(
          `${api}/sales/${newSaleId}/add-line`,
          {
            sku: line.item.sku,
            qty: line.qty,
            location_id: 1
          },
          { headers }
        );
      }

      const { data: finalizeData } = await axios.post<{ sale_id: number }>(
        `${api}/sales/${newSaleId}/finalize`,
        undefined,
        { headers }
      );

      setStatus({
        kind: 'success',
        message: `Sale #${finalizeData.sale_id} finalized successfully${
          finalizedCustomerName ? ` for ${finalizedCustomerName}` : ''
        }.`
      });
      setLines([]);
      setSelectedCustomerId(null);
      setSelectedCustomer(null);
      setCustomerSearch('');
    } catch (error) {
      console.error(error);
      setStatus({
        kind: 'error',
        message: 'We were unable to finalize that sale. Try again shortly.'
      });
    } finally {
      setIsFinalizing(false);
    }
  };

  const formatErrorMessage = (error: unknown): string => {
    const defaultMessage = 'We were unable to process that ticket image. Try again shortly.';

    if (axios.isAxiosError(error)) {
      const detail = error.response?.data?.detail;
      if (typeof detail === 'string' && detail.trim().length > 0) {
        const normalized = detail
          .replace(/_/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (normalized) {
          return normalized.charAt(0).toUpperCase() + normalized.slice(1);
        }
      }

      if (Array.isArray(detail) && detail.length > 0) {
        const firstDetail = detail[0];
        if (typeof firstDetail?.msg === 'string' && firstDetail.msg.trim().length > 0) {
          return firstDetail.msg.trim();
        }
      }
    }

    return defaultMessage;
  };

  const uploadPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    if (!input.files?.length) return;

    const file = input.files[0];
    const form = new FormData();
    form.append('image', file);

    setIsUploading(true);
    setStatus(null);

    try {
      const headers = await buildAuthHeaders({ 'Content-Type': 'multipart/form-data' });
      const { data } = await axios.post<{ sale_id: number }>(`${api}/ocr/sale-ticket`, form, {
        headers
      });
      setStatus({
        kind: 'success',
        message: `Draft ticket #${data.sale_id} created for review.`
      });
    } catch (error) {
      console.error(error);
      setStatus({
        kind: 'error',
        message: formatErrorMessage(error)
      });
    } finally {
      setIsUploading(false);
      input.value = '';
    }
  };

  return (
    <main className="flex min-h-screen flex-col gap-6 bg-slate-900 p-6 text-white">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-sm text-slate-300">{subtitle}</p>
        </div>
        <label
          className={`rounded px-4 py-2 font-semibold shadow transition ${
            isUploading
              ? 'cursor-not-allowed bg-emerald-700/60 text-emerald-200'
              : 'cursor-pointer bg-emerald-600 hover:bg-emerald-500'
          }`}
        >
          {isUploading ? 'Uploading…' : mode === 'edit' ? 'Upload updated ticket' : 'Upload Ticket'}
          <input
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={uploadPhoto}
            disabled={isUploading}
          />
        </label>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="flex flex-col gap-5 rounded-3xl border border-slate-700/60 bg-slate-900/60 p-6 shadow-[0_40px_80px_-40px_rgba(15,118,110,0.35)] backdrop-blur">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
              Catalog search
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-white">Find items to add</h2>
          </div>
          <div className="relative">
            <input
              autoFocus
              placeholder="Scan barcode, type SKU, description, or short code"
              className="h-14 w-full rounded-2xl border border-slate-700/70 bg-slate-950/60 pl-5 pr-14 text-base text-white shadow-inner shadow-black/20 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && results[0]) {
                  addLine(results[0]);
                }
              }}
            />
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-5 text-sm text-slate-500">
              {isSearching
                ? 'Searching…'
                : `${results.length} match${results.length === 1 ? '' : 'es'}`}
            </div>
          </div>
          {searchError && <p className="text-sm text-rose-200/80">{searchError}</p>}

          <div className="flex-1 overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/40">
            <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3 border-b border-slate-800/60 px-5 py-3 text-xs uppercase tracking-[0.3em] text-slate-500">
              <span>Item</span>
              <span className="text-right">Price</span>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {results.length === 0 && !isSearching ? (
                <div className="flex h-32 flex-col items-center justify-center gap-2 text-sm text-slate-500">
                  <span>No results yet.</span>
                  <span>Scan a barcode or start typing to see matches.</span>
                </div>
              ) : (
                <ul className="divide-y divide-slate-800/60">
                  {results.map((item) => (
                    <li key={item.item_id}>
                      <button
                        type="button"
                        onClick={() => openItemDetail(item)}
                        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-800/60"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold tracking-wide text-slate-100">
                            {item.sku}
                          </div>
                          <div className="mt-1 truncate text-xs text-slate-400">{item.description}</div>
                          {item.short_code && (
                            <div className="mt-1 text-[0.65rem] uppercase tracking-[0.4em] text-emerald-400/70">
                              {item.short_code}
                            </div>
                          )}
                        </div>
                        <div className="text-right text-base font-semibold text-emerald-300">
                          {formatCurrency(item.price)}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <aside className="flex h-full flex-col gap-5 rounded-3xl border border-slate-700/60 bg-slate-900/60 p-6 shadow-[0_40px_80px_-40px_rgba(15,118,110,0.35)] backdrop-blur">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Ticket</div>
            <h2 className="mt-2 text-2xl font-semibold text-white">Live sale summary</h2>
          </div>

          <div className="flex-1 space-y-4">
            {lines.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-700/70 bg-slate-950/40 text-sm text-slate-500">
                <span>No items added yet.</span>
                <span>Search above to start building the ticket.</span>
              </div>
            ) : (
              <ul className="space-y-3">
                {lines.map((line) => (
                  <li
                    key={line.item.item_id}
                    className="rounded-2xl border border-slate-800/80 bg-slate-950/40 px-4 py-3 text-sm text-slate-200"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold uppercase tracking-[0.4em] text-emerald-400/70">
                          {line.item.sku}
                        </div>
                        <div className="mt-1 text-sm text-slate-200">{line.item.description}</div>
                      </div>
                      <button
                        type="button"
                        className="text-xs uppercase tracking-[0.4em] text-slate-500 transition hover:text-rose-300"
                        onClick={() => removeLine(line.item.item_id)}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700/80 text-lg leading-none text-slate-200 transition hover:border-emerald-400 hover:text-emerald-300"
                          onClick={() => adjustQuantity(line.item.item_id, -1)}
                          aria-label={`Decrease quantity for ${line.item.sku}`}
                        >
                          −
                        </button>
                        <span className="w-10 text-center text-base font-semibold text-white">{line.qty}</span>
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700/80 text-lg leading-none text-slate-200 transition hover:border-emerald-400 hover:text-emerald-300"
                          onClick={() => adjustQuantity(line.item.item_id, 1)}
                          aria-label={`Increase quantity for ${line.item.sku}`}
                        >
                          +
                        </button>
                      </div>
                      <div className="text-right text-base font-semibold text-emerald-300">
                        {formatCurrency(line.qty * line.item.price)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-800/80 bg-slate-950/40 p-5 text-sm text-slate-300">
            <div className="space-y-4">
              <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Customer search
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(event) => setCustomerSearch(event.target.value)}
                  placeholder="Search by name, email, or phone"
                  className="mt-2 w-full rounded-xl border border-slate-700/80 bg-slate-900/80 px-4 py-2 text-sm text-white shadow-inner shadow-black/20 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
                  autoComplete="off"
                />
              </label>

              <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Customer
                <select
                  className="mt-2 w-full rounded-xl border border-slate-700/80 bg-slate-900/80 px-4 py-2 text-sm text-white shadow-inner shadow-black/20 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
                  value={selectedCustomerId !== null ? String(selectedCustomerId) : ''}
                  onChange={handleCustomerChange}
                >
                  <option value="" className="bg-slate-900 text-white">
                    Walk-in customer
                  </option>
                  {customerResults.map((customer) => (
                    <option
                      key={customer.customer_id}
                      value={customer.customer_id}
                      className="bg-slate-900 text-white"
                    >
                      {`${customer.name}${
                        customer.email ? ` • ${customer.email}` : customer.phone ? ` • ${customer.phone}` : ''
                      }`}
                    </option>
                  ))}
                </select>
              </label>

              {isCustomerLoading && (
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Loading customers…</p>
              )}
              {customerError && (
                <p className="text-xs text-rose-300">{customerError}</p>
              )}
              {selectedCustomer && (
                <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 px-4 py-3 text-xs text-slate-300">
                  <p className="text-sm font-semibold text-white">{selectedCustomer.name}</p>
                  {selectedCustomer.email && (
                    <p className="mt-1 text-slate-400">
                      Email: <span className="text-slate-200">{selectedCustomer.email}</span>
                    </p>
                  )}
                  {selectedCustomer.phone && (
                    <p className="mt-1 text-slate-400">
                      Phone: <span className="text-slate-200">{selectedCustomer.phone}</span>
                    </p>
                  )}
                </div>
              )}

              <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Payment method
                <select
                  className="mt-2 w-full rounded-xl border border-slate-700/80 bg-slate-900/80 px-4 py-2 text-sm text-white shadow-inner shadow-black/20 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                >
                  {paymentMethodOptions.map((option) => (
                    <option key={option.value} value={option.value} className="bg-slate-900 text-white">
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                Fulfillment
                <select
                  className="mt-2 w-full rounded-xl border border-slate-700/80 bg-slate-900/80 px-4 py-2 text-sm text-white shadow-inner shadow-black/20 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
                  value={fulfillmentType}
                  onChange={(event) => setFulfillmentType(event.target.value as FulfillmentType)}
                >
                  {fulfillmentOptions.map((option) => (
                    <option key={option.value} value={option.value} className="bg-slate-900 text-white">
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              {isDelivery && (
                <label className="block text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                  Delivery fee
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={deliveryFee}
                    onChange={(event) => {
                      const value = Number.parseFloat(event.target.value);
                      setDeliveryFee(Number.isNaN(value) ? 0 : Math.max(0, value));
                    }}
                    className="mt-2 w-full rounded-xl border border-slate-700/80 bg-slate-900/80 px-4 py-2 text-sm text-white shadow-inner shadow-black/20 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
                  />
                </label>
              )}
            </div>

            <div className="space-y-3 border-t border-slate-800/60 pt-4">
              <div className="flex items-center justify-between">
                <span>Customer</span>
                <span className="font-semibold text-white">
                  {selectedCustomer ? selectedCustomer.name : 'Walk-in customer'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Items</span>
                <span className="font-semibold text-white">{lines.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-white">{formatCurrency(subtotal)}</span>
              </div>
              {cardFee > 0 && (
                <div className="flex items-center justify-between">
                  <span>CC fee (3.5%)</span>
                  <span className="font-semibold text-white">{formatCurrency(cardFee)}</span>
                </div>
              )}
              {appliedDeliveryFee > 0 && (
                <div className="flex items-center justify-between">
                  <span>Delivery fee</span>
                  <span className="font-semibold text-white">{formatCurrency(appliedDeliveryFee)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span>Federal tax (7%)</span>
                <span className="font-semibold text-white">{formatCurrency(federalTax)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Local tax (1%)</span>
                <span className="font-semibold text-white">{formatCurrency(localTax)}</span>
              </div>
              <div className="flex items-center justify-between text-sm uppercase tracking-[0.3em] text-emerald-400/80">
                <span>Total due</span>
                <span className="text-lg font-semibold text-emerald-300">{formatCurrency(totalDue)}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
          className="group relative inline-flex h-14 w-full items-center justify-center overflow-hidden rounded-2xl border border-emerald-500/40 bg-emerald-500/10 text-base font-semibold text-emerald-100 shadow-lg shadow-emerald-500/15 transition hover:border-emerald-300 hover:text-emerald-50 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800/60 disabled:text-slate-500"
            onClick={finalize}
            disabled={lines.length === 0 || isFinalizing}
          >
            <span className={`${isFinalizing ? 'opacity-0' : 'opacity-100'} transition`}>{finalizeLabel}</span>
            {isFinalizing && (
              <span className="absolute inset-0 flex items-center justify-center text-xs uppercase tracking-[0.4em] text-emerald-100">
                {mode === 'edit' ? 'Saving…' : 'Finalizing…'}
              </span>
            )}
          </button>
        </aside>
      </section>

      {status && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            status.kind === 'error'
              ? 'border-rose-500/60 bg-rose-500/10 text-rose-100'
              : 'border-emerald-500/60 bg-emerald-500/10 text-emerald-100'
          }`}
        >
          {status.message}
        </div>
      )}

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-xl overflow-hidden rounded-lg bg-white text-slate-900 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Item</p>
                <h2 className="text-xl font-semibold text-slate-900">{selectedItem.sku}</h2>
                <p className="text-sm text-slate-500">{selectedItem.description}</p>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="rounded-full border border-slate-200 p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close item details"
              >
                ×
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              {detailError ? (
                <div className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{detailError}</div>
              ) : isDetailLoading || !selectedDetail ? (
                <div className="py-6 text-center text-sm text-slate-500">Loading item details…</div>
              ) : (
                <>
                  <div className="flex items-center justify-between rounded-lg bg-slate-100 px-4 py-3">
                    <span className="text-sm font-medium text-slate-600">Price</span>
                    <span className="text-lg font-semibold text-slate-900">
                      {formatCurrency(selectedDetail.item.price)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-600">Quantity on hand</h3>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{selectedDetail.total_on_hand.toFixed(2)}</p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                      {selectedDetail.locations.length ? (
                        selectedDetail.locations.map((location) => (
                          <li
                            key={location.location_id}
                            className="flex items-center justify-between rounded border border-slate-200 px-3 py-2"
                          >
                            <span className="font-medium">{location.location_name}</span>
                            <span>
                              {location.qty_on_hand.toFixed(2)} on hand
                              {location.qty_reserved > 0 ? ` · ${location.qty_reserved.toFixed(2)} reserved` : ''}
                            </span>
                          </li>
                        ))
                      ) : (
                        <li className="rounded border border-dashed border-slate-200 px-3 py-2 text-slate-400">
                          No stock locations recorded.
                        </li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-600">Incoming</h3>
                    {selectedDetail.incoming.length ? (
                      <>
                        <div className="mt-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-slate-700">
                          <p className="font-semibold text-sky-700">Next arrival</p>
                          <p>
                            {selectedDetail.incoming[0].qty_remaining.toFixed(2)} units expected{' '}
                            {selectedDetail.incoming[0].expected_date
                              ? `on ${formatExpectedDate(selectedDetail.incoming[0].expected_date)}`
                              : 'soon'}{' '}
                            from {selectedDetail.incoming[0].vendor_name ?? 'vendor TBD'} (PO #{selectedDetail.incoming[0].po_id}).
                          </p>
                        </div>
                        <ul className="mt-3 space-y-2 text-sm text-slate-600">
                          {selectedDetail.incoming.map((incoming) => (
                            <li
                              key={`${incoming.po_id}-${incoming.expected_date ?? 'none'}`}
                              className="rounded border border-slate-200 px-3 py-2"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium">PO #{incoming.po_id}</span>
                                <span className="text-xs uppercase tracking-wide text-slate-400">{incoming.status}</span>
                              </div>
                              <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                                <span>{incoming.vendor_name ?? 'Vendor TBD'}</span>
                                <span>
                                  {incoming.expected_date
                                    ? `Expected ${formatExpectedDate(incoming.expected_date)}`
                                    : 'Expected date TBD'}
                                </span>
                              </div>
                              <div className="mt-2 text-xs text-slate-500">
                                {incoming.qty_remaining.toFixed(2)} of {incoming.qty_ordered.toFixed(2)} remaining
                              </div>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">No incoming purchase orders for this item.</p>
                    )}
                    <div className="mt-4 space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                      <p className="font-semibold">Need to order more of this item?</p>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href="/receiving/purchase-orders/new"
                          className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                        >
                          Create purchase order
                        </Link>
                        <Link
                          href="/dashboard/purchase-orders#po-list"
                          className="inline-flex items-center justify-center rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                        >
                          Add to existing purchase order
                        </Link>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={closeDetail}
                className="rounded border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleAddToTicket}
                disabled={isDetailLoading}
                className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-500 disabled:opacity-60"
              >
                Add to Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
