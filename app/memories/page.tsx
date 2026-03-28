'use client';

import { useStore } from '@/lib/store';
import { MemoryCard } from '@/components/MemoryCard';
import { useState } from 'react';

export default function MemoriesPage() {
  const { memories } = useStore();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'all' | 'daily' | 'long'>('all');

  const filtered = memories.filter(m => {
    if (type !== 'all' && m.kind !== type) return false;
    if (search && !m.content.toLowerCase().includes(search.toLowerCase()) && !m.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-100">Memories</h1>
        <div className="flex gap-2">
          <input type="text" placeholder="Search memories..." className="bg-slate-800 text-slate-100 border border-slate-700 rounded px-3 py-2 w-64" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="bg-slate-800 text-slate-100 border border-slate-700 rounded px-3 py-2" value={type} onChange={e => setType(e.target.value as any)}>
            <option value="all">All Types</option>
            <option value="daily">Daily Logs</option>
            <option value="long">Long-Term</option>
          </select>
        </div>
      </div>
      <div className="space-y-4">
        {filtered.map(memory => (
          <MemoryCard key={memory.id} memory={memory} />
        ))}
      </div>
    </div>
  );
}
