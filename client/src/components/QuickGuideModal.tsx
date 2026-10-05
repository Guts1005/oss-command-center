import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Clock,
  Keyboard,
  Terminal,
  RefreshCw,
  Key,
  PlusCircle,
  FileCode,
  Archive,
  Volume2,
  Bell,
  Smartphone,
} from 'lucide-react';
import { ViewMode } from '../types';

interface QuickGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateView?: (mode: ViewMode) => void;
}

type GuideTab = 'signals' | 'keys' | 'sync';

export const QuickGuideModal: React.FC<QuickGuideModalProps> = ({ isOpen, onClose, onNavigateView }) => {
  const [activeTab, setActiveTab] = useState<GuideTab>('signals');

  const guideTabs: { id: GuideTab; label: string }[] = [
    { id: 'signals', label: 'STATUS SIGNALS' },
    { id: 'keys', label: 'SHORTCUTS & CONTROLS' },
    { id: 'sync', label: 'SYNC & INTEGRATIONS' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 select-none">
          {/* Backdrop with smooth fade */}
          <motion.div
            key="guide-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Container: Fixed Header + Scrollable Body + Fixed Footer */}
          <motion.div
            key="guide-modal-card"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', damping: 26, stiffness: 380, mass: 0.8 }}
            className="relative w-full max-w-2xl border border-border-subtle bg-surface rounded-xl shadow-[inset_0_1px_0_rgba(207,231,248,0.04),0_25px_50px_-12px_rgba(0,0,0,0.8)] flex flex-col max-h-[85vh] overflow-hidden z-10"
          >
            {/* 1. Fixed Header */}
            <div className="p-4 sm:p-5 border-b border-border-subtle bg-surface shrink-0">
              <div className="flex items-center justify-between gap-3 mb-3.5 pr-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-bold bg-base text-accent-sapphire shrink-0">
                    <Terminal className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-white tracking-wide uppercase font-sans">
                      OPERATIONAL REFERENCE MANUAL
                    </h2>
                    <p className="text-xs text-text-muted font-sans mt-0.5">
                      Status telemetry, keyboard controls, and upstream synchronization.
                    </p>
                  </div>
                </div>

                {/* Dismiss X Button */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  onClick={onClose}
                  className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-md border border-border-subtle text-text-muted hover:border-accent-sapphire hover:text-white transition-colors cursor-pointer"
                  title="Dismiss (Esc)"
                >
                  <X className="h-3.5 w-3.5" />
                </motion.button>
              </div>

              {/* Segmented Navigation Tabs */}
              <div className="grid grid-cols-3 gap-1 p-1 rounded-lg border border-border-subtle bg-base/80 text-xs font-mono">
                {guideTabs.map((t) => {
                  const isActive = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveTab(t.id)}
                      className={`relative py-1.5 px-2 rounded-md font-bold transition-colors cursor-pointer select-none text-center z-10 text-[11px] sm:text-xs truncate ${
                        isActive ? 'text-white' : 'text-text-muted hover:text-white'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeGuideTab"
                          className="absolute inset-0 rounded-md bg-surface-elevated border border-accent-sapphire/60 shadow-sm"
                          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        />
                      )}
                      <span className="relative z-10">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 font-sans text-xs sm:text-sm text-text-whisper">
              {activeTab === 'signals' && (
                <div className="space-y-4">
                  {/* Pipeline Lifecycle Stages */}
                  <div className="border border-border-subtle bg-surface-card p-3.5 rounded-lg shadow-sm">
                    <h3 className="text-xs font-mono font-bold text-accent-sapphire uppercase mb-2.5 flex items-center gap-1.5">
                      <span>PIPELINE LIFECYCLE (STAGES 01-04)</span>
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                      <div className="border border-border-subtle/60 bg-base p-2.5 rounded">
                        <span className="block text-text-muted text-[10px] font-mono">STAGE 01</span>
                        <span className="font-bold text-white block mt-0.5">[BRANCH & CODE]</span>
                        <span className="text-text-muted text-[11px] block mt-0.5">Commit edits</span>
                      </div>
                      <div className="border border-border-subtle/60 bg-base p-2.5 rounded">
                        <span className="block text-text-muted text-[10px] font-mono">STAGE 02</span>
                        <span className="font-bold text-accent-sapphire block mt-0.5">[SUBMIT PR]</span>
                        <span className="text-text-muted text-[11px] block mt-0.5">Open PR upstream</span>
                      </div>
                      <div className="border border-border-subtle/60 bg-base p-2.5 rounded">
                        <span className="block text-text-muted text-[10px] font-mono">STAGE 03</span>
                        <span className="font-bold text-status-action-needed block mt-0.5">[TRIAGE & FIX]</span>
                        <span className="text-text-muted text-[11px] block mt-0.5">Review feedback</span>
                      </div>
                      <div className="border border-border-subtle/60 bg-base p-2.5 rounded">
                        <span className="block text-text-muted text-[10px] font-mono">STAGE 04</span>
                        <span className="font-bold text-status-merged block mt-0.5">[ACCEPTED]</span>
                        <span className="text-text-muted text-[11px] block mt-0.5">Merged into main</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Signal Definitions */}
                  <div className="space-y-2.5">
                    {/* Merged */}
                    <div className="flex items-start gap-3 border border-status-merged/40 bg-status-merged/10 p-3 rounded-lg">
                      <CheckCircle2 className="h-4 w-4 text-status-merged shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="border border-status-merged bg-status-merged/20 px-2 py-0.5 rounded text-[11px] font-mono font-bold text-status-merged">
                            [MERGED]
                          </span>
                          <span className="font-bold text-white text-xs sm:text-sm">ACCEPTED & SHIPPED</span>
                        </div>
                        <p className="text-xs text-text-whisper mt-1">
                          Code successfully merged into upstream main branch. Local branch can safely be retired.
                        </p>
                      </div>
                    </div>

                    {/* Changes Requested */}
                    <div className="flex items-start gap-3 border border-status-action-needed/40 bg-status-action-needed/10 p-3 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-status-action-needed shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="border border-status-action-needed bg-status-action-needed/20 px-2 py-0.5 rounded text-[11px] font-mono font-bold text-status-action-needed">
                            [CHANGES REQUESTED]
                          </span>
                          <span className="font-bold text-white text-xs sm:text-sm">DEVELOPER ACTION REQUIRED</span>
                        </div>
                        <p className="text-xs text-text-whisper mt-1">
                          Maintainer reviewed code and requested updates. Check activity ledger, push new commits, and comment.
                        </p>
                      </div>
                    </div>

                    {/* Reply Needed */}
                    <div className="flex items-start gap-3 border border-status-awaiting-reply/40 bg-status-awaiting-reply/10 p-3 rounded-lg">
                      <MessageSquare className="h-4 w-4 text-status-awaiting-reply shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="border border-status-awaiting-reply bg-status-awaiting-reply/20 px-2 py-0.5 rounded text-[11px] font-mono font-bold text-status-awaiting-reply">
                            [REPLY NEEDED]
                          </span>
                          <span className="font-bold text-white text-xs sm:text-sm">RESPONSE REQUIRED</span>
                        </div>
                        <p className="text-xs text-text-whisper mt-1">
                          Maintainer posted a question or clarification request. Open the thread and post your technical response.
                        </p>
                      </div>
                    </div>

                    {/* In Review */}
                    <div className="flex items-start gap-3 border border-border-subtle bg-surface-card p-3 rounded-lg">
                      <Clock className="h-4 w-4 text-accent-sapphire shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="border border-accent-sapphire bg-accent-sapphire/20 px-2 py-0.5 rounded text-[11px] font-mono font-bold text-text-whisper">
                            [IN REVIEW]
                          </span>
                          <span className="font-bold text-white text-xs sm:text-sm">IN QUEUE // IDLE</span>
                        </div>
                        <p className="text-xs text-text-whisper mt-1">
                          Submitted cleanly. You spoke last in the discussion. Awaiting maintainer triage.
                        </p>
                      </div>
                    </div>

                    {/* Draft & Closed */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="flex items-start gap-2.5 border border-border-subtle bg-surface-card p-3 rounded-lg">
                        <FileCode className="h-4 w-4 text-text-muted shrink-0 mt-0.5" />
                        <div>
                          <span className="border border-border-bold bg-surface-elevated px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-text-muted">
                            [DRAFT]
                          </span>
                          <p className="text-xs text-text-whisper mt-1">
                            Work-in-progress contribution not yet ready for maintainer review.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5 border border-border-subtle bg-surface-card p-3 rounded-lg">
                        <Archive className="h-4 w-4 text-text-muted shrink-0 mt-0.5" />
                        <div>
                          <span className="border border-border-subtle bg-base px-1.5 py-0.5 rounded text-[10px] font-mono text-text-muted">
                            [CLOSED]
                          </span>
                          <p className="text-xs text-text-whisper mt-1">
                            PR or issue closed without merging. Inspect activity ledger for details.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'keys' && (
                <div className="space-y-4">
                  {/* Desktop Keyboard Bindings */}
                  <div className="border border-border-subtle bg-surface-card p-4 rounded-lg">
                    <h3 className="text-xs font-mono font-bold text-accent-sapphire uppercase mb-3 flex items-center gap-2">
                      <Keyboard className="h-4 w-4" />
                      <span>DESKTOP KEYBOARD CONTROLS</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                      <div className="flex items-center justify-between border border-border-subtle/50 bg-base p-2.5 rounded">
                        <span className="text-text-muted">Navigate Down</span>
                        <kbd className="border border-border-bold bg-surface-elevated px-2 py-0.5 rounded text-white font-bold">j</kbd>
                      </div>
                      <div className="flex items-center justify-between border border-border-subtle/50 bg-base p-2.5 rounded">
                        <span className="text-text-muted">Navigate Up</span>
                        <kbd className="border border-border-bold bg-surface-elevated px-2 py-0.5 rounded text-white font-bold">k</kbd>
                      </div>
                      <div className="flex items-center justify-between border border-border-subtle/50 bg-base p-2.5 rounded">
                        <span className="text-text-muted">Inspect Selected Row</span>
                        <kbd className="border border-border-bold bg-surface-elevated px-2 py-0.5 rounded text-white font-bold">Enter</kbd>
                      </div>
                      <div className="flex items-center justify-between border border-border-subtle/50 bg-base p-2.5 rounded">
                        <span className="text-text-muted">Command Palette</span>
                        <kbd className="border border-border-bold bg-surface-elevated px-2 py-0.5 rounded text-white font-bold">Ctrl+K</kbd>
                      </div>
                      <div className="flex items-center justify-between border border-border-subtle/50 bg-base p-2.5 rounded">
                        <span className="text-text-muted">Close Modal / Drawer</span>
                        <kbd className="border border-border-bold bg-surface-elevated px-2 py-0.5 rounded text-white font-bold">Esc</kbd>
                      </div>
                      <div className="flex items-center justify-between border border-border-subtle/50 bg-base p-2.5 rounded">
                        <span className="text-text-muted">Operational Manual</span>
                        <kbd className="border border-border-bold bg-surface-elevated px-2 py-0.5 rounded text-white font-bold">?</kbd>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Gestures */}
                  <div className="border border-border-subtle bg-surface-card p-4 rounded-lg">
                    <h3 className="text-xs font-mono font-bold text-accent-sapphire uppercase mb-3 flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      <span>MOBILE GESTURES & DOCK</span>
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between border border-border-subtle/50 bg-base p-2.5 rounded">
                        <span className="text-text-whisper font-medium">Scroll to Top</span>
                        <span className="text-text-muted font-mono">Tap STREAM once</span>
                      </div>
                      <div className="flex items-center justify-between border border-border-subtle/50 bg-base p-2.5 rounded">
                        <span className="text-text-whisper font-medium">Instant Upstream Refresh</span>
                        <span className="text-text-muted font-mono">Double-tap STREAM</span>
                      </div>
                      <div className="flex items-center justify-between border border-border-subtle/50 bg-base p-2.5 rounded">
                        <span className="text-text-whisper font-medium">Dismiss Modals / Sheets</span>
                        <span className="text-text-muted font-mono">Swipe down or Back button</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'sync' && (
                <div className="space-y-3.5">
                  {/* Sync Engine */}
                  <div className="border border-border-subtle bg-surface-card p-3.5 rounded-lg space-y-1.5">
                    <div className="flex items-center gap-2 text-white font-bold text-xs sm:text-sm">
                      <RefreshCw className="h-4 w-4 text-accent-sapphire" />
                      <span>AUTOMATED UPSTREAM ENGINE</span>
                    </div>
                    <p className="text-xs text-text-whisper leading-relaxed">
                      The multi-tenant sync daemon polls official GitHub REST/GraphQL and GitLab v4 APIs every 30 minutes in the background. Tap the SYNC button in the top toolbar anytime for an immediate update.
                    </p>
                  </div>

                  {/* Linking Accounts */}
                  <div className="border border-border-subtle bg-surface-card p-3.5 rounded-lg space-y-1.5">
                    <div className="flex items-center gap-2 text-white font-bold text-xs sm:text-sm">
                      <Key className="h-4 w-4 text-status-awaiting-reply" />
                      <span>LINKING GITHUB & GITLAB TOKENS</span>
                    </div>
                    <p className="text-xs text-text-whisper leading-relaxed">
                      Connect Personal Access Tokens via the ACCOUNTS vault. Tokens are encrypted using AES-256-GCM in your local SQLite database. Linking tokens increases API rate limits from 60 to 5,000 requests per hour and unlocks private repositories.
                    </p>
                  </div>

                  {/* Manual Tracking */}
                  <div className="border border-border-subtle bg-surface-card p-3.5 rounded-lg space-y-1.5">
                    <div className="flex items-center gap-2 text-white font-bold text-xs sm:text-sm">
                      <PlusCircle className="h-4 w-4 text-status-merged" />
                      <span>TRACKING ANY CONTRIBUTION</span>
                    </div>
                    <p className="text-xs text-text-whisper leading-relaxed">
                      Tap + TRACK in the toolbar and paste any pull request, merge request, or issue URL to track it instantly, even if the repository belongs to an external organization.
                    </p>
                  </div>

                  {/* Sound & Notifications */}
                  <div className="border border-border-subtle bg-surface-card p-3.5 rounded-lg space-y-1.5">
                    <div className="flex items-center gap-2 text-white font-bold text-xs sm:text-sm">
                      <div className="flex items-center gap-1 text-accent-glacial">
                        <Bell className="h-4 w-4" />
                        <Volume2 className="h-4 w-4" />
                      </div>
                      <span>TELEMETRY ALERTS & SOUNDS</span>
                    </div>
                    <p className="text-xs text-text-whisper leading-relaxed">
                      Toggle the Bell and Speaker icons in the top bar to enable native OS desktop notifications and audio chimes whenever maintainers review or merge your code.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Fixed Docked Footer */}
            <div className="px-5 py-3 border-t border-border-subtle bg-base/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 shrink-0 select-none">
              <div className="flex items-center gap-2.5 text-[11px] font-mono text-text-muted">
                {onNavigateView && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateView('security');
                      }}
                      className="text-accent-sapphire hover:underline cursor-pointer font-bold"
                    >
                      SECURITY POLICY
                    </button>
                    <span className="text-border-bold">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateView('about');
                      }}
                      className="text-accent-glacial hover:underline cursor-pointer font-bold"
                    >
                      ABOUT AUTHOR
                    </button>
                    <span className="text-border-bold hidden sm:inline">|</span>
                  </>
                )}
                <span className="hidden sm:inline">
                  Press <kbd className="border border-border-bold bg-surface-card px-1.5 py-0.2 rounded text-text-whisper">Esc</kbd> to dismiss
                </span>
              </div>
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                onClick={onClose}
                className="w-full sm:w-auto border border-border-subtle bg-surface-elevated px-5 py-1.5 rounded-md text-xs font-mono font-bold text-white hover:border-accent-sapphire hover:bg-surface-active transition-colors cursor-pointer text-center"
              >
                [DISMISS]
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
