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
  Radio
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { playNotificationSound } from '../../utils/notifications';
import { ViewMode } from '../../types';

interface SettingsViewProps {
  onNavigateView?: (mode: ViewMode) => void;
}

interface UserSettingsState {
  audio_chime_enabled: boolean;
  sync_cadence_minutes: number;
  webhook_url: string;
  webhook_secret: string;
  webhook_secret_set: boolean;
  webhook_events: string[];
}

interface WebhookTestResult {
  success: boolean;
  statusCode?: number;
  latencyMs?: number;
  message?: string;
  error?: string;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onNavigateView }) => {
  const { user } = useAuth();

  const [settings, setSettings] = React.useState<UserSettingsState>({
    audio_chime_enabled: true,
    sync_cadence_minutes: 30,
    webhook_url: '',
    webhook_secret: '',
    webhook_secret_set: false,
    webhook_events: ['action_needed', 'review', 'merged'],
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
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [cacheCleared, setCacheCleared] = React.useState(false);

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

          {/* Sync Daemon Cadence */}
          <div className="border border-border-subtle bg-surface-card rounded-xl p-5 shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <RefreshCw className="h-4 w-4 text-accent-glacial" />
              <h3 className="text-xs font-mono font-bold text-text-primary uppercase tracking-wider">
                BACKGROUND SYNC CADENCE
              </h3>
            </div>
            <p className="text-xs font-sans text-text-muted mb-3">
              Frequency of automated background sync cycles across connected GitHub and GitLab profiles.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              {[
                { minutes: 15, label: '15 MIN' },
                { minutes: 30, label: '30 MIN (STD)' },
                { minutes: 60, label: '1 HOUR' },
                { minutes: 1440, label: 'MANUAL ONLY' },
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
        </div>

        {/* Right Column: Outbound Webhook Routing & Data Controls */}
        <div className="space-y-4">
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

              {/* Webhook URL Input */}
              <div className="space-y-1.5 mb-3">
                <label className="text-[11px] font-mono text-text-muted uppercase">Target Webhook URL</label>
                <input
                  type="url"
                  value={settings.webhook_url}
                  onChange={(e) => setSettings(prev => ({ ...prev, webhook_url: e.target.value }))}
                  placeholder="https://discord.com/api/webhooks/... or https://hooks.slack.com/..."
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
      </div>
    </div>
  );
};
