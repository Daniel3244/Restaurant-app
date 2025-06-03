import { useState, useRef, useEffect } from 'react'
import './App.css'

const categories = [
  { id: 'napoje', name: 'Napoje' },
  { id: 'zestawy', name: 'Zestawy' },
  { id: 'burgery', name: 'Burgery' },
  { id: 'wrapy', name: 'Wrapy' },
  { id: 'dodatki', name: 'Dodatki' },
]

const menu = [
  { id: 1, name: 'Coca-Cola', price: 7, category: 'napoje', img: '/img/coca-cola.jpg' },
  { id: 2, name: 'Frytki', price: 9, category: 'dodatki', img: '/img/frytki.jpg' },
  { id: 3, name: 'Burger Wołowy + cola + frytki', price: 28, category: 'zestawy', img: '/img/zestaw-burger.jpg' },
  { id: 4, name: 'Burger Wołowy', price: 19, category: 'burgery', img: '/img/burger-wolowy.jpg' },
  { id: 5, name: 'Wrap Kurczak', price: 17, category: 'wrapy', img: '/img/wrap-kurczak.jpg' },
  { id: 6, name: 'Sos do frytek', price: 3, category: 'dodatki', img: '/img/sos.jpg' },
  { id: 7, name: 'Burger BBQ', price: 21, category: 'burgery', img: '/img/burger-bbq.jpg' },
  { id: 8, name: 'Burger Vege', price: 18, category: 'burgery', img: '/img/burger-vege.jpg' },
  { id: 9, name: 'Wrap Vege', price: 16, category: 'wrapy', img: '/img/wrap-vege.jpg' },
  { id: 10, name: 'Wrap + Sprite + Frytki', price: 27, category: 'zestawy', img: '/img/zestaw-wrap.jpg' },
  { id: 11, name: 'Sprite', price: 7, category: 'napoje', img: '/img/sprite.jpg' },
  { id: 12, name: 'Woda', price: 6, category: 'napoje', img: '/img/woda.jpg' },
]

function FadeTransition({ children, triggerKey }: { children: React.ReactNode, triggerKey: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove('fade-enter');
    void el.offsetWidth; // force reflow
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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [order, setOrder] = useState<{ id: number; name: string; price: number; quantity: number; img: string }[]>([])
  const [showSummary, setShowSummary] = useState(false)
  const [addedId, setAddedId] = useState<number | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const addToOrder = (item: typeof menu[0]) => {
    setOrder((prev) => {
      const found = prev.find((o) => o.id === item.id)
      if (found) {
        return prev.map((o) => o.id === item.id ? { ...o, quantity: o.quantity + 1 } : o)
      }
      return [...prev, { ...item, quantity: 1 }]
    })
    setAddedId(item.id)
    setTimeout(() => setAddedId(null), 400)
  }

  const removeFromOrder = (id: number) => {
    setOrder((prev) => prev.filter((o) => o.id !== id))
  }

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
        <div key={item.id} className={`menu-card${addedId === item.id ? ' added' : ''}`}> 
          <img src={item.img} alt={item.name} />
          <div className="menu-card-info">
            <span>{item.name}</span>
            <span className="price">{item.price} zł</span>
          </div>
          <button onClick={() => addToOrder(item)}>Dodaj do koszyka</button>
        </div>
      ))}
    </div>
  )

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
        <button disabled={order.length === 0}>Potwierdź zamówienie</button>
        <button onClick={() => setShowSummary(false)}>Wróć</button>
        <button className="cancel-btn" onClick={() => setShowCancelConfirm(true)}>Anuluj zamówienie</button>
      </div>
      {showCancelConfirm && (
        <div className="cancel-confirm-modal">
          <div className="cancel-confirm-content">
            <p>Czy na pewno chcesz anulować zamówienie?</p>
            <div className="cancel-confirm-actions">
              <button onClick={() => {
                setOrder([])
                setShowSummary(false)
                setSelectedCategory(null)
                setShowCancelConfirm(false)
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

  return (
    <div className="main-layout" style={{ minHeight: '100vh', boxSizing: 'border-box', paddingTop: 0 }}>
      {!showSummary && (
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
        {!showSummary ? (
          <FadeTransition triggerKey={selectedCategory || 'start'}>
            {selectedCategory ? renderMenu() : renderStart()}
          </FadeTransition>
        ) : (
          <FadeTransition triggerKey="summary">
            {renderSummary()}
          </FadeTransition>
        )}
        {!showSummary && (
          <div className="order-bar">
            <span className="total-amount">Suma: {order.reduce((sum, item) => sum + item.price * item.quantity, 0)} zł</span>
            <button onClick={() => setShowSummary(true)} disabled={order.length === 0}>
              Przejdź do podsumowania ({order.reduce((sum, item) => sum + item.quantity, 0)})
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
