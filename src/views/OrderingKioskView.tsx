import { useEffect, useMemo, useRef, useState } from 'react';
import '../App.css';
import { API_BASE_URL } from '../config';
import { useLocale, useTranslate } from '../context/LocaleContext';

const categoryDefs = [
  { id: 'napoje', labelPl: 'Napoje', labelEn: 'Drinks' },
  { id: 'zestawy', labelPl: 'Zestawy', labelEn: 'Combos' },
  { id: 'burgery', labelPl: 'Burgery', labelEn: 'Burgers' },
  { id: 'wrapy', labelPl: 'Wrapy', labelEn: 'Wraps' },
  { id: 'dodatki', labelPl: 'Dodatki', labelEn: 'Extras' },
] as const;

type MenuItem = {
  id: number;
  name: string;
  description: string;
  nameEn?: string;
  descriptionEn?: string;
  price: number;
  imageUrl: string;
  category: string;
  active?: boolean;
};

type OrderItem = {
  id: number;
  name: string;
  nameEn?: string;
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
  const t = useTranslate();
  const { language } = useLocale();

  const categories = useMemo(() => categoryDefs.map(cat => ({
    id: cat.id,
    label: t(cat.labelPl, cat.labelEn),
  })), [t]);

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
      return [...prev, {
        id: item.id,
        name: item.name,
        nameEn: item.nameEn,
        price: item.price,
        quantity: 1,
        img: formatImageUrl(item.imageUrl),
      }];
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

  const currencySymbol = language === 'pl' ? 'zł' : 'PLN';

  const renderOrderNumber = () => (
    <div className="order-number-view">
      <h2>{t('Dziękujemy za zamówienie!', 'Thank you for your order!')}</h2>
      <p>{t('Twój numer zamówienia:', 'Your order number:')}</p>
      <div className="order-number">{orderSent?.number}</div>
      <button type="button" onClick={() => setOrderSent(null)}>
        {t('Nowe zamówienie', 'Place another order')}
      </button>
    </div>
  );

  const renderStart = () => (
    <div className="start-view">
      <h2>{t('Witamy w restauracji!', 'Welcome!')}</h2>
      <div className="start-tiles">
        {categories.map(cat => (
          <div key={cat.id} className="start-tile" onClick={() => setSelectedCategory(cat.id)}>
            <img src={`/img/${cat.id}.jpg`} alt={cat.label} />
            <span>{cat.label}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderMenu = () => (
    <div className="menu-grid">
      {menu.filter(m => m.category === selectedCategory).map(item => {
        const displayName = language === 'pl' ? item.name : (item.nameEn?.trim() || item.name);
        return (
          <div
            key={item.id}
            className={`menu-card${addedId === item.id ? ' added' : ''}${item.active === false ? ' inactive' : ''}`}
            onClick={() => item.active !== false && setModalItem(item)}
            role="button"
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter' && item.active !== false) {
                setModalItem(item);
              }
            }}
          >
            <img src={formatImageUrl(item.imageUrl)} alt={displayName} />
            <div className="menu-card-info">
              <span>{displayName}</span>
              <span className="price">{item.price} {currencySymbol}</span>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderMenuModal = () => {
    if (!modalItem) return null;
    const displayName = language === 'pl' ? modalItem.name : (modalItem.nameEn?.trim() || modalItem.name);
    const displayDescription = language === 'pl' ? modalItem.description : (modalItem.descriptionEn?.trim() || modalItem.description);
    return (
      <div className="menu-modal-overlay" onClick={() => setModalItem(null)}>
        <div className="menu-modal" onClick={e => e.stopPropagation()}>
          <img
            className="menu-modal-img"
            src={formatImageUrl(modalItem.imageUrl)}
            alt={displayName}
          />
          <div className="menu-modal-info">
            <h2>{displayName}</h2>
            <div className="menu-modal-price">{modalItem.price} {currencySymbol}</div>
            <div className="menu-modal-desc">{displayDescription}</div>
            <div className="menu-modal-actions">
              <button
                type="button"
                className="menu-modal-add"
                onClick={() => {
                  addToOrder(modalItem);
                  setModalItem(null);
                }}
              >
                {t('Dodaj do koszyka', 'Add to cart')}
              </button>
              <button type="button" className="menu-modal-cancel" onClick={() => setModalItem(null)}>
                {t('Wróć', 'Back')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSummary = () => (
    <div className="summary">
      <h2>{t('Podsumowanie zamówienia', 'Order summary')}</h2>
      {order.length === 0 ? (
        <p>{t('Brak pozycji.', 'No items added yet.')}</p>
      ) : (
        <ul>
          {order.map(item => {
            const displayName = language === 'pl' ? item.name : (item.nameEn?.trim() || item.name);
            return (
              <li key={item.id}>
                <img src={item.img} alt={displayName} />
                <span className="item-name">{displayName}</span>
                <span className="item-qty">x {item.quantity}</span>
                <span className="item-sum">({item.price * item.quantity} {currencySymbol})</span>
                <button type="button" onClick={() => removeFromOrder(item.id)}>
                  {t('Usuń', 'Remove')}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="summary-bottom">
        <strong>
          {language === 'pl'
            ? `Suma: ${order.reduce((sum, item) => sum + item.price * item.quantity, 0)} ${currencySymbol}`
            : `Total: ${order.reduce((sum, item) => sum + item.price * item.quantity, 0)} ${currencySymbol}`}
        </strong>
        <div className="order-type-graphics">
          <div
            className={`order-type-option${orderType === 'na miejscu' ? ' selected' : ''}`}
            onClick={() => setOrderType('na miejscu')}
            tabIndex={0}
            role="button"
            aria-label={t('Na miejscu', 'Eat in')}
          >
            <img src="/img/eat-here.jpg" alt={t('Na miejscu', 'Eat in')} />
            <span>{t('Na miejscu', 'Eat in')}</span>
          </div>
          <div
            className={`order-type-option${orderType === 'na wynos' ? ' selected' : ''}`}
            onClick={() => setOrderType('na wynos')}
            tabIndex={0}
            role="button"
            aria-label={t('Na wynos', 'Take away')}
          >
            <img src="/img/to-go.jpg" alt={t('Na wynos', 'Take away')} />
            <span>{t('Na wynos', 'Take away')}</span>
          </div>
        </div>
        <button type="button" disabled={order.length === 0 || sendingOrder} onClick={sendOrder} style={{ minWidth: 180 }}>
          {sendingOrder ? t('Wysyłanie...', 'Sending...') : t('Potwierdź zamówienie', 'Confirm order')}
        </button>
        <button type="button" onClick={() => setShowSummary(false)}>{t('Wróć', 'Back')}</button>
        <button type="button" className="cancel-btn" onClick={() => setShowCancelConfirm(true)}>
          {t('Anuluj zamówienie', 'Cancel order')}
        </button>
      </div>
      {showCancelConfirm && (
        <div className="cancel-confirm-modal">
          <div className="cancel-confirm-content">
            <p>{t('Czy na pewno chcesz anulować zamówienie?', 'Are you sure you want to cancel the order?')}</p>
            <div className="cancel-confirm-actions">
              <button
                type="button"
                onClick={() => {
                  setOrder([]);
                  setShowSummary(false);
                  setSelectedCategory(null);
                  setShowCancelConfirm(false);
                }}
              >
                {t('Tak, anuluj', 'Yes, cancel')}
              </button>
              <button type="button" onClick={() => setShowCancelConfirm(false)}>
                {t('Nie', 'No')}
              </button>
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
            alt={t('Logo', 'Logo')}
            className="sidebar-logo"
            onClick={handleLogoClick}
            style={{ cursor: 'pointer' }}
          />
          <h3>{t('Kategorie', 'Categories')}</h3>
          <ul>
            {categories.map(cat => {
              const catCount = order
                .filter(o => menu.find(m => m.id === o.id)?.category === cat.id)
                .reduce((sum, o) => sum + o.quantity, 0);
              return (
                <li key={cat.id} className={selectedCategory === cat.id ? 'active' : ''}>
                  <button type="button" onClick={() => setSelectedCategory(cat.id)}>{cat.label}</button>
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
              {language === 'pl'
                ? `Suma: ${order.reduce((sum, item) => sum + item.price * item.quantity, 0)} ${currencySymbol}`
                : `Total: ${order.reduce((sum, item) => sum + item.price * item.quantity, 0)} ${currencySymbol}`}
            </span>
            <button type="button" onClick={() => setShowSummary(true)} disabled={order.length === 0}>
              {t('Przejdź do podsumowania', 'Go to summary')} ({order.reduce((sum, item) => sum + item.quantity, 0)})
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default OrderingKioskView;
