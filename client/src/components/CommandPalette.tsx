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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/85 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-2xl border border-border-subtle bg-surface rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-border-subtle bg-base px-5 py-3.5">
          <Search className="h-5 w-5 text-accent-sapphire" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a repo, title, PR #, or keyword to jump..."
            className="w-full bg-transparent text-sm md:text-base font-medium text-white placeholder:text-text-muted focus:outline-none"
          />
          <kbd className="border border-border-bold bg-surface-card px-2 py-0.5 rounded text-xs font-mono text-text-whisper">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm font-mono text-text-muted">
              [NO_MATCHING_TELEMETRY_FOUND]
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
                  className={`flex items-center justify-between p-3.5 rounded-lg cursor-pointer transition-all ${
                    isSelected ? 'bg-surface-active border border-accent-sapphire' : 'hover:bg-surface-card'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-4">
                    {item.type === 'pr' ? (
                      <GitPullRequest className="h-4 w-4 md:h-5 md:w-5 text-accent-glacial shrink-0" />
                    ) : (
                      <CircleDot className="h-4 w-4 md:h-5 md:w-5 text-accent-glacial shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-text-whisper">
                          {item.repo}#{item.number}
                        </span>
                        <span className="text-xs uppercase font-mono font-bold px-1.5 py-0.2 rounded border border-border-bold bg-base text-text-muted">
                          [{item.status}]
                        </span>
                      </div>
                      <div className="text-sm font-sans font-medium text-white truncate mt-0.5">
                        {item.title}
                      </div>
                    </div>
                  </div>
                  <div className="font-mono text-xs text-text-muted shrink-0">
                    PRESS ENTER
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
