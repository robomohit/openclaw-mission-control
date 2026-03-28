'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[200px] items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-rose-400" />
            <h2 className="mt-3 text-lg font-semibold text-slate-100">
              {this.props.fallbackTitle ?? 'Something went wrong'}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {this.state.error?.message ?? 'An unexpected error occurred.'}
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
            >
              <RefreshCw className="h-4 w-4" />
              Reload Screen
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
