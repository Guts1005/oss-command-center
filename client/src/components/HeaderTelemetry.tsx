import React from 'react';
import { Stats } from '../types';
import { RefreshCw, GitMerge, CheckCircle2, AlertCircle, Clock, PlusCircle, HelpCircle } from 'lucide-react';

interface HeaderTelemetryProps {
  stats: Stats | null;
  isSyncing: boolean;
  onSync: () => void;
  onOpenTrackModal?: () => void;
  onOpenGuideModal?: () => void;
}

export const HeaderTelemetry: React.FC<HeaderTelemetryProps> = ({
  stats,
  isSyncing,
  onSync,
  onOpenTrackModal,
  onOpenGuideModal,
}) => {
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
    <header className="border-b border-border-subtle bg-surface px-6 py-3.5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Brand & System Title */}
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-border-bold bg-base text-status-awaiting-reply">
            <GitMerge className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl md:text-2xl font-bold tracking-tight text-text-primary uppercase">
                OSS Command Center
              </h1>
              <span className="border border-border-bold bg-surface-elevated px-1.5 py-0.2 font-telemetry text-[9px] font-semibold text-text-muted">
                v1.1
              </span>
            </div>
            <p className="font-telemetry text-xs text-text-muted mt-0.5">
              Open Source Contribution Hub // Track, Triage & Merge on GitHub & GitLab
            </p>
          </div>
        </div>

        {/* Action Controls & Metrics */}
        <div className="flex flex-wrap items-center gap-2.5 font-telemetry text-xs">
          {/* Track Contribution Primary Button */}
          {onOpenTrackModal && (
            <button
              onClick={onOpenTrackModal}
              className="flex items-center gap-1.5 border border-status-awaiting-reply/60 bg-status-awaiting-reply/15 px-3 py-1.5 font-bold text-status-awaiting-reply hover:bg-status-awaiting-reply/25 transition-colors shadow-sm"
              title="Add a new PR or Issue by URL"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>+ Track PR / Issue</span>
            </button>
          )}

          {/* Quick Guide & Status Legend */}
          {onOpenGuideModal && (
            <button
              onClick={onOpenGuideModal}
              className="flex items-center gap-1.5 border border-border-bold bg-surface-elevated px-3 py-1.5 text-text-secondary hover:border-border-active hover:text-white transition-colors"
              title="Open quick guide and status legend"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Quick Guide (?)</span>
            </button>
          )}

          {/* Action Needed Badge */}
          <div
            className={`flex items-center gap-1.5 border px-3 py-1.5 ${
              stats?.actionNeeded
                ? 'border-status-action-needed/50 bg-status-action-needed/10 text-status-action-needed'
                : 'border-border-subtle bg-base text-text-muted'
            }`}
            title="Items requiring your response or code updates"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            <span>ACTION NEEDED:</span>
            <span className="font-bold">{stats?.actionNeeded ?? 0}</span>
          </div>

          {/* Awaiting Review Badge */}
          <div
            className="flex items-center gap-1.5 border border-border-subtle bg-base px-3 py-1.5 text-text-secondary"
            title="Items waiting on maintainer review"
          >
            <Clock className="h-3.5 w-3.5 text-status-awaiting-reply" />
            <span className="text-text-muted">IN REVIEW:</span>
            <span className="font-bold text-text-primary">{stats?.awaitingMaintainer ?? 0}</span>
          </div>

          {/* Merged Badge */}
          <div
            className="flex items-center gap-1.5 border border-border-subtle bg-base px-3 py-1.5 text-status-merged"
            title="Contributions merged into upstream"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="text-text-muted">MERGED:</span>
            <span className="font-bold">{stats?.merged ?? 0}</span>
          </div>

          {/* Sync Button */}
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 border border-border-bold bg-surface-elevated px-3 py-1.5 hover:border-border-active hover:bg-surface-active disabled:opacity-50 transition-colors"
            title="Synchronize with GitHub & GitLab"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-text-secondary ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="text-text-muted">
              {isSyncing ? 'SYNCING...' : `SYNCED ${formatTime(stats?.lastSync)}`}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
