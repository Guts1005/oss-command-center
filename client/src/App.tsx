import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Contribution, Stats } from './types';
import { HeaderTelemetry } from './components/HeaderTelemetry';
import { FilterRail } from './components/FilterRail';
import { ContributionList } from './components/ContributionList';
import { SlideOverDetail } from './components/SlideOverDetail';
import { CommandPalette } from './components/CommandPalette';
import { TrackContributionModal } from './components/TrackContributionModal';
import { QuickGuideModal } from './components/QuickGuideModal';

export const App: React.FC = () => {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Filters state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('recent');

  // Modals state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isTrackModalOpen, setIsTrackModalOpen] = useState<boolean>(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);

  // Fetch telemetry stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get('/api/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  // Fetch contributions matching current filters
  const fetchContributions = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await axios.get('/api/contributions', {
        params: {
          status: statusFilter,
          platform: platformFilter,
          action: actionFilter,
          search: searchQuery || undefined,
          sort: sortBy,
        },
      });
      setContributions(Array.isArray(res.data) ? res.data : (res.data?.items || []));
    } catch (err) {
      console.error('Failed to fetch contributions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, platformFilter, actionFilter, searchQuery, sortBy]);

  // Initial load
  useEffect(() => {
    fetchStats();
    fetchContributions();
  }, [fetchStats, fetchContributions]);

  // Trigger sync
  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await axios.post('/api/sync');
      await Promise.all([fetchStats(), fetchContributions()]);
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Global keyboard shortcuts (Ctrl+K, Esc, ?)
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
        if (isTrackModalOpen) {
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
  }, [isCommandPaletteOpen, isTrackModalOpen, isGuideModalOpen, selectedId]);

  return (
    <div className="flex h-screen flex-col bg-base text-text-primary selection:bg-surface-active selection:text-white antialiased overflow-hidden">
      {/* Header with Quick Guide and Track buttons */}
      <HeaderTelemetry
        stats={stats}
        onSync={handleSync}
        isSyncing={isSyncing}
        onOpenTrackModal={() => setIsTrackModalOpen(true)}
        onOpenGuideModal={() => setIsGuideModalOpen(true)}
      />

      {/* Filter and Query Rail */}
      <FilterRail
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        platformFilter={platformFilter}
        onPlatformChange={setPlatformFilter}
        actionFilter={actionFilter}
        onActionChange={setActionFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {/* Main Scannable Contribution Stream */}
      <main className="flex-1 flex flex-col min-h-0 relative">
        <ContributionList
          items={contributions}
          selectedId={selectedId}
          onSelectItem={(id) => setSelectedId(id)}
          isLoading={isLoading}
          onOpenTrackModal={() => setIsTrackModalOpen(true)}
        />
      </main>

      {/* Slide-over Detail Inspection Drawer */}
      <SlideOverDetail
        itemId={selectedId}
        onClose={() => setSelectedId(null)}
        onItemUpdated={() => {
          fetchStats();
          fetchContributions();
        }}
      />

      {/* Command Palette Modal (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        items={contributions}
        onSelect={(id) => {
          setSelectedId(id);
          setIsCommandPaletteOpen(false);
        }}
      />

      {/* Track Contribution Modal */}
      <TrackContributionModal
        isOpen={isTrackModalOpen}
        onClose={() => setIsTrackModalOpen(false)}
        onSuccess={(newId) => {
          fetchStats();
          fetchContributions();
          setSelectedId(newId);
        }}
      />

      {/* Quick Guide & Status Legend Modal */}
      <QuickGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
      />
    </div>
  );
};

export default App;
