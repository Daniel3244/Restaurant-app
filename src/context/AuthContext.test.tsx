import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import { API_BASE_URL } from '../config';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>
    <AuthProvider>{children}</AuthProvider>
  </MemoryRouter>
);

describe('AuthContext', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('logs in and stores session details', async () => {
    const future = Date.now() + 60_000;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'token-123', role: 'manager', expiresAt: future }),
    });
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      const role = await result.current.login('manager', 'secret');
      expect(role).toBe('manager');
    });

    expect(result.current.token).toBe('token-123');
    expect(result.current.role).toBe('manager');
    expect(result.current.isAuthenticated).toBe(true);
    expect(localStorage.getItem('restaurant-auth')).toContain('"token":"token-123"');
  });

  it('logs out and clears persisted session', async () => {
    const future = Date.now() + 60_000;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'token-abc', role: 'manager', expiresAt: future }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('manager', 'secret');
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.token).toBeNull();
    expect(localStorage.getItem('restaurant-auth')).toBeNull();
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${API_BASE_URL}/api/auth/logout`,
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('auto-logs out when changePassword receives 401', async () => {
    const future = Date.now() + 60_000;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'token-def', role: 'manager', expiresAt: future }),
      })
      .mockResolvedValueOnce({
        status: 401,
        ok: false,
        json: async () => ({}),
      });
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('manager', 'secret');
    });

    let caughtError: unknown;
    await act(async () => {
      try {
        await result.current.changePassword('wrong', 'new-secret');
      } catch (err) {
        caughtError = err;
      }
    });

    expect(caughtError).toBeInstanceOf(Error);
    expect((caughtError as Error).message).toContain('Sesja wygasła');
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem('restaurant-auth')).toBeNull();
  });
});
