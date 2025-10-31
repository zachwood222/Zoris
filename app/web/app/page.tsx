import Link from 'next/link';

import {
  DashboardActivityList,
  DashboardMetrics,
  DashboardSystemStatusList
} from './dashboard-summary-client';
import HeroStatusCard from './hero-status-card';

const dashboards = [
  {
    title: 'Sales orders',
    description: 'Monitor open tickets, fulfilled orders, and delivery readiness in one workspace.',
    icon: '📋',
    href: '/dashboard/sales',
    focusAreas: ['Open tickets', 'Fulfilled orders', 'Delivery coordination'],
    quickTasks: [
      {
        href: '/dashboard/sales#open-sales',
        label: 'Review open sales',
        description: 'Check which orders still need picking, payment, or scheduling.',
        icon: '🧾'
      },
      {
        href: '/dashboard/sales#closed-sales',
        label: 'Audit fulfilled sales',
        description: 'Look back at recently closed tickets and make adjustments.',
        icon: '✅'
      },
      {
        href: '/kiosk',
        label: 'Create new ticket',
        description: 'Launch the guided counter flow for a new customer order.',
        icon: '✨'
      },
      {
        href: '/delivery/schedule',
        label: 'Schedule delivery',
        description: 'Attach delivery appointments to sales that are ready to roll.',
        icon: '🚚'
      }
    ]
  },
  {
    title: 'Sales counter',
    description: 'Serve customers fast with kiosk workflows, catalog lookups, and OCR validation in one spot.',
    icon: '🛒',
    href: '/dashboard/counter',
    focusAreas: ['Tickets', 'Catalog', 'OCR review'],
    quickTasks: [
      {
        href: '/dashboard/counter#launch-kiosk',
        label: 'Launch sales kiosk',
        description: 'Open the guided kiosk workspace for counter teammates.',
        icon: '⚡'
      },
      {
        href: '/dashboard/counter#create-ticket',
        label: 'Build counter ticket',
        description: 'Start a guided assisted-sale ticket with delivery preferences captured upfront.',
        icon: '🧾'
      },
      {
        href: '/dashboard/counter#lookup-item',
        label: 'Lookup or add item',
        description: 'Search live catalog inventory or add a missing SKU without leaving the counter.',
        icon: '🔍'
      },
      {
        href: '/dashboard/counter#review-ocr',
        label: 'Verify OCR queue',
        description: 'Double-check handwriting before invoices go out.',
        icon: '📝'
      }
    ]
  },
  {
    title: 'Purchasing operations',
    description: 'Keep vendors, orders, and receiving coordination organized for the purchasing desk.',
    icon: '🧾',
    href: '/dashboard/purchasing',
    focusAreas: ['Vendor imports', 'Purchase orders', 'Receiving handoff'],
    quickTasks: [
      {
        href: '/dashboard/purchasing#import-vendors',
        label: 'Import vendor updates',
        description: 'Upload spreadsheets to refresh terms, contacts, and assortments.',
        icon: '📥'
      },
      {
        href: '/dashboard/purchasing#create-po',
        label: 'Draft purchase order',
        description: 'Create a new PO before sharing it with a vendor.',
        icon: '📝'
      },
      {
        href: '/dashboard/purchasing#manage-pos',
        label: 'Review purchase orders',
        description: 'Monitor open, received, and closed POs in one place.',
        icon: '📊'
      },
      {
        href: '/dashboard/purchasing#review-vendors',
        label: 'View vendor directory',
        description: 'Check payment terms and reps without leaving purchasing.',
        icon: '🏬'
      }
    ]
  },
  {
    title: 'Inventory & receiving',
    description: 'Track docks, reconcile receipts, and print labels to keep stock flowing.',
    icon: '📦',
    href: '/dashboard/inventory',
    focusAreas: ['Dock scheduling', 'Receiving', 'Labeling'],
    quickTasks: [
      {
        href: '/dashboard/inventory#receive-po',
        label: 'Receive purchase order',
        description: 'Scan PO lines the moment freight hits the dock.',
        icon: '📦'
      },
      {
        href: '/dashboard/inventory#incoming-trucks',
        label: 'Check incoming trucks',
        description: 'Coordinate bay assignments and arrival updates.',
        icon: '🚛'
      },
      {
        href: '/dashboard/inventory#print-labels',
        label: 'Print labels',
        description: 'Generate bin, shelf, and delivery labels on demand.',
        icon: '🏷️'
      },
      {
        href: '/dashboard/inventory#batch-labels',
        label: 'Batch label run',
        description: 'Send a batch of labels straight to the printer for morning pulls.',
        icon: '🖨️'
      }
    ]
  },
  {
    title: 'Delivery logistics',
    description: 'Coordinate dispatch, paperwork, and proof-of-delivery details for every route.',
    icon: '🚚',
    href: '/dashboard/logistics',
    focusAreas: ['Scheduling', 'Dispatch', 'Proof of delivery'],
    quickTasks: [
      {
        href: '/dashboard/logistics#schedule-delivery',
        label: 'Schedule delivery',
        description: 'Reserve crews, trucks, and drop-off windows.',
        icon: '📅'
      },
      {
        href: '/dashboard/logistics#complete-delivery',
        label: 'Complete delivery',
        description: 'Capture photos, signatures, and notes on site.',
        icon: '✅'
      },
      {
        href: '/dashboard/logistics#delivery-paperwork',
        label: 'Print delivery paperwork',
        description: 'Batch print labels and documents before the crew departs.',
        icon: '🖨️'
      }
    ]
  },
  {
    title: 'Deliver & receive',
    description: 'Coordinate warehouse and delivery teams to keep promises on track.',
    icon: '🔄',
    href: '/delivery',
    focusAreas: ['Delivery operations', 'Receiving', 'Finance'],
    quickTasks: [
      {
        href: '/delivery',
        label: 'Delivery dashboard',
        description: 'Monitor routes, map crews, and jump into delivery workflows.',
        icon: '🗺️'
      },
      {
        href: '/receiving',
        label: 'Receive purchase order',
        description: 'Scan line items and reconcile inventory at the dock door.',
        icon: '📦'
      },
      {
        href: '/dashboard/finance#view-invoices',
        label: 'Review invoices',
        description: 'Audit outstanding balances and payment status.',
        icon: '💼'
      },
      {
        href: '/dashboard/finance#view-analytics',
        label: 'View analytics',
        description: 'Track KPIs and operational throughput trends.',
        icon: '📈'
      },
      {
        href: '/dashboard/finance#view-reports',
        label: 'Open reports',
        description: 'Jump into curated dashboards for leadership updates.',
        icon: '📊'
      }
    ]
  }
] as const;

