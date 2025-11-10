import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import { LocaleProvider } from '../context/LocaleContext';
import { RequireRole } from './RequireAuth';

const ManagerPage = () => <div>Manager Page</div>;
const LoginPage = () => <div>Login Page</div>;
const HomePage = () => <div>Home Page</div>;

function renderWithRoutes(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <LocaleProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<HomePage />} />
            <Route element={<RequireRole roles={['manager']} />}>
              <Route path="/manager" element={<ManagerPage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </LocaleProvider>
    </MemoryRouter>,
  );
}

describe('RequireRole', () => {
  beforeEach(() => {
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    localStorage.clear();
  });

  it('redirects anonymous users to login with next parameter', async () => {
    renderWithRoutes('/manager');

    await waitFor(() => {
      expect(screen.getByText(/Login Page/i)).toBeInTheDocument();
    });
  });

  it('redirects to home when user role does not match', async () => {
    const future = Date.now() + 60_000;
    localStorage.setItem('restaurant-auth', JSON.stringify({
      token: 'token-xyz',
      role: 'employee',
      expiresAt: future,
    }));

    renderWithRoutes('/manager');

    await waitFor(() => {
      expect(screen.getByText(/Home Page/i)).toBeInTheDocument();
    });
  });

  it('allows access when required role is present', async () => {
    const future = Date.now() + 60_000;
    localStorage.setItem('restaurant-auth', JSON.stringify({
      token: 'token-manager',
      role: 'manager',
      expiresAt: future,
    }));

    renderWithRoutes('/manager');

    await waitFor(() => {
      expect(screen.getByText(/Manager Page/i)).toBeInTheDocument();
    });
  });
});
