import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import apiClient from '../lib/apiClient';
import { clearSession, getAuthToken, getAuthUser, loadSession, setSession } from '../lib/authSession';

const AuthContext = createContext({
  user: null,
  token: null,
  isLoading: true,
  login: async () => ({}),
  register: async () => ({}),
  logout: async () => {},
  refreshSession: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const syncSession = useCallback(async (nextToken, nextUser) => {
    setToken(nextToken || null);
    setUser(nextUser || null);
    await setSession({ token: nextToken || null, user: nextUser || null });

    // Instantly sync push token upon successful session synchronization
    if (nextToken && nextUser) {
      try {
        const { syncPushToken } = require('../notifications');
        void syncPushToken(nextToken);
      } catch (e) {
        console.warn('Failed to invoke push token sync:', e);
      }
    }
  }, []);

  const refreshSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const session = await loadSession();
      if (!session.token) {
        await clearSession();
        setUser(null);
        setToken(null);
        return;
      }

      try {
        const me = await apiClient.get('/auth/me');
        await syncSession(session.token, me.data.user);
      } catch (error) {
        await clearSession();
        setUser(null);
        setToken(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [syncSession]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const login = useCallback(async ({ email, password }) => {
    const response = await apiClient.post('/auth/login', { email, password });
    const nextToken = response.data.token;
    const nextUser = response.data.user;
    await syncSession(nextToken, nextUser);
    return response.data;
  }, [syncSession]);

  const register = useCallback(async ({ email, password, displayName, city }) => {
    const response = await apiClient.post('/auth/register', { email, password, displayName, city });
    const nextToken = response.data.token;
    const nextUser = response.data.user;
    await syncSession(nextToken, nextUser);
    return response.data;
  }, [syncSession]);

  const logout = useCallback(async () => {
    await clearSession();
    setUser(null);
    setToken(null);
  }, []);

  const value = useMemo(() => ({
    user,
    token,
    isLoading,
    login,
    register,
    logout,
    refreshSession,
  }), [user, token, isLoading, login, register, logout, refreshSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
