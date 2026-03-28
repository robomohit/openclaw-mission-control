'use client';

import { useOpenClawStatus } from '@/lib/useOpenClawStatus';

function formatUpdatedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-CA', {
    timeZone: 'America/Vancouver',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function SessionsPage() {
  const { sessions, health } = useOpenClawStatus();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Sessions</h1>
        <p className="mt-1 text-sm text-slate-500">
          OpenClaw gateway:{' '}
          <span
            className={
              health.status === 'up'
                ? 'text-emerald-400'
                : health.status === 'down'
                  ? 'text-rose-400'
                  : 'text-slate-400'
            }
          >
            {health.loading ? 'checking…' : health.status}
          </span>
        </p>
      </div>

      {sessions.error && (
        <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {sessions.error}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400">
              <th className="px-4 py-3 font-medium">Agent</th>
              <th className="px-4 py-3 font-medium">Session</th>
              <th className="px-4 py-3 font-medium">Updated</th>
              <th className="px-4 py-3 font-medium">Model</th>
            </tr>
          </thead>
          <tbody>
            {sessions.loading && sessions.data.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  Loading sessions…
                </td>
              </tr>
            ) : sessions.data.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  No sessions yet.
                </td>
              </tr>
            ) : (
              sessions.data.map(row => (
                <tr
                  key={row.sessionKey}
                  className="border-b border-slate-800/80 last:border-0 hover:bg-slate-800/30"
                >
                  <td className="px-4 py-3 font-mono text-xs text-slate-200">{row.agentId}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">{row.sessionId}</td>
                  <td className="px-4 py-3 text-slate-200">{formatUpdatedAt(row.updatedAt)}</td>
                  <td className="px-4 py-3 text-slate-300">{row.model ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
