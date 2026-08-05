import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import apiClient, { AUTH_STORAGE_KEY } from '../api/client';
import type { AuthUser } from '../api/types';
import { startSyncEngine, stopSyncEngine } from '../sync/syncEngine';

interface StoredAuth {
  accessToken: string;
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredAuth(): StoredAuth | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as StoredAuth) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredAuth()?.user ?? null);

  useEffect(() => {
    if (readStoredAuth()) {
      startSyncEngine();
    }
    return () => stopSyncEngine();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await apiClient.post<StoredAuth>('/auth/login', { email, password });
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
    setUser(data.user);
    startSyncEngine();
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
    stopSyncEngine();
  }, []);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
