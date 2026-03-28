'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

import { cn } from '@/lib/utils';
import type { CalendarEvent } from '@/lib/types';

export type CalendarViewMode = 'day' | 'week' | 'month';

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function startOfWeekMonday(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = (day + 6) % 7;
  return addDays(x, -diff);
}

function monthMatrix(anchor: Date): Date[][] {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const first = new Date(year, month, 1);
  const start = startOfWeekMonday(first);
  const weeks: Date[][] = [];
  let cur = new Date(start);
  for (let w = 0; w < 6; w++) {
    const row: Date[] = [];
    for (let d = 0; d < 7; d++) {
      row.push(new Date(cur));
      cur = addDays(cur, 1);
    }
    weeks.push(row);
  }
  return weeks;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function eventSpansDay(ev: CalendarEvent, day: Date): boolean {
  const s = new Date(ev.start);
  const e = new Date(ev.end);
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);
  return s < dayEnd && e > dayStart;
}

const kindDot: Record<CalendarEvent['kind'], string> = {
  human_task: 'bg-sky-400',
  agent_automation: 'bg-violet-400',
  cron: 'bg-amber-400',
  recurring: 'bg-emerald-400',
  proactive: 'bg-fuchsia-400',
};

export function CalendarGrid({
  view,
  anchorDate,
  events,
  onSelectEvent,
}: {
  view: CalendarViewMode;
  anchorDate: Date;
  events: CalendarEvent[];
  onSelectEvent?: (ev: CalendarEvent) => void;
}) {
  if (view === 'month') {
    return (
      <MonthView
        anchorDate={anchorDate}
        events={events}
        onSelectEvent={onSelectEvent}
      />
    );
  }
  if (view === 'week') {
    return (
      <WeekView
        anchorDate={anchorDate}
        events={events}
        onSelectEvent={onSelectEvent}
      />
    );
  }
  return (
    <DayView
      anchorDate={anchorDate}
      events={events}
      onSelectEvent={onSelectEvent}
    />
  );
}

function DayView({
  anchorDate,
  events,
  onSelectEvent,
}: {
  anchorDate: Date;
  events: CalendarEvent[];
  onSelectEvent?: (ev: CalendarEvent) => void;
}) {
  const dayEvents = useMemo(
    () => events.filter((e) => eventSpansDay(e, anchorDate)),
    [events, anchorDate],
  );

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 ring-1 ring-white/5">
      <p className="text-sm font-medium text-slate-200">
        {anchorDate.toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })}
      </p>
      <div className="mt-4 space-y-2">
        {dayEvents.length === 0 && (
          <p className="text-sm text-slate-500">No events this day.</p>
        )}
        {dayEvents.map((ev) => (
          <EventRow key={ev.id} ev={ev} onSelect={onSelectEvent} />
        ))}
      </div>
    </div>
  );
}

function WeekView({
  anchorDate,
  events,
  onSelectEvent,
}: {
  anchorDate: Date;
  events: CalendarEvent[];
  onSelectEvent?: (ev: CalendarEvent) => void;
}) {
  const start = startOfWeekMonday(anchorDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40 ring-1 ring-white/5">
      <div className="grid min-w-[720px] grid-cols-7 divide-x divide-slate-800">
        {days.map((d) => {
          const list = events.filter((e) => eventSpansDay(e, d));
          return (
            <div key={d.toISOString()} className="p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                {d.toLocaleDateString(undefined, { weekday: 'short' })}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-100">
                {d.getDate()}
              </p>
              <div className="mt-3 space-y-2">
                {list.map((ev) => (
                  <motion.button
                    key={ev.id}
                    type="button"
                    layout
                    onClick={() => onSelectEvent?.(ev)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1.5 text-left text-[11px] text-slate-200 ring-1 ring-white/5 transition hover:border-slate-600"
                  >
                    <span
                      className={cn(
                        'mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle',
                        kindDot[ev.kind],
                      )}
                    />
                    <span className="align-middle">{ev.title}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthView({
  anchorDate,
  events,
  onSelectEvent,
}: {
  anchorDate: Date;
  events: CalendarEvent[];
  onSelectEvent?: (ev: CalendarEvent) => void;
}) {
  const weeks = monthMatrix(anchorDate);
  const month = anchorDate.getMonth();

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40 ring-1 ring-white/5">
      <div className="grid min-w-[720px] grid-cols-7 border-b border-slate-800 text-center text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="px-2 py-2">
            {d}
          </div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div
          key={wi}
          className="grid min-w-[720px] grid-cols-7 border-b border-slate-800/80 last:border-b-0"
        >
          {week.map((day) => {
            const inMonth = day.getMonth() === month;
            const list = events.filter((e) => eventSpansDay(e, day));
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'min-h-[110px] border-r border-slate-800/80 p-2 last:border-r-0',
                  !inMonth && 'bg-slate-950/40 text-slate-600',
                )}
              >
                <p
                  className={cn(
                    'text-xs font-semibold',
                    inMonth ? 'text-slate-200' : 'text-slate-600',
                  )}
                >
                  {day.getDate()}
                </p>
                <div className="mt-1 space-y-1">
                  {list.slice(0, 3).map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => onSelectEvent?.(ev)}
                      className="flex w-full items-center gap-1 rounded-md bg-slate-800/80 px-1.5 py-0.5 text-left text-[10px] text-slate-200 ring-1 ring-slate-700/70 hover:bg-slate-800"
                    >
                      <span
                        className={cn(
                          'h-1.5 w-1.5 shrink-0 rounded-full',
                          kindDot[ev.kind],
                        )}
                      />
                      <span className="truncate">{ev.title}</span>
                    </button>
                  ))}
                  {list.length > 3 && (
                    <p className="text-[10px] text-slate-500">
                      +{list.length - 3} more
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function EventRow({
  ev,
  onSelect,
}: {
  ev: CalendarEvent;
  onSelect?: (ev: CalendarEvent) => void;
}) {
  return (
    <motion.button
      type="button"
      layout
      onClick={() => onSelect?.(ev)}
      className="flex w-full items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-left ring-1 ring-white/5 transition hover:border-slate-600"
    >
      <span
        className={cn(
          'mt-1 h-2 w-2 shrink-0 rounded-full',
          kindDot[ev.kind],
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-100">{ev.title}</p>
        <p className="text-[11px] text-slate-500">
          {new Date(ev.start).toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
          })}{' '}
          –{' '}
          {new Date(ev.end).toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </motion.button>
  );
}

export function calendarLegend(): { label: string; cls: string }[] {
  return [
    { label: 'Human task', cls: kindDot.human_task },
    { label: 'Agent automation', cls: kindDot.agent_automation },
    { label: 'Cron', cls: kindDot.cron },
    { label: 'Recurring', cls: kindDot.recurring },
    { label: 'Proactive', cls: kindDot.proactive },
  ];
}

export { startOfDay, addDays };
