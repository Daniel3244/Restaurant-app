import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslate } from '../context/LocaleContext';
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
  const t = useTranslate();
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
      title: t('Zamów teraz', 'Order now'),
      description: t('Tryb kiosku dla klientów przy stoliku.', 'Kiosk mode for dine-in guests.'),
      action: () => navigate('/order'),
      cta: t('Otwórz kiosk', 'Open kiosk'),
      badge: null,
    },
    {
      key: 'employee',
      title: t('Panel pracownika', 'Employee panel'),
      description: t('Podgląd i aktualizacja statusów zamówień.', 'Review and update order statuses.'),
      action: () => navigate(canUseEmployeePanel
        ? '/employee'
        : '/login?roles=manager,employee&next=/employee'),
      cta: canUseEmployeePanel ? t('Przejdź do panelu', 'Open panel') : t('Zaloguj się', 'Sign in'),
      badge: canUseEmployeePanel ? (isManager ? t('Dostęp menedżera', 'Manager access') : t('Zalogowany', 'Signed in')) : null,
    },
    {
      key: 'manager',
      title: t('Panel menedżera', 'Manager panel'),
      description: t('Zarządzanie menu, raporty i kontrola zamówień.', 'Manage menu, reports and orders.'),
      action: () => navigate(isManager
        ? '/manager'
        : '/login?roles=manager&next=/manager'),
      cta: isManager ? t('Przejdź do panelu', 'Open panel') : t('Zaloguj się', 'Sign in'),
      badge: isManager ? t('Zalogowany', 'Signed in') : null,
    },
    {
      key: 'screen',
      title: t('Ekran numerów', 'Order screen'),
      description: t('Widok dla klientów oczekujących na odbiór.', 'Public view for waiting customers.'),
      action: () => navigate('/screen'),
      cta: t('Pokaż ekran', 'Open screen'),
      badge: null,
      subtle: true,
    },
  ], [navigate, canUseEmployeePanel, isManager, t]);

  return (
    <div className="landing-view">
      <header className="landing-header">
        <img src="/img/logo.jpg" alt={t('Logo restauracji', 'Restaurant logo')} />
        <div className="landing-heading">
          <h1>{t('Centrum restauracji', 'Restaurant hub')}</h1>
          <p>{t('Wybierz obszar, w którym chcesz pracować lub pomagać klientowi.', 'Choose the area you want to work in or assist a customer with.')}</p>
        </div>
        <div className="landing-user-info">
          {auth.isAuthenticated ? (
            <>
              <span className="landing-user-badge">{t('Zalogowany jako', 'Signed in as')}</span>
              <strong>{auth.role}</strong>
              <button type="button" className="landing-logout-btn" onClick={() => setShowPasswordForm(v => !v)}>
                {showPasswordForm ? t('Ukryj zmianę hasła', 'Hide password form') : t('Zmień hasło', 'Change password')}
              </button>
              <button type="button" onClick={auth.logout} className="landing-logout-btn">
                {t('Wyloguj', 'Sign out')}
              </button>
            </>
          ) : (
            <span className="landing-user-anon">{t('Nie jesteś zalogowany', 'You are not signed in')}</span>
          )}
        </div>
      </header>
      {showPasswordForm && auth.isAuthenticated && (
        <div className="landing-password-card">
          <h3>{t('Zmień hasło', 'Change password')}</h3>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setProcessingPassword(true);
              setPasswordFeedback(null);
              try {
                await auth.changePassword(passwordForm.current, passwordForm.next);
                setPasswordFeedback({ type: 'success', message: t('Hasło zostało zaktualizowane.', 'Password updated successfully.') });
                setPasswordForm({ current: '', next: '' });
              } catch (err: unknown) {
                const message = err instanceof Error && err.message ? err.message : t('Nie udało się zmienić hasła.', 'Could not change the password.');
                setPasswordFeedback({ type: 'error', message });
              } finally {
                setProcessingPassword(false);
              }
            }}
            className="landing-password-form"
          >
            <label>
              {t('Obecne hasło', 'Current password')}
              <input
                type="password"
                value={passwordForm.current}
                onChange={e => setPasswordForm(f => ({ ...f, current: e.target.value }))}
                required
              />
            </label>
            <label>
              {t('Nowe hasło', 'New password')}
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
                {processingPassword ? t('Zapisywanie...', 'Saving...') : t('Zapisz', 'Save')}
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
