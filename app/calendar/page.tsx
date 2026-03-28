'use client';

import { useStore } from '@/lib/store';
import { CalendarGrid, calendarLegend } from '@/components/CalendarGrid';
import { EventEditorModal } from '@/components/EventEditorModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { EmptyState } from '@/components/EmptyState';
import { useState } from 'react';
import type { CalendarEvent } from '@/lib/types';
import { Calendar, ChevronLeft, ChevronRight, Plus } from 'lucide-react';

export default function CalendarPage() {
  const { calendarEvents: events } = useStore();
  const [view, setView] = useState<'day' | 'week' | 'month'>('month');
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const navigate = (dir: -1 | 1) => {
    const d = new Date(anchorDate);
    if (view === 'day') d.setDate(d.getDate() + dir);
    else if (view === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setAnchorDate(d);
  };

  const legend = calendarLegend();

  return (
    <ErrorBoundary fallbackTitle="Calendar crashed">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-100">Calendar</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAnchorDate(new Date())}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700"
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate(1)}
              className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700"
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-slate-200">
              {anchorDate.toLocaleDateString(undefined, {
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingEvent(null);
                setEditorOpen(true);
              }}
              className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Event
            </button>
            {(['day', 'week', 'month'] as const).map((v) => (
              <button
                key={v}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  view === v
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
                onClick={() => setView(v)}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
          {legend.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${l.cls}`} />
              {l.label}
            </span>
          ))}
        </div>

        {events.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No events"
            message="Schedule your first event to see it on the calendar."
          />
        ) : (
          <CalendarGrid
            view={view}
            anchorDate={anchorDate}
            events={events}
            onSelectEvent={(ev) => {
              setEditingEvent(ev);
              setEditorOpen(true);
            }}
          />
        )}

        <EventEditorModal
          open={editorOpen}
          initial={editingEvent}
          onClose={() => {
            setEditorOpen(false);
            setEditingEvent(null);
          }}
        />
      </div>
    </ErrorBoundary>
  );
}
