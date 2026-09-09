import React from 'react';
import { Filter, Search } from 'lucide-react';

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
    <div className="border-b border-border-subtle bg-surface px-6 py-3">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 font-telemetry text-xs">
        {/* Search input with technical framing */}
        <div className="relative flex items-center min-w-[280px]">
          <Search className="absolute left-3 h-3.5 w-3.5 text-text-muted" />
          <input
            type="text"
            placeholder="FILTER BY REPO, TITLE OR ID (CTRL+K)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full border border-border-bold bg-base py-1.5 pl-9 pr-3 text-xs text-text-primary placeholder:text-text-muted focus:border-border-active focus:outline-none"
          />
        </div>

        {/* Utilitarian Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-text-muted mr-1 hidden sm:inline">VIEW:</span>
          {[
            { id: 'all', label: '[ALL]' },
            { id: 'action-needed', label: '[ACTION NEEDED]' },
            { id: 'open', label: '[OPEN / IN-REVIEW]' },
            { id: 'merged', label: '[MERGED]' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'action-needed') {
                  onActionChange(actionFilter === 'all' ? 'reply' : 'all');
                } else {
                  onStatusChange(item.id);
                }
              }}
              className={`border px-2.5 py-1 transition-colors ${
                (item.id === 'action-needed' && actionFilter !== 'all') ||
                (item.id !== 'action-needed' && statusFilter === item.id)
                  ? 'border-border-active bg-surface-active text-text-primary font-bold'
                  : 'border-border-subtle bg-base text-text-muted hover:border-border-bold hover:text-text-secondary'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Platform & Sort Selectors */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-text-muted">PLATFORM:</span>
            <select
              value={platformFilter}
              onChange={(e) => onPlatformChange(e.target.value)}
              className="border border-border-bold bg-base px-2 py-1 text-xs text-text-primary focus:border-border-active focus:outline-none"
            >
              <option value="all">ALL PLATFORMS</option>
              <option value="github">GITHUB</option>
              <option value="gitlab">GITLAB</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-text-muted">SORT:</span>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="border border-border-bold bg-base px-2 py-1 text-xs text-text-primary focus:border-border-active focus:outline-none"
            >
              <option value="recent">RECENT ACTIVITY</option>
              <option value="unread">UNREAD FIRST</option>
              <option value="difficulty">DIFFICULTY</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
