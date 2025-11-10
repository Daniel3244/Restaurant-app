import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslate } from '../context/LocaleContext';
import '../App.css';

function ManagerLayout() {
  const auth = useAuth();
  const t = useTranslate();

  const handleLogout = async () => {
    await auth.logout();
  };

  return (
    <div className="manager-nav-layout">
      <nav className="manager-nav">
        <div className="manager-nav-header">
          <div className="manager-nav-title">
            <span>{t('Panel menedżera', 'Manager panel')}</span>
            <small>{auth.role ? t(`Rola: ${auth.role}`, `Role: ${auth.role}`) : t('Brak roli', 'No role')}</small>
          </div>
          <div className="manager-nav-actions">
            <Link to="/" className="manager-nav-back">{t('Powrót', 'Back')}</Link>
            <button className="manager-logout-btn" onClick={handleLogout}>{t('Wyloguj', 'Sign out')}</button>
          </div>
        </div>
        <div className="manager-nav-links">
          <NavLink to="menu" className={({ isActive }) => (isActive ? 'manager-nav-link active' : 'manager-nav-link')}>
            {t('Edycja menu', 'Menu management')}
          </NavLink>
          <NavLink to="orders" className={({ isActive }) => (isActive ? 'manager-nav-link active' : 'manager-nav-link')}>
            {t('Zamówienia', 'Orders')}
          </NavLink>
          <NavLink to="reports" className={({ isActive }) => (isActive ? 'manager-nav-link active' : 'manager-nav-link')}>
            {t('Raporty', 'Reports')}
          </NavLink>
        </div>
      </nav>
      <div className="manager-nav-content">
        <Outlet />
      </div>
    </div>
  );
}

export default ManagerLayout;
