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
          <span className="border border-status-merged/40 bg-status-merged/10 text-status-merged px-2 py-0.5 font-telemetry text-[11px] font-bold">
            MERGED
          </span>
        );
      case 'open':
      case 'opened':
        return (
          <span className="border border-status-open/40 bg-status-open/10 text-status-open px-2 py-0.5 font-telemetry text-[11px] font-bold">
            IN REVIEW
          </span>
        );
      case 'draft':
        return (
          <span className="border border-status-draft/40 bg-status-draft/10 text-status-draft px-2 py-0.5 font-telemetry text-[11px] font-bold">
            DRAFT
          </span>
        );
      case 'closed':
        return (
          <span className="border border-border-bold bg-surface-elevated text-text-muted px-2 py-0.5 font-telemetry text-[11px]">
            CLOSED
          </span>
        );
      default:
        return (
          <span className="border border-border-bold bg-surface-elevated text-text-muted px-2 py-0.5 font-telemetry text-[11px] uppercase">
            {status}
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
    if (hours < 24) return `${hours}h ago`;
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
      className={`group border-b border-border-subtle cursor-pointer transition-colors ${
        isSelected ? 'bg-surface-active border-l-4 border-l-status-awaiting-reply' : 'bg-base hover:bg-surface'
      }`}
    >
      {/* ========================================================================= */}
      {/* DESKTOP VIEW (>= 768px): Clear, Balanced, Human-Friendly Row              */}
      {/* ========================================================================= */}
      <div className="hidden md:flex items-center justify-between px-6 py-3">
        {/* Left: New Badge + Platform + Type + Identity + Title */}
        <div className="flex items-center gap-3 min-w-0 flex-1 pr-4">
          {/* Unread Indicator */}
          <div className="w-9 shrink-0">
            {item.unread === 1 ? (
              <span
                className="border border-status-awaiting-reply/60 bg-status-awaiting-reply/15 text-status-awaiting-reply font-telemetry text-[9px] font-bold px-1.5 py-0.5 tracking-wider inline-block"
                title="New updates since you last checked"
              >
                NEW
              </span>
            ) : (
              <span className="w-9 inline-block" />
            )}
          </div>

          {/* Platform Tag */}
          <span
            className={`px-1.5 py-0.5 font-telemetry text-[10px] font-bold uppercase border shrink-0 ${
              item.platform === 'github'
                ? 'border-border-bold text-text-primary bg-surface-elevated'
                : 'border-[#fc6d26]/40 text-[#fc6d26] bg-[#fc6d26]/10'
            }`}
          >
            {item.platform === 'github' ? 'GitHub' : 'GitLab'}
          </span>

          {/* Type Icon */}
          {item.type === 'pr' ? (
            <span title="Pull Request / Merge Request" className="inline-flex shrink-0">
              <GitPullRequest className="h-3.5 w-3.5 text-text-muted shrink-0" />
            </span>
          ) : (
            <span title="Issue" className="inline-flex shrink-0">
              <CircleDot className="h-3.5 w-3.5 text-text-muted shrink-0" />
            </span>
          )}

          {/* Repo & Number */}
          <span className="font-telemetry text-xs font-bold text-text-secondary whitespace-nowrap shrink-0">
            {item.repo}#{item.number}
          </span>

          {/* Title with dormant dimming */}
          <span
            className={`font-body text-sm truncate font-medium group-hover:text-white ${
              isDormant ? 'text-text-muted' : 'text-text-primary'
            }`}
          >
            {item.title}
          </span>

          {/* Optional Bounty Badge */}
          {item.bounty_amount && (
            <span className="border border-status-bounty/50 bg-status-bounty/10 px-1.5 py-0.5 font-telemetry text-[10px] font-bold text-status-bounty shrink-0">
              {item.bounty_amount}
            </span>
          )}

          {/* Staleness Badges with explanatory tooltips */}
          {isDormant && (
            <span
              className="border border-amber-500/60 bg-amber-500/10 px-1.5 py-0.5 font-telemetry text-[10px] font-bold text-amber-500 shrink-0 flex items-center gap-1"
              title={`No maintainer activity for ${daysSinceActivity} days. Consider leaving a follow-up comment.`}
            >
              <Clock className="h-3 w-3" />
              <span>Dormant ({daysSinceActivity}d)</span>
            </span>
          )}
          {isStale && (
            <span
              className="border border-amber-600/40 bg-amber-600/10 px-1.5 py-0.5 font-telemetry text-[10px] text-amber-400 shrink-0 flex items-center gap-1"
              title={`No activity for ${daysSinceActivity} days.`}
            >
              <Clock className="h-3 w-3" />
              <span>Stale ({daysSinceActivity}d)</span>
            </span>
          )}
        </div>

        {/* Right: Action Needed Flag + Status Badge + Relative Time */}
        <div className="flex items-center gap-3 shrink-0 font-telemetry text-xs">
          {/* Action Needed Indicator */}
          {item.action_needed === 'reply' && (
            <span
              className="flex items-center gap-1 border border-status-action-needed/40 bg-status-action-needed/10 px-2 py-0.5 text-[11px] font-bold text-status-action-needed"
              title="A maintainer commented or asked a question. You owe a reply."
            >
              <MessageSquare className="h-3 w-3" />
              <span>Needs Reply</span>
            </span>
          )}
          {item.action_needed === 'push-changes' && (
            <span
              className="flex items-center gap-1 border border-status-action-needed/40 bg-status-action-needed/10 px-2 py-0.5 text-[11px] font-bold text-status-action-needed"
              title="A maintainer requested code changes. Please review and update your PR."
            >
              <AlertTriangle className="h-3 w-3" />
              <span>Changes Requested</span>
            </span>
          )}

          {/* Normalized Status Badge */}
          {getStatusBadge(normalizedStatus)}

          {/* Relative Time */}
          <span className="text-text-muted w-16 text-right text-xs">
            {formatRelativeTime(item.last_activity_at)}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE VIEW (< 768px): Stacked Card Layout                                */}
      {/* ========================================================================= */}
      <div className="flex md:hidden flex-col gap-2 p-4">
        {/* Top Row: Platform + Repo#ID + Relative Time */}
        <div className="flex items-center justify-between font-telemetry text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            {item.unread === 1 && (
              <span className="border border-status-awaiting-reply bg-status-awaiting-reply/15 text-status-awaiting-reply text-[9px] font-bold px-1 py-0.5">
                NEW
              </span>
            )}
            <span
              className={`px-1.5 py-0.2 text-[9px] font-bold uppercase border ${
                item.platform === 'github'
                  ? 'border-border-bold text-text-primary bg-surface-elevated'
                  : 'border-[#fc6d26]/40 text-[#fc6d26] bg-[#fc6d26]/10'
              }`}
            >
              {item.platform === 'github' ? 'GitHub' : 'GitLab'}
            </span>
            <span className="font-bold text-text-secondary truncate">
              {item.repo}#{item.number}
            </span>
            {item.bounty_amount && (
              <span className="border border-status-bounty/50 bg-status-bounty/10 px-1 py-0.2 text-[9px] font-bold text-status-bounty">
                {item.bounty_amount}
              </span>
            )}
          </div>
          <span className="text-text-muted text-[11px] shrink-0">
            {formatRelativeTime(item.last_activity_at)}
          </span>
        </div>

        {/* Title */}
        <div className="font-body text-sm font-medium text-text-primary leading-snug">
          {item.title}
        </div>

        {/* Bottom Row: Actions + Status Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-1 font-telemetry text-xs">
          {item.action_needed === 'reply' && (
            <span className="flex items-center gap-1 border border-status-action-needed/40 bg-status-action-needed/10 px-2 py-0.5 text-[10px] font-bold text-status-action-needed">
              <MessageSquare className="h-2.5 w-2.5" />
              Needs Reply
            </span>
          )}
          {item.action_needed === 'push-changes' && (
            <span className="flex items-center gap-1 border border-status-action-needed/40 bg-status-action-needed/10 px-2 py-0.5 text-[10px] font-bold text-status-action-needed">
              <AlertTriangle className="h-2.5 w-2.5" />
              Changes Requested
            </span>
          )}

          {getStatusBadge(normalizedStatus)}

          {isDormant && (
            <span className="border border-amber-500/60 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-500 flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              Dormant ({daysSinceActivity}d)
            </span>
          )}
          {isStale && (
            <span className="border border-amber-600/40 bg-amber-600/10 px-1.5 py-0.5 text-[10px] text-amber-400">
              Stale ({daysSinceActivity}d)
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