const workflowGuides = [
  {
    title: 'Morning opening checklist',
    description: 'Stage the floor and make sure the day starts smooth.',
    steps: [
      {
        href: '/dashboard/purchasing#import-vendors',
        label: 'Import vendor updates',
        description: 'Load overnight price sheets or new assortments before doors open.',
        icon: '📥'
      },
      {
        href: '/dashboard/inventory#incoming-trucks',
        label: 'Confirm dock schedule',
        description: 'Glance at what is arriving and coordinate doors with the crew.',
        icon: '🚛'
      },
      {
        href: '/dashboard/inventory#print-labels',
        label: 'Refresh shelf labels',
        description: 'Print and stage signage for promos or resets that launch today.',
        icon: '🏷️'
      }
    ]
  },
  {
    title: 'Assist a counter customer',
    description: 'From the first question to a polished ticket.',
    steps: [
      {
        href: '/dashboard/counter#lookup-item',
        label: 'Lookup or add the item',
        description: 'Find availability or add a missing SKU while the customer waits.',
        icon: '🔍'
      },
      {
        href: '/dashboard/counter#create-ticket',
        label: 'Build the ticket',
        description: 'Scan items, apply pricing, and capture delivery preferences.',
        icon: '⚡'
      },
      {
        href: '/dashboard/counter#review-ocr',
        label: 'Queue for verification',
        description: 'Send handwriting to the OCR queue when you need a second set of eyes.',
        icon: '📝'
      }
    ]
  },
  {
    title: 'Close out a delivery',
    description: 'Finish the customer promise and keep inventory aligned.',
    steps: [
      {
        href: '/dashboard/inventory#receive-po',
        label: 'Confirm receiving is done',
        description: 'Verify all purchase order lines are scanned into stock.',
        icon: '📦'
      },
      {
        href: '/dashboard/logistics#schedule-delivery',
        label: 'Schedule the drop-off',
        description: 'Assign a crew, truck, and time window while availability is fresh.',
        icon: '🚚'
      },
      {
        href: '/dashboard/logistics#complete-delivery',
        label: 'Capture proof of delivery',
        description: 'Log photos, signatures, and notes before the team leaves the site.',
        icon: '✅'
      }
    ]
  }
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-12 px-6 py-12 text-slate-100 lg:px-12 lg:py-16">
      <header className="flex flex-col gap-8 rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-lg">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/80 px-4 py-1 text-xs font-semibold uppercase text-slate-200">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
              Dashboard
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">Command your retail operations</h1>
              <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
                Guide every team with actionable insights and quick access to the tools that keep work moving.
              </p>
            </div>
          </div>
          <HeroStatusCard />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardMetrics />
        </div>
      </header>

      <section className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-10">
          <article className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow">
            <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-white">Dashboards</h2>
                <p className="text-sm text-slate-300">Pick a command center and use the quick tasks to jump to the screen you need.</p>
              </div>
              <span className="text-xs font-medium text-slate-400">{dashboards.length} areas</span>
            </header>
            <div className="space-y-5">
              {dashboards.map((dashboard) => (
                <section
                  key={dashboard.title}
                  className="space-y-4 rounded-2xl border border-slate-800/70 bg-slate-950/70 p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl" aria-hidden>
                          {dashboard.icon}
                        </span>
                        <div className="space-y-1">
                          <h3 className="text-base font-semibold text-white">{dashboard.title}</h3>
                          <p className="text-sm text-slate-300">{dashboard.description}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {dashboard.focusAreas.map((area) => (
                          <span
                            key={area}
                            className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-medium text-slate-300"
                          >
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Link
                      href={dashboard.href}
                      className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-200 transition hover:border-sky-300 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                    >
                      Open dashboard
                      <span aria-hidden>→</span>
                    </Link>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {dashboard.quickTasks.map((task) => (
                      <Link
                        key={task.href}
                        href={task.href}
                        className="flex h-full flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-slate-600 hover:bg-slate-900"
                      >
                        <span className="text-xl" aria-hidden>
                          {task.icon}
                        </span>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-white">{task.label}</p>
                          <p className="text-xs text-slate-400">{task.description}</p>
                        </div>
                        <span className="mt-auto text-xs font-medium text-slate-400">Go to task</span>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </article>

          <article className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow">
            <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-white">Guided workflows</h2>
                <p className="text-sm text-slate-300">Use ready-made playbooks to point teammates in the right direction.</p>
              </div>
              <span className="text-xs font-medium text-slate-400">{workflowGuides.length} guides</span>
            </header>
            <div className="space-y-4">
              {workflowGuides.map((guide) => (
                <section
                  key={guide.title}
                  className="space-y-3 rounded-xl border border-slate-800/70 bg-slate-950/60 p-5"
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold text-white">{guide.title}</h3>
                      <p className="text-sm text-slate-300">{guide.description}</p>
                    </div>
                    <span className="text-xs font-medium text-slate-400">{guide.steps.length} steps</span>
                  </div>
                  <ol className="grid gap-2 sm:grid-cols-3">
                    {guide.steps.map((step, index) => (
                      <li key={step.href}>
                        <Link
                          href={step.href}
                          className="flex h-full flex-col gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-4 transition hover:border-slate-600 hover:bg-slate-900"
                        >
                          <span className="flex items-center gap-2 text-xs font-medium text-slate-300">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs text-white">
                              {index + 1}
                            </span>
                            Step {index + 1}
                          </span>
                          <span className="text-sm font-semibold text-white">
                            <span aria-hidden className="mr-2">{step.icon}</span>
                            {step.label}
                          </span>
                          <span className="text-xs text-slate-400">{step.description}</span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          </article>
        </div>

        <aside className="flex flex-col gap-6">
          <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow">
            <header className="flex items-center justify-between text-sm text-slate-300">
              <h2 className="text-lg font-semibold text-white">Activity feed</h2>
              <span>Live</span>
            </header>
            <ul className="space-y-4 text-sm text-slate-300">
              <DashboardActivityList />
            </ul>
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow">
            <header className="flex items-center justify-between text-sm text-slate-300">
              <h2 className="text-lg font-semibold text-white">System status</h2>
              <span>Health</span>
            </header>
            <ul className="space-y-4 text-sm text-slate-300">
              <DashboardSystemStatusList />
            </ul>
          </section>
        </aside>
      </section>

      <footer className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-center text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:text-left">
        <p>Celery workers, OCR flows, and kiosk tickets all share the same data backbone.</p>
        <div className="inline-flex items-center gap-3 rounded-full border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-medium text-slate-200">
          <span className="inline-flex h-2 w-2 rounded-full bg-sky-400" aria-hidden />
          Ready
        </div>
      </footer>
    </main>
  );
}
