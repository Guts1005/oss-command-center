import React from 'react';
import { Stats } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
  RefreshCw,
  GitMerge,
  CheckCircle2,
  AlertCircle,
  Clock,
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
  onSelectFilter?: (filter: string) => void;
  activeFilter?: string;
}

export const HeaderTelemetry: React.FC<HeaderTelemetryProps> = ({
  stats,
  isSyncing,
  onSync,
  onOpenTrackModal,
  onOpenGuideModal,
  onOpenAuthModal,
  onOpenIntegrationsModal,
  onSelectFilter,
  activeFilter,
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
    <header className="border border-border-subtle bg-surface px-5 py-4 md:px-7 md:py-5 rounded-lg shadow-card select-none mb-6">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        {/* System Identity & Status HUD */}
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border-bold bg-base text-accent-sapphire shadow-inner">
            <GitMerge className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-lg md:text-xl font-extrabold tracking-tight text-text-primary uppercase font-sans">
                OSS COMMAND CENTER
              </h1>
              <span className="border border-status-merged/50 bg-status-merged/15 px-2.5 py-0.5 rounded text-xs font-bold font-mono text-status-merged">
                [SYS: ONLINE]
              </span>
              <span className="hidden sm:inline-block border border-border-subtle bg-surface-elevated px-2 py-0.5 rounded text-xs font-mono text-text-muted">
                v1.2 // SEC-GCM
              </span>
            </div>
            <p className="text-xs md:text-sm font-medium text-text-muted mt-0.5">
              MULTI-TENANT ENCRYPTED TELEMETRY HUB // GITHUB &amp; GITLAB
            </p>
          </div>
        </div>

        {/* Scaled-Up Telemetry Metrics & Command Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Action Needed Indicator (Interactive) */}
          <button
            onClick={() => onSelectFilter?.('action-needed')}
            className={`flex items-center gap-2 border px-3.5 py-2 rounded-md text-sm font-bold transition-all cursor-pointer ${
              activeFilter === 'action-needed'
                ? 'border-status-action-needed bg-status-action-needed/25 text-status-action-needed ring-2 ring-status-action-needed'
                : (stats?.actionNeeded ?? 0) > 0
                ? 'border-status-action-needed/80 bg-status-action-needed/15 text-status-action-needed hover:bg-status-action-needed/25'
                : 'border-border-subtle bg-surface-card text-text-muted hover:border-border-bold hover:text-text-whisper'
            }`}
            title="Filter: Contributions requiring developer action"
          >
            <AlertCircle className="h-4 w-4" />
            <span>ACTION_REQ:</span>
            <span className="font-mono text-base font-extrabold">{stats?.actionNeeded ?? 0}</span>
          </button>

          {/* In Review Telemetry (Interactive) */}
          <button
            onClick={() => onSelectFilter?.('active')}
            className={`flex items-center gap-2 border px-3.5 py-2 rounded-md text-sm font-bold transition-all cursor-pointer ${
              activeFilter === 'active'
                ? 'border-accent-sapphire bg-surface-active text-text-whisper ring-2 ring-accent-sapphire'
                : 'border-border-subtle bg-surface-card text-text-whisper hover:border-accent-sapphire hover:bg-surface-elevated'
            }`}
            title="Filter: Contributions currently awaiting maintainer review"
          >
            <Clock className="h-4 w-4 text-accent-sapphire" />
            <span className="text-text-muted">IN_REVIEW:</span>
            <span className="font-mono text-base font-extrabold text-text-primary">{stats?.awaitingMaintainer ?? 0}</span>
          </button>

          {/* Merged Telemetry (Interactive) */}
          <button
            onClick={() => onSelectFilter?.('merged')}
            className={`flex items-center gap-2 border px-3.5 py-2 rounded-md text-sm font-bold transition-all cursor-pointer ${
              activeFilter === 'merged'
                ? 'border-status-merged bg-status-merged/25 text-status-merged ring-2 ring-status-merged'
                : 'border-border-subtle bg-surface-card text-status-merged hover:border-status-merged hover:bg-status-merged/10'
            }`}
            title="Filter: Upstream accepted contributions"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-text-muted">MERGED:</span>
            <span className="font-mono text-base font-extrabold">{stats?.merged ?? 0}</span>
          </button>

          {/* User Session & Integration Badge */}
          {user ? (
            <div className="flex items-center border border-border-subtle bg-surface-card rounded-md overflow-hidden">
              <div className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-text-primary">
                <UserIcon className="h-4 w-4 text-accent-sapphire" />
                <span>[{user.username}]</span>
              </div>
              <button
                onClick={onOpenIntegrationsModal}
                className="flex items-center gap-1.5 border-l border-border-subtle bg-surface-elevated px-3 py-2 text-sm font-semibold text-text-whisper hover:text-white hover:bg-surface-active transition-colors"
                title="Manage linked GitHub and GitLab integrations"
              >
                <Key className="h-3.5 w-3.5 text-status-awaiting-reply" />
                <span>ACCOUNTS ({integrations.length})</span>
              </button>
              <button
                onClick={() => logout()}
                className="flex items-center border-l border-border-subtle px-2.5 py-2 text-text-muted hover:text-status-action-needed transition-colors"
                title="Sign out of active session"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center gap-2 border border-accent-sapphire bg-accent-sapphire/20 px-3.5 py-2 rounded-md font-bold text-sm text-text-whisper hover:bg-accent-sapphire/30 transition-all cursor-pointer"
              title="Sign in or register for a private encrypted workspace"
            >
              <Lock className="h-4 w-4 text-accent-sapphire" />
              <span>[SIGN_IN]</span>
            </button>
          )}

          {/* Track URL Button */}
          {onOpenTrackModal && (
            <button
              onClick={onOpenTrackModal}
              className="flex items-center gap-1.5 border border-border-bold bg-surface-elevated px-3.5 py-2 rounded-md font-bold text-sm text-text-primary hover:border-accent-sapphire hover:bg-surface-active transition-all cursor-pointer"
              title="Ingest new contribution URL"
            >
              <PlusCircle className="h-4 w-4 text-accent-sapphire" />
              <span>[+ TRACK]</span>
            </button>
          )}

          {/* Guide Quick Reference */}
          {onOpenGuideModal && (
            <button
              onClick={onOpenGuideModal}
              className="flex items-center gap-1.5 border border-border-subtle bg-surface-card px-3 py-2 rounded-md text-sm font-semibold text-text-whisper hover:border-accent-sapphire hover:text-white transition-all cursor-pointer"
              title="Open console documentation & legend (?)"
            >
              <HelpCircle className="h-4 w-4 text-text-muted" />
              <span>[GUIDE]</span>
            </button>
          )}

          {/* Notification & Sound Toggles */}
          <div className="flex items-center border border-border-subtle bg-surface-card rounded-md overflow-hidden">
            <button
              onClick={handleToggleNotifications}
              className={`p-2 transition-colors ${
                notifPermission === 'granted'
                  ? 'text-accent-sapphire hover:text-white'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              title={
                notifPermission === 'granted'
                  ? 'Desktop notification alerts active'
                  : 'Enable desktop notifications for maintainer responses'
              }
            >
              {notifPermission === 'granted' ? (
                <Bell className="h-4 w-4" />
              ) : (
                <BellOff className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={handleToggleSound}
              className={`border-l border-border-subtle p-2 transition-colors ${
                soundEnabled
                  ? 'text-status-merged hover:text-white'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              title={soundEnabled ? 'Audio chime active' : 'Audio chime muted'}
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Trigger Telemetry Sync */}
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="flex items-center gap-2 border border-border-subtle bg-surface-card px-3.5 py-2 rounded-md hover:border-accent-sapphire hover:bg-surface-elevated disabled:opacity-50 transition-all cursor-pointer"
            title="Poll upstream GitHub & GitLab APIs"
          >
            <RefreshCw className={`h-4 w-4 text-accent-glacial ${isSyncing ? 'animate-spin text-accent-sapphire' : ''}`} />
            <span className="text-text-muted text-xs font-mono font-medium">
              {isSyncing ? 'SYNCING...' : `SYNC: ${formatTime(stats?.lastSync)}`}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
