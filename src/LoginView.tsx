import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useTranslate } from './context/LocaleContext';

type Role = 'manager' | 'employee';

const quickCredentials = [
  { role: 'manager', labelPl: 'Wypełnij dane menedżera', labelEn: 'Fill manager credentials', username: 'manager', password: 'manager123' },
  { role: 'employee', labelPl: 'Wypełnij dane pracownika', labelEn: 'Fill employee credentials', username: 'employee', password: 'employee123' },
] as const;

const LoginView: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const t = useTranslate();

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
        setError(t('Brak uprawnień do tej sekcji.', 'You are not allowed to access this section.'));
        await auth.logout();
        return;
      }
      navigate(next, { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error && err.message ? err.message : t('Błąd logowania. Spróbuj ponownie.', 'Login failed. Please try again.');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>{t('Logowanie', 'Sign in')}</h2>
        {allowedRoles.length > 0 && (
          <p className="login-hint">
            {t('Wymagane role:', 'Required roles:')} <strong>{allowedRoles.join(', ')}</strong>
          </p>
        )}
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <label>
            <span>{t('Login', 'Username')}</span>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </label>
          <label>
            <span>{t('Hasło', 'Password')}</span>
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
            {loading ? t('Logowanie...', 'Signing in...') : t('Zaloguj się', 'Sign in')}
          </button>
        </form>
        <div className="login-helpers">
          <span>{t('Potrzebujesz testowych danych?', 'Need sample credentials?')}</span>
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
                  {t(cred.labelPl, cred.labelEn)}
                </button>
              ))}
          </div>
          <small>{t('Zalogowanie wypełnia formularz, ale nadal wymaga zatwierdzenia przyciskiem.', 'Using the shortcut fills the form but still requires confirmation with the button.')}</small>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
