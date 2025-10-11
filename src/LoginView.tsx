
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

const quickCredentials = [
  { role: 'manager', label: 'Wypelnij dane menedzera', username: 'manager', password: 'manager123' },
  { role: 'employee', label: 'Wypelnij dane pracownika', username: 'employee', password: 'employee123' },
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
  const expectedRole = searchParams.get('role');

  useEffect(() => {
    if (expectedRole === 'manager') {
      setUsername('manager');
    } else if (expectedRole === 'employee') {
      setUsername('employee');
    }
  }, [expectedRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const role = await auth.login(username.trim(), password);
      if (expectedRole && role !== expectedRole) {
        setError('Brak uprawnien do tej sekcji.');
        await auth.logout();
        return;
      }
      navigate(next, { replace: true });
    } catch (err: any) {
      setError(err?.message ?? 'Blad logowania. Sprobuj ponownie.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Logowanie</h2>
        {expectedRole && (
          <p className="login-hint">
            Wymagany poziom dostepu: <strong>{expectedRole}</strong>
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
            <span>Haslo</span>
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
            {loading ? 'Logowanie...' : 'Zaloguj sie'}
          </button>
        </form>
        <div className="login-helpers">
          <span>Potrzebujesz testowych danych?</span>
          <div className="login-quick-buttons">
            {quickCredentials.map(cred => (
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
          <small>Zalogowanie wypelnia formularz, ale nadal wymaga zatwierdzenia przyciskiem.</small>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
