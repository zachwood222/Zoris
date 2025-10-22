import './globals.css';
import { Inter } from 'next/font/google';
import { ReactNode } from 'react';

import BackToDashboardButton from './back-to-dashboard-button';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body className="relative min-h-screen text-slate-100">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.35),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(147,51,234,0.28),_transparent_60%)]" />
        <div className="relative flex min-h-screen flex-col">
          <BackToDashboardButton />
          {children}
        </div>
      </body>
    </html>
  );
}
