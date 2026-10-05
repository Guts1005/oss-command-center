import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Contribution, ActivityEvent } from '../types';
import { X, ExternalLink, MessageSquare, Check, AlertTriangle, CheckCircle2, Clock, Bot, User, Send, RefreshCw, GitPullRequest, Loader2 } from 'lucide-react';
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

  // In-App Direct Action states
  const [isCommentBoxOpen, setIsCommentBoxOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [commentSuccess, setCommentSuccess] = useState(false);

  const [requestingReview, setRequestingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const [syncingItem, setSyncingItem] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

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

  const handlePostComment = async () => {
    if (!itemId || !commentText.trim()) return;
    setPostingComment(true);
    setCommentError(null);
    setCommentSuccess(false);
    try {
      await axios.post(`/api/contributions/${encodeURIComponent(itemId)}/actions/comment`, {
        comment: commentText.trim(),
      });
      setCommentSuccess(true);
      setCommentText('');
      setIsCommentBoxOpen(false);
      setActionNeeded('none');
      onItemUpdated();
      const updated = await axios.get(`/api/contributions/${encodeURIComponent(itemId)}`);
      setData(updated.data);
      setTimeout(() => setCommentSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to post comment:', err);
      setCommentError(err.response?.data?.details || err.response?.data?.error || 'Failed to post comment');
    } finally {
      setPostingComment(false);
    }
  };

  const handleRequestReview = async () => {
    if (!itemId) return;
    setRequestingReview(true);
    setReviewError(null);
    setReviewSuccess(false);
    try {
      await axios.post(`/api/contributions/${encodeURIComponent(itemId)}/actions/request-review`, {});
      setReviewSuccess(true);
      setActionNeeded('none');
      onItemUpdated();
      const updated = await axios.get(`/api/contributions/${encodeURIComponent(itemId)}`);
      setData(updated.data);
      setTimeout(() => setReviewSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to request review:', err);
      setReviewError(err.response?.data?.details || err.response?.data?.error || 'Failed to request review');
    } finally {
      setRequestingReview(false);
    }
  };

  const handleSyncItem = async () => {
    if (!itemId) return;
    setSyncingItem(true);
    setSyncSuccess(false);
    try {
      await axios.post(`/api/contributions/${encodeURIComponent(itemId)}/actions/sync`, {});
      setSyncSuccess(true);
      onItemUpdated();
      const updated = await axios.get(`/api/contributions/${encodeURIComponent(itemId)}`);
      setData(updated.data);
      setTimeout(() => setSyncSuccess(false), 2500);
    } catch (err: any) {
      console.error('Failed to sync item:', err);
    } finally {
      setSyncingItem(false);
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

          {/* In-App Direct Actions Toolbar */}
          <div className="border border-border-subtle bg-surface-card p-5 rounded-lg space-y-3.5 shadow-card">
            <div className="flex items-center justify-between border-b border-border-subtle/60 pb-3">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-accent-sapphire" />
                <span className="font-mono font-bold text-white uppercase text-xs tracking-wider">
                  DIRECT IN-APP ACTIONS
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-border-subtle bg-base text-text-muted">
                BI-DIRECTIONAL SYNC
              </span>
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Post Comment or Reply button */}
              <button
                type="button"
                onClick={() => {
                  setIsCommentBoxOpen(!isCommentBoxOpen);
                  setCommentError(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-mono font-bold transition-all cursor-pointer ${
                  isCommentBoxOpen
                    ? 'border-accent-sapphire bg-accent-sapphire/30 text-white'
                    : 'border-border-subtle bg-base text-text-whisper hover:border-accent-sapphire hover:text-white'
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5 text-accent-sapphire" />
                <span>{isCommentBoxOpen ? '[CLOSE REPLY DOCK]' : '[POST REPLY TO PR]'}</span>
              </button>

              {/* Re-request Review button (GitHub only) */}
              {data.item.platform === 'github' && (
                <button
                  type="button"
                  onClick={handleRequestReview}
                  disabled={requestingReview}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-border-subtle bg-base text-text-whisper hover:border-accent-sapphire hover:text-white text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {requestingReview ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-sapphire" />
                      <span>[REQUESTING...]</span>
                    </>
                  ) : reviewSuccess ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-status-merged" />
                      <span className="text-status-merged">[REVIEW REQUESTED]</span>
                    </>
                  ) : (
                    <>
                      <GitPullRequest className="h-3.5 w-3.5 text-status-awaiting-reply" />
                      <span>[RE-REQUEST REVIEW]</span>
                    </>
                  )}
                </button>
              )}

              {/* Targeted Sync Single Item */}
              <button
                type="button"
                onClick={handleSyncItem}
                disabled={syncingItem}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-border-subtle bg-base text-text-muted hover:border-accent-sapphire hover:text-text-whisper text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                {syncingItem ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-sapphire" />
                    <span>[REFRESHING...]</span>
                  </>
                ) : syncSuccess ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-status-merged" />
                    <span className="text-status-merged">[SYNCED]</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>[SYNC THIS ITEM]</span>
                  </>
                )}
              </button>
            </div>

            {/* Feedback banner for review error */}
            {reviewError && (
              <div className="flex items-start gap-2 bg-status-action-needed/15 border border-status-action-needed/50 p-2.5 rounded text-xs font-mono text-status-action-needed">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{reviewError}</span>
              </div>
            )}

            {/* Comment success feedback */}
            {commentSuccess && (
              <div className="flex items-center gap-2 bg-status-merged/15 border border-status-merged/50 p-2.5 rounded text-xs font-mono text-status-merged">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Reply dispatched upstream. Activity ledger updated.</span>
              </div>
            )}

            {/* Expandable Comment Box with Ctrl+Enter shortcut */}
            <AnimatePresence>
              {isCommentBoxOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-2.5 pt-2 border-t border-border-subtle/50"
                >
                  <label className="block text-text-muted uppercase text-xs font-mono font-bold">
                    Technical Reply / PR Comment (Markdown Enabled):
                  </label>
                  <textarea
                    rows={4}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                        e.preventDefault();
                        handlePostComment();
                      }
                    }}
                    placeholder="Write technical reply or context for maintainers... (Press Ctrl+Enter to submit)"
                    className="w-full border border-border-subtle bg-base p-3 rounded-md text-xs font-mono text-white placeholder:text-text-muted focus:border-accent-sapphire focus:ring-1 focus:ring-accent-sapphire focus:outline-none transition-all"
                  />
                  {commentError && (
                    <div className="flex items-start gap-2 text-status-action-needed text-xs font-mono">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>{commentError}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-mono text-text-muted">
                      Posts directly via your connected {data.item.platform.toUpperCase()} token.
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsCommentBoxOpen(false)}
                        className="px-3 py-1.5 rounded border border-border-subtle text-xs font-mono text-text-muted hover:text-white cursor-pointer"
                      >
                        [CANCEL]
                      </button>
                      <button
                        type="button"
                        onClick={handlePostComment}
                        disabled={postingComment || !commentText.trim()}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded border border-accent-sapphire bg-accent-sapphire/30 text-white font-mono text-xs font-bold hover:bg-accent-sapphire/50 disabled:opacity-50 transition-all cursor-pointer"
                      >
                        {postingComment ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>[POSTING...]</span>
                          </>
                        ) : (
                          <>
                            <Send className="h-3.5 w-3.5" />
                            <span>[SUBMIT REPLY]</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

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
