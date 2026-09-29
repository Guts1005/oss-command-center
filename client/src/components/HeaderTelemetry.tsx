import React from 'react';
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
    <header className="border border-border-subtle chrome-surface rounded-xl select-none mb-3 px-4 py-2.5 md:px-5 md:py-2.5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
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
          {/* Group 1: Primary Action (Filled Highlight) */}
          {onOpenTrackModal && (
            <button
              onClick={onOpenTrackModal}
              className="flex items-center gap-1.5 h-9 bg-accent-sapphire hover:bg-accent-sapphire/85 text-white px-3.5 rounded-lg font-mono font-bold text-xs md:text-sm transition-all shadow-sm cursor-pointer shrink-0"
              title="Track new contribution URL"
            >
              <PlusCircle className="h-4 w-4" />
              <span>+ TRACK</span>
            </button>
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
              <button
                onClick={onOpenIntegrationsModal}
                className="flex items-center gap-1.5 h-full bg-surface-elevated px-2.5 text-xs font-mono font-bold text-text-whisper hover:text-white transition-colors cursor-pointer"
                title="Manage linked GitHub and GitLab accounts"
              >
                <Key className="h-3 w-3 text-status-awaiting-reply" />
                <span>ACCOUNTS ({integrations.length})</span>
              </button>
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
