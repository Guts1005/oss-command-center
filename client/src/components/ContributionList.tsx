import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Lenis from 'lenis';
import { Contribution, ViewMode } from '../types';
import { ContributionRow } from './ContributionRow';
import { PlusCircle, Search, Terminal, Shield, Lock } from 'lucide-react';
import { Footer } from './Footer';

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
  onToggleDemoMode?: () => void;
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
  onOpenAuthModal,
  onToggleDemoMode,
  onNavigateView,
  onOpenCookiePreferences,
}) => {
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 60fps desktop-optimized smooth scrolling with Lenis
  useEffect(() => {
    // Only enable smooth scrolling on desktop fine pointers (mouse / trackpad)
    // Coarse pointer devices (touchscreens / mobile) retain native momentum scrolling for zero overhead
    const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (isTouch || prefersReducedMotion || !containerRef.current) {
      return;
    }

    const container = containerRef.current;
    let lenis: Lenis | null = null;
    let rafId: number;

    try {
      lenis = new Lenis({
        wrapper: container,
        content: (container.firstElementChild as HTMLElement) || container,
        duration: 0.9,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        touchMultiplier: 1,
      });

      function raf(time: number) {
        lenis?.raf(time);
        rafId = requestAnimationFrame(raf);
      }
      rafId = requestAnimationFrame(raf);
    } catch (err) {
      console.warn('Lenis smooth scroll failed to initialize:', err);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (lenis) lenis.destroy();
    };
  }, []);

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
          <span className="text-white font-bold text-base">[SYNCING]</span>
          <span>LOADING CONTRIBUTIONS...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-2.5 sm:p-12 pb-28 sm:pb-8 bg-base text-center overflow-y-auto">
        <div className="border border-border-subtle bg-surface p-5 sm:p-8 rounded-xl max-w-lg w-full text-left shadow-card my-auto">
          <div className="flex items-center gap-3 border-b border-border-subtle pb-4 mb-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border-bold bg-base text-accent-sapphire">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white font-sans">
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
                className="w-full sm:w-auto flex items-center justify-center gap-2 border border-accent-sapphire bg-accent-sapphire hover:bg-accent-sapphire/90 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all cursor-pointer shadow-sm font-sans"
              >
                <span>Sign in or Register</span>
              </button>
            )}
            {onToggleDemoMode && (
              <button
                onClick={onToggleDemoMode}
                className="w-full sm:w-auto flex items-center justify-center gap-2 border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2.5 rounded-lg text-sm font-semibold text-amber-300 transition-all cursor-pointer shadow-sm font-sans"
              >
                <span>Explore Demo Sandbox</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-text-muted mt-5 pt-3 border-t border-border-subtle/50 font-mono">
            <Shield className="h-3.5 w-3.5 text-status-merged shrink-0" />
            <span>Encrypted</span>
          </div>
        </div>
        <div className="w-full max-w-4xl mx-auto mt-6">
          <Footer
            variant="dashboard"
            onNavigateView={onNavigateView}
            onOpenCookiePreferences={onOpenCookiePreferences}
          />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-between p-2.5 sm:p-12 pb-28 sm:pb-8 bg-base text-center overflow-y-auto">
        <div className="border border-border-subtle bg-surface p-5 sm:p-8 rounded-xl max-w-lg w-full text-left shadow-card my-auto">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3 mb-3 text-sm">
            <span className="text-white font-bold text-xs sm:text-base font-sans">No contributions found</span>
            <span className="text-text-muted text-[11px] sm:text-xs font-mono">0 items</span>
          </div>
          <p className="text-xs sm:text-sm text-text-whisper mb-4 font-sans leading-relaxed">
            No contributions matched the active filter criteria or query string. Reset the current filter or track a new contribution URL.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
            {onResetFilters && (
              <button
                onClick={onResetFilters}
                className="w-full sm:w-auto border border-border-bold bg-surface-elevated px-4 py-2 rounded-md font-sans text-xs sm:text-sm font-semibold text-text-primary hover:border-accent-sapphire hover:bg-surface-active transition-all cursor-pointer text-center"
              >
                Reset Filters
              </button>
            )}
            {onOpenTrackModal && (
              <button
                onClick={onOpenTrackModal}
                className="w-full sm:w-auto border border-accent-sapphire bg-accent-sapphire/20 px-4 py-2 rounded-md font-sans text-xs sm:text-sm font-semibold text-text-whisper hover:bg-accent-sapphire/30 transition-all cursor-pointer text-center"
              >
                + Track Contribution
              </button>
            )}
          </div>
        </div>
        <div className="w-full max-w-4xl mx-auto mt-6">
          <Footer
            variant="dashboard"
            onNavigateView={onNavigateView}
            onOpenCookiePreferences={onOpenCookiePreferences}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-base">
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
      <div ref={containerRef} id="stream-feed-container" className="overflow-y-auto flex-1 pr-1 pt-1.5 pb-28 sm:pb-2 stream-scroll-mask">
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

        <Footer
          variant="dashboard"
          onNavigateView={onNavigateView}
          onOpenCookiePreferences={onOpenCookiePreferences}
        />
      </div>
    </div>
  );
};
