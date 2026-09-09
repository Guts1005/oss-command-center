import React, { useState } from 'react';
import axios from 'axios';
import { X, PlusCircle, Link2, AlertCircle, CheckCircle2, Loader2, Github } from 'lucide-react';

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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Please paste a GitHub or GitLab URL');
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
        setError('Failed to track contribution. Please check the URL.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg border border-border-bold bg-surface p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center border border-border-subtle text-text-muted hover:border-border-bold hover:text-white transition-colors"
          title="Close (Esc)"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center border border-border-bold bg-surface-elevated text-status-awaiting-reply">
            <PlusCircle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-text-primary tracking-tight">
              Track a New Contribution
            </h2>
            <p className="text-xs text-text-muted font-body">
              Paste a link to any pull request, merge request, or issue.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block font-telemetry text-xs text-text-secondary uppercase mb-1.5 font-semibold">
              GitHub or GitLab URL:
            </label>
            <div className="relative flex items-center">
              <Link2 className="absolute left-3 h-4 w-4 text-text-muted" />
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
                className="w-full border border-border-bold bg-base py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-border-active focus:outline-none"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 border border-status-action-needed/40 bg-status-action-needed/10 p-3 text-xs text-status-action-needed font-body">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Examples for Beginners */}
          <div className="border-t border-border-subtle pt-3">
            <span className="font-telemetry text-[11px] text-text-muted block mb-1.5 uppercase">
              Quick Test Examples (Click to try):
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleExampleClick('https://github.com/astral-sh/ruff/pull/28429')}
                className="border border-border-subtle bg-base px-2 py-1 font-telemetry text-[11px] text-text-muted hover:border-border-bold hover:text-text-secondary transition-colors"
              >
                astral-sh/ruff#28429
              </button>
              <button
                type="button"
                onClick={() => handleExampleClick('https://gitlab.rtems.org/rtems/rtos/rtems/-/merge_requests/1479')}
                className="border border-border-subtle bg-base px-2 py-1 font-telemetry text-[11px] text-text-muted hover:border-border-bold hover:text-text-secondary transition-colors"
              >
                rtems/rtos/rtems!1479
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="border border-border-subtle bg-base px-4 py-1.5 font-telemetry text-xs text-text-muted hover:border-border-bold hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 border border-border-bold bg-surface-elevated px-4 py-1.5 font-telemetry text-xs font-bold text-text-primary hover:border-border-active hover:bg-surface-active disabled:opacity-50 transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Fetching Details...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="h-3.5 w-3.5 text-status-awaiting-reply" />
                  <span>Track Contribution</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
