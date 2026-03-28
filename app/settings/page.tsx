'use client';

import { useCallback, useState } from 'react';

export default function SettingsPage() {
  const [readPath, setReadPath] = useState('memory/2026-03-27.md');
  const [readResult, setReadResult] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [gitResult, setGitResult] = useState<string | null>(null);
  const [gitError, setGitError] = useState<string | null>(null);
  const [loadingRead, setLoadingRead] = useState(false);
  const [loadingGit, setLoadingGit] = useState(false);

  const tryRead = useCallback(async () => {
    setReadError(null);
    setReadResult(null);
    setLoadingRead(true);
    try {
      const q = new URLSearchParams({ path: readPath.trim() });
      const res = await fetch(`/api/tools/read?${q}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setReadError(typeof data.error === 'string' ? data.error : res.statusText);
        return;
      }
      setReadResult(typeof data.content === 'string' ? data.content : JSON.stringify(data, null, 2));
    } catch (e) {
      setReadError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLoadingRead(false);
    }
  }, [readPath]);

  const tryGitStatus = useCallback(async () => {
    setGitError(null);
    setGitResult(null);
    setLoadingGit(true);
    try {
      const res = await fetch('/api/tools/git-status');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGitError(typeof data.error === 'string' ? data.error : res.statusText);
        return;
      }
      const lines = Array.isArray(data.lines) ? data.lines : [];
      setGitResult(lines.length ? lines.join('\n') : '(clean — no porcelain lines)');
    } catch (e) {
      setGitError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLoadingGit(false);
    }
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">Settings</h1>

      <p className="text-sm text-slate-500 max-w-3xl">
        Theme, model, refresh interval, and notification toggles below are{' '}
        <span className="text-slate-400">local UI only</span> — they are not saved to a backend or agent config yet.
      </p>

      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <div className="font-medium text-slate-100">Theme</div>
              <div className="text-sm text-slate-400">Current: Dark (Slate)</div>
            </div>
            <select className="bg-slate-900 text-slate-100 border border-slate-700 rounded px-3 py-2">
              <option>Dark Slate</option>
              <option>Light</option>
            </select>
          </div>
          <div className="flex justify-between items-center">
            <div>
              <div className="font-medium text-slate-100">Agent Model</div>
              <div className="text-sm text-slate-400">Placeholder default (not wired to OpenClaw)</div>
            </div>
            <input type="text" defaultValue="openrouter/stepfun/step-3.5-flash:free" className="bg-slate-900 text-slate-100 border border-slate-700 rounded px-3 py-2 w-80" />
          </div>
          <div className="flex justify-between items-center">
            <div>
              <div className="font-medium text-slate-100">Auto-refresh</div>
              <div className="text-sm text-slate-400">Not connected to the app refresh loop yet</div>
            </div>
            <input type="number" defaultValue={30} className="bg-slate-900 text-slate-100 border border-slate-700 rounded px-3 py-2 w-20" />
          </div>
          <div className="flex justify-between items-center">
            <div>
              <div className="font-medium text-slate-100">Notifications</div>
              <div className="text-sm text-slate-400">In-app alerts for task assignments</div>
            </div>
            <input type="checkbox" defaultChecked className="w-5 h-5 accent-indigo-500" />
          </div>
          <div className="flex justify-between items-center">
            <div>
              <div className="font-medium text-slate-100">Data Storage</div>
              <div className="text-sm text-slate-400">Where Mission Control stores its data</div>
            </div>
            <div className="text-slate-300">Local JSON files (<code className="text-slate-400">data/*.json</code>)</div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl p-6 border border-amber-900/50 border-slate-700">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <h2 className="text-lg font-semibold text-slate-100">Workspace tools</h2>
          <span className="text-xs font-medium uppercase tracking-wide rounded-full bg-amber-500/15 text-amber-300 px-2 py-0.5 ring-1 ring-amber-500/40">
            Experimental
          </span>
          <span className="text-xs text-slate-500">Local API only · no auth · same machine as the dev server</span>
        </div>
        <p className="text-sm text-slate-400 mb-4">
          These endpoints read from the OpenClaw git workspace (folder with <code className="text-slate-500">.git</code>, or{' '}
          <code className="text-slate-500">MISSION_CONTROL_WORKSPACE_ROOT</code>). Paths cannot escape the workspace;{' '}
          <code className="text-slate-500">.git</code> and <code className="text-slate-500">node_modules</code> are blocked.
        </p>

        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium text-slate-200 mb-1">
              <code className="text-sky-400">GET /api/tools/read?path=…</code>
            </div>
            <p className="text-xs text-slate-500 mb-2">UTF-8 text only, max 512KB. Relative path from workspace root.</p>
            <div className="flex flex-wrap gap-2 items-center">
              <input
                type="text"
                value={readPath}
                onChange={(e) => setReadPath(e.target.value)}
                className="flex-1 min-w-[12rem] bg-slate-900 text-slate-100 border border-slate-700 rounded px-3 py-2 font-mono text-sm"
                placeholder="memory/2026-03-27.md"
              />
              <button
                type="button"
                onClick={tryRead}
                disabled={loadingRead}
                className="rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm px-4 py-2"
              >
                {loadingRead ? 'Reading…' : 'Try read'}
              </button>
            </div>
            {readError && <p className="mt-2 text-sm text-rose-400">{readError}</p>}
            {readResult !== null && (
              <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-slate-950 border border-slate-700 p-3 text-xs text-slate-300 whitespace-pre-wrap">
                {readResult}
              </pre>
            )}
          </div>

          <div className="border-t border-slate-700 pt-4">
            <div className="text-sm font-medium text-slate-200 mb-1">
              <code className="text-sky-400">GET /api/tools/git-status</code>
            </div>
            <p className="text-xs text-slate-500 mb-2">Runs <code className="text-slate-500">git status --porcelain</code> in the workspace root; response is a JSON array field <code className="text-slate-500">lines</code>.</p>
            <button
              type="button"
              onClick={tryGitStatus}
              disabled={loadingGit}
              className="rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-100 text-sm px-4 py-2"
            >
              {loadingGit ? 'Running…' : 'Try git status'}
            </button>
            {gitError && <p className="mt-2 text-sm text-rose-400">{gitError}</p>}
            {gitResult !== null && (
              <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-slate-950 border border-slate-700 p-3 text-xs text-slate-300 whitespace-pre-wrap">
                {gitResult}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
