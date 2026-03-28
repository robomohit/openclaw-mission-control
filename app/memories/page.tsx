'use client';

import { useStore } from '@/lib/store';
import { MemoryCard } from '@/components/MemoryCard';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { EmptyState } from '@/components/EmptyState';
import { useState } from 'react';
import { BookOpen, Search } from 'lucide-react';

export default function MemoriesPage() {
  const { memories } = useStore();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'all' | 'daily' | 'long_term'>('all');

  const filtered = memories.filter(m => {
    if (type !== 'all' && m.kind !== type) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !m.content.toLowerCase().includes(q) &&
        !m.title.toLowerCase().includes(q) &&
        !m.tags.some(t => t.toLowerCase().includes(q))
      ) {
        return false;
      }
    }
    return true;
  });

  return (
    <ErrorBoundary fallbackTitle="Memories crashed">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-100">Memories</h1>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search memories..."
                className="bg-slate-800 text-slate-100 border border-slate-700 rounded-lg pl-9 pr-3 py-2 w-64 text-sm"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className="bg-slate-800 text-slate-100 border border-slate-700 rounded-lg px-3 py-2 text-sm"
              value={type}
              onChange={e => setType(e.target.value as typeof type)}
            >
              <option value="all">All Types</option>
              <option value="daily">Daily Logs</option>
              <option value="long_term">Long-Term</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={search ? 'No matching memories' : 'No memories yet'}
            message={search ? 'Try adjusting your search query.' : 'Agent memories will appear here as they are created.'}
          />
        ) : (
          <div className="space-y-4">
            {filtered.map(memory => (
              <MemoryCard key={memory.id} memory={memory} />
            ))}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
