import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
};

const STORAGE_KEY = 'restaurant-auth';
const SESSION_EXPIRED_MESSAGE = 'Sesja wygasła. Zaloguj się ponownie.';

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

function hasAuthorizationHeader(headers?: HeadersInit): boolean {
  if (!headers) return false;
  if (headers instanceof Headers) {
    return headers.has('Authorization') || headers.has('authorization');
  }
  if (Array.isArray(headers)) {
    return headers.some(([key]) => key.toLowerCase() === 'authorization');
  }
  const record = headers as Record<string, unknown>;
  return Object.keys(record).some((key) => key.toLowerCase() === 'authorization');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState | null>(loadInitialState);
  const navigate = useNavigate();
  const autoLogoutRef = useRef(false);
  const originalFetchRef = useRef<typeof fetch | null>(null);

  const handleAutoLogout = useCallback((message: string = SESSION_EXPIRED_MESSAGE) => {
    if (autoLogoutRef.current) return;
    autoLogoutRef.current = true;
    setState(null);
    window.alert(message);
    navigate('/login', { replace: true });
    // allow future alerts after navigation completes
    setTimeout(() => {
      autoLogoutRef.current = false;
    }, 0);
  }, [navigate]);

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!originalFetchRef.current) {
      originalFetchRef.current = window.fetch.bind(window);
    }
    const originalFetch = originalFetchRef.current;
    if (!originalFetch) {
      return;
    }

    const wrappedFetch: typeof fetch = async (input, init) => {
      const response = await originalFetch(input as RequestInfo | URL, init as RequestInit | undefined);
      const token = state?.token;
      if ((response.status === 401 || response.status === 403) && token) {
        const initHasAuth = hasAuthorizationHeader(init?.headers);
        const requestHasAuth = input instanceof Request ? hasAuthorizationHeader(input.headers) : false;
        if (initHasAuth || requestHasAuth) {
          handleAutoLogout();
        }
      }
      return response;
    };

    window.fetch = wrappedFetch;
    return () => {
      window.fetch = originalFetch;
    };
  }, [state?.token, handleAutoLogout]);

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

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!state?.token) {
      throw new Error('Brak aktywnej sesji');
    }
    const res = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.token}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (res.status === 204) {
      return;
    }
    if (res.status === 400) {
      const data = await res.json().catch(() => null) as { message?: string } | null;
      throw new Error(data?.message ?? 'Nie udalo sie zmienic hasla');
    }
    if (res.status === 401) {
      setState(null);
      throw new Error('Sesja wygasla. Zaloguj sie ponownie.');
    }
    throw new Error('Nie udalo sie zmienic hasla. Sprobuj ponownie.');
  }, [state]);

  const value = useMemo<AuthContextValue>(() => ({
    token: state?.token ?? null,
    role: state?.role ?? null,
    isAuthenticated: Boolean(state),
    login,
    logout,
    changePassword,
  }), [changePassword, login, logout, state]);

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
