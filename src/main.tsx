import React, { StrictMode, Component, ReactNode, ErrorInfo } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare props: ErrorBoundaryProps;
  state: ErrorBoundaryState = { hasError: false, error: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled UI Exception caught by RootErrorBoundary:', error, errorInfo);

    // Auto-recover ONLY from genuine stale chunk / redeployment bundle mismatches
    const msg = error?.message || '';
    const isChunkError =
      msg.includes('dynamically imported module') ||
      msg.includes('Failed to load module script') ||
      msg.includes('error loading dynamically imported module') ||
      msg.includes('Importing a module script failed');

    if (isChunkError && typeof window !== 'undefined') {
      const alreadyReloaded = sessionStorage.getItem('tb_chunk_reloaded');
      if (!alreadyReloaded) {
        sessionStorage.setItem('tb_chunk_reloaded', '1');
        window.location.reload();
      }
    }
  }

  handleReload = () => {
    try {
      sessionStorage.removeItem('tb_chunk_reloaded');
    } catch (_) {}
    window.location.reload();
  };

  handleReset = () => {
    try {
      localStorage.removeItem('fitzaika_orders_cache');
      localStorage.removeItem('tb_active_dine_in_session');
      sessionStorage.clear();
    } catch (_) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-[#070A0D] text-white flex flex-col items-center justify-center p-6 text-center z-[99999]">
          <div className="max-w-md w-full bg-[#12181E] border border-amber-500/30 rounded-[32px] p-8 shadow-2xl space-y-6">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-lg">
              🔥
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-black uppercase tracking-wider text-amber-400">
                Taash Bhatti
              </h1>
              <p className="text-xs text-stone-300 leading-relaxed font-medium">
                The kitchen encounter a brief hitch while loading your feast. Tap reload below to resume immediately.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 bg-stone-900/90 rounded-xl border border-stone-800 text-[11px] text-stone-400 font-mono text-left max-h-24 overflow-y-auto break-all">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg cursor-pointer transition-all active:scale-[0.98]"
              >
                🔄 Reload Taash Bhatti
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full py-2.5 px-4 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs rounded-xl cursor-pointer transition-all"
              >
                Clear Stale Cache & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </StrictMode>,
  );
}
