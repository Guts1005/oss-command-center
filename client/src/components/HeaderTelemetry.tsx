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
  ShieldCheck,
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
    <header className="border-b border-border-bold bg-surface px-5 py-2.5 select-none font-telemetry">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* System Identity & Status HUD */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-border-bold bg-base text-status-in-review">
            <GitMerge className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm md:text-base font-bold tracking-tight text-text-primary uppercase">
                OSS_COMMAND_CENTER
              </h1>
              <span className="border border-status-merged/40 bg-status-merged/10 px-1 py-0.2 text-[9px] font-bold text-status-merged">
                [SYS: ONLINE]
              </span>
              <span className="hidden sm:inline-block border border-border-bold bg-surface-elevated px-1 py-0.2 text-[9px] text-text-muted">
                v1.2 // SEC-GCM
              </span>
            </div>
            <p className="text-[10px] text-text-muted">
              MULTI-TENANT ENCRYPTED TELEMETRY HUB // GITHUB & GITLAB
            </p>
          </div>
        </div>

        {/* Industrial Telemetry Metrics & Command Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Action Needed Indicator (Interactive) */}
          <button
            onClick={() => onSelectFilter?.('action-needed')}
            className={`flex items-center gap-1.5 border px-2.5 py-1 text-xs transition-colors cursor-pointer ${
              activeFilter === 'action-needed'
                ? 'border-status-action-needed bg-status-action-needed/20 text-status-action-needed font-bold ring-1 ring-status-action-needed'
                : (stats?.actionNeeded ?? 0) > 0
                ? 'border-status-action-needed/60 bg-status-action-needed/10 text-status-action-needed hover:bg-status-action-needed/20'
                : 'border-border-subtle bg-base text-text-muted hover:border-border-bold'
            }`}
            title="Filter: Contributions requiring developer action"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            <span>ACTION_REQ:</span>
            <span className="font-bold">{stats?.actionNeeded ?? 0}</span>
          </button>

          {/* In Review Telemetry (Interactive) */}
          <button
            onClick={() => onSelectFilter?.('active')}
            className={`flex items-center gap-1.5 border px-2.5 py-1 text-xs transition-colors cursor-pointer ${
              activeFilter === 'active'
                ? 'border-border-active bg-surface-active text-text-primary font-bold ring-1 ring-border-active'
                : 'border-border-subtle bg-base text-text-secondary hover:border-border-bold hover:text-white'
            }`}
            title="Filter: Contributions currently awaiting maintainer review"
          >
            <Clock className="h-3.5 w-3.5 text-status-in-review" />
            <span className="text-text-muted">IN_REVIEW:</span>
            <span className="font-bold text-text-primary">{stats?.awaitingMaintainer ?? 0}</span>
          </button>

          {/* Merged Telemetry (Interactive) */}
          <button
            onClick={() => onSelectFilter?.('merged')}
            className={`flex items-center gap-1.5 border px-2.5 py-1 text-xs transition-colors cursor-pointer ${
              activeFilter === 'merged'
                ? 'border-status-merged bg-status-merged/20 text-status-merged font-bold ring-1 ring-status-merged'
                : 'border-border-subtle bg-base text-status-merged hover:border-border-bold hover:bg-status-merged/10'
            }`}
            title="Filter: Upstream accepted contributions"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="text-text-muted">MERGED:</span>
            <span className="font-bold">{stats?.merged ?? 0}</span>
          </button>

          {/* User Session & Integration Badge */}
          {user ? (
            <div className="flex items-center border border-border-bold bg-base">
              <div className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-text-primary">
                <UserIcon className="h-3 w-3 text-status-in-review" />
                <span>[{user.username}]</span>
              </div>
              <button
                onClick={onOpenIntegrationsModal}
                className="flex items-center gap-1 border-l border-border-subtle bg-surface-elevated px-2 py-1 text-text-secondary hover:text-white transition-colors"
                title="Manage linked GitHub and GitLab integrations"
              >
                <Key className="h-3 w-3 text-status-awaiting-reply" />
                <span>ACCOUNTS ({integrations.length})</span>
              </button>
              <button
                onClick={() => logout()}
                className="flex items-center border-l border-border-subtle px-1.5 py-1 text-text-muted hover:text-status-action-needed transition-colors"
                title="Sign out of active session"
              >
                <LogOut className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 border border-status-in-review/70 bg-status-in-review/15 px-2.5 py-1 font-bold text-status-in-review hover:bg-status-in-review/25 transition-colors"
              title="Sign in or register for a private encrypted workspace"
            >
              <Lock className="h-3 w-3" />
              <span>[SIGN_IN]</span>
            </button>
          )}

          {/* Track URL Button */}
          {onOpenTrackModal && (
            <button
              onClick={onOpenTrackModal}
              className="flex items-center gap-1 border border-border-bold bg-surface-elevated px-2.5 py-1 font-bold text-text-primary hover:border-border-active hover:bg-surface-active transition-colors"
              title="Ingest new contribution URL"
            >
              <PlusCircle className="h-3.5 w-3.5 text-status-in-review" />
              <span>[+ TRACK]</span>
            </button>
          )}

          {/* Guide Quick Reference */}
          {onOpenGuideModal && (
            <button
              onClick={onOpenGuideModal}
              className="flex items-center gap-1 border border-border-bold bg-surface-elevated px-2 py-1 text-text-secondary hover:border-border-active hover:text-white transition-colors"
              title="Open console documentation & legend (?)"
            >
              <HelpCircle className="h-3 w-3" />
              <span>[GUIDE]</span>
            </button>
          )}

          {/* Notification Toggles */}
          <div className="flex items-center border border-border-bold bg-base">
            <button
              onClick={handleToggleNotifications}
              className={`p-1 transition-colors ${
                notifPermission === 'granted'
                  ? 'text-status-in-review hover:text-white'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              title={
                notifPermission === 'granted'
                  ? 'Desktop notification alerts active'
                  : 'Enable desktop notifications for maintainer responses'
              }
            >
              {notifPermission === 'granted' ? (
                <Bell className="h-3.5 w-3.5" />
              ) : (
                <BellOff className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              onClick={handleToggleSound}
              className={`border-l border-border-subtle p-1 transition-colors ${
                soundEnabled
                  ? 'text-status-merged hover:text-white'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              title={soundEnabled ? 'Audio chime active' : 'Audio chime muted'}
            >
              {soundEnabled ? (
                <Volume2 className="h-3.5 w-3.5" />
              ) : (
                <VolumeX className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {/* Trigger Telemetry Sync */}
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 border border-border-bold bg-surface-elevated px-2.5 py-1 hover:border-border-active hover:bg-surface-active disabled:opacity-50 transition-colors"
            title="Poll upstream GitHub & GitLab APIs"
          >
            <RefreshCw className={`h-3 w-3 text-text-secondary ${isSyncing ? 'animate-spin text-status-in-review' : ''}`} />
            <span className="text-text-muted text-[11px]">
              {isSyncing ? 'SYNCING...' : `SYNC: ${formatTime(stats?.lastSync)}`}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
