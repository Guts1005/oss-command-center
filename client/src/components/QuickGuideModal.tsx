import React from 'react';
import { X, HelpCircle, CheckCircle2, AlertTriangle, MessageSquare, Clock, Keyboard, Terminal } from 'lucide-react';

interface QuickGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickGuideModal: React.FC<QuickGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-2xl border border-border-subtle bg-surface p-6 rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Dismiss Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-md border border-border-subtle text-text-muted hover:border-accent-sapphire hover:text-white transition-all cursor-pointer"
          title="Dismiss (Esc)"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Console Header */}
        <div className="flex items-center gap-3.5 mb-6 border-b border-border-subtle/80 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-bold bg-base text-accent-sapphire">
            <Terminal className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-bold text-white tracking-tight uppercase font-sans">
              OPERATIONAL REFERENCE MANUAL // STATUS SPEC
            </h2>
            <p className="text-xs md:text-sm text-text-muted font-sans mt-0.5">
              Contribution lifecycle states, telemetry definitions, and console command bindings.
            </p>
          </div>
        </div>

        {/* Section 1: The Contribution Pipeline */}
        <div className="mb-6 border border-border-subtle bg-surface-card p-4 rounded-lg shadow-sm">
          <h3 className="text-xs font-mono font-bold text-text-whisper uppercase mb-3 flex items-center gap-2">
            <span>[STAGE 01-04] CONTRIBUTION LIFECYCLE PIPELINE</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center text-xs">
            <div className="border border-border-subtle/60 bg-base p-3 rounded">
              <span className="block text-text-muted text-xs mb-1 font-mono">STAGE 01</span>
              <span className="font-bold text-white block">[BRANCH_&_CODE]</span>
              <span className="text-text-muted block mt-1 text-xs">Commit edits</span>
            </div>
            <div className="border border-border-subtle/60 bg-base p-3 rounded">
              <span className="block text-text-muted text-xs mb-1 font-mono">STAGE 02</span>
              <span className="font-bold text-accent-sapphire block">[SUBMIT_PR]</span>
              <span className="text-text-muted block mt-1 text-xs">Open PR upstream</span>
            </div>
            <div className="border border-border-subtle/60 bg-base p-3 rounded">
              <span className="block text-text-muted text-xs mb-1 font-mono">STAGE 03</span>
              <span className="font-bold text-status-action-needed block">[TRIAGE_&_FIX]</span>
              <span className="text-text-muted block mt-1 text-xs">Review feedback</span>
            </div>
            <div className="border border-border-subtle/60 bg-base p-3 rounded">
              <span className="block text-text-muted text-xs mb-1 font-mono">STAGE 04</span>
              <span className="font-bold text-status-merged block">[ACCEPTED]</span>
              <span className="text-text-muted block mt-1 text-xs">Merged into main</span>
            </div>
          </div>
        </div>

        {/* Section 2: Status Signal Specifications */}
        <div className="mb-6 space-y-3">
          <h3 className="text-xs font-mono font-bold text-text-whisper uppercase mb-2">
            [TELEMETRY_SIGNALS] STATUS CODES & ACTIONS
          </h3>

          <div className="flex items-start gap-3.5 border border-status-merged/40 bg-status-merged/10 p-3.5 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-status-merged shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="border border-status-merged bg-status-merged/20 px-2 py-0.5 rounded text-xs font-mono font-bold text-status-merged">
                  [MERGED]
                </span>
                <span className="font-bold text-white text-sm">ACCEPTED & SHIPPED</span>
              </div>
              <p className="text-xs md:text-sm text-text-whisper mt-1 font-sans">
                Code accepted into upstream main branch. No further developer action required.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 border border-status-action-needed/40 bg-status-action-needed/10 p-3.5 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-status-action-needed shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="border border-status-action-needed bg-status-action-needed/20 px-2 py-0.5 rounded text-xs font-mono font-bold text-status-action-needed">
                  [CHANGES_REQ]
                </span>
                <span className="font-bold text-white text-sm">DEVELOPER ACTION REQUIRED</span>
              </div>
              <p className="text-xs md:text-sm text-text-whisper mt-1 font-sans">
                Maintainer reviewed code and requested updates. Review activity log, push branch updates, and reply.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 border border-status-awaiting-reply/40 bg-status-awaiting-reply/10 p-3.5 rounded-lg">
            <MessageSquare className="h-5 w-5 text-status-awaiting-reply shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="border border-status-awaiting-reply bg-status-awaiting-reply/20 px-2 py-0.5 rounded text-xs font-mono font-bold text-status-awaiting-reply">
                  [OWE_REPLY]
                </span>
                <span className="font-bold text-white text-sm">RESPONSE REQUIRED</span>
              </div>
              <p className="text-xs md:text-sm text-text-whisper mt-1 font-sans">
                Maintainer posted a question or comment. Inspect thread and post technical clarification.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 border border-border-subtle bg-surface-card p-3.5 rounded-lg">
            <Clock className="h-5 w-5 text-accent-sapphire shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="border border-accent-sapphire bg-accent-sapphire/20 px-2 py-0.5 rounded text-xs font-mono font-bold text-text-whisper">
                  [IN_REVIEW]
                </span>
                <span className="font-bold text-white text-sm">IN QUEUE // IDLE</span>
              </div>
              <p className="text-xs md:text-sm text-text-whisper mt-1 font-sans">
                Submitted cleanly. You spoke last. Awaiting maintainer review queue processing.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Keyboard Shortcuts Console */}
        <div className="border border-border-subtle bg-surface-card p-4 rounded-lg mb-6">
          <h3 className="text-xs font-mono font-bold text-text-whisper uppercase mb-3 flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-accent-sapphire" />
            <span>CONSOLE KEY BINDINGS</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs md:text-sm font-mono">
            <div className="flex items-center gap-2">
              <kbd className="border border-border-bold bg-base px-2 py-0.5 rounded text-white font-bold">j</kbd>
              <span className="text-text-muted">NEXT ROW</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="border border-border-bold bg-base px-2 py-0.5 rounded text-white font-bold">k</kbd>
              <span className="text-text-muted">PREV ROW</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="border border-border-bold bg-base px-2 py-0.5 rounded text-white font-bold">Enter</kbd>
              <span className="text-text-muted">INSPECT</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="border border-border-bold bg-base px-2 py-0.5 rounded text-white font-bold">Ctrl+K</kbd>
              <span className="text-text-muted">COMMANDS</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-border-subtle/80 pt-4">
          <button
            onClick={onClose}
            className="border border-border-subtle bg-surface-elevated px-5 py-2.5 rounded-md text-sm font-mono font-bold text-white hover:border-accent-sapphire hover:bg-surface-active transition-all cursor-pointer"
          >
            [DISMISS_MANUAL]
          </button>
        </div>
      </div>
    </div>
  );
};
