import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Github, Gitlab, Key, CheckCircle, RefreshCw, Trash2, ExternalLink, X, ShieldCheck, AlertCircle } from 'lucide-react';

interface IntegrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncTriggered?: () => void;
  onAccountsChanged?: () => void;
}

export const IntegrationsModal: React.FC<IntegrationsModalProps> = ({
  isOpen,
  onClose,
  onSyncTriggered,
  onAccountsChanged,
}) => {
  const { user, integrations, saveIntegration, deleteIntegration, triggerSync } = useAuth();

  const [platform, setPlatform] = useState<'github' | 'gitlab'>('github');
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [gitlabHost, setGitlabHost] = useState('https://gitlab.com');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [isDeletingNow, setIsDeletingNow] = useState(false);
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
      onAccountsChanged?.();
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
      setStatusMessage({ type: 'success', text: 'Synchronization triggered across all accounts.' });
      onSyncTriggered?.();
      onAccountsChanged?.();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.error || 'Sync request failed',
      });
    } finally {
      setIsSyncingNow(false);
    }
  };

  const handleConfirmDelete = async (id: string, name: string) => {
    setIsDeletingNow(true);
    setStatusMessage(null);
    try {
      const res = await deleteIntegration(id);
      setStatusMessage({
        type: 'success',
        text: res.message || `Disconnected ${name} successfully.`,
      });
      setConfirmingDeleteId(null);
      onAccountsChanged?.();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.error || err.message || 'Failed to disconnect integration',
      });
    } finally {
      setIsDeletingNow(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none">
      {/* Modal Container */}
      <div className="relative w-full max-w-3xl border border-border-subtle bg-surface p-7 rounded-xl shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle/80 pb-4 mb-5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-bold bg-base text-accent-sapphire">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base md:text-lg font-bold text-white font-sans tracking-wide">
                  Linked Upstream Accounts
                </h2>
                <span className="border border-border-bold bg-base px-2 py-0.5 rounded text-xs font-mono font-bold text-text-whisper">
                  [TELEMETRY_VAULT]
                </span>
              </div>
              <p className="text-xs md:text-sm text-text-muted font-sans mt-0.5">
                Automated multi-platform telemetry harvesting &amp; encrypted token store.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border-subtle text-text-muted hover:border-accent-sapphire hover:text-white transition-all cursor-pointer"
            title="Dismiss (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Unauthenticated Warning */}
        {!user && (
          <div className="mb-5 border border-status-action-needed/80 bg-status-action-needed/15 p-3.5 rounded-lg text-sm text-status-action-needed">
            <div className="flex items-center gap-2 font-bold mb-1 font-mono">
              <AlertCircle className="h-4 w-4" />
              <span>[AUTHENTICATION_REQUIRED]</span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed font-sans">
              Session is unauthenticated or expired. Sign in to your tenant account to manage upstream credentials.
            </p>
          </div>
        )}

        {/* Security Disclosure */}
        <div className="mb-5 border border-border-subtle bg-surface-card p-3.5 rounded-lg text-xs text-text-muted leading-relaxed">
          <div className="flex items-center gap-2 font-bold text-status-merged mb-1 font-mono">
            <ShieldCheck className="h-4 w-4" />
            <span>[SECURITY SPEC: ZERO-LEAKAGE AES-256-GCM]</span>
          </div>
          <p>
            Personal Access Tokens are encrypted with authenticated AES-256-GCM using unique 96-bit IVs and 128-bit authentication tags prior to SQLite persistence. Decrypted solely in memory for API calls.
          </p>
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div
            className={`mb-4 flex items-start gap-2.5 border p-3 rounded-lg text-xs md:text-sm ${
              statusMessage.type === 'success'
                ? 'border-status-merged/80 bg-status-merged/15 text-status-merged'
                : 'border-status-action-needed/80 bg-status-action-needed/15 text-status-action-needed'
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

        {/* Connected Accounts List */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-text-whisper">
              CONNECTED PLATFORMS ({accountList.length})
            </h3>
            {accountList.length > 0 && (
              <button
                onClick={handleManualSync}
                disabled={isSyncingNow || !user}
                className="flex items-center gap-1.5 text-xs font-mono font-bold border border-border-subtle bg-surface-elevated px-3 py-1 rounded text-text-whisper hover:border-accent-sapphire hover:text-white transition-all disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`h-3 w-3 ${isSyncingNow ? 'animate-spin text-accent-sapphire' : ''}`} />
                <span>{isSyncingNow ? '[SYNCING...]' : '[SYNC_ALL]'}</span>
              </button>
            )}
          </div>

          {accountList.length === 0 ? (
            <div className="border border-border-subtle bg-base p-4 rounded-lg text-center text-xs md:text-sm font-mono text-text-muted">
              [ZERO_LINKED_ACCOUNTS] Link your GitHub or GitLab profile below.
            </div>
          ) : (
            <div className="space-y-3">
              {accountList.map((acc) => (
                <div
                  key={acc.id}
                  className="border border-border-subtle bg-surface-card p-4 rounded-lg transition-all text-xs md:text-sm shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-bold bg-base text-text-primary">
                        {acc.platform === 'github' ? (
                          <Github className="h-5 w-5" />
                        ) : (
                          <Gitlab className="h-5 w-5 text-[#fc6d26]" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-base font-bold text-white">{acc.username}</span>
                          <span className="border border-border-subtle bg-base px-2 py-0.5 rounded text-xs font-mono uppercase font-bold text-text-muted">
                            [{acc.platform}]
                          </span>
                          {acc.has_token && (
                            <span className="border border-status-merged/60 bg-status-merged/15 px-2 py-0.5 rounded text-xs font-mono text-status-merged font-bold">
                              [AES_ENCRYPTED]
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-text-whisper flex flex-wrap items-center gap-3.5 mt-1.5 font-mono">
                          {acc.host && <span>HOST: <span className="text-text-muted">{acc.host}</span></span>}
                          <span>STATUS: <span className="text-status-merged font-bold uppercase">{acc.sync_status}</span></span>
                          {acc.last_synced_at && (
                            <span>LAST_SYNC: <span className="text-text-muted">{new Date(acc.last_synced_at).toLocaleTimeString()}</span></span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setConfirmingDeleteId(confirmingDeleteId === acc.id ? null : acc.id)}
                      className={`p-1.5 rounded transition-all border cursor-pointer ${
                        confirmingDeleteId === acc.id
                          ? 'text-status-action-needed bg-status-action-needed/20 border-status-action-needed/60'
                          : 'border-border-subtle text-text-muted hover:text-status-action-needed hover:border-status-action-needed'
                      }`}
                      title="Disconnect Account"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {confirmingDeleteId === acc.id && (
                    <div className="mt-3 border border-status-action-needed/60 bg-status-action-needed/15 p-3 rounded-lg text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-status-action-needed mb-1.5 font-mono">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>DISCONNECT {acc.platform.toUpperCase()} ({acc.username})?</span>
                      </div>
                      <p className="text-xs text-text-whisper mb-2.5 font-sans">
                        Disconnecting will purge all associated {acc.platform} telemetry and tracked contributions for this account.
                      </p>
                      <div className="flex items-center gap-2 font-mono">
                        <button
                          type="button"
                          onClick={() => handleConfirmDelete(acc.id, `${acc.platform} (${acc.username})`)}
                          disabled={isDeletingNow}
                          className="border border-status-action-needed bg-status-action-needed/30 px-3 py-1.5 rounded text-xs font-bold uppercase text-status-action-needed hover:bg-status-action-needed/50 disabled:opacity-50 transition-colors cursor-pointer"
                        >
                          {isDeletingNow ? '[PURGING...]' : '[CONFIRM_PURGE]'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingDeleteId(null)}
                          disabled={isDeletingNow}
                          className="border border-border-subtle bg-base px-3 py-1.5 rounded text-xs font-bold uppercase text-text-whisper hover:text-white transition-colors cursor-pointer"
                        >
                          [CANCEL]
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Connection Form */}
        <div className="border-t border-border-subtle/80 pt-4">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white mb-3">
            [ADD_NEW_INTEGRATION]
          </h3>

          <form onSubmit={handleConnect} className="space-y-4">
            {/* Platform Selector */}
            <div className="grid grid-cols-2 gap-2.5 font-mono">
              <button
                type="button"
                onClick={() => setPlatform('github')}
                className={`flex items-center justify-center gap-2 border py-2.5 rounded-md text-xs md:text-sm font-bold transition-all cursor-pointer ${
                  platform === 'github'
                    ? 'border-accent-sapphire bg-accent-sapphire/20 text-white shadow-sm'
                    : 'border-border-subtle bg-base text-text-muted hover:text-white'
                }`}
              >
                <Github className="h-4 w-4" />
                <span>[GITHUB]</span>
              </button>
              <button
                type="button"
                onClick={() => setPlatform('gitlab')}
                className={`flex items-center justify-center gap-2 border py-2.5 rounded-md text-xs md:text-sm font-bold transition-all cursor-pointer ${
                  platform === 'gitlab'
                    ? 'border-[#fc6d26] bg-[#fc6d26]/20 text-[#fc6d26] shadow-sm'
                    : 'border-border-subtle bg-base text-text-muted hover:text-white'
                }`}
              >
                <Gitlab className="h-4 w-4" />
                <span>[GITLAB]</span>
              </button>
            </div>

            {/* Username Input */}
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-muted mb-2">
                {platform === 'github' ? 'GITHUB USERNAME' : 'GITLAB USERNAME'}
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={platform === 'github' ? 'e.g. torvalds' : 'e.g. gitlab-user'}
                className="w-full border border-border-subtle bg-base px-4 py-3 rounded-md text-base text-white placeholder:text-text-muted focus:border-accent-sapphire focus:ring-1 focus:ring-accent-sapphire focus:outline-none transition-all font-medium"
              />
            </div>

            {/* GitLab Host */}
            {platform === 'gitlab' && (
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-muted mb-2">
                  GITLAB INSTANCE HOST
                </label>
                <input
                  type="text"
                  value={gitlabHost}
                  onChange={(e) => setGitlabHost(e.target.value)}
                  placeholder="https://gitlab.com or https://gitlab.rtems.org"
                  className="w-full border border-border-subtle bg-base px-4 py-3 rounded-md text-base text-white placeholder:text-text-muted focus:border-accent-sapphire focus:ring-1 focus:ring-accent-sapphire focus:outline-none transition-all font-medium"
                />
              </div>
            )}

            {/* Personal Access Token */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted">
                  PERSONAL ACCESS TOKEN (OPTIONAL / RECOMMENDED)
                </label>
                <a
                  href={
                    platform === 'github'
                      ? 'https://github.com/settings/tokens/new?scopes=repo,read:user'
                      : 'https://gitlab.com/-/profile/personal_access_tokens?scopes=read_api'
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-mono text-accent-sapphire hover:underline font-bold"
                >
                  <span>[GENERATE_TOKEN]</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={platform === 'github' ? 'ghp_...' : 'glpat-...'}
                className="w-full border border-border-subtle bg-base px-4 py-3 rounded-md text-base text-white placeholder:text-text-muted focus:border-accent-sapphire focus:ring-1 focus:ring-accent-sapphire focus:outline-none transition-all font-medium"
              />
              <p className="text-xs md:text-sm text-text-muted mt-1.5 font-sans">
                Tokens unlock 5,000 req/hr rate limits and private repository tracking.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full border border-accent-sapphire bg-accent-sapphire/25 py-3.5 rounded-md font-mono font-bold uppercase tracking-wider text-white hover:bg-accent-sapphire/35 disabled:opacity-50 transition-all text-sm md:text-base cursor-pointer shadow-sm"
            >
              {isSubmitting ? '[ENCRYPTING_&_LINKING...]' : `[LINK_${platform.toUpperCase()}_ACCOUNT]`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
