import React from 'react';
import { Search, X } from 'lucide-react';
import { Stats } from '../types';

interface FilterRailProps {
  stats: Stats | null;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  actionFilter: string;
  onActionChange: (action: string) => void;
  platformFilter: string;
  onPlatformChange: (platform: string) => void;
  scopeFilter: string;
  onScopeChange: (scope: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
}

export const FilterRail: React.FC<FilterRailProps> = ({
  stats,
  statusFilter,
  onStatusChange,
  actionFilter,
  onActionChange,
  platformFilter,
  onPlatformChange,
  scopeFilter,
  onScopeChange,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
}) => {
  const tabs = [
    {
      id: 'all',
      label: 'ALL',
      count: stats?.total ?? 0,
      isAction: false,
    },
    {
      id: 'action-needed',
      label: 'ACTION_REQ',
      count: stats?.actionNeeded ?? 0,
      isAction: true,
      urgent: (stats?.actionNeeded ?? 0) > 0,
    },
    {
      id: 'active',
      label: 'IN_REVIEW',
      count: stats?.awaitingMaintainer ?? 0,
      isAction: false,
    },
    {
      id: 'merged',
      label: 'MERGED',
      count: stats?.merged ?? 0,
      isAction: false,
    },
    {
      id: 'closed',
      label: 'CLOSED',
      count: stats?.closed ?? 0,
      isAction: false,
    },
    {
      id: 'stale',
      label: 'STALE',
      count: null,
      isAction: false,
    },
  ];

  return (
    <div className="border border-border-subtle chrome-surface rounded-xl select-none mb-3 px-3 py-2 md:px-4 md:py-2">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
        {/* Left: Terminal Query Search Input */}
        <div className="relative flex items-center w-full lg:w-[210px] shrink-0">
          <span className="absolute left-3 text-accent-sapphire text-xs font-mono font-bold">
            &gt;
          </span>
          <input
            type="text"
            placeholder="FILTER (Ctrl+K)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-8 border border-border-subtle bg-base pl-7 pr-7 text-xs font-medium rounded-lg text-text-primary placeholder:text-text-muted focus:border-accent-sapphire focus:ring-1 focus:ring-accent-sapphire focus:outline-none transition-all shadow-inner font-mono"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 text-text-muted hover:text-white p-0.5 cursor-pointer"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Center: Consolidated KPI Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar shrink-0">
          <div className="inline-flex items-center p-0.5 rounded-lg border border-border-subtle bg-base/80 shadow-inner gap-1">
            {tabs.map((tab) => {
              const isActive =
                tab.id === 'action-needed'
                  ? actionFilter !== 'all'
                  : actionFilter === 'all' && statusFilter === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.id === 'action-needed') {
                      onStatusChange('all');
                      onActionChange('action-needed');
                    } else {
                      onActionChange('all');
                      onStatusChange(tab.id);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all text-xs font-bold font-mono cursor-pointer shrink-0 ${
                    isActive
                      ? tab.urgent
                        ? 'border border-status-action-needed/80 bg-status-action-needed/25 text-status-action-needed shadow-sm ring-1 ring-status-action-needed'
                        : 'border border-accent-sapphire bg-accent-sapphire/25 text-white shadow-sm ring-1 ring-accent-sapphire'
                      : tab.urgent
                      ? 'border border-status-action-needed/40 bg-status-action-needed/10 text-status-action-needed hover:bg-status-action-needed/20'
                      : 'border border-transparent text-text-muted hover:text-white hover:bg-surface-elevated'
                  }`}
                >
                  {tab.urgent && (
                    <span className="h-1.5 w-1.5 rounded-full bg-status-action-needed animate-pulse shrink-0" />
                  )}
                  <span>{tab.label}</span>
                  {tab.count !== null && (
                    <span
                      className={`text-[11px] px-1.5 py-0.2 rounded font-extrabold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-surface-elevated text-text-muted'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Auxiliary Filters (Scope + Platform + Sort) */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          {/* Scope Split: All / External / Own Repo */}
          <div className="inline-flex items-center h-8 p-0.5 rounded-lg border border-border-subtle bg-base/80 text-xs font-mono">
            {[
              { id: 'all', label: 'ALL' },
              { id: 'external', label: 'EXT' },
              { id: 'own', label: 'OWN' },
            ].map((sc) => (
              <button
                key={sc.id}
                onClick={() => onScopeChange(sc.id)}
                className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                  scopeFilter === sc.id
                    ? 'bg-surface-elevated text-white border border-border-subtle shadow-sm'
                    : 'text-text-muted hover:text-white'
                }`}
                title={`Filter repository scope: ${sc.label}`}
              >
                {sc.label}
              </button>
            ))}
          </div>

          {/* Platform Selector */}
          <div className="flex items-center h-8 border border-border-subtle bg-base/80 rounded-lg px-2 text-xs font-mono text-text-muted">
            <span className="mr-1 text-text-muted text-[11px]">PLATFORM:</span>
            <select
              value={platformFilter}
              onChange={(e) => onPlatformChange(e.target.value)}
              className="bg-transparent text-white font-bold cursor-pointer focus:outline-none text-xs"
            >
              <option value="all" className="bg-surface text-white">ALL</option>
              <option value="github" className="bg-surface text-white">GH</option>
              <option value="gitlab" className="bg-surface text-white">GL</option>
            </select>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center h-8 border border-border-subtle bg-base/80 rounded-lg px-2 text-xs font-mono text-text-muted">
            <span className="mr-1 text-text-muted text-[11px]">SORT:</span>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="bg-transparent text-white font-bold cursor-pointer focus:outline-none text-xs"
            >
              <option value="recent" className="bg-surface text-white">RECENT</option>
              <option value="unread" className="bg-surface text-white">UNREAD</option>
              <option value="difficulty" className="bg-surface text-white">DIFF</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
