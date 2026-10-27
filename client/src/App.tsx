import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import axios from 'axios';
import { Contribution, Stats, ActivityEvent } from './types';
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
import { CookiePreferencesModal } from './components/CookiePreferencesModal';
import { DeveloperNotesModal } from './components/DeveloperNotesModal';
import { MobileBottomDock } from './components/MobileBottomDock';
import { OfflineBanner } from './components/OfflineBanner';
import { useViewRouting } from './hooks/useViewRouting';
import { useTheme } from './hooks/useTheme';
import { AnalyticsView } from './components/views/AnalyticsView';
import { RepositoriesView } from './components/views/RepositoriesView';
import { SettingsView } from './components/views/SettingsView';
import { SecurityPolicyView } from './components/views/SecurityPolicyView';
import { AboutView } from './components/views/AboutView';
import { CopilotChatWidget, QuerySolverAction } from './components/CopilotChatWidget';

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
  const { user, integrations, refreshUser, refreshIntegrations } = useAuth();
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
  const [timeframeFilter, setTimeframeFilter] = useState<string>('all');
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
  const [isCookieModalOpen, setIsCookieModalOpen] = useState<boolean>(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState<boolean>(false);

  const prevItemsRef = React.useRef<Map<string, { status: string; action_needed: string }>>(new Map());
  const isInitialMount = React.useRef<boolean>(true);

  
  const activeFilteredContributions = React.useMemo(() => {
    const rawList = user ? contributions : [];
    if (!rawList.length) return [];

    return rawList
      .filter((c) => {
        if (platformFilter !== 'all' && c.platform !== platformFilter) return false;

        if (timeframeFilter !== 'all') {
          const nowTime = Date.now();
          const todayDateStr = new Date(nowTime).toISOString().split('T')[0];
          const yesterdayObj = new Date(nowTime - 24 * 3600 * 1000);
          const yesterdayDateStr = yesterdayObj.toISOString().split('T')[0];
          const itemDate = (c.last_activity_at || c.created_at || '').split('T')[0];
          const diffHours = (nowTime - new Date(c.last_activity_at || c.created_at).getTime()) / (1000 * 3600);

          if (timeframeFilter === 'yesterday') {
            if (itemDate !== yesterdayDateStr && (diffHours < 12 || diffHours > 48)) {
              return false;
            }
          } else if (timeframeFilter === 'today') {
            if (itemDate !== todayDateStr) return false;
          } else if (timeframeFilter === 'week') {
            const diffDays = (nowTime - new Date(c.last_activity_at || c.created_at).getTime()) / (1000 * 3600 * 24);
            if (diffDays > 7) return false;
          }
        }

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
  }, [user, contributions, platformFilter, timeframeFilter, statusFilter, actionFilter, debouncedSearch, sortBy]);

  const activeStats = user ? stats : {
    total: 0,
    actionNeeded: 0,
    awaitingMaintainer: 0,
    merged: 0,
    closed: 0,
    unreadCount: 0,
    lastSync: null
  };

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
            timeframe: timeframeFilter !== 'all' ? timeframeFilter : undefined,
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
    [statusFilter, platformFilter, timeframeFilter, actionFilter, scopeFilter, debouncedSearch, sortBy]
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

  // Handle OAuth callback parameters in URL
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const oauthStatus = params.get('oauth');
    const oauthSetup = params.get('oauth_setup');
    const oauthError = params.get('error');

    if (oauthStatus === 'success') {
      params.delete('oauth');
      const newQuery = params.toString();
      const newUrl = window.location.pathname + (newQuery ? `?${newQuery}` : '') + window.location.hash;
      window.history.replaceState({}, document.title, newUrl);

      refreshUser();
      refreshIntegrations();
      fetchStats();
      fetchContributions();
    } else if (oauthSetup) {
      setIsIntegrationsModalOpen(true);
    } else if (oauthError) {
      console.warn('OAuth flow warning:', oauthError);
      params.delete('error');
      params.delete('provider');
      params.delete('message');
      const newQuery = params.toString();
      const newUrl = window.location.pathname + (newQuery ? `?${newQuery}` : '') + window.location.hash;
      window.history.replaceState({}, document.title, newUrl);
      if (!user) {
        setIsAuthModalOpen(true);
      }
    }
  }, [refreshUser, refreshIntegrations, fetchStats, fetchContributions, user]);

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
        const apiBase = (import.meta.env.VITE_API_BASE_URL || '') as string;
        eventSource = new EventSource(`${apiBase}/api/events`, { withCredentials: true } as any);

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
    setTimeframeFilter('all');
    setScopeFilter('all');
    setSearchQuery('');
    setSortBy('recent');
  };

  // Trigger sync
  const handleSync = async () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    try {
      setIsSyncing(true);
      const res = await axios.post('/api/sync');
      if (res.data?.syncedAt) {
        setStats(prev => prev ? { ...prev, lastSync: res.data.syncedAt } : null);
      }
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

  // Automated action dispatcher for Query Solver
  const handleExecuteSolverAction = useCallback(
    (action: QuerySolverAction) => {
      switch (action.type) {
        case 'NAVIGATE_VIEW':
          if (typeof action.payload === 'string') {
            setViewMode(action.payload as any);
          }
          break;
        case 'FILTER_STATUS':
          if (typeof action.payload === 'string') {
            const val = action.payload.toLowerCase();
            if (val === 'in_review' || val === 'in-review' || val === 'review') {
              setStatusFilter('active');
            } else if (val === 'action_needed' || val === 'action-needed' || val === 'action') {
              setStatusFilter('action-needed');
            } else {
              setStatusFilter(val);
            }
          }
          break;
        case 'FILTER_PLATFORM':
          if (typeof action.payload === 'string') {
            setPlatformFilter(action.payload.toLowerCase());
          }
          break;
        case 'FILTER_TIMEFRAME':
          if (typeof action.payload === 'string') {
            setTimeframeFilter(action.payload.toLowerCase());
          }
          break;
        case 'FILTER_ACTION':
          if (typeof action.payload === 'string') {
            setActionFilter(action.payload);
          }
          break;
        case 'SET_SEARCH':
          if (typeof action.payload === 'string') {
            setSearchQuery(action.payload);
            setDebouncedSearch(action.payload);
          }
          break;
        case 'CLEAR_FILTERS':
          handleResetFilters();
          break;
        case 'OPEN_ITEM':
          if (action.payload) {
            const query = String(action.payload).toLowerCase();
            const target = activeFilteredContributions.find(
              (c) =>
                c.id.toLowerCase() === query ||
                String(c.number) === query ||
                c.repo.toLowerCase().includes(query) ||
                c.title.toLowerCase().includes(query)
            );
            if (target) {
              setSelectedId(target.id);
            } else {
              setSelectedId(String(action.payload));
            }
          }
          break;
        case 'CLOSE_ITEM':
          setSelectedId(null);
          break;
        case 'TOGGLE_THEME':
          if (action.payload === 'light') {
            if (theme !== 'light') toggleTheme();
          } else if (action.payload === 'dark') {
            if (theme !== 'dark') toggleTheme();
          } else {
            toggleTheme();
          }
          break;
        case 'TRIGGER_SYNC':
          handleSync();
          break;
        case 'OPEN_TRACK_MODAL':
          setIsTrackModalOpen(true);
          break;
        case 'OPEN_GUIDE_MODAL':
          setIsGuideModalOpen(true);
          break;
        case 'ADD_NOTE':
          if (action.payload) {
            const content = typeof action.payload === 'object' ? action.payload.content : String(action.payload);
            const targetDate = typeof action.payload === 'object' ? action.payload.targetDate : undefined;
            axios.post('/api/notes', { content, targetDate })
              .catch((err) => console.error('Failed to persist note from solver action:', err));
          }
          break;
        case 'SHOW_NOTES':
          setIsNotesModalOpen(true);
          break;
        default:
          console.warn('Unknown solver action:', action.type);
      }
    },
    [setViewMode, handleResetFilters, activeFilteredContributions, theme, toggleTheme, handleSync]
  );

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
        if (isCookieModalOpen) {
          setIsCookieModalOpen(false);
        } else if (isAuthModalOpen) {
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
    isCookieModalOpen,
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
  useModalHistory(isCookieModalOpen, () => setIsCookieModalOpen(false), 'cookie-preferences');
  useModalHistory(isNotesModalOpen, () => setIsNotesModalOpen(false), 'notes');

  const handleSelectItem = (id: string) => {
    setSelectedId(id);
    if (user) {
      setContributions((prev) =>
        prev.map((c) => (c.id === id && c.unread === 1 ? { ...c, unread: 0 } : c))
      );
      setStats((prev) =>
        prev && prev.unreadCount > 0 ? { ...prev, unreadCount: prev.unreadCount - 1 } : prev
      );
    }
  };

  return (
    <div className="flex min-h-screen min-h-[100dvh] w-full flex-col bg-base diffused-bg text-text-primary selection:bg-accent-sapphire selection:text-white antialiased">
      {/* Offline Status / Reconnection Resilience Banner */}
      <OfflineBanner />

      <div className="flex-1 flex flex-col w-full px-3 py-2 sm:py-2.5 mx-auto">
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
          
        />

        {/* Demo Mode Alert Banner */}
        

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

                {timeframeFilter !== 'all' && (
                  <div className="flex items-center justify-between gap-2 px-3.5 py-2 mb-2 bg-accent-sapphire/15 border border-accent-sapphire/35 rounded-xl text-xs font-mono text-accent-sapphire shadow-xs">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2 w-2 rounded-full bg-accent-sapphire animate-ping" />
                      <span>Timeframe Filter Active: <strong>{timeframeFilter.toUpperCase()}</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTimeframeFilter('all')}
                      className="px-2.5 py-1 rounded-md bg-surface-card hover:bg-surface-elevated border border-border-subtle text-[11px] text-text-primary hover:text-white cursor-pointer transition-colors"
                    >
                      Reset Timeframe
                    </button>
                  </div>
                )}

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
                    isAuthenticated={Boolean(user)}
                    onOpenAuthModal={() => setIsAuthModalOpen(true)}
                    onNavigateView={setViewMode}
                    onOpenCookiePreferences={() => setIsCookieModalOpen(true)}
                  />
                </main>
              </>
            )}

            {viewMode === 'analytics' && (
              <main className="flex-1 flex flex-col min-h-0 relative">
                <AnalyticsView
                  stats={activeStats}
                  onNavigateView={setViewMode}
                  onOpenCookiePreferences={() => setIsCookieModalOpen(true)}
                />
              </main>
            )}

            {viewMode === 'repos' && (
              <main className="flex-1 flex flex-col min-h-0 relative">
                <RepositoriesView
                  contributions={activeFilteredContributions}
                  onSelectRepoFilter={(repo) => {
                    setSearchQuery(repo);
                    setViewMode('stream');
                  }}
                  onNavigateView={setViewMode}
                  onOpenCookiePreferences={() => setIsCookieModalOpen(true)}
                />
              </main>
            )}

            {viewMode === 'settings' && (
              <main className="flex-1 flex flex-col min-h-0 relative">
                <SettingsView
                  onNavigateView={setViewMode}
                  onOpenCookiePreferences={() => setIsCookieModalOpen(true)}
                />
              </main>
            )}

            {viewMode === 'security' && (
              <main className="flex-1 flex flex-col min-h-0 relative">
                <SecurityPolicyView
                  onBack={() => setViewMode('stream')}
                  onNavigateView={setViewMode}
                  onOpenCookiePreferences={() => setIsCookieModalOpen(true)}
                />
              </main>
            )}

            {viewMode === 'about' && (
              <main className="flex-1 flex flex-col min-h-0 relative">
                <AboutView
                  onBack={() => setViewMode('stream')}
                  onNavigateView={setViewMode}
                  onOpenCookiePreferences={() => setIsCookieModalOpen(true)}
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
          fetchStats();
          fetchContributions(false);
        }}
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

      {/* Cookie & Storage Preferences Modal */}
      <CookiePreferencesModal
        isOpen={isCookieModalOpen}
        onClose={() => setIsCookieModalOpen(false)}
      />

      {/* Developer Notes & Tasks Ledger Modal */}
      <DeveloperNotesModal
        isOpen={isNotesModalOpen}
        onClose={() => setIsNotesModalOpen(false)}
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

      {/* Dedicated Floating OSS Query Solver Widget */}
      <CopilotChatWidget
        contributions={activeFilteredContributions}
        currentView={viewMode}
        currentTheme={theme}
        onExecuteAction={handleExecuteSolverAction}
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
