'use client';

import Link from 'next/link';
import { Inbox } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export function EmptyState({
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  message,
  actionLabel,
  actionHref,
}: {
  icon?: LucideIcon;
  title?: string;
  message?: string;
  /** Optional link label for a call-to-action (e.g. "Go to Settings"). */
  actionLabel?: string;
  /** href for the action link. */
  actionHref?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800/60 ring-1 ring-slate-700/60">
        <Icon className="h-7 w-7 text-slate-500" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-300">{title}</h3>
      {message && (
        <p className="mt-1 max-w-xs text-xs text-slate-500">{message}</p>
      )}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-3 text-xs font-medium text-sky-400 hover:text-sky-300 underline underline-offset-2"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
