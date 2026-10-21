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
import { DEMO_FACILITY_ID, clearDemoData, seedDemoData } from '../demo/seedDemoData';

interface StoredAuth {
  accessToken: string;
  user: AuthUser;
}

export interface RegisterPayload {
  facilityName: string;
  state: string;
  lga: string;
  address?: string;
  facilityPhone?: string;
  adminFullName: string;
  email: string;
  password: string;
}

const DEMO_FLAG_KEY = 'vitalis.demoMode';

interface AuthContextValue {
  user: AuthUser | null;
  /** True when "Preview without login" was used instead of a real account. */
  isDemo: boolean;
  login: (email: string, password: string) => Promise<void>;
  /** Registers a new facility + its first admin account, then signs in as them. */
  register: (payload: RegisterPayload) => Promise<void>;
  /**
   * Loads sample data into the local cache and signs in as a fake user,
   * entirely client-side — no real backend/API call, no real patient data.
   * See src/demo/seedDemoData.ts.
   */
  loginDemo: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredAuth(): StoredAuth | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as StoredAuth) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredAuth()?.user ?? null);
  const [isDemo, setIsDemo] = useState<boolean>(
    () => localStorage.getItem(DEMO_FLAG_KEY) === 'true',
  );

  useEffect(() => {
    if (readStoredAuth() && localStorage.getItem(DEMO_FLAG_KEY) !== 'true') {
      startSyncEngine();
    }
    return () => stopSyncEngine();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await apiClient.post<StoredAuth>('/auth/login', { email, password });
    await clearDemoData();
    localStorage.removeItem(DEMO_FLAG_KEY);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
    setUser(data.user);
    setIsDemo(false);
    startSyncEngine();
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const { data } = await apiClient.post<StoredAuth>('/auth/register', payload);
    await clearDemoData();
    localStorage.removeItem(DEMO_FLAG_KEY);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
    setUser(data.user);
    setIsDemo(false);
    startSyncEngine();
  }, []);

  const loginDemo = useCallback(async () => {
    const demoUser: AuthUser = {
      id: 'demo-user',
      email: 'demo@vitalis.local',
      fullName: 'Demo User',
      role: 'DOCTOR',
      facilityId: DEMO_FACILITY_ID,
    };
    await seedDemoData();
    // Empty accessToken: the API client only attaches an Authorization
    // header when one is set, so demo-mode requests simply go out
    // unauthenticated and the real backend (if reachable) returns 401 —
    // no sync engine is started, so this doesn't retry in a loop.
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ accessToken: '', user: demoUser }));
    localStorage.setItem(DEMO_FLAG_KEY, 'true');
    setUser(demoUser);
    setIsDemo(true);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(DEMO_FLAG_KEY);
    setUser(null);
    setIsDemo(false);
    stopSyncEngine();
    void clearDemoData();
  }, []);

  const value = useMemo(
    () => ({ user, isDemo, login, register, loginDemo, logout }),
    [user, isDemo, login, register, loginDemo, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
