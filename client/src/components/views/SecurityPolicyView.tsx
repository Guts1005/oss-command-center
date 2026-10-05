import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Key,
  Webhook,
  Server,
  FileCheck,
  CheckCircle2,
  ArrowLeft,
  Scale,
  FileText,
  Cpu,
  Fingerprint,
  Database,
  ExternalLink,
  Info
} from 'lucide-react';
import { ViewMode } from '../../types';

interface SecurityPolicyViewProps {
  onBack: () => void;
  initialTab?: 'security' | 'terms' | 'privacy';
}

type PolicyTab = 'security' | 'terms' | 'privacy';

export const SecurityPolicyView: React.FC<SecurityPolicyViewProps> = ({ onBack, initialTab = 'security' }) => {
  const [activeTab, setActiveTab] = useState<PolicyTab>(initialTab);

  return (
    <div className="flex-1 flex flex-col min-h-0 py-3 overflow-y-auto custom-scrollbar w-full">
      {/* View Header with Return Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle bg-surface hover:bg-surface-elevated text-xs font-mono font-bold text-text-primary transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>RETURN TO STREAM</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-accent-sapphire" />
              <h1 className="text-base sm:text-xl lg:text-2xl font-extrabold uppercase font-sans tracking-tight text-text-primary">
                SECURITY, TERMS & PRIVACY GOVERNANCE
              </h1>
            </div>
            <p className="text-xs font-mono text-text-muted mt-0.5">
              Transparent operational standards, terms of service, and developer privacy commitments.
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 p-1 bg-surface-card border border-border-subtle rounded-xl shrink-0">
          {[
            { id: 'security' as PolicyTab, label: 'SECURITY POLICY', icon: Shield },
            { id: 'terms' as PolicyTab, label: 'TERMS OF SERVICE', icon: Scale },
            { id: 'privacy' as PolicyTab, label: 'PRIVACY POLICY', icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-surface-active text-text-primary border border-border-subtle shadow-sm'
                    : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-accent-sapphire' : 'text-text-muted'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Security Commitments */}
      {activeTab === 'security' && (
        <div className="space-y-5">
          <div className="p-5 rounded-xl border border-border-subtle bg-surface-card shadow-card">
            <h2 className="text-sm sm:text-base font-bold font-sans text-text-primary uppercase tracking-wider mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4 text-accent-sapphire" />
              <span>SECURITY COMMITMENTS & ARCHITECTURE</span>
            </h2>
            <p className="text-xs font-sans text-text-muted">
              We take the security of your developer credentials, API tokens, and contribution telemetry seriously.
              Below is an overview of the technical and organizational safeguards engineered into the OSS Command Center.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Safeguard 1: Token Encryption */}
            <div className="p-5 rounded-xl border border-border-subtle bg-surface-card shadow-card flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-accent-sapphire mb-2">
                  <Lock className="h-4 w-4" />
                  <h3 className="text-xs sm:text-sm font-bold font-sans uppercase tracking-wide">
                    CREDENTIAL ENCRYPTION AT REST
                  </h3>
                </div>
                <p className="text-xs font-sans text-text-muted leading-relaxed">
                  Third-party API access tokens for GitHub and GitLab are encrypted prior to being stored in the database.
                  Plaintext credentials are never written to disk, never printed in application logs, and never exposed in client API responses.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border-subtle text-[11px] font-mono text-accent-glacial">
                Guaranteed: Zero plaintext token persistence
              </div>
            </div>

            {/* Safeguard 2: Ephemeral Memory Handling */}
            <div className="p-5 rounded-xl border border-border-subtle bg-surface-card shadow-card flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-accent-glacial mb-2">
                  <Cpu className="h-4 w-4" />
                  <h3 className="text-xs sm:text-sm font-bold font-sans uppercase tracking-wide">
                    EPHEMERAL MEMORY DECRYPTION
                  </h3>
                </div>
                <p className="text-xs font-sans text-text-muted leading-relaxed">
                  Tokens are decrypted in memory only during active telemetry synchronization cycles with upstream GitHub or GitLab APIs.
                  Once the synchronization query completes, decrypted token handles are released immediately from runtime memory.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border-subtle text-[11px] font-mono text-accent-glacial">
                Guaranteed: No long-lived memory exposure
              </div>
            </div>

            {/* Safeguard 3: Multi-Tenant Boundary Isolation */}
            <div className="p-5 rounded-xl border border-border-subtle bg-surface-card shadow-card flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-accent-sapphire mb-2">
                  <Fingerprint className="h-4 w-4" />
                  <h3 className="text-xs sm:text-sm font-bold font-sans uppercase tracking-wide">
                    STRICT TENANT ISOLATION
                  </h3>
                </div>
                <p className="text-xs font-sans text-text-muted leading-relaxed">
                  All database queries, contribution feeds, and webhook settings are enforced with strict row-level user ownership boundaries.
                  One user can never inspect, modify, or leak contributions, repository lists, or credentials belonging to another user.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border-subtle text-[11px] font-mono text-accent-glacial">
                Guaranteed: Cryptographically verified session scoping
              </div>
            </div>

            {/* Safeguard 4: Transport Security */}
            <div className="p-5 rounded-xl border border-border-subtle bg-surface-card shadow-card flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-accent-glacial mb-2">
                  <Server className="h-4 w-4" />
                  <h3 className="text-xs sm:text-sm font-bold font-sans uppercase tracking-wide">
                    TRANSPORT LAYER ENCRYPTION (HTTPS & TLS)
                  </h3>
                </div>
                <p className="text-xs font-sans text-text-muted leading-relaxed">
                  All traffic between your browser and the OSS Command Center is encrypted using HTTPS and modern TLS protocols.
                  We mandate secure transport to protect against packet interception, man-in-the-middle tampering, and replay threats.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border-subtle text-[11px] font-mono text-accent-glacial">
                Guaranteed: End-to-end encrypted transport
              </div>
            </div>

            {/* Safeguard 5: Webhook Authenticity & Anti-Replay */}
            <div className="p-5 rounded-xl border border-border-subtle bg-surface-card shadow-card flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-accent-sapphire mb-2">
                  <Webhook className="h-4 w-4" />
                  <h3 className="text-xs sm:text-sm font-bold font-sans uppercase tracking-wide">
                    SIGNED WEBHOOK DISPATCH
                  </h3>
                </div>
                <p className="text-xs font-sans text-text-muted leading-relaxed">
                  Outbound real-time alerts sent to user-configured webhook sinks include a cryptographic signature header generated
                  with your secret key. Receivers can verify authenticity and discard replay attempts using the included timestamp tolerance window.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border-subtle text-[11px] font-mono text-accent-glacial">
                Guaranteed: Constant-time signature verification
              </div>
            </div>

            {/* Safeguard 6: Instant Data Destruction */}
            <div className="p-5 rounded-xl border border-border-subtle bg-surface-card shadow-card flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-accent-glacial mb-2">
                  <FileCheck className="h-4 w-4" />
                  <h3 className="text-xs sm:text-sm font-bold font-sans uppercase tracking-wide">
                    INSTANT CREDENTIAL PURGING
                  </h3>
                </div>
                <p className="text-xs font-sans text-text-muted leading-relaxed">
                  When you disconnect a GitHub or GitLab account, the platform immediately purges your stored access token and associated
                  contribution cache records in a single atomic transaction. No orphaned credentials remain in our database.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border-subtle text-[11px] font-mono text-accent-glacial">
                Guaranteed: Immediate, permanent removal on disconnect
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Terms of Service */}
      {activeTab === 'terms' && (
        <div className="p-6 rounded-xl border border-border-subtle bg-surface-card shadow-card space-y-6">
          <div className="border-b border-border-subtle pb-4">
            <h2 className="text-base sm:text-lg font-bold font-sans text-text-primary uppercase tracking-wider flex items-center gap-2">
              <Scale className="h-4 w-4 text-accent-sapphire" />
              <span>TERMS OF SERVICE AGREEMENT</span>
            </h2>
            <p className="text-xs font-mono text-text-muted mt-1">
              Last updated: September 2026. Governs your use of the OSS Command Center platform.
            </p>
          </div>

          <div className="space-y-5 text-xs font-sans text-text-muted leading-relaxed">
            <div>
              <h3 className="text-xs font-bold font-sans uppercase text-text-primary tracking-wide mb-1">
                1. ACCEPTANCE OF TERMS
              </h3>
              <p>
                By creating an account, accessing the application, or connecting API credentials to the OSS Command Center,
                you agree to be bound by these Terms of Service. If you do not agree to these terms, you should not access or use the application.
              </p>
            </div>

            <div>
              <h3 className="text-xs font-bold font-sans uppercase text-text-primary tracking-wide mb-1">
                2. PERMITTED & ACCEPTABLE USE
              </h3>
              <p>
                The OSS Command Center is intended solely for personal open-source contribution tracking, pull request triage,
                and developer workflow telemetry. You agree not to:
              </p>
              <ul className="list-disc pl-5 mt-1 space-y-0.5">
                <li>Configure abusive polling schedules or intentionally trigger upstream rate limits on GitHub or GitLab APIs.</li>
                <li>Attempt to bypass tenant isolation boundaries or access records belonging to other users.</li>
                <li>Use the service for automated denial-of-service, vulnerability exploitation, or unauthorized security scanning.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-bold font-sans uppercase text-text-primary tracking-wide mb-1">
                3. UPSTREAM PLATFORM COMPLIANCE
              </h3>
              <p>
                When connecting your personal access tokens, you represent that you have the lawful authority to grant access
                to your public repository activity. You remain solely responsible for adhering to the respective Terms of Service,
                API guidelines, and acceptable use policies of GitHub and GitLab.
              </p>
            </div>

            <div>
              <h3 className="text-xs font-bold font-sans uppercase text-text-primary tracking-wide mb-1">
                4. CONTENT OWNERSHIP & PRIVACY
              </h3>
              <p>
                You retain complete ownership of all code, commit data, review comments, and personal notes tracked through the service.
                We claim no intellectual property rights over any open-source contributions or repositories you monitor.
              </p>
            </div>

            <div>
              <h3 className="text-xs font-bold font-sans uppercase text-text-primary tracking-wide mb-1">
                5. DISCLAIMER OF WARRANTIES
              </h3>
              <p>
                The software and services are provided "as is", without warranty of any kind, express or implied, including but not
                limited to the warranties of merchantability, fitness for a particular purpose, and non-infringement.
                We do not warrant that the service will be uninterrupted, error-free, or entirely immune from third-party API outages.
              </p>
            </div>

            <div>
              <h3 className="text-xs font-bold font-sans uppercase text-text-primary tracking-wide mb-1">
                6. LIMITATION OF LIABILITY
              </h3>
              <p>
                In no event shall the authors, maintainers, or copyright holders be liable for any direct, indirect, incidental,
                special, or consequential damages arising from the use of, or inability to use, this application or upstream API services.
              </p>
            </div>

            <div>
              <h3 className="text-xs font-bold font-sans uppercase text-text-primary tracking-wide mb-1">
                7. TERMINATION & ACCOUNT DELETION
              </h3>
              <p>
                You may discontinue use of the service at any time. Disconnecting an account or requesting an account purge triggers
                immediate and permanent deletion of your stored credentials, cached pull request records, and associated telemetry.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Privacy Policy */}
      {activeTab === 'privacy' && (
        <div className="p-6 rounded-xl border border-border-subtle bg-surface-card shadow-card space-y-6">
          <div className="border-b border-border-subtle pb-4">
            <h2 className="text-base sm:text-lg font-bold font-sans text-text-primary uppercase tracking-wider flex items-center gap-2">
              <FileText className="h-4 w-4 text-accent-sapphire" />
              <span>PRIVACY POLICY & DATA GOVERNANCE</span>
            </h2>
            <p className="text-xs font-mono text-text-muted mt-1">
              Last updated: September 2026. Clear, transparent developer privacy standards.
            </p>
          </div>

          <div className="space-y-5 text-xs font-sans text-text-muted leading-relaxed">
            <div>
              <h3 className="text-xs font-bold font-sans uppercase text-text-primary tracking-wide mb-1">
                DATA CONTROLLER
              </h3>
              <p>
                This application is maintained by Sharvin as an open-source contribution telemetry platform.
                If you have questions about how your data is handled or wish to exercise your privacy rights,
                you can reach out directly via the project repository or developer contact channels.
              </p>
            </div>

            <div>
              <h3 className="text-xs font-bold font-sans uppercase text-text-primary tracking-wide mb-1">
                WHAT DATA WE PROCESS
              </h3>
              <p>
                We collect only the minimal data strictly necessary to provide real-time contribution tracking:
              </p>
              <ul className="list-disc pl-5 mt-1 space-y-0.5">
                <li><strong className="text-text-primary">Account Credentials:</strong> Username, email address, and an encrypted password digest for authentication.</li>
                <li><strong className="text-text-primary">API Access Tokens:</strong> Personal Access Tokens you provide to authenticate with GitHub and GitLab. These are encrypted at rest.</li>
                <li><strong className="text-text-primary">Contribution Records:</strong> Repository names, PR numbers, titles, timestamps, and review statuses queried directly from upstream public APIs.</li>
                <li><strong className="text-text-primary">Triage Notes & Preferences:</strong> Notes and labels you write to organize your personal review queue, plus UI display preferences.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-bold font-sans uppercase text-text-primary tracking-wide mb-1">
                ZERO ADVERTISING & NO DATA SELLING
              </h3>
              <p>
                We do not display advertisements. We do not sell, rent, or trade your personal data, tokens, or contribution
                history to third parties, brokers, or marketing networks. No third-party behavioral profiling trackers or analytics scripts are embedded.
              </p>
            </div>

            <div>
              <h3 className="text-xs font-bold font-sans uppercase text-text-primary tracking-wide mb-1">
                COOKIES & LOCAL STORAGE
              </h3>
              <p>
                We use cookies and localStorage exclusively for core, requested functionality:
              </p>
              <ul className="list-disc pl-5 mt-1 space-y-0.5">
                <li><strong className="text-text-primary">token:</strong> An HttpOnly, SameSite cookie maintaining your active authenticated session.</li>
                <li><strong className="text-text-primary">oss_theme:</strong> Stores your Dark or Light mode appearance preference in local browser storage.</li>
                <li><strong className="text-text-primary">oss_default_view & oss_card_density:</strong> Remembers your preferred startup view and list density.</li>
              </ul>
              <p className="mt-1">
                You can inspect and customize your storage settings at any time via the Cookie Preferences modal in the footer.
              </p>
            </div>

            <div>
              <h3 className="text-xs font-bold font-sans uppercase text-text-primary tracking-wide mb-1">
                DATA RETENTION & PERMANENT DELETION
              </h3>
              <p>
                Your data is retained only while your account is active. When you disconnect an integration or terminate your session,
                all associated API tokens and cached telemetry records are permanently deleted from the database.
              </p>
            </div>

            <div>
              <h3 className="text-xs font-bold font-sans uppercase text-text-primary tracking-wide mb-1">
                YOUR RIGHTS & DATA PORTABILITY
              </h3>
              <p>
                Under modern data protection regulations (including GDPR principles), you have the right to access, rectify, or request
                deletion of all your stored data. You can download an immediate, complete JSON export of all your stored telemetry and
                settings at any time via Settings &gt; Data Management.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
