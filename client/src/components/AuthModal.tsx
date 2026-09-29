import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
          {/* Backdrop with smooth fade */}
          <motion.div
            key="auth-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-sm"
          />

          {/* Modal / Bottom Sheet Container with Spring Physics */}
          <motion.div
            key="auth-modal-card"
            initial={{ opacity: 0, scale: 0.96, y: 32 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 24 }}
            transition={{ type: 'spring', damping: 28, stiffness: 380, mass: 0.8 }}
            className="relative w-full max-w-lg border-t sm:border border-border-subtle bg-surface p-5 sm:p-7 rounded-t-2xl sm:rounded-xl shadow-2xl z-10 max-h-[90dvh] overflow-y-auto pb-safe"
          >
            {/* Mobile Tactile Grab Handle */}
            <div className="sm:hidden w-12 h-1.5 bg-border-bold/80 rounded-full mx-auto mb-3 cursor-grab shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-border-subtle/80 pb-3 mb-4 sm:pb-4 sm:mb-5 pr-8 sm:pr-0">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg border border-border-bold bg-base text-accent-sapphire">
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white font-sans tracking-wide">
                    {isRegister ? 'Register User' : 'Sign In'}
                  </h2>
                  <p className="text-xs sm:text-sm text-text-muted font-sans mt-0.5">
                    Connect your account to track your open source contributions.
                  </p>
                </div>
              </div>
              <motion.button
                type="button"
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                onClick={onClose}
                className="absolute top-4 right-4 sm:static flex h-8 w-8 items-center justify-center rounded-md border border-border-subtle text-text-muted hover:border-accent-sapphire hover:text-white transition-colors cursor-pointer"
                title="Dismiss (Esc)"
              >
                <X className="h-4 w-4" />
              </motion.button>
            </div>

            {/* Mode Switch */}
            <div className="grid grid-cols-2 gap-2 border border-border-subtle bg-base p-1 rounded-lg mb-4 sm:mb-5 text-xs sm:text-sm font-semibold font-sans">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  setErrorMessage(null);
                }}
                className={`py-2 rounded text-center transition-all cursor-pointer ${
                  !isRegister
                    ? 'bg-surface-elevated text-white border border-accent-sapphire shadow-sm'
                    : 'text-text-muted hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRegister(true);
                  setErrorMessage(null);
                }}
                className={`py-2 rounded text-center transition-all cursor-pointer ${
                  isRegister
                    ? 'bg-surface-elevated text-white border border-accent-sapphire shadow-sm'
                    : 'text-text-muted hover:text-white'
                }`}
              >
                Register
              </button>
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
              {isRegister ? 'USERNAME' : 'USERNAME OR EMAIL'}
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
              PASSWORD {isRegister && <span className="text-text-muted">(MIN 8 CHARS)</span>}
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
            <motion.button
              type="submit"
              whileHover={{ scale: 1.015, boxShadow: '0 0 16px rgba(116,157,208,0.35)' }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              disabled={isLoading}
              className="w-full border border-accent-sapphire bg-accent-sapphire py-3.5 rounded-md font-sans text-sm md:text-base font-semibold text-white hover:bg-accent-sapphire/90 disabled:opacity-50 transition-colors cursor-pointer shadow-sm"
            >
              {isLoading ? 'Authenticating...' : isRegister ? 'Register User' : 'Sign In'}
            </motion.button>
            <div className="flex items-center justify-center gap-1.5 text-xs text-text-muted mt-3.5 font-mono">
              <Lock className="h-3 w-3 text-status-merged shrink-0" />
              <span>Encrypted</span>
            </div>
          </div>
        </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
