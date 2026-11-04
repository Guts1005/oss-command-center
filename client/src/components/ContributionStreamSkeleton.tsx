import React from 'react';
import { Terminal, RefreshCw } from 'lucide-react';
import { Footer } from './Footer';
import { ViewMode } from '../types';

interface ContributionStreamSkeletonProps {
  count?: number;
  onNavigateView?: (mode: ViewMode) => void;
  onOpenCookiePreferences?: () => void;
}

export const ContributionStreamSkeleton: React.FC<ContributionStreamSkeletonProps> = ({
  count = 4,
  onNavigateView,
  onOpenCookiePreferences,
}) => {
  const skeletonItems = Array.from({ length: count }, (_, i) => i);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-base select-none">
      {/* Stream Section Header */}
      <div className="flex items-center justify-between px-1 pb-2 select-none">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-text-muted uppercase tracking-wider">
          <Terminal className="h-3.5 w-3.5 text-accent-sapphire shrink-0 animate-pulse" />
          <span className="flex items-center gap-2">
            <span>UPDATING STREAM...</span>
            <span className="inline-block h-2 w-2 rounded-full bg-accent-sapphire animate-ping" />
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-text-muted">
          <RefreshCw className="h-3 w-3 text-accent-sapphire animate-spin" />
          <span>FILTERING</span>
        </div>
      </div>

      {/* Top Stream Shimmer Progress Rule */}
      <div className="h-0.5 w-full bg-accent-sapphire/20 overflow-hidden mb-2 rounded-full">
        <div className="h-full w-2/5 bg-accent-sapphire rounded-full animate-pulse" />
      </div>

      {/* Skeleton Rows Container */}
      <div className="overflow-y-auto flex-1 px-1 pt-1 pb-28 sm:pb-4 space-y-2.5 stream-scroll-mask">
        {skeletonItems.map((key) => (
          <div
            key={`stream-skeleton-${key}`}
            className="border border-border-subtle/70 bg-surface-card p-4 sm:p-5 rounded-xl sm:rounded-2xl space-y-3 shadow-card skeleton-shimmer"
            aria-hidden="true"
          >
            {/* Top Tier: Badges and Repository Identification */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                {/* Platform Badge */}
                <div className="h-5 w-16 bg-surface-elevated rounded-md" />
                {/* Type Icon */}
                <div className="h-4 w-4 bg-surface-elevated rounded" />
                {/* Repo Identifier */}
                <div
                  className="h-5 bg-surface-elevated rounded-md"
                  style={{ width: `${140 + (key % 3) * 35}px` }}
                />
                {/* Author Badge */}
                <div className="hidden sm:block h-5 w-20 bg-surface-elevated/70 rounded-md" />
              </div>

              {/* Status Badge + Time */}
              <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
                <div className="h-5 w-24 bg-surface-elevated rounded-md" />
                <div className="h-4 w-12 bg-surface-elevated/60 rounded" />
              </div>
            </div>

            {/* Title Tier */}
            <div className="space-y-1.5 pt-0.5">
              <div
                className="h-5 bg-surface-elevated rounded-md"
                style={{ width: `${75 + (key % 4) * 6}%` }}
              />
              <div
                className="h-4 bg-surface-elevated/60 rounded-md"
                style={{ width: `${45 + (key % 3) * 12}%` }}
              />
            </div>

            {/* Bottom Telemetry Bar */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-border-subtle/30">
              <div className="flex items-center gap-2">
                <div className="h-4 w-20 bg-surface-elevated/50 rounded-md" />
              </div>
              <div className="h-4 w-14 bg-surface-elevated/40 rounded-md ml-auto" />
            </div>
          </div>
        ))}

        <Footer
          variant="dashboard"
          onNavigateView={onNavigateView}
          onOpenCookiePreferences={onOpenCookiePreferences}
        />
      </div>
    </div>
  );
};
