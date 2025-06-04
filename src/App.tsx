import { useState, useRef, useEffect } from 'react';
import { NavLink, Routes, Route, useLocation } from 'react-router-dom';
import './App.css';
import ManagerMenuView from './ManagerMenuView';
import EmployeeOrdersView from './EmployeeOrdersView';
import OrderNumbersScreen from './OrderNumbersScreen';
import ManagerOrdersView from './ManagerOrdersView';
import ManagerReportsView from './ManagerReportsView';

const categories = [
  { id: 'napoje', name: 'Napoje' },
  { id: 'zestawy', name: 'Zestawy' },
  { id: 'burgery', name: 'Burgery' },
  { id: 'wrapy', name: 'Wrapy' },
  { id: 'dodatki', name: 'Dodatki' },
];

const API_MENU_URL = 'http://localhost:8081/api/menu';

function FadeTransition({ children, triggerKey }: { children: React.ReactNode, triggerKey: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove('fade-enter');
    void el.offsetWidth; 
    el.classList.add('fade-enter');
    setTimeout(() => {
      el.classList.add('fade-enter-active');
    }, 10);
    return () => {
      el.classList.remove('fade-enter', 'fade-enter-active');
    };
  }, [triggerKey]);
  return <div ref={ref} className="fade-enter">{children}</div>;
}

