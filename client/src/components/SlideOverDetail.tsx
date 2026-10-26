import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Contribution, ActivityEvent } from '../types';
import { X, ExternalLink, MessageSquare, Check, AlertTriangle, CheckCircle2, Clock, Bot, User, Send, RefreshCw, GitPullRequest, Loader2, Sparkles } from 'lucide-react';
import axios from 'axios';

function renderFormattedInline(content: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = content;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)$/);
    const codeMatch = remaining.match(/^(.*?)`([^`]+)`(.*)$/);

    if (boldMatch && (!codeMatch || boldMatch[1].length <= codeMatch[1].length)) {
      if (boldMatch[1]) {
        parts.push(<span key={key++}>{boldMatch[1]}</span>);
      }
      parts.push(
        <strong key={key++} className="font-semibold text-white">
          {boldMatch[2]}
        </strong>
      );
      remaining = boldMatch[3];
    } else if (codeMatch) {
      if (codeMatch[1]) {
        parts.push(<span key={key++}>{codeMatch[1]}</span>);
      }
      parts.push(
        <code key={key++} className="px-1.5 py-0.5 rounded bg-base border border-border-subtle font-mono text-xs text-accent-glacial">
          {codeMatch[2]}
        </code>
      );
      remaining = codeMatch[3];
    } else {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }
  }

  return parts;
}

const FormattedReview: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  return (
    <div className="space-y-2 text-xs md:text-sm text-text-whisper leading-relaxed font-sans">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={idx} className="text-xs md:text-sm font-bold text-white tracking-wide mt-3 mb-1 font-sans">
              {renderFormattedInline(trimmed.replace(/^###\s+/, ''))}
            </h4>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={idx} className="text-sm md:text-base font-bold text-white tracking-wide mt-3.5 mb-1.5 font-sans">
              {renderFormattedInline(trimmed.replace(/^##\s+/, ''))}
            </h3>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h2 key={idx} className="text-base md:text-lg font-bold text-white tracking-wide mt-4 mb-2 font-sans">
              {renderFormattedInline(trimmed.replace(/^#\s+/, ''))}
            </h2>
          );
        }
        if (/^(\*|-)\s+/.test(trimmed)) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-accent-emerald select-none mt-1 text-xs">•</span>
              <span className="flex-1">{renderFormattedInline(trimmed.replace(/^(\*|-)\s+/, ''))}</span>
            </div>
          );
        }
        if (/^\d+\.\s+/.test(trimmed)) {
          const match = trimmed.match(/^(\d+)\.\s+(.*)/);
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-accent-emerald font-mono text-xs font-semibold select-none shrink-0 mt-0.5">
                {match ? match[1] + '.' : '•'}
              </span>
              <span className="flex-1">{renderFormattedInline(match ? match[2] : trimmed)}</span>
            </div>
          );
        }
        return (
          <p key={idx} className="leading-relaxed">
            {renderFormattedInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
};

interface SlideOverDetailProps {
  itemId: string | null;
  onClose: () => void;
  onItemUpdated: () => void;
}

export const SlideOverDetail: React.FC<SlideOverDetailProps> = ({
  itemId,
  onClose,
  onItemUpdated,
}) => {
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

  // AI states
  const [triagingAi, setTriagingAi] = useState(false);
  const [suggestingReply, setSuggestingReply] = useState(false);
  const [aiTriageResult, setAiTriageResult] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

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

  const handleAiTriage = async () => {
    if (!itemId) return;
    setTriagingAi(true);
    setAiError(null);
    try {
      const res = await axios.post(`/api/ai/triage/${encodeURIComponent(itemId)}`, {}, { timeout: 120000 });
      setAiTriageResult(res.data.draftResponse);
    } catch (err: any) {
      setAiError(err.response?.data?.error || err.message || 'AI Review analysis failed');
    } finally {
      setTriagingAi(false);
    }
  };

  const handleSuggestReply = async () => {
    if (!itemId) return;
    setSuggestingReply(true);
    setAiError(null);
    try {
      
      const res = await axios.post(`/api/ai/suggest-reply/${encodeURIComponent(itemId)}`, {}, { timeout: 120000 });
      const suggested = res.data.reply || '';
      setCommentText(suggested);
      setIsCommentBoxOpen(true);
    } catch (err: any) {
      console.error('Failed to suggest reply:', err);
      setAiError(err.response?.data?.error || err.message || 'Failed to generate reply suggestion');
    } finally {
      setSuggestingReply(false);
    }
  };

  const getActionGuidance = (item: Contribution) => {
    const status = (item.status === 'opened' ? 'open' : item.status).toLowerCase();

    if (item.action_needed === 'push-changes') {
      return {
        variant: 'urgent',
        badge: 'Changes Requested',
        heading: 'Maintainer Requested Code Modifications',
        body: 'The upstream maintainer reviewed this PR and requested adjustments. Inspect feedback in the activity ledger below, apply commits in your local git branch, and push upstream.',
        icon: <AlertTriangle className="h-5 w-5 text-status-action-needed shrink-0 mt-0.5" />,
      };
    }

    if (item.action_needed === 'reply') {
      return {
        variant: 'urgent',
        badge: 'Reply Needed',
        heading: 'Maintainer Awaiting Response',
        body: 'A maintainer left a question or clarification request. Open the upstream discussion thread to post your technical response.',
        icon: <MessageSquare className="h-5 w-5 text-status-awaiting-reply shrink-0 mt-0.5" />,
      };
    }

    if (status === 'merged') {
      return {
        variant: 'success',
        badge: 'Accepted and Merged',
        heading: 'Contribution Merged Upstream',
        body: 'Your changes have been accepted and committed into the main upstream repository branch. Local branch can safely be retired.',
        icon: <CheckCircle2 className="h-5 w-5 text-status-merged shrink-0 mt-0.5" />,
      };
    }

    if (status === 'closed') {
      return {
        variant: 'neutral',
        badge: 'Closed',
        heading: 'Item Closed Upstream',
        body: 'This pull request or issue was closed by the repository maintainer. Check the activity ledger below for closure rationale.',
        icon: <X className="h-5 w-5 text-text-muted shrink-0 mt-0.5" />,
      };
    }

    return {
      variant: 'info',
      badge: 'Awaiting Review',
      heading: 'In Review Queue',
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
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <span className="text-text-muted text-xs font-mono font-bold uppercase tracking-wider shrink-0">Details:</span>
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
                      <span className="hidden sm:inline">Open Upstream</span>
                      <span className="sm:hidden">Open</span>
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
                  <span>Loading details...</span>
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
                <span className="font-mono font-bold text-accent-glacial text-sm block uppercase mt-0.5">{data.item.platform}</span>
              </div>
              <div className="bg-base p-2.5 rounded border border-border-subtle/50">
                <span className="text-text-muted text-xs block uppercase font-mono font-bold">STATUS</span>
                <span className="font-mono font-bold text-white text-sm block uppercase mt-0.5">{data.item.status}</span>
              </div>
            </div>
            {data.item.bounty_amount && (
              <div className="mt-3.5 border-t border-border-subtle/60 pt-3 flex items-center justify-between text-sm">
                <span className="text-text-muted uppercase font-mono font-bold">REWARD</span>
                <span className="text-status-bounty font-mono font-bold text-base">{data.item.bounty_amount}</span>
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
                  Actions
                </span>
              </div>
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
                <span>{isCommentBoxOpen ? 'Close Reply Box' : 'Reply to PR'}</span>
              </button>

              {/* Suggest Reply button */}
              <button
                type="button"
                onClick={handleSuggestReply}
                disabled={suggestingReply}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-accent-sapphire/40 bg-accent-sapphire/10 text-text-whisper hover:border-accent-sapphire hover:bg-accent-sapphire/20 text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                {suggestingReply ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-sapphire" />
                    <span>Suggesting Reply...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-accent-sapphire" />
                    <span>Suggest Reply</span>
                  </>
                )}
              </button>

              {/* AI Review button */}
              <button
                type="button"
                onClick={handleAiTriage}
                disabled={triagingAi}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-accent-emerald/40 bg-accent-emerald/10 text-accent-emerald hover:border-accent-emerald hover:bg-accent-emerald/20 text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                {triagingAi ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-emerald" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Bot className="h-3.5 w-3.5 text-accent-emerald" />
                    <span>AI Review</span>
                  </>
                )}
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
                      <span>Requesting...</span>
                    </>
                  ) : reviewSuccess ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-status-merged" />
                      <span className="text-status-merged">Review Requested</span>
                    </>
                  ) : (
                    <>
                      <GitPullRequest className="h-3.5 w-3.5 text-status-awaiting-reply" />
                      <span>Re-request Review</span>
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
                    <span>Refreshing...</span>
                  </>
                ) : syncSuccess ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-status-merged" />
                    <span className="text-status-merged">Synced</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Sync Item</span>
                  </>
                )}
              </button>
            </div>

            {/* AI Error Feedback */}
            {aiError && (
              <div className="flex items-start gap-2 bg-status-action-needed/15 border border-status-action-needed/50 p-2.5 rounded text-xs font-mono text-status-action-needed">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{aiError}</span>
              </div>
            )}

            {/* AI Review Result Drawer */}
            {aiTriageResult && (
              <div className="space-y-3 p-4 rounded-lg border border-accent-emerald/40 bg-accent-emerald/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-accent-emerald" />
                    <span className="text-xs font-mono font-bold text-accent-emerald uppercase">
                      AI Review
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAiTriageResult(null)}
                    className="text-text-muted hover:text-white text-xs font-mono cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
                <div className="bg-base/80 p-3.5 rounded-lg border border-border-subtle max-h-72 overflow-y-auto">
                  <FormattedReview text={aiTriageResult} />
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCommentBoxOpen(true);
                      setCommentText(aiTriageResult);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-accent-emerald text-base text-xs font-mono font-bold hover:bg-accent-emerald/90 transition-all cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Insert into Reply Box</span>
                  </button>
                </div>
              </div>
            )}

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
                    Reply Message:
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
                    placeholder="Write technical reply or review comments... (Press Ctrl+Enter to submit)"
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
                        Cancel
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
                            <span>Posting...</span>
                          </>
                        ) : (
                          <>
                            <Send className="h-3.5 w-3.5" />
                            <span>Send Reply</span>
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
                Status Override:
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
                    {mode === 'none' ? 'Waiting' : mode === 'reply' ? 'Reply Needed' : 'Changes Requested'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-text-muted mb-2 uppercase text-xs font-mono font-bold">
                Working Notes:
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
              <div>
                {saveSuccess && (
                  <span className="text-status-merged flex items-center gap-1 font-bold">
                    <Check className="h-4 w-4" /> Notes saved
                  </span>
                )}
              </div>
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="border border-accent-sapphire bg-accent-sapphire/20 px-4 py-2 rounded-md font-mono text-xs md:text-sm font-bold text-text-whisper hover:bg-accent-sapphire/30 disabled:opacity-50 transition-all cursor-pointer"
              >
                {savingNotes ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          </div>

          {/* Activity Ledger Stream */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-mono font-bold text-text-whisper uppercase tracking-wider">
                Activity Ledger ({data.events.length})
              </span>
            </div>

            <div className="space-y-3">
              {data.events.length === 0 ? (
                <div className="border border-border-subtle bg-surface-card p-5 rounded-lg text-center text-sm font-mono text-text-muted">
                  No activity recorded
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
                              Bot
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
                              {ev.review_state.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                        <span className="text-text-muted text-xs font-mono">
                          {new Date(ev.created_at).toLocaleString()}
                        </span>
                      </div>

                      <div className="text-xs md:text-sm text-text-whisper leading-relaxed whitespace-pre-wrap bg-base/60 p-3.5 rounded-lg border border-border-subtle/70 font-sans">
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
