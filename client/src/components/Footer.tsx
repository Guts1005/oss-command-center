import React from 'react';
import { ExternalLink, Github, Mail, Shield, User } from 'lucide-react';
import { ViewMode } from '../types';

export interface FooterProps {
  onNavigateView?: (mode: ViewMode) => void;
  onOpenCookiePreferences?: () => void;
  variant?: 'editorial' | 'dashboard';
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigateView,
  onOpenCookiePreferences,
  variant = 'dashboard',
  className = '',
}) => {
  const isEditorial = variant === 'editorial';

  return (
    <footer
      role="contentinfo"
      className={`border-t border-border-subtle select-none ${
        isEditorial ? 'pt-10 pb-8 space-y-8' : 'mt-12 pt-8 pb-24 sm:pb-8 space-y-6'
      } ${className}`}
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1.5">
          <h2
            className={`font-extrabold font-sans text-text-primary tracking-tight ${
              isEditorial ? 'text-3xl sm:text-5xl' : 'text-2xl sm:text-3xl'
            }`}
          >
            Sharvin
          </h2>
          <p className="text-xs sm:text-sm font-mono text-text-muted">
            Systems & Full-Stack Infrastructure Engineer.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          <a
            href="https://github.com/Guts1005"
            target="_blank"
            rel="noreferrer"
            className="text-text-muted hover:text-text-primary transition-colors flex items-center gap-1.5 font-bold"
          >
            <Github className="h-3.5 w-3.5" />
            <span>GitHub</span>
            <ExternalLink className="h-3 w-3" />
          </a>
          <span className="text-border-bold" aria-hidden="true">•</span>
          <a
            href="https://linkedin.com/in/"
            target="_blank"
            rel="noreferrer"
            className="text-text-muted hover:text-text-primary transition-colors flex items-center gap-1.5 font-bold"
          >
            <span>LinkedIn</span>
            <ExternalLink className="h-3 w-3" />
          </a>
          <span className="text-border-bold" aria-hidden="true">•</span>
          <a
            href="mailto:contact@sharvin.dev"
            className="text-text-muted hover:text-text-primary transition-colors flex items-center gap-1.5 font-bold"
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Email Contact</span>
          </a>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-5 border-t border-border-subtle text-xs font-mono text-text-muted">
        <div>
          © 2026 Sharvin. All rights reserved.
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => onNavigateView?.('security')}
            className="hover:text-text-primary transition-colors cursor-pointer"
          >
            Privacy Policy
          </button>
          <span className="text-border-bold" aria-hidden="true">•</span>
          <button
            type="button"
            onClick={() => onOpenCookiePreferences?.()}
            className="hover:text-text-primary transition-colors cursor-pointer"
          >
            Cookie Preferences
          </button>
          <span className="text-border-bold" aria-hidden="true">•</span>
          <button
            type="button"
            onClick={() => onNavigateView?.('security')}
            className="hover:text-text-primary transition-colors cursor-pointer"
          >
            Terms of Service
          </button>
          {onNavigateView && (
            <>
              <span className="text-border-bold" aria-hidden="true">•</span>
              <button
                type="button"
                onClick={() => onNavigateView(isEditorial ? 'stream' : 'about')}
                className="hover:text-text-primary transition-colors cursor-pointer flex items-center gap-1 text-accent-sapphire font-bold"
              >
                {isEditorial ? (
                  <span>Command Stream</span>
                ) : (
                  <>
                    <User className="h-3 w-3" />
                    <span>About Sharvin</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </footer>
  );
};
