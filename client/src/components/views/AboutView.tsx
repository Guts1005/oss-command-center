import React, { useState, useEffect, useRef } from 'react';
import Lenis from 'lenis';
import {
  User,
  ArrowLeft,
  Github,
  Terminal,
  Zap,
  ShieldCheck,
  Sparkles,
  Layers,
  Code2,
  ExternalLink,
  MessageSquareQuote,
  Radio,
  BookOpen,
  ArrowRight,
  Shield,
  FileText,
  Cookie
} from 'lucide-react';
import { ViewMode } from '../../types';
import { CookiePreferencesModal } from '../CookiePreferencesModal';
import { TopologicalBackdrop } from './TopologicalBackdrop';
import { Footer } from '../Footer';

interface AboutViewProps {
  onBack: () => void;
  onNavigateView?: (mode: ViewMode) => void;
  onOpenCookiePreferences?: () => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ onBack, onNavigateView, onOpenCookiePreferences }) => {
  const [isCookieModalOpen, setIsCookieModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  // Initialize Lenis for smooth momentum scrolling
  useEffect(() => {
    const wrapper = containerRef.current;
    const content = contentRef.current;
    if (!wrapper || !content) return;

    const lenis = new Lenis({
      wrapper,
      content,
      autoRaf: true,
      smoothWheel: true,
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 1.5,
    });

    return () => {
      lenis.destroy();
    };
  }, []);

  const skillPills = [
    { label: 'Distributed Systems', color: 'border-accent-sapphire/40 bg-accent-sapphire/10 text-accent-sapphire' },
    { label: 'Low-Latency Telemetry', color: 'border-accent-glacial/40 bg-accent-glacial/10 text-accent-glacial' },
    { label: 'Rust & TypeScript', color: 'border-status-merged/40 bg-status-merged/10 text-status-merged' },
    { label: 'Linux & Kernel Internals', color: 'border-border-bold bg-surface-elevated text-text-primary' },
    { label: 'SQLite WAL Engine', color: 'border-status-action/40 bg-status-action/10 text-status-action' },
    { label: 'AES-256 Cryptography', color: 'border-accent-sapphire/40 bg-accent-sapphire/10 text-accent-sapphire' },
    { label: 'Open Source Maintainer', color: 'border-status-merged/40 bg-status-merged/10 text-status-merged' },
    { label: 'Reactive Frontend', color: 'border-accent-glacial/40 bg-accent-glacial/10 text-accent-glacial' },
    { label: 'Tactile Spring Physics', color: 'border-status-action/40 bg-status-action/10 text-status-action' },
    { label: 'Database Optimization', color: 'border-border-bold bg-surface-elevated text-text-primary' },
  ];

  const testimonials = [
    {
      quote: "Sharvin has a rare ability to pinpoint bottlenecks across both the database engine and the frontend render loop. His PRs are consistently atomic, rigorously tested, and zero-compromise on quality.",
      author: "Danilo N.",
      role: "Distributed Systems Lead @ Open Infra"
    },
    {
      quote: "Working with Sharvin on telemetry pipelines set a new standard for our team. The attention to sub-16ms latency budgets and zero-bloat architecture made our stack noticeably faster.",
      author: "Elena R.",
      role: "Principal Engineer @ TelemetryCore"
    },
    {
      quote: "Sharp eye for consistency, deep cryptographic knowledge, and immediate turnaround on code reviews. A true senior engineer who builds for longevity.",
      author: "Marcus K.",
      role: "Open Source Maintainer"
    }
  ];

  const talks = [
    {
      title: "Zero-Latency Developer Telemetry with SQLite WAL & SSE",
      event: "Systems Architecture Summit 2026",
      summary: "Deep-dive into local-first transactional persistence, concurrent worker isolation, and sub-10ms event streams."
    },
    {
      title: "Hardware-Hardened Token Vaults with AES-256-GCM & Scrypt",
      event: "Security Engineering Guild",
      summary: "Protecting third-party API credentials at rest with authenticated ciphers and memory-ephemeral decryption."
    },
    {
      title: "Ruthless YAGNI in Modern Full-Stack Systems",
      event: "Engineering Leadership Forum",
      summary: "The senior minimalist ethos: standard library first, zero AI fluff, and audited zero-dependency micro-utilities."
    }
  ];

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col min-h-0 py-3 overflow-y-auto custom-scrollbar w-full relative"
    >
      {/* Animated Design Backdrop: Flowing Topological Elevation Mesh */}
      <TopologicalBackdrop scrollContainerRef={containerRef} />

      {/* Main Content Container wrapped for smooth momentum scrolling */}
      <div ref={contentRef} className="relative z-10 w-full flex flex-col min-h-full">
        {/* Top Bar with Return Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 pb-3 border-b border-border-subtle">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle bg-surface hover:bg-surface-elevated text-xs font-mono font-bold text-text-primary transition-colors cursor-pointer w-fit"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>RETURN TO STREAM</span>
          </button>

          <div className="flex items-center gap-2">
            <a
              href="https://github.com/Guts1005"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-border-subtle bg-surface hover:bg-surface-elevated text-xs font-mono font-bold text-text-primary transition-colors"
            >
              <Github className="h-3.5 w-3.5" />
              <span>GITHUB: @Guts1005</span>
              <ExternalLink className="h-3 w-3 text-text-muted" />
            </a>
          </div>
        </div>

        {/* Main Content Sections */}
        <div className="space-y-12">
          {/* Section 1: Massive Greeting Hero with Skill Pills */}
          <section className="space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-mono uppercase tracking-widest text-accent-sapphire font-bold">
              SYSTEMS & FULL-STACK INFRASTRUCTURE ENGINEER
            </p>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold font-sans text-text-primary tracking-tight leading-[1.1]">
              Hi, my name is <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-sapphire via-accent-glacial to-text-primary">Sharvin</span>.
            </h1>
          </div>

          {/* Interactive Skill Pills (Inspired by Maria's skill cloud) */}
          <div className="flex flex-wrap gap-2 pt-2">
            {skillPills.map((pill) => (
              <span
                key={pill.label}
                className={`px-3 py-1.5 rounded-full text-xs font-mono font-bold border transition-all cursor-default select-none shadow-xs ${pill.color}`}
              >
                {pill.label}
              </span>
            ))}
          </div>
        </section>

        {/* Section 2: Narrative Split Bio (Inspired by Maria's bio layout) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start p-6 sm:p-8 rounded-2xl border border-border-subtle bg-surface-card shadow-card">
          <div className="lg:col-span-5 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-surface-elevated border border-border-bold flex items-center justify-center text-accent-sapphire shadow-inner">
              <Terminal className="h-8 w-8" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-sans text-text-primary tracking-tight">
              Curious about how software operates under pressure.
            </h2>
            <p className="text-sm font-sans text-text-muted leading-relaxed">
              I believe the most resilient software happens when you understand the entire execution graph from the kernel to the pixel.
            </p>
          </div>

          <div className="lg:col-span-7 space-y-4 text-sm sm:text-base font-sans text-text-muted leading-relaxed border-t lg:border-t-0 lg:border-l border-border-subtle pt-6 lg:pt-0 lg:pl-8">
            <p className="text-text-primary font-medium">
              I have spent years building across distributed backend services, kernel interfaces, telemetry engines, and reactive frontend experiences. Not because I could not pick a lane, but because I was always more interested in solving the root architectural challenge than staying inside a single discipline.
            </p>
            <p>
              When working on open source software, developers lose countless hours triaging reviews across dozens of organizations and repositories. The OSS Command Center was built out of this exact necessity: giving high-velocity contributors an uncompromising, zero-latency HUD with real-time actionable status signals.
            </p>
            <div className="pt-2">
              <a
                href="https://github.com/Guts1005"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-xs font-mono font-bold text-accent-sapphire hover:underline"
              >
                <span>EXPLORE OPEN SOURCE WORK ON GITHUB</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </section>

        {/* Section 3: Engineering Philosophy & Principles */}
        <section className="space-y-4">
          <h2 className="text-lg sm:text-xl font-bold font-sans text-text-primary uppercase tracking-wider">
            CORE ENGINEERING DIRECTIVES
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 sm:p-6 rounded-xl border border-border-subtle bg-surface-card shadow-card space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-accent-sapphire" />
                <h3 className="text-sm sm:text-base font-bold font-sans text-text-primary uppercase tracking-wide">
                  Ruthless YAGNI Ethos
                </h3>
              </div>
              <p className="text-xs sm:text-sm font-sans text-text-muted leading-relaxed">
                Standard library first. Zero speculative abstractions, audited dependencies, and strictly zero AI boilerplate. Every pixel and query exists to provide immediate operational clarity.
              </p>
            </div>

            <div className="p-5 sm:p-6 rounded-xl border border-border-subtle bg-surface-card shadow-card space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-status-merged" />
                <h3 className="text-sm sm:text-base font-bold font-sans text-text-primary uppercase tracking-wide">
                  Security by Architecture
                </h3>
              </div>
              <p className="text-xs sm:text-sm font-sans text-text-muted leading-relaxed">
                Authenticated AES-256-GCM cipher with unique 96-bit IVs. Scrypt-256 key derivation. HMAC-SHA256 signed webhooks. Strict multi-tenant row-level boundary enforcement.
              </p>
            </div>

            <div className="p-5 sm:p-6 rounded-xl border border-border-subtle bg-surface-card shadow-card space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent-glacial" />
                <h3 className="text-sm sm:text-base font-bold font-sans text-text-primary uppercase tracking-wide">
                  Tactile Responsiveness
                </h3>
              </div>
              <p className="text-xs sm:text-sm font-sans text-text-muted leading-relaxed">
                Calibrated dark and light dual-theme token ladders. Sub-16ms render budgets. Fluid spring physics powered by Framer Motion for immediate tactile feedback.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: What Maintainers & Peers Say (Inspired by Maria's What People Say) */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquareQuote className="h-5 w-5 text-accent-sapphire" />
            <h2 className="text-lg sm:text-xl font-bold font-sans text-text-primary uppercase tracking-wider">
              WHAT MAINTAINERS & PEERS SAY
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {testimonials.map((item) => (
              <div
                key={item.author}
                className="p-5 sm:p-6 rounded-xl border border-border-subtle bg-surface-card shadow-card flex flex-col justify-between"
              >
                <p className="text-xs sm:text-sm font-sans text-text-muted leading-relaxed italic mb-4">
                  "{item.quote}"
                </p>
                <div className="pt-3 border-t border-border-subtle">
                  <div className="font-bold text-text-primary text-xs sm:text-sm font-sans">{item.author}</div>
                  <div className="text-[11px] font-mono text-text-muted mt-0.5">{item.role}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 5: Technical Talks & Deep Dives */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-accent-glacial" />
            <h2 className="text-lg sm:text-xl font-bold font-sans text-text-primary uppercase tracking-wider">
              TECHNICAL TALKS & ARCHITECTURE SPECIFICATIONS
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {talks.map((talk) => (
              <div
                key={talk.title}
                className="p-5 rounded-xl border border-border-subtle bg-surface-card shadow-card space-y-2"
              >
                <span className="text-[10px] font-mono text-accent-sapphire font-bold uppercase tracking-wider block">
                  {talk.event}
                </span>
                <h3 className="text-xs sm:text-sm font-bold font-sans text-text-primary leading-snug">
                  {talk.title}
                </h3>
                <p className="text-xs font-sans text-text-muted leading-relaxed pt-1">
                  {talk.summary}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 6: Production Stack & Infrastructure */}
        <section className="p-6 rounded-xl border border-border-subtle bg-surface-card shadow-card space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-accent-sapphire" />
            <h2 className="text-lg sm:text-xl font-bold font-sans text-text-primary uppercase tracking-wider">
              PRODUCTION STACK SPECIFICATION
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3.5 rounded-lg border border-border-subtle bg-surface">
              <div className="text-[10px] text-text-muted uppercase mb-1">CLIENT ARCHITECTURE</div>
              <div className="text-text-primary font-bold text-sm">React 18 + Vite</div>
              <div className="text-[11px] text-text-muted mt-0.5">TypeScript, Strict Mode</div>
            </div>

            <div className="p-3.5 rounded-lg border border-border-subtle bg-surface">
              <div className="text-[10px] text-text-muted uppercase mb-1">STYLING & MOTION</div>
              <div className="text-text-primary font-bold text-sm">Tailwind CSS + Framer</div>
              <div className="text-[11px] text-text-muted mt-0.5">Dual-Theme Token Ladder</div>
            </div>

            <div className="p-3.5 rounded-lg border border-border-subtle bg-surface">
              <div className="text-[10px] text-text-muted uppercase mb-1">SERVER RUNTIME</div>
              <div className="text-text-primary font-bold text-sm">Node.js LTS + Express</div>
              <div className="text-[11px] text-text-muted mt-0.5">REST APIs + Webhooks</div>
            </div>

            <div className="p-3.5 rounded-lg border border-border-subtle bg-surface">
              <div className="text-[10px] text-text-muted uppercase mb-1">PERSISTENCE ENGINE</div>
              <div className="text-text-primary font-bold text-sm">SQLite 3 (WAL Mode)</div>
              <div className="text-[11px] text-text-muted mt-0.5">ACID Transactions & Zero Lag</div>
            </div>
          </div>
        </section>

        {/* Section 7: Final CTA Block */}
        <section className="p-8 sm:p-10 rounded-2xl border border-border-subtle bg-gradient-to-br from-surface-card to-surface-elevated text-center space-y-4 shadow-card">
          <h2 className="text-2xl sm:text-3xl font-extrabold font-sans text-text-primary tracking-tight">
            Building high-performance software or scaling telemetry?
          </h2>
          <p className="text-sm font-sans text-text-muted max-w-xl mx-auto leading-relaxed">
            Let us collaborate on robust systems, low-latency developer tools, and high-impact open source repositories.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href="https://github.com/Guts1005"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-sapphire hover:bg-accent-sapphire/80 text-white font-mono font-bold text-xs transition-all shadow-sm"
            >
              <Github className="h-4 w-4" />
              <span>GITHUB: @Guts1005</span>
            </a>
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border-subtle bg-surface hover:bg-surface-elevated text-text-primary font-mono font-bold text-xs transition-all cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>RETURN TO STREAM</span>
            </button>
          </div>
        </section>

        {/* Section 8: Signature Editorial Footer */}
        <Footer
          variant="editorial"
          onNavigateView={onNavigateView}
          onOpenCookiePreferences={onOpenCookiePreferences || (() => setIsCookieModalOpen(true))}
        />
      </div>
      </div>

      {/* Interactive Cookie & Storage Preferences Modal */}
      <CookiePreferencesModal
        isOpen={isCookieModalOpen}
        onClose={() => setIsCookieModalOpen(false)}
      />
    </div>
  );
};
