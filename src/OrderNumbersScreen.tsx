
import { useEffect, useState } from 'react';
import './App.css';
import { API_BASE_URL } from './config';

const STATUS_DISPLAY = ['W realizacji', 'Gotowe'] as const;

interface Order {
  id: number;
  orderNumber: number;
  status: string;
}

function OrderNumbersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders`);
      if (!res.ok) throw new Error('Blad pobierania zamowien');
      const data = await res.json();
      setOrders(Array.isArray(data) ? data.filter((o: Order) => STATUS_DISPLAY.includes(o.status as any)) : []);
    } catch (e: any) {
      setError(e?.message ?? 'Wystapil blad');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = window.setInterval(fetchOrders, 5000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="order-numbers-screen">
      <h1>Numerki zamowien</h1>
      <div className="order-numbers-grid">
        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p style={{ color: '#ff3b00' }}>{error}</p>
        ) : (
          STATUS_DISPLAY.map(status => {
            const statusOrders = orders.filter(o => o.status === status);
            return (
              <div key={status} className="order-numbers-col">
                <h2>{status}</h2>
                <div className="order-numbers-list">
                  {statusOrders.length === 0 ? (
                    <span className="order-numbers-empty">Brak</span>
                  ) : (
                    statusOrders.map(o => (
                      <div key={o.id} className="order-number-big">
                        {o.orderNumber}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default OrderNumbersScreen;
