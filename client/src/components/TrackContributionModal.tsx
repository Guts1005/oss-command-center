import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { X, PlusCircle, AlertCircle, Loader2 } from 'lucide-react';
import { GitHubLogo, GitLabLogo } from './BrandLogos';

interface TrackContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (id: string) => void;
}

export const TrackContributionModal: React.FC<TrackContributionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Please provide a GitHub or GitLab URL');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await axios.post('/api/track-url', { url: url.trim() });
      if (res.data?.success && res.data?.item) {
        setUrl('');
        onSuccess(res.data.item.id);
        onClose();
      } else {
        setError('Failed to ingest contribution. Please verify upstream URL.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Error tracking contribution';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (exampleUrl: string) => {
    setUrl(exampleUrl);
    setError(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
          {/* Backdrop with smooth fade */}
          <motion.div
            key="track-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal / Bottom Sheet Container with Spring Physics */}
          <motion.div
            key="track-modal-card"
            initial={{ opacity: 0, scale: 0.96, y: 32 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 24 }}
            transition={{ type: 'spring', damping: 28, stiffness: 380, mass: 0.8 }}
            className="relative w-full max-w-xl border-t sm:border border-border-subtle bg-surface p-5 sm:p-7 rounded-t-2xl sm:rounded-xl shadow-[inset_0_1px_0_rgba(207,231,248,0.04),0_25px_50px_-12px_rgba(0,0,0,0.8)] z-10 max-h-[88dvh] overflow-y-auto pb-safe"
          >
            {/* Mobile Tactile Grab Handle */}
            <div className="sm:hidden w-12 h-1.5 bg-border-bold/80 rounded-full mx-auto mb-3 cursor-grab shrink-0" />

            {/* Dismiss Button */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              onClick={onClose}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 flex h-8 w-8 items-center justify-center rounded-md border border-border-subtle text-text-muted hover:border-accent-sapphire hover:text-white transition-colors cursor-pointer"
              title="Dismiss (Esc)"
            >
              <X className="h-4 w-4" />
            </motion.button>

            {/* Modal Header */}
            <div className="flex items-center gap-3.5 mb-6 border-b border-border-subtle/80 pb-4 pr-9">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border-bold bg-base text-accent-sapphire">
                <PlusCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base md:text-lg font-bold text-white tracking-wide font-sans leading-snug">
                    Track Upstream Contribution
                  </h2>
                  <span className="hidden sm:inline-block border border-border-bold bg-base px-2 py-0.5 rounded text-xs font-mono font-bold text-text-whisper">
                    [TRACK URL]
                  </span>
                </div>
                <p className="text-xs md:text-sm text-text-muted font-sans mt-0.5">
                  Track any public or private pull request, merge request, or issue.
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-muted mb-2">
                  CONTRIBUTION UPSTREAM URL
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-accent-sapphire text-base font-mono font-bold">
                    &gt;
                  </span>
                  <input
                    type="url"
                    required
                    autoFocus
                    placeholder="https://github.com/owner/repo/pull/123"
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      if (error) setError(null);
                    }}
                    className="w-full border border-border-subtle bg-base py-3 pl-9 pr-4 rounded-md text-base text-white placeholder:text-text-muted focus:border-accent-sapphire focus:ring-1 focus:ring-accent-sapphire focus:outline-none transition-all font-medium"
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2.5 border border-status-action-needed/80 bg-status-action-needed/15 p-3.5 rounded-lg text-sm text-status-action-needed"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}

              {/* Quick Examples */}
              <div className="border-t border-border-subtle/80 pt-4">
                <span className="text-xs text-text-muted block mb-2.5 font-sans font-semibold">
                  Quick Examples:
                </span>
                <div className="flex flex-wrap gap-2.5">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.03, borderColor: 'rgba(116,157,208,0.7)', color: '#ffffff' }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                    onClick={() => handleExampleClick('https://github.com/astral-sh/ruff/pull/28429')}
                    className="flex items-center gap-1.5 border border-border-subtle bg-surface-card px-3 py-1.5 rounded-md text-xs font-mono font-medium text-text-whisper hover:border-accent-sapphire hover:text-white transition-colors cursor-pointer shadow-sm"
                  >
                    <GitHubLogo className="h-3 w-3 text-white shrink-0" />
                    <span>astral-sh/ruff#28429</span>
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.03, borderColor: 'rgba(116,157,208,0.7)', color: '#ffffff' }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                    onClick={() => handleExampleClick('https://gitlab.rtems.org/rtems/rtos/rtems/-/merge_requests/1479')}
                    className="flex items-center gap-1.5 border border-border-subtle bg-surface-card px-3 py-1.5 rounded-md text-xs font-mono font-medium text-text-whisper hover:border-accent-sapphire hover:text-white transition-colors cursor-pointer shadow-sm"
                  >
                    <GitLabLogo className="h-3 w-3 shrink-0" />
                    <span>rtems/rtos/rtems!1479</span>
                  </motion.button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-subtle/80">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  onClick={onClose}
                  disabled={isLoading}
                  className="border border-border-subtle bg-base px-4 py-2.5 rounded-md text-xs md:text-sm font-sans font-medium text-text-muted hover:border-border-bold hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </motion.button>
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02, boxShadow: '0 0 16px rgba(116,157,208,0.35)' }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  disabled={isLoading}
                  className="flex items-center gap-2 border border-accent-sapphire bg-accent-sapphire hover:bg-accent-sapphire/90 px-5 py-2.5 rounded-md text-xs md:text-sm font-sans font-semibold text-white disabled:opacity-50 transition-colors cursor-pointer shadow-sm"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      <span>Tracking...</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="h-4 w-4 text-white" />
                      <span>Track Contribution</span>
                    </>
                  )}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
