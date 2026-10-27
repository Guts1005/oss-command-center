import React from 'react';
import { motion } from 'framer-motion';
import { Contribution } from '../types';
import {
  GitPullRequest,
  CircleDot,
  AlertTriangle,
  MessageSquare,
  Clock,
  ArrowRight,
  User as UserIcon,
  FileText
} from 'lucide-react';
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
          <span className="inline-flex items-center gap-1.5 border border-status-merged/80 bg-status-merged/15 text-status-merged px-2.5 py-0.5 rounded-md font-mono text-xs font-bold tracking-tight shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-status-merged shrink-0" />
            <span>Merged</span>
          </span>
        );
      case 'open':
      case 'opened':
        return (
          <span className="inline-flex items-center gap-1.5 border border-accent-sapphire/80 bg-accent-sapphire/20 text-text-whisper px-2.5 py-0.5 rounded-md font-mono text-xs font-bold tracking-tight shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-sapphire shrink-0 animate-pulse" />
            <span>In Review</span>
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1.5 border border-border-bold bg-surface-elevated text-text-muted px-2.5 py-0.5 rounded-md font-mono text-xs font-bold tracking-tight">
            <span>Draft</span>
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1.5 border border-border-subtle bg-base text-text-muted px-2.5 py-0.5 rounded-md font-mono text-xs tracking-tight">
            <span>Closed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 border border-border-subtle bg-surface-elevated text-text-muted px-2.5 py-0.5 rounded-md font-mono text-xs uppercase tracking-tight">
            <span>{status}</span>
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
      if (type === 'perf') chipColor = 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300';
      if (type === 'test') chipColor = 'bg-purple-500/15 border-purple-500/40 text-purple-700 dark:text-purple-300';
      if (type === 'ci') chipColor = 'bg-sky-500/15 border-sky-500/40 text-sky-700 dark:text-sky-300';
      if (type === 'refactor') chipColor = 'bg-teal-500/15 border-teal-500/40 text-teal-700 dark:text-teal-300';
      if (type === 'docs') chipColor = 'bg-indigo-500/15 border-indigo-500/40 text-indigo-700 dark:text-indigo-300';

      return (
        <span className="inline-flex items-baseline gap-2 flex-wrap">
          <span className={`border px-2 py-0.5 rounded-md text-[11px] font-mono font-bold uppercase tracking-wider shrink-0 ${chipColor}`}>
            {type}
          </span>
          {scope && (
            <span className="font-mono text-xs sm:text-sm text-text-muted/80 font-normal shrink-0">
              {scope}:
            </span>
          )}
          <span className="text-text-primary font-bold text-base sm:text-lg">{message}</span>
        </span>
      );
    }
    return <span className="text-text-primary font-bold text-base sm:text-lg">{rawTitle}</span>;
  };

  // Perimeter styling and subtle ambient glow across all edges
  let cardGlowStyle = 'border-border-subtle hover:border-accent-sapphire/60';
  let surfaceOpacity = 'opacity-100';

  if (item.action_needed === 'push-changes') {
    cardGlowStyle =
      'border-red-500/40 bg-red-950/[0.12] shadow-[0_0_16px_-1px_rgba(239,68,68,0.25),0_0_4px_0_rgba(220,38,38,0.20)] hover:shadow-[0_0_24px_0_rgba(239,68,68,0.38),0_0_6px_0_rgba(220,38,38,0.30)] hover:border-red-500/65';
  } else if (item.action_needed === 'reply') {
    cardGlowStyle =
      'border-amber-500/40 bg-amber-950/[0.12] shadow-[0_0_16px_-1px_rgba(245,158,11,0.22),0_0_4px_0_rgba(245,158,11,0.18)] hover:shadow-[0_0_24px_0_rgba(245,158,11,0.34),0_0_6px_0_rgba(245,158,11,0.26)] hover:border-amber-500/65';
  } else if (normalizedStatus === 'merged') {
    cardGlowStyle = 'border-emerald-500/25 hover:border-emerald-500/45';
    surfaceOpacity = 'opacity-85 hover:opacity-100';
  } else if (normalizedStatus === 'closed') {
    cardGlowStyle = 'border-border-subtle/50 hover:border-border-subtle';
    surfaceOpacity = 'opacity-65 hover:opacity-95';
  }

  // Only show NEW indicator if unread AND not merged/closed
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
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`group border rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-5.5 transition-all duration-200 chrome-card cursor-pointer select-none mb-3 sm:mb-4 touch-pan-y ${cardGlowStyle} ${surfaceOpacity} ${
        isSelected
          ? 'border-accent-sapphire bg-surface-active ring-2 ring-accent-sapphire/80 shadow-[0_0_22px_-2px_rgba(116,157,208,0.30)]'
          : 'hover:bg-surface-active'
      }`}
    >
      <div className="flex flex-col gap-3 sm:gap-3.5">
        {/* Tier 1: Identity & Telemetry Header Bar (Dynamically adapts and stacks based on space) */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 min-w-0">
          {/* Identity Cluster: Platform, Type, Repo, Number, Author, NEW */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 min-w-0">
            {showNewIndicator && (
              <span
                className="border border-amber-500/80 bg-amber-500/20 text-amber-300 font-sans text-[10px] font-bold px-2 py-0.5 rounded tracking-wider shadow-sm shrink-0 uppercase"
                title="Telemetry update pending inspection"
              >
                NEW
              </span>
            )}

            {/* Platform Tag */}
            <span
              className={`px-2 py-0.5 font-sans text-[11px] font-bold uppercase tracking-wider border rounded-md shrink-0 flex items-center gap-1.5 shadow-xs ${
                item.platform === 'github'
                  ? 'border-border-bold text-text-whisper bg-base'
                  : 'border-[#fc6d26]/70 text-[#fc6d26] bg-[#fc6d26]/15'
              }`}
            >
              {item.platform === 'github' ? (
                <GitHubLogo className="h-3 w-3 text-text-primary shrink-0" />
              ) : (
                <GitLabLogo className="h-3 w-3 shrink-0" />
              )}
              <span>{item.platform === 'github' ? 'GitHub' : 'GitLab'}</span>
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
            <span className="font-mono text-sm sm:text-base font-bold shrink-0 tracking-tight group-hover:text-accent-sapphire transition-colors">
              {repoOwner && <span className="text-text-muted/80 font-normal">{repoOwner}/</span>}
              <span className="text-text-primary">{repoName}</span>
              <span className="text-accent-glacial ml-1">#{item.number}</span>
            </span>

            {/* Author Badge */}
            {item.author && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-elevated/70 border border-border-subtle/60 text-xs text-text-muted font-mono">
                <UserIcon className="h-3 w-3 text-accent-sapphire/80" />
                <span>@{item.author}</span>
              </span>
            )}
          </div>

          {/* Right: Action Badges + Status + Relative Time (Stacks naturally when space narrows) */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0 ml-auto sm:ml-0">
            {item.action_needed === 'reply' && (
              <span
                className="flex items-center gap-1.5 border border-status-awaiting-reply/80 bg-status-awaiting-reply/20 px-2.5 py-0.5 rounded-md text-xs font-mono font-bold text-status-awaiting-reply shadow-sm"
                title="Maintainer feedback requires developer reply"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Reply Needed</span>
              </span>
            )}
            {item.action_needed === 'push-changes' && (
              <span
                className="flex items-center gap-1.5 border border-status-action-needed/80 bg-status-action-needed/20 px-2.5 py-0.5 rounded-md text-xs font-mono font-bold text-status-action-needed shadow-sm"
                title="Maintainer requested code revisions"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Changes Requested</span>
              </span>
            )}

            {getStatusBadge(normalizedStatus)}

            <span className="flex items-center gap-1 text-text-muted text-xs font-mono tracking-tight pl-1">
              <Clock className="h-3.5 w-3.5 text-text-dim" />
              <span>{formatRelativeTime(item.last_activity_at)}</span>
            </span>
          </div>
        </div>

        {/* Tier 2: Dynamic Spacious Title Section */}
        <div className="text-base sm:text-lg leading-relaxed font-sans font-medium text-text-primary group-hover:text-text-whisper transition-colors break-words">
          {parseTitle(item.title)}
        </div>

        {/* Tier 3: Content-Driven Notes Bar (Rendered ONLY if notes actually exist) */}
        {item.notes && (
          <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg bg-surface-elevated/60 border border-border-subtle/70 text-xs sm:text-sm text-text-whisper font-mono leading-relaxed">
            <FileText className="h-4 w-4 text-accent-sapphire shrink-0 mt-0.5" />
            <span className="flex-1 break-words italic">{item.notes}</span>
          </div>
        )}

        {/* Tier 4: Bottom Telemetry & Inspect Affordance (Only if metadata exists or on hover) */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-border-subtle/30 text-xs text-text-muted font-mono">
          <div className="flex items-center gap-2 flex-wrap">
            {item.bounty_amount && (
              <span className="border border-status-bounty/70 bg-status-bounty/15 px-2.5 py-0.5 rounded-md font-mono text-[11px] font-bold text-status-bounty">
                {item.bounty_amount}
              </span>
            )}

            {isDormant && (
              <span
                className="border border-amber-500/70 bg-amber-500/15 px-2.5 py-0.5 rounded-md font-mono text-[11px] font-bold text-amber-400 flex items-center gap-1.5"
                title={`Zero maintainer activity for ${daysSinceActivity} days.`}
              >
                <Clock className="h-3 w-3" />
                <span>Dormant: {daysSinceActivity}d</span>
              </span>
            )}
            {isStale && (
              <span
                className="border border-amber-600/50 bg-amber-600/15 px-2.5 py-0.5 rounded-md font-mono text-[11px] font-bold text-amber-400 flex items-center gap-1.5"
                title={`Zero maintainer activity for ${daysSinceActivity} days.`}
              >
                <Clock className="h-3 w-3" />
                <span>Stale: {daysSinceActivity}d</span>
              </span>
            )}
          </div>

          {/* Hover inspect affordance with subtle translate animation */}
          <div className="opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1.5 text-accent-sapphire font-bold text-xs shrink-0 ml-auto">
            <span>INSPECT</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};
