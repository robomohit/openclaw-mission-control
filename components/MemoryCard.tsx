'use client';

import { motion } from 'framer-motion';
import { BookMarked, Calendar, Link2, User } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { MemoryEntry } from '@/lib/types';

export function MemoryCard({
  memory,
  dense,
}: {
  memory: MemoryEntry;
  dense?: boolean;
}) {
  const kindLabel =
    memory.kind === 'daily' ? 'Daily log' : 'Long-term memory';

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-md shadow-black/25 ring-1 ring-white/5',
        dense && 'p-4',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {kindLabel}
          </p>
          <h3 className="mt-1 text-base font-semibold text-slate-50">
            {memory.title}
          </h3>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-800/90 px-3 py-1 text-[11px] text-slate-300 ring-1 ring-slate-700/80">
          <Calendar className="h-3.5 w-3.5" aria-hidden />
          {memory.date}
        </span>
      </div>

      <p
        className={cn(
          'mt-3 text-sm leading-relaxed text-slate-300',
          dense ? 'line-clamp-4' : 'line-clamp-6',
        )}
      >
        {memory.content}
      </p>

      <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1 rounded-md bg-slate-800/80 px-2 py-0.5 text-slate-300 ring-1 ring-slate-700/70">
          <User className="h-3 w-3" aria-hidden />
          {memory.person}
        </span>
        <span className="rounded-md bg-slate-800/60 px-2 py-0.5 text-slate-400 ring-1 ring-slate-700/60">
          {memory.topic}
        </span>
      </div>

      {memory.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {memory.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-slate-800/80 px-2.5 py-0.5 text-[11px] text-slate-400 ring-1 ring-slate-700/60"
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-800 pt-3 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1">
          <Link2 className="h-3 w-3" aria-hidden />
          Projects {memory.linkedProjectIds.length}
        </span>
        <span>Docs {memory.linkedDocIds.length}</span>
        <span>Tasks {memory.linkedTaskIds.length}</span>
        <span className="inline-flex items-center gap-1 text-slate-600">
          <BookMarked className="h-3 w-3" aria-hidden />
          Reader view
        </span>
      </div>
    </motion.article>
  );
}
