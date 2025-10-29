import Link from 'next/link';

import {
  DashboardActivityList,
  DashboardMetrics,
  DashboardSystemStatusList
} from './dashboard-summary-client';
import HeroStatusCard from './hero-status-card';

const workspaceSections = [
  {
    title: 'Counter & sales',
    description: 'Empower the counter team with quick access to the tools they touch all day.',
    items: [
      {
        href: '/kiosk',
        label: 'Sales Kiosk',
        description:
          'Accelerate assisted sales with fast lookup, barcode capture, and ticket automation.',
        icon: '🛒'
      },
      {
        href: '/review',
        label: 'OCR Review',
        description: 'Verify handwritten tickets before invoicing to keep billing accurate.',
        icon: '📝'
      }
    ]
  },
  {
    title: 'Operations & logistics',
    description: 'Keep product flowing by coordinating dock activity, receiving, and labeling.',
    items: [
      {
        href: '/receiving',
        label: 'Receiving',
        description: 'Scan purchase order lines as trucks arrive to keep inventory in sync.',
        icon: '🚚'
      },
      {
        href: '/incoming-trucks',
        label: 'Incoming Trucks',
        description: 'Track dock activity and log PO-linked updates as loads check in.',
        icon: '🚛'
      },
      {
        href: '/labels',
        label: 'Labels',
        description: 'Generate bin, shelf, and delivery labels with one-tap DYMO printing.',
        icon: '🏷️'
      }
    ]
  }
];

const quickActionGroups = [
  {
    title: 'Prep & import',
    description: 'Load pricing, catalog, and vendor updates before the floor gets busy.',
    items: [
      {
        href: '/imports/spreadsheet',
        label: 'Import spreadsheet',
        description: 'Upload dataset-specific spreadsheets to sync vendors, items, and orders.',
        icon: '📥'
      },
      {
        href: '/kiosk/catalog/new-item',
        label: 'Add catalog item',
        description: 'Extend the catalog with pricing, stocking, and barcode details.',
        icon: '➕'
      },
      {
        href: '/receiving/purchase-orders/new',
        label: 'Create purchase order',
        description: 'Draft a PO for inbound merchandise before it leaves the vendor.',
        icon: '📄'
      }
    ]
  },
  {
    title: 'Sell & support',
    description: 'Keep the counter team unblocked while they help customers face-to-face.',
    items: [
      {
        href: '/kiosk/new-ticket',
        label: 'Create ticket',
        description: 'Kick off a guided assisted-sale ticket from the kiosk.',
        icon: '⚡'
      },
      {
        href: '/kiosk/catalog',
        label: 'Lookup item',
        description: 'Search inventory availability and pull up ticket-ready details.',
        icon: '🔍'
      },
      {
        href: '/review',
        label: 'Review OCR queue',
        description: 'Double-check handwriting so finance can invoice without surprises.',
        icon: '📝'
      }
    ]
  },
  {
    title: 'Records & reporting',
    description: 'Jump directly to the data your finance and ops teams monitor all day long.',
    items: [
      {
        href: '/dashboard/vendors',
        label: 'View vendors',
        description: 'Browse the imported vendor directory with terms and contacts.',
        icon: '🏬'
      },
      {
        href: '/dashboard/items',
        label: 'View item catalog',
        description: 'Inspect live catalog inventory synced from spreadsheet imports.',
        icon: '📦'
      },
      {
        href: '/dashboard/purchase-orders',
        label: 'View purchase orders',
        description: 'Track purchasing commitments and reconcile receiving progress.',
        icon: '🧾'
      },
      {
        href: '/dashboard/invoices',
        label: 'View invoices',
        description: 'Audit vendor billing, due dates, and payment status.',
        icon: '💼'
      },
      {
        href: '/dashboard/reports',
        label: 'Reports dashboard',
        description: 'Visualize KPIs, activity, and system health in one spot.',
        icon: '📊'
      }
    ]
  },
  {
    title: 'Deliver & receive',
    description: 'Coordinate warehouse and delivery teams to keep promises on track.',
    items: [
      {
        href: '/receiving',
        label: 'Receive purchase order',
        description: 'Scan line items and reconcile inventory at the dock door.',
        icon: '📦'
      },
      {
        href: '/delivery/schedule',
        label: 'Schedule a delivery',
        description: 'Reserve a delivery window and dispatch the logistics crew.',
        icon: '🚚'
      },
      {
        href: '/delivery/complete',
        label: 'Complete a delivery',
        description: 'Capture signatures, photos, and notes after drop-off.',
        icon: '✅'
      },
      {
        href: '/labels/batch',
        label: 'Batch print labels',
        description: 'Send the morning pick list straight to the label printer.',
        icon: '🖨️'
      }
    ]
  }
];

