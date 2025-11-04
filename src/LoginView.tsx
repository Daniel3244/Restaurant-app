
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

type Role = 'manager' | 'employee';

const quickCredentials = [
  { role: 'manager', label: 'Wypełnij dane menedżera', username: 'manager', password: 'manager123' },
  { role: 'employee', label: 'Wypełnij dane pracownika', username: 'employee', password: 'employee123' },
] as const;

const LoginView: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const next = searchParams.get('next') || '/';
  const rolesParam = searchParams.get('roles');
  const expectedRole = searchParams.get('role');

  const allowedRoles: Role[] = useMemo(() => {
    const roles: Role[] = [];
    if (rolesParam) {
      rolesParam.split(',').forEach(r => {
        if (r === 'manager' || r === 'employee') {
          roles.push(r);
        }
      });
    }
    if (roles.length === 0 && expectedRole && (expectedRole === 'manager' || expectedRole === 'employee')) {
      roles.push(expectedRole);
    }
    return roles;
  }, [rolesParam, expectedRole]);

  const primaryRole = allowedRoles[0];

  useEffect(() => {
    if (primaryRole === 'manager') {
      setUsername('manager');
    } else if (primaryRole === 'employee') {
      setUsername('employee');
    }
  }, [primaryRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const role = await auth.login(username.trim(), password);
      if (allowedRoles.length > 0 && !allowedRoles.includes(role as Role)) {
    setError('Brak uprawnień do tej sekcji.');
        await auth.logout();
        return;
      }
      navigate(next, { replace: true });
    } catch (err: any) {
      setError(err?.message ?? 'Błąd logowania. Spróbuj ponownie.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Logowanie</h2>
        {allowedRoles.length > 0 && (
          <p className="login-hint">
            Wymagane role: <strong>{allowedRoles.join(', ')}</strong>
          </p>
        )}
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <label>
            <span>Login</span>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </label>
          <label>
            <span>Hasło</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </label>
          {error && <div className="login-error" role="alert">{error}</div>}
          <button type="submit" disabled={loading || !username || !password}>
            {loading ? 'Logowanie...' : 'Zaloguj się'}
          </button>
        </form>
        <div className="login-helpers">
          <span>Potrzebujesz testowych danych?</span>
          <div className="login-quick-buttons">
            {(allowedRoles.length ? quickCredentials.filter(cred => allowedRoles.includes(cred.role)) : quickCredentials)
              .map(cred => (
                <button
                  key={cred.role}
                  type="button"
                  className="login-quick-btn"
                  onClick={() => {
                    setUsername(cred.username);
                    setPassword(cred.password);
                    setError('');
                  }}
                >
                  {cred.label}
                </button>
              ))}
          </div>
          <small>Zalogowanie wypełnia formularz, ale nadal wymaga zatwierdzenia przyciskiem.</small>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
