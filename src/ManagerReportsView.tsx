import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { pl } from 'date-fns/locale';
import { API_BASE_URL } from './config';
import { useAuth } from './context/AuthContext';

const STATUS_OPTIONS = ['W realizacji', 'Gotowe', 'Zrealizowane', 'Anulowane'] as const;
const TYPE_OPTIONS = ['na miejscu', 'na wynos'] as const;
const PREVIEW_PAGE_SIZE = 500;
type SortOption = 'createdAt' | 'duration';

type OrderPreview = {
  id: number;
  orderNumber: number;
  createdAt: string | null;
  finishedAt?: string | null;
  type: string;
  status: string;
  items: { id: number; name: string; quantity: number; price: number }[];
};

type OrdersResponse = {
  orders: OrderPreview[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
};

const formatDuration = (order: OrderPreview) => {
  if (!order.createdAt || !order.finishedAt) return '-';
  const diffMs = new Date(order.finishedAt).getTime() - new Date(order.createdAt).getTime();
  if (Number.isNaN(diffMs) || diffMs <= 0) return '-';
  const totalSec = Math.floor(diffMs / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min} min ${sec.toString().padStart(2, '0')} s`;
};

const ManagerReportsView: React.FC = () => {
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [ordersPreview, setOrdersPreview] = useState<OrderPreview[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('createdAt');

  const auth = useAuth();

  const authHeaders = useMemo(() => {
    const headers: Record<string, string> = {};
    if (auth.token) {
      headers.Authorization = `Bearer ${auth.token}`;
    }
    return headers;
  }, [auth.token]);

  useEffect(() => {
    if (!dateFrom && !dateTo) {
      const today = new Date();
      setDateFrom(today);
      setDateTo(today);
    }
  }, [dateFrom, dateTo]);

  const buildParams = (type: 'orders' | 'stats', format: 'pdf' | 'csv') => {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom.toISOString().slice(0, 10));
    if (dateTo) params.append('dateTo', dateTo.toISOString().slice(0, 10));
    if (timeFrom) params.append('timeFrom', timeFrom);
    if (timeTo) params.append('timeTo', timeTo);
    params.append('type', type);
    params.append('format', format);
    return params;
  };

  const downloadReport = async (reportType: 'orders' | 'stats', format: 'pdf' | 'csv' = 'pdf') => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/manager/orders/report?${buildParams(reportType, format).toString()}`, {
        headers: authHeaders,
      });
      if (!res.ok) throw new Error('Blad pobierania raportu');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = format === 'csv'
        ? (reportType === 'orders' ? 'raport_zamowien.csv' : 'raport_statystyk.csv')
        : (reportType === 'orders' ? 'raport_zamowien.pdf' : 'raport_statystyk.pdf');
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.message ?? 'Nieznany blad raportu');
    } finally {
      setLoading(false);
    }
  };

  const fetchPreview = async () => {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom.toISOString().slice(0, 10));
      if (dateTo) params.append('dateTo', dateTo.toISOString().slice(0, 10));
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('type', typeFilter);
      if (timeFrom) params.append('timeFrom', timeFrom);
      if (timeTo) params.append('timeTo', timeTo);
      params.append('page', '0');
      params.append('size', String(PREVIEW_PAGE_SIZE));

      const res = await fetch(`${API_BASE_URL}/api/manager/orders?${params.toString()}`, { headers: authHeaders });
      if (!res.ok) throw new Error('Blad pobierania zamowien');
      let data = ((await res.json()) as OrdersResponse).orders ?? [];

      if (sortBy === 'duration') {
        data = [...data].sort((a, b) => {
          const toSec = (val: string) => {
            const match = val.match(/(\d+) min (\d+) s/);
            return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
          };
          return toSec(formatDuration(b)) - toSec(formatDuration(a));
        });
      } else {
        data = [...data].sort((a, b) => b.orderNumber - a.orderNumber);
      }

      setOrdersPreview(data);
    } catch (e: any) {
      setPreviewError(e?.message ?? 'Nieznany blad pobierania');
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    fetchPreview();
  }, [dateFrom, dateTo, statusFilter, typeFilter, sortBy, timeFrom, timeTo, authHeaders]);

  const setQuickRange = (range: 'today' | 'last7' | 'thisWeek' | 'thisMonth') => {
    const now = new Date();
    if (range === 'today') {
      setDateFrom(new Date(now));
      setDateTo(new Date(now));
      return;
    }
    if (range === 'last7') {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      setDateFrom(start);
      setDateTo(new Date(now));
      return;
    }
    if (range === 'thisWeek') {
      const day = now.getDay();
      const diff = (day + 6) % 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - diff);
      setDateFrom(monday);
      setDateTo(new Date(now));
      return;
    }
    if (range === 'thisMonth') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      setDateFrom(first);
      setDateTo(new Date(now));
    }
  };

  const resetFilters = () => {
    setStatusFilter('');
    setTypeFilter('');
    setTimeFrom('');
    setTimeTo('');
    fetchPreview();
  };

  return (
    <div className="manager-view">
      <h2>Raporty PDF</h2>
      <div className="manager-filters" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <label>
          Data od:
          <ReactDatePicker
            selected={dateFrom}
            onChange={date => setDateFrom(date)}
            maxDate={dateTo ?? undefined}
            dateFormat="yyyy-MM-dd"
            locale={pl}
            placeholderText="Wybierz date"
            isClearable
            className="manager-datepicker"
          />
        </label>
        <label>
          Data do:
          <ReactDatePicker
            selected={dateTo}
            onChange={date => setDateTo(date)}
            minDate={dateFrom ?? undefined}
            dateFormat="yyyy-MM-dd"
            locale={pl}
            placeholderText="Wybierz date"
            isClearable
            className="manager-datepicker"
          />
        </label>
        <label>
          Godzina od:
          <input type="time" value={timeFrom} onChange={e => setTimeFrom(e.target.value)} className="manager-input" />
        </label>
        <label>
          Godzina do:
          <input type="time" value={timeTo} onChange={e => setTimeTo(e.target.value)} className="manager-input" />
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          <button type="button" className="manager-save-btn" onClick={() => setQuickRange('today')}>Dzis</button>
          <button type="button" className="manager-save-btn" onClick={() => setQuickRange('last7')}>Ostatnie 7 dni</button>
          <button type="button" className="manager-save-btn" onClick={() => setQuickRange('thisWeek')}>Ten tydzien</button>
          <button type="button" className="manager-save-btn" onClick={() => setQuickRange('thisMonth')}>Ten miesiac</button>
          <button type="button" className="manager-cancel-btn" onClick={() => { setDateFrom(null); setDateTo(null); }}>
            Wyczysc zakres
          </button>
        </div>
      </div>

      <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <button
          className="manager-save-btn"
          disabled={loading}
          onClick={() => downloadReport('orders', 'pdf')}
        >
          Pobierz raport zamowien (PDF)
        </button>
        <button
          className="manager-save-btn"
          disabled={loading}
          onClick={() => downloadReport('orders', 'csv')}
        >
          Pobierz raport zamowien (CSV)
        </button>
        <button
          className="manager-save-btn"
          disabled={loading}
          onClick={() => downloadReport('stats', 'pdf')}
        >
          Pobierz raport statystyk (PDF)
        </button>
        <button
          className="manager-save-btn"
          disabled={loading}
          onClick={() => downloadReport('stats', 'csv')}
        >
          Pobierz raport statystyk (CSV)
        </button>
        {error && <span className="manager-error" style={{ alignSelf: 'center' }}>{error}</span>}
      </div>

      <div style={{ marginTop: 32, color: '#888', fontSize: '1.05rem' }}>
        <b>Raport zamowien</b> - lista zamowien z wybranego okresu.<br />
        <b>Raport statystyk</b> - liczba zamowien, najczesciej kupowane produkty oraz wartosci.
      </div>

      <div style={{ marginTop: 32 }}>
        <h3 style={{ color: '#ff9100', marginBottom: 8 }}>Podglad raportu</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
          <label>Status:
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="manager-input">
              <option value="">Wszystkie</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label>Typ:
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="manager-input">
              <option value="">Wszystkie</option>
              {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label>Sortuj po:
            <select value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)} className="manager-input">
              <option value="createdAt">Dacie</option>
              <option value="duration">Czasie realizacji</option>
            </select>
          </label>
          <button className="manager-save-btn" onClick={fetchPreview}>Odswiez</button>
          <button type="button" className="manager-cancel-btn" onClick={resetFilters}>Resetuj filtry</button>
        </div>
        {previewLoading ? (
          <p>Loading...</p>
        ) : previewError ? (
          <p style={{ color: '#ff3b00' }}>{previewError}</p>
        ) : (
          <table className="manager-table" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Numer</th>
                <th>Data</th>
                <th>Godzina</th>
                <th>Typ</th>
                <th>Status</th>
                <th>Pozycje</th>
                <th>Czas realizacji</th>
              </tr>
            </thead>
            <tbody>
              {ordersPreview.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center' }}>Brak zamowien</td></tr>
              ) : ordersPreview.map(order => (
                <tr key={order.id}>
                  <td><b>{order.orderNumber}</b></td>
                  <td>{order.createdAt ? order.createdAt.replace('T', ' ').slice(0, 10) : ''}</td>
                  <td>{order.createdAt ? order.createdAt.replace('T', ' ').slice(11, 16) : ''}</td>
                  <td>{order.type}</td>
                  <td>{order.status}</td>
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
                  <td>{formatDuration(order)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ManagerReportsView;

