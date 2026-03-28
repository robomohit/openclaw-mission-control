'use client';

import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { KeyboardShortcuts } from '@/components/KeyboardShortcuts';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col overflow-x-hidden">
        <TopBar />
        <main className="flex min-h-0 flex-1 flex-col overflow-auto p-4 lg:p-6 xl:p-8">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
      <KeyboardShortcuts />
    </div>
  );
}
