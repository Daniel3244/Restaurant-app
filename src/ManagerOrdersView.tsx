import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { pl } from 'date-fns/locale';
import { format } from 'date-fns';
import { API_BASE_URL } from './config';
import { useAuth } from './context/AuthContext';

const STATUS_OPTIONS = ['W realizacji', 'Gotowe', 'Zrealizowane', 'Anulowane'] as const;
const TYPE_OPTIONS = ['na miejscu', 'na wynos'] as const;

const PAGE_SIZE = 200;

type OrdersResponse = {
  orders: OrderRecord[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
};

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
  const [dateRange, setDateRange] = useState<{ dateFrom: Date | null; dateTo: Date | null }>({
    dateFrom: null,
    dateTo: null
  });
  const [lastRefresh, setLastRefresh] = useState<number | null>(null);
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false);
  const auth = useAuth();

  const openNativePicker = (input: HTMLInputElement) => {
    const picker = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof picker.showPicker === 'function') {
      picker.showPicker();
    }
  };

  const handleDatePickerChange = useCallback(
    (key: 'dateFrom' | 'dateTo') => (value: Date | null) => {
      setDateRange(prev => ({ ...prev, [key]: value }));
      setFilters(prev => ({ ...prev, [key]: value ? format(value, 'yyyy-MM-dd') : '' }));
      setPage(0);
    },
    [setPage]
  );

  const authHeaders = useMemo(() => {
    const headers: Record<string, string> = {};
    if (auth.token) {
      headers.Authorization = `Bearer ${auth.token}`;
    }
    return headers;
  }, [auth.token]);

  const fetchOrders = useCallback(async ({ showSpinner = false, targetPage }: { showSpinner?: boolean; targetPage?: number } = {}) => {
    const pageToLoad = typeof targetPage === 'number' ? Math.max(targetPage, 0) : page;
    const shouldShowSpinner = showSpinner || !hasLoaded;
    if (shouldShowSpinner) {
      setLoading(true);
      setError(null);
    }
    try {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.timeFrom) params.append('timeFrom', filters.timeFrom);
      if (filters.timeTo) params.append('timeTo', filters.timeTo);
      if (filters.status) params.append('status', filters.status);
      if (filters.type) params.append('type', filters.type);
      params.append('page', String(pageToLoad));
      params.append('size', String(PAGE_SIZE));

      const res = await fetch(`${API_BASE_URL}/api/manager/orders?${params.toString()}`, {
        headers: authHeaders,
      });
      if (!res.ok) throw new Error('Błąd pobierania zamówień');
      const payload = await res.json() as OrdersResponse;
      const fetchedOrders = payload.orders ?? [];
      setOrders(fetchedOrders);
      setTotalAvailable(payload.totalElements ?? fetchedOrders.length);
      setTotalPages(Math.max(payload.totalPages ?? 1, 1));
      if (typeof payload.page === 'number' && payload.page !== page) {
        setPage(payload.page);
      }
      setLastRefresh(Date.now());
      setHasLoaded(true);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Nieznany błąd');
    } finally {
      if (shouldShowSpinner) {
        setLoading(false);
      }
    }
  }, [authHeaders, filters, hasLoaded, page]);

  useEffect(() => {
    fetchOrders({ showSpinner: !hasLoaded, targetPage: page });
  }, [fetchOrders, hasLoaded, page]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      fetchOrders({ targetPage: page });
    }, 15000);
    return () => window.clearInterval(interval);
  }, [fetchOrders, page]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(f => ({ ...f, [name]: value }));
    setPage(0);
  };

  const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return null;
    }
    return hours * 60 + minutes;
  };

  const getOrderTimeMinutes = (createdAt: string | null) => {
    if (!createdAt) {
      return null;
    }
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date.getHours() * 60 + date.getMinutes();
  };

  const filteredOrders = orders.filter(order => {
    const orderMinutes = getOrderTimeMinutes(order.createdAt);
    const fromMinutes = filters.timeFrom ? timeToMinutes(filters.timeFrom) : null;
    const toMinutes = filters.timeTo ? timeToMinutes(filters.timeTo) : null;

    if (fromMinutes !== null && (orderMinutes === null || orderMinutes < fromMinutes)) {
      return false;
    }
    if (toMinutes !== null && (orderMinutes === null || orderMinutes > toMinutes)) {
      return false;
    }
    if (filters.status && order.status !== filters.status) return false;
    if (filters.type && order.type !== filters.type) return false;
    return true;
  });

  const resetFilters = () => {
    const cleared = { dateFrom: '', dateTo: '', timeFrom: '', timeTo: '', status: '', type: '' };
    setFilters(cleared);
    setDateRange({ dateFrom: null, dateTo: null });
    setPage(0);
  };

  const visibleOrdersCount = filteredOrders.length;
  const visibleSummary = totalAvailable > visibleOrdersCount
    ? `${visibleOrdersCount} / ${totalAvailable}`
    : String(visibleOrdersCount);

  const totalSum = filteredOrders.reduce((sum, order) => {
    const orderSum = order.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    return sum + orderSum;
  }, 0);

  const readyCount = filteredOrders.filter(o => o.status === 'Gotowe' || o.status === 'Zrealizowane').length;
  const inProgressCount = filteredOrders.filter(o => o.status === 'W realizacji').length;

  const formattedRefresh = lastRefresh
    ? new Date(lastRefresh).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
    : '---';
  const canGoPrev = page > 0;
  const canGoNext = page + 1 < totalPages;
  const pageLabel = totalPages > 0 ? page + 1 : 0;

  return (
    <div className="manager-view">
      <div className="manager-view-header manager-view-header--wrap">
        <div>
          <h2>Przegląd zamówień</h2>
          <span className="manager-refresh-info">Odświeżono: {formattedRefresh}</span>
        </div>
      </div>

      <div className="manager-summary-grid compact">
        <div className="manager-summary-card">
          <span className="manager-summary-title">Widoczne zamówienia</span>
          <strong>{visibleSummary}</strong>
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
          <span className="manager-summary-title">Suma wartości</span>
          <strong>{totalSum.toFixed(2)} zł</strong>
        </div>
      </div>

      <div className="manager-pagination" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0' }}>
        <button
          className="manager-cancel-btn"
          onClick={() => setPage(0)}
          disabled={!canGoPrev}
        >
          {'<<'} Pierwsza
        </button>
        <button
          className="manager-cancel-btn"
          onClick={() => setPage(prev => Math.max(prev - 1, 0))}
          disabled={!canGoPrev}
        >
          {'<'} Poprzednia
        </button>
        <span style={{ minWidth: 150, textAlign: 'center' }}>
          Strona {pageLabel} z {totalPages}
        </span>
        <button
          className="manager-save-btn"
          onClick={() => setPage(prev => Math.min(prev + 1, Math.max(totalPages - 1, 0)))}
          disabled={!canGoNext}
        >
          Następna {'>'}
        </button>
        <button
          className="manager-save-btn"
          onClick={() => setPage(Math.max(totalPages - 1, 0))}
          disabled={!canGoNext}
        >
          Ostatnia {'>>'}
        </button>
      </div>
      <p className="manager-refresh-info" style={{ marginTop: -8, marginBottom: 16 }}>
        Łącznie {totalAvailable} zamówień — strona {pageLabel} z {totalPages}
      </p>

      <div className="manager-filters">
        <label>
          Data od:
          <ReactDatePicker
            selected={dateRange.dateFrom}
            onChange={handleDatePickerChange('dateFrom')}
            maxDate={dateRange.dateTo ?? undefined}
            dateFormat="yyyy-MM-dd"
            locale={pl}
            placeholderText="Wybierz datę"
            isClearable
            className="manager-datepicker"
          />
        </label>
        <label>
          Data do:
          <ReactDatePicker
            selected={dateRange.dateTo}
            onChange={handleDatePickerChange('dateTo')}
            minDate={dateRange.dateFrom ?? undefined}
            dateFormat="yyyy-MM-dd"
            locale={pl}
            placeholderText="Wybierz datę"
            isClearable
            className="manager-datepicker"
          />
        </label>
        <label>
          Godzina od:
          <input
            type="time"
            name="timeFrom"
            value={filters.timeFrom}
            onChange={handleFilterChange}
            className="manager-input"
            onFocus={event => openNativePicker(event.currentTarget)}
            onClick={event => openNativePicker(event.currentTarget)}
          />
        </label>
        <label>
          Godzina do:
          <input
            type="time"
            name="timeTo"
            value={filters.timeTo}
            onChange={handleFilterChange}
            className="manager-input"
            onFocus={event => openNativePicker(event.currentTarget)}
            onClick={event => openNativePicker(event.currentTarget)}
          />
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
          <button className="manager-save-btn" onClick={() => { setPage(0); fetchOrders({ showSpinner: true, targetPage: 0 }); }}>
            Filtruj
          </button>
          <button type="button" className="manager-cancel-btn" onClick={resetFilters}>
            Resetuj filtry
          </button>
          <button className="manager-save-btn" onClick={() => fetchOrders({ showSpinner: true, targetPage: page })}>
            Odśwież
          </button>
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
              <tr><td colSpan={7} style={{ textAlign: 'center' }}>Brak zamówień</td></tr>
            ) : filteredOrders.map(order => (
              <tr key={order.id}>
                <td><b>{order.orderNumber}</b></td>
                <td>{order.createdAt ? new Date(order.createdAt).toLocaleDateString('pl-PL') : ''}</td>
                <td>{order.createdAt ? new Date(order.createdAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}</td>
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
                          {item.name} x {item.quantity} <span style={{ color: '#ff9100' }}>{item.price} zł</span>{' '}
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




