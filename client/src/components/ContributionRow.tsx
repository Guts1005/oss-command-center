import React from 'react';
import { Contribution } from '../types';
import { GitPullRequest, CircleDot, AlertTriangle, MessageSquare, Clock, Sparkles } from 'lucide-react';

interface ContributionRowProps {
  item: Contribution;
  isSelected: boolean;
  onClick: () => void;
}

export const ContributionRow: React.FC<ContributionRowProps> = ({ item, isSelected, onClick }) => {
  // Normalize status text (e.g. 'opened' -> 'OPEN')
  const normalizedStatus = (item.status === 'opened' ? 'open' : item.status).toUpperCase();

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'merged':
        return 'border-status-merged text-status-merged bg-status-merged/10';
      case 'open':
      case 'opened':
        return 'border-status-open text-status-open bg-status-open/10';
      case 'in-review':
        return 'border-status-in-review text-status-in-review bg-status-in-review/10';
      case 'awaiting-reply':
        return 'border-status-awaiting-reply text-status-awaiting-reply bg-status-awaiting-reply/10';
      case 'changes-requested':
        return 'border-status-action-needed text-status-action-needed bg-status-action-needed/10';
      case 'draft':
        return 'border-status-draft text-status-draft bg-status-draft/10';
      case 'closed':
        return 'border-border-bold text-text-muted bg-surface-elevated';
      default:
        return 'border-border-bold text-text-muted bg-surface-elevated';
    }
  };

  const formatRelativeTime = (isoString: string) => {
    const date = new Date(isoString);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Staleness calculation
  const daysSinceActivity = Math.floor(
    (Date.now() - new Date(item.last_activity_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  const isOpen = item.status.toLowerCase() === 'open' || item.status.toLowerCase() === 'opened' || item.status.toLowerCase() === 'draft';
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
      {/* DESKTOP VIEW (>= 768px): Dense, Scannable Horizontal Telemetry Row        */}
      {/* ========================================================================= */}
      <div className="hidden md:flex items-center justify-between px-6 py-3">
        {/* Left: Labeled Unread Badge + Platform + Type + Identity + Title */}
        <div className="flex items-center gap-3 min-w-0 flex-1 pr-4">
          {/* Unread Indicator: Explicitly Labeled Badge */}
          <div className="w-10 shrink-0">
            {item.unread === 1 ? (
              <span
                className="border border-status-awaiting-reply/60 bg-status-awaiting-reply/15 text-status-awaiting-reply font-telemetry text-[9px] font-bold px-1 py-0.5 tracking-wider inline-block"
                title="Unread activity since last viewed"
              >
                NEW
              </span>
            ) : (
              <span className="w-10 inline-block" />
            )}
          </div>

          {/* Platform Badge */}
          <span
            className={`px-1.5 py-0.5 font-telemetry text-[10px] font-bold uppercase border shrink-0 ${
              item.platform === 'github'
                ? 'border-border-bold text-text-primary bg-surface-elevated'
                : 'border-[#fc6d26]/40 text-[#fc6d26] bg-[#fc6d26]/10'
            }`}
          >
            {item.platform === 'github' ? 'GH' : 'GL'}
          </span>

          {/* Type Icon */}
          {item.type === 'pr' ? (
            <GitPullRequest className="h-3.5 w-3.5 text-text-muted shrink-0" />
          ) : (
            <CircleDot className="h-3.5 w-3.5 text-text-muted shrink-0" />
          )}

          {/* Repository & Number Identifier */}
          <span className="font-telemetry text-xs font-semibold text-text-secondary whitespace-nowrap shrink-0">
            {item.repo}#{item.number}
          </span>

          {/* Title with dormant dimming */}
          <span
            className={`font-body text-sm truncate font-medium group-hover:text-white ${
              isDormant ? 'text-text-muted line-through-none' : 'text-text-primary'
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

          {/* Staleness Badges */}
          {isDormant && (
            <span
              className="border border-amber-500/60 bg-amber-500/10 px-1.5 py-0.5 font-telemetry text-[10px] font-bold text-amber-500 shrink-0 flex items-center gap-1"
              title={`Inactive for ${daysSinceActivity} days`}
            >
              <Clock className="h-3 w-3" />
              [DORMANT: {daysSinceActivity}d]
            </span>
          )}
          {isStale && (
            <span
              className="border border-amber-600/40 bg-amber-600/10 px-1.5 py-0.5 font-telemetry text-[10px] text-amber-400 shrink-0"
              title={`Inactive for ${daysSinceActivity} days`}
            >
              [STALE: {daysSinceActivity}d]
            </span>
          )}
        </div>

        {/* Right: Action Needed Flag + Status Pill + Timestamp */}
        <div className="flex items-center gap-3 shrink-0 font-telemetry text-xs">
          {/* Action Needed Badge */}
          {item.action_needed === 'reply' && (
            <span className="flex items-center gap-1 border border-status-action-needed/40 bg-status-action-needed/10 px-2 py-0.5 text-[11px] font-bold text-status-action-needed">
              <MessageSquare className="h-3 w-3" />
              OWE REPLY
            </span>
          )}
          {item.action_needed === 'push-changes' && (
            <span className="flex items-center gap-1 border border-status-action-needed/40 bg-status-action-needed/10 px-2 py-0.5 text-[11px] font-bold text-status-action-needed">
              <AlertTriangle className="h-3 w-3" />
              CHANGES REQ
            </span>
          )}

          {/* Normalized Status Pill */}
          <span className={`border px-2 py-0.5 text-[11px] font-bold uppercase ${getStatusStyle(item.status)}`}>
            {normalizedStatus}
          </span>

          {/* Relative Timestamp */}
          <span className="text-text-muted w-16 text-right text-xs">
            {formatRelativeTime(item.last_activity_at)}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE VIEW (< 768px): Dedicated Stacked Card Layout (No Compression)     */}
      {/* ========================================================================= */}
      <div className="flex md:hidden flex-col gap-2 p-4">
        {/* Mobile Top Row: Platform + ID + Bounty + Relative Timestamp */}
        <div className="flex items-center justify-between font-telemetry text-xs">
          <div className="flex items-center gap-2 min-w-0">
            {item.unread === 1 && (
              <span className="border border-status-awaiting-reply bg-status-awaiting-reply/15 text-status-awaiting-reply text-[9px] font-bold px-1 py-0.5">
                NEW
              </span>
            )}
            <span
              className={`px-1.5 py-0.2 text-[10px] font-bold uppercase border ${
                item.platform === 'github'
                  ? 'border-border-bold text-text-primary bg-surface-elevated'
                  : 'border-[#fc6d26]/40 text-[#fc6d26] bg-[#fc6d26]/10'
              }`}
            >
              {item.platform === 'github' ? 'GH' : 'GL'}
            </span>
            <span className="font-semibold text-text-secondary truncate">
              {item.repo}#{item.number}
            </span>
            {item.bounty_amount && (
              <span className="border border-status-bounty/50 bg-status-bounty/10 px-1 py-0.2 text-[10px] font-bold text-status-bounty">
                {item.bounty_amount}
              </span>
            )}
          </div>
          <span className="text-text-muted text-[11px] shrink-0">
            {formatRelativeTime(item.last_activity_at)}
          </span>
        </div>

        {/* Mobile Middle Row: Full Unclipped Title */}
        <div className="font-body text-sm font-medium text-text-primary leading-snug">
          {item.title}
        </div>

        {/* Mobile Bottom Row: Action Needed + Status Pill + Staleness */}
        <div className="flex flex-wrap items-center gap-2 pt-1 font-telemetry text-xs">
          {item.action_needed === 'reply' && (
            <span className="flex items-center gap-1 border border-status-action-needed/40 bg-status-action-needed/10 px-2 py-0.5 text-[10px] font-bold text-status-action-needed">
              <MessageSquare className="h-2.5 w-2.5" />
              OWE REPLY
            </span>
          )}
          {item.action_needed === 'push-changes' && (
            <span className="flex items-center gap-1 border border-status-action-needed/40 bg-status-action-needed/10 px-2 py-0.5 text-[10px] font-bold text-status-action-needed">
              <AlertTriangle className="h-2.5 w-2.5" />
              CHANGES REQ
            </span>
          )}

          <span className={`border px-2 py-0.5 text-[10px] font-bold uppercase ${getStatusStyle(item.status)}`}>
            {normalizedStatus}
          </span>

          {isDormant && (
            <span className="border border-amber-500/60 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-500 flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              STALE ({daysSinceActivity}d)
            </span>
          )}
          {isStale && (
            <span className="border border-amber-600/40 bg-amber-600/10 px-1.5 py-0.5 text-[10px] text-amber-400">
              STALE: {daysSinceActivity}d
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
