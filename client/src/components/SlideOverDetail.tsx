import React, { useState, useEffect } from 'react';
import { Contribution, ActivityEvent } from '../types';
import { X, ExternalLink, MessageSquare, Check, AlertTriangle, CheckCircle2, Clock, Bot, User, Sparkles } from 'lucide-react';
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
  const [saveSuccess, setSaveSuccess] = useState(false);

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
    setSaveSuccess(false);
    try {
      await axios.patch(`/api/contributions/${encodeURIComponent(itemId)}/notes`, {
        notes,
        action_needed: actionNeeded,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      onItemUpdated();
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setSavingNotes(false);
    }
  };

  if (!itemId) return null;

  const getActionGuidance = (item: Contribution) => {
    const status = (item.status === 'opened' ? 'open' : item.status).toLowerCase();

    if (item.action_needed === 'push-changes') {
      return {
        variant: 'urgent',
        badge: 'ACTION NEEDED: CODE CHANGES',
        heading: 'Maintainer Requested Updates',
        body: 'The project maintainer reviewed your contribution and requested adjustments. Read their feedback in the activity stream below, apply the edits in your local branch, push your commits, and post a reply.',
        icon: <AlertTriangle className="h-5 w-5 text-status-action-needed shrink-0 mt-0.5" />,
      };
    }

    if (item.action_needed === 'reply') {
      return {
        variant: 'urgent',
        badge: 'ACTION NEEDED: REPLY OWED',
        heading: 'Maintainer Left a Message or Question',
        body: 'A maintainer responded to your contribution. Click "Open on GitHub/GitLab" to read their full comment and post your response in the conversation.',
        icon: <MessageSquare className="h-5 w-5 text-status-action-needed shrink-0 mt-0.5" />,
      };
    }

    if (status === 'merged') {
      return {
        variant: 'success',
        badge: 'STATUS: MERGED & LIVE',
        heading: 'Contribution Accepted Upstream! 🎉',
        body: 'Congratulations! Your code has been merged into the main project. You can safely clean up your local branch and move on to your next contribution.',
        icon: <CheckCircle2 className="h-5 w-5 text-status-merged shrink-0 mt-0.5" />,
      };
    }

    if (status === 'closed') {
      return {
        variant: 'neutral',
        badge: 'STATUS: CLOSED',
        heading: 'Item Closed',
        body: 'This pull request or issue was closed by the repository maintainer. Check the notes below for any rationale or duplicate references.',
        icon: <X className="h-5 w-5 text-text-muted shrink-0 mt-0.5" />,
      };
    }

    // Default: Waiting on maintainer
    return {
      variant: 'info',
      badge: 'STATUS: WAITING ON MAINTAINER REVIEW',
      heading: 'Everything is Up to Date',
      body: 'Your changes have been submitted cleanly and you spoke last. You are in line in the maintainer review queue. No immediate action is required on your part.',
      icon: <Clock className="h-5 w-5 text-status-awaiting-reply shrink-0 mt-0.5" />,
    };
  };

  const isBot = (name: string) => {
    const l = name.toLowerCase();
    return l.includes('bot') || l.includes('greptile') || l.includes('soffi') || l.includes('copilot');
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col border-l border-border-bold bg-surface shadow-2xl transition-transform animate-in slide-in-from-right duration-200">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-border-subtle bg-base px-6 py-3.5">
        <div className="flex items-center gap-2 font-telemetry text-xs">
          <span className="text-text-muted uppercase text-[11px]">Contribution Details:</span>
          <span className="font-bold text-text-primary">{itemId}</span>
        </div>
        <div className="flex items-center gap-2">
          {data?.item?.url && (
            <a
              href={data.item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 border border-status-awaiting-reply/60 bg-status-awaiting-reply/15 px-3 py-1 font-telemetry text-xs font-bold text-status-awaiting-reply hover:bg-status-awaiting-reply/25 transition-colors"
            >
              <span>Open on {data.item.platform === 'github' ? 'GitHub' : 'GitLab'}</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center border border-border-bold text-text-muted hover:border-border-active hover:text-white transition-colors"
            title="Close Drawer (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center font-telemetry text-xs text-text-muted">
          <Clock className="h-4 w-4 animate-spin mr-2" />
          <span>Loading activity history...</span>
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
                Repo: {data.item.repo}
              </span>
              <span className="border border-border-bold bg-surface-elevated px-2 py-0.5 text-text-secondary">
                Author: @{data.item.author}
              </span>
              <span className="border border-border-bold bg-surface-elevated px-2 py-0.5 text-status-awaiting-reply font-bold">
                Platform: {data.item.platform === 'github' ? 'GitHub' : 'GitLab'}
              </span>
              {data.item.bounty_amount && (
                <span className="border border-status-bounty/60 bg-status-bounty/10 px-2 py-0.5 text-status-bounty font-bold">
                  Bounty: {data.item.bounty_amount}
                </span>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* "WHAT DO I DO NEXT?" GUIDANCE CARD (Radical Clarity for Beginners)         */}
          {/* ========================================================================= */}
          {(() => {
            const guidance = getActionGuidance(data.item);
            return (
              <div
                className={`border p-4 space-y-2 ${
                  guidance.variant === 'urgent'
                    ? 'border-status-action-needed/50 bg-status-action-needed/10'
                    : guidance.variant === 'success'
                    ? 'border-status-merged/50 bg-status-merged/10'
                    : 'border-border-bold bg-base'
                }`}
              >
                <div className="flex items-start gap-3">
                  {guidance.icon}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-telemetry text-[10px] font-bold tracking-wider uppercase text-text-muted">
                        {guidance.badge}
                      </span>
                    </div>
                    <h3 className="font-display text-sm font-bold text-text-primary mt-0.5">
                      {guidance.heading}
                    </h3>
                    <p className="text-xs text-text-secondary mt-1 font-body leading-relaxed">
                      {guidance.body}
                    </p>
                  </div>
                </div>

                {/* Direct Action Link */}
                <div className="pt-2 flex justify-end">
                  <a
                    href={data.item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-telemetry text-xs font-bold text-text-primary hover:text-white underline underline-offset-4 decoration-border-bold hover:decoration-white"
                  >
                    <span>Jump directly to comment thread</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            );
          })()}

          {/* Private Notes & Manual Status Override */}
          <div className="border border-border-bold bg-base p-4 space-y-3 font-telemetry text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="font-bold text-text-secondary uppercase">
                Action Flag Override:
              </span>
              <div className="flex items-center gap-1.5">
                {(['none', 'reply', 'push-changes'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setActionNeeded(mode)}
                    className={`border px-2 py-0.5 uppercase transition-colors ${
                      actionNeeded === mode
                        ? 'border-status-action-needed bg-status-action-needed/20 text-status-action-needed font-bold'
                        : 'border-border-subtle text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    {mode === 'none' ? 'None (Waiting)' : mode === 'reply' ? 'Needs Reply' : 'Changes Req'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-text-muted mb-1 uppercase text-[11px]">
                Your Private Notes & Working Context:
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Log next steps, maintainer requirements, branch names or review findings..."
                className="w-full border border-border-bold bg-surface-elevated p-2 text-xs text-text-primary placeholder:text-text-muted focus:border-border-active focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-text-muted font-body">
                {saveSuccess ? (
                  <span className="text-status-merged flex items-center gap-1">
                    <Check className="h-3 w-3" /> Notes saved
                  </span>
                ) : (
                  'Private notes are saved locally in your database.'
                )}
              </span>
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="border border-border-bold bg-surface-elevated px-3 py-1 text-xs font-bold text-text-primary hover:border-border-active hover:bg-surface-active disabled:opacity-50 transition-colors"
              >
                {savingNotes ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          </div>

          {/* Activity Stream */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-telemetry text-xs font-bold text-text-secondary uppercase">
                Conversation History ({data.events.length} {data.events.length === 1 ? 'Event' : 'Events'})
              </span>
            </div>

            <div className="space-y-3">
              {data.events.length === 0 ? (
                <div className="border border-border-subtle bg-base p-5 text-center font-telemetry text-xs text-text-muted">
                  No subsequent conversation events recorded yet.
                </div>
              ) : (
                data.events.map((ev) => {
                  const bot = isBot(ev.actor);
                  return (
                    <div key={ev.id} className="border border-border-subtle bg-base p-4 space-y-2 shadow-sm">
                      <div className="flex items-center justify-between font-telemetry text-xs">
                        <div className="flex items-center gap-2">
                          {bot ? (
                            <Bot className="h-3.5 w-3.5 text-text-muted" />
                          ) : (
                            <User className="h-3.5 w-3.5 text-status-awaiting-reply" />
                          )}
                          <span className="font-bold text-text-primary">@{ev.actor}</span>
                          {bot && (
                            <span className="border border-border-subtle bg-surface-elevated px-1 py-0.2 text-[9px] text-text-muted">
                              BOT
                            </span>
                          )}
                          {ev.review_state && (
                            <span
                              className={`border px-1.5 py-0.2 text-[10px] font-bold ${
                                ev.review_state === 'APPROVED'
                                  ? 'border-status-merged text-status-merged bg-status-merged/10'
                                  : 'border-status-action-needed text-status-action-needed bg-status-action-needed/10'
                              }`}
                            >
                              {ev.review_state === 'APPROVED' ? 'APPROVED' : 'CHANGES REQUESTED'}
                            </span>
                          )}
                        </div>
                        <span className="text-text-muted text-[11px]">
                          {new Date(ev.created_at).toLocaleString()}
                        </span>
                      </div>

                      <div className="font-body text-xs text-text-secondary leading-relaxed whitespace-pre-wrap bg-surface-elevated p-3 border border-border-subtle font-mono text-[11px]">
                        {ev.body_excerpt}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
