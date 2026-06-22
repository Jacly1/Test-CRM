'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, setToken, clearToken, getToken } from './api';
import { SessionUser } from './types';

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithToken: (token: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  hasPermission: (key: string | string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      return;
    }
    try {
      setUser(await api<SessionUser>('/auth/me'));
    } catch {
      clearToken();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  async function login(email: string, password: string) {
    const res = await api<{ accessToken: string; user: SessionUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(res.accessToken);
    setUser(res.user);
    router.push('/dashboard');
  }

  async function loginWithToken(token: string) {
    setToken(token);
    const me = await api<SessionUser>('/auth/me');
    setUser(me);
    router.push('/dashboard');
  }

  function logout() {
    clearToken();
    setUser(null);
    router.push('/login');
  }

  function hasPermission(key: string | string[]) {
    const perms = user?.permissions ?? [];
    const keys = Array.isArray(key) ? key : [key];
    return keys.some((k) => perms.includes(k));
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, loginWithToken, logout, refresh, hasPermission }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return ctx;
}