function App() {
  const [menu, setMenu] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [order, setOrder] = useState<{ id: number; name: string; price: number; quantity: number; img: string }[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [addedId, setAddedId] = useState<number | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [modalItem, setModalItem] = useState<any | null>(null);
  const [orderType, setOrderType] = useState<'na miejscu' | 'na wynos'>('na miejscu');
  const [orderSent, setOrderSent] = useState<{number: number}|null>(null);
  const [sendingOrder, setSendingOrder] = useState(false);

  const location = useLocation();
  const isManagerRoute = location.pathname.startsWith('/manager');

  useEffect(() => {
    fetch(API_MENU_URL)
      .then(res => res.json())
      .then(data => setMenu(data));
  }, []);

  const addToOrder = (item: any) => {
    setOrder((prev) => {
      const found = prev.find((o) => o.id === item.id);
      if (found) {
        return prev.map((o) => o.id === item.id ? { ...o, quantity: o.quantity + 1 } : o);
      }
      return [...prev, { ...item, quantity: 1, img: item.imageUrl?.startsWith('/uploads/') ? `http://localhost:8081${item.imageUrl}` : item.imageUrl }];
    });
    setAddedId(item.id);
    setTimeout(() => setAddedId(null), 400);
  };

  const removeFromOrder = (id: number) => {
    setOrder((prev) => prev.filter((o) => o.id !== id));
  };

  const sendOrder = async () => {
    if (order.length === 0) return;
    setSendingOrder(true);
    try {
      const payload = {
        type: orderType,
        items: order.map(item => ({
          menuItemId: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        }))
      };
      const res = await fetch('http://localhost:8081/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setOrderSent({ number: data.orderNumber });
        setOrder([]);
        setShowSummary(false);
        setSelectedCategory(null);
      }
    } finally {
      setSendingOrder(false);
    }
  };

  const renderOrderNumber = () => (
    <div className="order-number-view">
      <h2>Dziękujemy za zamówienie!</h2>
      <p>Twój numer zamówienia:</p>
      <div className="order-number">{orderSent?.number}</div>
      <button onClick={() => setOrderSent(null)}>Nowe zamówienie</button>
    </div>
  );

  const renderStart = () => (
    <div className="start-view">
      <h2>Witamy w restauracji!</h2>
      <div className="start-tiles">
        {categories.map(cat => (
          <div key={cat.id} className="start-tile" onClick={() => setSelectedCategory(cat.id)}>
            <img src={`/img/${cat.id}.jpg`} alt={cat.name} />
            <span>{cat.name}</span>
          </div>
        ))}
      </div>
    </div>
  )

  const renderMenu = () => (
    <div className="menu-grid">
      {menu.filter(m => m.category === selectedCategory).map(item => (
        <div
          key={item.id}
          className={`menu-card${addedId === item.id ? ' added' : ''}${item.active === false ? ' inactive' : ''}`}
          onClick={() => item.active !== false && setModalItem(item)}
          style={{ cursor: item.active !== false ? 'pointer' : 'default' }}
        >
          {!item.active && <div className="unavailable-label">Niedostępny</div>}
          <img src={item.imageUrl?.startsWith('/uploads/') ? `http://localhost:8081${item.imageUrl}` : item.imageUrl} alt={item.name} />
          <div className="menu-card-info">
            <span>{item.name}</span>
            <span className="price">{item.price} zł</span>
          </div>
        </div>
      ))}
    </div>
  );

  const renderMenuModal = () => {
    if (!modalItem) return null;
    return (
      <div className="menu-modal-overlay" onClick={() => setModalItem(null)}>
        <div className="menu-modal" onClick={e => e.stopPropagation()}>
          <img
            className="menu-modal-img"
            src={modalItem.imageUrl?.startsWith('/uploads/') ? `http://localhost:8081${modalItem.imageUrl}` : modalItem.imageUrl}
            alt={modalItem.name}
          />
          <div className="menu-modal-info">
            <h2>{modalItem.name}</h2>
            <div className="menu-modal-price">{modalItem.price} zł</div>
            <div className="menu-modal-desc">{modalItem.description}</div>
            <div className="menu-modal-actions">
              <button
                className="menu-modal-add"
                onClick={() => {
                  addToOrder(modalItem);
                  setModalItem(null);
                }}
              >Dodaj do koszyka</button>
              <button className="menu-modal-cancel" onClick={() => setModalItem(null)}>Wróć</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderSummary = () => (
    <div className="summary">
      <h2>Podsumowanie zamówienia</h2>
      {order.length === 0 ? <p>Brak pozycji.</p> : (
        <ul>
          {order.map(item => (
            <li key={item.id}>
              <img src={item.img} alt={item.name} />
              <span className="item-name">{item.name}</span>
              <span className="item-qty">x {item.quantity}</span>
              <span className="item-sum">({item.price * item.quantity} zł)</span>
              <button onClick={() => removeFromOrder(item.id)}>Usuń</button>
            </li>
          ))}
        </ul>
      )}
      <div className="summary-bottom">
        <strong>Suma: {order.reduce((sum, item) => sum + item.price * item.quantity, 0)} zł</strong>
        <div style={{ margin: '16px 0' }}>
          <label>
            <input type="radio" name="orderType" value="na miejscu" checked={orderType === 'na miejscu'} onChange={() => setOrderType('na miejscu')} /> Na miejscu
          </label>
          <label style={{ marginLeft: 18 }}>
            <input type="radio" name="orderType" value="na wynos" checked={orderType === 'na wynos'} onChange={() => setOrderType('na wynos')} /> Na wynos
          </label>
        </div>
        <button disabled={order.length === 0 || sendingOrder} onClick={sendOrder} style={{ minWidth: 180 }}>
          {sendingOrder ? 'Wysyłanie...' : 'Potwierdź zamówienie'}
        </button>
        <button onClick={() => setShowSummary(false)}>Wróć</button>
        <button className="cancel-btn" onClick={() => setShowCancelConfirm(true)}>Anuluj zamówienie</button>
      </div>
      {showCancelConfirm && (
        <div className="cancel-confirm-modal">
          <div className="cancel-confirm-content">
            <p>Czy na pewno chcesz anulować zamówienie?</p>
            <div className="cancel-confirm-actions">
              <button onClick={() => {
                setOrder([]);
                setShowSummary(false);
                setSelectedCategory(null);
                setShowCancelConfirm(false);
              }}>Tak, anuluj</button>
              <button onClick={() => setShowCancelConfirm(false)}>Nie</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const handleLogoClick = () => {
    if (selectedCategory !== null || showSummary) {
      setSelectedCategory(null);
      setShowSummary(false);
    }
  };

  if (isManagerRoute) {
    // Nawigacja panelu menedżera
    return (
      <div className="manager-nav-layout">
        <nav className="manager-nav">
          <NavLink to="/manager/menu" className={({isActive}) => isActive ? 'manager-nav-link active' : 'manager-nav-link'}>Edycja menu</NavLink>
          <NavLink to="/manager/orders" className={({isActive}) => isActive ? 'manager-nav-link active' : 'manager-nav-link'}>Podgląd zamówień</NavLink>
          <NavLink to="/manager/reports" className={({isActive}) => isActive ? 'manager-nav-link active' : 'manager-nav-link'}>Raporty</NavLink>
        </nav>
        <div className="manager-nav-content">
          <Routes>
            <Route path="/manager/menu" element={<ManagerMenuView />} />
            <Route path="/manager/orders" element={<ManagerOrdersView />} />
            <Route path="/manager/reports" element={<ManagerReportsView />} />
            <Route path="*" element={<ManagerMenuView />} />
          </Routes>
        </div>
      </div>
    );
  }
  if (location.pathname.startsWith('/employee')) {
    return <EmployeeOrdersView />;
  }
  if (location.pathname.startsWith('/screen')) {
    return <OrderNumbersScreen />;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <div className="main-layout" style={{ minHeight: '100vh', boxSizing: 'border-box', paddingTop: 0 }}>
            {!showSummary && !orderSent && (
              <aside className="sidebar">
                <img
                  src="/img/logo.jpg"
                  alt="Logo"
                  className="sidebar-logo"
                  onClick={handleLogoClick}
                  style={{ cursor: 'pointer' }}
                />
                <h3>Kategorie</h3>
                <ul>
                  {categories.map(cat => {
                    const catCount = order.filter(o => menu.find(m => m.id === o.id)?.category === cat.id).reduce((sum, o) => sum + o.quantity, 0)
                    return (
                      <li key={cat.id} className={selectedCategory === cat.id ? 'active' : ''}>
                        <button onClick={() => setSelectedCategory(cat.id)}>{cat.name}</button>
                        {catCount > 0 && <span className="cat-count">{catCount}</span>}
                      </li>
                    )
                  })}
                </ul>
              </aside>
            )}
            <main className="content">
              {orderSent ? (
                <FadeTransition triggerKey="order-number">
                  {renderOrderNumber()}
                </FadeTransition>
              ) : !showSummary ? (
                <FadeTransition triggerKey={selectedCategory || 'start'}>
                  {selectedCategory ? renderMenu() : renderStart()}
                </FadeTransition>
              ) : (
                <FadeTransition triggerKey="summary">
                  {renderSummary()}
                </FadeTransition>
              )}
              {renderMenuModal()}
              {!showSummary && !orderSent && (
                <div className="order-bar">
                  <span className="total-amount">Suma: {order.reduce((sum, item) => sum + item.price * item.quantity, 0)} zł</span>
                  <button onClick={() => setShowSummary(true)} disabled={order.length === 0}>
                    Przejdź do podsumowania ({order.reduce((sum, item) => sum + item.quantity, 0)})
                  </button>
                </div>
              )}
            </main>
          </div>
        }
      />
    </Routes>
  );
}

export default App;
