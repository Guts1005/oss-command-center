import React from 'react';
import { motion } from 'framer-motion';
import { Terminal, BarChart3, PlusCircle, FolderGit2, Settings } from 'lucide-react';
import { ViewMode } from '../types';

interface MobileBottomDockProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onScrollToTop: () => void;
  onRefresh?: () => void;
  onOpenTrackModal: () => void;
  actionNeededCount?: number;
}

export const MobileBottomDock: React.FC<MobileBottomDockProps> = ({
  viewMode,
  onViewModeChange,
  onScrollToTop,
  onRefresh,
  onOpenTrackModal,
  actionNeededCount = 0,
}) => {
  const lastTapRef = React.useRef<number>(0);

  const handleStreamTap = () => {
    if (viewMode !== 'stream') {
      onViewModeChange('stream');
      return;
    }
    const now = Date.now();
    if (now - lastTapRef.current < 350 && onRefresh) {
      onRefresh();
    } else {
      onScrollToTop();
    }
    lastTapRef.current = now;
  };

  return (
    <nav
      aria-label="Mobile Navigation Dock"
      className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border-subtle px-2 py-1 pb-safe flex items-center justify-around [box-shadow:inset_0_1px_0_rgba(207,231,248,0.04),0_-8px_24px_rgba(0,0,0,0.75)] select-none"
    >
      {/* Stream Tab */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.92 }}
        onClick={handleStreamTap}
        className={`flex flex-col items-center justify-center min-w-[50px] min-h-[44px] py-1 transition-colors cursor-pointer relative ${
          viewMode === 'stream' ? 'text-accent-sapphire' : 'text-text-muted hover:text-white'
        }`}
        title="Stream view (tap to scroll top, double-tap to refresh)"
      >
        <div className="relative">
          <Terminal className="h-5 w-5" />
          {actionNeededCount > 0 && (
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-status-action-needed animate-pulse" />
          )}
        </div>
        <span className="text-[9px] font-mono font-bold tracking-wider mt-0.5">
          STREAM
        </span>
        {viewMode === 'stream' && (
          <span className="absolute bottom-0 w-5 h-0.5 bg-accent-sapphire rounded-full" />
        )}
      </motion.button>

      {/* Analytics Tab */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.92 }}
        onClick={() => onViewModeChange('analytics')}
        className={`flex flex-col items-center justify-center min-w-[50px] min-h-[44px] py-1 transition-colors cursor-pointer relative ${
          viewMode === 'analytics' ? 'text-accent-sapphire' : 'text-text-muted hover:text-white'
        }`}
        title="Velocity analytics"
      >
        <BarChart3 className="h-5 w-5" />
        <span className="text-[9px] font-mono font-bold tracking-wider mt-0.5">
          STATS
        </span>
        {viewMode === 'analytics' && (
          <span className="absolute bottom-0 w-5 h-0.5 bg-accent-sapphire rounded-full" />
        )}
      </motion.button>

      {/* Primary + Track Action Pill */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.93 }}
        onClick={onOpenTrackModal}
        className="flex items-center gap-1 bg-accent-sapphire hover:bg-accent-sapphire/90 text-white px-3.5 py-1.5 min-h-[40px] rounded-full font-mono font-bold text-xs shadow-[0_0_16px_rgba(116,157,208,0.45)] cursor-pointer shrink-0"
        title="Track upstream contribution URL"
      >
        <PlusCircle className="h-4 w-4" />
        <span>TRACK</span>
      </motion.button>

      {/* Repositories Tab */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.92 }}
        onClick={() => onViewModeChange('repos')}
        className={`flex flex-col items-center justify-center min-w-[50px] min-h-[44px] py-1 transition-colors cursor-pointer relative ${
          viewMode === 'repos' ? 'text-accent-sapphire' : 'text-text-muted hover:text-white'
        }`}
        title="Tracked repositories"
      >
        <FolderGit2 className="h-5 w-5" />
        <span className="text-[9px] font-mono font-bold tracking-wider mt-0.5">
          REPOS
        </span>
        {viewMode === 'repos' && (
          <span className="absolute bottom-0 w-5 h-0.5 bg-accent-sapphire rounded-full" />
        )}
      </motion.button>

      {/* Settings Tab */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.92 }}
        onClick={() => onViewModeChange('settings')}
        className={`flex flex-col items-center justify-center min-w-[50px] min-h-[44px] py-1 transition-colors cursor-pointer relative ${
          viewMode === 'settings' ? 'text-accent-sapphire' : 'text-text-muted hover:text-white'
        }`}
        title="Settings & Vault"
      >
        <Settings className="h-5 w-5" />
        <span className="text-[9px] font-mono font-bold tracking-wider mt-0.5">
          CONFIG
        </span>
        {viewMode === 'settings' && (
          <span className="absolute bottom-0 w-5 h-0.5 bg-accent-sapphire rounded-full" />
        )}
      </motion.button>
    </nav>
  );
};
