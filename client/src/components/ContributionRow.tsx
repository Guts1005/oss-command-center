import React from 'react';
import { motion } from 'framer-motion';
import { Contribution } from '../types';
import { GitPullRequest, CircleDot, AlertTriangle, MessageSquare, Clock, ArrowRight, User as UserIcon } from 'lucide-react';
import { GitHubLogo, GitLabLogo } from './BrandLogos';

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
          <span className="border border-status-merged/80 bg-status-merged/20 text-status-merged px-2.5 py-0.5 rounded font-mono text-xs font-bold tracking-tight shadow-sm">
            [MERGED]
          </span>
        );
      case 'open':
      case 'opened':
        return (
          <span className="border border-accent-sapphire bg-accent-sapphire/20 text-text-whisper px-2.5 py-0.5 rounded font-mono text-xs font-bold tracking-tight shadow-sm">
            [IN REVIEW]
          </span>
        );
      case 'draft':
        return (
          <span className="border border-border-bold bg-surface-elevated text-text-muted px-2.5 py-0.5 rounded font-mono text-xs font-bold tracking-tight">
            [DRAFT]
          </span>
        );
      case 'closed':
        return (
          <span className="border border-border-subtle bg-base text-text-muted px-2.5 py-0.5 rounded font-mono text-xs tracking-tight">
            [CLOSED]
          </span>
        );
      default:
        return (
          <span className="border border-border-subtle bg-surface-elevated text-text-muted px-2.5 py-0.5 rounded font-mono text-xs uppercase tracking-tight">
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
    if (diff < 3600) return `${mins}m ago`;
    const hours = Math.floor(diff / 3600);
    if (diff < 86400) return `${hours}h ago`;
    const days = Math.floor(diff / 86400);
    if (days === 1) return 'yesterday';
    return `${days}d ago`;
  };

  // Staleness calculation
  const daysSinceActivity = Math.floor(
    (Date.now() - new Date(item.last_activity_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  const isOpen = normalizedStatus === 'open' || normalizedStatus === 'draft';
  const isDormant = isOpen && daysSinceActivity >= 90;
  const isStale = isOpen && daysSinceActivity >= 30 && !isDormant;

  // Split repo into owner and repository name
  const [repoOwner, repoName] = item.repo.includes('/') ? item.repo.split('/') : ['', item.repo];

  // Conventional commit title parser
  const parseTitle = (rawTitle: string) => {
    const match = rawTitle.match(/^([a-zA-Z0-9_-]+)(\([^)]+\))?:\s*(.*)$/);
    if (match) {
      const type = match[1].toLowerCase();
      const scope = match[2] || '';
      const message = match[3];

      let chipColor = 'bg-accent-sapphire/15 border-accent-sapphire/40 text-accent-sapphire';
      if (type === 'fix') chipColor = 'bg-status-action-needed/15 border-status-action-needed/40 text-status-action-needed';
      if (type === 'feat') chipColor = 'bg-status-merged/15 border-status-merged/40 text-status-merged';
      if (type === 'perf') chipColor = 'bg-amber-500/15 border-amber-500/40 text-amber-300';
      if (type === 'test') chipColor = 'bg-purple-500/15 border-purple-500/40 text-purple-300';

      return (
        <span className="inline-flex items-baseline gap-1.5 flex-wrap">
          <span className={`border px-1.5 py-0.2 rounded text-[10px] font-sans font-bold uppercase tracking-wider ${chipColor}`}>
            {type}
          </span>
          {scope && (
            <span className="font-mono text-xs text-text-muted font-normal">
              {scope}:
            </span>
          )}
          <span className="text-text-primary font-bold">{message}</span>
        </span>
      );
    }
    return <span className="text-text-primary font-bold">{rawTitle}</span>;
  };

  // Perimeter styling and subtle ambient glow across all edges
  let cardGlowStyle = 'border-border-subtle hover:border-accent-sapphire/60';
  let surfaceOpacity = 'opacity-100';

  if (item.action_needed === 'push-changes') {
    // True crimson red ambient glow across all edges (zero pink tint)
    cardGlowStyle =
      'border-red-500/40 bg-red-950/[0.12] shadow-[0_0_15px_-1px_rgba(239,68,68,0.24),0_0_4px_0_rgba(220,38,38,0.22)] hover:shadow-[0_0_22px_0_rgba(239,68,68,0.36),0_0_6px_0_rgba(220,38,38,0.30)] hover:border-red-500/65';
  } else if (item.action_needed === 'reply') {
    // Subtle ambient amber perimeter glow across all edges
    cardGlowStyle =
      'border-amber-500/40 bg-amber-950/[0.12] shadow-[0_0_15px_-1px_rgba(245,158,11,0.22),0_0_4px_0_rgba(245,158,11,0.18)] hover:shadow-[0_0_22px_0_rgba(245,158,11,0.32),0_0_6px_0_rgba(245,158,11,0.26)] hover:border-amber-500/65';
  } else if (normalizedStatus === 'merged') {
    cardGlowStyle = 'border-emerald-500/25 hover:border-emerald-500/40';
    surfaceOpacity = 'opacity-75 hover:opacity-100';
  } else if (normalizedStatus === 'closed') {
    cardGlowStyle = 'border-border-subtle/50 hover:border-border-subtle';
    surfaceOpacity = 'opacity-60 hover:opacity-95';
  }

  // Only show [NEW] if unread AND not merged/closed
  const showNewIndicator = item.unread === 1 && normalizedStatus !== 'merged' && normalizedStatus !== 'closed';

  return (
    <motion.div
      onClick={onClick}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.15}
      onDragEnd={(_e, info) => {
        if (Math.abs(info.offset.x) > 60) {
          onClick();
        }
      }}
      className={`group border rounded-lg p-3.5 md:p-4 transition-all duration-200 chrome-card cursor-pointer select-none mb-2.5 touch-pan-y ${cardGlowStyle} ${surfaceOpacity} ${
        isSelected
          ? 'border-accent-sapphire bg-surface-active ring-1 ring-accent-sapphire/80 shadow-[0_0_18px_-2px_rgba(116,157,208,0.25)] translate-x-0.5'
          : 'hover:bg-surface-active'
      }`}
    >
      <div className="flex flex-col gap-2">
        {/* Mobile Header (Tier 1: Repo + Relative Time, Tier 2: Action & Status Badges) */}
        <div className="flex flex-col sm:hidden gap-1.5">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
              {showNewIndicator && (
                <span
                  className="border border-amber-500/80 bg-amber-500/20 text-amber-300 font-sans text-[10px] font-bold px-1.5 py-0.2 rounded tracking-wider shadow-sm shrink-0 uppercase"
                  title="Telemetry update pending inspection"
                >
                  [NEW]
                </span>
              )}
              <span
                className={`px-1.5 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wider border rounded shrink-0 flex items-center gap-1 ${
                  item.platform === 'github'
                    ? 'border-border-bold text-text-whisper bg-base'
                    : 'border-[#fc6d26]/70 text-[#fc6d26] bg-[#fc6d26]/15'
                }`}
              >
                {item.platform === 'github' ? (
                  <GitHubLogo className="h-2.5 w-2.5 text-white shrink-0" />
                ) : (
                  <GitLabLogo className="h-2.5 w-2.5 shrink-0" />
                )}
                <span>{item.platform === 'github' ? 'GH' : 'GL'}</span>
              </span>
              {item.type === 'pr' ? (
                <GitPullRequest className="h-3.5 w-3.5 text-accent-glacial shrink-0" />
              ) : (
                <CircleDot className="h-3.5 w-3.5 text-accent-glacial shrink-0" />
              )}
              <span className="font-mono text-xs font-bold truncate tracking-tight group-hover:text-white transition-colors">
                {repoOwner && <span className="text-text-muted font-normal">{repoOwner}/</span>}
                <span className="text-white">{repoName}</span>
                <span className="text-text-whisper ml-0.5">#{item.number}</span>
              </span>
            </div>
            <span className="text-text-muted text-[11px] font-mono tracking-tight shrink-0">
              {formatRelativeTime(item.last_activity_at)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {item.action_needed === 'reply' && (
              <span className="flex items-center gap-1 border border-status-awaiting-reply/80 bg-status-awaiting-reply/20 px-2 py-0.5 rounded text-[11px] font-mono font-bold text-status-awaiting-reply shadow-sm">
                <MessageSquare className="h-3 w-3" />
                <span>[REPLY NEEDED]</span>
              </span>
            )}
            {item.action_needed === 'push-changes' && (
              <span className="flex items-center gap-1 border border-status-action-needed/80 bg-status-action-needed/20 px-2 py-0.5 rounded text-[11px] font-mono font-bold text-status-action-needed shadow-sm">
                <AlertTriangle className="h-3 w-3" />
                <span>[CHANGES REQUESTED]</span>
              </span>
            )}
            {getStatusBadge(normalizedStatus)}
            {item.author && (
              <span className="inline-flex items-center gap-1 text-[11px] text-text-muted font-mono ml-auto">
                <UserIcon className="h-3 w-3" />
                <span>@{item.author}</span>
              </span>
            )}
          </div>
        </div>

        {/* Desktop Header (Exact Single Row on >= sm) */}
        <div className="hidden sm:flex items-center justify-between gap-3">
          {/* Left: Platform, Type, Repo#Number, New badge */}
          <div className="flex items-center gap-2 min-w-0">
            {showNewIndicator && (
              <span
                className="border border-amber-500/80 bg-amber-500/20 text-amber-300 font-sans text-[10px] font-bold px-1.5 py-0.2 rounded tracking-wider shadow-sm shrink-0 uppercase"
                title="Telemetry update pending inspection"
              >
                [NEW]
              </span>
            )}

            {/* Platform Tag */}
            <span
              className={`px-1.5 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wider border rounded shrink-0 flex items-center gap-1.5 ${
                item.platform === 'github'
                  ? 'border-border-bold text-text-whisper bg-base'
                  : 'border-[#fc6d26]/70 text-[#fc6d26] bg-[#fc6d26]/15'
              }`}
            >
              {item.platform === 'github' ? (
                <GitHubLogo className="h-3 w-3 text-white shrink-0" />
              ) : (
                <GitLabLogo className="h-3 w-3 shrink-0" />
              )}
              <span>{item.platform === 'github' ? 'GH' : 'GL'}</span>
            </span>

            {/* Type Icon */}
            {item.type === 'pr' ? (
              <span title="Pull Request" className="inline-flex shrink-0">
                <GitPullRequest className="h-4 w-4 text-accent-glacial shrink-0" />
              </span>
            ) : (
              <span title="Issue" className="inline-flex shrink-0">
                <CircleDot className="h-4 w-4 text-accent-glacial shrink-0" />
              </span>
            )}

            {/* Formatted Repo Identifier (Dim owner, brighten repo) */}
            <span className="font-mono text-sm md:text-base font-bold whitespace-nowrap shrink-0 tracking-tight group-hover:text-white transition-colors">
              {repoOwner && <span className="text-text-muted font-normal">{repoOwner}/</span>}
              <span className="text-white">{repoName}</span>
              <span className="text-text-whisper ml-1">#{item.number}</span>
            </span>

            {/* Author */}
            {item.author && (
              <span className="inline-flex items-center gap-1 text-xs text-text-muted font-mono ml-1">
                <UserIcon className="h-3 w-3" />
                <span>@{item.author}</span>
              </span>
            )}
          </div>

          {/* Right: Action Badges + Status + Relative Time */}
          <div className="flex items-center gap-2 shrink-0">
            {item.action_needed === 'reply' && (
              <span
                className="flex items-center gap-1 border border-status-awaiting-reply/80 bg-status-awaiting-reply/20 px-2 py-0.5 rounded text-xs font-mono font-bold text-status-awaiting-reply shadow-sm"
                title="Maintainer feedback requires developer reply"
              >
                <MessageSquare className="h-3 w-3" />
                <span>[ACTION: REPLY NEEDED]</span>
              </span>
            )}
            {item.action_needed === 'push-changes' && (
              <span
                className="flex items-center gap-1 border border-status-action-needed/80 bg-status-action-needed/20 px-2 py-0.5 rounded text-xs font-mono font-bold text-status-action-needed shadow-sm"
                title="Maintainer requested code revisions"
              >
                <AlertTriangle className="h-3 w-3" />
                <span>[ACTION: CHANGES REQUESTED]</span>
              </span>
            )}

            {getStatusBadge(normalizedStatus)}

            <span className="text-text-muted text-xs font-mono tracking-tight ml-1">
              {formatRelativeTime(item.last_activity_at)}
            </span>
          </div>
        </div>

        {/* Line 2: Scannable Title with Conventional Commit Formatting */}
        <div className="text-sm md:text-base leading-snug font-sans break-words overflow-hidden group-hover:text-text-whisper transition-colors">
          {parseTitle(item.title)}
        </div>

        {/* Line 3: Compact Metadata & Subtle Hover-Only Inspect Affordance */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border-subtle/40 text-xs text-text-muted font-mono">
          <div className="flex items-center gap-2 flex-wrap">
            {item.bounty_amount && (
              <span className="border border-status-bounty/70 bg-status-bounty/15 px-2 py-0.2 rounded font-mono text-[11px] font-bold text-status-bounty">
                [{item.bounty_amount}]
              </span>
            )}

            {isDormant && (
              <span
                className="border border-amber-500/70 bg-amber-500/15 px-2 py-0.2 rounded font-mono text-[11px] font-bold text-amber-400 flex items-center gap-1"
                title={`Zero maintainer activity for ${daysSinceActivity} days.`}
              >
                <Clock className="h-3 w-3" />
                <span>[DORMANT: {daysSinceActivity}d]</span>
              </span>
            )}
            {isStale && (
              <span
                className="border border-amber-600/50 bg-amber-600/15 px-2 py-0.2 rounded font-mono text-[11px] font-bold text-amber-400 flex items-center gap-1"
                title={`Zero maintainer activity for ${daysSinceActivity} days.`}
              >
                <Clock className="h-3 w-3" />
                <span>[STALE: {daysSinceActivity}d]</span>
              </span>
            )}

            {item.notes && (
              <span className="text-text-muted truncate max-w-[320px] italic">
                note: {item.notes}
              </span>
            )}
          </div>

          {/* Hover-only inspect affordance */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-accent-sapphire font-bold text-xs shrink-0">
            <span>INSPECT</span>
            <ArrowRight className="h-3 w-3" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};
