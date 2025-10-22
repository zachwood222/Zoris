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
};

export type DashboardSystemStatus = {
  label: string;
  state: string;
  badge: string;
  description: string;
};

export type DashboardSummaryResponse = {
  metrics: DashboardMetric[];
  activity: DashboardActivity[];
  system_status: DashboardSystemStatus[];
  detail?: string;
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
      time: '18 minutes ago'
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
      time: '2 hours ago'
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
  ]
};
