import React from 'react';
import { X, HelpCircle, CheckCircle2, AlertTriangle, MessageSquare, Clock, ArrowRight, Keyboard, Sparkles } from 'lucide-react';

interface QuickGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickGuideModal: React.FC<QuickGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl border border-border-bold bg-surface p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex h-7 w-7 items-center justify-center border border-border-subtle text-text-muted hover:border-border-bold hover:text-white transition-colors"
          title="Close (Esc)"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center border border-border-bold bg-surface-elevated text-status-awaiting-reply">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-text-primary tracking-tight">
              Open Source Quick Guide & Status Legend
            </h2>
            <p className="text-xs text-text-muted font-body">
              Everything you need to understand your contribution states and take action.
            </p>
          </div>
        </div>

        {/* Section 1: The Contribution Lifecycle */}
        <div className="mb-6 border border-border-bold bg-base p-4">
          <h3 className="font-telemetry text-xs font-bold text-text-secondary uppercase mb-3 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-status-awaiting-reply" />
            The Open Source Contribution Lifecycle
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center font-telemetry text-[11px]">
            <div className="border border-border-subtle bg-surface p-2">
              <span className="block text-text-muted mb-1">STEP 1</span>
              <span className="font-bold text-text-primary block">Pick & Code</span>
              <span className="text-[10px] text-text-secondary block mt-1">Find issue & push branch</span>
            </div>
            <div className="border border-border-subtle bg-surface p-2">
              <span className="block text-text-muted mb-1">STEP 2</span>
              <span className="font-bold text-status-awaiting-reply block">Submit PR</span>
              <span className="text-[10px] text-text-secondary block mt-1">Open PR / MR upstream</span>
            </div>
            <div className="border border-border-subtle bg-surface p-2">
              <span className="block text-text-muted mb-1">STEP 3</span>
              <span className="font-bold text-status-action-needed block">Review & Triage</span>
              <span className="text-[10px] text-text-secondary block mt-1">Maintainer reviews code</span>
            </div>
            <div className="border border-border-subtle bg-surface p-2">
              <span className="block text-text-muted mb-1">STEP 4</span>
              <span className="font-bold text-status-merged block">Merged!</span>
              <span className="text-[10px] text-text-secondary block mt-1">Accepted into project</span>
            </div>
          </div>
        </div>

        {/* Section 2: What Each Badge Means */}
        <div className="mb-6 space-y-2.5">
          <h3 className="font-telemetry text-xs font-bold text-text-secondary uppercase mb-2">
            Status Legend & Action Meaning
          </h3>

          <div className="flex items-start gap-3 border border-status-merged/40 bg-status-merged/5 p-3">
            <CheckCircle2 className="h-4 w-4 text-status-merged shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="border border-status-merged bg-status-merged/20 px-1.5 py-0.2 font-telemetry text-[10px] font-bold text-status-merged">
                  MERGED
                </span>
                <span className="font-body text-xs font-bold text-text-primary">Done & Shipped</span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5 font-body">
                Your contribution was accepted and merged into the main codebase. No further action needed.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 border border-status-action-needed/40 bg-status-action-needed/5 p-3">
            <AlertTriangle className="h-4 w-4 text-status-action-needed shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="border border-status-action-needed bg-status-action-needed/20 px-1.5 py-0.2 font-telemetry text-[10px] font-bold text-status-action-needed">
                  CHANGES REQ
                </span>
                <span className="font-body text-xs font-bold text-text-primary">Action Needed from You</span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5 font-body">
                The maintainer reviewed your PR and requested adjustments. Read their comments, update your code, push to your branch, and comment back.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 border border-status-action-needed/40 bg-status-action-needed/5 p-3">
            <MessageSquare className="h-4 w-4 text-status-action-needed shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="border border-status-action-needed bg-status-action-needed/20 px-1.5 py-0.2 font-telemetry text-[10px] font-bold text-status-action-needed">
                  OWE REPLY
                </span>
                <span className="font-body text-xs font-bold text-text-primary">Response Owed</span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5 font-body">
                The maintainer commented or asked a question. Click "Open Upstream" to leave a polite response.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 border border-border-subtle bg-base p-3">
            <Clock className="h-4 w-4 text-status-awaiting-reply shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="border border-status-open bg-status-open/10 px-1.5 py-0.2 font-telemetry text-[10px] font-bold text-status-open">
                  OPEN
                </span>
                <span className="font-body text-xs font-bold text-text-primary">Waiting on Maintainer</span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5 font-body">
                Your PR is submitted and you spoke last. You are in line for the maintainer's review queue.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 border border-amber-500/30 bg-amber-500/5 p-3">
            <Clock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="border border-amber-500 bg-amber-500/20 px-1.5 py-0.2 font-telemetry text-[10px] font-bold text-amber-400">
                  STALE &gt;30d
                </span>
                <span className="font-body text-xs font-bold text-text-primary">Follow-up Opportunity</span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5 font-body">
                No activity has occurred for over 30 days. Consider leaving a friendly check-in comment to bump maintainer visibility.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Keyboard Shortcuts */}
        <div className="border border-border-bold bg-base p-4 mb-6">
          <h3 className="font-telemetry text-xs font-bold text-text-secondary uppercase mb-2 flex items-center gap-2">
            <Keyboard className="h-3.5 w-3.5 text-text-muted" />
            Quick Keyboard Shortcuts
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-telemetry text-xs">
            <div className="flex items-center gap-1.5">
              <kbd className="border border-border-bold bg-surface px-1.5 py-0.5 text-text-primary">j</kbd>
              <span className="text-text-muted">Next Item</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="border border-border-bold bg-surface px-1.5 py-0.5 text-text-primary">k</kbd>
              <span className="text-text-muted">Prev Item</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="border border-border-bold bg-surface px-1.5 py-0.5 text-text-primary">Enter</kbd>
              <span className="text-text-muted">Open Drawer</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="border border-border-bold bg-surface px-1.5 py-0.5 text-text-primary">Ctrl+K</kbd>
              <span className="text-text-muted">Search All</span>
            </div>
          </div>
        </div>

        {/* Footer Action */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="border border-border-bold bg-surface-elevated px-5 py-2 font-telemetry text-xs font-bold text-text-primary hover:border-border-active hover:bg-surface-active transition-colors"
          >
            Got It, Let's Go!
          </button>
        </div>
      </div>
    </div>
  );
};
