'use client';

import { MissionControlProvider } from '@/lib/store';

export function Providers({ children }: { children: React.ReactNode }) {
  return <MissionControlProvider>{children}</MissionControlProvider>;
}
