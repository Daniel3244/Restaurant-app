import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../config';

type Role = 'manager' | 'employee';

type AuthState = {
  token: string;
  role: Role;
  expiresAt: number;
};

type AuthContextValue = {
  token: string | null;
  role: Role | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<Role>;
  logout: () => Promise<void>;
};

const STORAGE_KEY = 'restaurant-auth';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function loadInitialState(): AuthState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthState;
    if (parsed.expiresAt <= Date.now()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState | null>(loadInitialState);

  useEffect(() => {
    if (state) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [state]);

  useEffect(() => {
    if (!state) return;
    if (state.expiresAt <= Date.now()) {
      setState(null);
      return;
    }
    const timeout = window.setTimeout(() => {
      setState(null);
    }, state.expiresAt - Date.now());
    return () => window.clearTimeout(timeout);
  }, [state]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('Nieprawidlowy login lub haslo.');
      }
      throw new Error('Nie udalo sie zalogowac. Sprobuj ponownie.');
    }

    const data = await res.json() as { token: string; role: Role; expiresAt: number };
    setState({ token: data.token, role: data.role, expiresAt: data.expiresAt });
    return data.role;
  }, []);

  const logout = useCallback(async () => {
    const currentToken = state?.token;
    setState(null);
    if (currentToken) {
      try {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${currentToken}` },
        });
      } catch {
        // logout is best-effort; if backend nie odpowie, i tak czyścimy lokalny stan
      }
    }
  }, [state?.token]);

  const value = useMemo<AuthContextValue>(() => ({
    token: state?.token ?? null,
    role: state?.role ?? null,
    isAuthenticated: Boolean(state),
    login,
    logout,
  }), [login, logout, state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

export function useRoleAccess(required: readonly Role[]): boolean {
  const auth = useAuth();
  if (!auth.isAuthenticated || !auth.role) return false;
  return required.includes(auth.role);
}
