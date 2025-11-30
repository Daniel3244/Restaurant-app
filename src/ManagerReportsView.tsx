import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { pl } from 'date-fns/locale';
import { API_BASE_URL } from './config';
import { useAuth } from './context/AuthContext';
import { useLocale, useTranslate } from './context/LocaleContext';

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
  items: { id: number; name: string; nameEn?: string | null; quantity: number; price: number }[];
};

type OrdersResponse = {
  orders: OrderPreview[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
};

const getStatusLabel = (status: string, t: ReturnType<typeof useTranslate>) => {
  switch (status) {
    case 'W realizacji': return t('W realizacji', 'In progress');
    case 'Gotowe': return t('Gotowe', 'Ready');
    case 'Zrealizowane': return t('Zrealizowane', 'Completed');
    case 'Anulowane': return t('Anulowane', 'Cancelled');
    default: return status;
  }
};

const getTypeLabel = (type: string, t: ReturnType<typeof useTranslate>) => (
  type === 'na wynos' ? t('Na wynos', 'Take away') : t('Na miejscu', 'Eat in')
);

const parseErrorResponse = async (res: Response, fallback: string): Promise<never> => {
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      const payload = await res.json() as { message?: string; detail?: string; error?: string; title?: string };
      const preferredOrder = [payload?.detail, payload?.message, payload?.error, payload?.title]
        .map(value => typeof value === 'string' ? value.trim() : '')
        .filter(value => value.length > 0);
      const genericResponses = new Set([
        'Bad Request',
        'No message available',
        'Internal Server Error',
        'Error',
        'None'
      ]);
      const message = preferredOrder.find(value => !genericResponses.has(value));
      if (message) {
        throw new Error(message);
      }
    } catch (err) {
      if (err instanceof Error && err.message && err.message !== '[object Object]') {
        throw err;
      }
    }
  } else {
    try {
      const text = await res.text();
      if (text.trim().length > 0) {
        throw new Error(text.trim());
      }
    } catch (err) {
      if (err instanceof Error && err.message) {
        throw err;
      }
    }
  }
  throw new Error(fallback);
};

const getDurationSeconds = (order: OrderPreview) => {
  if (!order.createdAt || !order.finishedAt) return 0;
  const diffMs = new Date(order.finishedAt).getTime() - new Date(order.createdAt).getTime();
  if (Number.isNaN(diffMs) || diffMs <= 0) return 0;
  return Math.floor(diffMs / 1000);
};

