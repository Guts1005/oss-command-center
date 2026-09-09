import React, { useState, useEffect } from 'react';
import { Contribution, ActivityEvent } from '../types';
import { X, ExternalLink, MessageSquare, Check, ShieldAlert, GitCommit, GitPullRequest } from 'lucide-react';
import axios from 'axios';

interface SlideOverDetailProps {
  itemId: string | null;
  onClose: () => void;
  onItemUpdated: () => void;
}

export const SlideOverDetail: React.FC<SlideOverDetailProps> = ({ itemId, onClose, onItemUpdated }) => {
  const [data, setData] = useState<{ item: Contribution; events: ActivityEvent[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [actionNeeded, setActionNeeded] = useState<'reply' | 'push-changes' | 'none'>('none');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    if (!itemId) {
      setData(null);
      return;
    }

    setLoading(true);
    axios
      .get(`/api/contributions/${encodeURIComponent(itemId)}`)
      .then((res) => {
        setData(res.data);
        setNotes(res.data.item.notes || '');
        setActionNeeded(res.data.item.action_needed || 'none');
        onItemUpdated(); // update unread count on parent
      })
      .catch((err) => console.error('Failed to load detail:', err))
      .finally(() => setLoading(false));
  }, [itemId]);

  const handleSaveNotes = async () => {
    if (!itemId) return;
    setSavingNotes(true);
    try {
      await axios.patch(`/api/contributions/${encodeURIComponent(itemId)}/notes`, {
        notes,
        action_needed: actionNeeded,
      });
      onItemUpdated();
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setSavingNotes(false);
    }
  };

  if (!itemId) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col border-l border-border-bold bg-surface shadow-2xl transition-transform animate-in slide-in-from-right duration-200">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-border-subtle bg-base px-6 py-4">
        <div className="flex items-center gap-2 font-telemetry text-xs">
          <span className="text-text-muted">ITEM LOG:</span>
          <span className="font-bold text-text-primary">{itemId}</span>
        </div>
        <div className="flex items-center gap-2">
          {data?.item?.url && (
            <a
              href={data.item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 border border-border-bold bg-surface-elevated px-2.5 py-1 font-telemetry text-xs text-text-secondary hover:border-border-active hover:text-white"
            >
              <span>OPEN UPSTREAM</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center border border-border-bold text-text-muted hover:border-border-active hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center font-telemetry text-xs text-text-muted">
          FETCHING TELEMETRY STREAM...
        </div>
      ) : data ? (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title & Metadata Strip */}
          <div>
            <h2 className="font-display text-lg font-bold text-text-primary leading-snug">
              {data.item.title}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-2 font-telemetry text-xs">
              <span className="border border-border-bold bg-surface-elevated px-2 py-0.5 text-text-secondary">
                REPO: {data.item.repo}
              </span>
              <span className="border border-border-bold bg-surface-elevated px-2 py-0.5 text-text-secondary">
                AUTHOR: {data.item.author}
              </span>
              <span className="border border-border-bold bg-surface-elevated px-2 py-0.5 text-status-awaiting-reply font-bold">
                STATUS: {(data.item.status === 'opened' ? 'OPEN' : data.item.status).toUpperCase()}
              </span>
              {data.item.bounty_amount && (
                <span className="border border-status-bounty/60 bg-status-bounty/10 px-2 py-0.5 text-status-bounty font-bold">
                  BOUNTY: {data.item.bounty_amount}
                </span>
              )}
              {Math.floor((Date.now() - new Date(data.item.last_activity_at).getTime()) / (1000 * 60 * 60 * 24)) >= 30 && (
                <span className="border border-amber-500/60 bg-amber-500/10 px-2 py-0.5 text-amber-500 font-bold">
                  INACTIVE FOR {Math.floor((Date.now() - new Date(data.item.last_activity_at).getTime()) / (1000 * 60 * 60 * 24))}d
                </span>
              )}
            </div>
          </div>

          <hr className="border-border-subtle" />

          {/* Triage & Operational Controls */}
          <div className="border border-border-bold bg-base p-4 space-y-3 font-telemetry text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="font-bold text-text-secondary uppercase">Operational Action State:</span>
              <div className="flex items-center gap-1.5">
                {(['none', 'reply', 'push-changes'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setActionNeeded(mode)}
                    className={`border px-2 py-0.5 uppercase ${
                      actionNeeded === mode
                        ? 'border-status-action-needed bg-status-action-needed/20 text-status-action-needed font-bold'
                        : 'border-border-subtle text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    {mode === 'none' ? 'None' : mode === 'reply' ? 'Owe Reply' : 'Push Changes'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-text-muted mb-1 uppercase text-[11px]">
                Triage Notes & Working Context:
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Log next steps, maintainer requirements, branch names or review findings..."
                className="w-full border border-border-bold bg-surface-elevated p-2 text-xs text-text-primary placeholder:text-text-muted focus:border-border-active focus:outline-none"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="border border-border-bold bg-surface-elevated px-3 py-1 text-xs font-bold text-text-primary hover:border-border-active hover:bg-surface-active disabled:opacity-50"
              >
                {savingNotes ? 'SAVING...' : 'UPDATE TRIAGE STATE'}
              </button>
            </div>
          </div>

          {/* Chronological Activity Timeline */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="font-telemetry text-xs font-bold text-text-secondary uppercase">
                Activity Stream ({data.events.length} {data.events.length === 1 ? 'EVENT' : 'EVENTS'})
              </span>
            </div>

            <div className="space-y-3">
              {data.events.length === 0 ? (
                <div className="border border-border-subtle bg-base p-4 text-center font-telemetry text-xs text-text-muted">
                  No subsequent timeline events recorded yet.
                </div>
              ) : (
                data.events.map((ev) => (
                  <div key={ev.id} className="border border-border-subtle bg-base p-4 space-y-2">
                    <div className="flex items-center justify-between font-telemetry text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-text-primary">{ev.actor}</span>
                        {ev.review_state && (
                          <span
                            className={`border px-1.5 py-0.2 text-[10px] font-bold ${
                              ev.review_state === 'APPROVED'
                                ? 'border-status-open text-status-open'
                                : 'border-status-action-needed text-status-action-needed'
                            }`}
                          >
                            {ev.review_state}
                          </span>
                        )}
                      </div>
                      <span className="text-text-muted text-[11px]">
                        {new Date(ev.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="font-body text-xs text-text-secondary leading-relaxed whitespace-pre-wrap bg-surface-elevated p-3 border border-border-subtle font-mono">
                      {ev.body_excerpt}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
