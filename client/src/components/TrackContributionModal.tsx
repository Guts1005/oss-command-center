import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { X, PlusCircle, AlertCircle, Loader2 } from 'lucide-react';

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
          {/* Backdrop with smooth fade */}
          <motion.div
            key="track-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-sm"
          />

          {/* Modal Container with Spring Physics */}
          <motion.div
            key="track-modal-card"
            initial={{ opacity: 0, scale: 0.93, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', damping: 26, stiffness: 380, mass: 0.8 }}
            className="relative w-full max-w-xl border border-border-subtle bg-surface p-7 rounded-xl shadow-2xl z-10"
          >
            {/* Dismiss Button */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              onClick={onClose}
              className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-md border border-border-subtle text-text-muted hover:border-accent-sapphire hover:text-white transition-colors cursor-pointer"
              title="Dismiss (Esc)"
            >
              <X className="h-4 w-4" />
            </motion.button>

            {/* Modal Header */}
            <div className="flex items-center gap-3.5 mb-6 border-b border-border-subtle/80 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-bold bg-base text-accent-sapphire">
                <PlusCircle className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base md:text-lg font-bold text-white tracking-wide font-sans">
                    Track Upstream Contribution
                  </h2>
                  <span className="border border-border-bold bg-base px-2 py-0.5 rounded text-xs font-mono font-bold text-text-whisper">
                    [INGEST_URL]
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
                <span className="text-xs text-text-muted block mb-2.5 uppercase font-mono font-bold">
                  [TELEMETRY_FIXTURES] QUICK TEST EXAMPLES:
                </span>
                <div className="flex flex-wrap gap-2.5">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.03, borderColor: 'rgba(116,157,208,0.7)', color: '#ffffff' }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                    onClick={() => handleExampleClick('https://github.com/astral-sh/ruff/pull/28429')}
                    className="border border-border-subtle bg-surface-card px-3 py-1.5 rounded-md text-xs font-mono font-semibold text-text-whisper hover:border-accent-sapphire hover:text-white transition-colors cursor-pointer shadow-sm"
                  >
                    [astral-sh/ruff#28429]
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.03, borderColor: 'rgba(116,157,208,0.7)', color: '#ffffff' }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                    onClick={() => handleExampleClick('https://gitlab.rtems.org/rtems/rtos/rtems/-/merge_requests/1479')}
                    className="border border-border-subtle bg-surface-card px-3 py-1.5 rounded-md text-xs font-mono font-semibold text-text-whisper hover:border-accent-sapphire hover:text-white transition-colors cursor-pointer shadow-sm"
                  >
                    [rtems/rtos/rtems!1479]
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
                  className="border border-border-subtle bg-base px-4 py-2.5 rounded-md text-xs md:text-sm font-mono font-bold text-text-muted hover:border-border-bold hover:text-white transition-colors cursor-pointer"
                >
                  [CANCEL]
                </motion.button>
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02, boxShadow: '0 0 16px rgba(116,157,208,0.35)' }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  disabled={isLoading}
                  className="flex items-center gap-2 border border-accent-sapphire bg-accent-sapphire/25 px-5 py-2.5 rounded-md text-xs md:text-sm font-mono font-bold text-text-whisper hover:bg-accent-sapphire/35 disabled:opacity-50 transition-colors cursor-pointer shadow-sm"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-accent-sapphire" />
                      <span>[FETCHING...]</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="h-4 w-4 text-accent-sapphire" />
                      <span>[INGEST_CONTRIBUTION]</span>
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
