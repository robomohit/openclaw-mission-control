'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Calendar,
  Cpu,
  FileText,
  Home,
  LayoutGrid,
  MessageSquare,
  Settings,
  Sparkles,
  Users,
  BookOpen,
  Briefcase,
  Zap,
} from 'lucide-react';

import { cn } from '@/lib/utils';

const nav = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/tasks', label: 'Task Board', icon: LayoutGrid },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/projects', label: 'Projects', icon: Briefcase },
  { href: '/memories', label: 'Memories', icon: BookOpen },
  { href: '/docs', label: 'Docs', icon: FileText },
  { href: '/team', label: 'Team', icon: Users },
  { href: '/office', label: 'Office', icon: Cpu },
  { href: '/chat', label: 'Live run', icon: Zap },
  { href: '/sessions', label: 'Sessions', icon: MessageSquare },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-slate-800/80 bg-slate-900/50 backdrop-blur">
      <div className="flex items-center gap-2 border-b border-slate-800/80 px-4 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/15 ring-1 ring-sky-500/30">
          <Sparkles className="h-5 w-5 text-sky-400" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight text-slate-50">
            Mission Control
          </p>
          <p className="text-xs text-slate-500">OpenClaw dashboard</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {nav.map(({ href, label, icon: Icon }) => {
          const active =
            href === '/'
              ? pathname === '/'
              : pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-slate-800 text-slate-50 ring-1 ring-slate-700/80'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100',
              )}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-800/80 p-3 text-xs text-slate-500">
        Localhost · in-memory store
      </div>
    </aside>
  );
}
