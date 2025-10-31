import type { DashboardDrilldownKey } from '../../dashboard-summary-data';

export type AnalyticsSection = {
  id: DashboardDrilldownKey;
  metricLabel: string;
  title: string;
  description: string;
  kicker: string;
  cta?: {
    label: string;
    href: string;
  };
};

export const analyticsSections: AnalyticsSection[] = [
  {
    id: 'openSales',
    metricLabel: 'Open Sales',
    title: 'Open sales',
    description: 'Quotes and active tickets that still need fulfillment or invoicing.',
    kicker: 'Sales pipeline',
    cta: {
      label: 'Open sales dashboard',
      href: '/dashboard/sales#open-sales'
    }
  },
  {
    id: 'draftOcrTickets',
    metricLabel: 'Draft OCR Tickets',
    title: 'Draft OCR tickets',
    description: 'Handwritten tickets captured by the counter team that need a final review.',
    kicker: 'Verification'
  },
  {
    id: 'inboundPurchaseOrders',
    metricLabel: 'Inbound Purchase Orders',
    title: 'Inbound purchase orders',
    description: 'Loads on the road or at the dock that are tied to open purchase orders.',
    kicker: 'Inbound logistics',
    cta: {
      label: 'Open purchase order dashboard',
      href: '/dashboard/purchase-orders'
    }
  },
  {
    id: 'activeReceivers',
    metricLabel: 'Active Receivers',
    title: 'Active receivers',
    description: 'Team members currently working receiving jobs on the dock.',
    kicker: 'Dock crew'
  }
];

export function getSectionAnchor(id: DashboardDrilldownKey): string {
  return id.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
}
