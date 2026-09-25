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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm font-telemetry select-none">
      {/* Modal Container */}
      <div className="relative w-full max-w-md border border-border-bold bg-surface p-5 shadow-2xl z-10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-bold pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center border border-border-bold bg-base text-status-in-review">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                {isRegister ? '[CREATE_SECURE_TENANT]' : '[AUTHENTICATE_TENANT]'}
              </h2>
              <p className="text-[10px] text-text-muted">
                ENCRYPTED MULTI-USER LOCAL HUB
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center border border-border-bold text-text-muted hover:border-border-active hover:text-white transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Mode Switch */}
        <div className="grid grid-cols-2 gap-1 border border-border-bold bg-base p-1 mb-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setErrorMessage(null);
            }}
            className={`py-1 text-center transition-all ${
              !isRegister
                ? 'bg-surface-elevated text-text-primary border border-border-active'
                : 'text-text-muted hover:text-text-primary'
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
            className={`py-1 text-center transition-all ${
              isRegister
                ? 'bg-surface-elevated text-text-primary border border-border-active'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            [REGISTER_TENANT]
          </button>
        </div>

        {/* Security Assurance Banner */}
        <div className="mb-4 border border-border-bold bg-base p-2.5 text-[11px] text-text-secondary leading-relaxed">
          <div className="flex items-center gap-1.5 font-bold text-status-merged mb-0.5 text-[10px]">
            <Lock className="h-3 w-3" />
            <span>[ENCRYPTION AT REST: AES-256-GCM]</span>
          </div>
          <p className="text-[10px] text-text-muted">
            All linked platform tokens are encrypted with authenticated AES-256-GCM using unique IVs. Zero plaintext credentials touch disk or external telemetry.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 flex items-start gap-2 border border-status-action-needed/60 bg-status-action-needed/10 p-2.5 text-xs text-status-action-needed">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
              {isRegister ? 'TENANT USERNAME' : 'TENANT USERNAME OR EMAIL'}
            </label>
            <div className="relative flex items-center border border-border-bold bg-base focus-within:border-status-in-review">
              <span className="pl-2.5 text-text-muted">
                <User className="h-3.5 w-3.5" />
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={isRegister ? 'sharvin' : 'sharvin or user@example.com'}
                className="w-full bg-transparent px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
                CONTACT EMAIL
              </label>
              <div className="relative flex items-center border border-border-bold bg-base focus-within:border-status-in-review">
                <span className="pl-2.5 text-text-muted">
                  <Mail className="h-3.5 w-3.5" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="developer@domain.com"
                  className="w-full bg-transparent px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
              PASSPHRASE {isRegister && <span className="text-text-muted">(MIN 8 CHARS)</span>}
            </label>
            <div className="relative flex items-center border border-border-bold bg-base focus-within:border-status-in-review">
              <span className="pl-2.5 text-text-muted">
                <KeyRound className="h-3.5 w-3.5" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-transparent px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="pr-2.5 text-text-muted hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 border border-status-in-review bg-status-in-review/20 py-2 font-bold uppercase tracking-wider text-status-in-review hover:bg-status-in-review/30 disabled:opacity-50 transition-colors text-xs"
          >
            {isLoading ? '[VERIFYING_CREDENTIALS...]' : isRegister ? '[INITIALIZE_TENANT]' : '[ENTER_CONSOLE]'}
          </button>
        </form>
      </div>
    </div>
  );
};
