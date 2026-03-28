'use client';

import { motion } from 'framer-motion';
import { Bot, Copy, FileText, Folder } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { DocEntry } from '@/lib/types';
import { formatShortDate, useMissionControl } from '@/lib/store';

const kindLabels: Record<DocEntry['kind'], string> = {
  planning: 'Planning',
  architecture: 'Architecture',
  prd: 'PRD',
  draft: 'Draft',
  research: 'Research',
  content: 'Content',
};

export function DocCard({
  doc,
  selected,
  onSelect,
}: {
  doc: DocEntry;
  selected?: boolean;
  onSelect?: (id: string) => void;
}) {
  const { getProject, getAgent } = useMissionControl();
  const project = doc.projectId ? getProject(doc.projectId) : undefined;
  const agent = doc.agentId ? getAgent(doc.agentId) : undefined;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'cursor-pointer rounded-2xl border bg-slate-900/70 p-4 shadow-md shadow-black/20 ring-1 transition hover:border-slate-600',
        selected
          ? 'border-sky-500/60 ring-sky-500/30'
          : 'border-slate-800 ring-white/5',
      )}
      onClick={() => onSelect?.(doc.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect?.(doc.id);
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 ring-1 ring-indigo-500/30">
            <FileText className="h-5 w-5 text-indigo-300" aria-hidden />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {kindLabels[doc.kind]} · {doc.category}
            </p>
            <h3 className="mt-1 text-sm font-semibold text-slate-50">
              {doc.title}
            </h3>
          </div>
        </div>
        <span className="text-[11px] text-slate-500">
          {formatShortDate(doc.updatedAt)}
        </span>
      </div>

      <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-slate-400">
        {doc.body}
      </p>

      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
        {project && (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-800/80 px-2 py-0.5 text-slate-300 ring-1 ring-slate-700/70">
            <Folder className="h-3 w-3" aria-hidden />
            {project.name}
          </span>
        )}
        {agent && (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-800/80 px-2 py-0.5 text-slate-300 ring-1 ring-slate-700/70">
            <Bot className="h-3 w-3" aria-hidden />
            {agent.name}
          </span>
        )}
      </div>

      {doc.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {doc.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-slate-800/70 px-2 py-0.5 text-[10px] text-slate-400 ring-1 ring-slate-700/60"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-800 pt-3">
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/50 px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-800"
          onClick={(e) => {
            e.stopPropagation();
            void navigator.clipboard.writeText(doc.body);
          }}
        >
          <Copy className="h-3.5 w-3.5" aria-hidden />
          Copy body
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/50 px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-800"
          onClick={(e) => {
            e.stopPropagation();
            void navigator.clipboard.writeText(
              `mission-control:doc:${doc.id} — ${doc.title}`,
            );
          }}
        >
          Copy link id
        </button>
      </div>
    </motion.article>
  );
}
