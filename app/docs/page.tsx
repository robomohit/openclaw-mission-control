'use client';

import { useStore } from '@/lib/store';
import { DocCard } from '@/components/DocCard';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { EmptyState } from '@/components/EmptyState';
import { useState } from 'react';
import { FileText, Search } from 'lucide-react';

export default function DocsPage() {
  const { docs } = useStore();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const filtered = docs.filter(d => {
    if (category && d.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!d.title.toLowerCase().includes(q) && !d.body.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const categories = Array.from(new Set(docs.map(d => d.category)));
  const selectedDoc = docs.find(d => d.id === selectedDocId);

  return (
    <ErrorBoundary fallbackTitle="Docs crashed">
      <div className="space-y-6">
        <div
          className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-slate-300"
          role="note"
        >
          <span className="mr-2 inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-amber-300 ring-1 ring-amber-500/35">
            Experimental
          </span>
          Cards below are{' '}
          <span className="font-medium text-slate-200">snapshots from Mission Control state</span> (JSON), not a live mirror of files on disk.
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-100">Docs</h1>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search docs..."
                className="bg-slate-800 text-slate-100 border border-slate-700 rounded-lg pl-9 pr-3 py-2 w-64 text-sm"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className="bg-slate-800 text-slate-100 border border-slate-700 rounded-lg px-3 py-2 text-sm"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={search ? 'No matching docs' : 'No docs yet'}
            message={search ? 'Try adjusting your search query.' : 'Document snapshots will appear here.'}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map(doc => (
              <DocCard
                key={doc.id}
                doc={doc}
                selected={selectedDocId === doc.id}
                onSelect={(id) => setSelectedDocId(prev => prev === id ? null : id)}
              />
            ))}
          </div>
        )}

        {selectedDoc && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-slate-100">{selectedDoc.title}</h2>
              <button
                type="button"
                onClick={() => setSelectedDocId(null)}
                className="text-sm text-slate-400 hover:text-slate-200"
              >
                Close
              </button>
            </div>
            <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-4 text-sm text-slate-300 border border-slate-800">
              {selectedDoc.body}
            </pre>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
