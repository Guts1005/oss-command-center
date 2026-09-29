import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? !navigator.onLine : false;
  });
  const [showReconnected, setShowReconnected] = useState<boolean>(false);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setShowReconnected(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 2800);
      return () => clearTimeout(timer);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.aside
          aria-live="polite"
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -24 }}
          transition={{ duration: 0.2 }}
          className="fixed top-0 inset-x-0 z-50 bg-status-action-needed/95 text-white px-4 py-1.5 text-xs font-mono font-bold flex items-center justify-center gap-2 shadow-md pt-safe select-none"
        >
          <WifiOff className="h-3.5 w-3.5" />
          <span>[OFFLINE] TELEMETRY SYNC PAUSED (SERVING CACHED RECORDS)</span>
        </motion.aside>
      )}

      {showReconnected && (
        <motion.aside
          aria-live="polite"
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -24 }}
          transition={{ duration: 0.2 }}
          className="fixed top-0 inset-x-0 z-50 bg-status-merged/95 text-white px-4 py-1.5 text-xs font-mono font-bold flex items-center justify-center gap-2 shadow-md pt-safe select-none"
        >
          <Wifi className="h-3.5 w-3.5" />
          <span>[ONLINE] CONNECTION RESTORED (TELEMETRY RE-SYNCED)</span>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
