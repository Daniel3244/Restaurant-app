import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../App.css';

function ManagerLayout() {
  const auth = useAuth();

  const handleLogout = async () => {
    await auth.logout();
  };

  return (
    <div className="manager-nav-layout">
      <nav className="manager-nav">
        <div className="manager-nav-header">
          <div className="manager-nav-title">
            <span>Panel menedzera</span>
            <small>{auth.role ? `Rola: ${auth.role}` : 'Brak roli'}</small>
          </div>
          <div className="manager-nav-actions">
            <Link to="/" className="manager-nav-back">Powrot</Link>
            <button className="manager-logout-btn" onClick={handleLogout}>Wyloguj</button>
          </div>
        </div>
        <div className="manager-nav-links">
          <NavLink to="menu" className={({ isActive }) => (isActive ? 'manager-nav-link active' : 'manager-nav-link')}>
            Edycja menu
          </NavLink>
          <NavLink to="orders" className={({ isActive }) => (isActive ? 'manager-nav-link active' : 'manager-nav-link')}>
            Zamowienia
          </NavLink>
          <NavLink to="reports" className={({ isActive }) => (isActive ? 'manager-nav-link active' : 'manager-nav-link')}>
            Raporty
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
