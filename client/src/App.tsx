import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import axios from 'axios';
import { Contribution, Stats, ActivityEvent } from './types';
import {
  FALLBACK_DEMO_CONTRIBUTIONS,
  FALLBACK_DEMO_EVENTS,
  FALLBACK_DEMO_STATS,
  FALLBACK_DEMO_ANALYTICS,
  FALLBACK_DEMO_REPOSITORIES,
  DemoAnalyticsData,
  DemoRepoItem,
} from './data/demoDataset';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { HeaderTelemetry } from './components/HeaderTelemetry';
import { FilterRail } from './components/FilterRail';
import { ContributionList } from './components/ContributionList';
import { SlideOverDetail } from './components/SlideOverDetail';
import { CommandPalette } from './components/CommandPalette';
import { TrackContributionModal } from './components/TrackContributionModal';
import { QuickGuideModal } from './components/QuickGuideModal';
import { AuthModal } from './components/AuthModal';
import { IntegrationsModal } from './components/IntegrationsModal';
import { MobileBottomDock } from './components/MobileBottomDock';
import { OfflineBanner } from './components/OfflineBanner';
import { useViewRouting } from './hooks/useViewRouting';
import { useTheme } from './hooks/useTheme';
import { AnalyticsView } from './components/views/AnalyticsView';
import { RepositoriesView } from './components/views/RepositoriesView';
import { SettingsView } from './components/views/SettingsView';
import { SecurityPolicyView } from './components/views/SecurityPolicyView';
import { AboutView } from './components/views/AboutView';

import { sendDesktopNotification } from './utils/notifications';

