import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import { API_BASE_URL } from './config';
import { useAuth } from './context/AuthContext';

const STATUS_OPTIONS = ['W realizacji', 'Gotowe', 'Zrealizowane', 'Anulowane'] as const;
const TYPE_OPTIONS = ['na miejscu', 'na wynos'] as const;

type OrderRecord = {
  id: number;
  orderNumber: number;
  createdAt: string | null;
  type: string;
  status: string;
  items: { id: number; name: string; quantity: number; price: number }[];
};

const ManagerOrdersView: React.FC = () => {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
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
  const [lastRefresh, setLastRefresh] = useState<number | null>(null);
  const auth = useAuth();

  const authHeaders = useMemo(() => {
    const headers: Record<string, string> = {};
    if (auth.token) {
      headers.Authorization = `Bearer ${auth.token}`;
    }
    return headers;
  }, [auth.token]);

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

      const res = await fetch(`${API_BASE_URL}/api/manager/orders?${params.toString()}`, {
        headers: authHeaders,
      });
      if (!res.ok) throw new Error('Blad pobierania zamowien');
      const data = (await res.json()) as OrderRecord[];
      setOrders(data.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()));
      setLastRefresh(Date.now());
    } catch (e: any) {
      setError(e?.message ?? 'Nieznany blad');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = window.setInterval(fetchOrders, 15000);
    return () => window.clearInterval(interval);
  }, [filters, authHeaders]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(f => ({ ...f, [name]: value }));
  };

  const filteredOrders = orders.filter(order => {
    if (filters.timeFrom) {
      const orderTime = order.createdAt ? order.createdAt.slice(11, 16) : '';
      if (orderTime < filters.timeFrom) return false;
    }
    if (filters.timeTo) {
      const orderTime = order.createdAt ? order.createdAt.slice(11, 16) : '';
      if (orderTime > filters.timeTo) return false;
    }
    if (filters.status && order.status !== filters.status) return false;
    if (filters.type && order.type !== filters.type) return false;
    return true;
  });

  const resetFilters = () => {
    setFilters({ dateFrom: '', dateTo: '', timeFrom: '', timeTo: '', status: '', type: '' });
  };

  const totalSum = filteredOrders.reduce((sum, order) => {
    const orderSum = order.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    return sum + orderSum;
  }, 0);

  const readyCount = filteredOrders.filter(o => o.status === 'Gotowe' || o.status === 'Zrealizowane').length;
  const inProgressCount = filteredOrders.filter(o => o.status === 'W realizacji').length;

  const formattedRefresh = lastRefresh
    ? new Date(lastRefresh).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
    : '---';

  return (
    <div className="manager-view">
      <div className="manager-view-header manager-view-header--wrap">
        <div>
          <h2>Przeglad zamowien</h2>
          <span className="manager-refresh-info">Odswiezono: {formattedRefresh}</span>
        </div>
        <a href="/" className="manager-nav-back">&larr; Powrot do strony glownej</a>
      </div>

      <div className="manager-summary-grid compact">
        <div className="manager-summary-card">
          <span className="manager-summary-title">Widoczne zamowienia</span>
          <strong>{filteredOrders.length}</strong>
        </div>
        <div className="manager-summary-card">
          <span className="manager-summary-title">W realizacji</span>
          <strong>{inProgressCount}</strong>
        </div>
        <div className="manager-summary-card">
          <span className="manager-summary-title">Gotowe / Zrealizowane</span>
          <strong>{readyCount}</strong>
        </div>
        <div className="manager-summary-card">
          <span className="manager-summary-title">Suma wartosci</span>
          <strong>{totalSum.toFixed(2)} zl</strong>
        </div>
      </div>

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
          <input type="time" name="timeFrom" value={filters.timeFrom} onChange={handleFilterChange} className="manager-input" />
        </label>
        <label>
          Godzina do:
          <input type="time" name="timeTo" value={filters.timeTo} onChange={handleFilterChange} className="manager-input" />
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
        <div style={{ display: 'inline-flex', gap: 8, marginLeft: 16 }}>
          <button className="manager-save-btn" onClick={fetchOrders}>Filtruj</button>
          <button type="button" className="manager-cancel-btn" onClick={resetFilters}>
            Resetuj filtry
          </button>
          <button className="manager-save-btn" onClick={fetchOrders}>Odswiez</button>
        </div>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p style={{ color: '#ff3b00' }}>{error}</p>
      ) : (
        <table className="manager-table" style={{ marginTop: 24 }}>
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
              <tr><td colSpan={7} style={{ textAlign: 'center' }}>Brak zamowien</td></tr>
            ) : filteredOrders.map(order => (
              <tr key={order.id}>
                <td><b>{order.orderNumber}</b></td>
                <td>{order.createdAt ? order.createdAt.replace('T', ' ').slice(0, 10) : ''}</td>
                <td>{order.createdAt ? order.createdAt.replace('T', ' ').slice(11, 16) : ''}</td>
                <td>{order.type}</td>
                <td>
                  <div className={`manager-status-pill ${order.status === 'Gotowe' || order.status === 'Zrealizowane' ? 'ready' : 'progress'}`}>
                    {order.status}
                  </div>
                </td>
                <td style={{ verticalAlign: 'middle', textAlign: 'left', height: '48px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'block', width: '100%' }}>
                      {order.items.map(item => (
                        <li key={item.id} style={{ fontSize: '0.98rem', lineHeight: '1.6', display: 'inline' }}>
                          {item.name} x {item.quantity} <span style={{ color: '#ff9100' }}>{item.price} zl</span>{' '}
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




