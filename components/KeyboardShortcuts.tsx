'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Keyboard, X } from 'lucide-react';

const shortcuts: { keys: string; label: string; route?: string }[] = [
  { keys: 'g d', label: 'Go to Dashboard', route: '/' },
  { keys: 'g t', label: 'Go to Tasks', route: '/tasks' },
  { keys: 'g o', label: 'Go to Office', route: '/office' },
  { keys: 'g c', label: 'Go to Calendar', route: '/calendar' },
  { keys: 'g m', label: 'Go to Memories', route: '/memories' },
  { keys: 'g p', label: 'Go to Projects', route: '/projects' },
  { keys: 'g e', label: 'Go to Team', route: '/team' },
  { keys: 'g s', label: 'Go to Settings', route: '/settings' },
  { keys: 'g k', label: 'Go to Docs', route: '/docs' },
  { keys: '?', label: 'Show keyboard shortcuts' },
];

export function KeyboardShortcuts() {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);
  const [pendingG, setPendingG] = useState(false);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === 'Escape' && helpOpen) {
        setHelpOpen(false);
        return;
      }

      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setHelpOpen((o) => !o);
        return;
      }

      if (e.key === 'g' && !e.ctrlKey && !e.metaKey) {
        setPendingG(true);
        setTimeout(() => setPendingG(false), 1500);
        return;
      }

      if (pendingG) {
        setPendingG(false);
        const map: Record<string, string> = {
          d: '/',
          t: '/tasks',
          o: '/office',
          c: '/calendar',
          m: '/memories',
          p: '/projects',
          e: '/team',
          s: '/settings',
          k: '/docs',
        };
        const route = map[e.key];
        if (route) {
          e.preventDefault();
          router.push(route);
        }
      }
    },
    [pendingG, helpOpen, router],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  if (!helpOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/95 p-5 shadow-2xl ring-1 ring-white/10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-sky-400" />
            <h2 className="text-lg font-semibold text-slate-50">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setHelpOpen(false)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <ul className="mt-4 space-y-2">
          {shortcuts.map((s) => (
            <li
              key={s.keys}
              className="flex items-center justify-between rounded-lg bg-slate-950/50 px-3 py-2"
            >
              <span className="text-sm text-slate-300">{s.label}</span>
              <kbd className="rounded-md bg-slate-800 px-2 py-0.5 font-mono text-xs text-slate-300 ring-1 ring-slate-700">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-center text-xs text-slate-500">
          Press <kbd className="rounded bg-slate-800 px-1 text-slate-400">Esc</kbd> to close
        </p>
      </div>
    </div>
  );
}
