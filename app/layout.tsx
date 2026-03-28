import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { MissionControlProvider } from '@/lib/store';
import { AppShell } from '@/components/AppShell';
import { ToasterProvider } from '@/components/ToasterProvider';

import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Mission Control',
  description: 'Mission Control dashboard for OpenClaw AI agent system',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-slate-950 text-slate-100 antialiased`}>
        <MissionControlProvider>
          <AppShell>{children}</AppShell>
          <ToasterProvider />
        </MissionControlProvider>
      </body>
    </html>
  );
}
