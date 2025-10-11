import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../App.css';

function LandingView() {
  const navigate = useNavigate();
  const auth = useAuth();

  const tiles = useMemo(() => [
    {
      key: 'order',
      title: 'Zamow teraz',
      description: 'Tryb kiosku dla klientow.',
      action: () => navigate('/order'),
      cta: 'Przejdz',
    },
    {
      key: 'employee',
      title: 'Panel pracownika',
      description: 'Obsluga zamowien na kuchni.',
      action: () => navigate(auth.isAuthenticated && auth.role === 'employee' ? '/employee' : '/login?role=employee&next=/employee'),
      cta: auth.role === 'employee' ? 'Otworz' : 'Zaloguj',
    },
    {
      key: 'manager',
      title: 'Panel menedzera',
      description: 'Menu, raporty i zarzadzanie.',
      action: () => navigate(auth.isAuthenticated && auth.role === 'manager' ? '/manager' : '/login?role=manager&next=/manager'),
      cta: auth.role === 'manager' ? 'Otworz' : 'Zaloguj',
    },
    {
      key: 'screen',
      title: 'Ekran numerow',
      description: 'Widok dla klientow odbierajacych zamowienia.',
      action: () => navigate('/screen'),
      cta: 'Pokaz',
    },
  ], [auth.isAuthenticated, auth.role, navigate]);

  return (
    <div className="landing-view">
      <header className="landing-header">
        <img src="/img/logo.jpg" alt="Logo" />
        <div>
          <h1>Restauracja Self-service</h1>
          <p>Wybierz obszar pracy.</p>
        </div>
      </header>
      <div className="landing-grid">
        {tiles.map(tile => (
          <button key={tile.key} className="landing-tile" onClick={tile.action}>
            <h2>{tile.title}</h2>
            <p>{tile.description}</p>
            <span className="landing-cta">{tile.cta}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default LandingView;

