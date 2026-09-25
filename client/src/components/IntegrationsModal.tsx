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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm font-telemetry select-none">
      {/* Modal Container */}
      <div className="relative w-full max-w-2xl border border-border-bold bg-surface p-5 shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-bold pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center border border-border-bold bg-base text-status-in-review">
              <Key className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                [LINK_UPSTREAM_ACCOUNTS] // GITHUB & GITLAB
              </h2>
              <p className="text-[10px] text-text-muted">
                AUTOMATED TELEMETRY HARVESTING // ENCRYPTED TOKEN VAULT
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center border border-border-bold text-text-muted hover:border-border-active hover:text-white transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Unauthenticated Warning */}
        {!user && (
          <div className="mb-4 border border-status-action-needed/60 bg-status-action-needed/10 p-2.5 text-xs text-status-action-needed">
            <div className="flex items-center gap-1.5 font-bold mb-0.5">
              <AlertCircle className="h-4 w-4" />
              <span>[AUTHENTICATION_REQUIRED]</span>
            </div>
            <p className="text-[10px] text-text-muted leading-relaxed font-body">
              Session is unauthenticated or expired. Sign in to your tenant account to manage upstream credentials.
            </p>
          </div>
        )}

        {/* Security Disclosure */}
        <div className="mb-4 border border-border-bold bg-base p-2.5 text-[10px] text-text-muted">
          <div className="flex items-center gap-1.5 font-bold text-status-merged mb-0.5">
            <ShieldCheck className="h-3 w-3" />
            <span>[SECURITY SPEC: ZERO-LEAKAGE AES-256-GCM]</span>
          </div>
          <p>
            Personal Access Tokens are encrypted with authenticated AES-256-GCM using unique 96-bit IVs and 128-bit authentication tags prior to SQLite persistence. Decrypted solely in memory for API calls.
          </p>
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div
            className={`mb-3 flex items-start gap-2 border p-2 text-xs ${
              statusMessage.type === 'success'
                ? 'border-status-merged/60 bg-status-merged/10 text-status-merged'
                : 'border-status-action-needed/60 bg-status-action-needed/10 text-status-action-needed'
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
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
              CONNECTED PLATFORMS ({accountList.length})
            </h3>
            {accountList.length > 0 && (
              <button
                onClick={handleManualSync}
                disabled={isSyncingNow || !user}
                className="flex items-center gap-1 text-[10px] border border-border-bold bg-surface-elevated px-2 py-0.5 text-text-secondary hover:text-white transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-2.5 w-2.5 ${isSyncingNow ? 'animate-spin text-status-in-review' : ''}`} />
                <span>{isSyncingNow ? '[SYNCING...]' : '[SYNC_ALL]'}</span>
              </button>
            )}
          </div>

          {accountList.length === 0 ? (
            <div className="border border-border-subtle bg-base p-3 text-center text-xs text-text-muted">
              [ZERO_LINKED_ACCOUNTS] Link your GitHub or GitLab profile below.
            </div>
          ) : (
            <div className="space-y-1.5">
              {accountList.map((acc) => (
                <div
                  key={acc.id}
                  className="border border-border-bold bg-base p-2.5 transition-all text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-6 w-6 items-center justify-center border border-border-bold bg-surface text-text-primary">
                        {acc.platform === 'github' ? (
                          <Github className="h-3.5 w-3.5" />
                        ) : (
                          <Gitlab className="h-3.5 w-3.5 text-orange-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-text-primary">{acc.username}</span>
                          <span className="border border-border-bold bg-surface-elevated px-1 text-[9px] uppercase text-text-muted">
                            [{acc.platform}]
                          </span>
                          {acc.has_token && (
                            <span className="border border-status-merged/40 bg-status-merged/10 px-1 text-[9px] text-status-merged font-bold">
                              [AES_ENCRYPTED]
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-text-muted flex items-center gap-2 mt-0.5">
                          {acc.host && <span>HOST: {acc.host}</span>}
                          <span>STATUS: <span className="text-text-secondary font-semibold uppercase">{acc.sync_status}</span></span>
                          {acc.last_synced_at && (
                            <span>LAST_SYNC: {new Date(acc.last_synced_at).toLocaleTimeString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setConfirmingDeleteId(confirmingDeleteId === acc.id ? null : acc.id)}
                      className={`p-1 transition-colors border ${
                        confirmingDeleteId === acc.id
                          ? 'text-status-action-needed bg-status-action-needed/10 border-status-action-needed/40'
                          : 'border-border-bold text-text-muted hover:text-status-action-needed hover:border-status-action-needed'
                      }`}
                      title="Disconnect Account"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {confirmingDeleteId === acc.id && (
                    <div className="mt-2.5 border border-status-action-needed/50 bg-status-action-needed/10 p-2.5 text-xs">
                      <div className="flex items-center gap-1 font-bold text-status-action-needed mb-1 text-[11px]">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span>DISCONNECT {acc.platform.toUpperCase()} ({acc.username})?</span>
                      </div>
                      <p className="text-[10px] text-text-secondary mb-2 font-body">
                        Disconnecting will purge all associated {acc.platform} telemetry and tracked contributions for this account.
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleConfirmDelete(acc.id, `${acc.platform} (${acc.username})`)}
                          disabled={isDeletingNow}
                          className="border border-status-action-needed bg-status-action-needed/30 px-2.5 py-1 text-[10px] font-bold uppercase text-status-action-needed hover:bg-status-action-needed/40 disabled:opacity-50 transition-colors"
                        >
                          {isDeletingNow ? '[PURGING...]' : '[CONFIRM_PURGE]'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingDeleteId(null)}
                          disabled={isDeletingNow}
                          className="border border-border-bold bg-surface px-2.5 py-1 text-[10px] font-bold uppercase text-text-secondary hover:text-white transition-colors"
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
        <div className="border-t border-border-bold pt-3">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-primary mb-2.5">
            [ADD_NEW_INTEGRATION]
          </h3>

          <form onSubmit={handleConnect} className="space-y-3">
            {/* Platform Selector */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPlatform('github')}
                className={`flex items-center justify-center gap-1.5 border py-1.5 text-xs font-bold transition-colors ${
                  platform === 'github'
                    ? 'border-status-in-review bg-status-in-review/15 text-status-in-review'
                    : 'border-border-bold bg-base text-text-muted hover:text-white'
                }`}
              >
                <Github className="h-3.5 w-3.5" />
                <span>[GITHUB]</span>
              </button>
              <button
                type="button"
                onClick={() => setPlatform('gitlab')}
                className={`flex items-center justify-center gap-1.5 border py-1.5 text-xs font-bold transition-colors ${
                  platform === 'gitlab'
                    ? 'border-orange-500 bg-orange-500/15 text-orange-400'
                    : 'border-border-bold bg-base text-text-muted hover:text-white'
                }`}
              >
                <Gitlab className="h-3.5 w-3.5" />
                <span>[GITLAB]</span>
              </button>
            </div>

            {/* Username Input */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
                {platform === 'github' ? 'GITHUB USERNAME' : 'GITLAB USERNAME'}
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={platform === 'github' ? 'e.g. torvalds' : 'e.g. gitlab-user'}
                className="w-full border border-border-bold bg-base px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-status-in-review focus:outline-none"
              />
            </div>

            {/* GitLab Host */}
            {platform === 'gitlab' && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
                  GITLAB INSTANCE HOST
                </label>
                <input
                  type="text"
                  value={gitlabHost}
                  onChange={(e) => setGitlabHost(e.target.value)}
                  placeholder="https://gitlab.com or https://gitlab.rtems.org"
                  className="w-full border border-border-bold bg-base px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-status-in-review focus:outline-none"
                />
              </div>
            )}

            {/* Personal Access Token */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
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
                  className="flex items-center gap-1 text-[9px] text-status-in-review hover:underline"
                >
                  <span>[GENERATE_TOKEN]</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={platform === 'github' ? 'ghp_...' : 'glpat-...'}
                className="w-full border border-border-bold bg-base px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-status-in-review focus:outline-none"
              />
              <p className="text-[9px] text-text-muted mt-0.5">
                Tokens unlock 5,000 req/hr rate limits and private repository tracking.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full border border-status-in-review bg-status-in-review/20 py-2 font-bold uppercase tracking-wider text-status-in-review hover:bg-status-in-review/30 disabled:opacity-50 transition-colors text-xs"
            >
              {isSubmitting ? '[ENCRYPTING_&_LINKING...]' : `[LINK_${platform.toUpperCase()}_ACCOUNT]`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
