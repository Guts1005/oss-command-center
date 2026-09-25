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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-lg border border-border-subtle bg-surface p-6 rounded-xl shadow-2xl">
        {/* Dismiss Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 flex h-7 w-7 items-center justify-center rounded-md border border-border-subtle text-text-muted hover:border-accent-sapphire hover:text-white transition-all cursor-pointer"
          title="Dismiss (Esc)"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5 border-b border-border-subtle/80 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-bold bg-base text-accent-sapphire">
            <PlusCircle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm md:text-base font-bold uppercase tracking-wider text-white font-mono">
              [INGEST_NEW_CONTRIBUTION]
            </h2>
            <p className="text-xs text-text-muted font-sans mt-0.5">
              Track any public or private pull request, merge request, or issue.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-muted mb-1.5">
              CONTRIBUTION UPSTREAM URL
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-accent-sapphire text-sm font-mono font-bold">
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
                className="w-full border border-border-subtle bg-base py-2.5 pl-8 pr-3 rounded-md text-sm text-white placeholder:text-text-muted focus:border-accent-sapphire focus:ring-1 focus:ring-accent-sapphire focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2.5 border border-status-action-needed/80 bg-status-action-needed/15 p-3 rounded-lg text-xs md:text-sm text-status-action-needed">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Examples */}
          <div className="border-t border-border-subtle/80 pt-3">
            <span className="text-xs text-text-muted block mb-2 uppercase font-mono font-bold">
              [TELEMETRY_FIXTURES] QUICK TEST EXAMPLES:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleExampleClick('https://github.com/astral-sh/ruff/pull/28429')}
                className="border border-border-subtle bg-surface-card px-2.5 py-1 rounded text-xs font-mono text-text-whisper hover:border-accent-sapphire hover:text-white transition-all cursor-pointer"
              >
                [astral-sh/ruff#28429]
              </button>
              <button
                type="button"
                onClick={() => handleExampleClick('https://gitlab.rtems.org/rtems/rtos/rtems/-/merge_requests/1479')}
                className="border border-border-subtle bg-surface-card px-2.5 py-1 rounded text-xs font-mono text-text-whisper hover:border-accent-sapphire hover:text-white transition-all cursor-pointer"
              >
                [rtems/rtos/rtems!1479]
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle/80">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="border border-border-subtle bg-base px-4 py-2 rounded-md text-xs md:text-sm font-mono font-bold text-text-muted hover:border-border-bold hover:text-white transition-all cursor-pointer"
            >
              [CANCEL]
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 border border-accent-sapphire bg-accent-sapphire/20 px-4 py-2 rounded-md text-xs md:text-sm font-mono font-bold text-text-whisper hover:bg-accent-sapphire/30 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
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
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
