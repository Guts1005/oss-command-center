import { useState, useEffect } from 'react';
import axios from 'axios';

export interface OAuthProvidersStatus {
  github: boolean;
  gitlab: boolean;
}

const DEFAULT_PROVIDERS: OAuthProvidersStatus = { github: false, gitlab: false };

/** Determine whether initial /api/auth/me bootstrap should be skipped in demo mode. */
export function shouldSkipInitialAuthCheck(search: string, hasCachedUser: boolean): boolean {
  if (hasCachedUser) return false;
  const params = new URLSearchParams(search);
  if (params.get('oauth') || params.get('oauth_setup') || params.get('error')) {
    return false;
  }
  const demo = params.get('demo');
  return demo === '1' || demo === 'true';
}

/** Lazily load configured OAuth providers only when the consumer modal is open. */
export function useOAuthProviders(isOpen: boolean): OAuthProvidersStatus {
  const [providers, setProviders] = useState<OAuthProvidersStatus>(DEFAULT_PROVIDERS);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    axios
      .get('/api/auth/providers')
      .then((res) => {
        if (isMounted && res.data) {
          setProviders({
            github: Boolean(res.data.github),
            gitlab: Boolean(res.data.gitlab),
          });
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  return providers;
}
