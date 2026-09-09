import React from 'react';
import { Stats } from '../types';
import { RefreshCw, Terminal, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface HeaderTelemetryProps {
  stats: Stats | null;
  isSyncing: boolean;
  onSync: () => void;
}

export const HeaderTelemetry: React.FC<HeaderTelemetryProps> = ({ stats, isSyncing, onSync }) => {
  const formatTime = (isoString?: string | null) => {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    const diffMins = Math.floor(diffSeconds / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ago`;
  };

  return (
    <header className="border-b border-border-subtle bg-surface px-6 py-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Brand & System Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center border border-border-bold bg-base text-text-primary">
            <Terminal className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-lg font-bold tracking-tight text-text-primary uppercase">
                OSS Command Center
              </h1>
              <span className="border border-border-bold bg-surface-elevated px-1.5 py-0.5 font-telemetry text-[10px] text-text-muted">
                v1.0.0
              </span>
            </div>
            <p className="font-telemetry text-xs text-text-muted">
              MULTI-PLATFORM TRIAGE & MERGE DECK // GITHUB & GITLAB
            </p>
          </div>
        </div>

        {/* Real Metrics Readout */}
        <div className="flex flex-wrap items-center gap-2 md:gap-4 font-telemetry text-xs">
          <div className="flex items-center gap-2 border border-border-subtle bg-base px-3 py-1.5">
            <span className="text-text-muted">TRACKED:</span>
            <span className="font-bold text-text-primary">{stats?.total ?? 0}</span>
          </div>

          <div className="flex items-center gap-2 border border-border-subtle bg-base px-3 py-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-status-action-needed" />
            <span className="text-text-muted">ACTION NEEDED:</span>
            <span className={`font-bold ${stats?.actionNeeded ? 'text-status-action-needed' : 'text-text-primary'}`}>
              {stats?.actionNeeded ?? 0}
            </span>
          </div>

          <div className="flex items-center gap-2 border border-border-subtle bg-base px-3 py-1.5">
            <Clock className="h-3.5 w-3.5 text-status-awaiting-reply" />
            <span className="text-text-muted">AWAITING REVIEW:</span>
            <span className="font-bold text-text-primary">{stats?.awaitingMaintainer ?? 0}</span>
          </div>

          <div className="flex items-center gap-2 border border-border-subtle bg-base px-3 py-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-status-merged" />
            <span className="text-text-muted">MERGED:</span>
            <span className="font-bold text-status-merged">{stats?.merged ?? 0}</span>
          </div>

          {/* Sync Trigger & Time */}
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="flex items-center gap-2 border border-border-bold bg-surface-elevated px-3 py-1.5 font-telemetry text-xs hover:border-border-active hover:bg-surface-active disabled:opacity-50 transition-colors"
            title="Manual sync now"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-text-secondary ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="text-text-secondary">
              {isSyncing ? 'SYNCING...' : `SYNCED ${formatTime(stats?.lastSync)}`}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
