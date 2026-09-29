import React from 'react';
import { motion } from 'framer-motion';
import { Terminal, SlidersHorizontal, PlusCircle, Key } from 'lucide-react';

interface MobileBottomDockProps {
  onScrollToTop: () => void;
  isFiltersOpen: boolean;
  onToggleFilters: () => void;
  onOpenTrackModal: () => void;
  onOpenIntegrationsModal: () => void;
  actionNeededCount?: number;
  integrationsCount?: number;
}

export const MobileBottomDock: React.FC<MobileBottomDockProps> = ({
  onScrollToTop,
  isFiltersOpen,
  onToggleFilters,
  onOpenTrackModal,
  onOpenIntegrationsModal,
  actionNeededCount = 0,
  integrationsCount = 0,
}) => {
  return (
    <nav
      aria-label="Mobile Navigation Dock"
      className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border-subtle px-3 py-1.5 pb-safe flex items-center justify-around shadow-[0_-8px_24px_rgba(0,0,0,0.6)] select-none"
    >
      {/* Stream Tab */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.92 }}
        onClick={onScrollToTop}
        className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 text-text-muted hover:text-white transition-colors cursor-pointer relative"
        title="Scroll to top of contribution stream"
      >
        <div className="relative">
          <Terminal className="h-5 w-5" />
          {actionNeededCount > 0 && (
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-status-action-needed animate-pulse" />
          )}
        </div>
        <span className="text-[10px] font-mono font-bold tracking-wider mt-0.5">
          STREAM
        </span>
      </motion.button>

      {/* Filters Toggle Tab */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.92 }}
        onClick={onToggleFilters}
        className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 transition-colors cursor-pointer relative ${
          isFiltersOpen ? 'text-accent-sapphire' : 'text-text-muted hover:text-white'
        }`}
        title="Toggle auxiliary filters"
      >
        <SlidersHorizontal className="h-5 w-5" />
        <span className="text-[10px] font-mono font-bold tracking-wider mt-0.5">
          FILTERS
        </span>
        {isFiltersOpen && (
          <span className="absolute bottom-0 w-6 h-0.5 bg-accent-sapphire rounded-full" />
        )}
      </motion.button>

      {/* Primary + Track Action Pill */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.93 }}
        onClick={onOpenTrackModal}
        className="flex items-center gap-1.5 bg-accent-sapphire hover:bg-accent-sapphire/90 text-white px-4 py-2 min-h-[44px] rounded-full font-mono font-bold text-xs shadow-[0_0_16px_rgba(116,157,208,0.45)] cursor-pointer shrink-0"
        title="Track upstream contribution URL"
      >
        <PlusCircle className="h-4 w-4" />
        <span>+ TRACK</span>
      </motion.button>

      {/* Accounts Tab */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.92 }}
        onClick={onOpenIntegrationsModal}
        className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] py-1 text-text-muted hover:text-white transition-colors cursor-pointer relative"
        title="Manage linked accounts"
      >
        <div className="relative">
          <Key className="h-5 w-5 text-status-awaiting-reply" />
          {integrationsCount > 0 && (
            <span className="absolute -top-1.5 -right-2.5 bg-surface-elevated border border-border-bold text-[9px] font-mono font-bold text-white px-1 rounded-full">
              {integrationsCount}
            </span>
          )}
        </div>
        <span className="text-[10px] font-mono font-bold tracking-wider mt-0.5">
          VAULT
        </span>
      </motion.button>
    </nav>
  );
};