const formatDuration = (order: OrderPreview, language: string) => {
  const totalSec = getDurationSeconds(order);
  if (!totalSec) return '-';
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  const secText = sec.toString().padStart(2, '0');
  return language === 'pl'
    ? `${min} min ${secText} s`
    : `${min} min ${secText} s`;
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
  const { language } = useLocale();
  const t = useTranslate();
  const dateLocale = language === 'pl' ? pl : undefined;
  const localeCode = language === 'pl' ? 'pl-PL' : 'en-US';
  const currencySymbol = language === 'pl' ? 'zł' : 'PLN';

  const openNativePicker = (input: HTMLInputElement) => {
    const picker = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof picker.showPicker === 'function') {
      picker.showPicker();
    }
  };

  const authHeaders = useMemo(() => {
    const headers: Record<string, string> = {};
    if (auth.token) {
      headers.Authorization = `Bearer ${auth.token}`;
    }
    return headers;
  }, [auth.token]);

  const toServerTime = useCallback((time: string): string | null => {
    if (!time) return null;
    const [hoursStr, minutesStr] = time.split(':');
    if (hoursStr === undefined || minutesStr === undefined) {
      return null;
    }
    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);
    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return null;
    }
    const reference = dateFrom ?? dateTo ?? new Date();
    const base = new Date(reference);
    base.setHours(hours, minutes, 0, 0);
    const iso = base.toISOString();
    return iso.slice(11, 16);
  }, [dateFrom, dateTo]);

  const formatLocalDate = (iso: string | null): string => {
    if (!iso) return '';
    const date = new Date(iso);
    return date.toLocaleDateString(localeCode);
  };

  const formatLocalTime = (iso: string | null): string => {
    if (!iso) return '';
    const date = new Date(iso);
    return date.toLocaleTimeString(localeCode, { hour: '2-digit', minute: '2-digit', hour12: language !== 'pl' });
  };

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
    const serverTimeFrom = toServerTime(timeFrom);
    const serverTimeTo = toServerTime(timeTo);
    if (serverTimeFrom) params.append('timeFrom', serverTimeFrom);
    if (serverTimeTo) params.append('timeTo', serverTimeTo);
    params.append('reportType', type);
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
      if (!res.ok) {
        await parseErrorResponse(res, t('Błąd pobierania raportu.', 'Failed to download report.'));
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = format === 'csv'
        ? (reportType === 'orders' ? t('raport_zamowien.csv', 'orders_report.csv') : t('raport_statystyk.csv', 'stats_report.csv'))
        : (reportType === 'orders' ? t('raport_zamowien.pdf', 'orders_report.pdf') : t('raport_statystyk.pdf', 'stats_report.pdf'));
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const message = err instanceof Error && err.message ? err.message : t('Nieznany błąd raportu', 'Unknown report error');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreview = useCallback(async () => {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom.toISOString().slice(0, 10));
      if (dateTo) params.append('dateTo', dateTo.toISOString().slice(0, 10));
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('type', typeFilter);
      const serverTimeFrom = toServerTime(timeFrom);
      const serverTimeTo = toServerTime(timeTo);
      if (serverTimeFrom) params.append('timeFrom', serverTimeFrom);
      if (serverTimeTo) params.append('timeTo', serverTimeTo);
      params.append('page', '0');
      params.append('size', String(PREVIEW_PAGE_SIZE));

      const res = await fetch(`${API_BASE_URL}/api/manager/orders?${params.toString()}`, { headers: authHeaders });
      if (!res.ok) {
        await parseErrorResponse(res, t('Nie udało się pobrać danych raportu.', 'Failed to fetch report data.'));
      }
      let data = ((await res.json()) as OrdersResponse).orders ?? [];

      if (sortBy === 'duration') {
        data = [...data].sort((a, b) => getDurationSeconds(b) - getDurationSeconds(a));
      } else {
        data = [...data].sort((a, b) => b.orderNumber - a.orderNumber);
      }

      setOrdersPreview(data);
    } catch (err: unknown) {
      const message = err instanceof Error && err.message ? err.message : t('Nieznany błąd pobierania', 'Unknown fetch error');
      setPreviewError(message);
    } finally {
      setPreviewLoading(false);
    }
  }, [authHeaders, dateFrom, dateTo, statusFilter, typeFilter, sortBy, timeFrom, timeTo, toServerTime, t]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

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
      <h2>{t('Raporty PDF', 'PDF reports')}</h2>
      <div className="manager-filters" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <label>
          {t('Data od:', 'Date from:')}
          <ReactDatePicker
            selected={dateFrom}
            onChange={date => setDateFrom(date)}
            maxDate={dateTo ?? undefined}
            dateFormat="yyyy-MM-dd"
            locale={dateLocale}
            placeholderText={t('Wybierz datę', 'Select date')}
            isClearable
            className="manager-datepicker"
          />
        </label>
        <label>
          {t('Data do:', 'Date to:')}
          <ReactDatePicker
            selected={dateTo}
            onChange={date => setDateTo(date)}
            minDate={dateFrom ?? undefined}
            dateFormat="yyyy-MM-dd"
            locale={dateLocale}
            placeholderText={t('Wybierz datę', 'Select date')}
            isClearable
            className="manager-datepicker"
          />
        </label>
        <label>
          {t('Godzina od:', 'Time from:')}
          <input
            type="time"
            value={timeFrom}
            onChange={e => setTimeFrom(e.target.value)}
            className="manager-input"
            onFocus={event => openNativePicker(event.currentTarget)}
            onClick={event => openNativePicker(event.currentTarget)}
          />
        </label>
        <label>
          {t('Godzina do:', 'Time to:')}
          <input
            type="time"
            value={timeTo}
            onChange={e => setTimeTo(e.target.value)}
            className="manager-input"
            onFocus={event => openNativePicker(event.currentTarget)}
            onClick={event => openNativePicker(event.currentTarget)}
          />
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          <button type="button" className="manager-save-btn" onClick={() => setQuickRange('today')}>
            {t('Dziś', 'Today')}
          </button>
          <button type="button" className="manager-save-btn" onClick={() => setQuickRange('last7')}>
            {t('Ostatnie 7 dni', 'Last 7 days')}
          </button>
          <button type="button" className="manager-save-btn" onClick={() => setQuickRange('thisWeek')}>
            {t('Ten tydzień', 'This week')}
          </button>
          <button type="button" className="manager-save-btn" onClick={() => setQuickRange('thisMonth')}>
            {t('Ten miesiąc', 'This month')}
          </button>
          <button type="button" className="manager-cancel-btn" onClick={() => { setDateFrom(null); setDateTo(null); }}>
            {t('Wyczyść zakres', 'Clear range')}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <button className="manager-save-btn" disabled={loading} onClick={() => downloadReport('orders', 'pdf')}>
          {t('Pobierz raport zamówień (PDF)', 'Download orders report (PDF)')}
        </button>
        <button className="manager-save-btn" disabled={loading} onClick={() => downloadReport('orders', 'csv')}>
          {t('Pobierz raport zamówień (CSV)', 'Download orders report (CSV)')}
        </button>
        <button className="manager-save-btn" disabled={loading} onClick={() => downloadReport('stats', 'pdf')}>
          {t('Pobierz raport statystyk (PDF)', 'Download stats report (PDF)')}
        </button>
        <button className="manager-save-btn" disabled={loading} onClick={() => downloadReport('stats', 'csv')}>
          {t('Pobierz raport statystyk (CSV)', 'Download stats report (CSV)')}
        </button>
        {error && <span className="manager-error" style={{ alignSelf: 'center' }}>{error}</span>}
      </div>

      <div style={{ marginTop: 32, color: '#888', fontSize: '1.05rem' }}>
        <b>{t('Raport zamówień', 'Orders report')}</b> - {t('lista zamówień z wybranego okresu.', 'list of orders from the selected period.')}<br />
        <b>{t('Raport statystyk', 'Stats report')}</b> - {t('liczba zamówień, najczęściej kupowane produkty oraz wartości.', 'number of orders, top selling items and totals.')}
      </div>

      <div style={{ marginTop: 32 }}>
        <h3 style={{ color: '#ff9100', marginBottom: 8 }}>{t('Podgląd raportu', 'Report preview')}</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
          <label>{t('Status:', 'Status:')}
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="manager-input">
              <option value="">{t('Wszystkie', 'All')}</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{getStatusLabel(s, t)}</option>)}
            </select>
          </label>
          <label>{t('Typ:', 'Type:')}
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="manager-input">
              <option value="">{t('Wszystkie', 'All')}</option>
              {TYPE_OPTIONS.map(option => <option key={option} value={option}>{getTypeLabel(option, t)}</option>)}
            </select>
          </label>
          <label>{t('Sortuj po:', 'Sort by:')}
            <select value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)} className="manager-input">
              <option value="createdAt">{t('Dacie', 'Date')}</option>
              <option value="duration">{t('Czasie realizacji', 'Fulfillment time')}</option>
            </select>
          </label>
          <button className="manager-save-btn" onClick={fetchPreview}>{t('Odśwież', 'Refresh')}</button>
          <button type="button" className="manager-cancel-btn" onClick={resetFilters}>{t('Resetuj filtry', 'Reset filters')}</button>
        </div>
        {previewLoading ? (
          <p>{t('Ładowanie...', 'Loading...')}</p>
        ) : previewError ? (
          <p style={{ color: '#ff3b00' }}>{previewError}</p>
        ) : (
          <table className="manager-table" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>{t('Numer', 'Number')}</th>
                <th>{t('Data', 'Date')}</th>
                <th>{t('Godzina', 'Time')}</th>
                <th>{t('Typ', 'Type')}</th>
                <th>{t('Status', 'Status')}</th>
                <th>{t('Pozycje', 'Items')}</th>
                <th>{t('Czas realizacji', 'Fulfillment time')}</th>
              </tr>
            </thead>
            <tbody>
              {ordersPreview.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center' }}>{t('Brak zamówień', 'No orders')}</td></tr>
              ) : ordersPreview.map(order => (
                <tr key={order.id}>
                  <td><b>{order.orderNumber}</b></td>
                  <td>{formatLocalDate(order.createdAt)}</td>
                  <td>{formatLocalTime(order.createdAt)}</td>
                  <td>{getTypeLabel(order.type, t)}</td>
                  <td>{getStatusLabel(order.status, t)}</td>
                  <td style={{ verticalAlign: 'middle', textAlign: 'left', height: '48px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'block', width: '100%' }}>
                        {order.items.map(item => (
                          <li key={item.id} style={{ fontSize: '0.98rem', lineHeight: '1.6', display: 'inline' }}>
                            {(language === 'pl' ? item.name : (item.nameEn?.trim() || item.name))} x {item.quantity} <span style={{ color: '#ff9100' }}>{item.price} {currencySymbol}</span>{' '}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </td>
                  <td>{formatDuration(order, language)}</td>
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



