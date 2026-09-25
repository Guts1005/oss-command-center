import React from 'react';
import { Contribution } from '../types';
import { GitPullRequest, CircleDot, AlertTriangle, MessageSquare, Clock } from 'lucide-react';

interface ContributionRowProps {
  item: Contribution;
  isSelected: boolean;
  onClick: () => void;
}

export const ContributionRow: React.FC<ContributionRowProps> = ({ item, isSelected, onClick }) => {
  const normalizedStatus = (item.status === 'opened' ? 'open' : item.status).toLowerCase();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'merged':
        return (
          <span className="border border-status-merged/60 bg-status-merged/10 text-status-merged px-1.5 py-0.5 font-telemetry text-[11px] font-bold tracking-tight">
            [MERGED]
          </span>
        );
      case 'open':
      case 'opened':
        return (
          <span className="border border-status-in-review/60 bg-status-in-review/10 text-status-in-review px-1.5 py-0.5 font-telemetry text-[11px] font-bold tracking-tight">
            [IN_REVIEW]
          </span>
        );
      case 'draft':
        return (
          <span className="border border-status-draft/60 bg-status-draft/10 text-status-draft px-1.5 py-0.5 font-telemetry text-[11px] font-bold tracking-tight">
            [DRAFT]
          </span>
        );
      case 'closed':
        return (
          <span className="border border-border-bold bg-surface text-text-muted px-1.5 py-0.5 font-telemetry text-[11px] tracking-tight">
            [CLOSED]
          </span>
        );
      default:
        return (
          <span className="border border-border-bold bg-surface text-text-muted px-1.5 py-0.5 font-telemetry text-[11px] uppercase tracking-tight">
            [{status}]
          </span>
        );
    }
  };

  const formatRelativeTime = (isoString: string) => {
    const date = new Date(isoString);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    const mins = Math.floor(diff / 60);
    if (diff < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (diff < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Staleness calculation
  const daysSinceActivity = Math.floor(
    (Date.now() - new Date(item.last_activity_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  const isOpen = normalizedStatus === 'open' || normalizedStatus === 'draft';
  const isDormant = isOpen && daysSinceActivity >= 90;
  const isStale = isOpen && daysSinceActivity >= 30 && !isDormant;

  return (
    <div
      onClick={onClick}
      className={`group border-b border-border-subtle cursor-pointer transition-colors select-none ${
        isSelected
          ? 'bg-surface-active border-l-2 border-l-status-in-review'
          : 'bg-base hover:bg-surface border-l-2 border-l-transparent'
      }`}
    >
      {/* ========================================================================= */}
      {/* DESKTOP VIEW (>= 768px): Industrial Spec-Sheet Row                        */}
      {/* ========================================================================= */}
      <div className="hidden md:flex items-center justify-between px-5 py-2.5">
        {/* Left: New Flag + Platform [GH/GL] + Type + Repo/ID + Title */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-4">
          {/* Unread / New Indicator */}
          <div className="w-8 shrink-0">
            {item.unread === 1 ? (
              <span
                className="border border-status-awaiting-reply/80 bg-status-awaiting-reply/15 text-status-awaiting-reply font-telemetry text-[9px] font-bold px-1 py-0.5 tracking-wider inline-block text-center"
                title="Telemetry update pending inspection"
              >
                [NEW]
              </span>
            ) : (
              <span className="w-8 inline-block text-center text-text-dim text-[10px] font-telemetry">·</span>
            )}
          </div>

          {/* Platform Tag [GH] / [GL] */}
          <span
            className={`px-1 py-0.5 font-telemetry text-[10px] font-bold uppercase border shrink-0 ${
              item.platform === 'github'
                ? 'border-border-bold text-text-primary bg-surface-elevated'
                : 'border-[#fc6d26]/50 text-[#fc6d26] bg-[#fc6d26]/10'
            }`}
          >
            {item.platform === 'github' ? '[GH]' : '[GL]'}
          </span>

          {/* Type Icon */}
          {item.type === 'pr' ? (
            <span title="Pull Request / Merge Request" className="inline-flex shrink-0">
              <GitPullRequest className="h-3.5 w-3.5 text-text-secondary shrink-0" />
            </span>
          ) : (
            <span title="Issue" className="inline-flex shrink-0">
              <CircleDot className="h-3.5 w-3.5 text-text-secondary shrink-0" />
            </span>
          )}

          {/* Repo & Identifier */}
          <span className="font-telemetry text-xs font-bold text-text-primary whitespace-nowrap shrink-0">
            {item.repo}#{item.number}
          </span>

          {/* Title */}
          <span
            className={`font-body text-xs truncate ${
              isDormant ? 'text-text-muted' : 'text-text-secondary group-hover:text-text-primary'
            }`}
          >
            {item.title}
          </span>

          {/* Optional Bounty Badge */}
          {item.bounty_amount && (
            <span className="border border-status-bounty/60 bg-status-bounty/10 px-1.5 py-0.2 font-telemetry text-[10px] font-bold text-status-bounty shrink-0">
              [{item.bounty_amount}]
            </span>
          )}

          {/* Staleness Indicators */}
          {isDormant && (
            <span
              className="border border-amber-500/60 bg-amber-500/10 px-1.5 py-0.2 font-telemetry text-[10px] font-bold text-amber-400 shrink-0 flex items-center gap-1"
              title={`Zero maintainer telemetry for ${daysSinceActivity} days.`}
            >
              <Clock className="h-2.5 w-2.5" />
              <span>[DORMANT: {daysSinceActivity}d]</span>
            </span>
          )}
          {isStale && (
            <span
              className="border border-amber-600/40 bg-amber-600/10 px-1.5 py-0.2 font-telemetry text-[10px] text-amber-400 shrink-0 flex items-center gap-1"
              title={`Zero maintainer activity for ${daysSinceActivity} days.`}
            >
              <Clock className="h-2.5 w-2.5" />
              <span>[STALE: {daysSinceActivity}d]</span>
            </span>
          )}
        </div>

        {/* Right: Action Trigger + Status Code + Tabular Timestamp */}
        <div className="flex items-center gap-2.5 shrink-0 font-telemetry text-xs">
          {/* Action Needed Indicator */}
          {item.action_needed === 'reply' && (
            <span
              className="flex items-center gap-1 border border-status-awaiting-reply/80 bg-status-awaiting-reply/15 px-2 py-0.5 text-[10px] font-bold text-status-awaiting-reply"
              title="Maintainer feedback requires developer reply"
            >
              <MessageSquare className="h-2.5 w-2.5" />
              <span>[ACTION: OWE_REPLY]</span>
            </span>
          )}
          {item.action_needed === 'push-changes' && (
            <span
              className="flex items-center gap-1 border border-status-action-needed/80 bg-status-action-needed/15 px-2 py-0.5 text-[10px] font-bold text-status-action-needed"
              title="Maintainer requested code changes"
            >
              <AlertTriangle className="h-2.5 w-2.5" />
              <span>[ACTION: REQ_CHANGES]</span>
            </span>
          )}

          {/* Normalized Status Badge */}
          {getStatusBadge(normalizedStatus)}

          {/* Tabular Relative Time */}
          <span className="text-text-muted w-16 text-right text-[11px] font-telemetry tracking-tight">
            {formatRelativeTime(item.last_activity_at)}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE VIEW (< 768px): Compact Spec-Sheet Block                           */}
      {/* ========================================================================= */}
      <div className="flex md:hidden flex-col gap-1.5 p-3">
        {/* Top: Platform + Repo#ID + Relative Time */}
        <div className="flex items-center justify-between font-telemetry text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            {item.unread === 1 && (
              <span className="border border-status-awaiting-reply bg-status-awaiting-reply/15 text-status-awaiting-reply text-[9px] font-bold px-1 py-0.2">
                [NEW]
              </span>
            )}
            <span
              className={`px-1 py-0.2 text-[9px] font-bold uppercase border ${
                item.platform === 'github'
                  ? 'border-border-bold text-text-primary bg-surface-elevated'
                  : 'border-[#fc6d26]/50 text-[#fc6d26] bg-[#fc6d26]/10'
              }`}
            >
              {item.platform === 'github' ? '[GH]' : '[GL]'}
            </span>
            <span className="font-bold text-text-primary truncate">
              {item.repo}#{item.number}
            </span>
            {item.bounty_amount && (
              <span className="border border-status-bounty/60 bg-status-bounty/10 px-1 py-0.2 text-[9px] font-bold text-status-bounty">
                [{item.bounty_amount}]
              </span>
            )}
          </div>
          <span className="text-text-muted text-[10px] shrink-0 font-telemetry">
            {formatRelativeTime(item.last_activity_at)}
          </span>
        </div>

        {/* Title */}
        <div className="font-body text-xs font-normal text-text-secondary leading-snug">
          {item.title}
        </div>

        {/* Bottom: Action Trigger + Status */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5 font-telemetry text-xs">
          {item.action_needed === 'reply' && (
            <span className="flex items-center gap-1 border border-status-awaiting-reply/80 bg-status-awaiting-reply/15 px-1.5 py-0.2 text-[9px] font-bold text-status-awaiting-reply">
              <MessageSquare className="h-2.5 w-2.5" />
              [ACTION: OWE_REPLY]
            </span>
          )}
          {item.action_needed === 'push-changes' && (
            <span className="flex items-center gap-1 border border-status-action-needed/80 bg-status-action-needed/15 px-1.5 py-0.2 text-[9px] font-bold text-status-action-needed">
              <AlertTriangle className="h-2.5 w-2.5" />
              [ACTION: REQ_CHANGES]
            </span>
          )}

          {getStatusBadge(normalizedStatus)}

          {isDormant && (
            <span className="border border-amber-500/60 bg-amber-500/10 px-1.5 py-0.2 text-[9px] font-bold text-amber-400 flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              [DORMANT: {daysSinceActivity}d]
            </span>
          )}
          {isStale && (
            <span className="border border-amber-600/40 bg-amber-600/10 px-1.5 py-0.2 text-[9px] text-amber-400">
              [STALE: {daysSinceActivity}d]
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
