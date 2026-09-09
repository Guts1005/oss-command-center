import React, { useEffect, useState } from 'react';
import { Contribution } from '../types';
import { ContributionRow } from './ContributionRow';

interface ContributionListProps {
  items: Contribution[];
  selectedId: string | null;
  onSelectItem: (id: string) => void;
  isLoading: boolean;
}

export const ContributionList: React.FC<ContributionListProps> = ({
  items,
  selectedId,
  onSelectItem,
  isLoading,
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
      // Don't intercept if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) => {
          const next = prev < items.length - 1 ? prev + 1 : prev;
          return next;
        });
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) => {
          const next = prev > 0 ? prev - 1 : 0;
          return next;
        });
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
        <div className="font-telemetry text-xs text-text-muted flex items-center gap-2">
          <span className="inline-block h-2 w-2 bg-status-awaiting-reply animate-pulse" />
          REFRESHING TELEMETRY STACK...
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-16 border-b border-border-subtle bg-base text-center font-telemetry">
        <div className="border border-border-bold bg-surface p-8 max-w-md w-full">
          <div className="text-xs font-bold text-text-primary uppercase tracking-wider mb-2">
            NO ACTIVE CONTRIBUTIONS IN SCOPE
          </div>
          <p className="text-xs text-text-muted mb-4 font-body leading-relaxed">
            No items matched the active telemetry filters or search query. Adjust the filters on the rail or initiate a synchronization pass.
          </p>
          <div className="text-[11px] text-text-muted border-t border-border-subtle pt-3">
            HINT: Press <kbd className="border border-border-bold bg-surface-elevated px-1 py-0.5 text-text-secondary">Ctrl+K</kbd> to search all contributions
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-base">
      {/* Subheader / Table column telemetry */}
      <div className="flex items-center justify-between border-b border-border-bold bg-surface-elevated px-6 py-2 font-telemetry text-[11px] font-semibold text-text-muted select-none">
        <div className="flex items-center gap-4">
          <span className="w-2" />
          <span>PL</span>
          <span className="w-4" />
          <span>TARGET IDENTIFIER & TITLE</span>
        </div>
        <div className="flex items-center gap-6">
          <span>ACTION STATE</span>
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

      {/* Footer Hotkey Indicator */}
      <div className="border-t border-border-subtle bg-surface px-6 py-2 flex items-center justify-between font-telemetry text-[11px] text-text-muted">
        <div className="flex items-center gap-4">
          <span>
            HOTKEYS: <kbd className="border border-border-bold bg-base px-1 py-0.5 text-text-secondary">j</kbd>/<kbd className="border border-border-bold bg-base px-1 py-0.5 text-text-secondary">k</kbd> NAVIGATE
          </span>
          <span>
            <kbd className="border border-border-bold bg-base px-1 py-0.5 text-text-secondary">ENTER</kbd> OPEN DRAWER
          </span>
          <span>
            <kbd className="border border-border-bold bg-base px-1 py-0.5 text-text-secondary">ESC</kbd> CLOSE DRAWER
          </span>
        </div>
        <div>
          COUNT: <span className="font-bold text-text-primary">{items.length}</span> DISPLAYED
        </div>
      </div>
    </div>
  );
};
