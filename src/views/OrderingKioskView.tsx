import { useEffect, useRef, useState } from 'react';
import '../App.css';
import { API_BASE_URL } from '../config';

const categories = [
  { id: 'napoje', name: 'Napoje' },
  { id: 'zestawy', name: 'Zestawy' },
  { id: 'burgery', name: 'Burgery' },
  { id: 'wrapy', name: 'Wrapy' },
  { id: 'dodatki', name: 'Dodatki' },
];

type MenuItem = {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  active?: boolean;
};

type OrderItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
  img: string;
};

function FadeTransition({ children, triggerKey }: { children: React.ReactNode; triggerKey: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove('fade-enter');
    void el.offsetWidth;
    el.classList.add('fade-enter');
    const timeout = window.setTimeout(() => {
      el.classList.add('fade-enter-active');
    }, 10);
    return () => {
      window.clearTimeout(timeout);
      el.classList.remove('fade-enter', 'fade-enter-active');
    };
  }, [triggerKey]);
  return <div ref={ref} className="fade-enter">{children}</div>;
}

function formatImageUrl(path?: string | null) {
  if (!path) return '';
  return path.startsWith('/uploads/') ? `${API_BASE_URL}${path}` : path;
}

function OrderingKioskView() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderItem[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [addedId, setAddedId] = useState<number | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [modalItem, setModalItem] = useState<MenuItem | null>(null);
  const [orderType, setOrderType] = useState<'na miejscu' | 'na wynos'>('na miejscu');
  const [orderSent, setOrderSent] = useState<{ number: number } | null>(null);
  const [sendingOrder, setSendingOrder] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/menu`)
      .then(res => res.json())
      .then((data: MenuItem[]) => setMenu(data))
      .catch(() => setMenu([]));
  }, []);

  const addToOrder = (item: MenuItem) => {
    setOrder(prev => {
      const found = prev.find(o => o.id === item.id);
      if (found) {
        return prev.map(o => (o.id === item.id ? { ...o, quantity: o.quantity + 1 } : o));
      }
      return [...prev, { ...item, quantity: 1, img: formatImageUrl(item.imageUrl) }];
    });
    setAddedId(item.id);
    window.setTimeout(() => setAddedId(null), 400);
  };

  const removeFromOrder = (id: number) => {
    setOrder(prev => prev.filter(o => o.id !== id));
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
          price: item.price,
        })),
      };
      const res = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

  const handleLogoClick = () => {
    if (selectedCategory !== null || showSummary) {
      setSelectedCategory(null);
      setShowSummary(false);
    }
  };

  const renderOrderNumber = () => (
    <div className="order-number-view">
      <h2>Dziekujemy za zamowienie!</h2>
      <p>Twoj numer zamowienia:</p>
      <div className="order-number">{orderSent?.number}</div>
      <button onClick={() => setOrderSent(null)}>Nowe zamowienie</button>
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
  );

  const renderMenu = () => (
    <div className="menu-grid">
      {menu.filter(m => m.category === selectedCategory).map(item => (
        <div
          key={item.id}
          className={`menu-card${addedId === item.id ? ' added' : ''}${item.active === false ? ' inactive' : ''}`}
          onClick={() => item.active !== false && setModalItem(item)}
          style={{ cursor: item.active !== false ? 'pointer' : 'default' }}
        >
          {item.active === false && <div className="unavailable-label">Niedostepny</div>}
          <img src={formatImageUrl(item.imageUrl)} alt={item.name} />
          <div className="menu-card-info">
            <span>{item.name}</span>
            <span className="price">{item.price} zl</span>
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
            src={formatImageUrl(modalItem.imageUrl)}
            alt={modalItem.name}
          />
          <div className="menu-modal-info">
            <h2>{modalItem.name}</h2>
            <div className="menu-modal-price">{modalItem.price} zl</div>
            <div className="menu-modal-desc">{modalItem.description}</div>
            <div className="menu-modal-actions">
              <button
                className="menu-modal-add"
                onClick={() => {
                  addToOrder(modalItem);
                  setModalItem(null);
                }}
              >
                Dodaj do koszyka
              </button>
              <button className="menu-modal-cancel" onClick={() => setModalItem(null)}>
                Wroc
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSummary = () => (
    <div className="summary">
      <h2>Podsumowanie zamowienia</h2>
      {order.length === 0 ? (
        <p>Brak pozycji.</p>
      ) : (
        <ul>
          {order.map(item => (
            <li key={item.id}>
              <img src={item.img} alt={item.name} />
              <span className="item-name">{item.name}</span>
              <span className="item-qty">x {item.quantity}</span>
              <span className="item-sum">({item.price * item.quantity} zl)</span>
              <button onClick={() => removeFromOrder(item.id)}>Usun</button>
            </li>
          ))}
        </ul>
      )}
      <div className="summary-bottom">
        <strong>
          Suma: {order.reduce((sum, item) => sum + item.price * item.quantity, 0)} zl
        </strong>
        <div className="order-type-graphics">
          <div
            className={`order-type-option${orderType === 'na miejscu' ? ' selected' : ''}`}
            onClick={() => setOrderType('na miejscu')}
            tabIndex={0}
            role="button"
            aria-label="Na miejscu"
          >
            <img src="/img/eat-here.jpg" alt="Na miejscu" />
            <span>Na miejscu</span>
          </div>
          <div
            className={`order-type-option${orderType === 'na wynos' ? ' selected' : ''}`}
            onClick={() => setOrderType('na wynos')}
            tabIndex={0}
            role="button"
            aria-label="Na wynos"
          >
            <img src="/img/to-go.jpg" alt="Na wynos" />
            <span>Na wynos</span>
          </div>
        </div>
        <button disabled={order.length === 0 || sendingOrder} onClick={sendOrder} style={{ minWidth: 180 }}>
          {sendingOrder ? 'Wysylanie...' : 'Potwierdz zamowienie'}
        </button>
        <button onClick={() => setShowSummary(false)}>Wroc</button>
        <button className="cancel-btn" onClick={() => setShowCancelConfirm(true)}>
          Anuluj zamowienie
        </button>
      </div>
      {showCancelConfirm && (
        <div className="cancel-confirm-modal">
          <div className="cancel-confirm-content">
            <p>Czy na pewno chcesz anulowac zamowienie?</p>
            <div className="cancel-confirm-actions">
              <button
                onClick={() => {
                  setOrder([]);
                  setShowSummary(false);
                  setSelectedCategory(null);
                  setShowCancelConfirm(false);
                }}
              >
                Tak, anuluj
              </button>
              <button onClick={() => setShowCancelConfirm(false)}>Nie</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
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
              const catCount = order
                .filter(o => menu.find(m => m.id === o.id)?.category === cat.id)
                .reduce((sum, o) => sum + o.quantity, 0);
              return (
                <li key={cat.id} className={selectedCategory === cat.id ? 'active' : ''}>
                  <button onClick={() => setSelectedCategory(cat.id)}>{cat.name}</button>
                  {catCount > 0 && <span className="cat-count">{catCount}</span>}
                </li>
              );
            })}
          </ul>
        </aside>
      )}
      <main className="content">
        {orderSent ? (
          <FadeTransition triggerKey="order-number">{renderOrderNumber()}</FadeTransition>
        ) : !showSummary ? (
          <FadeTransition triggerKey={selectedCategory || 'start'}>
            {selectedCategory ? renderMenu() : renderStart()}
          </FadeTransition>
        ) : (
          <FadeTransition triggerKey="summary">{renderSummary()}</FadeTransition>
        )}
        {renderMenuModal()}
        {!showSummary && !orderSent && (
          <div className="order-bar">
            <span className="total-amount">
              Suma: {order.reduce((sum, item) => sum + item.price * item.quantity, 0)} zl
            </span>
            <button onClick={() => setShowSummary(true)} disabled={order.length === 0}>
              Przejdz do podsumowania ({order.reduce((sum, item) => sum + item.quantity, 0)})
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default OrderingKioskView;

