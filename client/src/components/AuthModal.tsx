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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-md border border-border-bold bg-surface p-6 shadow-2xl z-10 font-mono">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center border border-status-awaiting-reply bg-status-awaiting-reply/10 text-status-awaiting-reply">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold uppercase tracking-wider text-text-primary">
                {isRegister ? 'Create Secure Account' : 'Authenticate Session'}
              </h2>
              <p className="font-telemetry text-[11px] text-text-muted">
                Private Multi-Tenant OSS Command Hub
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-white transition-colors p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="grid grid-cols-2 gap-1 border border-border-bold bg-base p-1 mb-5 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setErrorMessage(null);
            }}
            className={`py-1.5 text-center transition-all ${
              !isRegister
                ? 'bg-surface-elevated text-white border border-border-active'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            SIGN IN
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setErrorMessage(null);
            }}
            className={`py-1.5 text-center transition-all ${
              isRegister
                ? 'bg-surface-elevated text-white border border-border-active'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            CREATE ACCOUNT
          </button>
        </div>

        {/* Security Assurance Banner */}
        <div className="mb-5 border border-border-subtle bg-surface-elevated p-3 text-[11px] text-text-secondary leading-relaxed">
          <div className="flex items-center gap-1.5 font-bold text-status-merged mb-1">
            <Lock className="h-3 w-3" />
            <span>CRYPTOGRAPHIC SECURITY ENFORCED</span>
          </div>
          <p>
            Your account is isolated. All connected access tokens are encrypted with authenticated
            AES-256-GCM. No plain text secrets ever touch disk or external networks.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 flex items-start gap-2 border border-status-action-needed/50 bg-status-action-needed/10 p-3 text-xs text-status-action-needed">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1">
              {isRegister ? 'Username' : 'Username or Email'}
            </label>
            <div className="relative flex items-center border border-border-bold bg-base focus-within:border-status-awaiting-reply">
              <span className="pl-3 text-text-muted">
                <User className="h-4 w-4" />
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={isRegister ? 'octocat' : 'octocat or user@domain.com'}
                className="w-full bg-transparent px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1">
                Email Address
              </label>
              <div className="relative flex items-center border border-border-bold bg-base focus-within:border-status-awaiting-reply">
                <span className="pl-3 text-text-muted">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="developer@opensource.org"
                  className="w-full bg-transparent px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1">
              Password {isRegister && <span className="text-[10px] text-text-muted">(Min 8 chars)</span>}
            </label>
            <div className="relative flex items-center border border-border-bold bg-base focus-within:border-status-awaiting-reply">
              <span className="pl-3 text-text-muted">
                <KeyRound className="h-4 w-4" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-transparent px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="pr-3 text-text-muted hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 border border-status-awaiting-reply bg-status-awaiting-reply/20 py-2.5 font-bold uppercase tracking-wider text-status-awaiting-reply hover:bg-status-awaiting-reply/30 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'VERIFYING...' : isRegister ? 'INITIALIZE ACCOUNT' : 'ENTER COMMAND CENTER'}
          </button>
        </form>
      </div>
    </div>
  );
};
