import React, { useEffect, useState } from 'react';
import { Contribution } from '../types';
import { ContributionRow } from './ContributionRow';
import { PlusCircle, Search } from 'lucide-react';

interface ContributionListProps {
  items: Contribution[];
  selectedId: string | null;
  onSelectItem: (id: string) => void;
  isLoading: boolean;
  onOpenTrackModal?: () => void;
}

export const ContributionList: React.FC<ContributionListProps> = ({
  items,
  selectedId,
  onSelectItem,
  isLoading,
  onOpenTrackModal,
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
      <div className="flex flex-1 items-center justify-center p-12">
        <div className="font-telemetry text-xs text-text-muted flex items-center gap-2.5">
          <span className="inline-block h-2 w-2 rounded-full bg-status-awaiting-reply animate-pulse" />
          <span>Synchronizing contribution data...</span>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-12 border-b border-border-subtle bg-base text-center">
        <div className="border border-border-bold bg-surface p-8 max-w-md w-full shadow-lg">
          <div className="flex justify-center mb-3 text-text-muted">
            <Search className="h-8 w-8" />
          </div>
          <div className="font-display text-sm font-bold text-text-primary uppercase tracking-wide mb-1.5">
            No Contributions in View
          </div>
          <p className="text-xs text-text-muted mb-5 font-body leading-relaxed">
            No items matched your current search query or active filter. You can clear your filters or start tracking a new pull request or issue.
          </p>
          {onOpenTrackModal && (
            <button
              onClick={onOpenTrackModal}
              className="inline-flex items-center gap-1.5 border border-status-awaiting-reply/60 bg-status-awaiting-reply/15 px-4 py-2 font-telemetry text-xs font-bold text-status-awaiting-reply hover:bg-status-awaiting-reply/25 transition-colors"
            >
              <PlusCircle className="h-4 w-4" />
              <span>+ Track a PR or Issue Now</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-base">
      {/* Table Column Header (Hidden on mobile) */}
      <div className="hidden md:flex items-center justify-between border-b border-border-bold bg-surface-elevated px-6 py-2 font-telemetry text-[11px] font-semibold text-text-muted select-none">
        <div className="flex items-center gap-3">
          <span className="w-9 text-center text-[10px]">NEW</span>
          <span>PLATFORM & CONTRIBUTION TITLE</span>
        </div>
        <div className="flex items-center gap-6">
          <span>STATUS & NEXT ACTION</span>
          <span className="w-16 text-right">ACTIVITY</span>
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

      {/* Footer Navigation Hints */}
      <div className="border-t border-border-subtle bg-surface px-6 py-2 flex items-center justify-between font-telemetry text-[11px] text-text-muted">
        <div className="flex items-center gap-4">
          <span>
            HOTKEYS: <kbd className="border border-border-bold bg-base px-1 py-0.5 text-text-secondary">j</kbd>/<kbd className="border border-border-bold bg-base px-1 py-0.5 text-text-secondary">k</kbd> Navigate
          </span>
          <span>
            <kbd className="border border-border-bold bg-base px-1 py-0.5 text-text-secondary">Enter</kbd> Open Details
          </span>
          <span>
            <kbd className="border border-border-bold bg-base px-1 py-0.5 text-text-secondary">Esc</kbd> Close Drawer
          </span>
        </div>
        <div>
          <span>Showing </span>
          <span className="font-bold text-text-primary">{items.length}</span>
          <span> items</span>
        </div>
      </div>
    </div>
  );
};
