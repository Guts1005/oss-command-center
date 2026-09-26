import React from 'react';
import { Search, X } from 'lucide-react';

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
    <div className="border border-border-subtle bg-surface px-5 py-3.5 md:px-7 md:py-3.5 rounded-xl shadow-card select-none mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Terminal Query Search Input */}
        <div className="relative flex items-center w-full lg:w-[380px] xl:w-[420px] shrink-0">
          <span className="absolute left-3.5 text-accent-sapphire text-sm font-mono font-bold">
            &gt;
          </span>
          <input
            type="text"
            placeholder="FILTER REPO, TITLE, ID (Ctrl+K)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-10 border border-border-subtle bg-base pl-8 pr-9 text-sm md:text-base font-medium rounded-lg text-text-primary placeholder:text-text-muted focus:border-accent-sapphire focus:ring-1 focus:ring-accent-sapphire focus:outline-none transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 text-text-muted hover:text-white p-1 cursor-pointer"
              title="Clear query"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Status Mode Segmented Control Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-text-muted hidden sm:inline uppercase text-xs font-bold tracking-wider font-mono">
            VIEW:
          </span>
          <div className="inline-flex items-center p-1 rounded-lg border border-border-subtle bg-base/80 shadow-inner gap-1">
            {[
              { id: 'all', label: '[ALL]' },
              { id: 'active', label: '[ACTIVE]' },
              { id: 'action-needed', label: '[ACTION_REQ]', isUrgent: true },
              { id: 'stale', label: '[STALE_30D]' },
              { id: 'merged', label: '[MERGED]' },
            ].map((item) => {
              const isActive =
                item.id === 'action-needed'
                  ? actionFilter !== 'all'
                  : actionFilter === 'all' && statusFilter === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'action-needed') {
                      onStatusChange('all');
                      onActionChange('action-needed');
                    } else {
                      onActionChange('all');
                      onStatusChange(item.id);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all text-xs md:text-sm font-bold font-mono cursor-pointer ${
                    isActive
                      ? item.isUrgent
                        ? 'border border-status-action-needed/80 bg-status-action-needed/25 text-status-action-needed shadow-sm ring-1 ring-status-action-needed'
                        : 'border border-accent-sapphire bg-accent-sapphire/25 text-white shadow-sm ring-1 ring-accent-sapphire'
                      : 'border border-transparent text-text-muted hover:text-white hover:bg-surface-elevated'
                  }`}
                >
                  {item.isUrgent && <span className="h-1.5 w-1.5 rounded-full bg-status-action-needed shrink-0" />}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Grouped Platform & Sorting Spec Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Platform Selector Box */}
          <div className="inline-flex items-center h-10 border border-border-subtle bg-base/80 px-3 rounded-lg shadow-inner focus-within:border-accent-sapphire">
            <span className="text-text-muted uppercase text-xs font-bold tracking-wider font-mono mr-2">PLATFORM:</span>
            <select
              value={platformFilter}
              onChange={(e) => onPlatformChange(e.target.value)}
              className="bg-transparent text-xs md:text-sm font-bold font-mono text-white focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-surface text-white">ALL</option>
              <option value="github" className="bg-surface text-white">GITHUB</option>
              <option value="gitlab" className="bg-surface text-white">GITLAB</option>
            </select>
          </div>

          {/* Sort Selector Box */}
          <div className="inline-flex items-center h-10 border border-border-subtle bg-base/80 px-3 rounded-lg shadow-inner focus-within:border-accent-sapphire">
            <span className="text-text-muted uppercase text-xs font-bold tracking-wider font-mono mr-2">SORT:</span>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="bg-transparent text-xs md:text-sm font-bold font-mono text-white focus:outline-none cursor-pointer"
            >
              <option value="recent" className="bg-surface text-white">RECENT_ACTIVITY</option>
              <option value="unread" className="bg-surface text-white">UNREAD_FIRST</option>
              <option value="difficulty" className="bg-surface text-white">DIFFICULTY</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
