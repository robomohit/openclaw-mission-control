'use client';

import { useStore } from '@/lib/store';
import { CalendarGrid } from '@/components/CalendarGrid';
import { useState } from 'react';

export default function CalendarPage() {
  const { calendarEvents: events } = useStore();
  const [view, setView] = useState<'day' | 'week' | 'month'>('month');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">Calendar</h1>
        <div className="flex gap-2">
          <button className={`px-3 py-1 rounded ${view === 'day' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300'}`} onClick={() => setView('day')}>Day</button>
          <button className={`px-3 py-1 rounded ${view === 'week' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300'}`} onClick={() => setView('week')}>Week</button>
          <button className={`px-3 py-1 rounded ${view === 'month' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300'}`} onClick={() => setView('month')}>Month</button>
        </div>
      </div>
      <CalendarGrid view={view} anchorDate={new Date()} events={events} />
    </div>
  );
}
