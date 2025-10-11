import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../config';

type Role = 'manager' | 'employee';

type AuthState = {
  token: string;
  role: Role;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as AuthState;
      return parsed;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (state) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
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

    const data = await res.json() as { token: string; role: Role };
    setState({ token: data.token, role: data.role });
    return data.role;
  }, []);

  const logout = useCallback(async () => {
    if (state?.token) {
      try {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${state.token}` },
        });
      } catch {
        // logout is best-effort; if the call fails we still clear the local session
      }
    }
    setState(null);
  }, [state]);

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

