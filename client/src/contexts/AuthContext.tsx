import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { User, UserIntegration } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  integrations: UserIntegration[];
  isIntegrationsLoading: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshIntegrations: () => Promise<void>;
  saveIntegration: (data: {
    platform: 'github' | 'gitlab';
    username: string;
    token?: string;
    host?: string;
  }) => Promise<void>;
  deleteIntegration: (id: string) => Promise<void>;
  triggerSync: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [integrations, setIntegrations] = useState<UserIntegration[]>([]);
  const [isIntegrationsLoading, setIsIntegrationsLoading] = useState<boolean>(false);

  // Fetch current authenticated user
  const refreshUser = useCallback(async () => {
    try {
      const res = await axios.get('/api/auth/me');
      if (res.data?.authenticated && res.data.user) {
        setUser(res.data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch integrations for current user
  const refreshIntegrations = useCallback(async () => {
    if (!user) {
      setIntegrations([]);
      return;
    }
    try {
      setIsIntegrationsLoading(true);
      const res = await axios.get('/api/integrations');
      const items = Array.isArray(res.data) ? res.data : (res.data?.integrations || []);
      setIntegrations(items);
    } catch (err) {
      console.error('Failed to fetch integrations:', err);
    } finally {
      setIsIntegrationsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    if (user) {
      refreshIntegrations();
    } else {
      setIntegrations([]);
    }
  }, [user, refreshIntegrations]);

  const login = async (usernameOrEmail: string, password: string) => {
    const res = await axios.post('/api/auth/login', { usernameOrEmail, password });
    setUser(res.data.user);
  };

  const register = async (username: string, email: string, password: string) => {
    const res = await axios.post('/api/auth/register', { username, email, password });
    setUser(res.data.user);
  };

  const logout = async () => {
    await axios.post('/api/auth/logout');
    setUser(null);
    setIntegrations([]);
  };

  const saveIntegration = async (data: {
    platform: 'github' | 'gitlab';
    username: string;
    token?: string;
    host?: string;
  }) => {
    await axios.post('/api/integrations', data);
    await refreshIntegrations();
  };

  const deleteIntegration = async (id: string) => {
    await axios.delete(`/api/integrations/${id}`);
    await refreshIntegrations();
  };

  const triggerSync = async () => {
    await axios.post('/api/integrations/sync');
    await refreshIntegrations();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        integrations,
        isIntegrationsLoading,
        login,
        register,
        logout,
        refreshUser,
        refreshIntegrations,
        saveIntegration,
        deleteIntegration,
        triggerSync,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
