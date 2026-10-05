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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 md:pt-24 bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-3xl border border-border-subtle bg-surface rounded-xl shadow-[inset_0_1px_0_rgba(207,231,248,0.04),0_25px_50px_-12px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3.5 border-b border-border-subtle bg-base px-6 py-4">
          <Search className="h-5 w-5 text-accent-sapphire shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a repo, title, PR #, or keyword to jump..."
            className="w-full bg-transparent text-base md:text-lg font-medium text-white placeholder:text-text-muted focus:outline-none"
          />
          <kbd className="border border-border-bold bg-surface-card px-2.5 py-1 rounded text-xs font-mono font-bold text-text-whisper shadow-sm">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[460px] overflow-y-auto p-3 space-y-1.5">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-sm font-mono text-text-muted">
              [NO MATCHING RESULTS FOUND]
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelect(item.id);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-surface-active border-accent-sapphire shadow-sm ring-1 ring-accent-sapphire/50'
                      : 'border-transparent bg-surface-card/60 hover:bg-surface-card hover:border-border-subtle'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 pr-4">
                    {item.type === 'pr' ? (
                      <GitPullRequest className="h-5 w-5 text-accent-glacial shrink-0" />
                    ) : (
                      <CircleDot className="h-5 w-5 text-accent-glacial shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono text-sm md:text-base font-bold text-text-whisper">
                          {item.repo}#{item.number}
                        </span>
                        <span className="text-xs uppercase font-mono font-bold px-2 py-0.5 rounded border border-border-bold bg-base text-text-muted">
                          [{item.status}]
                        </span>
                      </div>
                      <div className="text-sm md:text-base font-sans font-semibold text-white truncate mt-1">
                        {item.title}
                      </div>
                    </div>
                  </div>
                  <kbd className="hidden sm:inline-block px-2.5 py-1 rounded border border-border-subtle bg-base font-mono text-xs font-bold text-text-whisper shrink-0 shadow-sm">
                    ↵ ENTER
                  </kbd>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
