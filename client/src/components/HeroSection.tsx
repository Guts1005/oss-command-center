import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Shield,
  Zap,
  Radio,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Layers,
  Lock,
  GitPullRequest,
  CheckCircle2
} from 'lucide-react';
import { ViewMode } from '../types';

export interface HeroSectionProps {
  isAuthenticated: boolean;
  isDemoMode: boolean;
  onEnterDemoMode?: () => void;
  onOpenAuthModal: () => void;
  onNavigateView: (mode: ViewMode) => void;
  onOpenTrackModal?: () => void;
  itemCount?: number;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  isAuthenticated,
  isDemoMode,
  onEnterDemoMode,
  onOpenAuthModal,
  onNavigateView,
  onOpenTrackModal,
  itemCount = 7,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('oss_hero_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try {
      localStorage.setItem('oss_hero_collapsed', String(next));
    } catch {
      // storage unavailable
    }
  };

  if (isCollapsed) {
    return (
      <aside aria-label="Command Center Summary" className="w-full mb-3 px-3 py-2 rounded-xl border border-border-subtle bg-surface-card flex items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-2 h-2 rounded-full bg-status-merged shrink-0" />
          <span className="font-bold text-text-primary truncate">OSS COMMAND CENTER</span>
          <span className="text-text-muted hidden md:inline truncate">
            Local-first triage HUD across GitHub &amp; GitLab
          </span>
          {isDemoMode && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-accent-sapphire/20 border border-accent-sapphire/40 text-accent-sapphire">
              DEMO SANDBOX
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isAuthenticated && !isDemoMode && onEnterDemoMode && (
            <button
              type="button"
              onClick={onEnterDemoMode}
              className="px-2.5 py-1 rounded-lg border border-accent-sapphire/50 bg-accent-sapphire/15 hover:bg-accent-sapphire/25 text-accent-sapphire text-xs font-bold transition-colors cursor-pointer"
            >
              Explore Demo
            </button>
          )}
          <button
            type="button"
            onClick={toggleCollapse}
            className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-surface-elevated text-text-muted hover:text-text-primary text-xs transition-colors cursor-pointer"
            title="Expand hero cockpit"
          >
            <span>Show Details</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <header className="w-full mb-4 p-5 sm:p-6 lg:p-7 rounded-2xl border border-border-subtle bg-surface-card shadow-card relative overflow-hidden transition-all">
      <div className="relative z-10 space-y-4">
        {/* Top Operational Status Row */}
        <div className="flex items-center justify-between gap-3 pb-2 border-b border-border-subtle/80">
          <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
            <span className="flex items-center gap-1.5 font-bold text-text-primary">
              <span className="w-2 h-2 rounded-full bg-status-merged" />
              SYSTEM STATUS: READY
            </span>
            <span className="text-border-bold hidden sm:inline" aria-hidden="true">•</span>
            <span className="text-text-muted hidden sm:inline">LOCAL-FIRST SQLITE WAL</span>
            <span className="text-border-bold hidden sm:inline" aria-hidden="true">•</span>
            <span className="text-text-muted hidden sm:inline">AES-256-GCM ENCRYPTED</span>
          </div>

          <button
            type="button"
            onClick={toggleCollapse}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-surface-elevated text-text-muted hover:text-text-primary text-xs font-mono transition-colors cursor-pointer shrink-0"
            title="Collapse hero section"
          >
            <span>Minimize</span>
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Commanding Headline & Honest Value Prop */}
        <div className="space-y-2 max-w-4xl">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-sans text-text-primary tracking-tight leading-tight">
            Unified Triage HUD for Open-Source Contributors
          </h1>
          <p className="text-sm sm:text-base font-sans text-text-muted leading-relaxed">
            Eliminate pull request scatter across GitHub and GitLab. Track maintainer reviews, test runs, and action signals in real time through a fast, local-first cockpit with zero telemetry tracking.
          </p>
        </div>

        {/* Feature Signal Grid (Impeccable Minimalist Spec) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs font-mono">
          <div className="p-2.5 rounded-xl border border-border-subtle bg-surface/80 flex items-start gap-2">
            <Radio className="h-4 w-4 text-accent-sapphire shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-text-primary text-xs">Sub-10ms SSE</div>
              <div className="text-[11px] text-text-muted">Live event streaming</div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl border border-border-subtle bg-surface/80 flex items-start gap-2">
            <Shield className="h-4 w-4 text-status-merged shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-text-primary text-xs">AES-256 Vault</div>
              <div className="text-[11px] text-text-muted">Encrypted provider keys</div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl border border-border-subtle bg-surface/80 flex items-start gap-2">
            <Layers className="h-4 w-4 text-accent-glacial shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-text-primary text-xs">Local SQLite</div>
              <div className="text-[11px] text-text-muted">Zero-latency queries</div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl border border-border-subtle bg-surface/80 flex items-start gap-2">
            <GitPullRequest className="h-4 w-4 text-status-amber shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-text-primary text-xs">Dual Platform</div>
              <div className="text-[11px] text-text-muted">GitHub + GitLab unified</div>
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {!isAuthenticated && !isDemoMode && (
            <>
              {onEnterDemoMode && (
                <button
                  type="button"
                  onClick={onEnterDemoMode}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-sans font-bold text-xs sm:text-sm transition-all shadow-sm cursor-pointer"
                >
                  <span>Explore Interactive Demo</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border-subtle bg-surface hover:bg-surface-elevated text-text-primary font-sans font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                <span>Connect GitHub &amp; GitLab</span>
              </button>
            </>
          )}

          {isDemoMode && (
            <>
              <div className="px-3.5 py-1.5 rounded-xl border border-accent-sapphire/40 bg-accent-sapphire/10 text-xs font-mono font-bold text-accent-sapphire flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent-sapphire" />
                <span>Simulating 7 Curated Open-Source PRs</span>
              </div>
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-sans font-bold text-xs transition-all shadow-sm cursor-pointer"
              >
                <span>Connect Real Account</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </>
          )}

          {isAuthenticated && (
            <>
              {onOpenTrackModal && (
                <button
                  type="button"
                  onClick={onOpenTrackModal}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-sans font-bold text-xs transition-all shadow-sm cursor-pointer"
                >
                  <span>Track New Pull Request</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onNavigateView('analytics')}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border-subtle bg-surface hover:bg-surface-elevated text-text-primary font-sans font-medium text-xs transition-colors cursor-pointer"
              >
                <span>View SLA Analytics</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => onNavigateView('about')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-text-muted hover:text-text-primary text-xs font-sans transition-colors cursor-pointer ml-auto"
          >
            <span>Architecture &amp; Story</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </header>
  );
};
