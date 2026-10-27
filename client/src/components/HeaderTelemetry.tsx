import React from 'react';
import { motion } from 'framer-motion';
import { Stats } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
  RefreshCw,
  PlusCircle,
  HelpCircle,
  Lock,
  LogOut,
  Key,
  User as UserIcon,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  GitPullRequest,
  BarChart3,
  FolderGit2,
  Settings,
} from 'lucide-react';
import { requestNotificationPermission, playNotificationSound } from '../utils/notifications';
import { OSSBrandLogo } from './BrandLogos';
import { ViewMode } from '../types';

interface HeaderTelemetryProps {
  stats: Stats | null;
  isSyncing: boolean;
  onSync: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  onOpenTrackModal?: () => void;
  onOpenGuideModal?: () => void;
  onOpenAuthModal?: () => void;
  onOpenIntegrationsModal?: () => void;
}

export const HeaderTelemetry: React.FC<HeaderTelemetryProps> = ({
  stats,
  isSyncing,
  onSync,
  viewMode,
  onViewModeChange,
  theme = 'dark',
  onToggleTheme,
  onOpenTrackModal,
  onOpenGuideModal,
  onOpenAuthModal,
  onOpenIntegrationsModal,
}) => {
  const { user, logout, integrations } = useAuth();

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return 'NEVER';
    const date = new Date(isoString);
    const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSeconds < 60) return `${diffSeconds}s AGO`;
    const diffMins = Math.floor(diffSeconds / 60);
    if (diffMins < 60) return `${diffMins}m AGO`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h AGO`;
  };

  const [notifPermission, setNotifPermission] = React.useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied'
  );
  const [soundEnabled, setSoundEnabled] = React.useState<boolean>(
    typeof window !== 'undefined' ? localStorage.getItem('oss_sound_enabled') !== 'false' : true
  );

  const handleToggleNotifications = async () => {
    if (notifPermission !== 'granted') {
      const perm = await requestNotificationPermission();
      setNotifPermission(perm);
      if (perm === 'granted') {
        playNotificationSound();
      }
    }
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('oss_sound_enabled', String(next));
    if (next) {
      playNotificationSound();
    }
  };

  // Reusable Navigation Tabs Component with Sliding Pill Spring Physics
  const navTabs: { id: ViewMode; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'stream', label: 'STREAM', Icon: GitPullRequest },
    { id: 'analytics', label: 'ANALYTICS', Icon: BarChart3 },
    { id: 'repos', label: 'REPOS', Icon: FolderGit2 },
    { id: 'settings', label: 'SETTINGS', Icon: Settings },
  ];

  const renderNavTabs = (compact = false) => {
    const layoutId = compact ? 'nav-active-pill-tablet' : 'nav-active-pill-desktop';
    return (
      <nav
        aria-label="Primary View Navigation"
        className="relative flex items-center gap-0.5 p-0.5 bg-surface-card border border-border-subtle rounded-lg shrink-0 select-none"
      >
        {navTabs.map((tab) => {
          const isActive = viewMode === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onViewModeChange(tab.id)}
              className={`relative z-10 flex items-center gap-1 rounded-md font-mono font-semibold transition-colors duration-150 cursor-pointer select-none border border-transparent px-2 py-1 text-xs ${
                isActive
                  ? 'text-text-primary'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId={layoutId}
                  className="absolute inset-0 rounded-md bg-surface-active border border-border-subtle shadow-sm -z-10"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
              <tab.Icon
                className={`shrink-0 ${
                  compact ? 'h-3 w-3' : 'h-3.5 w-3.5'
                } ${
                  isActive
                    ? tab.id === 'stream'
                      ? 'text-accent-sapphire'
                      : tab.id === 'analytics'
                      ? 'text-accent-glacial'
                      : tab.id === 'repos'
                      ? 'text-text-primary'
                      : 'text-text-whisper'
                    : 'text-text-muted'
                }`}
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    );
  };

  // Reusable Track PR Button
  const renderTrackButton = () => (
    onOpenTrackModal ? (
      <motion.button
        type="button"
        whileHover={{ scale: 1.04, boxShadow: '0 0 16px rgba(116,157,208,0.45)' }}
        whileTap={{ scale: 0.94 }}
        transition={{ type: 'spring', stiffness: 450, damping: 25 }}
        onClick={onOpenTrackModal}
        className="flex items-center gap-1.5 h-8 bg-accent-sapphire hover:bg-accent-sapphire/90 !text-white px-2.5 rounded-lg font-mono font-bold text-xs shadow-sm cursor-pointer shrink-0"
        title="Track new contribution URL"
      >
        <PlusCircle className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden sm:inline">TRACK PR</span>
      </motion.button>
    ) : null
  );

  // Reusable User Session Block
  const renderUserBlock = () => (
    user ? (
      <div className="flex items-center h-8 border border-border-subtle bg-surface-card rounded-lg overflow-hidden divide-x divide-border-subtle shadow-sm shrink-0">
        <div className="flex items-center gap-1.5 h-full px-2 text-xs font-mono font-bold text-text-primary bg-surface-card">
          <UserIcon className="h-3.5 w-3.5 text-accent-sapphire shrink-0" />
          <span className="max-w-[75px] sm:max-w-[85px] truncate">@{user.username}</span>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={onOpenIntegrationsModal}
          className="flex items-center gap-1 h-full bg-surface-elevated hover:bg-amber-500/15 px-2 text-xs font-mono font-bold text-text-primary hover:text-amber-500 dark:hover:text-amber-300 transition-colors cursor-pointer group"
          title="Manage linked GitHub and GitLab accounts"
        >
          <Key className="h-3 w-3 text-status-awaiting-reply shrink-0" />
          <span className="hidden xl:inline">ACCOUNTS</span>
          <span>({integrations.length})</span>
        </motion.button>
        <button
          onClick={() => logout()}
          className="h-full px-2 text-text-muted hover:text-status-action-needed transition-colors cursor-pointer flex items-center justify-center"
          title="Sign out"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    ) : (
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenAuthModal}
          className="flex items-center gap-1.5 h-8 border border-accent-sapphire bg-accent-sapphire/20 px-3 rounded-lg font-mono font-bold text-xs text-text-whisper hover:bg-accent-sapphire/35 transition-all cursor-pointer shadow-sm shrink-0"
          title="Sign in or register"
        >
          <Lock className="h-3.5 w-3.5 text-accent-sapphire shrink-0" />
          <span>Sign In</span>
        </button>
      </div>
    )
  );

  return (
    <header className="border border-border-subtle chrome-surface rounded-xl select-none mb-3 px-2.5 py-1.5 w-full max-w-full">
      {/* Streamlined Horizontal Console Bar with Responsive Flow */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-2 xl:gap-3 w-full">
        {/* Left: Brand Identity & Static Creator Credit */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border-bold bg-base shadow-inner">
            <OSSBrandLogo className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-xs sm:text-sm font-extrabold tracking-tight text-text-primary uppercase font-sans whitespace-nowrap">
              OSS COMMAND CENTER
            </h1>
            <span className="border border-border-subtle bg-surface-elevated px-1.5 py-0.5 rounded text-[10px] font-mono text-text-muted">
              v1.0
            </span>
            <span
              className="hidden md:flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-border-subtle/80 bg-surface-card/60 text-[10px] font-mono text-text-muted select-none cursor-default ml-0.5"
              title="Created by Sharvin"
            >
              <span className="text-[9px] uppercase font-bold text-text-muted/70">by</span>
              <span className="font-semibold text-text-secondary">sharvin</span>
            </span>
          </div>
        </div>

        {/* Center: View Switcher */}
        {renderNavTabs(false)}

        {/* Right: Track PR + Clustered Utilities + User Capsule */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
          {/* Primary Action Button */}
          {renderTrackButton()}

          {/* System Utilities Toolbelt */}
          <div className="flex items-center h-8 border border-border-subtle bg-surface-card rounded-lg overflow-hidden divide-x divide-border-subtle shadow-sm shrink-0">
            {/* Sync */}
            <button
              onClick={onSync}
              disabled={isSyncing}
              className="flex items-center gap-1 h-full px-2 text-xs font-mono text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors disabled:opacity-50 cursor-pointer"
              title="Poll upstream GitHub and GitLab APIs"
            >
              <RefreshCw className={`h-3 w-3 text-accent-glacial ${isSyncing ? 'animate-spin text-accent-sapphire' : ''}`} />
              <span className="font-medium hidden xl:inline">{isSyncing ? 'SYNCING...' : `SYNC: ${formatTime(stats?.lastSync)}`}</span>
            </button>

            {/* Guide */}
            {onOpenGuideModal && (
              <button
                onClick={onOpenGuideModal}
                className="h-full px-1.5 text-xs font-mono text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer flex items-center justify-center"
                title="Operational reference guide (?)"
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Dedicated About Button */}
            <button
              type="button"
              onClick={() => onViewModeChange('about')}
              className={`flex items-center gap-1 h-full px-2 text-xs font-mono transition-colors cursor-pointer ${
                viewMode === 'about'
                  ? 'text-text-primary bg-accent-sapphire/20 font-bold'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated'
              }`}
              title="About the Creator & System Architecture"
            >
              <UserIcon className="h-3 w-3 text-accent-sapphire" />
              <span className="font-medium hidden xl:inline">ABOUT</span>
            </button>

            {/* Notifications */}
            <button
              onClick={handleToggleNotifications}
              className={`h-full px-1.5 transition-colors cursor-pointer flex items-center justify-center ${
                notifPermission === 'granted'
                  ? 'text-accent-sapphire hover:text-text-primary bg-accent-sapphire/10'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated'
              }`}
              title={notifPermission === 'granted' ? 'Desktop alerts active' : 'Enable desktop notifications'}
            >
              {notifPermission === 'granted' ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
            </button>

            {/* Sound Chime */}
            <button
              onClick={handleToggleSound}
              className={`h-full px-1.5 transition-colors cursor-pointer flex items-center justify-center ${
                soundEnabled ? 'text-status-merged hover:text-text-primary bg-status-merged/10' : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated'
              }`}
              title={soundEnabled ? 'Chime active' : 'Chime muted'}
            >
              {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            </button>

            {/* Calibrated Theme Mode Switcher */}
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className="h-full px-1.5 transition-colors cursor-pointer flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-elevated"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? (
                  <Sun className="h-3.5 w-3.5 text-amber-300 hover:text-amber-200 transition-colors" />
                ) : (
                  <Moon className="h-3.5 w-3.5 text-accent-sapphire hover:text-accent-glacial transition-colors" />
                )}
              </button>
            )}
          </div>

          {/* User Session */}
          {renderUserBlock()}
        </div>
      </div>
    </header>
  );
};
