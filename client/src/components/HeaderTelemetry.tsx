import React from 'react';
import { motion } from 'framer-motion';
import { Stats } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
  RefreshCw,
  GitMerge,
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
} from 'lucide-react';
import { requestNotificationPermission, playNotificationSound } from '../utils/notifications';

interface HeaderTelemetryProps {
  stats: Stats | null;
  isSyncing: boolean;
  onSync: () => void;
  onOpenTrackModal?: () => void;
  onOpenGuideModal?: () => void;
  onOpenAuthModal?: () => void;
  onOpenIntegrationsModal?: () => void;
}

export const HeaderTelemetry: React.FC<HeaderTelemetryProps> = ({
  stats,
  isSyncing,
  onSync,
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

  return (
    <header className="border border-border-subtle chrome-surface rounded-xl select-none mb-3 px-3 py-2 sm:px-5 sm:py-2.5">
      {/* Mobile Top Bar (< sm): Slim single row with zero screen crowding */}
      <div className="flex sm:hidden items-center justify-between gap-1.5">
        {/* Left: Brand & Online Indicator (Never truncated) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border-bold bg-base text-accent-sapphire shadow-inner">
            <GitMerge className="h-3.5 w-3.5" />
          </div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-xs font-extrabold tracking-tight text-white uppercase font-sans whitespace-nowrap">
              OSS COMMAND
            </h1>
            <span
              className="h-2 w-2 rounded-full bg-status-merged shrink-0 shadow-[0_0_8px_rgba(74,222,128,0.8)] animate-pulse"
              title="Telemetry Online"
            />
          </div>
        </div>

        {/* Right: Quick Utilities */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Quick Sync */}
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="flex items-center justify-center h-7 w-7 rounded-lg border border-border-subtle bg-surface-card text-text-muted hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
            title="Poll upstream APIs"
          >
            <RefreshCw className={`h-3 w-3 text-accent-glacial ${isSyncing ? 'animate-spin text-accent-sapphire' : ''}`} />
          </button>

          {/* Sound Chime Toggle */}
          <button
            onClick={handleToggleSound}
            className={`flex items-center justify-center h-7 w-7 rounded-lg border border-border-subtle bg-surface-card transition-colors cursor-pointer ${
              soundEnabled ? 'text-status-merged bg-status-merged/10' : 'text-text-muted hover:text-white'
            }`}
            title={soundEnabled ? 'Chime active' : 'Chime muted'}
          >
            {soundEnabled ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
          </button>

          {/* Tenant Session Pill */}
          {user ? (
            <button
              onClick={onOpenIntegrationsModal}
              className="flex items-center gap-1 h-7 px-2 rounded-lg border border-border-subtle bg-surface-card text-xs font-mono text-white cursor-pointer"
              title={`@${user.username} - View Accounts`}
            >
              <UserIcon className="h-3 w-3 text-accent-sapphire shrink-0" />
              <span className="max-w-[70px] truncate text-[11px] font-bold">@{user.username}</span>
            </button>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center gap-1 h-7 px-2 rounded-lg border border-accent-sapphire bg-accent-sapphire/20 text-xs font-mono font-bold text-text-whisper cursor-pointer"
              title="Sign in"
            >
              <Lock className="h-3 w-3 text-accent-sapphire shrink-0" />
              <span className="text-[11px]">AUTH</span>
            </button>
          )}
        </div>
      </div>

      {/* Desktop / Tablet Bar (>= sm): Preserved 100% untouched */}
      <div className="hidden sm:flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Left: Brand & Online Pill */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border-bold bg-base text-accent-sapphire shadow-inner">
            <GitMerge className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-base md:text-lg font-extrabold tracking-tight text-white uppercase font-sans">
              OSS COMMAND CENTER
            </h1>
            <span className="border border-status-merged/50 bg-status-merged/15 px-2 py-0.5 rounded text-[11px] font-bold font-mono text-status-merged">
              [SYS: ONLINE]
            </span>
            <span className="hidden sm:inline-block border border-border-subtle bg-surface-elevated px-1.5 py-0.5 rounded text-[11px] font-mono text-text-muted">
              v1.0
            </span>
          </div>
        </div>

        {/* Right: Primary Track + Clustered Utilities + User Capsule */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
          {/* Group 1: Primary Action (Filled Highlight with Spring Micro-interaction) */}
          {onOpenTrackModal && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(116,157,208,0.5)' }}
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 450, damping: 25 }}
              onClick={onOpenTrackModal}
              className="flex items-center gap-1.5 h-9 bg-accent-sapphire hover:bg-accent-sapphire/90 text-white px-3.5 rounded-lg font-mono font-bold text-xs md:text-sm shadow-sm cursor-pointer shrink-0 group"
              title="Track new contribution URL"
            >
              <motion.div
                whileHover={{ rotate: 90 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="flex items-center"
              >
                <PlusCircle className="h-4 w-4" />
              </motion.div>
              <span>+ TRACK</span>
            </motion.button>
          )}

          {/* Group 2: System Utilities Toolbelt */}
          <div className="flex items-center h-9 border border-border-subtle bg-surface-card rounded-lg overflow-hidden divide-x divide-border-subtle shadow-sm shrink-0">
            {/* Sync */}
            <button
              onClick={onSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 h-full px-3 text-xs font-mono text-text-muted hover:text-white hover:bg-surface-elevated transition-colors disabled:opacity-50 cursor-pointer"
              title="Poll upstream GitHub and GitLab APIs"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-accent-glacial ${isSyncing ? 'animate-spin text-accent-sapphire' : ''}`} />
              <span className="hidden sm:inline font-medium">{isSyncing ? 'SYNCING...' : `SYNC: ${formatTime(stats?.lastSync)}`}</span>
            </button>

            {/* Guide */}
            {onOpenGuideModal && (
              <button
                onClick={onOpenGuideModal}
                className="flex items-center gap-1.5 h-full px-2.5 text-xs font-mono text-text-muted hover:text-white hover:bg-surface-elevated transition-colors cursor-pointer"
                title="Operational reference guide (?)"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                <span className="hidden md:inline font-medium">GUIDE</span>
              </button>
            )}

            {/* Notifications */}
            <button
              onClick={handleToggleNotifications}
              className={`h-full px-2.5 transition-colors cursor-pointer flex items-center justify-center ${
                notifPermission === 'granted'
                  ? 'text-accent-sapphire hover:text-white bg-accent-sapphire/10'
                  : 'text-text-muted hover:text-white hover:bg-surface-elevated'
              }`}
              title={notifPermission === 'granted' ? 'Desktop alerts active' : 'Enable desktop notifications'}
            >
              {notifPermission === 'granted' ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
            </button>

            {/* Sound Chime */}
            <button
              onClick={handleToggleSound}
              className={`h-full px-2.5 transition-colors cursor-pointer flex items-center justify-center ${
                soundEnabled ? 'text-status-merged hover:text-white bg-status-merged/10' : 'text-text-muted hover:text-white hover:bg-surface-elevated'
              }`}
              title={soundEnabled ? 'Chime active' : 'Chime muted'}
            >
              {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            </button>
          </div>

          {/* Group 3: Tenant Session */}
          {user ? (
            <div className="flex items-center h-9 border border-border-subtle bg-surface-card rounded-lg overflow-hidden divide-x divide-border-subtle shadow-sm shrink-0">
              <div className="flex items-center gap-1.5 h-full px-2.5 text-xs font-mono font-bold text-white bg-base/50">
                <UserIcon className="h-3.5 w-3.5 text-accent-sapphire" />
                <span>@{user.username}</span>
              </div>
              <motion.button
                type="button"
                whileHover={{ backgroundColor: 'rgba(251, 191, 36, 0.22)', color: '#ffffff' }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.15 }}
                onClick={onOpenIntegrationsModal}
                className="flex items-center gap-1.5 h-full bg-surface-elevated px-2.5 text-xs font-mono font-bold text-text-whisper hover:text-white transition-colors cursor-pointer group"
                title="Manage linked GitHub and GitLab accounts"
              >
                <motion.div
                  whileHover={{ rotate: -20, scale: 1.15 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                  className="flex items-center"
                >
                  <Key className="h-3 w-3 text-status-awaiting-reply" />
                </motion.div>
                <span>ACCOUNTS ({integrations.length})</span>
              </motion.button>
              <button
                onClick={() => logout()}
                className="h-full px-2.5 text-text-muted hover:text-status-action-needed transition-colors cursor-pointer flex items-center justify-center"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 h-9 border border-accent-sapphire bg-accent-sapphire/20 px-3.5 rounded-lg font-mono font-bold text-xs md:text-sm text-text-whisper hover:bg-accent-sapphire/35 transition-all cursor-pointer shadow-sm shrink-0"
              title="Sign in or register"
            >
              <Lock className="h-3.5 w-3.5 text-accent-sapphire" />
              <span>SIGN_IN</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
