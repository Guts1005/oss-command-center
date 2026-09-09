import React from 'react';
import { Search, X, AlertCircle } from 'lucide-react';

interface FilterRailProps {
  statusFilter: string;
  onStatusChange: (status: string) => void;
  platformFilter: string;
  onPlatformChange: (platform: string) => void;
  actionFilter: string;
  onActionChange: (action: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
}

export const FilterRail: React.FC<FilterRailProps> = ({
  statusFilter,
  onStatusChange,
  platformFilter,
  onPlatformChange,
  actionFilter,
  onActionChange,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
}) => {
  return (
    <div className="border-b border-border-subtle bg-surface px-6 py-2.5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 font-telemetry text-xs">
        {/* Search input with clear button */}
        <div className="relative flex items-center w-full md:w-80 lg:w-96 min-w-[280px]">
          <Search className="absolute left-3 h-3.5 w-3.5 text-text-muted" />
          <input
            type="text"
            placeholder="Search repo, title, PR # (Ctrl+K)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full border border-border-bold bg-base py-1.5 pl-9 pr-8 text-xs text-text-primary placeholder:text-text-muted focus:border-border-active focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 text-text-muted hover:text-text-primary p-0.5"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Clean Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-text-muted mr-1 hidden sm:inline uppercase text-[11px]">Filter:</span>
          {[
            { id: 'all', label: 'All Items' },
            { id: 'active', label: 'Active Work' },
            { id: 'action-needed', label: 'Action Needed', isUrgent: true },
            { id: 'stale', label: 'Stale (>30d)' },
            { id: 'merged', label: 'Merged' },
          ].map((item) => {
            const isActive =
              (item.id === 'action-needed' && actionFilter !== 'all') ||
              (item.id !== 'action-needed' && statusFilter === item.id);

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'action-needed') {
                    onActionChange(actionFilter === 'all' ? 'reply' : 'all');
                  } else {
                    onStatusChange(item.id);
                  }
                }}
                className={`flex items-center gap-1.5 border px-2.5 py-1 transition-colors text-xs ${
                  isActive
                    ? 'border-border-active bg-surface-active text-text-primary font-bold'
                    : 'border-border-subtle bg-base text-text-muted hover:border-border-bold hover:text-text-secondary'
                }`}
              >
                {item.isUrgent && (
                  <span className="h-1.5 w-1.5 rounded-full bg-status-action-needed inline-block" />
                )}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Platform & Sort Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-text-muted uppercase text-[11px]">Platform:</span>
            <select
              value={platformFilter}
              onChange={(e) => onPlatformChange(e.target.value)}
              className="border border-border-bold bg-base px-2 py-1 text-xs text-text-primary focus:border-border-active focus:outline-none"
            >
              <option value="all">All Platforms</option>
              <option value="github">GitHub</option>
              <option value="gitlab">GitLab</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-text-muted uppercase text-[11px]">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="border border-border-bold bg-base px-2 py-1 text-xs text-text-primary focus:border-border-active focus:outline-none"
            >
              <option value="recent">Recent Activity</option>
              <option value="unread">Unread First</option>
              <option value="difficulty">Difficulty</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
