
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

const LoginView: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const next = searchParams.get('next') || '/';
  const expectedRole = searchParams.get('role');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const role = await auth.login(username, password);
      if (expectedRole && role !== expectedRole) {
        setError('Brak uprawnien do tej sekcji.');
        await auth.logout();
        return;
      }
      navigate(next, { replace: true });
    } catch (err: any) {
      setError(err?.message ?? 'Blad logowania');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Logowanie</h2>
      {expectedRole && (
        <p className="login-hint">
          Zaloguj sie jako <strong>{expectedRole}</strong>, aby kontynuowac.
        </p>
      )}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Login"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Haslo"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Logowanie...' : 'Zaloguj sie'}
        </button>
        {error && <div className="error">{error}</div>}
      </form>
    </div>
  );
};

export default LoginView;
