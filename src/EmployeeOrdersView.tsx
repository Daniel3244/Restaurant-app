// EmployeeOrdersView.tsx
// Employee view for managing and updating restaurant orders.
// Allows status changes and cancellation (sets status to 'Anulowane').

import { useEffect, useState } from 'react';
import './App.css';

const STATUS_FLOW = ['W realizacji', 'Gotowe', 'Zrealizowane', 'Anulowane'];
const TODAY = new Date().toISOString().slice(0, 10);
const TABS = [
  { key: 'todo', label: 'Do zrealizowania', statuses: ['W realizacji', 'Gotowe'] },
  { key: 'done', label: 'Zrealizowane', statuses: ['Zrealizowane'] },
  { key: 'cancelled', label: 'Anulowane', statuses: ['Anulowane'] },
];

function EmployeeOrdersView() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('todo');

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

  // Filter orders: only today's orders
  const todayOrders = orders.filter(order => order.createdAt && order.createdAt.slice(0, 10) === TODAY);
  // Filter by tab
  const filteredOrders = todayOrders.filter(order => {
    const tab = TABS.find(t => t.key === activeTab);
    return tab ? tab.statuses.includes(order.status) : true;
  });

  return (
    <div className="manager-view">
      <h2>Panel pracownika – Zamówienia</h2>
      <div style={{display:'flex',gap:8,marginBottom:16}}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={activeTab === tab.key ? 'manager-save-btn' : 'manager-cancel-btn'}
            style={{fontWeight:activeTab===tab.key?'bold':'normal'}}
            onClick={()=>setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {loading ? <p>Ładowanie...</p> : error ? <p style={{color:'#ff3b00'}}>{error}</p> : (
        <table className="manager-table" style={{marginTop:24}}>
          <thead>
            <tr>
              <th>Numer</th>
              <th>Data</th>
              <th>Typ</th>
              <th>Status</th>
              <th>Pozycje</th>
              {/* Show 'Akcje' column only in 'todo' tab */}
              {activeTab === 'todo' && <th>Akcje</th>}
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map(order => (
              <tr key={order.id} style={{opacity: updating === order.id ? 0.5 : 1}}>
                <td><b>{order.orderNumber}</b></td>
                <td>{order.createdAt?.replace('T',' ').slice(0,16)}</td>
                <td>{order.type}</td>
                <td>{order.status}</td>
                <td style={{verticalAlign:'middle', textAlign:'left', height: '48px'}}>
                  <div style={{display:'flex',alignItems:'center',height:'100%'}}>
                    <ul style={{margin:0,padding:0,listStyle:'none',display:'block',width:'100%'}}>
                      {order.items.map((item:any) => (
                        <li key={item.id} style={{fontSize:'0.98rem',lineHeight:'1.6',display:'inline'}}>
                          {item.name} x {item.quantity} <span style={{color:'#ff9100'}}>{item.price} zł</span>{' '}
                        </li>
                      ))}
                    </ul>
                  </div>
                </td>
                {/* Show action buttons only in 'todo' tab */}
                {activeTab === 'todo' && (
                  <td>
                    {order.status !== 'Zrealizowane' && order.status !== 'Anulowane' && (
                      <button className="manager-save-btn" style={{marginBottom:6}} disabled={updating===order.id} onClick={()=>handleStatusChange(order)}>
                        {nextStatus(order.status) ? `Do: ${nextStatus(order.status)}` : 'Zrealizowane'}
                      </button>
                    )}
                    <br/>
                    {order.status !== 'Zrealizowane' && order.status !== 'Anulowane' && (
                      <button className="manager-delete-btn" disabled={updating===order.id} onClick={()=>handleCancel(order)}>
                        Anuluj
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {filteredOrders.length === 0 && (
              <tr>
                {/* colspan depends on tab: 6 for todo, 5 for others */}
                <td colSpan={activeTab === 'todo' ? 6 : 5} style={{textAlign:'center'}}>Brak zamówień</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default EmployeeOrdersView;
