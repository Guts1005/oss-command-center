import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X, CheckCircle2, Shield, Sliders, Save } from 'lucide-react';

interface CookiePreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CookiePreferencesModal: React.FC<CookiePreferencesModalProps> = ({ isOpen, onClose }) => {
  const [prefAnalytics, setPrefAnalytics] = useState<boolean>(() => {
    return localStorage.getItem('oss_pref_analytics') !== 'false';
  });

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem('oss_pref_analytics', String(prefAnalytics));
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1200);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 select-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', damping: 26, stiffness: 380, mass: 0.8 }}
            className="relative w-full max-w-lg border border-border-subtle bg-surface rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden z-10"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-border-subtle flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-surface-elevated border border-border-subtle text-accent-sapphire">
                  <Cookie className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold font-sans text-text-primary uppercase tracking-wide">
                    COOKIE & STORAGE PREFERENCES
                  </h2>
                  <p className="text-xs font-mono text-text-muted mt-0.5">
                    Configure client persistence and cookie storage.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg border border-border-subtle bg-surface-elevated text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto text-xs font-sans text-text-muted">
              {/* Strictly Necessary */}
              <div className="p-3.5 rounded-xl border border-border-subtle bg-surface-card space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-status-merged" />
                    <span className="font-bold text-text-primary text-xs uppercase font-mono">
                      Strictly Necessary Storage
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-status-merged/10 text-status-merged font-bold border border-status-merged/30">
                    ALWAYS ACTIVE
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Required for user authentication sessions, CSRF token validation, and visual theme persistence. These keys cannot be disabled without breaking application security.
                </p>
                <div className="text-[10px] font-mono text-text-muted bg-surface p-2 rounded border border-border-subtle">
                  Cookies: token (HttpOnly, SameSite=Lax, Secure) | Storage: oss_theme
                </div>
              </div>

              {/* Functional Preferences */}
              <div className="p-3.5 rounded-xl border border-border-subtle bg-surface-card space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-accent-sapphire" />
                    <span className="font-bold text-text-primary text-xs uppercase font-mono">
                      Interface & Display Preferences
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPrefAnalytics(prev => !prev)}
                    className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                      prefAnalytics
                        ? 'bg-accent-sapphire/20 text-accent-sapphire border-accent-sapphire/40'
                        : 'bg-surface text-text-muted border-border-subtle'
                    }`}
                  >
                    {prefAnalytics ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Stores your customized dashboard startup view, card density (comfortable vs compact), and audio chime alert threshold in local browser storage.
                </p>
                <div className="text-[10px] font-mono text-text-muted bg-surface p-2 rounded border border-border-subtle">
                  Storage: oss_default_view, oss_card_density, oss_alert_threshold, oss_sound_enabled
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border-subtle bg-surface-elevated flex items-center justify-between">
              <span className="text-[11px] font-mono text-text-muted">Zero third-party trackers installed.</span>
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-sapphire hover:bg-accent-sapphire/80 text-white font-mono font-bold text-xs transition-all cursor-pointer shadow-sm"
              >
                {saved ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-status-merged" />
                    <span>PREFERENCES SAVED</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    <span>SAVE PREFERENCES</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
