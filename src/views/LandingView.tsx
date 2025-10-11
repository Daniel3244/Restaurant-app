import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../App.css';

type TileConfig = {
  key: string;
  title: string;
  description: string;
  action: () => void;
  cta: string;
  badge?: string | null;
  subtle?: boolean;
};

function LandingView() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '' });
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [processingPassword, setProcessingPassword] = useState(false);

  const isManager = auth.role === 'manager';
  const isEmployee = auth.role === 'employee';
  const canUseEmployeePanel = isManager || isEmployee;

  const tiles = useMemo<TileConfig[]>(() => [
    {
      key: 'order',
      title: 'Zamow teraz',
      description: 'Tryb kiosku dla klientow przy stoliku.',
      action: () => navigate('/order'),
      cta: 'Otworz kiosk',
      badge: null,
    },
    {
      key: 'employee',
      title: 'Panel pracownika',
      description: 'Podglad i aktualizacja statusow zamowien.',
      action: () => navigate(canUseEmployeePanel
        ? '/employee'
        : '/login?roles=manager,employee&next=/employee'),
      cta: canUseEmployeePanel ? 'Przejdz do panelu' : 'Zaloguj sie',
      badge: canUseEmployeePanel ? (isManager ? 'Dostep menedzera' : 'Zalogowany') : null,
    },
    {
      key: 'manager',
      title: 'Panel menedzera',
      description: 'Zarzadzanie menu, raporty i kontrola zamowien.',
      action: () => navigate(isManager
        ? '/manager'
        : '/login?roles=manager&next=/manager'),
      cta: isManager ? 'Przejdz do panelu' : 'Zaloguj sie',
      badge: isManager ? 'Zalogowany' : null,
    },
    {
      key: 'screen',
      title: 'Ekran numerow',
      description: 'Widok dla klientow oczekujacych na odbior.',
      action: () => navigate('/screen'),
      cta: 'Pokaz ekran',
      badge: null,
      subtle: true,
    },
  ], [auth.role, navigate]);

  return (
    <div className="landing-view">
      <header className="landing-header">
        <img src="/img/logo.jpg" alt="Logo restauracji" />
        <div className="landing-heading">
          <h1>Centrum restauracji</h1>
          <p>Wybierz obszar, w ktorym chcesz pracowac lub pomagac klientowi.</p>
        </div>
        <div className="landing-user-info">
          {auth.isAuthenticated ? (
            <>
              <span className="landing-user-badge">Zalogowany jako</span>
              <strong>{auth.role}</strong>
              <button type="button" className="landing-logout-btn" onClick={() => setShowPasswordForm(v => !v)}>
                {showPasswordForm ? 'Ukryj zmiane hasla' : 'Zmien haslo'}
              </button>
              <button type="button" onClick={auth.logout} className="landing-logout-btn">
                Wyloguj
              </button>
            </>
          ) : (
            <span className="landing-user-anon">Nie jestes zalogowany</span>
          )}
        </div>
      </header>
      {showPasswordForm && auth.isAuthenticated && (
        <div className="landing-password-card">
          <h3>Zmien haslo</h3>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setProcessingPassword(true);
              setPasswordFeedback(null);
              try {
                await auth.changePassword(passwordForm.current, passwordForm.next);
                setPasswordFeedback({ type: 'success', message: 'Haslo zostalo zaktualizowane.' });
                setPasswordForm({ current: '', next: '' });
              } catch (err: any) {
                setPasswordFeedback({ type: 'error', message: err?.message ?? 'Nie udalo sie zmienic hasla.' });
              } finally {
                setProcessingPassword(false);
              }
            }}
            className="landing-password-form"
          >
            <label>
              Obecne haslo
              <input
                type="password"
                value={passwordForm.current}
                onChange={e => setPasswordForm(f => ({ ...f, current: e.target.value }))}
                required
              />
            </label>
            <label>
              Nowe haslo
              <input
                type="password"
                value={passwordForm.next}
                onChange={e => setPasswordForm(f => ({ ...f, next: e.target.value }))}
                minLength={6}
                required
              />
            </label>
            {passwordFeedback && (
              <div className={`landing-password-feedback ${passwordFeedback.type}`}>
                {passwordFeedback.message}
              </div>
            )}
            <div className="landing-password-actions">
              <button type="submit" disabled={processingPassword}>
                {processingPassword ? 'Zapisywanie...' : 'Zapisz'}
              </button>
            </div>
          </form>
        </div>
      )}
      <div className="landing-grid">
        {tiles.map(tile => (
          <button
            key={tile.key}
            className={`landing-tile${tile.subtle ? ' landing-tile-subtle' : ''}`}
            onClick={tile.action}
          >
            <div className="landing-tile-head">
              <h2>{tile.title}</h2>
              {tile.badge && <span className="landing-tile-badge">{tile.badge}</span>}
            </div>
            <p>{tile.description}</p>
            <span className="landing-cta">{tile.cta}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default LandingView;
