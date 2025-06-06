import React, { useState } from 'react';

interface LoginViewProps {
  onLogin: (token: string, role: string) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:8081/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        setError('Nieprawidłowy login lub hasło.');
        setLoading(false);
        return;
      }
      const data = await res.json();
      // Oczekujemy: { token: string, role: string }
      if (data.token && data.role) {
        onLogin(data.token, data.role);
      } else {
        setError('Błąd logowania.');
      }
    } catch (err) {
      setError('Błąd połączenia z serwerem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Logowanie</h2>
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
          placeholder="Hasło"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Logowanie...' : 'Zaloguj się'}
        </button>
        {error && <div className="error">{error}</div>}
      </form>
    </div>
  );
};

export default LoginView;
