import React, { useState, useEffect } from 'react';
import { Contribution, ActivityEvent } from '../types';
import { X, ExternalLink, MessageSquare, Check, AlertTriangle, CheckCircle2, Clock, Bot, User } from 'lucide-react';
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
        badge: '[ACTION_REQUIRED: REQ_CHANGES]',
        heading: 'MAINTAINER REQUESTED CODE MODIFICATIONS',
        body: 'The upstream maintainer reviewed this PR and requested adjustments. Inspect feedback in the activity ledger below, apply commits in your local git branch, and push upstream.',
        icon: <AlertTriangle className="h-4 w-4 text-status-action-needed shrink-0 mt-0.5" />,
      };
    }

    if (item.action_needed === 'reply') {
      return {
        variant: 'urgent',
        badge: '[ACTION_REQUIRED: OWE_REPLY]',
        heading: 'MAINTAINER COMMENT REQ RESPONSE',
        body: 'A maintainer left a question or clarification request. Open the upstream discussion thread to post your technical response.',
        icon: <MessageSquare className="h-4 w-4 text-status-awaiting-reply shrink-0 mt-0.5" />,
      };
    }

    if (status === 'merged') {
      return {
        variant: 'success',
        badge: '[STATUS: ACCEPTED_&_MERGED]',
        heading: 'CONTRIBUTION MERGED UPSTREAM',
        body: 'Your changes have been accepted and committed into the main upstream repository branch. Local branch can safely be retired.',
        icon: <CheckCircle2 className="h-4 w-4 text-status-merged shrink-0 mt-0.5" />,
      };
    }

    if (status === 'closed') {
      return {
        variant: 'neutral',
        badge: '[STATUS: CLOSED]',
        heading: 'ITEM CLOSED UPSTREAM',
        body: 'This pull request or issue was closed by the repository maintainer. Check the activity ledger below for closure rationale.',
        icon: <X className="h-4 w-4 text-text-muted shrink-0 mt-0.5" />,
      };
    }

    return {
      variant: 'info',
      badge: '[STATUS: AWAITING_MAINTAINER_REVIEW]',
      heading: 'IN REVIEW QUEUE // NO ACTION REQUIRED',
      body: 'Your changes are cleanly submitted and awaiting maintainer triage. You spoke last in the thread.',
      icon: <Clock className="h-4 w-4 text-status-in-review shrink-0 mt-0.5" />,
    };
  };

  const isBot = (name: string) => {
    const l = name.toLowerCase();
    return l.includes('bot') || l.includes('greptile') || l.includes('soffi') || l.includes('copilot');
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col border-l border-border-bold bg-surface shadow-2xl transition-transform animate-in slide-in-from-right duration-150 font-telemetry select-none">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-border-bold bg-base px-5 py-2.5">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-text-muted text-[10px] font-bold uppercase">[INSPECTOR]:</span>
          <span className="font-bold text-text-primary">{itemId}</span>
        </div>
        <div className="flex items-center gap-2">
          {data?.item?.url && (
            <a
              href={data.item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 border border-status-in-review/70 bg-status-in-review/15 px-2.5 py-1 text-xs font-bold text-status-in-review hover:bg-status-in-review/25 transition-colors"
            >
              <span>[OPEN UPSTREAM]</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center border border-border-bold text-text-muted hover:border-border-active hover:text-white transition-colors"
            title="Dismiss Inspector (Esc)"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-xs text-text-muted">
          <Clock className="h-4 w-4 animate-spin mr-2" />
          <span>PARSING TELEMETRY LEDGER...</span>
        </div>
      ) : data ? (
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Spec-Sheet Header & Metadata Grid */}
          <div className="border border-border-bold bg-base p-4">
            <h2 className="text-sm font-bold text-text-primary leading-tight font-display mb-3">
              {data.item.title}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs border-t border-border-subtle pt-3">
              <div>
                <span className="text-text-muted text-[10px] block uppercase">REPOSITORY</span>
                <span className="font-bold text-text-primary text-[11px] truncate block">{data.item.repo}</span>
              </div>
              <div>
                <span className="text-text-muted text-[10px] block uppercase">AUTHOR</span>
                <span className="font-bold text-text-primary text-[11px] block">@{data.item.author}</span>
              </div>
              <div>
                <span className="text-text-muted text-[10px] block uppercase">PLATFORM</span>
                <span className="font-bold text-status-in-review text-[11px] block uppercase">[{data.item.platform}]</span>
              </div>
              <div>
                <span className="text-text-muted text-[10px] block uppercase">STATUS</span>
                <span className="font-bold text-text-primary text-[11px] block uppercase">[{data.item.status}]</span>
              </div>
            </div>
            {data.item.bounty_amount && (
              <div className="mt-2.5 border-t border-border-subtle pt-2 flex items-center justify-between text-xs">
                <span className="text-text-muted text-[10px] uppercase">REWARD / BOUNTY</span>
                <span className="text-status-bounty font-bold text-[11px]">[{data.item.bounty_amount}]</span>
              </div>
            )}
          </div>

          {/* Operational Guidance Directive */}
          {(() => {
            const guidance = getActionGuidance(data.item);
            return (
              <div
                className={`border p-3.5 space-y-2 ${
                  guidance.variant === 'urgent'
                    ? 'border-status-action-needed/60 bg-status-action-needed/10'
                    : guidance.variant === 'success'
                    ? 'border-status-merged/60 bg-status-merged/10'
                    : 'border-border-bold bg-base'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {guidance.icon}
                  <div className="flex-1">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-text-muted block">
                      {guidance.badge}
                    </span>
                    <h3 className="text-xs font-bold text-text-primary mt-0.5">
                      {guidance.heading}
                    </h3>
                    <p className="text-xs text-text-secondary mt-1 font-body leading-relaxed">
                      {guidance.body}
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex justify-end border-t border-border-subtle">
                  <a
                    href={data.item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-text-primary hover:text-white underline underline-offset-4 decoration-border-bold hover:decoration-white"
                  >
                    <span>Inspect Discussion Thread</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            );
          })()}

          {/* Working Notes & Status Flag Override */}
          <div className="border border-border-bold bg-base p-4 space-y-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border-subtle pb-2.5">
              <span className="font-bold text-text-secondary uppercase text-[10px]">
                MANUAL TRIGGER OVERRIDE:
              </span>
              <div className="flex items-center gap-1">
                {(['none', 'reply', 'push-changes'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setActionNeeded(mode)}
                    className={`border px-2 py-0.5 uppercase text-[10px] transition-colors ${
                      actionNeeded === mode
                        ? 'border-status-action-needed bg-status-action-needed/20 text-status-action-needed font-bold'
                        : 'border-border-subtle text-text-muted hover:text-text-secondary'
                    }`}
                  >
                    {mode === 'none' ? '[WAITING]' : mode === 'reply' ? '[OWE_REPLY]' : '[REQ_CHANGES]'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-text-muted mb-1 uppercase text-[10px]">
                DEVELOPER WORKING NOTES // LOCAL CONTEXT:
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Log next steps, branch references, or review feedback..."
                className="w-full border border-border-bold bg-surface p-2 text-xs text-text-primary placeholder:text-text-muted focus:border-status-in-review focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-text-muted">
                {saveSuccess ? (
                  <span className="text-status-merged flex items-center gap-1">
                    <Check className="h-3 w-3" /> [NOTES_PERSISTED_LOCALLY]
                  </span>
                ) : (
                  'Notes stored encrypted in local SQLite instance.'
                )}
              </span>
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="border border-border-bold bg-surface-elevated px-3 py-1 text-xs font-bold text-text-primary hover:border-border-active hover:bg-surface-active disabled:opacity-50 transition-colors"
              >
                {savingNotes ? '[SAVING...]' : '[SAVE_NOTES]'}
              </button>
            </div>
          </div>

          {/* Activity Ledger Stream */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-text-secondary uppercase">
                TELEMETRY ACTIVITY LEDGER ({data.events.length})
              </span>
            </div>

            <div className="space-y-2">
              {data.events.length === 0 ? (
                <div className="border border-border-subtle bg-base p-4 text-center text-xs text-text-muted">
                  [ZERO_ACTIVITY_EVENTS_RECORDED]
                </div>
              ) : (
                data.events.map((ev) => {
                  const bot = isBot(ev.actor);
                  return (
                    <div key={ev.id} className="border border-border-bold bg-base p-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          {bot ? (
                            <Bot className="h-3.5 w-3.5 text-text-muted" />
                          ) : (
                            <User className="h-3.5 w-3.5 text-status-in-review" />
                          )}
                          <span className="font-bold text-text-primary">@{ev.actor}</span>
                          {bot && (
                            <span className="border border-border-subtle bg-surface-elevated px-1 py-0.2 text-[9px] text-text-muted">
                              [BOT]
                            </span>
                          )}
                          {ev.review_state && (
                            <span
                              className={`border px-1 py-0.2 text-[9px] font-bold ${
                                ev.review_state === 'APPROVED'
                                  ? 'border-status-merged text-status-merged bg-status-merged/10'
                                  : 'border-status-action-needed text-status-action-needed bg-status-action-needed/10'
                              }`}
                            >
                              [{ev.review_state}]
                            </span>
                          )}
                        </div>
                        <span className="text-text-muted text-[10px] font-telemetry">
                          {new Date(ev.created_at).toLocaleString()}
                        </span>
                      </div>

                      <div className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap bg-surface p-2.5 border-l-2 border-border-bold font-mono text-[11px]">
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
