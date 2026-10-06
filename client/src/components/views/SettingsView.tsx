import React from 'react';
import axios from 'axios';
import {
  Settings,
  Bell,
  RefreshCw,
  Volume2,
  VolumeX,
  Webhook,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Download,
  Trash2,
  Layout,
  Sliders,
  Radio,
  Copy,
  Check,
  Play,
  MessageSquare,
  Mail,
  Eye,
  ExternalLink,
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { playNotificationSound } from '../../utils/notifications';
import { ViewMode } from '../../types';
import { Footer } from '../Footer';

interface SettingsViewProps {
  onNavigateView?: (mode: ViewMode) => void;
  onOpenCookiePreferences?: () => void;
}

interface UserSettingsState {
  audio_chime_enabled: boolean;
  sync_cadence_minutes: number;
  webhook_url: string;
  webhook_secret: string;
  webhook_secret_set: boolean;
  webhook_events: string[];
  slack_webhook_url: string;
  discord_webhook_url: string;
  background_sync_enabled: boolean;
  email_digest_enabled: boolean;
  email_digest_cadence: 'daily' | 'weekly';
  email_digest_address: string;
}

interface WebhookTestResult {
  success: boolean;
  statusCode?: number;
  latencyMs?: number;
  message?: string;
  error?: string;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onNavigateView, onOpenCookiePreferences }) => {
  const { user } = useAuth();

  const [settings, setSettings] = React.useState<UserSettingsState>({
    audio_chime_enabled: true,
    sync_cadence_minutes: 30,
    webhook_url: '',
    webhook_secret: '',
    webhook_secret_set: false,
    webhook_events: ['action_needed', 'review', 'merged'],
    slack_webhook_url: '',
    discord_webhook_url: '',
    background_sync_enabled: true,
    email_digest_enabled: false,
    email_digest_cadence: 'weekly',
    email_digest_address: '',
  });

  // Client display preferences
  const [defaultView, setDefaultView] = React.useState<string>(() => {
    return localStorage.getItem('oss_default_view') || 'stream';
  });

  const [cardDensity, setCardDensity] = React.useState<string>(() => {
    return localStorage.getItem('oss_card_density') || 'comfortable';
  });

  const [alertThreshold, setAlertThreshold] = React.useState<string>(() => {
    return localStorage.getItem('oss_alert_threshold') || 'all';
  });

  const [pushStatus, setPushStatus] = React.useState<string>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [testingWebhook, setTestingWebhook] = React.useState(false);
  const [testResult, setTestResult] = React.useState<WebhookTestResult | null>(null);
  const [testingSlack, setTestingSlack] = React.useState(false);
  const [slackTestResult, setSlackTestResult] = React.useState<WebhookTestResult | null>(null);
  const [testingDiscord, setTestingDiscord] = React.useState(false);
  const [discordTestResult, setDiscordTestResult] = React.useState<WebhookTestResult | null>(null);
  const [triggeringSync, setTriggeringSync] = React.useState(false);
  const [syncTriggerMessage, setSyncTriggerMessage] = React.useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [cacheCleared, setCacheCleared] = React.useState(false);
  const [copiedType, setCopiedType] = React.useState<string | null>(null);

  // Email Digest State
  const [testingDigest, setTestingDigest] = React.useState(false);
  const [digestTestResult, setDigestTestResult] = React.useState<{ success: boolean; message?: string; error?: string; targetEmail?: string } | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = React.useState(false);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [previewTab, setPreviewTab] = React.useState<'html' | 'text'>('html');
  const [previewData, setPreviewData] = React.useState<{ html: string; text: string; summary?: any } | null>(null);

  const handleCopyUrl = (type: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  // Load backend settings
  const loadSettings = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/settings');
      if (res.data && res.data.settings) {
        setSettings({
          audio_chime_enabled: res.data.settings.audio_chime_enabled ?? true,
          sync_cadence_minutes: res.data.settings.sync_cadence_minutes ?? 30,
          webhook_url: res.data.settings.webhook_url || '',
          webhook_secret: '',
          webhook_secret_set: Boolean(res.data.settings.webhook_secret_set),
          webhook_events: res.data.settings.webhook_events || ['action_needed', 'review', 'merged'],
          slack_webhook_url: res.data.settings.slack_webhook_url || '',
          discord_webhook_url: res.data.settings.discord_webhook_url || '',
          background_sync_enabled: Boolean(res.data.settings.background_sync_enabled ?? true),
          email_digest_enabled: Boolean(res.data.settings.email_digest_enabled),
          email_digest_cadence: res.data.settings.email_digest_cadence || 'weekly',
          email_digest_address: res.data.settings.email_digest_address || '',
        });
      }
    } catch (err) {
      console.error('[SettingsView] Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Save backend configuration
  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setSaveSuccess(false);

      const payload: any = {
        audio_chime_enabled: settings.audio_chime_enabled,
        sync_cadence_minutes: settings.sync_cadence_minutes,
        webhook_url: settings.webhook_url.trim(),
        webhook_events: settings.webhook_events,
        slack_webhook_url: settings.slack_webhook_url.trim(),
        discord_webhook_url: settings.discord_webhook_url.trim(),
        background_sync_enabled: settings.background_sync_enabled,
        email_digest_enabled: settings.email_digest_enabled,
        email_digest_cadence: settings.email_digest_cadence,
        email_digest_address: settings.email_digest_address.trim(),
      };

      if (settings.webhook_secret) {
        payload.webhook_secret = settings.webhook_secret.trim();
      }

      const res = await axios.post('/api/settings', payload);
      if (res.data && res.data.success) {
        setSaveSuccess(true);
        localStorage.setItem('oss_sound_enabled', String(settings.audio_chime_enabled));
        localStorage.setItem('oss_default_view', defaultView);
        localStorage.setItem('oss_card_density', cardDensity);
        localStorage.setItem('oss_alert_threshold', alertThreshold);

        if (payload.webhook_secret) {
          setSettings(prev => ({ ...prev, webhook_secret_set: true, webhook_secret: '' }));
        }
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('[SettingsView] Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  // Test email digest dispatch handler
  const handleTestDigest = async () => {
    try {
      setTestingDigest(true);
      setDigestTestResult(null);
      const res = await axios.post('/api/digest/test', {
        cadence: settings.email_digest_cadence,
        email: settings.email_digest_address.trim() || undefined
      });
      setDigestTestResult({
        success: true,
        message: res.data.message || `Digest successfully sent to ${res.data.targetEmail}`,
        targetEmail: res.data.targetEmail
      });
    } catch (err: any) {
      setDigestTestResult({
        success: false,
        error: err.response?.data?.error || err.message || 'Digest test dispatch failed'
      });
    } finally {
      setTestingDigest(false);
    }
  };

  // Open email digest preview modal
  const handleOpenDigestPreview = async () => {
    try {
      setPreviewModalOpen(true);
      setPreviewLoading(true);
      const res = await axios.get(`/api/digest/preview?cadence=${settings.email_digest_cadence}`);
      setPreviewData(res.data);
    } catch (err: any) {
      console.error('[SettingsView] Failed to load digest preview:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Test Slack webhook handler
  const handleTestSlack = async () => {
    if (!settings.slack_webhook_url) {
      setSlackTestResult({
        success: false,
        error: 'Please enter a Slack incoming webhook URL before testing.',
      });
      return;
    }
    try {
      setTestingSlack(true);
      setSlackTestResult(null);
      const res = await axios.post('/api/settings/slack-test', {
        slack_webhook_url: settings.slack_webhook_url.trim(),
      });
      setSlackTestResult({
        success: res.data.success,
        statusCode: res.data.statusCode,
        latencyMs: res.data.latencyMs,
        message: res.data.message,
      });
    } catch (err: any) {
      setSlackTestResult({
        success: false,
        error: err.response?.data?.error || err.message,
        statusCode: err.response?.status,
        latencyMs: err.response?.data?.latencyMs,
      });
    } finally {
      setTestingSlack(false);
    }
  };

  // Test Discord webhook handler
  const handleTestDiscord = async () => {
    if (!settings.discord_webhook_url) {
      setDiscordTestResult({
        success: false,
        error: 'Please enter a Discord webhook URL before testing.',
      });
      return;
    }
    try {
      setTestingDiscord(true);
      setDiscordTestResult(null);
      const res = await axios.post('/api/settings/discord-test', {
        discord_webhook_url: settings.discord_webhook_url.trim(),
      });
      setDiscordTestResult({
        success: res.data.success,
        statusCode: res.data.statusCode,
        latencyMs: res.data.latencyMs,
        message: res.data.message,
      });
    } catch (err: any) {
      setDiscordTestResult({
        success: false,
        error: err.response?.data?.error || err.message,
        statusCode: err.response?.status,
        latencyMs: err.response?.data?.latencyMs,
      });
    } finally {
      setTestingDiscord(false);
    }
  };

  // Manual trigger of background sync pass
  const handleTriggerSync = async () => {
    try {
      setTriggeringSync(true);
      setSyncTriggerMessage(null);
      const res = await axios.post('/api/sync/trigger');
      if (res.data && res.data.success) {
        setSyncTriggerMessage(`Sync pass finished: ${res.data.usersProcessed} user(s), ${res.data.changesDetected} update(s) detected.`);
        setTimeout(() => setSyncTriggerMessage(null), 5000);
      }
    } catch (err: any) {
      setSyncTriggerMessage(`Sync pass failed: ${err.message}`);
      setTimeout(() => setSyncTriggerMessage(null), 5000);
    } finally {
      setTriggeringSync(false);
    }
  };

  // Test webhook ping handler
  const handleTestWebhook = async () => {
    if (!settings.webhook_url && !settings.webhook_secret_set) {
      setTestResult({
        success: false,
        error: 'Please enter a target webhook URL before running a dispatch test.',
      });
      return;
    }

    try {
      setTestingWebhook(true);
      setTestResult(null);

      const res = await axios.post('/api/settings/webhook-test', {
        webhook_url: settings.webhook_url,
        webhook_secret: settings.webhook_secret || undefined,
      });

      setTestResult({
        success: res.data.success,
        statusCode: res.data.statusCode,
        latencyMs: res.data.latencyMs,
        message: res.data.message,
        error: res.data.error,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err.response?.data?.error || err.message || 'Webhook dispatch failed',
        latencyMs: err.response?.data?.latencyMs,
      });
    } finally {
      setTestingWebhook(false);
    }
  };

  // Export full telemetry JSON backup
  const handleExportData = async () => {
    try {
      setExporting(true);
      const res = await axios.get('/api/settings/export', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `oss-telemetry-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('[SettingsView] Failed to export data:', err);
    } finally {
      setExporting(false);
    }
  };

  // Request browser push permissions
  const handleRequestPushPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      setPushStatus(permission);
    }
  };

  // Clear client cached preferences
  const handleClearCache = () => {
    localStorage.removeItem('oss_default_view');
    localStorage.removeItem('oss_card_density');
    localStorage.removeItem('oss_alert_threshold');
    setDefaultView('stream');
    setCardDensity('comfortable');
    setAlertThreshold('all');
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 2500);
  };

  const toggleEvent = (eventName: string) => {
    setSettings(prev => {
      const exists = prev.webhook_events.includes(eventName);
      const next = exists
        ? prev.webhook_events.filter(e => e !== eventName)
        : [...prev.webhook_events, eventName];
      return { ...prev, webhook_events: next };
    });
  };

  const handleTestAudioChime = () => {
    playNotificationSound();
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 py-3 overflow-y-auto custom-scrollbar w-full">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-3 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-accent-sapphire" />
            <h2 className="text-base sm:text-lg lg:text-xl font-extrabold uppercase font-sans tracking-tight text-text-primary">
              OPERATIONAL SETTINGS & DISPATCH
            </h2>
          </div>
          <p className="text-xs font-mono text-text-muted mt-0.5">
            Configure display density, background pull intervals, alert triggers, and webhook pipelines.
          </p>
        </div>

        {/* Save button in header */}
        <button
          type="button"
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-accent-sapphire hover:bg-accent-sapphire/80 text-white font-mono font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>SAVING...</span>
            </>
          ) : saveSuccess ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-status-merged" />
              <span>SAVED SUCCESSFULLY</span>
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" />
              <span>SAVE CONFIGURATION</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column: Display Preferences & Sync Cadence */}
        <div className="space-y-4">
          {/* Display & Interface Preferences */}
          <div className="chrome-card border border-border-subtle rounded-xl p-5 shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <Layout className="h-4 w-4 text-accent-sapphire" />
              <h3 className="text-sm sm:text-base font-bold font-sans text-text-primary uppercase tracking-wider">
                INTERFACE & DISPLAY PREFERENCES
              </h3>
            </div>
            <p className="text-xs font-sans text-text-muted mb-4">
              Personalize default startup perspectives and list density across desktop and mobile screens.
            </p>

            <div className="space-y-3.5">
              {/* Default View Selector */}
              <div>
                <label className="text-[11px] font-mono text-text-muted uppercase block mb-1.5">
                  Default Startup Workspace
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                  {[
                    { id: 'stream', label: 'STREAM' },
                    { id: 'analytics', label: 'ANALYTICS' },
                    { id: 'repos', label: 'REPOSITORIES' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setDefaultView(item.id)}
                      className={`p-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center ${
                        defaultView === item.id
                          ? 'border-border-active bg-surface-active text-text-primary'
                          : 'border-border-subtle bg-surface text-text-muted hover:text-text-primary'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card Density */}
              <div>
                <label className="text-[11px] font-mono text-text-muted uppercase block mb-1.5">
                  Contribution Stream Density
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  {[
                    { id: 'comfortable', label: 'COMFORTABLE' },
                    { id: 'compact', label: 'COMPACT (HIGH DENSITY)' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCardDensity(item.id)}
                      className={`p-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center ${
                        cardDensity === item.id
                          ? 'border-border-active bg-surface-active text-text-primary'
                          : 'border-border-subtle bg-surface text-text-muted hover:text-text-primary'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Autonomous Background Sync Worker */}
          <div className="border border-border-subtle bg-surface-card rounded-xl p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className={`h-4 w-4 text-accent-glacial ${triggeringSync ? 'animate-spin' : ''}`} />
                <h3 className="text-xs font-mono font-bold text-text-primary uppercase tracking-wider">
                  AUTONOMOUS BACKGROUND SYNC
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSettings(prev => ({ ...prev, background_sync_enabled: !prev.background_sync_enabled }))}
                className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                  settings.background_sync_enabled
                    ? 'border-status-merged/40 bg-status-merged/10 text-status-merged'
                    : 'border-border-subtle bg-surface text-text-muted'
                }`}
              >
                {settings.background_sync_enabled ? 'WORKER ACTIVE' : 'WORKER PAUSED'}
              </button>
            </div>

            <p className="text-xs font-sans text-text-muted">
              Autonomous background worker polls connected accounts on a scheduled cadence even when the browser is closed, triggering real-time webhooks on state changes.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-text-muted uppercase">Sync Cadence Interval</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                {[
                  { minutes: 15, label: '15 MIN' },
                  { minutes: 30, label: '30 MIN (STD)' },
                  { minutes: 60, label: '1 HOUR' },
                  { minutes: 1440, label: 'DAILY' },
                ].map((item) => (
                  <button
                    key={item.minutes}
                    type="button"
                    onClick={() => setSettings(prev => ({ ...prev, sync_cadence_minutes: item.minutes }))}
                    className={`p-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center ${
                      settings.sync_cadence_minutes === item.minutes
                        ? 'border-border-active bg-surface-active text-text-primary'
                        : 'border-border-subtle bg-surface text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-border-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <button
                type="button"
                onClick={handleTriggerSync}
                disabled={triggeringSync}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle bg-surface hover:bg-surface-elevated text-xs font-mono font-bold text-text-primary transition-colors cursor-pointer disabled:opacity-50"
              >
                {triggeringSync ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>SYNCING PASS...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 text-accent-glacial" />
                    <span>RUN SYNC PASS NOW</span>
                  </>
                )}
              </button>
              {syncTriggerMessage && (
                <span className="text-[11px] font-mono text-status-merged">
                  {syncTriggerMessage}
                </span>
              )}
            </div>
          </div>

          {/* Audio Chimes & Alert Urgency */}
          <div className="chrome-card border border-border-subtle rounded-xl p-5 shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="h-4 w-4 text-accent-sapphire" />
              <h3 className="text-sm sm:text-base font-bold font-sans text-text-primary uppercase tracking-wider">
                ALERTS & SOUND SIGNALS
              </h3>
            </div>

            <div className="space-y-3">
              {/* Audio Chime */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg border border-border-subtle bg-surface">
                <div>
                  <div className="text-xs font-mono font-bold text-text-primary">Dual-Tone Audio Chime</div>
                  <div className="text-[11px] font-sans text-text-muted">
                    Subtle chime when review activity arrives or action is required.
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleTestAudioChime}
                    className="px-2.5 py-1 rounded border border-border-subtle bg-surface-card hover:bg-surface-elevated text-[11px] font-mono text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                  >
                    PREVIEW
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings(prev => ({ ...prev, audio_chime_enabled: !prev.audio_chime_enabled }))}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
                      settings.audio_chime_enabled
                        ? 'bg-status-merged/10 text-status-merged border-status-merged/40'
                        : 'bg-surface-card text-text-muted border-border-subtle'
                    }`}
                  >
                    {settings.audio_chime_enabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                    <span>{settings.audio_chime_enabled ? 'ENABLED' : 'MUTED'}</span>
                  </button>
                </div>
              </div>

              {/* Alert Urgency Filter */}
              <div className="p-3 rounded-lg border border-border-subtle bg-surface">
                <div className="text-xs font-mono font-bold text-text-primary mb-1">Alert Notification Threshold</div>
                <p className="text-[11px] font-sans text-text-muted mb-2">
                  Select whether alerts notify on every activity event or only when direct intervention is needed.
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  {[
                    { id: 'all', label: 'ALL ACTIVITY EVENTS' },
                    { id: 'action_only', label: 'ACTION REQUIRED ONLY' },
                  ].map((threshold) => (
                    <button
                      key={threshold.id}
                      type="button"
                      onClick={() => setAlertThreshold(threshold.id)}
                      className={`p-2 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center ${
                        alertThreshold === threshold.id
                          ? 'border-border-active bg-surface-active text-text-primary'
                          : 'border-border-subtle bg-surface-card text-text-muted hover:text-text-primary'
                      }`}
                    >
                      {threshold.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Browser Push Permission */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg border border-border-subtle bg-surface">
                <div>
                  <div className="text-xs font-mono font-bold text-text-primary">System Desktop Notifications</div>
                  <div className="text-[11px] font-sans text-text-muted">
                    Display native OS desktop banners when tabs run in background.
                  </div>
                </div>
                <div className="shrink-0">
                  {pushStatus === 'granted' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-status-merged/40 bg-status-merged/10 text-status-merged text-xs font-mono font-bold">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>AUTHORIZED</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRequestPushPermission}
                      className="px-3 py-1 rounded-lg border border-border-subtle bg-surface-card hover:bg-surface-elevated text-xs font-mono font-bold text-text-primary transition-colors cursor-pointer"
                    >
                      REQUEST ACCESS
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Email Summaries & Digest Engine */}
          <div className="chrome-card border border-border-subtle rounded-xl p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-accent-sapphire" />
                <h3 className="text-sm sm:text-base font-bold font-sans text-text-primary uppercase tracking-wider">
                  EMAIL DIGEST & WEEKLY BRIEFINGS
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSettings(prev => ({ ...prev, email_digest_enabled: !prev.email_digest_enabled }))}
                className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                  settings.email_digest_enabled
                    ? 'border-status-merged/40 bg-status-merged/10 text-status-merged'
                    : 'border-border-subtle bg-surface text-text-muted'
                }`}
              >
                {settings.email_digest_enabled ? 'DIGEST ACTIVE' : 'DIGEST PAUSED'}
              </button>
            </div>

            <p className="text-xs font-sans text-text-muted">
              Receive structured contribution briefings with urgent reviews, replies owed, and recently merged code formatted in high-contrast obsidian email cards.
            </p>

            {/* Cadence Selection */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-text-muted uppercase">Dispatch Cadence</label>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                {[
                  { id: 'weekly', label: 'WEEKLY BRIEFING (RECOMMENDED)' },
                  { id: 'daily', label: 'DAILY STANDUP' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSettings(prev => ({ ...prev, email_digest_cadence: item.id as 'daily' | 'weekly' }))}
                    className={`p-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer text-center ${
                      settings.email_digest_cadence === item.id
                        ? 'border-border-active bg-surface-active text-text-primary'
                        : 'border-border-subtle bg-surface text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Recipient Address */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-mono text-text-muted uppercase">
                  Target Recipient Email
                </label>
                <span className="text-[10px] font-mono text-text-muted">
                  DEFAULT: {user?.email || 'account email'}
                </span>
              </div>
              <input
                type="email"
                value={settings.email_digest_address}
                onChange={(e) => setSettings(prev => ({ ...prev, email_digest_address: e.target.value }))}
                placeholder={user?.email || 'developer@example.com'}
                className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-xs font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-border-active"
              />
              <p className="text-[10px] font-mono text-text-muted">
                Leave blank to automatically deliver to your primary registered account email address.
              </p>
            </div>

            {/* Actions: Preview & Test Dispatch */}
            <div className="pt-2 border-t border-border-subtle space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenDigestPreview}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle bg-surface hover:bg-surface-elevated text-xs font-mono font-bold text-text-primary transition-colors cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5 text-accent-sapphire" />
                    <span>PREVIEW DIGEST</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestDigest}
                    disabled={testingDigest}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle bg-surface hover:bg-surface-elevated text-xs font-mono font-bold text-text-primary transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {testingDigest ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>DISPATCHING...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5 text-accent-glacial" />
                        <span>SEND TEST DIGEST</span>
                      </>
                    )}
                  </button>
                </div>

                <span className="text-[10px] font-mono text-text-whisper">
                  RESEND / SMTP / MOCK
                </span>
              </div>

              {digestTestResult && (
                <div className={`flex items-center gap-2 text-[11px] font-mono px-2.5 py-1 rounded border ${
                  digestTestResult.success
                    ? 'border-status-merged/40 bg-status-merged/10 text-status-merged'
                    : 'border-status-closed/40 bg-status-closed/10 text-status-closed'
                }`}>
                  {digestTestResult.success ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span>{digestTestResult.message || digestTestResult.error}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Webhook Routing & Data Controls */}
        <div className="space-y-4">
          {/* Inbound Webhooks (Zero-Latency Instant Sync) */}
          <div className="chrome-card border border-border-subtle rounded-xl p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-accent-sapphire animate-pulse" />
                <h3 className="text-sm sm:text-base font-bold font-sans text-text-primary uppercase tracking-wider">
                  INBOUND WEBHOOKS (ZERO-LATENCY SYNC)
                </h3>
              </div>
              <span className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded border border-status-merged/40 bg-status-merged/10 text-status-merged">
                <span className="h-1.5 w-1.5 rounded-full bg-status-merged animate-ping" />
                <span>REAL-TIME SSE ACTIVE</span>
              </span>
            </div>

            <p className="text-xs font-sans text-text-muted">
              Connect repository webhooks to receive instantaneous updates whenever reviews are posted or PRs are merged. Bypasses polling delays with zero latency.
            </p>

            {/* GitHub Inbound Webhook URL */}
            <div className="space-y-1.5 bg-surface p-3.5 rounded-lg border border-border-subtle">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-text-primary uppercase">
                  GitHub Webhook Endpoint
                </span>
                <span className="text-[10px] font-mono text-accent-sapphire">
                  HMAC-SHA256 VERIFIED
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={user ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/github/${user.id}` : `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/github`}
                  className="w-full bg-base border border-border-subtle rounded px-2.5 py-1.5 text-xs font-mono text-text-whisper select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleCopyUrl('github', user ? `${window.location.origin}/api/webhooks/github/${user.id}` : `${window.location.origin}/api/webhooks/github`)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded border border-border-subtle bg-surface-card hover:bg-surface-elevated text-xs font-mono font-bold text-text-primary shrink-0 transition-colors cursor-pointer"
                >
                  {copiedType === 'github' ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-status-merged" />
                      <span className="text-status-merged">COPIED</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-text-muted" />
                      <span>COPY</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[10px] font-mono text-text-muted pt-1">
                Configure in Repo Settings &gt; Webhooks: Content type: <code className="text-text-primary">application/json</code>, Secret: your webhook secret, Events: <code className="text-text-primary">Pull requests, Issue comments, Reviews</code>.
              </p>
            </div>

            {/* GitLab Inbound Webhook URL */}
            <div className="space-y-1.5 bg-surface p-3.5 rounded-lg border border-border-subtle">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-text-primary uppercase">
                  GitLab Webhook Endpoint
                </span>
                <span className="text-[10px] font-mono text-accent-sapphire">
                  TOKEN VERIFIED
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={user ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/gitlab/${user.id}` : `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/gitlab`}
                  className="w-full bg-base border border-border-subtle rounded px-2.5 py-1.5 text-xs font-mono text-text-whisper select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleCopyUrl('gitlab', user ? `${window.location.origin}/api/webhooks/gitlab/${user.id}` : `${window.location.origin}/api/webhooks/gitlab`)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded border border-border-subtle bg-surface-card hover:bg-surface-elevated text-xs font-mono font-bold text-text-primary shrink-0 transition-colors cursor-pointer"
                >
                  {copiedType === 'gitlab' ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-status-merged" />
                      <span className="text-status-merged">COPIED</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-text-muted" />
                      <span>COPY</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[10px] font-mono text-text-muted pt-1">
                Configure in GitLab Project Settings &gt; Webhooks: Secret token: your webhook secret, Trigger: <code className="text-text-primary">Merge requests, Comments</code>.
              </p>
            </div>
          </div>

          {/* Outbound Webhook Routing */}
          <div className="chrome-card border border-border-subtle rounded-xl p-5 shadow-card flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Webhook className="h-4 w-4 text-accent-sapphire" />
                  <h3 className="text-sm sm:text-base font-bold font-sans text-text-primary uppercase tracking-wider">
                    OUTBOUND WEBHOOK ROUTING
                  </h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-border-subtle bg-surface text-text-muted">
                  HMAC-SHA256 SIGNED
                </span>
              </div>
              <p className="text-xs font-sans text-text-muted mb-4">
                Forward real-time contribution alerts to Discord, Slack, Telegram, or custom automation endpoints.
              </p>

              {/* Slack Incoming Webhook */}
              <div className="space-y-2 bg-surface p-3.5 rounded-lg border border-border-subtle mb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5 text-accent-sapphire" />
                    <span className="text-[11px] font-mono font-bold text-text-primary uppercase">
                      Slack Incoming Webhook
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-accent-sapphire">
                    BLOCK KIT ALERTS
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={settings.slack_webhook_url}
                    onChange={(e) => setSettings(prev => ({ ...prev, slack_webhook_url: e.target.value }))}
                    placeholder="https://hooks.slack.com/services/..."
                    className="w-full bg-base border border-border-subtle rounded px-2.5 py-1.5 text-xs font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-border-active"
                  />
                  <button
                    type="button"
                    onClick={handleTestSlack}
                    disabled={testingSlack || !settings.slack_webhook_url}
                    className="flex items-center gap-1 px-3 py-1.5 rounded border border-border-subtle bg-surface-card hover:bg-surface-elevated text-xs font-mono font-bold text-text-primary shrink-0 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    {testingSlack ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>TESTING...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5 text-accent-sapphire" />
                        <span>TEST SLACK</span>
                      </>
                    )}
                  </button>
                </div>
                {slackTestResult && (
                  <div className={`flex items-center gap-2 text-[11px] font-mono px-2.5 py-1 rounded border ${
                    slackTestResult.success
                      ? 'border-status-merged/40 bg-status-merged/10 text-status-merged'
                      : 'border-status-closed/40 bg-status-closed/10 text-status-closed'
                  }`}>
                    {slackTestResult.success ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span>
                      {slackTestResult.success
                        ? `Slack delivery verified (${slackTestResult.latencyMs}ms)`
                        : (slackTestResult.error || 'Slack dispatch failed')}
                    </span>
                  </div>
                )}
                <p className="text-[10px] font-mono text-text-muted">
                  Formats reviews, required actions, and merges as native Slack Block Kit cards.
                </p>
              </div>

              {/* Discord Webhook */}
              <div className="space-y-2 bg-surface p-3.5 rounded-lg border border-border-subtle mb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="h-3.5 w-3.5 text-accent-sapphire" />
                    <span className="text-[11px] font-mono font-bold text-text-primary uppercase">
                      Discord Channel Webhook
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-accent-sapphire">
                    RICH EMBEDS
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={settings.discord_webhook_url}
                    onChange={(e) => setSettings(prev => ({ ...prev, discord_webhook_url: e.target.value }))}
                    placeholder="https://discord.com/api/webhooks/..."
                    className="w-full bg-base border border-border-subtle rounded px-2.5 py-1.5 text-xs font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-border-active"
                  />
                  <button
                    type="button"
                    onClick={handleTestDiscord}
                    disabled={testingDiscord || !settings.discord_webhook_url}
                    className="flex items-center gap-1 px-3 py-1.5 rounded border border-border-subtle bg-surface-card hover:bg-surface-elevated text-xs font-mono font-bold text-text-primary shrink-0 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    {testingDiscord ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>TESTING...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5 text-accent-sapphire" />
                        <span>TEST DISCORD</span>
                      </>
                    )}
                  </button>
                </div>
                {discordTestResult && (
                  <div className={`flex items-center gap-2 text-[11px] font-mono px-2.5 py-1 rounded border ${
                    discordTestResult.success
                      ? 'border-status-merged/40 bg-status-merged/10 text-status-merged'
                      : 'border-status-closed/40 bg-status-closed/10 text-status-closed'
                  }`}>
                    {discordTestResult.success ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span>
                      {discordTestResult.success
                        ? `Discord delivery verified (${discordTestResult.latencyMs}ms)`
                        : (discordTestResult.error || 'Discord dispatch failed')}
                    </span>
                  </div>
                )}
                <p className="text-[10px] font-mono text-text-muted">
                  Formats alerts into status-colored Discord embeds (Amber for replies, Green for merges).
                </p>
              </div>

              {/* Custom Webhook URL Input */}
              <div className="space-y-1.5 mb-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono text-text-muted uppercase">Custom Webhook Endpoint</label>
                  <span className="text-[10px] font-mono text-text-whisper">GENERIC JSON</span>
                </div>
                <input
                  type="url"
                  value={settings.webhook_url}
                  onChange={(e) => setSettings(prev => ({ ...prev, webhook_url: e.target.value }))}
                  placeholder="https://example.com/api/webhook-listener"
                  className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-xs font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-border-active"
                />
              </div>

              {/* Webhook Secret Input */}
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono text-text-muted uppercase">HMAC Signing Secret</label>
                  {settings.webhook_secret_set && (
                    <span className="text-[10px] font-mono text-status-merged">SECRET CURRENTLY CONFIGURED</span>
                  )}
                </div>
                <input
                  type="password"
                  value={settings.webhook_secret}
                  onChange={(e) => setSettings(prev => ({ ...prev, webhook_secret: e.target.value }))}
                  placeholder={settings.webhook_secret_set ? 'Enter new secret to rotate...' : 'Optional secret for X-OSS-Signature verification'}
                  className="w-full bg-surface border border-border-subtle rounded-lg px-3 py-2 text-xs font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-border-active"
                />
                <p className="text-[10px] font-mono text-text-muted">
                  Payloads are signed with HMAC-SHA256 and sent via the <code className="text-text-primary">X-OSS-Signature</code> header.
                </p>
              </div>

              {/* Event Subscriptions */}
              <div className="space-y-2 mb-4">
                <label className="text-[11px] font-mono text-text-muted uppercase">Forwarded Event Types</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  {[
                    { id: 'action_needed', label: 'Action Required' },
                    { id: 'review', label: 'Review Activity' },
                    { id: 'merged', label: 'PR Merged' },
                    { id: 'status_change', label: 'Status Updates' },
                  ].map((evt) => {
                    const active = settings.webhook_events.includes(evt.id);
                    return (
                      <button
                        key={evt.id}
                        type="button"
                        onClick={() => toggleEvent(evt.id)}
                        className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                          active
                            ? 'border-border-active bg-surface-active text-text-primary'
                            : 'border-border-subtle bg-surface text-text-muted hover:text-text-primary'
                        }`}
                      >
                        <span>{evt.label}</span>
                        <span className={`text-[10px] font-bold ${active ? 'text-status-merged' : 'text-text-muted'}`}>
                          {active ? 'ON' : 'OFF'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Test Ping & Status Bar */}
            <div className="pt-3 border-t border-border-subtle">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <button
                  type="button"
                  onClick={handleTestWebhook}
                  disabled={testingWebhook || !settings.webhook_url}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg border border-border-subtle bg-surface hover:bg-surface-elevated text-xs font-mono font-bold text-text-primary transition-all cursor-pointer disabled:opacity-40"
                >
                  {testingWebhook ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>DISPATCHING...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5 text-accent-sapphire" />
                      <span>TEST DISPATCH PING</span>
                    </>
                  )}
                </button>

                {testResult && (
                  <div className={`flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-lg border ${
                    testResult.success
                      ? 'border-status-merged/40 bg-status-merged/10 text-status-merged'
                      : 'border-status-closed/40 bg-status-closed/10 text-status-closed'
                  }`}>
                    {testResult.success ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0" />
                    )}
                    <span>
                      {testResult.success
                        ? `Delivery verified (${testResult.latencyMs}ms)`
                        : (testResult.error || 'Failed')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Data Management & Cache Controls */}
          <div className="chrome-card border border-border-subtle rounded-xl p-5 shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <Sliders className="h-4 w-4 text-accent-sapphire" />
              <h3 className="text-sm sm:text-base font-bold font-sans text-text-primary uppercase tracking-wider">
                DATA MANAGEMENT & CACHE
              </h3>
            </div>
            <p className="text-xs font-sans text-text-muted mb-4">
              Export comprehensive telemetry snapshots or reset locally cached filters and query states.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              {/* Export JSON Button */}
              <button
                type="button"
                onClick={handleExportData}
                disabled={exporting}
                className="flex items-center justify-center gap-2 p-3 rounded-lg border border-border-subtle bg-surface hover:bg-surface-elevated text-text-primary font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin text-accent-sapphire" />
                ) : (
                  <Download className="h-4 w-4 text-accent-sapphire" />
                )}
                <span>EXPORT DATA (JSON)</span>
              </button>

              {/* Clear Cache Button */}
              <button
                type="button"
                onClick={handleClearCache}
                className="flex items-center justify-center gap-2 p-3 rounded-lg border border-border-subtle bg-surface hover:bg-surface-elevated text-text-primary font-bold transition-all cursor-pointer"
              >
                {cacheCleared ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-status-merged" />
                    <span className="text-status-merged">CACHE PURGED</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 text-text-muted" />
                    <span>RESET CLIENT PREFERENCES</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <Footer
          variant="dashboard"
          onNavigateView={onNavigateView}
          onOpenCookiePreferences={onOpenCookiePreferences}
        />
      </div>

      {/* Email Digest Preview Modal */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-base border border-border-subtle rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-subtle bg-surface-card shrink-0">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-accent-sapphire" />
                <h3 className="text-sm font-bold font-sans uppercase tracking-wider text-text-primary">
                  EMAIL DIGEST LIVE PREVIEW
                </h3>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface border border-border-subtle text-text-muted">
                  {settings.email_digest_cadence}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center border border-border-subtle rounded-lg overflow-hidden bg-surface text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setPreviewTab('html')}
                    className={`px-3 py-1 font-bold transition-colors cursor-pointer ${
                      previewTab === 'html'
                        ? 'bg-accent-sapphire text-white'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    HTML RENDER
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab('text')}
                    className={`px-3 py-1 font-bold transition-colors cursor-pointer ${
                      previewTab === 'text'
                        ? 'bg-accent-sapphire text-white'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    PLAIN TEXT
                  </button>
                </div>

                <a
                  href={`/api/digest/preview?cadence=${settings.email_digest_cadence}&format=html`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] font-mono text-accent-sapphire hover:underline"
                >
                  <span>OPEN IN TAB</span>
                  <ExternalLink className="h-3 w-3" />
                </a>

                <button
                  type="button"
                  onClick={() => setPreviewModalOpen(false)}
                  className="p-1 rounded-lg border border-border-subtle text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-base">
              {!user ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center max-w-md mx-auto">
                  <div className="p-3.5 rounded-2xl bg-accent-sapphire/10 border border-accent-sapphire/30 text-accent-sapphire mb-3">
                    <Mail className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-bold font-sans uppercase tracking-wider text-text-primary mb-1.5">
                    AUTHENTICATION REQUIRED
                  </h4>
                  <p className="text-xs font-sans text-text-muted mb-4 leading-relaxed">
                    Sign in to compile a personalized contribution briefing from your connected GitHub and GitLab accounts.
                  </p>
                </div>
              ) : previewLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-text-muted font-mono text-xs">
                  <Loader2 className="h-6 w-6 animate-spin text-accent-sapphire" />
                  <span>COMPILING CONTRIBUTION DIGEST...</span>
                </div>
              ) : previewTab === 'html' ? (
                <div className="rounded-xl overflow-hidden border border-border-subtle shadow-inner bg-[#0a0d14]">
                  <iframe
                    title="Digest HTML Preview"
                    srcDoc={previewData?.html || '<p style="padding:20px;color:#999;font-family:sans-serif;">No preview generated.</p>'}
                    className="w-full h-[600px] border-0"
                    sandbox="allow-same-origin"
                  />
                </div>
              ) : (
                <pre className="p-4 rounded-xl bg-surface border border-border-subtle font-mono text-xs text-text-primary whitespace-pre-wrap select-all leading-relaxed">
                  {previewData?.text || 'No text preview available.'}
                </pre>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-border-subtle bg-surface-card flex items-center justify-between shrink-0">
              <span className="text-[11px] font-mono text-text-muted">
                Obsidian and sapphire responsive template designed for modern email clients.
              </span>
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="px-4 py-1.5 rounded-lg border border-border-subtle bg-surface hover:bg-surface-elevated text-xs font-mono font-bold text-text-primary transition-colors cursor-pointer"
              >
                CLOSE PREVIEW
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
