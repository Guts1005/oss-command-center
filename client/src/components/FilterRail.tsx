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
    <div className="border-b border-border-bold bg-surface px-5 py-2 font-telemetry select-none">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5 text-xs">
        {/* Terminal Query Input */}
        <div className="relative flex items-center w-full md:w-80 lg:w-96 min-w-[280px]">
          <span className="absolute left-2.5 text-text-muted text-[11px] font-bold">
            &gt;
          </span>
          <input
            type="text"
            placeholder="FILTER REPO, TITLE, ID (Ctrl+K)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full border border-border-bold bg-base py-1 pl-7 pr-7 text-xs text-text-primary placeholder:text-text-muted focus:border-status-in-review focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 text-text-muted hover:text-text-primary p-0.5"
              title="Clear query"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Industrial Status Mode Switches */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-text-muted mr-1 hidden sm:inline uppercase text-[10px] font-bold">
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
                className={`flex items-center gap-1 border px-2 py-0.5 transition-colors text-[11px] font-bold ${
                  isActive
                    ? item.isUrgent
                      ? 'border-status-action-needed bg-status-action-needed/20 text-status-action-needed'
                      : 'border-status-in-review bg-status-in-review/15 text-status-in-review'
                    : 'border-border-subtle bg-base text-text-muted hover:border-border-bold hover:text-text-secondary'
                }`}
              >
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Platform & Sorting Spec Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-text-muted uppercase text-[10px] font-bold">PLATFORM:</span>
            <select
              value={platformFilter}
              onChange={(e) => onPlatformChange(e.target.value)}
              className="border border-border-bold bg-base px-2 py-0.5 text-xs text-text-primary focus:border-status-in-review focus:outline-none"
            >
              <option value="all">ALL</option>
              <option value="github">GITHUB</option>
              <option value="gitlab">GITLAB</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-text-muted uppercase text-[10px] font-bold">SORT:</span>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="border border-border-bold bg-base px-2 py-0.5 text-xs text-text-primary focus:border-status-in-review focus:outline-none"
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
