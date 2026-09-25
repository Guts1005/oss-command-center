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
    <div className="border border-border-subtle bg-surface px-5 py-4 md:px-7 md:py-4.5 rounded-lg shadow-card select-none mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Terminal Query Search Input */}
        <div className="relative flex items-center w-full md:w-96 lg:w-[420px]">
          <span className="absolute left-3.5 text-accent-sapphire text-sm font-mono font-bold">
            &gt;
          </span>
          <input
            type="text"
            placeholder="FILTER REPO, TITLE, ID (Ctrl+K)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full border border-border-subtle bg-base py-2.5 pl-8 pr-9 text-sm md:text-base font-medium rounded-md text-text-primary placeholder:text-text-muted focus:border-accent-sapphire focus:ring-1 focus:ring-accent-sapphire focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 text-text-muted hover:text-text-primary p-1 cursor-pointer"
              title="Clear query"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Status Mode Switches */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-text-muted mr-1 hidden sm:inline uppercase text-xs font-bold tracking-wider font-mono">
            VIEW:
          </span>
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
                className={`flex items-center gap-1.5 border px-3 py-1.5 rounded-md transition-all text-xs md:text-sm font-bold font-mono cursor-pointer ${
                  isActive
                    ? item.isUrgent
                      ? 'border-status-action-needed bg-status-action-needed/25 text-status-action-needed shadow-sm ring-1 ring-status-action-needed'
                      : 'border-accent-sapphire bg-accent-sapphire/25 text-text-whisper shadow-sm ring-1 ring-accent-sapphire'
                    : 'border-border-subtle bg-surface-card text-text-muted hover:border-accent-sapphire hover:text-text-whisper'
                }`}
              >
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Platform & Sorting Spec Controls */}
        <div className="flex flex-wrap items-center gap-3.5">
          <div className="flex items-center gap-2">
            <span className="text-text-muted uppercase text-xs font-bold tracking-wider font-mono">PLATFORM:</span>
            <select
              value={platformFilter}
              onChange={(e) => onPlatformChange(e.target.value)}
              className="border border-border-subtle bg-base px-3.5 py-2 rounded-md text-xs md:text-sm font-bold font-mono text-text-whisper hover:border-accent-sapphire focus:border-accent-sapphire focus:ring-1 focus:ring-accent-sapphire focus:outline-none transition-colors cursor-pointer shadow-sm"
            >
              <option value="all">ALL</option>
              <option value="github">GITHUB</option>
              <option value="gitlab">GITLAB</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-text-muted uppercase text-xs font-bold tracking-wider font-mono">SORT:</span>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="border border-border-subtle bg-base px-3.5 py-2 rounded-md text-xs md:text-sm font-bold font-mono text-text-whisper hover:border-accent-sapphire focus:border-accent-sapphire focus:ring-1 focus:ring-accent-sapphire focus:outline-none transition-colors cursor-pointer shadow-sm"
            >
              <option value="recent">RECENT_ACTIVITY</option>
              <option value="unread">UNREAD_FIRST</option>
              <option value="difficulty">DIFFICULTY</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
