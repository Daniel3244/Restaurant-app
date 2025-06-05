// ManagerReportsView.tsx
// Manager view for generating and previewing order and statistics reports.
// Supports filtering by status, including 'Anulowane'.

import React, { useState } from 'react';
import './App.css';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { pl } from 'date-fns/locale';

const API_URL = 'http://localhost:8081/api/manager/orders/report';

const STATUS_OPTIONS = ['Nowe', 'W realizacji', 'Gotowe', 'Zrealizowane', 'Anulowane'];
const TYPE_OPTIONS = ['na miejscu', 'na wynos'];

const ManagerReportsView: React.FC = () => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ustaw dzisiejszą datę jako domyślną dla obu pól
  React.useEffect(() => {
    if (!dateFrom && !dateTo) {
      const today = new Date().toISOString().slice(0, 10);
      setDateFrom(today);
      setDateTo(today);
    }
  }, []);

  const downloadReport = async (type: 'orders' | 'stats') => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      params.append('type', type);
      const res = await fetch(`${API_URL}?${params.toString()}`);
      if (!res.ok) throw new Error('Błąd pobierania raportu');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = type === 'orders' ? 'raport_zamowien.pdf' : 'statystyki_zamowien.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const [ordersPreview, setOrdersPreview] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt'|'duration'>('createdAt');

  const fetchOrdersPreview = async () => {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('type', typeFilter);
      const res = await fetch(`http://localhost:8081/api/manager/orders?${params.toString()}`);
      if (!res.ok) throw new Error('Błąd pobierania zamówień');
      let data = await res.json();
      data = data.map((order: any) => {
        let duration = null;
        if (order.finishedAt && order.createdAt) {
          const diff = new Date(order.finishedAt).getTime() - new Date(order.createdAt).getTime();
          const totalSec = Math.floor(diff / 1000);
          const min = Math.floor(totalSec / 60);
          const sec = totalSec % 60;
          duration = `${min} min ${sec.toString().padStart(2, '0')} s`;
        }
        return {
          ...order,
          duration
        };
      });
      if (sortBy === 'duration') {
        data = [...data].sort((a, b) => {
          const getSec = (d: string|null) => {
            if (!d) return 0;
            const m = d.match(/(\d+) min (\d+) s/);
            if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
            return 0;
          };
          return getSec(b.duration) - getSec(a.duration);
        });
      } else {
        data = [...data].sort((a, b) => b.orderNumber - a.orderNumber);
      }
      setOrdersPreview(data);
    } catch (e: any) {
      setPreviewError(e.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  React.useEffect(() => {
    fetchOrdersPreview();
  }, [dateFrom, dateTo, statusFilter, typeFilter, sortBy]);

  const quickBtnStyle: React.CSSProperties = {
    padding: '4px 12px',
    borderRadius: 4,
    border: 'none',
    background: '#ff9800',
    color: '#fff',
    fontWeight: 'bold',
    cursor: 'pointer',
  };

  return (
    <div className="manager-view">
      <h2>Raporty PDF</h2>
      <div className="manager-filters" style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:8,marginBottom:8}}>
        <label>
          Data od:
          <ReactDatePicker
            selected={dateFrom ? new Date(dateFrom) : null}
            onChange={date => setDateFrom(date ? date.toISOString().slice(0, 10) : '')}
            maxDate={dateTo ? new Date(dateTo) : undefined}
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
            selected={dateTo ? new Date(dateTo) : null}
            onChange={date => setDateTo(date ? date.toISOString().slice(0, 10) : '')}
            minDate={dateFrom ? new Date(dateFrom) : undefined}
            dateFormat="yyyy-MM-dd"
            locale={pl}
            placeholderText="Wybierz datę"
            isClearable
            className="manager-datepicker"
          />
        </label>
        <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:8}}>
          <button
            type="button"
            style={quickBtnStyle}
            onClick={() => {
              const today = new Date().toISOString().slice(0, 10);
              setDateFrom(today);
              setDateTo(today);
            }}
          >
            Dziś
          </button>
          <button
            type="button"
            style={quickBtnStyle}
            onClick={() => {
              const now = new Date();
              const last7 = new Date(now);
              last7.setDate(now.getDate() - 6);
              setDateFrom(last7.toISOString().slice(0, 10));
              setDateTo(now.toISOString().slice(0, 10));
            }}
          >
            Ostatnie 7 dni
          </button>
          <button
            type="button"
            style={quickBtnStyle}
            onClick={() => {
              const now = new Date();
              const day = now.getDay();
              const daysSinceMonday = ((day + 6) % 7);
              const thisMonday = new Date(now);
              thisMonday.setDate(now.getDate() - daysSinceMonday);
              const lastMonday = new Date(thisMonday);
              lastMonday.setDate(thisMonday.getDate() - 7);
              const lastSunday = new Date(lastMonday);
              lastSunday.setDate(lastMonday.getDate() + 6);
              setDateFrom(lastMonday.toISOString().slice(0, 10));
              setDateTo(lastSunday.toISOString().slice(0, 10));
            }}
          >
            Ostatni tydzień
          </button>
          <button
            type="button"
            style={quickBtnStyle}
            onClick={() => {
              // Ten tydzień: od poniedziałku tego tygodnia do dziś
              const now = new Date();
              const day = now.getDay();
              const daysSinceMonday = ((day + 6) % 7);
              const thisMonday = new Date(now);
              thisMonday.setDate(now.getDate() - daysSinceMonday);
              setDateFrom(thisMonday.toISOString().slice(0, 10));
              setDateTo(now.toISOString().slice(0, 10));
            }}
          >
            Ten tydzień
          </button>
          <button
            type="button"
            style={quickBtnStyle}
            onClick={() => {
              // Ostatni miesiąc: cały poprzedni miesiąc
              const now = new Date();
              const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
              const lastDayPrevMonth = new Date(firstDayThisMonth);
              lastDayPrevMonth.setDate(0);
              const firstDayPrevMonth = new Date(lastDayPrevMonth.getFullYear(), lastDayPrevMonth.getMonth(), 1);
              // Dodaj jeden dzień do obu dat, by uniknąć przesunięcia strefy czasowej
              firstDayPrevMonth.setDate(firstDayPrevMonth.getDate() + 1);
              lastDayPrevMonth.setDate(lastDayPrevMonth.getDate() + 1);
              setDateFrom(firstDayPrevMonth.toISOString().slice(0, 10));
              setDateTo(lastDayPrevMonth.toISOString().slice(0, 10));
            }}
          >
            Ostatni miesiąc
          </button>
          <button
            type="button"
            style={quickBtnStyle}
            onClick={() => {
              // Ten miesiąc: od pierwszego dnia bieżącego miesiąca do dziś
              const now = new Date();
              const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
              // Dodaj jeden dzień, by uniknąć przesunięcia na ostatni dzień poprzedniego miesiąca
              firstDay.setDate(firstDay.getDate() + 1);
              setDateFrom(firstDay.toISOString().slice(0, 10));
              setDateTo(now.toISOString().slice(0, 10));
            }}
          >
            Ten miesiąc
          </button>
          <button
            type="button"
            style={quickBtnStyle}
            onClick={() => {
              // Ostatni rok: cały poprzedni rok
              const now = new Date();
              const prevYear = now.getFullYear() - 1;
              const firstDayPrevYear = new Date(prevYear, 0, 1);
              const lastDayPrevYear = new Date(prevYear, 11, 31);
              firstDayPrevYear.setDate(firstDayPrevYear.getDate() + 1);
              lastDayPrevYear.setDate(lastDayPrevYear.getDate() + 1);
              setDateFrom(firstDayPrevYear.toISOString().slice(0, 10));
              setDateTo(lastDayPrevYear.toISOString().slice(0, 10));
            }}
          >
            Ostatni rok
          </button>
          <button
            type="button"
            style={quickBtnStyle}
            onClick={() => {
              // Ten rok: od pierwszego dnia bieżącego roku do dziś
              const now = new Date();
              const firstDay = new Date(now.getFullYear(), 0, 1);
              firstDay.setDate(firstDay.getDate() + 1);
              setDateFrom(firstDay.toISOString().slice(0, 10));
              setDateTo(now.toISOString().slice(0, 10));
            }}
          >
            Ten rok
          </button>
          <button
            type="button"
            style={{...quickBtnStyle, background:'#e53935'}}
            onClick={() => {
              setDateFrom('');
              setDateTo('');
            }}
          >
            Wyczyść
          </button>
        </div>
      </div>
      <div style={{marginTop:24, display:'flex', gap:16}}>
        <button className="manager-save-btn" disabled={loading} onClick={() => downloadReport('orders')}>
          Pobierz raport zamówień
        </button>
        <button className="manager-save-btn" disabled={loading} onClick={() => downloadReport('stats')}>
          Pobierz raport statystyk
        </button>
      </div>
      {/* Informacja o zakresie dat raportu */}
      {(dateFrom || dateTo) && (
        <div style={{marginTop:16, color:'#444', fontSize:'1.08rem', fontWeight:500}}>
          Zakres raportu:
          {dateFrom && dateTo && dateFrom === dateTo && (
            <> <b>{dateFrom}</b></>
          )}
          {dateFrom && dateTo && dateFrom !== dateTo && (
            <> <b>{dateFrom}</b> – <b>{dateTo}</b></>
          )}
          {dateFrom && !dateTo && (
            <> od <b>{dateFrom}</b></>
          )}
          {!dateFrom && dateTo && (
            <> do <b>{dateTo}</b></>
          )}
        </div>
      )}
      {loading && <p>Generowanie raportu...</p>}
      {error && <div className="manager-error">{error}</div>}
      <div style={{marginTop:32, color:'#888', fontSize:'1.05rem'}}>
        <b>Raport zamówień</b> – szczegółowa lista zamówień z wybranego okresu.<br/>
        <b>Raport statystyk</b> – liczba zamówień, najczęściej kupowany produkt, suma i średnia wartości.
      </div>
      <div style={{marginTop:32}}>
        <h3 style={{color:'#ff9100',marginBottom:8}}>Podgląd raportu</h3>
        <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center',marginBottom:8}}>
          <label>Status:
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{marginLeft:6}}>
              <option value="">Wszystkie</option>
              {STATUS_OPTIONS.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label>Typ:
            <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} style={{marginLeft:6}}>
              <option value="">Wszystkie</option>
              {TYPE_OPTIONS.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label>Sortuj po:
            <select value={sortBy} onChange={e=>setSortBy(e.target.value as any)} style={{marginLeft:6}}>
              <option value="createdAt">Dacie</option>
              <option value="duration">Czasie realizacji</option>
            </select>
          </label>
          <button className="manager-save-btn" onClick={fetchOrdersPreview}>Odśwież</button>
        </div>
        {previewLoading ? <p>Ładowanie...</p> : previewError ? <p style={{color:'#ff3b00'}}>{previewError}</p> : (
          <table className="manager-table" style={{marginTop:8}}>
            <thead>
              <tr>
                <th>Numer</th>
                <th>Data</th>
                <th>Typ</th>
                <th>Status</th>
                <th>Pozycje</th>
                <th>Czas realizacji</th>
              </tr>
            </thead>
            <tbody>
              {ordersPreview.length === 0 ? (
                <tr><td colSpan={6} style={{textAlign:'center'}}>Brak zamówień</td></tr>
              ) : ordersPreview.map(order => (
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
                  <td>{order.duration !== null ? order.duration : '-'}</td>
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
