import React, { useState } from 'react';
import axios from 'axios';
import { X, PlusCircle, Link2, AlertCircle, Loader2 } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none font-telemetry">
      <div className="relative w-full max-w-lg border border-border-bold bg-surface p-5 shadow-2xl">
        {/* Dismiss Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex h-6 w-6 items-center justify-center border border-border-bold text-text-muted hover:border-border-active hover:text-white transition-colors"
          title="Dismiss (Esc)"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5 mb-3 border-b border-border-bold pb-3">
          <div className="flex h-7 w-7 items-center justify-center border border-border-bold bg-base text-status-in-review">
            <PlusCircle className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary">
              [INGEST_NEW_CONTRIBUTION]
            </h2>
            <p className="text-[10px] text-text-muted font-body">
              Track any public or private pull request, merge request, or issue.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 mt-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
              CONTRIBUTION UPSTREAM URL
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-2.5 text-text-muted text-[11px] font-bold">
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
                className="w-full border border-border-bold bg-base py-1.5 pl-7 pr-3 text-xs text-text-primary placeholder:text-text-muted focus:border-status-in-review focus:outline-none"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 border border-status-action-needed/60 bg-status-action-needed/10 p-2.5 text-xs text-status-action-needed">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Examples */}
          <div className="border-t border-border-bold pt-2.5">
            <span className="text-[10px] text-text-muted block mb-1 uppercase font-bold">
              [TELEMETRY_FIXTURES] QUICK TEST EXAMPLES:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleExampleClick('https://github.com/astral-sh/ruff/pull/28429')}
                className="border border-border-bold bg-base px-2 py-0.5 text-[10px] text-text-muted hover:border-border-active hover:text-text-primary transition-colors"
              >
                [astral-sh/ruff#28429]
              </button>
              <button
                type="button"
                onClick={() => handleExampleClick('https://gitlab.rtems.org/rtems/rtos/rtems/-/merge_requests/1479')}
                className="border border-border-bold bg-base px-2 py-0.5 text-[10px] text-text-muted hover:border-border-active hover:text-text-primary transition-colors"
              >
                [rtems/rtos/rtems!1479]
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-bold">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="border border-border-bold bg-base px-3 py-1 text-xs font-bold text-text-muted hover:border-border-active hover:text-text-primary transition-colors"
            >
              [CANCEL]
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-1.5 border border-status-in-review bg-status-in-review/20 px-3 py-1 text-xs font-bold text-status-in-review hover:bg-status-in-review/30 disabled:opacity-50 transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>[FETCHING...]</span>
                </>
              ) : (
                <>
                  <PlusCircle className="h-3 w-3" />
                  <span>[INGEST_CONTRIBUTION]</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
