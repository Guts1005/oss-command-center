import { useState, useEffect, useCallback } from 'react';
import { ViewMode } from '../types';

const VALID_VIEWS: ViewMode[] = ['stream', 'analytics', 'repos', 'settings', 'security', 'about'];

function getInitialView(): ViewMode {
  if (typeof window === 'undefined') return 'stream';
  const params = new URLSearchParams(window.location.search);
  const viewParam = params.get('view')?.toLowerCase() as ViewMode;
  return VALID_VIEWS.includes(viewParam) ? viewParam : 'stream';
}

export function useViewRouting() {
  const [viewMode, setViewModeState] = useState<ViewMode>(getInitialView);

  // Sync state when browser back/forward buttons are pressed
  useEffect(() => {
    const handlePopState = () => {
      const current = getInitialView();
      setViewModeState(current);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    const url = new URL(window.location.href);
    if (mode === 'stream') {
      url.searchParams.delete('view');
    } else {
      url.searchParams.set('view', mode);
    }
    window.history.pushState({ view: mode }, '', url.toString());
  }, []);

  return { viewMode, setViewMode };
}
