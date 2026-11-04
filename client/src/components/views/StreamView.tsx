import React from 'react';
import { Stats, Contribution } from '../../types';
import { FilterRail } from '../FilterRail';
import { ContributionList } from '../ContributionList';
import { HeroSection } from '../HeroSection';

export interface StreamViewProps {
  stats: Stats;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  platformFilter: string;
  onPlatformChange: (platform: string) => void;
  actionFilter: string;
  onActionChange: (action: string) => void;
  scopeFilter: string;
  onScopeChange: (scope: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  isMobileFiltersOpen: boolean;
  timeframeFilter: string;
  onResetTimeframe: () => void;
  items: Contribution[];
  selectedId: string | null;
  onSelectItem: (id: string) => void;
  isLoading: boolean;
  isRefreshing: boolean;
  onOpenTrackModal: () => void;
  onResetFilters: () => void;
  isAuthenticated: boolean;
  isDemoMode?: boolean;
  onOpenAuthModal: () => void;
  onEnterDemoMode?: () => void;
  onNavigateView: (view: any) => void;
  onOpenCookiePreferences: () => void;
}

export const StreamView: React.FC<StreamViewProps> = ({
  stats,
  statusFilter,
  onStatusChange,
  platformFilter,
  onPlatformChange,
  actionFilter,
  onActionChange,
  scopeFilter,
  onScopeChange,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  isMobileFiltersOpen,
  timeframeFilter,
  onResetTimeframe,
  items,
  selectedId,
  onSelectItem,
  isLoading,
  isRefreshing,
  onOpenTrackModal,
  onResetFilters,
  isAuthenticated,
  isDemoMode = false,
  onOpenAuthModal,
  onEnterDemoMode,
  onNavigateView,
  onOpenCookiePreferences,
}) => {
  return (
    <div className="flex-1 flex flex-col min-h-0 w-full overflow-hidden">
      {/* High-Impact Hero Cockpit */}
      <HeroSection
        isAuthenticated={isAuthenticated}
        isDemoMode={isDemoMode}
        onEnterDemoMode={onEnterDemoMode}
        onOpenAuthModal={onOpenAuthModal}
        onNavigateView={onNavigateView}
        onOpenTrackModal={onOpenTrackModal}
        itemCount={items.length}
      />

      {/* Consolidated Query & KPI Filter Toolbar */}
      <FilterRail
        stats={stats}
        statusFilter={statusFilter}
        onStatusChange={onStatusChange}
        platformFilter={platformFilter}
        onPlatformChange={onPlatformChange}
        actionFilter={actionFilter}
        onActionChange={onActionChange}
        scopeFilter={scopeFilter}
        onScopeChange={onScopeChange}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        sortBy={sortBy}
        onSortChange={onSortChange}
        isMobileFiltersOpen={isMobileFiltersOpen}
      />

      {timeframeFilter !== 'all' && (
        <div className="flex items-center justify-between gap-2 px-3.5 py-2 mb-2 bg-accent-sapphire/15 border border-accent-sapphire/35 rounded-xl text-xs font-mono text-accent-sapphire shadow-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-accent-sapphire animate-ping" />
            <span>
              Timeframe Filter Active: <strong>{timeframeFilter.toUpperCase()}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={onResetTimeframe}
            className="px-2.5 py-1 rounded-md bg-surface-card hover:bg-surface-elevated border border-border-subtle text-[11px] text-text-primary hover:text-white cursor-pointer transition-colors"
          >
            Reset Timeframe
          </button>
        </div>
      )}

      {/* Main Scannable Contribution Stream */}
      <main className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
        <ContributionList
          items={items}
          selectedId={selectedId}
          onSelectItem={onSelectItem}
          isLoading={isLoading}
          isRefreshing={isRefreshing}
          onOpenTrackModal={onOpenTrackModal}
          onResetFilters={onResetFilters}
          isAuthenticated={isAuthenticated}
          isDemoMode={isDemoMode}
          onOpenAuthModal={onOpenAuthModal}
          onEnterDemoMode={onEnterDemoMode}
          onNavigateView={onNavigateView}
          onOpenCookiePreferences={onOpenCookiePreferences}
        />
      </main>
    </div>
  );
};
