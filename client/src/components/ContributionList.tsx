import React, { useEffect, useState } from 'react';
import { Contribution } from '../types';
import { ContributionRow } from './ContributionRow';
import { PlusCircle, Search, Terminal } from 'lucide-react';

interface ContributionListProps {
  items: Contribution[];
  selectedId: string | null;
  onSelectItem: (id: string) => void;
  isLoading: boolean;
  onOpenTrackModal?: () => void;
  onResetFilters?: () => void;
}

export const ContributionList: React.FC<ContributionListProps> = ({
  items,
  selectedId,
  onSelectItem,
  isLoading,
  onOpenTrackModal,
  onResetFilters,
}) => {
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  // Synchronize highlighted index with selectedId or clamped index
  useEffect(() => {
    if (selectedId) {
      const idx = items.findIndex((it) => it.id === selectedId);
      if (idx !== -1) setHighlightedIndex(idx);
    } else if (highlightedIndex >= items.length) {
      setHighlightedIndex(Math.max(0, items.length - 1));
    }
  }, [selectedId, items.length]);

  // Global j/k/Enter keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < items.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter') {
        if (items[highlightedIndex]) {
          e.preventDefault();
          onSelectItem(items[highlightedIndex].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, highlightedIndex, onSelectItem]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-12 bg-base">
        <div className="border border-border-bold bg-surface p-4 font-telemetry text-xs text-text-secondary flex items-center gap-3">
          <span className="inline-block h-2 w-2 bg-status-in-review animate-ping" />
          <span className="text-text-primary font-bold">[SYS_SYNC]</span>
          <span>INGESTING CONTRIBUTION TELEMETRY...</span>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-12 bg-base text-center">
        <div className="border border-border-bold bg-surface p-6 max-w-lg w-full text-left font-telemetry">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3 mb-4 text-xs">
            <span className="text-status-awaiting-reply font-bold">[ZERO_RECORDS_LOCATED]</span>
            <span className="text-text-muted">CODE: NULL_SET</span>
          </div>
          <p className="text-xs text-text-secondary mb-5 font-body leading-relaxed">
            No contributions matched the active filter criteria or query string. Reset the current filter or ingest a new contribution URL.
          </p>
          <div className="flex items-center gap-2">
            {onResetFilters && (
              <button
                onClick={onResetFilters}
                className="border border-border-bold bg-surface-elevated px-3 py-1.5 font-telemetry text-xs font-bold text-text-primary hover:border-border-active hover:bg-surface-active transition-colors"
              >
                [RESET_FILTERS]
              </button>
            )}
            {onOpenTrackModal && (
              <button
                onClick={onOpenTrackModal}
                className="border border-status-in-review/60 bg-status-in-review/15 px-3 py-1.5 font-telemetry text-xs font-bold text-status-in-review hover:bg-status-in-review/25 transition-colors"
              >
                [+ TRACK_ITEM]
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-base">
      {/* Table Column Header (Hidden on mobile) */}
      <div className="hidden md:flex items-center justify-between border-b border-border-bold bg-surface-elevated px-5 py-1.5 font-telemetry text-[11px] font-bold text-text-muted select-none">
        <div className="flex items-center gap-2.5">
          <span className="w-8 text-center text-[10px]">NEW</span>
          <span className="w-12">SRC</span>
          <span className="w-4">TYP</span>
          <span>IDENTIFIER & CONTRIBUTION SUMMARY</span>
        </div>
        <div className="flex items-center gap-6">
          <span>STATUS & TRIGGER</span>
          <span className="w-16 text-right">HEARTBEAT</span>
        </div>
      </div>

      {/* Dense Rows */}
      <div className="divide-y divide-border-subtle overflow-y-auto flex-1">
        {items.map((item, idx) => {
          const isHighlighted = idx === highlightedIndex;
          const isSelected = item.id === selectedId;

          return (
            <div
              key={item.id}
              className={isHighlighted && !isSelected ? 'ring-1 ring-border-active ring-inset' : ''}
            >
              <ContributionRow
                item={item}
                isSelected={isSelected}
                onClick={() => {
                  setHighlightedIndex(idx);
                  onSelectItem(item.id);
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Industrial Console Footer */}
      <div className="border-t border-border-bold bg-surface px-5 py-2 flex items-center justify-between font-telemetry text-[11px] text-text-muted select-none">
        <div className="flex items-center gap-3">
          <span className="text-text-primary font-bold">[CONSOLE]</span>
          <span>
            <kbd className="border border-border-bold bg-base px-1 text-text-secondary">j</kbd>/<kbd className="border border-border-bold bg-base px-1 text-text-secondary">k</kbd> NAVIGATE
          </span>
          <span>
            <kbd className="border border-border-bold bg-base px-1 text-text-secondary">Enter</kbd> TELEMETRY
          </span>
          <span>
            <kbd className="border border-border-bold bg-base px-1 text-text-secondary">/</kbd> QUERY
          </span>
          <span>
            <kbd className="border border-border-bold bg-base px-1 text-text-secondary">Esc</kbd> DISMISS
          </span>
        </div>
        <div>
          <span>RECORDS: </span>
          <span className="font-bold text-text-primary">{items.length}</span>
          <span> // STATUS: </span>
          <span className="text-status-merged font-bold">ONLINE</span>
        </div>
      </div>
    </div>
  );
};
