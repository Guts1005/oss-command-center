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
    <header className="border border-border-subtle bg-surface rounded-xl shadow-card select-none mb-6 overflow-hidden">
      {/* Tier 1: Main Control Bar (Brand Identity Left, Neat Clustered Actions Right) */}
      <div className="px-6 py-4 md:px-8 md:py-4 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        {/* Left: System Identity & Status HUD */}
        <div className="flex items-center gap-3.5 shrink-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border-bold bg-base text-accent-sapphire shadow-inner">
            <GitMerge className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-white uppercase font-sans">
                OSS COMMAND CENTER
              </h1>
              <span className="border border-status-merged/50 bg-status-merged/15 px-2.5 py-0.5 rounded text-xs font-bold font-mono text-status-merged">
                [SYS: ONLINE]
              </span>
              <span className="hidden sm:inline-block border border-border-subtle bg-surface-elevated px-2 py-0.5 rounded text-xs font-mono text-text-muted">
                v1.0 // SEC-GCM
              </span>
            </div>
            <p className="text-xs md:text-sm font-medium text-text-muted mt-0.5 font-sans">
              MULTI-TENANT ENCRYPTED TELEMETRY HUB // GITHUB &amp; GITLAB
            </p>
          </div>
        </div>

        {/* Right: Organized Action & Toolbar Groups (Neatly clustered, uniform height) */}
        <div className="flex items-center gap-3 flex-wrap xl:flex-nowrap shrink-0">
          {/* Group 1: Primary Ingest Action */}
          {onOpenTrackModal && (
            <button
              onClick={onOpenTrackModal}
              className="flex items-center gap-2 h-10 border border-accent-sapphire bg-accent-sapphire/25 px-4 rounded-lg font-mono font-bold text-xs md:text-sm text-text-whisper hover:bg-accent-sapphire/35 hover:text-white transition-all shadow-sm cursor-pointer shrink-0"
              title="Ingest new contribution URL"
            >
              <PlusCircle className="h-4 w-4 text-accent-sapphire" />
              <span>+ TRACK</span>
            </button>
          )}

          {/* Group 2: System Utility Toolbelt */}
          <div className="flex items-center h-10 border border-border-subtle bg-surface-card rounded-lg overflow-hidden divide-x divide-border-subtle shadow-sm shrink-0">
            {/* Sync Button */}
            <button
              onClick={onSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 h-full px-3.5 text-xs md:text-sm font-mono text-text-muted hover:text-white hover:bg-surface-elevated transition-colors disabled:opacity-50 cursor-pointer"
              title="Poll upstream GitHub & GitLab APIs"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-accent-glacial ${isSyncing ? 'animate-spin text-accent-sapphire' : ''}`} />
              <span className="hidden sm:inline font-medium">{isSyncing ? 'SYNCING...' : `SYNC: ${formatTime(stats?.lastSync)}`}</span>
            </button>

            {/* Guide Quick Reference */}
            {onOpenGuideModal && (
              <button
                onClick={onOpenGuideModal}
                className="flex items-center gap-1.5 h-full px-3 text-xs md:text-sm font-mono text-text-muted hover:text-white hover:bg-surface-elevated transition-colors cursor-pointer"
                title="Open operational reference manual (?)"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                <span className="font-medium">GUIDE</span>
              </button>
            )}

            {/* Desktop Notification Toggle */}
            <button
              onClick={handleToggleNotifications}
              className={`h-full px-3 transition-colors cursor-pointer flex items-center justify-center ${
                notifPermission === 'granted'
                  ? 'text-accent-sapphire hover:text-white bg-accent-sapphire/10'
                  : 'text-text-muted hover:text-white hover:bg-surface-elevated'
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

            {/* Sound Chime Toggle */}
            <button
              onClick={handleToggleSound}
              className={`h-full px-3 transition-colors cursor-pointer flex items-center justify-center ${
                soundEnabled
                  ? 'text-status-merged hover:text-white bg-status-merged/10'
                  : 'text-text-muted hover:text-white hover:bg-surface-elevated'
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

          {/* Group 3: Tenant User Session */}
          {user ? (
            <div className="flex items-center h-10 border border-border-subtle bg-surface-card rounded-lg overflow-hidden divide-x divide-border-subtle shadow-sm shrink-0">
              <div className="flex items-center gap-1.5 h-full px-3.5 text-xs md:text-sm font-mono font-bold text-white bg-base/50">
                <UserIcon className="h-3.5 w-3.5 text-accent-sapphire" />
                <span>@{user.username}</span>
              </div>
              <button
                onClick={onOpenIntegrationsModal}
                className="flex items-center gap-1.5 h-full bg-surface-elevated px-3 text-xs md:text-sm font-mono font-bold text-text-whisper hover:text-white hover:bg-surface-active transition-colors cursor-pointer"
                title="Manage linked GitHub and GitLab accounts"
              >
                <Key className="h-3.5 w-3.5 text-status-awaiting-reply" />
                <span>ACCOUNTS ({integrations.length})</span>
              </button>
              <button
                onClick={() => logout()}
                className="h-full px-3 text-text-muted hover:text-status-action-needed hover:bg-surface-elevated transition-colors cursor-pointer flex items-center justify-center"
                title="Sign out of active session"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center gap-2 h-10 border border-accent-sapphire bg-accent-sapphire/20 px-4 rounded-lg font-mono font-bold text-xs md:text-sm text-text-whisper hover:bg-accent-sapphire/35 transition-all cursor-pointer shadow-sm shrink-0"
              title="Sign in or register for a private encrypted workspace"
            >
              <Lock className="h-4 w-4 text-accent-sapphire" />
              <span>SIGN_IN</span>
            </button>
          )}
        </div>
      </div>

      {/* Tier 2: Dedicated Full-Width Telemetry KPI Strip */}
      <div className="border-t border-border-subtle bg-base/60 px-6 py-2.5 md:px-8 flex flex-col md:flex-row md:items-center md:justify-between gap-3 font-mono text-xs">
        {/* Left: KPI Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="text-text-muted uppercase font-bold tracking-wider mr-1 hidden lg:inline">
            TELEMETRY KPI:
          </span>

          {/* Action Needed Metric Chip */}
          <button
            onClick={() => onSelectFilter?.('action-needed')}
            className={`flex items-center gap-2 px-3 py-1 rounded-md font-bold transition-all cursor-pointer border ${
              activeFilter === 'action-needed'
                ? 'border-status-action-needed bg-status-action-needed/25 text-status-action-needed shadow-sm ring-1 ring-status-action-needed'
                : (stats?.actionNeeded ?? 0) > 0
                ? 'border-status-action-needed/50 bg-status-action-needed/15 text-status-action-needed hover:bg-status-action-needed/25'
                : 'border-border-subtle bg-surface text-text-muted hover:text-white'
            }`}
            title="Filter: Contributions requiring developer action"
          >
            <span className={`h-2 w-2 rounded-full bg-status-action-needed shrink-0 ${(stats?.actionNeeded ?? 0) > 0 ? 'animate-pulse' : ''}`} />
            <span>ACTION_REQ:</span>
            <span className="text-sm font-extrabold">{stats?.actionNeeded ?? 0}</span>
          </button>

          {/* In Review Metric Chip */}
          <button
            onClick={() => onSelectFilter?.('active')}
            className={`flex items-center gap-2 px-3 py-1 rounded-md font-bold transition-all cursor-pointer border ${
              activeFilter === 'active'
                ? 'border-accent-sapphire bg-accent-sapphire/25 text-text-whisper shadow-sm ring-1 ring-accent-sapphire'
                : 'border-border-subtle bg-surface text-text-muted hover:text-white hover:border-accent-sapphire'
            }`}
            title="Filter: Contributions currently awaiting maintainer review"
          >
            <span className="h-2 w-2 rounded-full bg-accent-sapphire shrink-0" />
            <span>IN_REVIEW:</span>
            <span className="text-sm font-extrabold text-white">{stats?.awaitingMaintainer ?? 0}</span>
          </button>

          {/* Merged Metric Chip */}
          <button
            onClick={() => onSelectFilter?.('merged')}
            className={`flex items-center gap-2 px-3 py-1 rounded-md font-bold transition-all cursor-pointer border ${
              activeFilter === 'merged'
                ? 'border-status-merged bg-status-merged/25 text-status-merged shadow-sm ring-1 ring-status-merged'
                : 'border-border-subtle bg-surface text-text-muted hover:text-status-merged hover:border-status-merged/50'
            }`}
            title="Filter: Upstream accepted contributions"
          >
            <span className="h-2 w-2 rounded-full bg-status-merged shrink-0" />
            <span>MERGED:</span>
            <span className="text-sm font-extrabold text-white">{stats?.merged ?? 0}</span>
          </button>

          {/* Total Metric Chip */}
          <button
            onClick={() => onSelectFilter?.('all')}
            className={`flex items-center gap-2 px-3 py-1 rounded-md font-bold transition-all cursor-pointer border ${
              activeFilter === 'all'
                ? 'border-border-bold bg-surface-elevated text-white shadow-sm'
                : 'border-border-subtle bg-surface text-text-muted hover:text-white'
            }`}
            title="Show all tracked contributions"
          >
            <span className="h-2 w-2 rounded-full bg-text-muted shrink-0" />
            <span>TOTAL_TRACKED:</span>
            <span className="text-sm font-extrabold text-white">{stats?.total ?? 0}</span>
          </button>
        </div>

        {/* Right: Operational Status Info */}
        <div className="hidden sm:flex items-center gap-3 text-text-muted shrink-0 font-mono text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-status-merged" />
            <span>SYS: OPTIMAL</span>
          </span>
          <span>•</span>
          <span>POLL: 30s</span>
          <span>•</span>
          <span>ENCRYPTION: AES-256-GCM</span>
        </div>
      </div>
    </header>
  );
};
