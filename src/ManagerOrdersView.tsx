import React, { useEffect, useState } from 'react';
import './App.css';

const STATUS_OPTIONS = ['Nowe', 'W realizacji', 'Gotowe', 'Zrealizowane'];
const TYPE_OPTIONS = ['na miejscu', 'na wynos'];

const ManagerOrdersView: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: '',
    type: ''
  });

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.status) params.append('status', filters.status);
      if (filters.type) params.append('type', filters.type);
      const res = await fetch(`http://localhost:8081/api/manager/orders?${params.toString()}`);
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
    // Auto-refresh every 15s
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(f => ({ ...f, [name]: value }));
  };

  return (
    <div className="manager-view">
      <h2>Przegląd zamówień</h2>
      <div className="manager-filters">
        <label>
          Data od:
          <input type="date" name="dateFrom" value={filters.dateFrom} onChange={handleFilterChange} />
        </label>
        <label>
          Data do:
          <input type="date" name="dateTo" value={filters.dateTo} onChange={handleFilterChange} />
        </label>
        <label>
          Status:
          <select name="status" value={filters.status} onChange={handleFilterChange}>
            <option value="">Wszystkie</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label>
          Typ:
          <select name="type" value={filters.type} onChange={handleFilterChange}>
            <option value="">Wszystkie</option>
            {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <button className="manager-save-btn" onClick={fetchOrders} style={{marginLeft:12}}>Filtruj</button>
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
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr><td colSpan={5} style={{textAlign:'center'}}>Brak zamówień</td></tr>
            ) : orders.map(order => (
              <tr key={order.id}>
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
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ManagerOrdersView;
