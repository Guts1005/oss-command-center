import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Lock, User, Mail, KeyRound, AlertTriangle, Eye, EyeOff, X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      if (isRegister) {
        if (!username.trim() || !email.trim() || !password) {
          throw new Error('All fields are required.');
        }
        if (password.length < 8) {
          throw new Error('Password must be at least 8 characters long.');
        }
        await register(username.trim(), email.trim(), password);
      } else {
        if (!username.trim() || !password) {
          throw new Error('Username and password are required.');
        }
        await login(username.trim(), password);
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none">
      {/* Modal Container */}
      <div className="relative w-full max-w-lg border border-border-subtle bg-surface p-7 rounded-xl shadow-2xl z-10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle/80 pb-4 mb-5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-bold bg-base text-accent-sapphire">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base md:text-lg font-bold text-white font-sans tracking-wide">
                  {isRegister ? 'Register Tenant Account' : 'Authenticate Tenant'}
                </h2>
                <span className="border border-border-bold bg-base px-2 py-0.5 rounded text-xs font-mono font-bold text-text-whisper">
                  [AUTH_GCM]
                </span>
              </div>
              <p className="text-xs md:text-sm text-text-muted font-sans mt-0.5">
                Multi-tenant encrypted workspace &amp; credential vault.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border-subtle text-text-muted hover:border-accent-sapphire hover:text-white transition-all cursor-pointer"
            title="Dismiss (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode Switch */}
        <div className="grid grid-cols-2 gap-2 border border-border-subtle bg-base p-1.5 rounded-lg mb-5 text-xs md:text-sm font-bold font-mono">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setErrorMessage(null);
            }}
            className={`py-2.5 rounded text-center transition-all cursor-pointer ${
              !isRegister
                ? 'bg-surface-elevated text-white border border-accent-sapphire shadow-sm'
                : 'text-text-muted hover:text-white'
            }`}
          >
            [SIGN_IN]
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setErrorMessage(null);
            }}
            className={`py-2.5 rounded text-center transition-all cursor-pointer ${
              isRegister
                ? 'bg-surface-elevated text-white border border-accent-sapphire shadow-sm'
                : 'text-text-muted hover:text-white'
            }`}
          >
            [REGISTER_TENANT]
          </button>
        </div>

        {/* Security Assurance Banner */}
        <div className="mb-5 border border-border-subtle bg-surface-card p-3 rounded-lg text-xs text-text-whisper leading-relaxed">
          <div className="flex items-center gap-1.5 font-bold text-status-merged mb-1">
            <Lock className="h-3.5 w-3.5" />
            <span>[ENCRYPTION AT REST: AES-256-GCM]</span>
          </div>
          <p className="text-xs text-text-muted">
            All linked platform tokens are encrypted with authenticated AES-256-GCM using unique IVs. Zero plaintext credentials touch disk.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 flex items-start gap-2.5 border border-status-action-needed/80 bg-status-action-needed/15 p-3 rounded-lg text-xs md:text-sm text-status-action-needed">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-muted mb-2">
              {isRegister ? 'TENANT USERNAME' : 'TENANT USERNAME OR EMAIL'}
            </label>
            <div className="relative flex items-center border border-border-subtle bg-base rounded-md focus-within:border-accent-sapphire focus-within:ring-1 focus-within:ring-accent-sapphire">
              <span className="pl-3.5 text-text-muted">
                <User className="h-5 w-5" />
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={isRegister ? 'developer' : 'developer or user@example.com'}
                className="w-full bg-transparent px-3.5 py-3 text-base text-white placeholder:text-text-muted focus:outline-none font-medium"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-muted mb-2">
                CONTACT EMAIL
              </label>
              <div className="relative flex items-center border border-border-subtle bg-base rounded-md focus-within:border-accent-sapphire focus-within:ring-1 focus-within:ring-accent-sapphire">
                <span className="pl-3.5 text-text-muted">
                  <Mail className="h-5 w-5" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="developer@domain.com"
                  className="w-full bg-transparent px-3.5 py-3 text-base text-white placeholder:text-text-muted focus:outline-none font-medium"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-muted mb-2">
              PASSPHRASE {isRegister && <span className="text-text-muted">(MIN 8 CHARS)</span>}
            </label>
            <div className="relative flex items-center border border-border-subtle bg-base rounded-md focus-within:border-accent-sapphire focus-within:ring-1 focus-within:ring-accent-sapphire">
              <span className="pl-3.5 text-text-muted">
                <KeyRound className="h-5 w-5" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-transparent px-3.5 py-3 text-base text-white placeholder:text-text-muted focus:outline-none font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="pr-3.5 text-text-muted hover:text-white cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full border border-accent-sapphire bg-accent-sapphire/25 py-3.5 rounded-md font-mono text-sm md:text-base font-bold text-white hover:bg-accent-sapphire/35 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
            >
              {isLoading ? '[AUTHENTICATING...]' : isRegister ? '[CREATE_TENANT_ACCOUNT]' : '[SIGN_IN_TENANT]'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
