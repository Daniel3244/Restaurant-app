import { useEffect, useState } from 'react';
import './App.css';

const STATUS_DISPLAY = ['W realizacji', 'Gotowe'];

function OrderNumbersScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8081/api/orders');
      if (!res.ok) throw new Error('Błąd pobierania zamówień');
      const data = await res.json();
      setOrders(data.filter((o:any) => STATUS_DISPLAY.includes(o.status)));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="order-numbers-screen">
      <h1>Numerki zamówień</h1>
      <div className="order-numbers-grid">
        {loading ? <p>Ładowanie...</p> : error ? <p style={{color:'#ff3b00'}}>{error}</p> : (
          STATUS_DISPLAY.map(status => (
            <div key={status} className="order-numbers-col">
              <h2>{status}</h2>
              <div className="order-numbers-list">
                {orders.filter(o => o.status === status).length === 0 ? (
                  <span className="order-numbers-empty">Brak</span>
                ) : (
                  orders.filter(o => o.status === status).map(o => (
                    <div key={o.id} className="order-number-big">
                      {o.orderNumber}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default OrderNumbersScreen;
