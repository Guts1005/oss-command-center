import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Github,
  Terminal,
  Zap,
  ShieldCheck,
  Sparkles,
  Layers,
  Code2,
  ExternalLink,
  Radio,
  BookOpen,
  ArrowRight,
  Shield,
  FileText,
  Cpu,
  Orbit,
  Server,
  Globe,
  Award,
  Linkedin,
  Mail,
  GraduationCap,
  HardDrive,
  Activity,
  HeartHandshake
} from 'lucide-react';
import { ViewMode } from '../../types';
import { CookiePreferencesModal } from '../CookiePreferencesModal';
import { TopologicalBackdrop } from './TopologicalBackdrop';
import { Footer } from '../Footer';
import { useWheelScroll } from '../../hooks/useWheelScroll';

interface AboutViewProps {
  onBack: () => void;
  onNavigateView?: (mode: ViewMode) => void;
  onOpenCookiePreferences?: () => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ onBack, onNavigateView, onOpenCookiePreferences }) => {
  const [isCookieModalOpen, setIsCookieModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  useWheelScroll(containerRef);

  const skillPills = [
    { label: 'RTEMS Space-Grade RTOS', color: 'border-accent-sapphire/40 bg-accent-sapphire/10 text-accent-sapphire' },
    { label: 'POSIX & Kernel Internals', color: 'border-status-merged/40 bg-status-merged/10 text-status-merged' },
    { label: 'Modern C & C++ (17/20)', color: 'border-border-bold bg-surface-elevated text-text-primary' },
    { label: 'Python & PyTorch', color: 'border-accent-glacial/40 bg-accent-glacial/10 text-accent-glacial' },
    { label: 'vLLM & Dynamic Batching', color: 'border-status-action/40 bg-status-action/10 text-status-action' },
    { label: 'WebRTC & Low-Latency Media', color: 'border-accent-sapphire/40 bg-accent-sapphire/10 text-accent-sapphire' },
    { label: 'FFmpeg & SRS Pipelines', color: 'border-accent-glacial/40 bg-accent-glacial/10 text-accent-glacial' },
    { label: 'Embedded Linux & Raspberry Pi', color: 'border-status-merged/40 bg-status-merged/10 text-status-merged' },
    { label: 'TypeScript & React 18', color: 'border-border-bold bg-surface-elevated text-text-primary' },
    { label: 'SQLite WAL & Local-First', color: 'border-status-action/40 bg-status-action/10 text-status-action' },
  ];

  const experienceCards = [
    {
      period: 'Feb 2026 – Present',
      role: 'Open Source Kernel Contributor',
      org: 'RTEMS Project',
      type: 'Upstream Space-Grade Operating System',
      description:
        'Contributed upstream patches to the RTEMS space-grade real-time operating system kernel (deployed on ESA and NASA flight missions). Hardened watchdog timer validation logic and POSIX clock boundary checks across kernel core routines (coretodcheck.c, clock.h). Investigated 34-bit timer rollover constraints up to year 2400 to prevent edge-case integer overflows in real-time scheduling.',
      badge: 'Kernel Core',
      badgeColor: 'border-status-merged/40 bg-status-merged/10 text-status-merged',
      icon: Orbit,
    },
    {
      period: 'Aug 2025 – Feb 2026',
      role: 'AI Systems Engineer Intern',
      org: 'Aspire Vision',
      type: 'Industrial Safety & Edge Media',
      description:
        'Engineered real-time edge video streaming pipelines for an industrial smart-helmet safety system, achieving sub-300ms glass-to-glass latency over WebRTC / HTTP-FLV using FFmpeg and local SRS Docker containers on Raspberry Pi ARM. Configured zero-trust outbound Cloudflare Tunnels (cloudflared) bypassing carrier-grade NAT across 4 field sites. Designed offline resilience daemons managing physical GPIO camera triggers.',
      badge: 'Edge Streaming',
      badgeColor: 'border-accent-sapphire/40 bg-accent-sapphire/10 text-accent-sapphire',
      icon: Radio,
    },
    {
      period: 'May 2025 – Aug 2025',
      role: 'Embedded Systems Intern',
      org: 'Entice Engineering',
      type: 'Industrial Hardware & Telemetry',
      description:
        'Built a Python-based video capture and GPS metadata tagging pipeline on embedded Raspberry Pi hardware for field data collection. Interfaced GPIO sensors and optimized OpenCV frame processing routines under tight embedded memory and thermal limits.',
      badge: 'Embedded Linux',
      badgeColor: 'border-accent-glacial/40 bg-accent-glacial/10 text-accent-glacial',
      icon: Cpu,
    },
    {
      period: 'Research & Systems Benchmarking',
      role: 'High-Throughput LLM Serving Engine',
      org: 'Personal Engineering Project',
      type: 'GPU Memory & Kernel Optimization',
      description:
        'Designed an empirical continuous dynamic batching benchmark harness for Qwen 2.5 7B on an Ampere 12GB GPU (RTX 3060), scaling throughput from 57.2 tok/s to 592.0 tok/s (10.35x scaling) across 20 concurrent streams. Implemented AutoAWQ Marlin W4A16 GEMM kernels to reserve 3.6 GiB VRAM for a 67,440-token PagedAttention KV-cache pool with an 87.1% Radix-Tree Prefix Cache hit rate.',
      badge: 'vLLM / CUDA',
      badgeColor: 'border-status-action/40 bg-status-action/10 text-status-action',
      icon: Zap,
    },
    {
      period: 'Open Source',
      role: 'Streaming-Rpi Stack',
      org: 'GitHub: @Guts1005/Streaming-Rpi',
      type: 'Wearable Camera Media Stack',
      description:
        'Built and open-sourced a wearable camera streaming stack on Raspberry Pi with hardware-accelerated H.264 ingestion, an SRS Docker container, and a Next.js / React control plane dashboard with sub-300ms glass-to-glass latency.',
      badge: 'Open Source',
      badgeColor: 'border-status-merged/40 bg-status-merged/10 text-status-merged',
      icon: Code2,
    },
    {
      period: '2023 – 2028',
      role: 'MBA Tech in Computer Engineering',
      org: 'NMIMS MPSTME, Mumbai',
      type: 'Integrated B.Tech + MBA',
      description:
        'Undergraduate coursework focused on Operating Systems, Computer Networks, Data Structures & Algorithms, Object-Oriented Design in C++, DBMS, and Digital Electronics. Smart India Hackathon National Finalist, AWS Academy Graduate (Cloud Architecting), and NPTEL Elite Certificate holder (IIT Kanpur).',
      badge: 'Education',
      badgeColor: 'border-border-bold bg-surface-elevated text-text-primary',
      icon: GraduationCap,
    },
  ];

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col min-h-0 py-3 overflow-y-auto custom-scrollbar w-full relative"
    >
      {/* Animated Design Backdrop: Flowing Topological Elevation Mesh */}
      <TopologicalBackdrop scrollContainerRef={containerRef} opacity={0.36} />

      {/* Main Content Container wrapped for smooth momentum scrolling */}
      <div className="relative z-10 w-full flex flex-col min-h-full">
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

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="https://github.com/Guts1005"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle bg-surface hover:bg-surface-elevated text-xs font-mono font-bold text-text-primary transition-colors"
            >
              <Github className="h-3.5 w-3.5" />
              <span>@Guts1005</span>
              <ExternalLink className="h-3 w-3 text-text-muted" />
            </a>
            <a
              href="https://linkedin.com/in/sharvinneve"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle bg-surface hover:bg-surface-elevated text-xs font-mono font-bold text-text-primary transition-colors"
            >
              <Linkedin className="h-3.5 w-3.5" />
              <span>sharvinneve</span>
              <ExternalLink className="h-3 w-3 text-text-muted" />
            </a>
            <a
              href="mailto:sharvinneve67@gmail.com"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle bg-surface hover:bg-surface-elevated text-xs font-mono font-bold text-text-primary transition-colors"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Email</span>
            </a>
          </div>
        </div>

        {/* Main Content Sections */}
        <div className="space-y-12">
          {/* Section 1: Genuine Greeting Hero with Skill Pills */}
          <section className="space-y-6">
            <div className="space-y-3">
              <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold font-sans text-text-primary tracking-tight leading-[1.1]">
                Hi, I'm <span className="text-accent-sapphire font-black">Sharvin</span>.
              </h1>
              <p className="text-sm sm:text-base font-sans text-text-muted max-w-3xl leading-relaxed">
                Undergraduate at NMIMS MPSTME, Mumbai (Integrated B.Tech + MBA, 2023-2028). I enjoy working close to the machine—focusing on operating systems, kernel internals, low-latency edge media pipelines, and quiet, useful open-source software.
              </p>
            </div>

            {/* Skill Pills */}
            <div className="flex flex-wrap gap-2 pt-1">
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

          {/* Section 2: Narrative Split Bio (Honest, Grounded, Faithful) */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start p-6 sm:p-8 rounded-2xl border border-border-subtle bg-surface-card shadow-card">
            <div className="lg:col-span-5 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-surface-elevated border border-border-bold flex items-center justify-center text-accent-sapphire shadow-inner">
                <Terminal className="h-7 w-7" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-sans text-text-primary tracking-tight">
                Curiosity from the kernel to the screen.
              </h2>
              <p className="text-sm font-sans text-text-muted leading-relaxed">
                I believe software becomes clearer and more reliable when you take the time to understand the whole stack—from hardware interrupts and scheduler clocks up to the user interface.
              </p>
            </div>

            <div className="lg:col-span-7 space-y-4 text-sm sm:text-base font-sans text-text-muted leading-relaxed border-t lg:border-t-0 lg:border-l border-border-subtle pt-6 lg:pt-0 lg:pl-8">
              <p className="text-text-primary font-medium">
                I didn't start in software wanting to chase buzzwords or build things on top of abstractions I didn't understand. What genuinely pulled me in was the question of what happens under the hood when a system runs under pressure.
              </p>
              <p>
                That curiosity led me to explore space-grade real-time kernels, embedded ARM hardware, low-latency video streaming, and high-throughput LLM batching. Whether I'm looking at watchdog clock rollover edge-cases in RTEMS, tuning WebRTC pipelines on a Raspberry Pi, or profiling GPU prefix caches, I try to stay grounded in real benchmarks and standard library fundamentals.
              </p>
              <p>
                I'm still early in my journey, but I care deeply about writing honest code that doesn't waste user compute, does not compromise on test coverage, and respects people's time.
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-4">
                <a
                  href="https://github.com/Guts1005"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-mono font-bold text-accent-sapphire hover:underline"
                >
                  <span>EXPLORE MY GITHUB REPOSITORIES</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </section>

          {/* Section 3: Why I Built OSS Command Center */}
          <section className="p-6 sm:p-8 rounded-2xl border border-border-subtle bg-surface-card shadow-card space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-surface-elevated border border-border-bold flex items-center justify-center text-status-merged">
                <Code2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold font-sans text-text-primary uppercase tracking-wider">
                  WHY I BUILT OSS COMMAND CENTER
                </h2>
                <p className="text-xs font-mono text-text-muted">
                  A personal tool born from the friction of multi-repository open-source contributions.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 text-sm font-sans text-text-muted leading-relaxed">
              <div className="space-y-2">
                <h3 className="font-bold text-text-primary text-sm uppercase tracking-wide flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-action" />
                  The Scatter Problem
                </h3>
                <p className="text-xs sm:text-sm">
                  When you contribute across different upstream repos and platforms (GitHub, GitLab), PR reviews, CI failures, and maintainer questions get buried in email noise and disparate tabs. It's easy to lose momentum.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-text-primary text-sm uppercase tracking-wide flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-sapphire" />
                  Local-First & Private
                </h3>
                <p className="text-xs sm:text-sm">
                  I didn't want another bloated SaaS platform tracking my activity or holding my tokens on external servers. OSS Command Center keeps data local in SQLite WAL, encrypts access tokens with AES-256-GCM, and stays responsive.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-text-primary text-sm uppercase tracking-wide flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-merged" />
                  Signal Over Noise
                </h3>
                <p className="text-xs sm:text-sm">
                  The goal is simple: show exactly which pull requests require an action, which are waiting on maintainers, and what has been merged—with zero-latency Server-Sent Events and clean tactile keyboard navigation.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: Real Hands-On Experience & Contributions (Honest & Verifiable) */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-accent-sapphire" />
                <h2 className="text-lg sm:text-xl font-bold font-sans text-text-primary uppercase tracking-wider">
                  EXPERIENCE & UPSTREAM CONTRIBUTIONS
                </h2>
              </div>
              <span className="text-xs font-mono text-text-muted">
                Real code, measured benchmarks, and upstream patches
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {experienceCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.role + card.org}
                    className="p-5 sm:p-6 rounded-xl border border-border-subtle bg-surface-card shadow-card flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold border ${card.badgeColor}`}>
                          {card.badge}
                        </span>
                        <span className="text-[11px] font-mono text-text-muted">
                          {card.period}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h3 className="text-base font-bold font-sans text-text-primary leading-snug flex items-center gap-2">
                          <Icon className="h-4 w-4 text-text-muted shrink-0" />
                          <span>{card.role}</span>
                        </h3>
                        <div className="text-xs font-mono text-accent-sapphire font-semibold">
                          {card.org}
                        </div>
                        <div className="text-[11px] font-mono text-text-muted">
                          {card.type}
                        </div>
                      </div>

                      <p className="text-xs font-sans text-text-muted leading-relaxed pt-1">
                        {card.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Section 5: Engineering Principles (Warm, Honest, Practical) */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <HeartHandshake className="h-5 w-5 text-status-merged" />
              <h2 className="text-lg sm:text-xl font-bold font-sans text-text-primary uppercase tracking-wider">
                HOW I APPROACH ENGINEERING
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 sm:p-6 rounded-xl border border-border-subtle bg-surface-card shadow-card space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-accent-sapphire" />
                  <h3 className="text-sm sm:text-base font-bold font-sans text-text-primary uppercase tracking-wide">
                    Understand Before Abstracting
                  </h3>
                </div>
                <p className="text-xs sm:text-sm font-sans text-text-muted leading-relaxed">
                  Read the docs, trace the system calls, and understand what the underlying machine is doing before reaching for third-party libraries. Real simplicity is the result of thorough understanding, not layers of boilerplate.
                </p>
              </div>

              <div className="p-5 sm:p-6 rounded-xl border border-border-subtle bg-surface-card shadow-card space-y-3">
                <div className="flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-status-merged" />
                  <h3 className="text-sm sm:text-base font-bold font-sans text-text-primary uppercase tracking-wide">
                    Respect the Machine
                  </h3>
                </div>
                <p className="text-xs sm:text-sm font-sans text-text-muted leading-relaxed">
                  Whether it's an embedded ARM board with tight memory constraints, a real-time RTOS tick, or a user's browser, compute cycles and RAM are finite. Software should be light, fast, and mindful of resources.
                </p>
              </div>

              <div className="p-5 sm:p-6 rounded-xl border border-border-subtle bg-surface-card shadow-card space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-accent-glacial" />
                  <h3 className="text-sm sm:text-base font-bold font-sans text-text-primary uppercase tracking-wide">
                    Honesty & Continuous Learning
                  </h3>
                </div>
                <p className="text-xs sm:text-sm font-sans text-text-muted leading-relaxed">
                  Admit when you don't know something, ask good questions, write testable code, and measure before and after. Engineering is about steady improvement and intellectual honesty, not showing off.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6: Production Stack Specification */}
          <section className="p-6 rounded-xl border border-border-subtle bg-surface-card shadow-card space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-accent-sapphire" />
              <h2 className="text-lg sm:text-xl font-bold font-sans text-text-primary uppercase tracking-wider">
                APPLICATION STACK SPECIFICATION
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
                <div className="text-[11px] text-text-muted mt-0.5">REST APIs + Real-Time SSE</div>
              </div>

              <div className="p-3.5 rounded-lg border border-border-subtle bg-surface">
                <div className="text-[10px] text-text-muted uppercase mb-1">LOCAL-FIRST STORAGE</div>
                <div className="text-text-primary font-bold text-sm">SQLite 3 (WAL Mode)</div>
                <div className="text-[11px] text-text-muted mt-0.5">AES-256-GCM Vault</div>
              </div>
            </div>
          </section>

          {/* Section 7: Warm Contact & Connect Block */}
          <section className="p-8 sm:p-10 rounded-2xl border border-border-subtle bg-gradient-to-br from-surface-card to-surface-elevated text-center space-y-4 shadow-card">
            <h2 className="text-2xl sm:text-3xl font-extrabold font-sans text-text-primary tracking-tight">
              Let's connect and talk systems.
            </h2>
            <p className="text-sm font-sans text-text-muted max-w-xl mx-auto leading-relaxed">
              I'm always glad to talk about operating systems, kernel internals, edge video streaming, or open-source projects. Feel free to reach out, connect on LinkedIn, or explore my GitHub.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <a
                href="https://github.com/Guts1005"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs transition-all shadow-sm"
              >
                <Github className="h-4 w-4" />
                <span>GITHUB: @Guts1005</span>
              </a>
              <a
                href="https://linkedin.com/in/sharvinneve"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border-subtle bg-surface hover:bg-surface-elevated text-text-primary font-mono font-bold text-xs transition-all"
              >
                <Linkedin className="h-4 w-4 text-accent-sapphire" />
                <span>LINKEDIN: sharvinneve</span>
              </a>
              <a
                href="mailto:sharvinneve67@gmail.com"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border-subtle bg-surface hover:bg-surface-elevated text-text-primary font-mono font-bold text-xs transition-all"
              >
                <Mail className="h-4 w-4 text-accent-glacial" />
                <span>sharvinneve67@gmail.com</span>
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
