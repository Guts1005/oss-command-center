import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

  const getActionGuidance = (item: Contribution) => {
    const status = (item.status === 'opened' ? 'open' : item.status).toLowerCase();

    if (item.action_needed === 'push-changes') {
      return {
        variant: 'urgent',
        badge: '[ACTION: CHANGES REQUESTED]',
        heading: 'MAINTAINER REQUESTED CODE MODIFICATIONS',
        body: 'The upstream maintainer reviewed this PR and requested adjustments. Inspect feedback in the activity ledger below, apply commits in your local git branch, and push upstream.',
        icon: <AlertTriangle className="h-5 w-5 text-status-action-needed shrink-0 mt-0.5" />,
      };
    }

    if (item.action_needed === 'reply') {
      return {
        variant: 'urgent',
        badge: '[ACTION: REPLY NEEDED]',
        heading: 'MAINTAINER COMMENT REQ RESPONSE',
        body: 'A maintainer left a question or clarification request. Open the upstream discussion thread to post your technical response.',
        icon: <MessageSquare className="h-5 w-5 text-status-awaiting-reply shrink-0 mt-0.5" />,
      };
    }

    if (status === 'merged') {
      return {
        variant: 'success',
        badge: '[STATUS: ACCEPTED & MERGED]',
        heading: 'CONTRIBUTION MERGED UPSTREAM',
        body: 'Your changes have been accepted and committed into the main upstream repository branch. Local branch can safely be retired.',
        icon: <CheckCircle2 className="h-5 w-5 text-status-merged shrink-0 mt-0.5" />,
      };
    }

    if (status === 'closed') {
      return {
        variant: 'neutral',
        badge: '[STATUS: CLOSED]',
        heading: 'ITEM CLOSED UPSTREAM',
        body: 'This pull request or issue was closed by the repository maintainer. Check the activity ledger below for closure rationale.',
        icon: <X className="h-5 w-5 text-text-muted shrink-0 mt-0.5" />,
      };
    }

    return {
      variant: 'info',
      badge: '[STATUS: AWAITING REVIEW]',
      heading: 'IN REVIEW QUEUE // NO ACTION REQUIRED',
      body: 'Your changes are cleanly submitted and awaiting maintainer triage. You spoke last in the thread.',
      icon: <Clock className="h-5 w-5 text-accent-sapphire shrink-0 mt-0.5" />,
    };
  };

  const isBot = (name: string) => {
    const l = name.toLowerCase();
    return l.includes('bot') || l.includes('greptile') || l.includes('soffi') || l.includes('copilot');
  };

  return (
    <AnimatePresence>
      {Boolean(itemId) && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop with smooth fade */}
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-[2px] cursor-pointer"
            title="Click to dismiss inspector"
          />

          {/* Drawer container with slide-in from right */}
          <div className="fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10 w-full sm:w-auto">
            <motion.div
              key="drawer-panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320, mass: 0.75 }}
              className="flex w-full sm:w-screen max-w-full sm:max-w-xl xl:max-w-2xl flex-col border-l border-border-subtle bg-surface shadow-[-16px_0_40px_rgba(0,0,0,0.75)] [box-shadow:inset_1px_0_0_rgba(207,231,248,0.04),-16px_0_40px_rgba(0,0,0,0.75)] select-none pt-safe pb-safe"
            >
              {/* Header Bar */}
              <div className="flex items-center justify-between border-b border-border-subtle bg-base px-4 py-3 sm:px-6 sm:py-4 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-text-muted text-xs font-mono font-bold uppercase tracking-wider shrink-0">[INSPECTOR]:</span>
                  <span className="font-mono font-bold text-white text-sm sm:text-base truncate">{itemId}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {data?.item?.url && (
                    <a
                      href={data.item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 border border-accent-sapphire bg-accent-sapphire/20 px-2.5 py-1.5 sm:px-3.5 sm:py-1.5 rounded-md text-xs font-mono font-bold text-text-whisper hover:bg-accent-sapphire/30 transition-colors cursor-pointer shrink-0"
                    >
                      <span className="hidden sm:inline">[OPEN UPSTREAM]</span>
                      <span className="sm:hidden">[OPEN]</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    onClick={onClose}
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-border-subtle text-text-muted hover:border-accent-sapphire hover:text-white transition-colors cursor-pointer shrink-0"
                    title="Dismiss Inspector (Esc)"
                  >
                    <X className="h-4 w-4" />
                  </motion.button>
                </div>
              </div>

              {loading ? (
                <div className="flex flex-1 items-center justify-center text-sm font-mono text-text-muted">
                  <Clock className="h-5 w-5 animate-spin mr-3 text-accent-sapphire" />
                  <span>PARSING TELEMETRY LEDGER...</span>
                </div>
              ) : data ? (
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Spec-Sheet Header & Metadata Grid */}
          <div className="border border-border-subtle bg-surface-card p-5 rounded-lg shadow-card">
            <h2 className="text-lg md:text-xl font-bold text-white leading-snug font-sans mb-4">
              {data.item.title}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-t border-border-subtle/60 pt-4">
              <div className="bg-base p-2.5 rounded border border-border-subtle/50">
                <span className="text-text-muted text-xs block uppercase font-mono font-bold">REPOSITORY</span>
                <span className="font-mono font-bold text-text-whisper text-sm truncate block mt-0.5">{data.item.repo}</span>
              </div>
              <div className="bg-base p-2.5 rounded border border-border-subtle/50">
                <span className="text-text-muted text-xs block uppercase font-mono font-bold">AUTHOR</span>
                <span className="font-mono font-bold text-white text-sm block mt-0.5">@{data.item.author}</span>
              </div>
              <div className="bg-base p-2.5 rounded border border-border-subtle/50">
                <span className="text-text-muted text-xs block uppercase font-mono font-bold">PLATFORM</span>
                <span className="font-mono font-bold text-accent-glacial text-sm block uppercase mt-0.5">[{data.item.platform}]</span>
              </div>
              <div className="bg-base p-2.5 rounded border border-border-subtle/50">
                <span className="text-text-muted text-xs block uppercase font-mono font-bold">STATUS</span>
                <span className="font-mono font-bold text-white text-sm block uppercase mt-0.5">[{data.item.status}]</span>
              </div>
            </div>
            {data.item.bounty_amount && (
              <div className="mt-3.5 border-t border-border-subtle/60 pt-3 flex items-center justify-between text-sm">
                <span className="text-text-muted uppercase font-mono font-bold">REWARD / BOUNTY</span>
                <span className="text-status-bounty font-mono font-bold text-base">[{data.item.bounty_amount}]</span>
              </div>
            )}
          </div>

          {/* Operational Guidance Directive */}
          {(() => {
            const guidance = getActionGuidance(data.item);
            return (
              <div
                className={`border p-5 rounded-lg space-y-3 shadow-card ${
                  guidance.variant === 'urgent'
                    ? 'border-status-action-needed/80 bg-status-action-needed/15'
                    : guidance.variant === 'success'
                    ? 'border-status-merged/80 bg-status-merged/15'
                    : 'border-border-subtle bg-surface-card'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {guidance.icon}
                  <div className="flex-1">
                    <span className="text-xs font-mono font-bold tracking-wider uppercase text-text-muted block">
                      {guidance.badge}
                    </span>
                    <h3 className="text-sm md:text-base font-bold text-white mt-1">
                      {guidance.heading}
                    </h3>
                    <p className="text-sm text-text-whisper mt-1.5 font-sans leading-relaxed">
                      {guidance.body}
                    </p>
                  </div>
                </div>

                <div className="pt-3 flex justify-end border-t border-border-subtle/60">
                  <a
                    href={data.item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs md:text-sm font-bold text-text-whisper hover:text-white underline underline-offset-4 decoration-accent-sapphire hover:decoration-white transition-colors"
                  >
                    <span>Inspect Discussion Thread</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            );
          })()}

          {/* Working Notes & Status Flag Override */}
          <div className="border border-border-subtle bg-surface-card p-5 rounded-lg space-y-4 text-sm shadow-card">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-border-subtle/60 pb-3">
              <span className="font-mono font-bold text-text-whisper uppercase text-xs">
                MANUAL TRIGGER OVERRIDE:
              </span>
              <div className="flex items-center gap-2">
                {(['none', 'reply', 'push-changes'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setActionNeeded(mode)}
                    className={`border px-3 py-1 rounded uppercase font-mono text-xs font-bold transition-all cursor-pointer ${
                      actionNeeded === mode
                        ? 'border-status-action-needed bg-status-action-needed/25 text-status-action-needed ring-1 ring-status-action-needed'
                        : 'border-border-subtle bg-base text-text-muted hover:text-text-whisper hover:border-accent-sapphire'
                    }`}
                  >
                    {mode === 'none' ? '[WAITING]' : mode === 'reply' ? '[REPLY NEEDED]' : '[CHANGES REQUESTED]'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-text-muted mb-2 uppercase text-xs font-mono font-bold">
                DEVELOPER WORKING NOTES // LOCAL CONTEXT:
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Log next steps, branch references, or review feedback..."
                className="w-full border border-border-subtle bg-base p-3 rounded-md text-sm text-white placeholder:text-text-muted focus:border-accent-sapphire focus:ring-1 focus:ring-accent-sapphire focus:outline-none transition-all"
              />
            </div>

            <div className="flex items-center justify-between pt-1 font-mono text-xs">
              <span className="text-text-muted">
                {saveSuccess ? (
                  <span className="text-status-merged flex items-center gap-1 font-bold">
                    <Check className="h-4 w-4" /> [NOTES SAVED]
                  </span>
                ) : (
                  'Notes stored encrypted in local SQLite instance.'
                )}
              </span>
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="border border-accent-sapphire bg-accent-sapphire/20 px-4 py-2 rounded-md font-mono text-xs md:text-sm font-bold text-text-whisper hover:bg-accent-sapphire/30 disabled:opacity-50 transition-all cursor-pointer"
              >
                {savingNotes ? '[SAVING...]' : '[SAVE NOTES]'}
              </button>
            </div>
          </div>

          {/* Activity Ledger Stream */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-mono font-bold text-text-whisper uppercase tracking-wider">
                TELEMETRY ACTIVITY LEDGER ({data.events.length})
              </span>
            </div>

            <div className="space-y-3">
              {data.events.length === 0 ? (
                <div className="border border-border-subtle bg-surface-card p-5 rounded-lg text-center text-sm font-mono text-text-muted">
                  [NO ACTIVITY RECORDED]
                </div>
              ) : (
                data.events.map((ev) => {
                  const bot = isBot(ev.actor);
                  return (
                    <div key={ev.id} className="border border-border-subtle bg-surface-card p-4 rounded-lg space-y-2.5 shadow-sm">
                      <div className="flex items-center justify-between text-xs md:text-sm">
                        <div className="flex items-center gap-2">
                          {bot ? (
                            <Bot className="h-4 w-4 text-text-muted" />
                          ) : (
                            <User className="h-4 w-4 text-accent-sapphire" />
                          )}
                          <span className="font-bold text-white font-mono">@{ev.actor}</span>
                          {bot && (
                            <span className="border border-border-subtle bg-surface-elevated px-1.5 py-0.5 rounded text-xs font-mono text-text-muted">
                              [BOT]
                            </span>
                          )}
                          {ev.review_state && (
                            <span
                              className={`border px-2 py-0.5 rounded text-xs font-bold font-mono ${
                                ev.review_state === 'APPROVED'
                                  ? 'border-status-merged text-status-merged bg-status-merged/15'
                                  : 'border-status-action-needed text-status-action-needed bg-status-action-needed/15'
                              }`}
                            >
                              [{ev.review_state.replace(/_/g, ' ')}]
                            </span>
                          )}
                        </div>
                        <span className="text-text-muted text-xs font-mono">
                          {new Date(ev.created_at).toLocaleString()}
                        </span>
                      </div>

                      <div className="text-xs md:text-sm text-text-whisper leading-relaxed whitespace-pre-wrap bg-base p-3 rounded border-l-2 border-accent-sapphire font-mono">
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
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
