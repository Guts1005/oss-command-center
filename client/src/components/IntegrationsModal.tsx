import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Github, Gitlab, Key, CheckCircle, RefreshCw, Trash2, ExternalLink, X, ShieldCheck, AlertCircle } from 'lucide-react';
import { GitHubLogo, GitLabLogo } from './BrandLogos';

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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
          {/* Backdrop with smooth fade */}
          <motion.div
            key="integrations-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal / Bottom Sheet Container with Spring Physics */}
          <motion.div
            key="integrations-modal-card"
            initial={{ opacity: 0, scale: 0.96, y: 32 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 24 }}
            transition={{ type: 'spring', damping: 28, stiffness: 380, mass: 0.85 }}
            className="relative w-full max-w-3xl border-t sm:border border-border-subtle bg-surface p-4 sm:p-7 rounded-t-2xl sm:rounded-xl shadow-[inset_0_1px_0_rgba(207,231,248,0.04),0_25px_50px_-12px_rgba(0,0,0,0.8)] z-10 max-h-[88dvh] overflow-y-auto pb-safe"
          >
            {/* Mobile Tactile Grab Handle */}
            <div className="sm:hidden w-12 h-1.5 bg-border-bold/80 rounded-full mx-auto mb-3 cursor-grab shrink-0" />
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border-subtle/80 pb-4 mb-5 gap-2">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border-bold bg-base text-accent-sapphire">
                  <Key className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base md:text-lg font-bold text-white font-sans tracking-wide leading-snug">
                    Linked Accounts
                  </h2>
                  <p className="text-xs md:text-sm text-text-muted font-sans mt-0.5">
                    Connect your GitHub and GitLab accounts to import contributions.
                  </p>
                </div>
              </div>
              <motion.button
                type="button"
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border-subtle text-text-muted hover:border-accent-sapphire hover:text-white transition-colors cursor-pointer"
                title="Dismiss (Esc)"
              >
                <X className="h-4 w-4" />
              </motion.button>
            </div>

          {/* Unauthenticated Warning */}
          {!user && (
            <div className="mb-5 border border-status-action-needed/80 bg-status-action-needed/15 p-3.5 rounded-lg text-sm text-status-action-needed">
              <div className="flex items-center gap-2 font-bold mb-1 font-sans">
                <AlertCircle className="h-4 w-4" />
                <span>Authentication Required</span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed font-sans">
                Session is unauthenticated or expired. Sign in to your account to manage credentials.
              </p>
            </div>
          )}

          {/* Subtle Encryption Indicator */}
          <div className="mb-4 flex items-center gap-1.5 text-xs text-text-muted font-mono">
            <ShieldCheck className="h-3.5 w-3.5 text-status-merged shrink-0" />
            <span>Encrypted</span>
          </div>

            {/* Status Notification */}
            {statusMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
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
              </motion.div>
            )}

            {/* Connected Accounts List */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-text-whisper">
                  CONNECTED PLATFORMS ({accountList.length})
                </h3>
                {accountList.length > 0 && (
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                    onClick={handleManualSync}
                    disabled={isSyncingNow || !user}
                    className="flex items-center gap-1.5 text-xs font-mono font-bold border border-border-subtle bg-surface-elevated px-3 py-1 rounded text-text-whisper hover:border-accent-sapphire hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`h-3 w-3 ${isSyncingNow ? 'animate-spin text-accent-sapphire' : ''}`} />
                    <span>{isSyncingNow ? 'Syncing...' : 'Sync All'}</span>
                  </motion.button>
                )}
              </div>

              {accountList.length === 0 ? (
                <div className="border border-border-subtle bg-base p-4 rounded-lg text-center text-xs md:text-sm font-sans text-text-muted">
                  No linked accounts. Connect your GitHub or GitLab profile below.
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {accountList.map((acc) => (
                      <motion.div
                        key={acc.id}
                        layout
                        initial={{ opacity: 0, y: 12, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.15 } }}
                        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                        className="border border-border-subtle bg-surface-card p-4 rounded-lg transition-all text-xs md:text-sm shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border-bold bg-base text-text-primary">
                              {acc.platform === 'github' ? (
                                <GitHubLogo className="h-5 w-5 text-white" />
                              ) : (
                                <GitLabLogo className="h-5 w-5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
                                <span className="font-mono text-sm sm:text-base font-bold text-white truncate">{acc.username}</span>
                                <span className="border border-border-subtle bg-base px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-mono uppercase font-bold text-text-muted">
                                  {acc.platform}
                                </span>
                                {acc.has_token && (
                                  <span className="border border-status-merged/60 bg-status-merged/15 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-mono text-status-merged font-bold">
                                    Encrypted
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-text-whisper flex flex-wrap items-center gap-3.5 mt-1.5 font-mono">
                                {acc.host && <span>HOST: <span className="text-text-muted">{acc.host}</span></span>}
                                <span>STATUS: <span className="text-status-merged font-bold uppercase">{acc.sync_status}</span></span>
                                {acc.last_synced_at && (
                                  <span>LAST SYNC: <span className="text-text-muted">{new Date(acc.last_synced_at).toLocaleTimeString()}</span></span>
                                )}
                              </div>
                            </div>
                          </div>
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.92 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                            onClick={() => setConfirmingDeleteId(confirmingDeleteId === acc.id ? null : acc.id)}
                            className={`p-1.5 rounded transition-all border cursor-pointer ${
                              confirmingDeleteId === acc.id
                                ? 'text-status-action-needed bg-status-action-needed/20 border-status-action-needed/60'
                                : 'border-border-subtle text-text-muted hover:text-status-action-needed hover:border-status-action-needed'
                            }`}
                            title="Disconnect Account"
                          >
                            <Trash2 className="h-4 w-4" />
                          </motion.button>
                        </div>

                        <AnimatePresence>
                          {confirmingDeleteId === acc.id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.18 }}
                              className="mt-3 border border-status-action-needed/60 bg-status-action-needed/15 p-3 rounded-lg text-xs overflow-hidden"
                            >
                              <div className="flex items-center gap-1.5 font-bold text-status-action-needed mb-1.5 font-mono">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                <span>DISCONNECT {acc.platform.toUpperCase()} ({acc.username})?</span>
                              </div>
                              <p className="text-xs text-text-whisper mb-2.5 font-sans">
                                Disconnecting will purge all associated {acc.platform} telemetry and tracked contributions for this account.
                              </p>
                              <div className="flex items-center gap-2 font-mono">
                                <motion.button
                                  type="button"
                                  whileHover={{ scale: 1.03 }}
                                  whileTap={{ scale: 0.95 }}
                                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                                  onClick={() => handleConfirmDelete(acc.id, `${acc.platform} (${acc.username})`)}
                                  disabled={isDeletingNow}
                                  className="border border-status-action-needed bg-status-action-needed/30 px-3 py-1.5 rounded text-xs font-bold uppercase text-status-action-needed hover:bg-status-action-needed/50 disabled:opacity-50 transition-colors cursor-pointer"
                                >
                                  {isDeletingNow ? '[PURGING...]' : '[CONFIRM DISCONNECT]'}
                                </motion.button>
                                <motion.button
                                  type="button"
                                  whileHover={{ scale: 1.03 }}
                                  whileTap={{ scale: 0.95 }}
                                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                                  onClick={() => setConfirmingDeleteId(null)}
                                  disabled={isDeletingNow}
                                  className="border border-border-subtle bg-base px-3 py-1.5 rounded text-xs font-bold uppercase text-text-whisper hover:text-white transition-colors cursor-pointer"
                                >
                                  [CANCEL]
                                </motion.button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Add Connection Form */}
            <div className="border-t border-border-subtle/80 pt-4">
              <h3 className="text-sm font-bold text-white mb-3 font-sans">
                Connect Account
              </h3>

              <form onSubmit={handleConnect} className="space-y-4">
                {/* Platform Selector */}
                <div className="grid grid-cols-2 gap-2.5 font-sans">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                    onClick={() => setPlatform('github')}
                    className={`flex items-center justify-center gap-2 border py-2.5 rounded-md text-xs md:text-sm font-semibold transition-all cursor-pointer ${
                      platform === 'github'
                        ? 'border-accent-sapphire bg-accent-sapphire/20 text-white shadow-sm'
                        : 'border-border-subtle bg-base text-text-muted hover:text-white'
                    }`}
                  >
                    <GitHubLogo className="h-4 w-4 text-white" />
                    <span>GitHub</span>
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                    onClick={() => setPlatform('gitlab')}
                    className={`flex items-center justify-center gap-2 border py-2.5 rounded-md text-xs md:text-sm font-semibold transition-all cursor-pointer ${
                      platform === 'gitlab'
                        ? 'border-[#fc6d26] bg-[#fc6d26]/20 text-[#fc6d26] shadow-sm'
                        : 'border-border-subtle bg-base text-text-muted hover:text-white'
                    }`}
                  >
                    <GitLabLogo className="h-4 w-4" />
                    <span>GitLab</span>
                  </motion.button>
                </div>

                {/* Username Input */}
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-muted mb-2">
                    {platform === 'github' ? 'GitHub Username' : 'GitLab Username'}
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
                      GitLab Instance Host
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
                      Personal Access Token (Optional)
                    </label>
                    <a
                      href={
                        platform === 'github'
                          ? 'https://github.com/settings/tokens/new?scopes=repo,read:user'
                          : 'https://gitlab.com/-/profile/personal_access_tokens?scopes=read_api'
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-sans text-accent-sapphire hover:underline font-semibold"
                    >
                      <span>Generate Token</span>
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

                <div className="pt-1">
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.015, boxShadow: '0 0 16px rgba(116,157,208,0.35)' }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    disabled={isSubmitting}
                    className="w-full border border-accent-sapphire bg-accent-sapphire hover:bg-accent-sapphire/90 py-3.5 rounded-md font-sans font-semibold text-white disabled:opacity-50 transition-colors text-sm md:text-base cursor-pointer shadow-sm"
                  >
                    {isSubmitting ? 'Connecting...' : `Connect ${platform === 'github' ? 'GitHub' : 'GitLab'} Account`}
                  </motion.button>
                  <div className="flex items-center justify-center gap-1.5 text-xs text-text-muted mt-3 font-mono">
                    <ShieldCheck className="h-3.5 w-3.5 text-status-merged shrink-0" />
                    <span>Encrypted</span>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
