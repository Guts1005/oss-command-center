import React, { useState, useEffect } from 'react';
import { Contribution } from '../types';
import { Search, GitPullRequest, CircleDot } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/80 backdrop-blur-sm p-4 font-telemetry select-none">
      <div className="w-full max-w-2xl border border-border-bold bg-surface shadow-2xl flex flex-col">
        {/* Terminal Query Input Bar */}
        <div className="flex items-center border-b border-border-bold px-4 py-2.5 bg-base">
          <Search className="h-4 w-4 text-text-muted mr-2.5 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="JUMP TO CONTRIBUTION TELEMETRY OR REPO..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-text-primary placeholder:text-text-muted focus:outline-none uppercase"
          />
          <kbd className="border border-border-bold bg-surface px-1.5 py-0.5 text-[10px] text-text-muted">
            ESC
          </kbd>
        </div>

        {/* Results Stream */}
        <div className="max-h-96 overflow-y-auto p-1 divide-y divide-border-subtle">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-text-muted">
              [ZERO_MATCHES_FOR_QUERY]
            </div>
          ) : (
            filtered.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelect(item.id);
                  onClose();
                }}
                className={`flex items-center justify-between p-2 cursor-pointer text-xs transition-colors ${
                  idx === selectedIndex
                    ? 'bg-surface-active border-l-2 border-l-status-in-review text-text-primary'
                    : 'hover:bg-base text-text-secondary border-l-2 border-l-transparent'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span
                    className={`px-1 py-0.2 text-[9px] font-bold uppercase border shrink-0 ${
                      item.platform === 'github'
                        ? 'border-border-bold text-text-primary bg-surface-elevated'
                        : 'border-[#fc6d26]/50 text-[#fc6d26] bg-[#fc6d26]/10'
                    }`}
                  >
                    {item.platform === 'github' ? '[GH]' : '[GL]'}
                  </span>
                  {item.type === 'pr' ? (
                    <GitPullRequest className="h-3 w-3 text-text-muted shrink-0" />
                  ) : (
                    <CircleDot className="h-3 w-3 text-text-muted shrink-0" />
                  )}
                  <span className="font-bold text-text-primary whitespace-nowrap">
                    {item.repo}#{item.number}
                  </span>
                  <span className="truncate font-body text-xs text-text-secondary">
                    {item.title}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {item.bounty_amount && (
                    <span className="border border-status-bounty/60 bg-status-bounty/10 px-1 text-[9px] font-bold text-status-bounty">
                      [{item.bounty_amount}]
                    </span>
                  )}
                  <span className="border border-border-bold px-1.5 py-0.2 text-[9px] uppercase text-text-muted font-bold">
                    [{item.status}]
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Console Command Footer */}
        <div className="border-t border-border-bold bg-base px-4 py-2 flex items-center justify-between text-[10px] text-text-muted">
          <span>CONSOLE: [↑/↓] CYCLE // [ENTER] INSPECT // [ESC] DISMISS</span>
          <span>RECORDS: {filtered.length}</span>
        </div>
      </div>
    </div>
  );
};
