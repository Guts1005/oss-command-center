import React, { useEffect, useState } from 'react';
import { Contribution } from '../types';
import { ContributionRow } from './ContributionRow';
import { PlusCircle, Search, Terminal, Shield, Lock } from 'lucide-react';

interface ContributionListProps {
  items: Contribution[];
  selectedId: string | null;
  onSelectItem: (id: string) => void;
  isLoading: boolean;
  onOpenTrackModal?: () => void;
  onResetFilters?: () => void;
  isAuthenticated?: boolean;
  onOpenAuthModal?: () => void;
}

export const ContributionList: React.FC<ContributionListProps> = ({
  items,
  selectedId,
  onSelectItem,
  isLoading,
  onOpenTrackModal,
  onResetFilters,
  isAuthenticated = true,
  onOpenAuthModal,
}) => {
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  // Synchronize highlighted index with selectedId or clamped index
  useEffect(() => {
    if (selectedId) {
      const idx = items.findIndex((it) => it.id === selectedId);
      if (idx !== -1) setHighlightedIndex(idx);
    } else if (highlightedIndex >= items.length) {
      setHighlightedIndex(Math.max(0, items.length - 1));
    }
  }, [selectedId, items.length]);

  // Global j/k/Enter keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < items.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter') {
        if (items[highlightedIndex]) {
          e.preventDefault();
          onSelectItem(items[highlightedIndex].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, highlightedIndex, onSelectItem]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-16 bg-base">
        <div className="border border-border-subtle bg-surface p-6 rounded-lg font-mono text-sm text-text-whisper flex items-center gap-4 shadow-card">
          <span className="inline-block h-3 w-3 bg-accent-sapphire rounded-full animate-ping" />
          <span className="text-white font-bold text-base">[SYS_SYNC]</span>
          <span>INGESTING CONTRIBUTION TELEMETRY...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-12 bg-base text-center">
        <div className="border border-border-subtle bg-surface p-8 md:p-10 rounded-xl max-w-xl w-full text-left font-mono shadow-card">
          <div className="flex items-center justify-between border-b border-border-subtle pb-4 mb-5 text-sm">
            <div className="flex items-center gap-2 text-accent-sapphire font-bold text-base md:text-lg">
              <Shield className="h-5 w-5" />
              <span>[ENCRYPTED_WORKSPACE_LOCKED]</span>
            </div>
            <span className="border border-border-bold bg-base px-2.5 py-0.5 rounded text-xs text-text-muted">
              AUTH_REQUIRED
            </span>
          </div>
          <p className="text-sm md:text-base text-text-whisper mb-3 font-sans leading-relaxed">
            OSS Command Center is running in multi-tenant encrypted mode. Contribution telemetry, pull requests, and platform tokens remain strictly isolated to authenticated tenant accounts.
          </p>
          <p className="text-xs md:text-sm text-text-muted mb-7 font-sans leading-relaxed">
            Sign in or create a tenant account to connect your GitHub and GitLab credentials and track your personal open-source merge pipeline.
          </p>
          <div className="flex flex-wrap items-center gap-3.5">
            {onOpenAuthModal && (
              <button
                onClick={onOpenAuthModal}
                className="flex items-center gap-2 border border-accent-sapphire bg-accent-sapphire/25 hover:bg-accent-sapphire/35 px-5 py-3 rounded-lg font-mono text-sm font-bold text-white transition-all cursor-pointer shadow-sm"
              >
                <Lock className="h-4 w-4 text-accent-sapphire" />
                <span>[SIGN_IN_OR_REGISTER]</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-12 bg-base text-center">
        <div className="border border-border-subtle bg-surface p-8 rounded-lg max-w-lg w-full text-left font-mono shadow-card">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3 mb-4 text-sm">
            <span className="text-status-awaiting-reply font-bold text-base">[ZERO_RECORDS_LOCATED]</span>
            <span className="text-text-muted">CODE: NULL_SET</span>
          </div>
          <p className="text-sm text-text-whisper mb-6 font-sans leading-relaxed">
            No contributions matched the active filter criteria or query string. Reset the current filter or ingest a new contribution URL.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {onResetFilters && (
              <button
                onClick={onResetFilters}
                className="border border-border-bold bg-surface-elevated px-4 py-2 rounded-md font-mono text-sm font-bold text-text-primary hover:border-accent-sapphire hover:bg-surface-active transition-all cursor-pointer"
              >
                [RESET_FILTERS]
              </button>
            )}
            {onOpenTrackModal && (
              <button
                onClick={onOpenTrackModal}
                className="border border-accent-sapphire bg-accent-sapphire/20 px-4 py-2 rounded-md font-mono text-sm font-bold text-text-whisper hover:bg-accent-sapphire/30 transition-all cursor-pointer"
              >
                [+ TRACK_ITEM]
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-base">
      {/* Stream Section Header */}
      <div className="flex items-center justify-between px-1 pb-2 select-none">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-text-muted uppercase tracking-wider">
          <Terminal className="h-3.5 w-3.5 text-accent-sapphire" />
          <span>CONTRIBUTION TELEMETRY STREAM ({items.length} RECORDS)</span>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-xs font-mono text-text-muted">
          <span>NAV: <kbd className="border border-border-bold bg-surface-card px-1.5 py-0.2 rounded text-text-whisper">j</kbd>/<kbd className="border border-border-bold bg-surface-card px-1.5 py-0.2 rounded text-text-whisper">k</kbd></span>
          <span>OPEN: <kbd className="border border-border-bold bg-surface-card px-1.5 py-0.2 rounded text-text-whisper">Enter</kbd></span>
        </div>
      </div>

      {/* Separated Card Rows with Stream Scroll Fade Mask */}
      <div className="overflow-y-auto flex-1 pr-1 pb-2 stream-scroll-mask">
        {items.map((item, idx) => {
          const isHighlighted = idx === highlightedIndex;
          const isSelected = item.id === selectedId;

          return (
            <div
              key={item.id}
              className={isHighlighted && !isSelected ? 'ring-1 ring-accent-sapphire/70 rounded-lg' : ''}
            >
              <ContributionRow
                item={item}
                isSelected={isSelected}
                onClick={() => {
                  setHighlightedIndex(idx);
                  onSelectItem(item.id);
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Sapphire Console Footer HUD (Chrome Surface with Top Highlight) */}
      <div className="border border-border-subtle chrome-surface px-4 py-2 rounded-lg shadow-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 font-mono text-xs text-text-muted select-none mt-2">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-white font-bold">[CONSOLE]</span>
          <span>
            <kbd className="border border-border-bold bg-base px-1.5 py-0.2 rounded text-text-whisper">j</kbd>/<kbd className="border border-border-bold bg-base px-1.5 py-0.2 rounded text-text-whisper">k</kbd> NAVIGATE
          </span>
          <span>
            <kbd className="border border-border-bold bg-base px-1.5 py-0.2 rounded text-text-whisper">Enter</kbd> TELEMETRY
          </span>
          <span>
            <kbd className="border border-border-bold bg-base px-1.5 py-0.2 rounded text-text-whisper">/</kbd> QUERY
          </span>
          <span>
            <kbd className="border border-border-bold bg-base px-1.5 py-0.2 rounded text-text-whisper">Esc</kbd> DISMISS
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden md:inline">
            <span className="h-1.5 w-1.5 rounded-full bg-status-merged inline-block mr-1" />
            SYS: OPTIMAL
          </span>
          <span className="hidden md:inline">•</span>
          <span className="hidden md:inline">ENCRYPTION: AES-256-GCM</span>
          <span className="hidden md:inline">•</span>
          <span>
            RECORDS: <span className="font-bold text-white">{items.length}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
