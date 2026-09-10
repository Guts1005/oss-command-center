import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Github, Gitlab, Key, CheckCircle, RefreshCw, Trash2, ExternalLink, X, ShieldCheck, AlertCircle } from 'lucide-react';

interface IntegrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncTriggered?: () => void;
}

export const IntegrationsModal: React.FC<IntegrationsModalProps> = ({
  isOpen,
  onClose,
  onSyncTriggered,
}) => {
  const { integrations, saveIntegration, deleteIntegration, triggerSync, isIntegrationsLoading } = useAuth();

  const [platform, setPlatform] = useState<'github' | 'gitlab'>('github');
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [gitlabHost, setGitlabHost] = useState('https://gitlab.com');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const accountList = Array.isArray(integrations) ? integrations : [];

  if (!isOpen) return null;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setStatusMessage({ type: 'error', text: 'Username is required.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      await saveIntegration({
        platform,
        username: username.trim(),
        token: token.trim() || undefined,
        host: platform === 'gitlab' ? (gitlabHost.trim() || 'https://gitlab.com') : undefined,
      });

      setStatusMessage({
        type: 'success',
        text: `Connected ${platform.toUpperCase()} account for ${username.trim()} (Encrypted with AES-256-GCM)`,
      });
      setUsername('');
      setToken('');
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.error || err.message || 'Failed to save integration',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncingNow(true);
    setStatusMessage(null);
    try {
      await triggerSync();
      setStatusMessage({ type: 'success', text: 'Synchronization started across all accounts.' });
      onSyncTriggered?.();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.error || 'Sync request failed',
      });
    } finally {
      setIsSyncingNow(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to disconnect ${name}?`)) return;
    try {
      await deleteIntegration(id);
      setStatusMessage({ type: 'success', text: `Disconnected ${name}.` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Failed to disconnect integration' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl border border-border-bold bg-surface p-6 shadow-2xl z-10 font-mono max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center border border-status-awaiting-reply bg-status-awaiting-reply/10 text-status-awaiting-reply">
              <Key className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold uppercase tracking-wider text-text-primary">
                Link Open Source Accounts
              </h2>
              <p className="font-telemetry text-[11px] text-text-muted">
                Automated contribution harvesting via GitHub & GitLab APIs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-white transition-colors p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Security Disclosure */}
        <div className="mb-5 border border-status-merged/40 bg-status-merged/10 p-3 text-[11px] text-text-secondary">
          <div className="flex items-center gap-1.5 font-bold text-status-merged mb-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>ZERO-LEAKAGE ENCRYPTION AT REST</span>
          </div>
          <p>
            Your access tokens are encrypted with authenticated <strong>AES-256-GCM</strong> (using unique 96-bit IVs and 128-bit auth tags) before persisting to SQLite. Decryption occurs only in volatile RAM when synchronizing PRs and issues.
          </p>
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div
            className={`mb-4 flex items-start gap-2 border p-3 text-xs ${
              statusMessage.type === 'success'
                ? 'border-status-merged/50 bg-status-merged/10 text-status-merged'
                : 'border-status-action-needed/50 bg-status-action-needed/10 text-status-action-needed'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Active Accounts List */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Connected Platforms ({accountList.length})
            </h3>
            {accountList.length > 0 && (
              <button
                onClick={handleManualSync}
                disabled={isSyncingNow}
                className="flex items-center gap-1 text-[11px] border border-border-bold bg-surface-elevated px-2 py-1 text-text-secondary hover:text-white transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${isSyncingNow ? 'animate-spin text-status-awaiting-reply' : ''}`} />
                <span>{isSyncingNow ? 'Syncing...' : 'Sync All Accounts'}</span>
              </button>
            )}
          </div>

          {accountList.length === 0 ? (
            <div className="border border-border-subtle bg-base p-4 text-center text-xs text-text-muted">
              No accounts linked yet. Link your GitHub or GitLab profile below to enable automated tracking.
            </div>
          ) : (
            <div className="space-y-2">
              {accountList.map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between border border-border-bold bg-base px-3.5 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center border border-border-bold bg-surface-elevated text-text-primary">
                      {acc.platform === 'github' ? (
                        <Github className="h-4 w-4" />
                      ) : (
                        <Gitlab className="h-4 w-4 text-orange-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-text-primary">{acc.username}</span>
                        <span className="border border-border-bold bg-surface-elevated px-1.5 text-[9px] uppercase text-text-muted">
                          {acc.platform}
                        </span>
                        {acc.has_token && (
                          <span className="border border-status-merged/40 bg-status-merged/10 px-1.5 text-[9px] text-status-merged">
                            Token Encrypted
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-text-muted flex items-center gap-2 mt-0.5">
                        {acc.host && <span>Host: {acc.host}</span>}
                        <span>Status: <span className="text-text-secondary font-semibold">{acc.sync_status}</span></span>
                        {acc.last_synced_at && (
                          <span>Last Sync: {new Date(acc.last_synced_at).toLocaleTimeString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(acc.id, `${acc.platform} (${acc.username})`)}
                    className="p-1 text-text-muted hover:text-status-action-needed transition-colors"
                    title="Disconnect Account"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add New Integration Form */}
        <div className="border-t border-border-subtle pt-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary mb-3">
            Add New Connection
          </h3>

          <form onSubmit={handleConnect} className="space-y-3.5">
            {/* Platform Selection */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPlatform('github')}
                className={`flex items-center justify-center gap-2 border py-2 text-xs font-bold transition-colors ${
                  platform === 'github'
                    ? 'border-status-awaiting-reply bg-status-awaiting-reply/15 text-status-awaiting-reply'
                    : 'border-border-bold bg-base text-text-muted hover:text-white'
                }`}
              >
                <Github className="h-4 w-4" />
                <span>GitHub</span>
              </button>
              <button
                type="button"
                onClick={() => setPlatform('gitlab')}
                className={`flex items-center justify-center gap-2 border py-2 text-xs font-bold transition-colors ${
                  platform === 'gitlab'
                    ? 'border-orange-500 bg-orange-500/15 text-orange-400'
                    : 'border-border-bold bg-base text-text-muted hover:text-white'
                }`}
              >
                <Gitlab className="h-4 w-4" />
                <span>GitLab</span>
              </button>
            </div>

            {/* Username Input */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1">
                {platform === 'github' ? 'GitHub Username' : 'GitLab Username'}
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={platform === 'github' ? 'e.g. torvalds' : 'e.g. gitlab-user'}
                className="w-full border border-border-bold bg-base px-3 py-2 text-xs text-text-primary placeholder-text-muted focus:border-status-awaiting-reply focus:outline-none"
              />
            </div>

            {/* GitLab Host (if gitlab) */}
            {platform === 'gitlab' && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1">
                  GitLab Instance Host
                </label>
                <input
                  type="text"
                  value={gitlabHost}
                  onChange={(e) => setGitlabHost(e.target.value)}
                  placeholder="https://gitlab.com or https://gitlab.rtems.org"
                  className="w-full border border-border-bold bg-base px-3 py-2 text-xs text-text-primary placeholder-text-muted focus:border-status-awaiting-reply focus:outline-none"
                />
              </div>
            )}

            {/* Personal Access Token */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                  Personal Access Token (Recommended)
                </label>
                <a
                  href={
                    platform === 'github'
                      ? 'https://github.com/settings/tokens/new?scopes=repo,read:user'
                      : 'https://gitlab.com/-/profile/personal_access_tokens?scopes=read_api'
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] text-status-awaiting-reply hover:underline"
                >
                  <span>Generate Token</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={platform === 'github' ? 'ghp_...' : 'glpat-...'}
                className="w-full border border-border-bold bg-base px-3 py-2 text-xs text-text-primary placeholder-text-muted focus:border-status-awaiting-reply focus:outline-none"
              />
              <p className="text-[10px] text-text-muted mt-1">
                Providing a token elevates rate limits from 60 to 5,000 requests/hr and unlocks private repository activity.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full border border-status-awaiting-reply bg-status-awaiting-reply/20 py-2.5 font-bold uppercase tracking-wider text-status-awaiting-reply hover:bg-status-awaiting-reply/30 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'ENCRYPTING & LINKING...' : `LINK ${platform.toUpperCase()} ACCOUNT`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
