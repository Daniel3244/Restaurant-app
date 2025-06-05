// EmployeeOrdersView.tsx
// Employee view for managing and updating restaurant orders.
// Allows status changes and cancellation (sets status to 'Anulowane').

import { useEffect, useState } from 'react';
import './App.css';

const STATUS_FLOW = ['Nowe', 'W realizacji', 'Gotowe', 'Zrealizowane', 'Anulowane'];

function EmployeeOrdersView() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8081/api/orders');
      if (!res.ok) throw new Error('Błąd pobierania zamówień');
      const data = await res.json();
      setOrders(data.sort((a: any, b: any) => b.orderNumber - a.orderNumber));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const nextStatus = (status: string) => {
    const idx = STATUS_FLOW.indexOf(status);
    return idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
  };

  const handleStatusChange = async (order: any) => {
    const newStatus = nextStatus(order.status);
    if (!newStatus) return;
    setUpdating(order.id);
    try {
      await fetch(`http://localhost:8081/api/orders/${order.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      fetchOrders();
    } finally {
      setUpdating(null);
    }
  };

  const handleCancel = async (order: any) => {
    if (!window.confirm('Czy na pewno anulować zamówienie?')) return;
    setUpdating(order.id);
    try {
      await fetch(`http://localhost:8081/api/orders/${order.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Anulowane' })
      });
      fetchOrders();
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="manager-view">
      <h2>Panel pracownika – Zamówienia</h2>
      {loading ? <p>Ładowanie...</p> : error ? <p style={{color:'#ff3b00'}}>{error}</p> : (
        <table className="manager-table" style={{marginTop:24}}>
          <thead>
            <tr>
              <th>Numer</th>
              <th>Data</th>
              <th>Typ</th>
              <th>Status</th>
              <th>Pozycje</th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id} style={{opacity: updating === order.id ? 0.5 : 1}}>
                <td><b>{order.orderNumber}</b></td>
                <td>{order.createdAt?.replace('T',' ').slice(0,16)}</td>
                <td>{order.type}</td>
                <td>{order.status}</td>
                <td>
                  <ul style={{margin:0,padding:0}}>
                    {order.items.map((item:any) => (
                      <li key={item.id} style={{fontSize:'0.98rem'}}>
                        {item.name} x {item.quantity} <span style={{color:'#ff9100'}}>{item.price} zł</span>
                      </li>
                    ))}
                  </ul>
                </td>
                <td>
                  {/* Show status change button only if not Zrealizowane or Anulowane */}
                  {order.status !== 'Zrealizowane' && order.status !== 'Anulowane' && (
                    <button className="manager-save-btn" style={{marginBottom:6}} disabled={updating===order.id} onClick={()=>handleStatusChange(order)}>
                      {nextStatus(order.status) ? `Do: ${nextStatus(order.status)}` : 'Zrealizowane'}
                    </button>
                  )}
                  <br/>
                  {/* Show Anuluj button only if not Zrealizowane or Anulowane */}
                  {order.status !== 'Zrealizowane' && order.status !== 'Anulowane' && (
                    <button className="manager-delete-btn" disabled={updating===order.id} onClick={()=>handleCancel(order)}>
                      Anuluj
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default EmployeeOrdersView;
