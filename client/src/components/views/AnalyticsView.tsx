import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BarChart3,
  Clock,
  CheckCircle2,
  GitMerge,
  TrendingUp,
  RefreshCw,
  GitPullRequest,
  Globe,
  FolderGit2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { ViewMode } from '../../types';
import { Footer } from '../Footer';

interface AnalyticsData {
  summary: {
    total: number;
    merged: number;
    closed: number;
    open: number;
    actionNeeded: number;
    acceptanceRate: number;
  };
  velocity: {
    medianTimeToMergeHours: number;
    avgTimeToMergeHours: number;
    medianFirstReviewHours: number;
    totalMergedEvaluated: number;
  };
  platformBreakdown: {
    github: number;
    gitlab: number;
  };
  scopeBreakdown: {
    external: number;
    own: number;
  };
  topRepositories: Array<{
    repo: string;
    platform: string;
    total: number;
    merged: number;
    actionNeeded: number;
  }>;
  heatmap: Array<{
    date: string;
    count: number;
    level: number;
  }>;
}

interface AnalyticsViewProps {
  stats: any;
  isDemoMode?: boolean;
  demoAnalytics?: AnalyticsData | null;
  onNavigateView?: (mode: ViewMode) => void;
  onOpenCookiePreferences?: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  stats: initialStats,
  isDemoMode,
  demoAnalytics,
  onNavigateView,
  onOpenCookiePreferences,
}) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [hoveredDay, setHoveredDay] = useState<{ date: string; count: number } | null>(null);

  const fetchAnalytics = async (isInitial = false) => {
    if (isDemoMode && demoAnalytics) {
      setData(demoAnalytics);
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }
    try {
      if (isInitial) setIsLoading(true);
      else setIsRefreshing(true);
      const res = await axios.get('/api/analytics');
      setData(res.data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isDemoMode && demoAnalytics) {
      setData(demoAnalytics);
      setIsLoading(false);
    } else {
      fetchAnalytics(true);
    }
  }, [isDemoMode, demoAnalytics]);

  const formatHours = (hours: number) => {
    if (!hours || hours <= 0) return '0h';
    if (hours < 24) return `${hours}h`;
    const days = Math.round((hours / 24) * 10) / 10;
    return `${days}d`;
  };

  const getHeatmapColor = (level: number) => {
    switch (level) {
      case 1:
        return 'bg-accent-sapphire/35 border-accent-sapphire/50';
      case 2:
        return 'bg-accent-sapphire/60 border-accent-sapphire/80';
      case 3:
        return 'bg-accent-glacial border-accent-glacial';
      case 4:
        return 'bg-status-merged border-status-merged';
      default:
        return 'bg-surface-active/30 border-border-subtle/40';
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 font-mono text-xs text-text-muted">
          <RefreshCw className="h-4 w-4 animate-spin text-accent-sapphire" />
          <span>COMPUTING TELEMETRY METRICS...</span>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {
    total: initialStats?.total ?? 0,
    merged: initialStats?.merged ?? 0,
    closed: initialStats?.closed ?? 0,
    open: (initialStats?.total ?? 0) - (initialStats?.merged ?? 0) - (initialStats?.closed ?? 0),
    actionNeeded: initialStats?.actionNeeded ?? 0,
    acceptanceRate: initialStats?.total ? Math.round(((initialStats.merged || 0) / initialStats.total) * 100) : 0,
  };

  const velocity = data?.velocity || {
    medianTimeToMergeHours: 0,
    avgTimeToMergeHours: 0,
    medianFirstReviewHours: 0,
    totalMergedEvaluated: 0,
  };

  const heatmap = data?.heatmap || [];
  const topRepos = data?.topRepositories || [];
  const platform = data?.platformBreakdown || { github: 0, gitlab: 0 };
  const scope = data?.scopeBreakdown || { external: 0, own: 0 };

  return (
    <div className="flex-1 flex flex-col min-h-0 py-3 overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-accent-sapphire" />
            <h2 className="text-base sm:text-lg lg:text-xl font-extrabold uppercase font-sans tracking-tight text-text-primary">
              CONTRIBUTION VELOCITY & TELEMETRY
            </h2>
          </div>
          <p className="text-xs font-mono text-text-muted mt-0.5">
            Turnaround velocity, review latency, and 52-week contribution punch card.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchAnalytics(false)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle bg-surface-card hover:bg-surface-elevated text-xs font-mono text-text-muted hover:text-text-primary transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 text-accent-glacial ${isRefreshing ? 'animate-spin text-accent-sapphire' : ''}`} />
            <span className="hidden sm:inline">REFRESH</span>
          </button>
        </div>
      </div>

      {/* KPI Velocity & Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {/* Median Lead Time to Merge */}
        <div className="chrome-card border border-border-subtle hover:border-border-bold rounded-xl p-4 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-text-primary">MEDIAN MERGE TIME</span>
            <Clock className="h-4 w-4 text-accent-sapphire" />
          </div>
          <div className="text-2xl sm:text-3xl font-mono font-extrabold text-text-primary">
            {formatHours(velocity.medianTimeToMergeHours)}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-subtle text-[11px] font-mono text-text-muted">
            <span>Avg: {formatHours(velocity.avgTimeToMergeHours)}</span>
            <span className="text-accent-glacial font-semibold">
              {velocity.medianTimeToMergeHours <= 24 ? 'RAPID' : (velocity.medianTimeToMergeHours <= 72 ? 'STEADY' : 'EXTENDED')}
            </span>
          </div>
        </div>

        {/* Time to First Review */}
        <div className="chrome-card border border-border-subtle hover:border-border-bold rounded-xl p-4 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-text-primary">FIRST REVIEW TIME</span>
            <GitPullRequest className="h-4 w-4 text-status-awaiting-reply" />
          </div>
          <div className="text-2xl sm:text-3xl font-mono font-extrabold text-text-primary">
            {formatHours(velocity.medianFirstReviewHours)}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-subtle text-[11px] font-mono text-text-muted">
            <span>Maintainer response</span>
            <span className="text-status-awaiting-reply font-semibold">
              {velocity.medianFirstReviewHours <= 12 ? 'FAST' : 'NORMAL'}
            </span>
          </div>
        </div>

        {/* Acceptance Rate */}
        <div className="chrome-card border border-border-subtle hover:border-border-bold rounded-xl p-4 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-text-primary">ACCEPTANCE RATE</span>
            <TrendingUp className="h-4 w-4 text-status-merged" />
          </div>
          <div className="text-2xl sm:text-3xl font-mono font-extrabold text-status-merged">
            {summary.acceptanceRate}%
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-subtle text-[11px] font-mono text-text-muted">
            <span>{summary.merged} merged</span>
            <span>{summary.closed} closed</span>
          </div>
        </div>

        {/* Triage & Active Queue */}
        <div className="chrome-card border border-border-subtle hover:border-border-bold rounded-xl p-4 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-text-primary">ACTION REQUIRED</span>
            <AlertCircle className="h-4 w-4 text-status-action-needed" />
          </div>
          <div className="text-2xl sm:text-3xl font-mono font-extrabold text-status-action-needed">
            {summary.actionNeeded}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-subtle text-[11px] font-mono text-text-muted">
            <span>{summary.open} awaiting review</span>
            <span className="text-text-primary font-semibold">{summary.total} total</span>
          </div>
        </div>
      </div>

      {/* 52-Week Contribution Punch Card Heatmap */}
      <div className="chrome-card border border-border-subtle rounded-xl p-4 sm:p-5 shadow-card mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-accent-sapphire" />
            <h3 className="text-sm sm:text-base font-bold font-sans text-text-primary uppercase tracking-wider">
              52-WEEK ACTIVITY PUNCH CARD
            </h3>
          </div>
          <div className="text-xs font-mono text-text-muted">
            {hoveredDay ? (
              <span className="text-white font-semibold">
                {hoveredDay.count} events on {hoveredDay.date}
              </span>
            ) : (
              <span>Past 365 Days Telemetry</span>
            )}
          </div>
        </div>

        {/* Scrollable Heatmap Matrix */}
        <div className="overflow-x-auto pb-2 custom-scrollbar">
          <div className="inline-grid grid-rows-7 grid-flow-col gap-1 min-w-[720px]">
            {heatmap.map((cell) => (
              <div
                key={cell.date}
                onMouseEnter={() => setHoveredDay({ date: cell.date, count: cell.count })}
                onMouseLeave={() => setHoveredDay(null)}
                className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-xs border transition-all cursor-pointer ${getHeatmapColor(
                  cell.level
                )} hover:ring-1 hover:ring-white`}
                title={`${cell.count} events on ${cell.date}`}
              />
            ))}
          </div>
        </div>

        {/* Heatmap Legend */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-subtle text-[11px] font-mono text-text-muted">
          <span>Less Active</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs border bg-surface-active/30 border-border-subtle/40" />
            <span className="w-2.5 h-2.5 rounded-xs border bg-accent-sapphire/35 border-accent-sapphire/50" />
            <span className="w-2.5 h-2.5 rounded-xs border bg-accent-sapphire/60 border-accent-sapphire/80" />
            <span className="w-2.5 h-2.5 rounded-xs border bg-accent-glacial border-accent-glacial" />
            <span className="w-2.5 h-2.5 rounded-xs border bg-status-merged border-status-merged" />
          </div>
          <span>Highly Active</span>
        </div>
      </div>

      {/* Scope, Platform & Top Repositories Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Scope & Platform Balance */}
        <div className="chrome-card border border-border-subtle rounded-xl p-4 sm:p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Globe className="h-4 w-4 text-accent-sapphire" />
              <h3 className="text-sm sm:text-base font-bold font-sans text-text-primary uppercase tracking-wider">
                ECOSYSTEM REACH
              </h3>
            </div>

            {/* Scope Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs font-mono text-text-muted mb-1.5">
                <span>External Organizations</span>
                <span className="text-white font-bold">{scope.external} PRs</span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-elevated overflow-hidden flex">
                <div
                  className="h-full bg-accent-sapphire rounded-full transition-all"
                  style={{
                    width: `${summary.total > 0 ? (scope.external / summary.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-text-muted mt-1">
                <span>Personal Repos: {scope.own}</span>
                <span>{summary.total > 0 ? Math.round((scope.external / summary.total) * 100) : 0}% External</span>
              </div>
            </div>

            {/* Platform Balance */}
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-text-muted mb-1.5">
                <span>Platform Distribution</span>
                <span className="text-white font-bold">{summary.total} PRs</span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-elevated overflow-hidden flex">
                <div
                  className="h-full bg-text-primary transition-all"
                  style={{
                    width: `${summary.total > 0 ? (platform.github / summary.total) * 100 : 0}%`,
                  }}
                  title={`GitHub: ${platform.github}`}
                />
                <div
                  className="h-full bg-platform-gitlab transition-all"
                  style={{
                    width: `${summary.total > 0 ? (platform.gitlab / summary.total) * 100 : 0}%`,
                  }}
                  title={`GitLab: ${platform.gitlab}`}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-text-muted mt-1">
                <span>GitHub: {platform.github}</span>
                <span className="text-platform-gitlab font-bold">GitLab: {platform.gitlab}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border-subtle text-[11px] font-mono text-text-muted">
            Continuous multi-tenant telemetry active across linked repositories.
          </div>
        </div>

        {/* Top Repositories Ranked */}
        <div className="chrome-card lg:col-span-2 border border-border-subtle rounded-xl p-4 sm:p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FolderGit2 className="h-4 w-4 text-accent-sapphire" />
              <h3 className="text-sm sm:text-base font-bold font-sans text-text-primary uppercase tracking-wider">
                TOP CONTRIBUTED REPOSITORIES
              </h3>
            </div>
            <span className="text-xs font-mono text-text-muted">Ranked by volume</span>
          </div>

          {topRepos.length > 0 ? (
            <div className="space-y-2">
              {topRepos.map((repo, idx) => (
                <div
                  key={repo.repo}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border-subtle bg-surface hover:border-border-active transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xs font-mono font-bold text-text-muted w-4">
                      0{idx + 1}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase shrink-0 ${
                        repo.platform === 'gitlab'
                          ? 'border border-platform-gitlab/40 bg-platform-gitlab/10 text-platform-gitlab'
                          : 'border border-platform-github/40 bg-platform-github/10 text-text-primary'
                      }`}
                    >
                      {repo.platform === 'gitlab' ? 'GL' : 'GH'}
                    </span>
                    <span className="text-xs font-mono font-bold text-white truncate">
                      {repo.repo}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-xs font-mono">
                    <span className="text-text-muted">{repo.total} PRs</span>
                    {repo.actionNeeded > 0 && (
                      <span className="text-status-action-needed font-bold">
                        {repo.actionNeeded} action
                      </span>
                    )}
                    {repo.merged > 0 && (
                      <span className="text-status-merged font-semibold">
                        {repo.merged} merged
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs font-mono text-text-muted">
              No repository contributions recorded yet.
            </div>
          )}
        </div>
      </div>

      <Footer
        variant="dashboard"
        onNavigateView={onNavigateView}
        onOpenCookiePreferences={onOpenCookiePreferences}
      />
    </div>
  );
};
