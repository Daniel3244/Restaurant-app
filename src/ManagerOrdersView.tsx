// ManagerOrdersView.tsx
// Manager view for listing and filtering all restaurant orders.
// Supports filtering by status, including 'Anulowane'.

import React, { useEffect, useState } from 'react';
import './App.css';

const STATUS_OPTIONS = ['W realizacji', 'Gotowe', 'Zrealizowane', 'Anulowane'];
const TYPE_OPTIONS = ['na miejscu', 'na wynos'];

const ManagerOrdersView: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    timeFrom: '',
    timeTo: '',
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
      if (filters.timeFrom) params.append('timeFrom', filters.timeFrom);
      if (filters.timeTo) params.append('timeTo', filters.timeTo);
      if (filters.status) params.append('status', filters.status);
      if (filters.type) params.append('type', filters.type);
      const res = await fetch(`http://localhost:8081/api/manager/orders?${params.toString()}`);
      if (!res.ok) throw new Error('Błąd pobierania zamówień');
      const data = await res.json();
      setOrders(data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, [filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(f => ({ ...f, [name]: value }));
  };

  // Filtrowanie po godzinie na froncie (jeśli backend nie obsługuje)
  const filteredOrders = orders.filter(order => {
    if (filters.timeFrom) {
      const orderTime = order.createdAt ? order.createdAt.slice(11,16) : '';
      if (orderTime < filters.timeFrom) return false;
    }
    if (filters.timeTo) {
      const orderTime = order.createdAt ? order.createdAt.slice(11,16) : '';
      if (orderTime > filters.timeTo) return false;
    }
    return true;
  });

  return (
    <div className="manager-view">
      <h2>Przegląd zamówień</h2>
      {/* Filters */}
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
          Godzina od:
          <input type="time" name="timeFrom" value={filters.timeFrom || ''} onChange={handleFilterChange} style={{background:'#fff',color:'#222',border:'1.5px solid #eee',borderRadius:4,padding:'4px 8px',fontWeight:500}} />
        </label>
        <label>
          Godzina do:
          <input type="time" name="timeTo" value={filters.timeTo || ''} onChange={handleFilterChange} style={{background:'#fff',color:'#222',border:'1.5px solid #eee',borderRadius:4,padding:'4px 8px',fontWeight:500}} />
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
        {/* Przeniesione przyciski na koniec */}
        <div style={{display:'inline-flex',gap:8,marginLeft:16}}>
          <button className="manager-save-btn" onClick={fetchOrders}>Filtruj</button>
          <button type="button" className="manager-cancel-btn" onClick={() => setFilters(f => ({...f, dateFrom:'', dateTo:'', timeFrom:'', timeTo:'', status:'', type:''}))}>
            Resetuj filtry
          </button>
          <button className="manager-save-btn" onClick={fetchOrders}>Odśwież</button>
        </div>
      </div>
      {/* Table */}
      {loading ? <p>Ładowanie...</p> : error ? <p style={{color:'#ff3b00'}}>{error}</p> : (
        <table className="manager-table" style={{marginTop:24}}>
          <thead>
            <tr>
              <th>Numer</th>
              <th>Data</th>
              <th>Godzina</th>
              <th>Typ</th>
              <th>Status</th>
              <th>Pozycje</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr><td colSpan={7} style={{textAlign:'center'}}>Brak zamówień</td></tr>
            ) : filteredOrders.map(order => (
              <tr key={order.id}>
                <td><b>{order.orderNumber}</b></td>
                <td>{order.createdAt ? order.createdAt.replace('T',' ').slice(0,10) : ''}</td>
                <td>{order.createdAt ? order.createdAt.replace('T',' ').slice(11,16) : ''}</td>
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
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ManagerOrdersView;