const workflowGuides = [
  {
    title: 'Morning opening checklist',
    description: 'Stage the floor and make sure the day starts smooth.',
    steps: [
      {
        href: '/imports/spreadsheet',
        label: 'Import vendor updates',
        description: 'Load overnight price sheets or new assortments before doors open.',
        icon: '📥'
      },
      {
        href: '/incoming-trucks',
        label: 'Confirm dock schedule',
        description: 'Glance at what is arriving and coordinate doors with the crew.',
        icon: '🚛'
      },
      {
        href: '/labels/batch',
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
        href: '/kiosk/catalog',
        label: 'Lookup or add the item',
        description: 'Find availability or add a missing SKU while the customer waits.',
        icon: '🔍'
      },
      {
        href: '/kiosk/new-ticket',
        label: 'Build the ticket',
        description: 'Scan items, apply pricing, and capture delivery preferences.',
        icon: '⚡'
      },
      {
        href: '/review',
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
        href: '/receiving',
        label: 'Confirm receiving is done',
        description: 'Verify all purchase order lines are scanned into stock.',
        icon: '📦'
      },
      {
        href: '/delivery/schedule',
        label: 'Schedule the drop-off',
        description: 'Assign a crew, truck, and time window while availability is fresh.',
        icon: '🚚'
      },
      {
        href: '/delivery/complete',
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

      <section className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-10">
          <article className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow">
            <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-white">Workspaces</h2>
                <p className="text-sm text-slate-300">Jump to the area that matches the job in front of you.</p>
              </div>
              <span className="text-xs font-medium text-slate-400">{workspaceSections.length} collections</span>
            </header>
            <div className="space-y-5">
              {workspaceSections.map((section) => (
                <section key={section.title} className="space-y-3 rounded-xl border border-slate-800/70 bg-slate-900/80 p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold text-white">{section.title}</h3>
                      <p className="text-sm text-slate-300">{section.description}</p>
                    </div>
                    <span className="text-xs font-medium text-slate-400">{section.items.length} tools</span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {section.items.map((workspace) => (
                      <Link
                        key={workspace.href}
                        href={workspace.href}
                        className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-4 transition hover:border-slate-600 hover:bg-slate-900"
                      >
                        <span className="text-xl" aria-hidden>
                          {workspace.icon}
                        </span>
                        <div className="space-y-1">
                          <h4 className="text-sm font-semibold text-white">{workspace.label}</h4>
                          <p className="text-xs text-slate-300">{workspace.description}</p>
                        </div>
                        <span className="text-xs font-medium text-slate-400">Open</span>
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
                <section key={guide.title} className="space-y-3 rounded-xl border border-slate-800/70 bg-slate-950/60 p-5">
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

          <article className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow">
            <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-white">Quick actions</h2>
                <p className="text-sm text-slate-300">Launch the task that will unblock the next step.</p>
              </div>
              <span className="text-xs font-medium text-slate-400">{quickActionGroups.length} groups</span>
            </header>
            <div className="space-y-4">
              {quickActionGroups.map((group) => (
                <section key={group.title} className="space-y-3 rounded-xl border border-slate-800/70 bg-slate-950/60 p-5">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold text-white">{group.title}</h3>
                      <p className="text-sm text-slate-300">{group.description}</p>
                    </div>
                    <span className="text-xs font-medium text-slate-400">{group.items.length} shortcuts</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {group.items.map((action) => (
                      <Link
                        key={action.href}
                        href={action.href}
                        className="flex h-full flex-col gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4 transition hover:border-slate-600 hover:bg-slate-900"
                      >
                        <span className="text-xl" aria-hidden>
                          {action.icon}
                        </span>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-white">{action.label}</p>
                          <p className="text-xs text-slate-400">{action.description}</p>
                        </div>
                        <span className="mt-auto text-xs font-medium text-slate-400">Launch</span>
                      </Link>
                    ))}
                  </div>
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
