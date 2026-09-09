import React, { useState, useEffect } from 'react';
import { Contribution } from '../types';
import { Search, GitPullRequest, CircleDot, X } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  items: Contribution[];
  onSelect: (id: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, items, onSelect }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filtered = items.filter((it) => {
    const q = query.toLowerCase();
    return (
      it.title.toLowerCase().includes(q) ||
      it.repo.toLowerCase().includes(q) ||
      it.id.toLowerCase().includes(q) ||
      (it.notes && it.notes.toLowerCase().includes(q))
    );
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onSelect(filtered[selectedIndex].id);
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onSelect, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-base/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl border border-border-bold bg-surface shadow-2xl flex flex-col font-telemetry">
        {/* Search header */}
        <div className="flex items-center border-b border-border-subtle px-4 py-3 bg-base">
          <Search className="h-4 w-4 text-text-muted mr-3 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="JUMP TO CONTRIBUTION OR REPOSITORY..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
          />
          <kbd className="border border-border-bold bg-surface-elevated px-1.5 py-0.5 text-[10px] text-text-muted">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-text-muted">
              NO MATCHING CONTRIBUTIONS LOCATED
            </div>
          ) : (
            filtered.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelect(item.id);
                  onClose();
                }}
                className={`flex items-center justify-between p-2.5 cursor-pointer text-xs ${
                  idx === selectedIndex ? 'bg-surface-active border-l-2 border-l-status-awaiting-reply text-white' : 'hover:bg-base text-text-secondary'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-3">
                  {item.type === 'pr' ? (
                    <GitPullRequest className="h-3.5 w-3.5 text-text-muted shrink-0" />
                  ) : (
                    <CircleDot className="h-3.5 w-3.5 text-text-muted shrink-0" />
                  )}
                  <span className="font-semibold text-text-primary whitespace-nowrap">
                    {item.repo}#{item.number}
                  </span>
                  <span className="truncate font-body font-normal text-text-secondary">
                    {item.title}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.bounty_amount && (
                    <span className="border border-status-bounty/40 text-status-bounty px-1.5 py-0.5 text-[10px] font-bold">
                      {item.bounty_amount}
                    </span>
                  )}
                  <span className="border border-border-bold px-1.5 py-0.5 text-[10px] uppercase text-text-muted">
                    {item.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer command helper */}
        <div className="border-t border-border-subtle bg-base px-4 py-2 flex items-center justify-between text-[11px] text-text-muted">
          <span>NAVIGATION: [↑/↓] TO CYCLE // [ENTER] TO SELECT</span>
          <span>{filtered.length} TOTAL ITEMS</span>
        </div>
      </div>
    </div>
  );
};
