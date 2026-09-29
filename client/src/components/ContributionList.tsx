import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Contribution } from '../types';
import { ContributionRow } from './ContributionRow';
import { PlusCircle, Search, Terminal, Shield, Lock } from 'lucide-react';

interface ContributionListProps {
  items: Contribution[];
  selectedId: string | null;
  onSelectItem: (id: string) => void;
  isLoading: boolean;
  isRefreshing?: boolean;
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
  isRefreshing = false,
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
      <div className="flex flex-1 flex-col items-center justify-center p-2.5 sm:p-12 pb-28 sm:pb-8 bg-base text-center overflow-y-auto">
        <div className="border border-border-subtle bg-surface p-4 sm:p-8 md:p-10 rounded-xl max-w-xl w-full text-left font-mono shadow-card my-auto">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3 mb-3 text-sm gap-2">
            <div className="flex items-center gap-2 text-accent-sapphire font-bold text-xs sm:text-base md:text-lg min-w-0">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              <span className="truncate hidden sm:inline">[ENCRYPTED_WORKSPACE_LOCKED]</span>
              <span className="truncate sm:hidden">[WORKSPACE_LOCKED]</span>
            </div>
            <span className="border border-border-bold bg-base px-2 py-0.5 rounded text-[10px] sm:text-xs text-text-muted shrink-0">
              AUTH_REQUIRED
            </span>
          </div>
          <p className="text-xs sm:text-sm md:text-base text-text-whisper mb-2 sm:mb-3 font-sans leading-relaxed">
            OSS Command Center is running in multi-tenant encrypted mode. Contribution telemetry, pull requests, and platform tokens remain strictly isolated to authenticated tenant accounts.
          </p>
          <p className="text-[11px] sm:text-xs md:text-sm text-text-muted mb-4 sm:mb-7 font-sans leading-relaxed">
            Sign in or create a tenant account to connect your GitHub and GitLab credentials and track your personal open-source merge pipeline.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {onOpenAuthModal && (
              <button
                onClick={onOpenAuthModal}
                className="w-full sm:w-auto flex items-center justify-center gap-2 border border-accent-sapphire bg-accent-sapphire/25 hover:bg-accent-sapphire/35 px-4 py-2.5 sm:px-5 sm:py-3 rounded-lg font-mono text-xs sm:text-sm font-bold text-white transition-all cursor-pointer shadow-sm"
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
      <div className="flex flex-1 flex-col items-center justify-center p-2.5 sm:p-12 pb-28 sm:pb-8 bg-base text-center overflow-y-auto">
        <div className="border border-border-subtle bg-surface p-4 sm:p-8 rounded-xl max-w-lg w-full text-left font-mono shadow-card my-auto">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3 mb-3 text-sm">
            <span className="text-status-awaiting-reply font-bold text-xs sm:text-base">[ZERO_RECORDS_LOCATED]</span>
            <span className="text-text-muted text-[11px] sm:text-xs">CODE: NULL_SET</span>
          </div>
          <p className="text-xs sm:text-sm text-text-whisper mb-4 font-sans leading-relaxed">
            No contributions matched the active filter criteria or query string. Reset the current filter or ingest a new contribution URL.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
            {onResetFilters && (
              <button
                onClick={onResetFilters}
                className="w-full sm:w-auto border border-border-bold bg-surface-elevated px-4 py-2 rounded-md font-mono text-xs sm:text-sm font-bold text-text-primary hover:border-accent-sapphire hover:bg-surface-active transition-all cursor-pointer text-center"
              >
                [RESET_FILTERS]
              </button>
            )}
            {onOpenTrackModal && (
              <button
                onClick={onOpenTrackModal}
                className="w-full sm:w-auto border border-accent-sapphire bg-accent-sapphire/20 px-4 py-2 rounded-md font-mono text-xs sm:text-sm font-bold text-text-whisper hover:bg-accent-sapphire/30 transition-all cursor-pointer text-center"
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
        <div className="flex items-center gap-2 text-[11px] sm:text-xs font-mono font-bold text-text-muted uppercase tracking-wider truncate">
          <Terminal className="h-3.5 w-3.5 text-accent-sapphire shrink-0" />
          <span className="truncate hidden sm:inline">CONTRIBUTION TELEMETRY STREAM ({items.length} RECORDS)</span>
          <span className="truncate sm:hidden">TELEMETRY STREAM ({items.length})</span>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-xs font-mono text-text-muted">
          <span>NAV: <kbd className="border border-border-bold bg-surface-card px-1.5 py-0.2 rounded text-text-whisper">j</kbd>/<kbd className="border border-border-bold bg-surface-card px-1.5 py-0.2 rounded text-text-whisper">k</kbd></span>
          <span>OPEN: <kbd className="border border-border-bold bg-surface-card px-1.5 py-0.2 rounded text-text-whisper">Enter</kbd></span>
        </div>
      </div>

      {/* Separated Card Rows with Stream Scroll Fade Mask */}
      <div id="stream-feed-container" className="overflow-y-auto flex-1 pr-1 pt-1.5 pb-28 sm:pb-2 stream-scroll-mask">
        {isRefreshing && (
          <div className="h-0.5 w-full bg-accent-sapphire/20 overflow-hidden mb-1.5 rounded-full">
            <div className="h-full w-1/3 bg-accent-sapphire rounded-full animate-pulse" />
          </div>
        )}
        <AnimatePresence mode="popLayout" initial={false}>
          {items.map((item, idx) => {
            const isHighlighted = idx === highlightedIndex;
            const isSelected = item.id === selectedId;

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
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
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Sapphire Console Footer HUD (Chrome Surface with Top Highlight, Desktop only) */}
      <div className="hidden sm:flex border border-border-subtle chrome-surface px-4 py-2 rounded-lg shadow-card flex-col sm:flex-row sm:items-center sm:justify-between gap-2 font-mono text-xs text-text-muted select-none mt-2">
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
