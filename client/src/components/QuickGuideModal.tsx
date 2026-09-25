import React from 'react';
import { X, HelpCircle, CheckCircle2, AlertTriangle, MessageSquare, Clock, Keyboard, Terminal } from 'lucide-react';

interface QuickGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickGuideModal: React.FC<QuickGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none font-telemetry">
      <div className="relative w-full max-w-2xl border border-border-bold bg-surface p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Dismiss Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex h-6 w-6 items-center justify-center border border-border-bold text-text-muted hover:border-border-active hover:text-white transition-colors"
          title="Dismiss (Esc)"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Console Header */}
        <div className="flex items-center gap-3 mb-5 border-b border-border-bold pb-3">
          <div className="flex h-8 w-8 items-center justify-center border border-border-bold bg-base text-status-in-review">
            <Terminal className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-primary tracking-tight uppercase">
              OPERATIONAL REFERENCE MANUAL // STATUS SPEC
            </h2>
            <p className="text-[11px] text-text-muted font-body">
              Contribution lifecycle states, telemetry definitions, and console command bindings.
            </p>
          </div>
        </div>

        {/* Section 1: The Contribution Pipeline */}
        <div className="mb-5 border border-border-bold bg-base p-3.5">
          <h3 className="text-xs font-bold text-text-secondary uppercase mb-2.5 flex items-center gap-2">
            <span>[STAGE 01-04] CONTRIBUTION LIFECYCLE PIPELINE</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center text-[10px]">
            <div className="border border-border-subtle bg-surface p-2">
              <span className="block text-text-muted mb-0.5">STAGE 01</span>
              <span className="font-bold text-text-primary block">[BRANCH_&_CODE]</span>
              <span className="text-text-muted block mt-0.5">Commit edits</span>
            </div>
            <div className="border border-border-subtle bg-surface p-2">
              <span className="block text-text-muted mb-0.5">STAGE 02</span>
              <span className="font-bold text-status-in-review block">[SUBMIT_PR]</span>
              <span className="text-text-muted block mt-0.5">Open PR upstream</span>
            </div>
            <div className="border border-border-subtle bg-surface p-2">
              <span className="block text-text-muted mb-0.5">STAGE 03</span>
              <span className="font-bold text-status-action-needed block">[TRIAGE_&_FIX]</span>
              <span className="text-text-muted block mt-0.5">Review feedback</span>
            </div>
            <div className="border border-border-subtle bg-surface p-2">
              <span className="block text-text-muted mb-0.5">STAGE 04</span>
              <span className="font-bold text-status-merged block">[ACCEPTED]</span>
              <span className="text-text-muted block mt-0.5">Merged into main</span>
            </div>
          </div>
        </div>

        {/* Section 2: Status Signal Specifications */}
        <div className="mb-5 space-y-2">
          <h3 className="text-xs font-bold text-text-secondary uppercase mb-1.5">
            [TELEMETRY_SIGNALS] STATUS CODES & ACTIONS
          </h3>

          <div className="flex items-start gap-3 border border-status-merged/40 bg-status-merged/5 p-2.5">
            <CheckCircle2 className="h-4 w-4 text-status-merged shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="border border-status-merged bg-status-merged/20 px-1.5 py-0.2 text-[10px] font-bold text-status-merged">
                  [MERGED]
                </span>
                <span className="font-bold text-text-primary text-xs">ACCEPTED & SHIPPED</span>
              </div>
              <p className="text-[11px] text-text-secondary mt-0.5 font-body">
                Code accepted into upstream main branch. No further developer action required.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 border border-status-action-needed/40 bg-status-action-needed/5 p-2.5">
            <AlertTriangle className="h-4 w-4 text-status-action-needed shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="border border-status-action-needed bg-status-action-needed/20 px-1.5 py-0.2 text-[10px] font-bold text-status-action-needed">
                  [CHANGES_REQ]
                </span>
                <span className="font-bold text-text-primary text-xs">DEVELOPER ACTION REQUIRED</span>
              </div>
              <p className="text-[11px] text-text-secondary mt-0.5 font-body">
                Maintainer reviewed code and requested updates. Review activity log, push branch updates, and reply.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 border border-status-awaiting-reply/40 bg-status-awaiting-reply/5 p-2.5">
            <MessageSquare className="h-4 w-4 text-status-awaiting-reply shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="border border-status-awaiting-reply bg-status-awaiting-reply/20 px-1.5 py-0.2 text-[10px] font-bold text-status-awaiting-reply">
                  [OWE_REPLY]
                </span>
                <span className="font-bold text-text-primary text-xs">RESPONSE REQUIRED</span>
              </div>
              <p className="text-[11px] text-text-secondary mt-0.5 font-body">
                Maintainer posted a question or comment. Inspect thread and post technical clarification.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 border border-border-bold bg-base p-2.5">
            <Clock className="h-4 w-4 text-status-in-review shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="border border-status-in-review bg-status-in-review/10 px-1.5 py-0.2 text-[10px] font-bold text-status-in-review">
                  [IN_REVIEW]
                </span>
                <span className="font-bold text-text-primary text-xs">IN QUEUE // IDLE</span>
              </div>
              <p className="text-[11px] text-text-secondary mt-0.5 font-body">
                Submitted cleanly. You spoke last. Awaiting maintainer review queue processing.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 border border-amber-500/30 bg-amber-500/5 p-2.5">
            <Clock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="border border-amber-500 bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-bold text-amber-400">
                  [STALE_30D]
                </span>
                <span className="font-bold text-text-primary text-xs">DORMANT THREAD</span>
              </div>
              <p className="text-[11px] text-text-secondary mt-0.5 font-body">
                Zero maintainer activity for over 30 days. Recommend posting a polite re-ping or rebase update.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Keyboard Shortcuts Console */}
        <div className="border border-border-bold bg-base p-3.5 mb-5">
          <h3 className="text-xs font-bold text-text-secondary uppercase mb-2 flex items-center gap-2">
            <Keyboard className="h-3.5 w-3.5 text-text-muted" />
            <span>CONSOLE KEY BINDINGS</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <kbd className="border border-border-bold bg-surface px-1.5 py-0.2 text-text-primary">j</kbd>
              <span className="text-text-muted">NEXT ROW</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="border border-border-bold bg-surface px-1.5 py-0.2 text-text-primary">k</kbd>
              <span className="text-text-muted">PREV ROW</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="border border-border-bold bg-surface px-1.5 py-0.2 text-text-primary">Enter</kbd>
              <span className="text-text-muted">INSPECT</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="border border-border-bold bg-surface px-1.5 py-0.2 text-text-primary">Ctrl+K</kbd>
              <span className="text-text-muted">COMMANDS</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-border-bold pt-3">
          <button
            onClick={onClose}
            className="border border-border-bold bg-surface-elevated px-4 py-1.5 text-xs font-bold text-text-primary hover:border-border-active hover:bg-surface-active transition-colors"
          >
            [DISMISS_MANUAL]
          </button>
        </div>
      </div>
    </div>
  );
};
