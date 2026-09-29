import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Contribution, Stats } from './types';
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

import { sendDesktopNotification } from './utils/notifications';

const AppContent: React.FC = () => {
  const { user, integrations } = useAuth();

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
  ]);

  const handleSelectItem = (id: string) => {
    setSelectedId(id);
    setContributions((prev) =>
      prev.map((c) => (c.id === id && c.unread === 1 ? { ...c, unread: 0 } : c))
    );
    setStats((prev) =>
      prev && prev.unreadCount > 0 ? { ...prev, unreadCount: prev.unreadCount - 1 } : prev
    );
  };

  return (
    <div className="flex h-screen h-[100dvh] min-h-[100dvh] flex-col bg-base diffused-bg text-text-primary selection:bg-accent-sapphire selection:text-white antialiased overflow-hidden">
      <div className="flex-1 flex flex-col min-h-0 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-3.5">
        {/* Compact Single-Tier Header */}
        <HeaderTelemetry
          stats={stats}
          onSync={handleSync}
          isSyncing={isSyncing}
          onOpenTrackModal={() => setIsTrackModalOpen(true)}
          onOpenGuideModal={() => setIsGuideModalOpen(true)}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onOpenIntegrationsModal={() => setIsIntegrationsModalOpen(true)}
        />

        {/* Consolidated Query & KPI Filter Toolbar */}
        <FilterRail
          stats={stats}
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
            items={contributions}
            selectedId={selectedId}
            onSelectItem={handleSelectItem}
            isLoading={isLoading}
            isRefreshing={isRefreshing}
            onOpenTrackModal={() => setIsTrackModalOpen(true)}
            onResetFilters={handleResetFilters}
            isAuthenticated={Boolean(user)}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
          />
        </main>
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
        items={contributions}
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
          fetchStats();
          fetchContributions();
        }}
      />

      {/* Operational Reference Guide Modal (?) */}
      <QuickGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
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
        onScrollToTop={() => {
          document.getElementById('stream-feed-container')?.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        isFiltersOpen={isMobileFiltersOpen}
        onToggleFilters={() => setIsMobileFiltersOpen((prev) => !prev)}
        onOpenTrackModal={() => setIsTrackModalOpen(true)}
        onOpenIntegrationsModal={() => {
          if (user) {
            setIsIntegrationsModalOpen(true);
          } else {
            setIsAuthModalOpen(true);
          }
        }}
        actionNeededCount={stats?.actionNeeded ?? 0}
        integrationsCount={integrations.length}
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
