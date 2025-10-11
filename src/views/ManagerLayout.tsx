import { NavLink, Outlet } from 'react-router-dom';
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
          <span>Panel menedzera</span>
          <button className="manager-logout-btn" onClick={handleLogout}>Wyloguj</button>
        </div>
        <NavLink to="menu" className={({ isActive }) => isActive ? 'manager-nav-link active' : 'manager-nav-link'}>
          Edycja menu
        </NavLink>
        <NavLink to="orders" className={({ isActive }) => isActive ? 'manager-nav-link active' : 'manager-nav-link'}>
          Zamowienia
        </NavLink>
        <NavLink to="reports" className={({ isActive }) => isActive ? 'manager-nav-link active' : 'manager-nav-link'}>
          Raporty
        </NavLink>
      </nav>
      <div className="manager-nav-content">
        <Outlet />
      </div>
    </div>
  );
}

export default ManagerLayout;

