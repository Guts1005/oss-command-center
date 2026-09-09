import React from 'react';
import { Contribution } from '../types';
import { GitPullRequest, CircleDot, AlertTriangle, MessageSquare, ExternalLink } from 'lucide-react';

interface ContributionRowProps {
  item: Contribution;
  isSelected: boolean;
  onClick: () => void;
}

export const ContributionRow: React.FC<ContributionRowProps> = ({ item, isSelected, onClick }) => {
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

  return (
    <div
      onClick={onClick}
      className={`group flex items-center justify-between border-b border-border-subtle px-6 py-3 cursor-pointer transition-colors ${
        isSelected ? 'bg-surface-active border-l-4 border-l-status-awaiting-reply' : 'bg-base hover:bg-surface'
      }`}
    >
      {/* Left: Unread Indicator + Platform + Type + Identity + Title */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-4">
        {/* Unread Status Dot */}
        <div className="flex items-center justify-center w-2">
          {item.unread === 1 ? (
            <span className="h-2 w-2 bg-status-awaiting-reply inline-block" title="Unread activity" />
          ) : (
            <span className="h-2 w-2 bg-transparent inline-block" />
          )}
        </div>

        {/* Platform Badge */}
        <span
          className={`px-1.5 py-0.5 font-telemetry text-[10px] font-bold uppercase border ${
            item.platform === 'github'
              ? 'border-border-bold text-text-primary bg-surface-elevated'
              : 'border-[#fc6d26]/40 text-[#fc6d26] bg-[#fc6d26]/10'
          }`}
        >
          {item.platform === 'github' ? 'GH' : 'GL'}
        </span>

        {/* Type Icon */}
        {item.type === 'pr' ? (
          <GitPullRequest className="h-4 w-4 text-text-muted shrink-0" />
        ) : (
          <CircleDot className="h-4 w-4 text-text-muted shrink-0" />
        )}

        {/* Repository & Number Identifier */}
        <span className="font-telemetry text-xs font-semibold text-text-secondary whitespace-nowrap shrink-0">
          {item.repo}#{item.number}
        </span>

        {/* Title */}
        <span className="font-body text-sm text-text-primary truncate font-medium group-hover:text-white">
          {item.title}
        </span>

        {/* Optional Bounty Badge */}
        {item.bounty_amount && (
          <span className="border border-status-bounty/50 bg-status-bounty/10 px-1.5 py-0.5 font-telemetry text-[10px] font-bold text-status-bounty shrink-0">
            {item.bounty_amount}
          </span>
        )}
      </div>

      {/* Right: Status Pill + Action Flag + Timestamp */}
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

        {/* Status Pill */}
        <span className={`border px-2 py-0.5 text-[11px] font-bold uppercase ${getStatusStyle(item.status)}`}>
          {item.status}
        </span>

        {/* Relative Timestamp */}
        <span className="text-text-muted w-16 text-right text-xs">
          {formatRelativeTime(item.last_activity_at)}
        </span>
      </div>
    </div>
  );
};
