'use client';

import { useStore } from '@/lib/store';
import { DocCard } from '@/components/DocCard';
import { useState } from 'react';

export default function DocsPage() {
  const { docs } = useStore();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('');

  const filtered = docs.filter(d => {
    if (category && d.category !== category) return false;
    if (search && !d.title.toLowerCase().includes(search.toLowerCase()) && !d.body.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const categories = Array.from(new Set(docs.map(d => d.category)));

  return (
    <div className="p-6 space-y-6">
      <div
        className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-slate-300"
        role="note"
      >
        <span className="mr-2 inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-amber-300 ring-1 ring-amber-500/35">
          Experimental
        </span>
        Cards below are{' '}
        <span className="font-medium text-slate-200">snapshots from Mission Control state</span> (JSON), not a live mirror of files on disk. To read real workspace text files from the server, use{' '}
        <a href="/settings" className="text-sky-400 hover:underline">
          Settings → Workspace tools
        </a>{' '}
        (<code className="text-slate-500">GET /api/tools/read</code>). Suggested custom tools in state are ideas only until implemented.
      </div>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-100">Docs</h1>
        <div className="flex gap-2">
          <input type="text" placeholder="Search docs..." className="bg-slate-800 text-slate-100 border border-slate-700 rounded px-3 py-2 w-64" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="bg-slate-800 text-slate-100 border border-slate-700 rounded px-3 py-2" value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(doc => (
          <DocCard key={doc.id} doc={doc} />
        ))}
      </div>
    </div>
  );
}
