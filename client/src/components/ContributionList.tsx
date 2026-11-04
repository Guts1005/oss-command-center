import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Contribution, ViewMode } from '../types';
import { ContributionRow } from './ContributionRow';
import { ContributionStreamSkeleton } from './ContributionStreamSkeleton';
import { Terminal, Shield, Lock, Sparkles } from 'lucide-react';
import { Footer } from './Footer';
import { useWheelScroll } from '../hooks/useWheelScroll';

interface ContributionListProps {
  items: Contribution[];
  selectedId: string | null;
  onSelectItem: (id: string) => void;
  isLoading: boolean;
  isRefreshing?: boolean;
  onOpenTrackModal?: () => void;
  onResetFilters?: () => void;
  isAuthenticated?: boolean;
  isDemoMode?: boolean;
  onOpenAuthModal?: () => void;
  onEnterDemoMode?: () => void;
  onNavigateView?: (mode: ViewMode) => void;
  onOpenCookiePreferences?: () => void;
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
  isDemoMode = false,
  onOpenAuthModal,
  onEnterDemoMode,
  onNavigateView,
  onOpenCookiePreferences,
}) => {
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const unauthRef = useRef<HTMLDivElement>(null);
  const emptyRef = useRef<HTMLDivElement>(null);
  useWheelScroll(containerRef);
  useWheelScroll(unauthRef);
  useWheelScroll(emptyRef);

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

  // Loading Segment: active during initial fetch or when switching filters while list is empty
  if (isLoading || (isRefreshing && items.length === 0)) {
    return (
      <ContributionStreamSkeleton
        count={5}
        onNavigateView={onNavigateView}
        onOpenCookiePreferences={onOpenCookiePreferences}
      />
    );
  }

  // Unauthenticated Call to Action (bypassed if interactive Demo Mode is active)
  if (!isAuthenticated && !isDemoMode) {
    return (
      <div ref={unauthRef} className="flex-1 flex flex-col justify-between w-full h-full min-h-0 overflow-y-auto custom-scrollbar bg-base text-left">
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8 w-full my-auto">
          <div className="border border-border-subtle bg-surface p-5 sm:p-8 rounded-xl max-w-lg w-full text-left shadow-card">
            <div className="flex items-center gap-3 border-b border-border-subtle pb-4 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border-bold bg-base text-accent-sapphire">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-text-primary font-sans">
                  Login or Register to start working
                </h2>
                <p className="text-xs sm:text-sm text-text-whisper mt-1 font-sans">
                  Connect your GitHub or GitLab accounts to track your contributions in real time.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
              {onOpenAuthModal && (
                <button
                  onClick={onOpenAuthModal}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 border border-blue-600 bg-blue-600 hover:bg-blue-500 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all cursor-pointer shadow-sm font-sans"
                >
                  <span>Sign in or Register</span>
                </button>
              )}
              {onEnterDemoMode && (
                <button
                  onClick={onEnterDemoMode}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 border border-border-bold bg-surface-elevated hover:bg-surface-hover hover:border-accent-sapphire/50 px-5 py-2.5 rounded-lg text-sm font-semibold text-text-primary transition-all cursor-pointer shadow-sm font-sans group"
                >
                  <Sparkles className="h-4 w-4 text-accent-sapphire group-hover:scale-110 transition-transform" />
                  <span>Explore Interactive Demo</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-text-muted mt-5 pt-3 border-t border-border-subtle/50 font-mono">
              <Shield className="h-3.5 w-3.5 text-status-merged shrink-0" />
              <span>Encrypted</span>
            </div>
          </div>
        </div>
        <Footer
          variant="dashboard"
          onNavigateView={onNavigateView}
          onOpenCookiePreferences={onOpenCookiePreferences}
        />
      </div>
    );
  }

  // Empty State: ONLY rendered if not currently loading or refreshing and truly empty
  if (items.length === 0) {
    return (
      <div ref={emptyRef} className="flex-1 flex flex-col justify-between w-full h-full min-h-0 overflow-y-auto custom-scrollbar bg-base text-left">
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8 w-full my-auto">
          <div className="border border-border-subtle bg-surface p-5 sm:p-8 rounded-xl max-w-lg w-full text-left shadow-card">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3 mb-3 text-sm">
              <span className="text-text-primary font-bold text-xs sm:text-base font-sans">No contributions found</span>
              <span className="text-text-muted text-[11px] sm:text-xs font-mono">0 items</span>
            </div>
            <p className="text-xs sm:text-sm text-text-whisper mb-4 font-sans leading-relaxed">
              No contributions matched the active filter criteria or query string. Reset the current filter or track a new contribution URL.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
              {onResetFilters && (
                <button
                  onClick={onResetFilters}
                  className="w-full sm:w-auto border border-border-bold bg-surface-elevated px-4 py-2 rounded-lg font-sans text-xs sm:text-sm font-semibold text-text-primary hover:border-accent-sapphire hover:bg-surface-active transition-all cursor-pointer text-center shadow-xs"
                >
                  Reset Filters
                </button>
              )}
              {onOpenTrackModal && (
                <button
                  onClick={onOpenTrackModal}
                  className="w-full sm:w-auto border border-accent-sapphire bg-accent-sapphire/20 px-4 py-2 rounded-lg font-sans text-xs sm:text-sm font-semibold text-text-whisper hover:bg-accent-sapphire/30 transition-all cursor-pointer text-center shadow-xs"
                >
                  + Track Contribution
                </button>
              )}
            </div>
          </div>
        </div>
        <Footer
          variant="dashboard"
          onNavigateView={onNavigateView}
          onOpenCookiePreferences={onOpenCookiePreferences}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full overflow-hidden bg-base">
      {/* Stream Section Header */}
      <div className="flex items-center justify-between px-1 pb-2 select-none">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-text-muted uppercase tracking-wider truncate">
          <Terminal className="h-3.5 w-3.5 text-accent-sapphire shrink-0" />
          <span className="truncate">CONTRIBUTIONS ({items.length})</span>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-xs font-mono text-text-muted">
          <span>NAV: <kbd className="border border-border-bold bg-surface-card px-1.5 py-0.2 rounded text-text-whisper">j</kbd>/<kbd className="border border-border-bold bg-surface-card px-1.5 py-0.2 rounded text-text-whisper">k</kbd></span>
          <span>OPEN: <kbd className="border border-border-bold bg-surface-card px-1.5 py-0.2 rounded text-text-whisper">Enter</kbd></span>
        </div>
      </div>

      {/* Separated Card Rows with Stream Scroll Fade Mask */}
      <div
        ref={containerRef}
        id="stream-feed-container"
        className="overflow-y-auto flex-1 px-1 pt-2 pb-28 sm:pb-4 stream-scroll-mask custom-scrollbar"
      >
        <div
          className={`stream-content-wrapper min-h-full transition-opacity duration-200 ${
            isRefreshing ? 'opacity-65 pointer-events-none' : 'opacity-100'
          }`}
        >
          {isRefreshing && (
            <div className="h-0.5 w-full bg-accent-sapphire/20 overflow-hidden mb-2 rounded-full">
              <div className="h-full w-1/3 bg-accent-sapphire rounded-full animate-pulse" />
            </div>
          )}

          <div className="space-y-2.5">
            {items.map((item, idx) => {
              const isHighlighted = idx === highlightedIndex;
              const isSelected = item.id === selectedId;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className={isHighlighted && !isSelected ? 'ring-2 ring-accent-sapphire/70 rounded-xl sm:rounded-2xl' : ''}
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
          </div>

          <Footer
            variant="dashboard"
            onNavigateView={onNavigateView}
            onOpenCookiePreferences={onOpenCookiePreferences}
          />
        </div>
      </div>
    </div>
  );
};
