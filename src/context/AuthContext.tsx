import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { useTranslate } from './LocaleContext';

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
  const t = useTranslate();
  const autoLogoutRef = useRef(false);
  const originalFetchRef = useRef<typeof fetch | null>(null);
  const sessionExpiredMessage = t('Sesja wygasła. Zaloguj się ponownie.', 'Session expired. Please sign in again.');

  const handleAutoLogout = useCallback((message: string = sessionExpiredMessage) => {
    if (autoLogoutRef.current) return;
    autoLogoutRef.current = true;
    setState(null);
    window.alert(message);
    navigate('/login', { replace: true });
    // allow future alerts after navigation completes
    setTimeout(() => {
      autoLogoutRef.current = false;
    }, 0);
  }, [navigate, sessionExpiredMessage]);

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
        throw new Error(t('Nieprawidłowy login lub hasło.', 'Incorrect username or password.'));
      }
      throw new Error(t('Nie udało się zalogować. Spróbuj ponownie.', 'Could not sign in. Please try again.'));
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
        // Logout is best-effort; even if the backend fails we still clear local state
      }
    }
  }, [state?.token]);
  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!state?.token) {
      throw new Error(t('Brak aktywnej sesji', 'No active session'));
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
      throw new Error(data?.message ?? t('Nie udało się zmienić hasła', 'Could not change password'));
    }
    if (res.status === 401) {
      handleAutoLogout();
      throw new Error(sessionExpiredMessage);
    }
    throw new Error(t('Nie udało się zmienić hasła. Spróbuj ponownie.', 'Could not change password. Please try again.'));
  }, [state, handleAutoLogout]);

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

