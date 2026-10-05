import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  badge?: string;
}

interface CustomDropdownProps {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  label,
  value,
  options,
  onChange,
  className = '',
  size = 'md',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const heightClasses = size === 'sm' ? 'h-7 text-[11px] px-2' : 'h-8 text-xs px-2';

  return (
    <div ref={containerRef} className={`relative inline-block select-none ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-1.5 rounded-lg border border-border-subtle bg-base/80 hover:bg-surface-elevated hover:border-border-bold transition-all cursor-pointer font-sans shadow-xs ${heightClasses} ${
          isOpen ? 'border-accent-sapphire ring-1 ring-accent-sapphire/40 bg-surface-elevated' : ''
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-1.5 truncate">
          <span className="text-text-muted text-[10px] font-bold tracking-wider uppercase font-sans">
            {label}
          </span>
          <span className="font-bold text-white tracking-wide truncate">
            {selectedOption?.label}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.15 }}
          className="text-text-muted shrink-0 flex items-center"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </motion.div>
      </button>

      {/* Animated Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-1.5 min-w-[140px] w-max z-50 rounded-lg border border-border-subtle bg-surface p-1 shadow-[0_12px_32px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(207,231,248,0.04)] overflow-hidden"
            role="listbox"
          >
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-md text-xs font-sans font-semibold transition-colors cursor-pointer text-left ${
                    isSelected
                      ? 'bg-accent-sapphire/20 text-accent-sapphire font-bold border border-accent-sapphire/30'
                      : 'text-text-whisper hover:bg-surface-card hover:text-white border border-transparent'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && (
                    <Check className="h-3.5 w-3.5 text-accent-sapphire shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
