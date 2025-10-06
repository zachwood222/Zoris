import Link from 'next/link';

const links = [
  { href: '/kiosk', label: 'Sales Kiosk' },
  { href: '/review', label: 'OCR Review' },
  { href: '/receiving', label: 'Receiving' },
  { href: '/labels', label: 'Labels' }
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-8 p-8 text-center">
      <h1 className="text-4xl font-bold">Zoris Control Center</h1>
      <p className="text-lg text-slate-600">Choose a workspace to get started.</p>
      <div className="grid w-full gap-4 sm:grid-cols-2">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="rounded-lg bg-white p-6 shadow hover:bg-slate-50">
            <div className="text-xl font-semibold">{link.label}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
