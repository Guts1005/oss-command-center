import React from 'react';
import { Contribution } from '../types';
import { GitPullRequest, CircleDot, AlertTriangle, MessageSquare, Clock, ArrowRight } from 'lucide-react';

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
          <span className="border border-status-merged/80 bg-status-merged/20 text-status-merged px-3 py-1 rounded font-mono text-xs md:text-sm font-bold tracking-tight shadow-sm">
            [MERGED]
          </span>
        );
      case 'open':
      case 'opened':
        return (
          <span className="border border-accent-sapphire bg-accent-sapphire/20 text-text-whisper px-3 py-1 rounded font-mono text-xs md:text-sm font-bold tracking-tight shadow-sm">
            [IN_REVIEW]
          </span>
        );
      case 'draft':
        return (
          <span className="border border-border-bold bg-surface-elevated text-text-muted px-3 py-1 rounded font-mono text-xs md:text-sm font-bold tracking-tight">
            [DRAFT]
          </span>
        );
      case 'closed':
        return (
          <span className="border border-border-subtle bg-base text-text-muted px-3 py-1 rounded font-mono text-xs md:text-sm tracking-tight">
            [CLOSED]
          </span>
        );
      default:
        return (
          <span className="border border-border-subtle bg-surface-elevated text-text-muted px-3 py-1 rounded font-mono text-xs md:text-sm uppercase tracking-tight">
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
      className={`group border rounded-lg p-4 md:p-5 transition-all shadow-card cursor-pointer select-none mb-3.5 ${
        isSelected
          ? 'border-2 border-accent-sapphire bg-surface-active ring-2 ring-accent-sapphire/30 shadow-card-hover'
          : 'border-border-subtle bg-surface-card hover:bg-surface-active hover:border-accent-sapphire'
      }`}
    >
      {/* ========================================================================= */}
      {/* DESKTOP VIEW (>= 768px): Spacious Independent Card Row                    */}
      {/* ========================================================================= */}
      <div className="hidden md:flex flex-col gap-3">
        {/* Top Header of Card: Badges + Identifiers + Status + Timestamp */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {/* Unread / New Indicator */}
            {item.unread === 1 && (
              <span
                className="border border-amber-500/80 bg-amber-500/20 text-amber-300 font-mono text-xs font-bold px-2 py-0.5 rounded tracking-wide shadow-sm shrink-0"
                title="Telemetry update pending inspection"
              >
                [NEW]
              </span>
            )}

            {/* Platform Tag [GH] / [GL] */}
            <span
              className={`px-2.5 py-1 font-mono text-xs font-bold uppercase border rounded shrink-0 ${
                item.platform === 'github'
                  ? 'border-border-bold text-text-whisper bg-base'
                  : 'border-[#fc6d26]/70 text-[#fc6d26] bg-[#fc6d26]/15'
              }`}
            >
              {item.platform === 'github' ? '[GH]' : '[GL]'}
            </span>

            {/* Type Icon */}
            {item.type === 'pr' ? (
              <span title="Pull Request / Merge Request" className="inline-flex shrink-0">
                <GitPullRequest className="h-4 w-4 md:h-5 md:w-5 text-accent-glacial shrink-0" />
              </span>
            ) : (
              <span title="Issue" className="inline-flex shrink-0">
                <CircleDot className="h-4 w-4 md:h-5 md:w-5 text-accent-glacial shrink-0" />
              </span>
            )}

            {/* Repo & Identifier */}
            <span className="font-mono text-base md:text-lg font-bold text-text-whisper whitespace-nowrap shrink-0 tracking-tight group-hover:text-white transition-colors">
              {item.repo}#{item.number}
            </span>
          </div>

          {/* Right: Status Code + Tabular Timestamp */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Action Needed Indicator */}
            {item.action_needed === 'reply' && (
              <span
                className="flex items-center gap-1.5 border border-status-awaiting-reply/80 bg-status-awaiting-reply/20 px-3 py-1 rounded text-xs md:text-sm font-mono font-bold text-status-awaiting-reply shadow-sm"
                title="Maintainer feedback requires developer reply"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>[ACTION: OWE_REPLY]</span>
              </span>
            )}
            {item.action_needed === 'push-changes' && (
              <span
                className="flex items-center gap-1.5 border border-status-action-needed/80 bg-status-action-needed/20 px-3 py-1 rounded text-xs md:text-sm font-mono font-bold text-status-action-needed shadow-sm"
                title="Maintainer requested code changes"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>[ACTION: REQ_CHANGES]</span>
              </span>
            )}

            {/* Normalized Status Badge */}
            {getStatusBadge(normalizedStatus)}

            {/* Tabular Relative Time */}
            <span className="text-text-muted text-sm font-mono tracking-tight ml-2">
              {formatRelativeTime(item.last_activity_at)}
            </span>
          </div>
        </div>

        {/* Middle Line: Bold Sans Title */}
        <div className="text-base md:text-lg font-bold text-text-primary leading-snug font-sans group-hover:text-text-whisper transition-colors">
          {item.title}
        </div>

        {/* Bottom Line: Tags, Indicators & Inspect Affordance */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border-subtle/50 text-xs md:text-sm text-text-muted font-mono">
          <div className="flex flex-wrap items-center gap-2.5">
            {item.bounty_amount && (
              <span className="border border-status-bounty/70 bg-status-bounty/15 px-2.5 py-0.5 rounded font-mono text-xs font-bold text-status-bounty">
                [{item.bounty_amount}]
              </span>
            )}

            {isDormant && (
              <span
                className="border border-amber-500/70 bg-amber-500/15 px-2.5 py-0.5 rounded font-mono text-xs font-bold text-amber-400 flex items-center gap-1.5"
                title={`Zero maintainer telemetry for ${daysSinceActivity} days.`}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>[DORMANT: {daysSinceActivity}d]</span>
              </span>
            )}
            {isStale && (
              <span
                className="border border-amber-600/50 bg-amber-600/15 px-2.5 py-0.5 rounded font-mono text-xs font-bold text-amber-400 flex items-center gap-1.5"
                title={`Zero maintainer activity for ${daysSinceActivity} days.`}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>[STALE: {daysSinceActivity}d]</span>
              </span>
            )}

            <span className="text-text-muted">
              Telemetry verified · Click to view inspect drawer
            </span>
          </div>

          <div className="flex items-center gap-1 text-accent-sapphire font-bold group-hover:translate-x-1 transition-transform">
            <span>INSPECT</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE VIEW (< 768px): Spacious Independent Card Block                    */}
      {/* ========================================================================= */}
      <div className="flex md:hidden flex-col gap-2.5">
        {/* Top: Platform + Repo#ID + Relative Time */}
        <div className="flex items-center justify-between font-mono text-sm">
          <div className="flex items-center gap-2 min-w-0">
            {item.unread === 1 && (
              <span className="border border-amber-500/80 bg-amber-500/20 text-amber-300 text-xs font-bold px-2 py-0.5 rounded">
                [NEW]
              </span>
            )}
            <span
              className={`px-2 py-0.5 text-xs font-bold uppercase border rounded ${
                item.platform === 'github'
                  ? 'border-border-bold text-text-whisper bg-base'
                  : 'border-[#fc6d26]/70 text-[#fc6d26] bg-[#fc6d26]/15'
              }`}
            >
              {item.platform === 'github' ? '[GH]' : '[GL]'}
            </span>
            <span className="font-bold text-text-whisper truncate">
              {item.repo}#{item.number}
            </span>
          </div>
          <span className="text-text-muted text-xs shrink-0 font-mono">
            {formatRelativeTime(item.last_activity_at)}
          </span>
        </div>

        {/* Title */}
        <div className="font-sans text-base font-bold text-text-primary leading-snug">
          {item.title}
        </div>

        {/* Bottom: Action Trigger + Status */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border-subtle/50 font-mono text-xs">
          {item.action_needed === 'reply' && (
            <span className="flex items-center gap-1 border border-status-awaiting-reply/80 bg-status-awaiting-reply/20 px-2 py-0.5 rounded text-xs font-bold text-status-awaiting-reply">
              <MessageSquare className="h-3 w-3" />
              [ACTION: OWE_REPLY]
            </span>
          )}
          {item.action_needed === 'push-changes' && (
            <span className="flex items-center gap-1 border border-status-action-needed/80 bg-status-action-needed/20 px-2 py-0.5 rounded text-xs font-bold text-status-action-needed">
              <AlertTriangle className="h-3 w-3" />
              [ACTION: REQ_CHANGES]
            </span>
          )}

          {getStatusBadge(normalizedStatus)}

          {item.bounty_amount && (
            <span className="border border-status-bounty/70 bg-status-bounty/15 px-2 py-0.5 rounded text-xs font-bold text-status-bounty">
              [{item.bounty_amount}]
            </span>
          )}

          {isDormant && (
            <span className="border border-amber-500/70 bg-amber-500/15 px-2 py-0.5 rounded text-xs font-bold text-amber-400 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              [DORMANT: {daysSinceActivity}d]
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
