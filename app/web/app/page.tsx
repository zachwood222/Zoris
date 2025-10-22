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
        description: 'Clean spreadsheets and load vendor, item, and customer data.',
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
    <main className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-16 px-6 py-16 text-slate-100 lg:px-12 lg:py-20">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.3),_rgba(76,29,149,0.05))]" />
      <header className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-slate-900/80 p-10 shadow-2xl shadow-sky-900/20 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-slate-200">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
              Live dashboard
            </span>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">Command your retail operations</h1>
            <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
              Guide every team with actionable insights, ready-to-launch workflows, and the context they need to make quick decisions.
            </p>
          </div>
          <HeroStatusCard />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardMetrics />
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-xl shadow-slate-950/20 backdrop-blur">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Workspaces</h2>
                <p className="text-sm text-slate-300">Jump to the area that matches the job in front of you.</p>
              </div>
              <span className="text-xs uppercase tracking-[0.35em] text-slate-400">Navigate</span>
            </div>
            <div className="mt-8 space-y-6">
              {workspaceSections.map((section) => (
                <div key={section.title} className="space-y-4 rounded-2xl border border-white/5 bg-white/5 p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-white">{section.title}</h3>
                      <p className="text-sm text-slate-300">{section.description}</p>
                    </div>
                    <span className="text-xs uppercase tracking-[0.35em] text-slate-400">{section.items.length} tools</span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {section.items.map((workspace) => (
                      <Link
                        key={workspace.href}
                        href={workspace.href}
                        className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.08] p-6 text-left transition hover:border-white/40"
                      >
                        <span className="absolute inset-0 -z-10 bg-gradient-to-br from-sky-400/20 via-transparent to-indigo-500/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                        <div className="flex items-start justify-between text-2xl">
                          <span aria-hidden>{workspace.icon}</span>
                          <span className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-300 transition duration-300 group-hover:text-white">
                            Open
                          </span>
                        </div>
                        <h4 className="mt-4 text-lg font-semibold text-white">{workspace.label}</h4>
                        <p className="mt-2 text-sm text-slate-300">{workspace.description}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-xl shadow-slate-950/20 backdrop-blur">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Guided workflows</h2>
                <p className="text-sm text-slate-300">Use ready-made playbooks to point teammates in the right direction.</p>
              </div>
              <span className="text-xs uppercase tracking-[0.35em] text-slate-400">Playbook</span>
            </div>
            <div className="mt-8 grid gap-5">
              {workflowGuides.map((guide) => (
                <div key={guide.title} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] shadow-inner shadow-black/10">
                  <div className="flex flex-col gap-2 border-b border-white/10 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-white">{guide.title}</h3>
                      <p className="text-sm text-slate-300">{guide.description}</p>
                    </div>
                    <span className="text-xs uppercase tracking-[0.35em] text-slate-400">{guide.steps.length} steps</span>
                  </div>
                  <ol className="grid gap-1 px-3 py-3 sm:grid-cols-3">
                    {guide.steps.map((step, index) => (
                      <li key={step.href} className="group">
                        <Link
                          href={step.href}
                          className="flex h-full flex-col gap-2 rounded-xl border border-transparent p-4 transition hover:border-white/40 hover:bg-white/10"
                        >
                          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-sm text-white">
                              {index + 1}
                            </span>
                            Step {index + 1}
                          </span>
                          <span className="text-sm font-semibold text-white">
                            <span aria-hidden className="mr-2">{step.icon}</span>
                            {step.label}
                          </span>
                          <span className="text-xs text-slate-300">{step.description}</span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-xl shadow-slate-950/20 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Quick actions</h2>
                <p className="text-sm text-slate-300">Launch the task that will unblock the next step.</p>
              </div>
              <span className="text-xs uppercase tracking-[0.35em] text-slate-400">Do more</span>
            </div>
            <div className="mt-6 grid gap-4">
              {quickActionGroups.map((group) => (
                <section key={group.title} className="space-y-4 rounded-2xl border border-white/5 bg-white/5 p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-white">{group.title}</h3>
                      <p className="text-sm text-slate-300">{group.description}</p>
                    </div>
                    <span className="text-xs uppercase tracking-[0.35em] text-slate-400">{group.items.length} shortcuts</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {group.items.map((action) => (
                      <Link
                        key={action.href}
                        href={action.href}
                        className="group flex h-full flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.08] p-5 text-left transition hover:border-white/40"
                      >
                        <span className="text-2xl" aria-hidden>
                          {action.icon}
                        </span>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-white">{action.label}</p>
                          <p className="text-xs text-slate-300">{action.description}</p>
                        </div>
                        <span className="mt-auto text-xs font-semibold uppercase tracking-[0.35em] text-slate-400 transition group-hover:text-white">
                          Launch
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-6">
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-xl shadow-slate-950/20 backdrop-blur">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Activity feed</h2>
              <span className="text-xs uppercase tracking-[0.35em] text-slate-400">Live</span>
            </div>
            <ul className="mt-6 space-y-5">
              <DashboardActivityList />
            </ul>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-xl shadow-slate-950/20 backdrop-blur">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">System status</h2>
              <span className="text-xs uppercase tracking-[0.35em] text-slate-400">Health</span>
            </div>
            <ul className="mt-6 space-y-5">
              <DashboardSystemStatusList />
            </ul>
          </div>
        </aside>
      </section>

      <footer className="flex flex-col items-center justify-between gap-4 rounded-3xl border border-white/10 bg-slate-900/70 p-8 text-center text-xs text-slate-400 shadow-xl shadow-slate-950/20 backdrop-blur sm:flex-row sm:text-left">
        <p>Celery workers, OCR flows, and kiosk tickets all share the same data backbone.</p>
        <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-sky-400" aria-hidden />
          <span className="text-xs uppercase tracking-[0.35em] text-slate-200">Ready</span>
        </div>
      </footer>
    </main>
  );
}
