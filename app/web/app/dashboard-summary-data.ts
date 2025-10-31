export type DashboardMetric = {
  label: string;
  value: number;
  change: string;
  status: string;
};

export type DashboardActivity = {
  title: string;
  description: string;
  time: string;
  href?: string;
};

export type DashboardSystemStatus = {
  label: string;
  state: string;
  badge: string;
  description: string;
};

export type DashboardDrilldownItem = {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  badgeLabel: string;
  badgeClass: string;
  href?: string;
};

export type DashboardDrilldownKey =
  | 'openSales'
  | 'draftOcrTickets'
  | 'inboundPurchaseOrders'
  | 'activeReceivers';

export type DashboardDrilldowns = Partial<Record<DashboardDrilldownKey, DashboardDrilldownItem[]>>;

export type DashboardSummaryResponse = {
  metrics: DashboardMetric[];
  activity: DashboardActivity[];
  system_status: DashboardSystemStatus[];
  drilldowns?: DashboardDrilldowns;
};

export const fallbackDashboardSummary: DashboardSummaryResponse = {
  metrics: [
    {
      label: 'Open Sales',
      value: 8,
      change: '3 created in last 24h',
      status: 'awaiting fulfillment'
    },
    {
      label: 'Draft OCR Tickets',
      value: 5,
      change: '2 new in last 24h',
      status: 'needs review'
    },
    {
      label: 'Inbound Purchase Orders',
      value: 12,
      change: '4 receipts logged in last 24h',
      status: 'receiving queue'
    },
    {
      label: 'Active Receivers',
      value: 3,
      change: '6 dock events in last 24h',
      status: 'worker health'
    }
  ],
  activity: [
    {
      title: 'Sale #1045 closed',
      description: 'Total $2,940.22',
      time: '18 minutes ago',
      href: '/dashboard/sales/1045'
    },
    {
      title: 'PO #771 partial received',
      description: 'Vendor #88',
      time: '42 minutes ago'
    },
    {
      title: 'Dock 2 delivery check-in',
      description: 'Scanned by Kelly M.',
      time: '1 hour ago'
    },
    {
      title: 'Sale #1046 open',
      description: 'Total $1,204.09',
      time: '2 hours ago',
      href: '/dashboard/sales/1046'
    },
    {
      title: 'PO #772 created',
      description: 'Vendor #104',
      time: '3 hours ago'
    }
  ],
  system_status: [
    {
      label: 'Worker Health',
      state: 'Operational',
      badge: 'bg-emerald-500',
      description: '3 associates checked in over last 4h'
    },
    {
      label: 'OCR Pipeline',
      state: 'Reviewing',
      badge: 'bg-sky-400',
      description: '5 tickets awaiting review.'
    },
    {
      label: 'Sales Pipeline',
      state: 'Active',
      badge: 'bg-indigo-400',
      description: '8 open sales ready for fulfillment.'
    }
  ],
  drilldowns: {
    openSales: [
      {
        id: 'sale-1046',
        title: 'Sale #1046',
        subtitle: 'Brady Builders • $1,204.09',
        meta: 'Quoted by J. Patel • 18 minutes ago',
        badgeLabel: 'Picking',
        badgeClass: 'border border-sky-400/30 bg-sky-400/10 text-sky-200',
        href: '/dashboard/sales/1046'
      },
      {
        id: 'sale-1047',
        title: 'Sale #1047',
        subtitle: 'Metro Electric • $3,482.90',
        meta: 'Fulfillment ETA 3:00 PM',
        badgeLabel: 'Awaiting payment',
        badgeClass: 'border border-amber-400/30 bg-amber-400/10 text-amber-200',
        href: '/dashboard/sales/1047'
      },
      {
        id: 'sale-1048',
        title: 'Sale #1048',
        subtitle: 'Langston Supply • $842.11',
        meta: 'Committed to Dock 2 • 35 minutes ago',
        badgeLabel: 'Staged',
        badgeClass: 'border border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
        href: '/dashboard/sales/1048'
      }
    ],
    draftOcrTickets: [
      {
        id: 'ticket-508',
        title: 'Ticket #508',
        subtitle: 'Handwritten — 6 line items',
        meta: 'Captured by S. Romero • Needs verification',
        badgeLabel: 'Pending review',
        badgeClass: 'border border-rose-400/30 bg-rose-400/10 text-rose-200'
      },
      {
        id: 'ticket-509',
        title: 'Ticket #509',
        subtitle: 'Delivery request • 4 items',
        meta: 'Flagged by OCR for manual pricing',
        badgeLabel: 'Price check',
        badgeClass: 'border border-amber-400/30 bg-amber-400/10 text-amber-200'
      },
      {
        id: 'ticket-510',
        title: 'Ticket #510',
        subtitle: 'Counter sale • 3 items',
        meta: 'Scanned by L. Chen • 12 minutes ago',
        badgeLabel: 'Ready to submit',
        badgeClass: 'border border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
      }
    ],
    inboundPurchaseOrders: [
      {
        id: 'po-771',
        title: 'PO #771',
        subtitle: 'Vendor 88 • 120 units',
        meta: 'Arrived at Dock 3 • 42 minutes ago',
        badgeLabel: 'Partial received',
        badgeClass: 'border border-sky-400/30 bg-sky-400/10 text-sky-200'
      },
      {
        id: 'po-772',
        title: 'PO #772',
        subtitle: 'Vendor 104 • 86 units',
        meta: 'In transit • ETA 4:15 PM',
        badgeLabel: 'On the road',
        badgeClass: 'border border-indigo-400/30 bg-indigo-400/10 text-indigo-200'
      },
      {
        id: 'po-773',
        title: 'PO #773',
        subtitle: 'Vendor 42 • 230 units',
        meta: 'Advanced shipping notice received',
        badgeLabel: 'Prepping receiving',
        badgeClass: 'border border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
      }
    ],
    activeReceivers: [
      {
        id: 'receiver-01',
        title: 'Dock Door 1',
        subtitle: 'Kelly M. • Truck R482',
        meta: 'Scanning items • 6 lines left',
        badgeLabel: 'In progress',
        badgeClass: 'border border-sky-400/30 bg-sky-400/10 text-sky-200'
      },
      {
        id: 'receiver-02',
        title: 'Dock Door 2',
        subtitle: 'Robin C. • Truck Q105',
        meta: 'Completed unload • awaiting verification',
        badgeLabel: 'Reconciling',
        badgeClass: 'border border-amber-400/30 bg-amber-400/10 text-amber-200'
      },
      {
        id: 'receiver-03',
        title: 'Dock Door 4',
        subtitle: 'Andre F. • Vendor 104',
        meta: 'Break down pallet • 12 minutes ago',
        badgeLabel: 'Staging',
        badgeClass: 'border border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
      }
    ]
  }
};
