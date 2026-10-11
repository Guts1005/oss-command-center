import React from 'react';
import axios from 'axios';
import {
  Settings as SettingsIcon,
  Bell,
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
  MessageSquare,
  Mail,
  Eye,
  ExternalLink,
  Workflow,
  X,
  Search,
  Shield,
  User as UserIcon,
  ChevronRight,
  RefreshCw,
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
  n8n_webhook_url: string;
  n8n_webhook_secret: string;
  n8n_webhook_secret_set: boolean;
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

type SettingsCategory =
  | 'general'
  | 'notifications'
  | 'digest'
  | 'chat'
  | 'webhooks'
  | 'data';

interface CategoryMeta {
  id: SettingsCategory;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  badgeBg: string;
}

const CATEGORIES: CategoryMeta[] = [
  {
    id: 'general',
    label: 'General & Workspace',
    shortLabel: 'General',
    description: 'Startup layout, density, and sync frequency',
    icon: Sliders,
    accentColor: 'text-accent-sapphire',
    badgeBg: 'bg-accent-sapphire/15 border-accent-sapphire/30',
  },
  {
    id: 'notifications',
    label: 'Notifications & Sound',
    shortLabel: 'Alerts',
    description: 'Audio chimes, thresholds, and push alerts',
    icon: Bell,
    accentColor: 'text-status-awaiting-reply',
    badgeBg: 'bg-status-awaiting-reply/15 border-status-awaiting-reply/30',
  },
  {
    id: 'digest',
    label: 'Email Digest',
    shortLabel: 'Digest',
    description: 'Weekly briefings and automated summaries',
    icon: Mail,
    accentColor: 'text-status-merged',
    badgeBg: 'bg-status-merged/15 border-status-merged/30',
  },
  {
    id: 'chat',
    label: 'Chat Integrations',
    shortLabel: 'Chat',
    description: 'Real-time alerts for Slack and Discord',
    icon: MessageSquare,
    accentColor: 'text-accent-glacial',
    badgeBg: 'bg-accent-glacial/15 border-accent-glacial/30',
  },
  {
    id: 'webhooks',
    label: 'Webhooks & Automation',
    shortLabel: 'Webhooks',
    description: 'Inbound repos, n8n pipelines, and custom HTTP',
    icon: Workflow,
    accentColor: 'text-purple-400',
    badgeBg: 'bg-purple-500/15 border-purple-500/30',
  },
  {
    id: 'data',
    label: 'Data & Privacy',
    shortLabel: 'Data',
    description: 'Backup export, local cache, and cookie policy',
    icon: Shield,
    accentColor: 'text-text-muted',
    badgeBg: 'bg-surface-elevated border-border-bold',
  },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  onNavigateView,
  onOpenCookiePreferences,
}) => {
  const { user } = useAuth();

  const [activeCategory, setActiveCategory] = React.useState<SettingsCategory>('general');
  const [searchQuery, setSearchQuery] = React.useState('');

  const [settings, setSettings] = React.useState<UserSettingsState>({
    audio_chime_enabled: true,
    sync_cadence_minutes: 30,
    webhook_url: '',
    webhook_secret: '',
    webhook_secret_set: false,
    webhook_events: ['action_needed', 'review', 'merged'],
    slack_webhook_url: '',
    discord_webhook_url: '',
    n8n_webhook_url: '',
    n8n_webhook_secret: '',
    n8n_webhook_secret_set: false,
    background_sync_enabled: true,
    email_digest_enabled: false,
    email_digest_cadence: 'weekly',
    email_digest_address: '',
  });

  const [initialSettings, setInitialSettings] = React.useState<UserSettingsState | null>(null);

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
  const [testingN8n, setTestingN8n] = React.useState(false);
  const [n8nTestResult, setN8nTestResult] = React.useState<WebhookTestResult | null>(null);
  const [triggeringSync, setTriggeringSync] = React.useState(false);
  const [syncTriggerMessage, setSyncTriggerMessage] = React.useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [cacheCleared, setCacheCleared] = React.useState(false);
  const [copiedType, setCopiedType] = React.useState<string | null>(null);

  // Email Digest State
  const [testingDigest, setTestingDigest] = React.useState(false);
  const [digestTestResult, setDigestTestResult] = React.useState<{
    success: boolean;
    message?: string;
    error?: string;
    targetEmail?: string;
  } | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = React.useState(false);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [previewTab, setPreviewTab] = React.useState<'html' | 'text'>('html');
  const [previewData, setPreviewData] = React.useState<{
    html: string;
    text: string;
    summary?: any;
  } | null>(null);

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
        const loaded: UserSettingsState = {
          audio_chime_enabled: res.data.settings.audio_chime_enabled ?? true,
          sync_cadence_minutes: res.data.settings.sync_cadence_minutes ?? 30,
          webhook_url: res.data.settings.webhook_url || '',
          webhook_secret: '',
          webhook_secret_set: Boolean(res.data.settings.webhook_secret_set),
          webhook_events: res.data.settings.webhook_events || ['action_needed', 'review', 'merged'],
          slack_webhook_url: res.data.settings.slack_webhook_url || '',
          discord_webhook_url: res.data.settings.discord_webhook_url || '',
          n8n_webhook_url: res.data.settings.n8n_webhook_url || '',
          n8n_webhook_secret: '',
          n8n_webhook_secret_set: Boolean(res.data.settings.n8n_webhook_secret_set),
          background_sync_enabled: Boolean(res.data.settings.background_sync_enabled ?? true),
          email_digest_enabled: Boolean(res.data.settings.email_digest_enabled),
          email_digest_cadence: res.data.settings.email_digest_cadence || 'weekly',
          email_digest_address: res.data.settings.email_digest_address || '',
        };
        setSettings(loaded);
        setInitialSettings(loaded);
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

  // Determine if there are unsaved server changes
  const hasUnsavedChanges = React.useMemo(() => {
    if (!initialSettings) return false;
    return (
      settings.audio_chime_enabled !== initialSettings.audio_chime_enabled ||
      settings.sync_cadence_minutes !== initialSettings.sync_cadence_minutes ||
      settings.webhook_url !== initialSettings.webhook_url ||
      Boolean(settings.webhook_secret) ||
      JSON.stringify(settings.webhook_events) !== JSON.stringify(initialSettings.webhook_events) ||
      settings.slack_webhook_url !== initialSettings.slack_webhook_url ||
      settings.discord_webhook_url !== initialSettings.discord_webhook_url ||
      settings.n8n_webhook_url !== initialSettings.n8n_webhook_url ||
      Boolean(settings.n8n_webhook_secret) ||
      settings.background_sync_enabled !== initialSettings.background_sync_enabled ||
      settings.email_digest_enabled !== initialSettings.email_digest_enabled ||
      settings.email_digest_cadence !== initialSettings.email_digest_cadence ||
      settings.email_digest_address !== initialSettings.email_digest_address
    );
  }, [settings, initialSettings]);

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
        n8n_webhook_url: settings.n8n_webhook_url.trim(),
        background_sync_enabled: settings.background_sync_enabled,
        email_digest_enabled: settings.email_digest_enabled,
        email_digest_cadence: settings.email_digest_cadence,
        email_digest_address: settings.email_digest_address.trim(),
      };

      if (settings.webhook_secret) {
        payload.webhook_secret = settings.webhook_secret.trim();
      }

      if (settings.n8n_webhook_secret) {
        payload.n8n_webhook_secret = settings.n8n_webhook_secret.trim();
      }

      const res = await axios.post('/api/settings', payload);
      if (res.data && res.data.success) {
        setSaveSuccess(true);
        localStorage.setItem('oss_sound_enabled', String(settings.audio_chime_enabled));
        localStorage.setItem('oss_default_view', defaultView);
        localStorage.setItem('oss_card_density', cardDensity);
        localStorage.setItem('oss_alert_threshold', alertThreshold);

        const updated: UserSettingsState = {
          ...settings,
          webhook_secret_set: payload.webhook_secret ? true : settings.webhook_secret_set,
          webhook_secret: '',
          n8n_webhook_secret_set: payload.n8n_webhook_secret ? true : settings.n8n_webhook_secret_set,
          n8n_webhook_secret: '',
        };
        setSettings(updated);
        setInitialSettings(updated);
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
        email: settings.email_digest_address.trim() || undefined,
      });
      setDigestTestResult({
        success: true,
        message: res.data.message || `Digest successfully sent to ${res.data.targetEmail}`,
        targetEmail: res.data.targetEmail,
      });
    } catch (err: any) {
      setDigestTestResult({
        success: false,
        error: err.response?.data?.error || err.message || 'Digest test dispatch failed',
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

  // Test n8n webhook pipeline handler
  const handleTestN8n = async () => {
    if (!settings.n8n_webhook_url) {
      setN8nTestResult({
        success: false,
        error: 'Please enter an n8n webhook URL before testing.',
      });
      return;
    }
    try {
      setTestingN8n(true);
      setN8nTestResult(null);
      const res = await axios.post('/api/settings/n8n-test', {
        n8n_webhook_url: settings.n8n_webhook_url.trim(),
        n8n_webhook_secret: settings.n8n_webhook_secret ? settings.n8n_webhook_secret.trim() : undefined,
      });
      setN8nTestResult({
        success: res.data.success,
        statusCode: res.data.statusCode,
        latencyMs: res.data.latencyMs,
        message: res.data.message,
      });
    } catch (err: any) {
      setN8nTestResult({
        success: false,
        error: err.response?.data?.error || err.message,
        statusCode: err.response?.status,
        latencyMs: err.response?.data?.latencyMs,
      });
    } finally {
      setTestingN8n(false);
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

  // Test custom webhook ping handler
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

  // Search filter helper
  const isSearchActive = searchQuery.trim().length > 0;
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const currentCategoryMeta = CATEGORIES.find(c => c.id === activeCategory) || CATEGORIES[0];

  return (
    <div className="flex-1 flex flex-col min-h-0 py-3 overflow-y-auto custom-scrollbar w-full">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-sapphire/10 border border-accent-sapphire/30 text-accent-sapphire">
            <SettingsIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold font-sans text-text-primary tracking-tight">
              Settings
            </h1>
            <p className="text-xs font-sans text-text-muted mt-0.5">
              Personalize interface preferences, notification triggers, and automation pipelines.
            </p>
          </div>
        </div>

        {/* Global Save Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={saving || (!hasUnsavedChanges && !saveSuccess)}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-sans text-xs font-semibold transition-all cursor-pointer shadow-sm ${
              saveSuccess
                ? 'bg-status-merged text-white'
                : hasUnsavedChanges
                ? 'bg-accent-sapphire hover:bg-accent-sapphire/90 text-white ring-2 ring-accent-sapphire/30 animate-pulse'
                : 'bg-surface-elevated text-text-muted hover:text-text-primary border border-border-subtle opacity-70 cursor-default'
            }`}
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Changes Saved</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>{hasUnsavedChanges ? 'Save Changes' : 'All Changes Saved'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quick Search Bar (Apple / Android Style) */}
      <div className="mb-4">
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 h-4 w-4 text-text-muted pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all settings (e.g., Slack, sound, density, digest, webhooks)..."
            className="w-full bg-surface border border-border-subtle rounded-xl pl-10 pr-9 py-2 text-xs font-sans text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-sapphire focus:ring-1 focus:ring-accent-sapphire/40 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Two-Column Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0">
        {/* Left Column: Category Navigation Sidebar */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-3">
          {/* User Account Capsule (Apple ID Style) */}
          {user && (
            <div className="chrome-card border border-border-subtle rounded-xl p-3.5 flex items-center gap-3 bg-surface">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-sapphire/20 border border-accent-sapphire/40 text-accent-sapphire font-mono font-bold text-sm">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-sans font-semibold text-xs sm:text-sm text-text-primary truncate">
                    {user.username}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border border-border-bold bg-base text-text-muted">
                    Pro
                  </span>
                </div>
                <p className="text-[11px] font-mono text-text-muted truncate mt-0.5">
                  {user.email || 'Connected Developer'}
                </p>
              </div>
            </div>
          )}

          {/* Navigation Category List */}
          <div className="chrome-card border border-border-subtle rounded-xl p-2 bg-surface flex flex-col gap-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted px-2.5 py-1.5">
              Categories
            </span>
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = activeCategory === cat.id && !isSearchActive;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setSearchQuery('');
                  }}
                  className={`flex items-center justify-between p-2.5 rounded-lg text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-surface-active text-text-primary shadow-sm border border-border-active/40'
                      : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated/70'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${cat.badgeBg} ${cat.accentColor}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-sans font-semibold text-xs text-text-primary truncate">
                        {cat.label}
                      </div>
                      <div className="font-sans text-[11px] text-text-muted truncate hidden sm:block">
                        {cat.description}
                      </div>
                    </div>
                  </div>
                  <ChevronRight
                    className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                      isSelected ? 'text-accent-sapphire translate-x-0.5' : 'text-text-muted/50'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Inset Grouped Settings Panels */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-4">
          {/* Section 1: GENERAL & WORKSPACE */}
          {(isSearchActive
            ? 'general workspace startup layout density sync polling'.includes(normalizedQuery)
            : activeCategory === 'general') && (
            <div className="space-y-4">
              <div className="border-b border-border-subtle/80 pb-2">
                <h2 className="text-base font-bold font-sans text-text-primary">
                  General & Workspace
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Configure default view states, card density, and background pull frequencies.
                </p>
              </div>

              {/* Inset Group: Interface Preferences */}
              <div className="chrome-card border border-border-subtle rounded-2xl overflow-hidden bg-surface shadow-card">
                <div className="px-4 py-3 border-b border-border-subtle/60 bg-surface-card flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-text-muted">
                    Display & Workspace
                  </span>
                  <span className="text-[10px] font-mono text-text-muted">Client Preferences</span>
                </div>

                <div className="divide-y divide-border-subtle/40">
                  {/* Default Startup View */}
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="font-sans font-semibold text-xs sm:text-sm text-text-primary">
                        Default Startup Workspace
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">
                        Choose which perspective opens first when launching the console.
                      </p>
                    </div>
                    <div className="inline-flex rounded-xl p-1 bg-surface-elevated border border-border-subtle shrink-0">
                      {[
                        { id: 'stream', label: 'Stream' },
                        { id: 'analytics', label: 'Analytics' },
                        { id: 'repos', label: 'Repositories' },
                      ].map((view) => (
                        <button
                          key={view.id}
                          type="button"
                          onClick={() => setDefaultView(view.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-sans font-medium transition-all cursor-pointer ${
                            defaultView === view.id
                              ? 'bg-accent-sapphire text-white shadow-sm font-semibold'
                              : 'text-text-muted hover:text-text-primary'
                          }`}
                        >
                          {view.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Contribution Stream Density */}
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="font-sans font-semibold text-xs sm:text-sm text-text-primary">
                        Stream Card Density
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">
                        Switch between generous breathing room and dense tabular inspection.
                      </p>
                    </div>
                    <div className="inline-flex rounded-xl p-1 bg-surface-elevated border border-border-subtle shrink-0">
                      {[
                        { id: 'comfortable', label: 'Comfortable' },
                        { id: 'compact', label: 'Compact' },
                      ].map((density) => (
                        <button
                          key={density.id}
                          type="button"
                          onClick={() => setCardDensity(density.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-sans font-medium transition-all cursor-pointer ${
                            cardDensity === density.id
                              ? 'bg-accent-sapphire text-white shadow-sm font-semibold'
                              : 'text-text-muted hover:text-text-primary'
                          }`}
                        >
                          {density.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Inset Group: Sync Cadence */}
              <div className="chrome-card border border-border-subtle rounded-2xl overflow-hidden bg-surface shadow-card">
                <div className="px-4 py-3 border-b border-border-subtle/60 bg-surface-card flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-text-muted">
                    Background Polling & Sync
                  </span>
                  <span className="text-[10px] font-mono text-status-merged">Worker Active</span>
                </div>

                <div className="divide-y divide-border-subtle/40">
                  {/* Background Sync Master Toggle */}
                  <div className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-sans font-semibold text-xs sm:text-sm text-text-primary">
                        Autonomous Background Worker
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">
                        Continuously polls GitHub and GitLab upstream even when this tab is closed.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings.background_sync_enabled}
                      onClick={() =>
                        setSettings(prev => ({
                          ...prev,
                          background_sync_enabled: !prev.background_sync_enabled,
                        }))
                      }
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        settings.background_sync_enabled ? 'bg-accent-sapphire' : 'bg-surface-elevated'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                          settings.background_sync_enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Sync Cadence Interval */}
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="font-sans font-semibold text-xs sm:text-sm text-text-primary">
                        Polling Frequency Interval
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">
                        Adjust how frequently upstream repositories are scanned for activity.
                      </p>
                    </div>
                    <div className="inline-flex rounded-xl p-1 bg-surface-elevated border border-border-subtle shrink-0">
                      {[
                        { minutes: 15, label: '15m' },
                        { minutes: 30, label: '30m' },
                        { minutes: 60, label: '1h' },
                        { minutes: 1440, label: 'Daily' },
                      ].map((item) => (
                        <button
                          key={item.minutes}
                          type="button"
                          onClick={() =>
                            setSettings(prev => ({ ...prev, sync_cadence_minutes: item.minutes }))
                          }
                          className={`px-3 py-1 rounded-lg text-xs font-sans font-medium transition-all cursor-pointer ${
                            settings.sync_cadence_minutes === item.minutes
                              ? 'bg-accent-sapphire text-white shadow-sm font-semibold'
                              : 'text-text-muted hover:text-text-primary'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Manual Sync Trigger */}
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-surface-elevated/20">
                    <div>
                      <div className="font-sans font-semibold text-xs sm:text-sm text-text-primary">
                        Manual Upstream Sync
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">
                        Trigger an immediate on-demand fetch pass across all connected accounts.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleTriggerSync}
                      disabled={triggeringSync}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-border-subtle bg-surface hover:bg-surface-elevated text-xs font-sans font-semibold text-text-primary transition-all cursor-pointer disabled:opacity-40 shrink-0"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 text-accent-sapphire ${triggeringSync ? 'animate-spin' : ''}`} />
                      <span>{triggeringSync ? 'Syncing...' : 'Sync Now'}</span>
                    </button>
                  </div>
                </div>

                {syncTriggerMessage && (
                  <div className="p-3 bg-accent-sapphire/10 border-t border-accent-sapphire/30 text-xs font-mono text-accent-sapphire flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-status-merged" />
                    <span>{syncTriggerMessage}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 2: NOTIFICATIONS & SOUND */}
          {(isSearchActive
            ? 'notification sound audio chime alert threshold push'.includes(normalizedQuery)
            : activeCategory === 'notifications') && (
            <div className="space-y-4">
              <div className="border-b border-border-subtle/80 pb-2">
                <h2 className="text-base font-bold font-sans text-text-primary">
                  Notifications & Sound Signals
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Manage dual-tone audio cues, alert trigger thresholds, and browser push permissions.
                </p>
              </div>

              {/* Inset Group: Audio & Triggers */}
              <div className="chrome-card border border-border-subtle rounded-2xl overflow-hidden bg-surface shadow-card">
                <div className="px-4 py-3 border-b border-border-subtle/60 bg-surface-card flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-text-muted">
                    Audio & Triggers
                  </span>
                  <span className="text-[10px] font-mono text-text-muted">Local Hardware</span>
                </div>

                <div className="divide-y divide-border-subtle/40">
                  {/* Dual-Tone Audio Chime */}
                  <div className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-sans font-semibold text-xs sm:text-sm text-text-primary">
                          Dual-Tone Audio Chime
                        </span>
                        {settings.audio_chime_enabled ? (
                          <Volume2 className="h-4 w-4 text-accent-sapphire" />
                        ) : (
                          <VolumeX className="h-4 w-4 text-text-muted" />
                        )}
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">
                        Play an acoustic tone when maintainers reply or code revisions are requested.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleTestAudioChime}
                        className="px-2.5 py-1 rounded-lg border border-border-subtle bg-surface hover:bg-surface-elevated text-xs font-sans text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                        title="Test chime sound"
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={settings.audio_chime_enabled}
                        onClick={() =>
                          setSettings(prev => ({
                            ...prev,
                            audio_chime_enabled: !prev.audio_chime_enabled,
                          }))
                        }
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          settings.audio_chime_enabled ? 'bg-accent-sapphire' : 'bg-surface-elevated'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                            settings.audio_chime_enabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Alert Threshold */}
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="font-sans font-semibold text-xs sm:text-sm text-text-primary">
                        Alert Trigger Sensitivity
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">
                        Notify on every discussion event or exclusively when your direct intervention is required.
                      </p>
                    </div>
                    <div className="inline-flex rounded-xl p-1 bg-surface-elevated border border-border-subtle shrink-0">
                      {[
                        { id: 'all', label: 'All Activity' },
                        { id: 'action_required', label: 'Action Required Only' },
                      ].map((thresh) => (
                        <button
                          key={thresh.id}
                          type="button"
                          onClick={() => setAlertThreshold(thresh.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-sans font-medium transition-all cursor-pointer ${
                            alertThreshold === thresh.id
                              ? 'bg-accent-sapphire text-white shadow-sm font-semibold'
                              : 'text-text-muted hover:text-text-primary'
                          }`}
                        >
                          {thresh.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Browser Push Permissions */}
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="font-sans font-semibold text-xs sm:text-sm text-text-primary">
                        Native Browser Notifications
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">
                        Receive desktop banners for incoming maintainer comments.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-mono capitalize text-text-muted px-2 py-0.5 rounded border border-border-subtle bg-base">
                        {pushStatus}
                      </span>
                      {pushStatus !== 'granted' && (
                        <button
                          type="button"
                          onClick={handleRequestPushPermission}
                          className="px-3 py-1 rounded-xl border border-accent-sapphire bg-accent-sapphire/20 text-text-whisper hover:bg-accent-sapphire/30 text-xs font-sans font-semibold transition-colors cursor-pointer"
                        >
                          Enable Push
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 3: EMAIL DIGEST */}
          {(isSearchActive
            ? 'email digest briefing newsletter weekly daily'.includes(normalizedQuery)
            : activeCategory === 'digest') && (
            <div className="space-y-4">
              <div className="border-b border-border-subtle/80 pb-2">
                <h2 className="text-base font-bold font-sans text-text-primary">
                  Email Digest & Periodic Briefings
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Receive structured, executive contribution summaries delivered to your inbox.
                </p>
              </div>

              {/* Inset Group: Digest Controls */}
              <div className="chrome-card border border-border-subtle rounded-2xl overflow-hidden bg-surface shadow-card">
                <div className="px-4 py-3 border-b border-border-subtle/60 bg-surface-card flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-text-muted">
                    Automated Email Dispatch
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      settings.email_digest_enabled
                        ? 'border-status-merged/40 bg-status-merged/10 text-status-merged'
                        : 'border-border-subtle bg-base text-text-muted'
                    }`}
                  >
                    {settings.email_digest_enabled ? 'Digest Active' : 'Digest Paused'}
                  </span>
                </div>

                <div className="divide-y divide-border-subtle/40">
                  {/* Master Toggle */}
                  <div className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-sans font-semibold text-xs sm:text-sm text-text-primary">
                        Enable Scheduled Email Briefings
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">
                        Summarizes PR progress, reviews owed, and newly merged code in a crisp email layout.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings.email_digest_enabled}
                      onClick={() =>
                        setSettings(prev => ({
                          ...prev,
                          email_digest_enabled: !prev.email_digest_enabled,
                        }))
                      }
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        settings.email_digest_enabled ? 'bg-accent-sapphire' : 'bg-surface-elevated'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                          settings.email_digest_enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Delivery Cadence */}
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="font-sans font-semibold text-xs sm:text-sm text-text-primary">
                        Dispatch Frequency Cadence
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">
                        Select how often your summary briefing is delivered.
                      </p>
                    </div>
                    <div className="inline-flex rounded-xl p-1 bg-surface-elevated border border-border-subtle shrink-0">
                      {[
                        { id: 'weekly', label: 'Weekly Briefing' },
                        { id: 'daily', label: 'Daily Standup' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            setSettings(prev => ({
                              ...prev,
                              email_digest_cadence: item.id as 'daily' | 'weekly',
                            }))
                          }
                          className={`px-3 py-1 rounded-lg text-xs font-sans font-medium transition-all cursor-pointer ${
                            settings.email_digest_cadence === item.id
                              ? 'bg-accent-sapphire text-white shadow-sm font-semibold'
                              : 'text-text-muted hover:text-text-primary'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Recipient Address */}
                  <div className="p-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-sans font-semibold text-xs text-text-primary">
                        Target Recipient Address
                      </label>
                      <span className="text-[10px] font-mono text-text-muted">
                        Default: {user?.email || 'Registered account email'}
                      </span>
                    </div>
                    <input
                      type="email"
                      value={settings.email_digest_address}
                      onChange={(e) =>
                        setSettings(prev => ({ ...prev, email_digest_address: e.target.value }))
                      }
                      placeholder={user?.email || 'developer@example.com'}
                      className="w-full bg-surface-elevated border border-border-subtle rounded-xl px-3 py-2 text-xs font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-sapphire"
                    />
                    <p className="text-[11px] font-sans text-text-muted">
                      Leave blank to automatically deliver to your primary registered account email address.
                    </p>
                  </div>

                  {/* Test & Preview Actions */}
                  <div className="p-4 flex flex-wrap items-center justify-between gap-3 bg-surface-elevated/20">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleOpenDigestPreview}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-subtle bg-surface hover:bg-surface-elevated text-xs font-sans font-semibold text-text-primary transition-colors cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5 text-accent-sapphire" />
                        <span>Preview Digest</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleTestDigest}
                        disabled={testingDigest}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-subtle bg-surface hover:bg-surface-elevated text-xs font-sans font-semibold text-text-primary transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {testingDigest ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Dispatching...</span>
                          </>
                        ) : (
                          <>
                            <Send className="h-3.5 w-3.5 text-status-merged" />
                            <span>Send Test Email</span>
                          </>
                        )}
                      </button>
                    </div>
                    <span className="text-[10px] font-mono text-text-muted">
                      Supported: Resend / SMTP / Local Mock
                    </span>
                  </div>
                </div>

                {digestTestResult && (
                  <div
                    className={`p-3 text-xs font-mono flex items-center gap-2 border-t ${
                      digestTestResult.success
                        ? 'bg-status-merged/10 border-status-merged/30 text-status-merged'
                        : 'bg-status-action-needed/10 border-status-action-needed/30 text-status-action-needed'
                    }`}
                  >
                    {digestTestResult.success ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0" />
                    )}
                    <span>{digestTestResult.message || digestTestResult.error}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 4: CHAT INTEGRATIONS */}
          {(isSearchActive
            ? 'chat slack discord channel bot webhook alert'.includes(normalizedQuery)
            : activeCategory === 'chat') && (
            <div className="space-y-4">
              <div className="border-b border-border-subtle/80 pb-2">
                <h2 className="text-base font-bold font-sans text-text-primary">
                  Chat Integrations (Slack & Discord)
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Forward real-time contribution alerts to team collaboration channels.
                </p>
              </div>

              {/* Inset Group: Slack */}
              <div className="chrome-card border border-border-subtle rounded-2xl overflow-hidden bg-surface shadow-card">
                <div className="px-4 py-3 border-b border-border-subtle/60 bg-surface-card flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-accent-sapphire" />
                    <span className="text-xs font-mono font-bold uppercase text-text-primary">
                      Slack Incoming Webhook
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-accent-sapphire px-2 py-0.5 rounded border border-accent-sapphire/30 bg-accent-sapphire/10">
                    Block Kit Formatted
                  </span>
                </div>

                <div className="p-4 space-y-3">
                  <p className="text-xs font-sans text-text-muted">
                    Formats reviews, required actions, and merges as native Slack Block Kit cards.
                  </p>

                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={settings.slack_webhook_url}
                      onChange={(e) =>
                        setSettings(prev => ({ ...prev, slack_webhook_url: e.target.value }))
                      }
                      placeholder="https://hooks.slack.com/services/T.../B.../..."
                      className="w-full bg-surface-elevated border border-border-subtle rounded-xl px-3 py-2 text-xs font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-sapphire"
                    />
                    <button
                      type="button"
                      onClick={handleTestSlack}
                      disabled={testingSlack || !settings.slack_webhook_url}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border-subtle bg-surface-card hover:bg-surface-elevated text-xs font-sans font-semibold text-text-primary shrink-0 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      {testingSlack ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Testing...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5 text-accent-sapphire" />
                          <span>Test Slack</span>
                        </>
                      )}
                    </button>
                  </div>

                  {slackTestResult && (
                    <div
                      className={`flex items-center gap-2 text-xs font-mono px-3 py-2 rounded-xl border ${
                        slackTestResult.success
                          ? 'border-status-merged/40 bg-status-merged/10 text-status-merged'
                          : 'border-status-action-needed/40 bg-status-action-needed/10 text-status-action-needed'
                      }`}
                    >
                      {slackTestResult.success ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 shrink-0" />
                      )}
                      <span>
                        {slackTestResult.success
                          ? `Slack delivery verified (${slackTestResult.latencyMs}ms)`
                          : (slackTestResult.error || 'Slack dispatch failed')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Inset Group: Discord */}
              <div className="chrome-card border border-border-subtle rounded-2xl overflow-hidden bg-surface shadow-card">
                <div className="px-4 py-3 border-b border-border-subtle/60 bg-surface-card flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="h-4 w-4 text-indigo-400" />
                    <span className="text-xs font-mono font-bold uppercase text-text-primary">
                      Discord Channel Webhook
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-indigo-400 px-2 py-0.5 rounded border border-indigo-400/30 bg-indigo-400/10">
                    Rich Embeds
                  </span>
                </div>

                <div className="p-4 space-y-3">
                  <p className="text-xs font-sans text-text-muted">
                    Formats alerts into status-colored Discord embeds (Amber for replies, Green for merges).
                  </p>

                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={settings.discord_webhook_url}
                      onChange={(e) =>
                        setSettings(prev => ({ ...prev, discord_webhook_url: e.target.value }))
                      }
                      placeholder="https://discord.com/api/webhooks/..."
                      className="w-full bg-surface-elevated border border-border-subtle rounded-xl px-3 py-2 text-xs font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-sapphire"
                    />
                    <button
                      type="button"
                      onClick={handleTestDiscord}
                      disabled={testingDiscord || !settings.discord_webhook_url}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border-subtle bg-surface-card hover:bg-surface-elevated text-xs font-sans font-semibold text-text-primary shrink-0 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      {testingDiscord ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Testing...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5 text-indigo-400" />
                          <span>Test Discord</span>
                        </>
                      )}
                    </button>
                  </div>

                  {discordTestResult && (
                    <div
                      className={`flex items-center gap-2 text-xs font-mono px-3 py-2 rounded-xl border ${
                        discordTestResult.success
                          ? 'border-status-merged/40 bg-status-merged/10 text-status-merged'
                          : 'border-status-action-needed/40 bg-status-action-needed/10 text-status-action-needed'
                      }`}
                    >
                      {discordTestResult.success ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 shrink-0" />
                      )}
                      <span>
                        {discordTestResult.success
                          ? `Discord delivery verified (${discordTestResult.latencyMs}ms)`
                          : (discordTestResult.error || 'Discord dispatch failed')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Section 5: WEBHOOKS & AUTOMATION */}
          {(isSearchActive
            ? 'webhook inbound github gitlab n8n automation hmac pipeline custom'.includes(normalizedQuery)
            : activeCategory === 'webhooks') && (
            <div className="space-y-4">
              <div className="border-b border-border-subtle/80 pb-2">
                <h2 className="text-base font-bold font-sans text-text-primary">
                  Webhooks & Automated Pipelines
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Connect inbound repository triggers, n8n AI workflows, and signed custom endpoints.
                </p>
              </div>

              {/* Inbound Repository Webhooks */}
              <div className="chrome-card border border-border-subtle rounded-2xl overflow-hidden bg-surface shadow-card">
                <div className="px-4 py-3 border-b border-border-subtle/60 bg-surface-card flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="h-4 w-4 text-accent-sapphire animate-pulse" />
                    <span className="text-xs font-mono font-bold uppercase text-text-primary">
                      Inbound Repository Endpoints
                    </span>
                  </div>
                  <span className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded border border-status-merged/40 bg-status-merged/10 text-status-merged">
                    <span className="h-1.5 w-1.5 rounded-full bg-status-merged animate-ping" />
                    <span>Real-time SSE Active</span>
                  </span>
                </div>

                <div className="p-4 space-y-4">
                  <p className="text-xs font-sans text-text-muted">
                    Connect repository webhooks to receive instantaneous updates whenever reviews are posted or PRs are merged. Bypasses polling delays with zero latency.
                  </p>

                  {/* GitHub Endpoint */}
                  <div className="p-3.5 rounded-xl bg-surface-elevated border border-border-subtle space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-sans font-semibold text-xs text-text-primary">
                        GitHub Webhook URL
                      </span>
                      <span className="text-[10px] font-mono text-accent-sapphire">
                        HMAC-SHA256 Verified
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={
                          user
                            ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/github/${user.id}`
                            : `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/github`
                        }
                        className="w-full bg-base border border-border-subtle rounded-lg px-2.5 py-1.5 text-xs font-mono text-text-whisper select-all focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyUrl(
                            'github',
                            user
                              ? `${window.location.origin}/api/webhooks/github/${user.id}`
                              : `${window.location.origin}/api/webhooks/github`
                          )
                        }
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border-subtle bg-surface-card hover:bg-surface-elevated text-xs font-sans font-semibold text-text-primary shrink-0 transition-colors cursor-pointer"
                      >
                        {copiedType === 'github' ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-status-merged" />
                            <span className="text-status-merged">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 text-text-muted" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[10px] font-mono text-text-muted">
                      Events: Pull requests, Issue comments, Reviews. Content type: application/json.
                    </p>
                  </div>

                  {/* GitLab Endpoint */}
                  <div className="p-3.5 rounded-xl bg-surface-elevated border border-border-subtle space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-sans font-semibold text-xs text-text-primary">
                        GitLab Webhook URL
                      </span>
                      <span className="text-[10px] font-mono text-accent-sapphire">
                        Token Verified
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={
                          user
                            ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/gitlab/${user.id}`
                            : `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/gitlab`
                        }
                        className="w-full bg-base border border-border-subtle rounded-lg px-2.5 py-1.5 text-xs font-mono text-text-whisper select-all focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyUrl(
                            'gitlab',
                            user
                              ? `${window.location.origin}/api/webhooks/gitlab/${user.id}`
                              : `${window.location.origin}/api/webhooks/gitlab`
                          )
                        }
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border-subtle bg-surface-card hover:bg-surface-elevated text-xs font-sans font-semibold text-text-primary shrink-0 transition-colors cursor-pointer"
                      >
                        {copiedType === 'gitlab' ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-status-merged" />
                            <span className="text-status-merged">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 text-text-muted" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[10px] font-mono text-text-muted">
                      Trigger: Merge requests, Comments. Secret token: your configured secret.
                    </p>
                  </div>
                </div>
              </div>

              {/* n8n Automation Pipeline */}
              <div className="chrome-card border border-border-subtle rounded-2xl overflow-hidden bg-surface shadow-card">
                <div className="px-4 py-3 border-b border-border-subtle/60 bg-surface-card flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Workflow className="h-4 w-4 text-purple-400" />
                    <span className="text-xs font-mono font-bold uppercase text-text-primary">
                      n8n Automation Pipeline
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-purple-400 px-2 py-0.5 rounded border border-purple-400/30 bg-purple-400/10">
                    Event-Driven AI
                  </span>
                </div>

                <div className="p-4 space-y-3.5">
                  <p className="text-xs font-sans text-text-muted">
                    Emits cryptographically signed JSON events to n8n workflow triggers with delivery UUIDs and automated intent classification.
                  </p>

                  <div className="space-y-1.5">
                    <label className="font-sans font-semibold text-xs text-text-primary">
                      n8n Webhook Target URL
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={settings.n8n_webhook_url}
                        onChange={(e) =>
                          setSettings(prev => ({ ...prev, n8n_webhook_url: e.target.value }))
                        }
                        placeholder="https://n8n.yourdomain.com/webhook/oss-events"
                        className="w-full bg-surface-elevated border border-border-subtle rounded-xl px-3 py-2 text-xs font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-sapphire"
                      />
                      <button
                        type="button"
                        onClick={handleTestN8n}
                        disabled={testingN8n || !settings.n8n_webhook_url}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border-subtle bg-surface-card hover:bg-surface-elevated text-xs font-sans font-semibold text-text-primary shrink-0 transition-colors cursor-pointer disabled:opacity-40"
                      >
                        {testingN8n ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Testing...</span>
                          </>
                        ) : (
                          <>
                            <Send className="h-3.5 w-3.5 text-purple-400" />
                            <span>Test n8n</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-sans font-semibold text-xs text-text-primary">
                        n8n HMAC Secret (Optional)
                      </label>
                      {settings.n8n_webhook_secret_set && (
                        <span className="text-[10px] font-mono text-status-merged">Secret Configured</span>
                      )}
                    </div>
                    <input
                      type="password"
                      value={settings.n8n_webhook_secret}
                      onChange={(e) =>
                        setSettings(prev => ({ ...prev, n8n_webhook_secret: e.target.value }))
                      }
                      placeholder={
                        settings.n8n_webhook_secret_set
                          ? '•••••••••••••••• (Leave blank to keep existing)'
                          : 'Dedicated secret for X-OSS-Signature verification'
                      }
                      className="w-full bg-surface-elevated border border-border-subtle rounded-xl px-3 py-2 text-xs font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-sapphire"
                    />
                  </div>

                  {n8nTestResult && (
                    <div
                      className={`flex items-center gap-2 text-xs font-mono px-3 py-2 rounded-xl border ${
                        n8nTestResult.success
                          ? 'border-status-merged/40 bg-status-merged/10 text-status-merged'
                          : 'border-status-action-needed/40 bg-status-action-needed/10 text-status-action-needed'
                      }`}
                    >
                      {n8nTestResult.success ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 shrink-0" />
                      )}
                      <span>
                        {n8nTestResult.success
                          ? `n8n verified (${n8nTestResult.latencyMs}ms): ${n8nTestResult.message || '200 OK'}`
                          : (n8nTestResult.error || 'n8n dispatch failed')}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-border-subtle/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <span className="text-[10px] font-mono text-text-muted">
                      Headers: X-OSS-Signature, X-OSS-Delivery, X-OSS-Event
                    </span>
                    <a
                      href="/api/settings/n8n-template"
                      download="oss-command-center-n8n-workflow.json"
                      className="flex items-center gap-1.5 text-xs font-sans font-semibold text-accent-sapphire hover:underline cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download n8n Template (.json)</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Custom Outbound Webhook */}
              <div className="chrome-card border border-border-subtle rounded-2xl overflow-hidden bg-surface shadow-card">
                <div className="px-4 py-3 border-b border-border-subtle/60 bg-surface-card flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Webhook className="h-4 w-4 text-accent-sapphire" />
                    <span className="text-xs font-mono font-bold uppercase text-text-primary">
                      Custom Outbound Webhook
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-text-muted">Generic JSON</span>
                </div>

                <div className="p-4 space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="font-sans font-semibold text-xs text-text-primary">
                      Custom Endpoint URL
                    </label>
                    <input
                      type="url"
                      value={settings.webhook_url}
                      onChange={(e) =>
                        setSettings(prev => ({ ...prev, webhook_url: e.target.value }))
                      }
                      placeholder="https://example.com/api/webhook-listener"
                      className="w-full bg-surface-elevated border border-border-subtle rounded-xl px-3 py-2 text-xs font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-sapphire"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-sans font-semibold text-xs text-text-primary">
                        HMAC Signing Secret
                      </label>
                      {settings.webhook_secret_set && (
                        <span className="text-[10px] font-mono text-status-merged">Secret Configured</span>
                      )}
                    </div>
                    <input
                      type="password"
                      value={settings.webhook_secret}
                      onChange={(e) =>
                        setSettings(prev => ({ ...prev, webhook_secret: e.target.value }))
                      }
                      placeholder={
                        settings.webhook_secret_set
                          ? 'Enter new secret to rotate...'
                          : 'Optional secret for X-OSS-Signature verification'
                      }
                      className="w-full bg-surface-elevated border border-border-subtle rounded-xl px-3 py-2 text-xs font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-sapphire"
                    />
                  </div>

                  {/* Event Subscriptions */}
                  <div className="space-y-1.5">
                    <label className="font-sans font-semibold text-xs text-text-primary">
                      Forwarded Event Types
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
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
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                              active
                                ? 'border-accent-sapphire bg-accent-sapphire/15 text-text-primary'
                                : 'border-border-subtle bg-surface-elevated/40 text-text-muted hover:text-text-primary'
                            }`}
                          >
                            <span className="font-sans text-[11px] font-semibold">{evt.label}</span>
                            <span
                              className={`text-[10px] font-mono font-bold mt-1 ${
                                active ? 'text-status-merged' : 'text-text-muted/60'
                              }`}
                            >
                              {active ? 'Active' : 'Off'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <button
                      type="button"
                      onClick={handleTestWebhook}
                      disabled={testingWebhook || !settings.webhook_url}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-border-subtle bg-surface hover:bg-surface-elevated text-xs font-sans font-semibold text-text-primary transition-all cursor-pointer disabled:opacity-40"
                    >
                      {testingWebhook ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Dispatching...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5 text-accent-sapphire" />
                          <span>Test Webhook Ping</span>
                        </>
                      )}
                    </button>

                    {testResult && (
                      <div
                        className={`flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-xl border ${
                          testResult.success
                            ? 'border-status-merged/40 bg-status-merged/10 text-status-merged'
                            : 'border-status-action-needed/40 bg-status-action-needed/10 text-status-action-needed'
                        }`}
                      >
                        {testResult.success ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        )}
                        <span>
                          {testResult.success
                            ? `Verified (${testResult.latencyMs}ms)`
                            : (testResult.error || 'Failed')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 6: DATA & PRIVACY */}
          {(isSearchActive
            ? 'data privacy export json backup cache reset clear cookie'.includes(normalizedQuery)
            : activeCategory === 'data') && (
            <div className="space-y-4">
              <div className="border-b border-border-subtle/80 pb-2">
                <h2 className="text-base font-bold font-sans text-text-primary">
                  Data Management & Privacy
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Export complete snapshots of your records or manage local application storage.
                </p>
              </div>

              {/* Inset Group: Export & Cache */}
              <div className="chrome-card border border-border-subtle rounded-2xl overflow-hidden bg-surface shadow-card">
                <div className="px-4 py-3 border-b border-border-subtle/60 bg-surface-card flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-text-muted">
                    Snapshots & Local Cache
                  </span>
                  <span className="text-[10px] font-mono text-text-muted">Storage Controls</span>
                </div>

                <div className="divide-y divide-border-subtle/40">
                  {/* Export Telemetry */}
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="font-sans font-semibold text-xs sm:text-sm text-text-primary">
                        Export Complete JSON Backup
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">
                        Download an uncompressed JSON archive containing all tracked contributions and events.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportData}
                      disabled={exporting}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border-subtle bg-surface hover:bg-surface-elevated text-xs font-sans font-semibold text-text-primary transition-all cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {exporting ? (
                        <Loader2 className="h-4 w-4 animate-spin text-accent-sapphire" />
                      ) : (
                        <Download className="h-4 w-4 text-accent-sapphire" />
                      )}
                      <span>Export JSON</span>
                    </button>
                  </div>

                  {/* Reset Local Preferences */}
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="font-sans font-semibold text-xs sm:text-sm text-text-primary">
                        Reset Local Client Preferences
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">
                        Purge locally stored display options, saved filters, and custom view modes.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearCache}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border-subtle bg-surface hover:bg-surface-elevated text-xs font-sans font-semibold text-text-primary transition-all cursor-pointer shrink-0"
                    >
                      {cacheCleared ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-status-merged" />
                          <span className="text-status-merged">Cache Purged</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 text-text-muted" />
                          <span>Reset Preferences</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Cookie & Privacy Preferences */}
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-surface-elevated/20">
                    <div>
                      <div className="font-sans font-semibold text-xs sm:text-sm text-text-primary">
                        Cookie & Privacy Policy
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">
                        Inspect privacy guarantees and manage consent preferences.
                      </p>
                    </div>
                    {onOpenCookiePreferences && (
                      <button
                        type="button"
                        onClick={onOpenCookiePreferences}
                        className="px-4 py-2 rounded-xl border border-border-subtle bg-surface hover:bg-surface-elevated text-xs font-sans font-semibold text-text-primary transition-all cursor-pointer shrink-0"
                      >
                        Cookie Preferences
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer
        variant="dashboard"
        onNavigateView={onNavigateView}
        onOpenCookiePreferences={onOpenCookiePreferences}
      />

      {/* Email Digest Preview Modal */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-base border border-border-subtle rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-subtle bg-surface-card shrink-0">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-accent-sapphire" />
                <h3 className="text-sm font-bold font-sans text-text-primary">
                  Email Digest Live Preview
                </h3>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface border border-border-subtle text-text-muted">
                  {settings.email_digest_cadence}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center border border-border-subtle rounded-xl overflow-hidden bg-surface text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setPreviewTab('html')}
                    className={`px-3 py-1 font-semibold transition-colors cursor-pointer ${
                      previewTab === 'html'
                        ? 'bg-accent-sapphire text-white'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    HTML
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab('text')}
                    className={`px-3 py-1 font-semibold transition-colors cursor-pointer ${
                      previewTab === 'text'
                        ? 'bg-accent-sapphire text-white'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    Plain Text
                  </button>
                </div>

                <a
                  href={`/api/digest/preview?cadence=${settings.email_digest_cadence}&format=html`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] font-sans font-semibold text-accent-sapphire hover:underline"
                >
                  <span>Open in Tab</span>
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
                  <h4 className="text-sm font-bold font-sans text-text-primary mb-1.5">
                    Authentication Required
                  </h4>
                  <p className="text-xs font-sans text-text-muted mb-4 leading-relaxed">
                    Sign in to compile a personalized contribution briefing from your connected GitHub and GitLab accounts.
                  </p>
                </div>
              ) : previewLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-text-muted font-mono text-xs">
                  <Loader2 className="h-6 w-6 animate-spin text-accent-sapphire" />
                  <span>Compiling contribution digest...</span>
                </div>
              ) : previewTab === 'html' ? (
                <div className="rounded-xl overflow-hidden border border-border-subtle shadow-inner bg-[#0a0d14]">
                  <iframe
                    title="Digest HTML Preview"
                    srcDoc={
                      previewData?.html ||
                      '<p style="padding:20px;color:#999;font-family:sans-serif;">No preview generated.</p>'
                    }
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
              <span className="text-[11px] font-sans text-text-muted">
                Obsidian and sapphire responsive template designed for modern email clients.
              </span>
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="px-4 py-1.5 rounded-xl border border-border-subtle bg-surface hover:bg-surface-elevated text-xs font-sans font-semibold text-text-primary transition-colors cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
