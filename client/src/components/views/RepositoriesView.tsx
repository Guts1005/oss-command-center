import React from 'react';
import axios from 'axios';
import {
  FolderGit2,
  Search,
  ExternalLink,
  GitPullRequest,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Flame,
  ArrowUpDown,
  Filter
} from 'lucide-react';
import { Contribution, ViewMode } from '../../types';
import { Footer } from '../Footer';

export interface RepoEcosystemItem {
  repo: string;
  platform: 'github' | 'gitlab' | string;
  url: string;
  totalContributions: number;
  openContributions: number;
  mergedContributions: number;
  closedContributions: number;
  actionNeededCount: number;
  acceptanceRate: number;
  medianFirstReviewHours: number | null;
  responsiveness: 'Fast' | 'Moderate' | 'Slow' | 'Pending';
  health: 'Healthy' | 'Attention Required' | 'Stale';
  lastActivityAt: string | null;
}

interface RepositoriesViewProps {
  contributions: Contribution[];
  onSelectRepoFilter: (repo: string) => void;
  isDemoMode?: boolean;
  demoRepositories?: RepoEcosystemItem[];
  onNavigateView?: (mode: ViewMode) => void;
  onOpenCookiePreferences?: () => void;
}

export const RepositoriesView: React.FC<RepositoriesViewProps> = ({
  contributions,
  onSelectRepoFilter,
  isDemoMode,
  demoRepositories,
  onNavigateView,
  onOpenCookiePreferences,
}) => {
  const [repos, setRepos] = React.useState<RepoEcosystemItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [platformFilter, setPlatformFilter] = React.useState<'all' | 'github' | 'gitlab'>('all');
  const [responsivenessFilter, setResponsivenessFilter] = React.useState<'all' | 'Fast' | 'Moderate' | 'Slow' | 'Pending'>('all');
  const [healthFilter, setHealthFilter] = React.useState<'all' | 'Healthy' | 'Attention Required' | 'Stale'>('all');
  const [sortBy, setSortBy] = React.useState<'total' | 'responsiveness' | 'acceptance' | 'activity'>('total');

  // Fetch live aggregated repositories from API
  const fetchRepositories = React.useCallback(async () => {
    if (isDemoMode && demoRepositories && demoRepositories.length > 0) {
      setRepos(demoRepositories);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await axios.get<RepoEcosystemItem[]>('/api/repositories');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setRepos(res.data);
      } else {
        // Fallback: aggregate from client-side contributions prop
        const map = new Map<string, RepoEcosystemItem>();
        contributions.forEach((c) => {
          const existing = map.get(c.repo) || {
            repo: c.repo,
            platform: c.platform,
            url: c.platform === 'gitlab' ? `https://gitlab.com/${c.repo}` : `https://github.com/${c.repo}`,
            totalContributions: 0,
            openContributions: 0,
            mergedContributions: 0,
            closedContributions: 0,
            actionNeededCount: 0,
            acceptanceRate: 0,
            medianFirstReviewHours: null,
            responsiveness: 'Pending',
            health: 'Healthy',
            lastActivityAt: c.last_activity_at || c.created_at,
          };
          existing.totalContributions += 1;
          if (c.status.toLowerCase() === 'merged') existing.mergedContributions += 1;
          else if (c.status.toLowerCase() === 'closed') existing.closedContributions += 1;
          else existing.openContributions += 1;

          if (c.action_needed !== 'none') existing.actionNeededCount += 1;
          map.set(c.repo, existing);
        });

        const derived = Array.from(map.values()).map((item) => {
          const resolved = item.mergedContributions + item.closedContributions;
          const rate = resolved > 0
            ? Math.round((item.mergedContributions / resolved) * 100)
            : (item.totalContributions > 0 ? Math.round((item.mergedContributions / item.totalContributions) * 100) : 0);
          return {
            ...item,
            acceptanceRate: rate,
            health: (item.actionNeededCount > 0 ? 'Attention Required' : 'Healthy') as 'Healthy' | 'Attention Required' | 'Stale',
          };
        });
        setRepos(derived);
      }
    } catch (err) {
      console.error('[RepositoriesView] Failed to load repositories:', err);
    } finally {
      setLoading(false);
    }
  }, [contributions]);

  React.useEffect(() => {
    fetchRepositories();
  }, [fetchRepositories]);

  // Filter and sort items
  const filteredRepos = React.useMemo(() => {
    return repos
      .filter((r) => {
        if (search && !r.repo.toLowerCase().includes(search.toLowerCase())) {
          return false;
        }
        if (platformFilter !== 'all' && r.platform !== platformFilter) {
          return false;
        }
        if (responsivenessFilter !== 'all' && r.responsiveness !== responsivenessFilter) {
          return false;
        }
        if (healthFilter !== 'all' && r.health !== healthFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'total') {
          return b.totalContributions - a.totalContributions;
        }
        if (sortBy === 'responsiveness') {
          const valA = a.medianFirstReviewHours ?? 9999;
          const valB = b.medianFirstReviewHours ?? 9999;
          return valA - valB;
        }
        if (sortBy === 'acceptance') {
          return b.acceptanceRate - a.acceptanceRate;
        }
        if (sortBy === 'activity') {
          const dateA = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
          const dateB = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
          return dateB - dateA;
        }
        return 0;
      });
  }, [repos, search, platformFilter, responsivenessFilter, healthFilter, sortBy]);

  // High-level summary metrics
  const summary = React.useMemo(() => {
    const totalRepos = repos.length;
    const fastRepos = repos.filter((r) => r.responsiveness === 'Fast').length;
    const actionRequired = repos.reduce((acc, r) => acc + r.actionNeededCount, 0);
    const avgAcceptance = totalRepos > 0
      ? Math.round(repos.reduce((acc, r) => acc + r.acceptanceRate, 0) / totalRepos)
      : 0;
    return { totalRepos, fastRepos, actionRequired, avgAcceptance };
  }, [repos]);

  const formatTurnaround = (hours: number | null) => {
    if (hours === null || hours === undefined) return 'No reviews yet';
    if (hours < 1) return `${Math.round(hours * 60)}m avg first review`;
    if (hours < 24) return `${hours.toFixed(1)}h avg first review`;
    return `${(hours / 24).toFixed(1)}d avg first review`;
  };

  const formatLastActivity = (iso: string | null) => {
    if (!iso) return 'Recent';
    const diffHours = Math.round((Date.now() - new Date(iso).getTime()) / (1000 * 3600));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 py-3 overflow-y-auto custom-scrollbar">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-3 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2">
            <FolderGit2 className="h-5 w-5 text-accent-sapphire" />
            <h2 className="text-base sm:text-lg lg:text-xl font-extrabold uppercase font-sans tracking-tight text-text-primary">
              ECOSYSTEM & UPSTREAM REPOSITORIES
            </h2>
          </div>
          <p className="text-xs font-mono text-text-muted mt-0.5">
            Active upstream codebases tracked across GitHub and GitLab with maintainer responsiveness analytics.
          </p>
        </div>

        {/* Global Repositories Search */}
        <div className="relative w-full sm:w-72 shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tracked repositories..."
            className="w-full bg-surface-card border border-border-subtle rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-white placeholder-text-muted focus:outline-none focus:border-border-active"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-text-muted hover:text-white"
            >
              CLEAR
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        <div className="chrome-card border border-border-subtle rounded-xl p-3 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Tracked Repos</span>
            <FolderGit2 className="h-3.5 w-3.5 text-accent-sapphire" />
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1">{summary.totalRepos}</div>
          <div className="text-[10px] font-mono text-text-muted mt-0.5">Upstream targets</div>
        </div>

        <div className="chrome-card border border-border-subtle rounded-xl p-3 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Fast Maintainers</span>
            <Flame className="h-3.5 w-3.5 text-status-merged" />
          </div>
          <div className="text-xl font-bold font-mono text-status-merged mt-1">{summary.fastRepos}</div>
          <div className="text-[10px] font-mono text-text-muted mt-0.5">Under 12h turnaround</div>
        </div>

        <div className="chrome-card border border-border-subtle rounded-xl p-3 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Action Needed</span>
            <AlertTriangle className="h-3.5 w-3.5 text-status-action-needed" />
          </div>
          <div className="text-xl font-bold font-mono text-status-action-needed mt-1">{summary.actionRequired}</div>
          <div className="text-[10px] font-mono text-text-muted mt-0.5">Reviews & triage pending</div>
        </div>

        <div className="chrome-card border border-border-subtle rounded-xl p-3 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Mean Acceptance</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-accent-sapphire" />
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1">{summary.avgAcceptance}%</div>
          <div className="text-[10px] font-mono text-text-muted mt-0.5">Across all repositories</div>
        </div>
      </div>

      {/* Filter and Sort Rail */}
      <div className="chrome-surface flex flex-wrap items-center justify-between gap-2.5 mb-4 p-2.5 rounded-xl shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          {/* Platform filter */}
          <div className="flex items-center bg-surface-card border border-border-subtle rounded-lg p-0.5 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setPlatformFilter('all')}
              className={`px-2 py-1 rounded transition-colors ${
                platformFilter === 'all'
                  ? 'bg-surface-active text-white font-bold'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              ALL
            </button>
            <button
              type="button"
              onClick={() => setPlatformFilter('github')}
              className={`px-2 py-1 rounded transition-colors ${
                platformFilter === 'github'
                  ? 'bg-surface-active text-white font-bold'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              GITHUB
            </button>
            <button
              type="button"
              onClick={() => setPlatformFilter('gitlab')}
              className={`px-2 py-1 rounded transition-colors ${
                platformFilter === 'gitlab'
                  ? 'bg-surface-active text-platform-gitlab font-bold'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              GITLAB
            </button>
          </div>

          {/* Responsiveness filter */}
          <div className="flex items-center bg-surface-card border border-border-subtle rounded-lg p-0.5 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setResponsivenessFilter('all')}
              className={`px-2 py-1 rounded transition-colors ${
                responsivenessFilter === 'all'
                  ? 'bg-surface-active text-white font-bold'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              ALL SPEEDS
            </button>
            <button
              type="button"
              onClick={() => setResponsivenessFilter('Fast')}
              className={`px-2 py-1 rounded transition-colors ${
                responsivenessFilter === 'Fast'
                  ? 'bg-surface-active text-status-merged font-bold'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              FAST (&lt;12H)
            </button>
            <button
              type="button"
              onClick={() => setResponsivenessFilter('Moderate')}
              className={`px-2 py-1 rounded transition-colors ${
                responsivenessFilter === 'Moderate'
                  ? 'bg-surface-active text-amber-400 font-bold'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              MODERATE
            </button>
            <button
              type="button"
              onClick={() => setResponsivenessFilter('Slow')}
              className={`px-2 py-1 rounded transition-colors ${
                responsivenessFilter === 'Slow'
                  ? 'bg-surface-active text-status-closed font-bold'
                  : 'text-text-muted hover:text-white'
              }`}
            >
              SLOW
            </button>
          </div>
        </div>

        {/* Sort selector matching custom theme */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-3.5 w-3.5 text-text-muted" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-surface-card border border-border-subtle rounded-lg px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-border-active cursor-pointer"
          >
            <option value="total">SORT: MOST ACTIVE</option>
            <option value="responsiveness">SORT: FASTEST RESPONSE</option>
            <option value="acceptance">SORT: HIGHEST ACCEPTANCE</option>
            <option value="activity">SORT: RECENT ACTIVITY</option>
          </select>
        </div>
      </div>

      {/* Repositories Grid */}
      {filteredRepos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredRepos.map((item) => {
            const isGitlab = item.platform === 'gitlab';
            return (
              <div
                key={`${item.platform}:${item.repo}`}
                className="chrome-card border border-border-subtle hover:border-border-bold rounded-xl p-4 transition-all shadow-card hover:shadow-card-hover hover:-translate-y-0.5 flex flex-col justify-between group"
              >
                <div>
                  {/* Top Badges & Actions */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                          isGitlab
                            ? 'border border-platform-gitlab/40 bg-platform-gitlab/10 text-platform-gitlab'
                            : 'border border-platform-github/40 bg-platform-github/10 text-text-primary'
                        }`}
                      >
                        {isGitlab ? 'GL' : 'GH'}
                      </span>

                      {/* Responsiveness badge */}
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider border ${
                          item.responsiveness === 'Fast'
                            ? 'border-status-merged/40 bg-status-merged/10 text-status-merged'
                            : item.responsiveness === 'Moderate'
                            ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                            : item.responsiveness === 'Slow'
                            ? 'border-status-closed/40 bg-status-closed/10 text-status-closed'
                            : 'border-border-subtle bg-surface text-text-muted'
                        }`}
                      >
                        {item.responsiveness === 'Fast' && 'FAST'}
                        {item.responsiveness === 'Moderate' && 'MODERATE'}
                        {item.responsiveness === 'Slow' && 'SLOW'}
                        {item.responsiveness === 'Pending' && 'PENDING'}
                      </span>

                      {/* Health badge */}
                      {item.health === 'Attention Required' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border border-status-action-needed/40 bg-status-action-needed/10 text-status-action-needed">
                          ATTENTION
                        </span>
                      )}
                    </div>

                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text-muted hover:text-white transition-colors p-1 rounded hover:bg-surface-elevated"
                      title="Open repository in browser"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  {/* Repository Title */}
                  <h3 className="text-sm font-mono font-bold text-white break-all group-hover:text-accent-sapphire transition-colors">
                    {item.repo}
                  </h3>

                  {/* Turnaround & Activity metadata */}
                  <div className="flex items-center gap-3 mt-2 text-[11px] font-mono text-text-muted">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-text-muted" />
                      {formatTurnaround(item.medianFirstReviewHours)}
                    </span>
                    <span>•</span>
                    <span>Active {formatLastActivity(item.lastActivityAt)}</span>
                  </div>

                  {/* Acceptance Rate Bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] font-mono text-text-muted mb-1">
                      <span>Acceptance Rate</span>
                      <span className="font-bold text-white">{item.acceptanceRate}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden border border-border-subtle/50">
                      <div
                        className="h-full bg-status-merged rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, item.acceptanceRate))}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom Stats & Quick Action Button */}
                <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-mono text-text-muted">
                    <span className="text-white font-semibold">{item.totalContributions} PRs</span>
                    {item.openContributions > 0 && (
                      <span className="text-status-awaiting-reply">
                        {item.openContributions} open
                      </span>
                    )}
                    {item.mergedContributions > 0 && (
                      <span className="text-status-merged">
                        {item.mergedContributions} merged
                      </span>
                    )}
                    {item.actionNeededCount > 0 && (
                      <span className="text-status-action-needed font-bold">
                        {item.actionNeededCount} action
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectRepoFilter(item.repo)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface hover:bg-surface-elevated border border-border-subtle hover:border-border-active text-xs font-mono text-accent-sapphire transition-all cursor-pointer shadow-sm"
                  >
                    <GitPullRequest className="h-3 w-3" />
                    <span>Filter Stream</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border border-dashed border-border-subtle bg-surface/50 rounded-xl p-10 text-center my-auto flex flex-col items-center justify-center">
          <FolderGit2 className="h-10 w-10 text-text-muted/40 mb-3" />
          <h3 className="text-sm font-sans font-bold text-white uppercase tracking-wider">
            No matching repositories
          </h3>
          <p className="text-xs font-mono text-text-muted max-w-md mt-1">
            No tracked repositories match the current search query or filter parameters.
          </p>
          {(search || platformFilter !== 'all' || responsivenessFilter !== 'all' || healthFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPlatformFilter('all');
                setResponsivenessFilter('all');
                setHealthFilter('all');
              }}
              className="mt-3 px-3 py-1.5 rounded-lg border border-border-subtle bg-surface-card hover:bg-surface-active text-xs font-mono text-white transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      )}

      <Footer
        variant="dashboard"
        onNavigateView={onNavigateView}
        onOpenCookiePreferences={onOpenCookiePreferences}
      />
    </div>
  );
};