// Sync mobile hardware back button and browser navigation with modal lifecycles
function useModalHistory(isOpen: boolean, onClose: () => void, modalKey: string) {
  const wasOpenRef = React.useRef<boolean>(isOpen);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      window.history.pushState({ modal: modalKey }, '');
    } else if (!isOpen && wasOpenRef.current) {
      if (window.history.state?.modal === modalKey) {
        window.history.back();
      }
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, modalKey]);

  useEffect(() => {
    const handlePopState = () => {
      if (wasOpenRef.current && window.history.state?.modal !== modalKey) {
        onClose();
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [modalKey, onClose]);
}

const AppContent: React.FC = () => {
  const { user, integrations } = useAuth();
  const { viewMode, setViewMode } = useViewRouting();
  const { theme, toggleTheme } = useTheme();

  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState<boolean>(false);

  // Filters state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('recent');

  // Modals state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState<boolean>(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isIntegrationsModalOpen, setIsIntegrationsModalOpen] = useState<boolean>(false);

  const prevItemsRef = React.useRef<Map<string, { status: string; action_needed: string }>>(new Map());
  const isInitialMount = React.useRef<boolean>(true);

  // Demo Sandbox State
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') === 'true' || params.get('demo') === '1') return true;
    if (params.get('demo') === 'false' || params.get('demo') === '0') return false;
    const stored = localStorage.getItem('oss_demo_mode');
    if (stored !== null) return stored === 'true';
    return true; // Default to true for new visitors to explore immediately
  });

  const [demoContributions, setDemoContributions] = useState<Contribution[]>(FALLBACK_DEMO_CONTRIBUTIONS);
  const [demoEvents, setDemoEvents] = useState<ActivityEvent[]>(FALLBACK_DEMO_EVENTS);
  const [demoStats, setDemoStats] = useState<Stats>(FALLBACK_DEMO_STATS);
  const [demoAnalytics, setDemoAnalytics] = useState<DemoAnalyticsData>(FALLBACK_DEMO_ANALYTICS);
  const [demoRepositories, setDemoRepositories] = useState<DemoRepoItem[]>(FALLBACK_DEMO_REPOSITORIES);

  const isDemoActive = !user && isDemoMode;

  // Fetch curated demo dataset for unauthenticated sandbox exploration
  useEffect(() => {
    if (user) return;
    axios.get('/api/demo/dataset')
      .then(res => {
        if (res.data) {
          if (Array.isArray(res.data.contributions)) setDemoContributions(res.data.contributions);
          if (Array.isArray(res.data.activityEvents)) setDemoEvents(res.data.activityEvents);
          if (res.data.stats) setDemoStats(res.data.stats);
          if (res.data.analytics) setDemoAnalytics(res.data.analytics);
          if (Array.isArray(res.data.repositories)) setDemoRepositories(res.data.repositories);
        }
      })
      .catch(err => {
        console.warn('Using client-side fallback demo dataset:', err);
      });
  }, [user]);

  const handleToggleDemoMode = useCallback(() => {
    setIsDemoMode(prev => {
      const next = !prev;
      localStorage.setItem('oss_demo_mode', String(next));
      return next;
    });
  }, []);

  const handleDemoMarkRead = useCallback((id: string) => {
    setDemoContributions(prev => prev.map(c => {
      if (c.id === id && c.unread) {
        return { ...c, unread: 0, last_viewed_at: new Date().toISOString() };
      }
      return c;
    }));
    setDemoStats(prev => ({
      ...prev,
      unreadCount: Math.max(0, prev.unreadCount - 1)
    }));
  }, []);

  const handleDemoUpdateNotes = useCallback((id: string, notes: string, actionNeeded: 'reply' | 'push-changes' | 'none') => {
    setDemoContributions(prev => {
      const updated = prev.map(c => (c.id === id ? { ...c, notes, action_needed: actionNeeded } : c));
      const actionCount = updated.filter(c => c.action_needed !== 'none').length;
      setDemoStats(s => ({ ...s, actionNeeded: actionCount }));
      return updated;
    });
  }, []);

  const handleDemoAddEvent = useCallback((id: string, event: ActivityEvent) => {
    setDemoEvents(prev => [event, ...prev]);
    setDemoContributions(prev => prev.map(c => (c.id === id ? { ...c, last_activity_at: event.created_at } : c)));
  }, []);

  const handleDemoTrackUrl = useCallback((rawUrl: string) => {
    const trimmed = rawUrl.trim();
    const ghMatch = trimmed.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/(pull|issues)\/(\d+)/i);
    const glMatch = trimmed.match(/^https?:\/\/([^\/]+)\/(.+?)\/-\/(merge_requests|issues)\/(\d+)/i);

    if (!ghMatch && !glMatch) return null;

    const now = new Date().toISOString();
    let newItem: Contribution;

    if (ghMatch) {
      const [, owner, repoName, rawType, rawNumber] = ghMatch;
      const repo = `${owner}/${repoName}`;
      const number = parseInt(rawNumber, 10);
      const type: 'pr' | 'issue' = rawType.toLowerCase() === 'pull' ? 'pr' : 'issue';
      const id = `gh:${repo}#${number}`;

      newItem = {
        id,
        platform: 'github',
        repo,
        number,
        title: `Simulated tracking: ${repo}#${number}`,
        type,
        url: trimmed,
        author: 'demo_contributor',
        status: 'open',
        action_needed: 'none',
        difficulty: 'medium',
        bounty_amount: null,
        created_at: now,
        last_activity_at: now,
        last_synced_at: now,
        unread: 1,
        notes: 'Tracked in interactive Demo Sandbox mode.'
      };
    } else {
      const [, , projectPath, rawType, rawNumber] = glMatch!;
      const number = parseInt(rawNumber, 10);
      const type: 'pr' | 'issue' = rawType.toLowerCase() === 'merge_requests' ? 'pr' : 'issue';
      const id = `gl:${projectPath}!${number}`;

      newItem = {
        id,
        platform: 'gitlab',
        repo: projectPath,
        number,
        title: `Simulated tracking: ${projectPath}!${number}`,
        type,
        url: trimmed,
        author: 'demo_contributor',
        status: 'open',
        action_needed: 'none',
        difficulty: 'medium',
        bounty_amount: null,
        created_at: now,
        last_activity_at: now,
        last_synced_at: now,
        unread: 1,
        notes: 'Tracked in interactive Demo Sandbox mode.'
      };
    }

    setDemoContributions(prev => [newItem, ...prev]);
    setDemoStats(prev => ({
      ...prev,
      total: prev.total + 1,
      unreadCount: prev.unreadCount + 1,
    }));

    setDemoEvents(prev => [
      {
        id: `demo_init_${Date.now()}`,
        contribution_id: newItem.id,
        actor: 'demo_contributor',
        type: 'status-change',
        review_state: null,
        body_excerpt: `Tracked contribution: ${newItem.title}`,
        created_at: now
      },
      ...prev
    ]);

    return newItem;
  }, []);

  // Compute reactive active contributions in demo mode or live mode
  const activeFilteredContributions = React.useMemo(() => {
    if (user) return contributions;
    if (!isDemoMode) return [];

    return demoContributions
      .filter((c) => {
        if (platformFilter !== 'all' && c.platform !== platformFilter) return false;

        if (statusFilter !== 'all') {
          const cStatus = (c.status === 'opened' ? 'open' : c.status).toLowerCase();
          if (statusFilter === 'active') {
            const isActive = ['open', 'submitted', 'in_review', 'awaiting-reply'].includes(cStatus);
            if (!isActive) return false;
          } else if (statusFilter === 'stale') {
            const days = (Date.now() - new Date(c.last_activity_at).getTime()) / (1000 * 3600 * 24);
            if (days < 30) return false;
          } else if (statusFilter === 'action-needed') {
            if (c.action_needed === 'none') return false;
          } else if (statusFilter === 'in_review' || statusFilter === 'in-review') {
            if (cStatus !== 'in_review' && c.action_needed !== 'push-changes') return false;
          } else if (cStatus !== statusFilter) {
            return false;
          }
        }

        if (actionFilter !== 'all') {
          if (actionFilter === 'action-needed' || actionFilter === 'needed') {
            if (c.action_needed === 'none') return false;
          } else if (c.action_needed !== actionFilter) {
            return false;
          }
        }

        if (debouncedSearch) {
          const q = debouncedSearch.toLowerCase();
          const match =
            c.title.toLowerCase().includes(q) ||
            c.repo.toLowerCase().includes(q) ||
            c.id.toLowerCase().includes(q);
          if (!match) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'unread') {
          return (b.unread ?? 0) - (a.unread ?? 0);
        }
        if (sortBy === 'difficulty') {
          const rank = { hard: 1, medium: 2, easy: 3 };
          const diffA = rank[a.difficulty || 'medium'] || 2;
          const diffB = rank[b.difficulty || 'medium'] || 2;
          return diffA - diffB;
        }
        return new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime();
      });
  }, [user, isDemoMode, contributions, demoContributions, platformFilter, statusFilter, actionFilter, debouncedSearch, sortBy]);

  const activeStats = user ? stats : (isDemoMode ? demoStats : {
    total: 0,
    actionNeeded: 0,
    awaitingMaintainer: 0,
    merged: 0,
    closed: 0,
    unreadCount: 0,
    lastSync: null
  });

  // Debounce search query to prevent input jitter
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 120);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch telemetry stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get('/api/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  // Fetch contributions matching current filters without unmounting the list
  const fetchContributions = useCallback(
    async (isInitial = false) => {
      try {
        if (isInitial) {
          setIsLoading(true);
        } else {
          setIsRefreshing(true);
        }
        const res = await axios.get('/api/contributions', {
          params: {
            status: statusFilter,
            platform: platformFilter,
            action: actionFilter,
            scope: scopeFilter !== 'all' ? scopeFilter : undefined,
            search: debouncedSearch || undefined,
            sort: sortBy,
          },
        });
        setContributions(Array.isArray(res.data) ? res.data : (res.data?.items || []));
      } catch (err) {
        console.error('Failed to fetch contributions:', err);
      } finally {
        if (isInitial) {
          setIsLoading(false);
        } else {
          setIsRefreshing(false);
        }
      }
    },
    [statusFilter, platformFilter, actionFilter, scopeFilter, debouncedSearch, sortBy]
  );

  // Initial load and filter change updates
  useEffect(() => {
    if (!user) {
      setContributions([]);
      setStats({
        total: 0,
        actionNeeded: 0,
        awaitingMaintainer: 0,
        merged: 0,
        closed: 0,
        unreadCount: 0,
        lastSync: null,
      });
      setIsLoading(false);
      isInitialMount.current = true;
      return;
    }

    if (isInitialMount.current) {
      isInitialMount.current = false;
      fetchStats();
      fetchContributions(true);
    } else {
      fetchContributions(false);
    }
  }, [fetchStats, fetchContributions, user]);

  // Handle immediate state purge on logout
  useEffect(() => {
    const handleLogout = () => {
      setContributions([]);
      setStats({
        total: 0,
        actionNeeded: 0,
        awaitingMaintainer: 0,
        merged: 0,
        closed: 0,
        unreadCount: 0,
        lastSync: null
      });
      setSelectedId(null);
      setIsIntegrationsModalOpen(false);
    };
    window.addEventListener('oss:auth:logout', handleLogout);
    return () => window.removeEventListener('oss:auth:logout', handleLogout);
  }, []);

  // Handle unauthorized session expiration across the application
  useEffect(() => {
    const handleUnauthorized = () => {
      setIsIntegrationsModalOpen(false);
      setIsAuthModalOpen(true);
    };
    window.addEventListener('oss:auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('oss:auth:unauthorized', handleUnauthorized);
  }, []);

  // Check for updates and notify desktop/audio
  useEffect(() => {
    if (!user || contributions.length === 0 || prevItemsRef.current.size === 0) return;
    for (const item of contributions) {
      const prev = prevItemsRef.current.get(item.id);
      if (prev) {
        if (prev.status !== 'merged' && item.status === 'merged') {
          sendDesktopNotification(
            '🎉 PR Merged Upstream!',
            `Your contribution to ${item.repo} was accepted and merged!`,
            () => setSelectedId(item.id)
          );
        } else if (prev.action_needed === 'none' && item.action_needed !== 'none') {
          const label = item.action_needed === 'push-changes' ? 'requested code updates' : 'left a reply';
          sendDesktopNotification(
            `🔔 Maintainer Action: ${item.repo}`,
            `Maintainer ${label} on "${item.title}".`,
            () => setSelectedId(item.id)
          );
        }
      }
    }

    const nextMap = new Map();
    for (const item of contributions) {
      nextMap.set(item.id, { status: item.status, action_needed: item.action_needed });
    }
    prevItemsRef.current = nextMap;
  }, [contributions, user]);

  // 30s background polling for authenticated users only
  useEffect(() => {
    if (!user) return;
    const timer = setInterval(() => {
      fetchStats();
      fetchContributions();
    }, 30000);
    return () => clearInterval(timer);
  }, [fetchStats, fetchContributions, user]);

  // Real-time Server-Sent Events (SSE) listener for instantaneous updates
  useEffect(() => {
    if (!user) return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const connectSSE = () => {
      try {
        eventSource = new EventSource('/api/events');

        const handleLiveUpdate = () => {
          fetchStats();
          fetchContributions(false);
        };

        eventSource.addEventListener('contribution_updated', handleLiveUpdate);
        eventSource.addEventListener('contribution_created', handleLiveUpdate);

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          reconnectTimeout = setTimeout(connectSSE, 5000);
        };
      } catch (err) {
        console.error('SSE initialization error:', err);
      }
    };

    connectSSE();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [user, fetchStats, fetchContributions]);

  const handleResetFilters = () => {
    setStatusFilter('all');
    setActionFilter('all');
    setPlatformFilter('all');
    setScopeFilter('all');
    setSearchQuery('');
    setSortBy('recent');
  };

  // Trigger sync
  const handleSync = async () => {
    if (!user) {
      if (isDemoMode) {
        setIsSyncing(true);
        setTimeout(() => {
          setIsSyncing(false);
        }, 400);
        return;
      }
      setIsAuthModalOpen(true);
      return;
    }
    try {
      setIsSyncing(true);
      await axios.post('/api/sync');
      await Promise.all([fetchStats(), fetchContributions()]);
    } catch (err: any) {
      console.error('Sync failed:', err);
      if (err.response?.status === 401) {
        setIsAuthModalOpen(true);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Global keybindings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      } else if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsGuideModalOpen(true);
      } else if (e.key === 'Escape') {
        if (isAuthModalOpen) {
          setIsAuthModalOpen(false);
        } else if (isIntegrationsModalOpen) {
          setIsIntegrationsModalOpen(false);
        } else if (isTrackModalOpen) {
          setIsTrackModalOpen(false);
        } else if (isGuideModalOpen) {
          setIsGuideModalOpen(false);
        } else if (isCommandPaletteOpen) {
          setIsCommandPaletteOpen(false);
        } else if (selectedId) {
          setSelectedId(null);
        } else if (viewMode === 'about' || viewMode === 'security') {
          setViewMode('stream');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isCommandPaletteOpen,
    isTrackModalOpen,
    isGuideModalOpen,
    isAuthModalOpen,
    isIntegrationsModalOpen,
    selectedId,
    viewMode,
    setViewMode,
  ]);

  // Sync mobile hardware back button and browser navigation with active modals
  useModalHistory(Boolean(selectedId), () => setSelectedId(null), 'detail');
  useModalHistory(isTrackModalOpen, () => setIsTrackModalOpen(false), 'track');
  useModalHistory(isIntegrationsModalOpen, () => setIsIntegrationsModalOpen(false), 'vault');
  useModalHistory(isGuideModalOpen, () => setIsGuideModalOpen(false), 'guide');
  useModalHistory(isAuthModalOpen, () => setIsAuthModalOpen(false), 'auth');
  useModalHistory(isCommandPaletteOpen, () => setIsCommandPaletteOpen(false), 'command-palette');

  const handleSelectItem = (id: string) => {
    setSelectedId(id);
    if (user) {
      setContributions((prev) =>
        prev.map((c) => (c.id === id && c.unread === 1 ? { ...c, unread: 0 } : c))
      );
      setStats((prev) =>
        prev && prev.unreadCount > 0 ? { ...prev, unreadCount: prev.unreadCount - 1 } : prev
      );
    } else if (isDemoMode) {
      handleDemoMarkRead(id);
    }
  };

  return (
    <div className="flex h-screen h-[100dvh] min-h-[100dvh] flex-col bg-base diffused-bg text-text-primary selection:bg-accent-sapphire selection:text-white antialiased overflow-hidden">
      {/* Offline Status / Reconnection Resilience Banner */}
      <OfflineBanner />

      <div className="flex-1 flex flex-col min-h-0 w-full px-3 sm:px-6 lg:px-8 py-2 sm:py-3.5">
        {/* Compact Single-Tier Header */}
        <HeaderTelemetry
          stats={activeStats}
          onSync={handleSync}
          isSyncing={isSyncing}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenTrackModal={() => setIsTrackModalOpen(true)}
          onOpenGuideModal={() => setIsGuideModalOpen(true)}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onOpenIntegrationsModal={() => setIsIntegrationsModalOpen(true)}
          isDemoMode={isDemoMode}
          onToggleDemoMode={handleToggleDemoMode}
        />

        {/* Demo Mode Alert Banner */}
        {isDemoActive && (
          <div className="flex items-center justify-between gap-3 px-3.5 py-2 mb-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs font-mono text-text-primary shadow-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <span className="font-bold text-amber-300 shrink-0">DEMO SANDBOX ACTIVE:</span>
              <span className="text-text-secondary truncate hidden sm:inline">
                Exploring simulated open-source telemetry across React, Linux, Inkscape, Next.js, and Antigravity.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="px-2.5 py-1 bg-accent-sapphire hover:bg-accent-sapphire/90 text-white rounded-md font-bold text-[11px] transition-colors cursor-pointer"
              >
                CONNECT ACCOUNT
              </button>
              <button
                type="button"
                onClick={handleToggleDemoMode}
                className="px-2 py-1 border border-border-subtle bg-surface-card hover:bg-surface-elevated text-text-muted hover:text-white rounded-md text-[11px] transition-colors cursor-pointer"
              >
                EXIT DEMO
              </button>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, y: 8, filter: 'blur(3px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(3px)' }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 flex flex-col min-h-0 relative w-full"
          >
            {viewMode === 'stream' && (
              <>
                {/* Consolidated Query & KPI Filter Toolbar */}
                <FilterRail
                  stats={activeStats}
                  statusFilter={statusFilter}
                  onStatusChange={setStatusFilter}
                  platformFilter={platformFilter}
                  onPlatformChange={setPlatformFilter}
                  actionFilter={actionFilter}
                  onActionChange={setActionFilter}
                  scopeFilter={scopeFilter}
                  onScopeChange={setScopeFilter}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  sortBy={sortBy}
                  onSortChange={setSortBy}
                  isMobileFiltersOpen={isMobileFiltersOpen}
                />

                {/* Main Scannable Contribution Stream */}
                <main className="flex-1 flex flex-col min-h-0 relative">
                  <ContributionList
                    items={activeFilteredContributions}
                    selectedId={selectedId}
                    onSelectItem={handleSelectItem}
                    isLoading={isLoading}
                    isRefreshing={isRefreshing}
                    onOpenTrackModal={() => setIsTrackModalOpen(true)}
                    onResetFilters={handleResetFilters}
                    isAuthenticated={Boolean(user) || isDemoMode}
                    onOpenAuthModal={() => setIsAuthModalOpen(true)}
                    onToggleDemoMode={handleToggleDemoMode}
                  />
                </main>
              </>
            )}

            {viewMode === 'analytics' && (
              <main className="flex-1 flex flex-col min-h-0 relative">
                <AnalyticsView
                  stats={activeStats}
                  isDemoMode={isDemoActive}
                  demoAnalytics={demoAnalytics}
                />
              </main>
            )}

            {viewMode === 'repos' && (
              <main className="flex-1 flex flex-col min-h-0 relative">
                <RepositoriesView
                  contributions={activeFilteredContributions}
                  isDemoMode={isDemoActive}
                  demoRepositories={demoRepositories}
                  onSelectRepoFilter={(repo) => {
                    setSearchQuery(repo);
                    setViewMode('stream');
                  }}
                />
              </main>
            )}

            {viewMode === 'settings' && (
              <main className="flex-1 flex flex-col min-h-0 relative">
                <SettingsView
                  onNavigateView={setViewMode}
                />
              </main>
            )}

            {viewMode === 'security' && (
              <main className="flex-1 flex flex-col min-h-0 relative">
                <SecurityPolicyView
                  onBack={() => setViewMode('stream')}
                />
              </main>
            )}

            {viewMode === 'about' && (
              <main className="flex-1 flex flex-col min-h-0 relative">
                <AboutView
                  onBack={() => setViewMode('stream')}
                  onNavigateView={setViewMode}
                />
              </main>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Slide-over Detail Inspection Drawer */}
      <SlideOverDetail
        itemId={selectedId}
        onClose={() => setSelectedId(null)}
        onItemUpdated={() => {
          if (user) {
            fetchStats();
            fetchContributions(false);
          }
        }}
        isDemoMode={isDemoActive}
        demoDataset={{
          contributions: demoContributions,
          activityEvents: demoEvents,
        }}
        onDemoUpdateNotes={handleDemoUpdateNotes}
        onDemoAddEvent={handleDemoAddEvent}
        onDemoMarkRead={handleDemoMarkRead}
      />

      {/* Command Palette Modal (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        items={activeFilteredContributions}
        onSelect={(id) => {
          setIsCommandPaletteOpen(false);
          setSelectedId(id);
        }}
      />

      {/* Ingest / Track Contribution Modal */}
      <TrackContributionModal
        isOpen={isTrackModalOpen}
        onClose={() => setIsTrackModalOpen(false)}
        onSuccess={() => {
          if (user) {
            fetchStats();
            fetchContributions();
          }
        }}
        isDemoMode={isDemoActive}
        onDemoTrackUrl={handleDemoTrackUrl}
      />

      {/* Operational Reference Guide Modal (?) */}
      <QuickGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        onNavigateView={setViewMode}
      />

      {/* User Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          fetchStats();
          fetchContributions();
        }}
      />

      {/* Integrations Management Modal */}
      <IntegrationsModal
        isOpen={isIntegrationsModalOpen}
        onClose={() => setIsIntegrationsModalOpen(false)}
        onAccountsChanged={() => {
          fetchStats();
          fetchContributions();
        }}
      />

      {/* Mobile Bottom Thumb Navigation Dock */}
      <MobileBottomDock
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onScrollToTop={() => {
          document.getElementById('stream-feed-container')?.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onRefresh={handleSync}
        onOpenTrackModal={() => setIsTrackModalOpen(true)}
        actionNeededCount={activeStats?.actionNeeded ?? 0}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
