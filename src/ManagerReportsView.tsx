// ManagerReportsView.tsx
// Manager view for generating and previewing order and statistics reports.
// Supports filtering by status, including 'Anulowane'.

import React, { useState } from 'react';
import './App.css';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { pl } from 'date-fns/locale';

const API_URL = 'http://localhost:8081/api/manager/orders/report';

const STATUS_OPTIONS = ['W realizacji', 'Gotowe', 'Zrealizowane', 'Anulowane'];
const TYPE_OPTIONS = ['na miejscu', 'na wynos'];

const ManagerReportsView: React.FC = () => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set today's date as default for both fields
  React.useEffect(() => {
    if (!dateFrom && !dateTo) {
      const today = new Date().toISOString().slice(0, 10);
      setDateFrom(today);
      setDateTo(today);
    }
  }, []);

  const [timeFromReport, setTimeFromReport] = useState('');
  const [timeToReport, setTimeToReport] = useState('');

  const downloadReport = async (type: 'orders' | 'stats') => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (timeFromReport) params.append('timeFrom', timeFromReport);
      if (timeToReport) params.append('timeTo', timeToReport);
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
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');

  const fetchOrdersPreview = async () => {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('type', typeFilter);
      if (timeFrom) params.append('timeFrom', timeFrom);
      if (timeTo) params.append('timeTo', timeTo);
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
      // Frontend filtering by hour (if backend doesn't support it)
      if (timeFrom) {
        data = data.filter((order: any) => order.createdAt && order.createdAt.slice(11,16) >= timeFrom);
      }
      if (timeTo) {
        data = data.filter((order: any) => order.createdAt && order.createdAt.slice(11,16) <= timeTo);
      }
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
        <label>
          Godzina od:
          <input type="time" value={timeFromReport} onChange={e => setTimeFromReport(e.target.value)} style={{background:'#fff',color:'#222',border:'1.5px solid #eee',borderRadius:4,padding:'4px 8px',fontWeight:500}} />
        </label>
        <label>
          Godzina do:
          <input type="time" value={timeToReport} onChange={e => setTimeToReport(e.target.value)} style={{background:'#fff',color:'#222',border:'1.5px solid #eee',borderRadius:4,padding:'4px 8px',fontWeight:500}} />
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
              // This week: from Monday of this week to today
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
              // Last month: whole previous month
              const now = new Date();
              const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
              const lastDayPrevMonth = new Date(firstDayThisMonth);
              lastDayPrevMonth.setDate(0);
              const firstDayPrevMonth = new Date(lastDayPrevMonth.getFullYear(), lastDayPrevMonth.getMonth(), 1);
              // Add one day to both dates to avoid timezone shift
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
              // This month: from the first day of the current month to today
              const now = new Date();
              const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
              // Add one day to avoid shifting to the last day of the previous month
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
              // Last year: whole previous year
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
              // This year: from the first day of the current year to today
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
              setTimeFromReport('');
              setTimeToReport('');
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
      {/* Date range information for the report */}
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
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{marginLeft:6,background:'#fff',color:'#222',border:'1.5px solid #eee',borderRadius:4,padding:'4px 8px',fontWeight:500}}>
              <option value="">Wszystkie</option>
              {STATUS_OPTIONS.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label>Typ:
            <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} style={{marginLeft:6,background:'#fff',color:'#222',border:'1.5px solid #eee',borderRadius:4,padding:'4px 8px',fontWeight:500}}>
              <option value="">Wszystkie</option>
              {TYPE_OPTIONS.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label>Sortuj po:
            <select value={sortBy} onChange={e=>setSortBy(e.target.value as any)} style={{marginLeft:6,background:'#fff',color:'#222',border:'1.5px solid #eee',borderRadius:4,padding:'4px 8px',fontWeight:500}}>
              <option value="createdAt">Dacie</option>
              <option value="duration">Czasie realizacji</option>
            </select>
          </label>
          <label>
            Godzina od:
            <input type="time" value={timeFrom} onChange={e => setTimeFrom(e.target.value)} style={{background:'#fff',color:'#222',border:'1.5px solid #eee',borderRadius:4,padding:'4px 8px',fontWeight:500}} />
          </label>
          <label>
            Godzina do:
            <input type="time" value={timeTo} onChange={e => setTimeTo(e.target.value)} style={{background:'#fff',color:'#222',border:'1.5px solid #eee',borderRadius:4,padding:'4px 8px',fontWeight:500}} />
          </label>
          <button className="manager-save-btn" onClick={fetchOrdersPreview}>Odśwież</button>
          <button type="button" className="manager-cancel-btn" style={{marginLeft:8}} onClick={() => { setTimeFrom(''); setTimeTo(''); setStatusFilter(''); setTypeFilter(''); setDateFrom(''); setDateTo(''); }}>
            Resetuj filtry
          </button>
        </div>
        {previewLoading ? <p>Ładowanie...</p> : previewError ? <p style={{color:'#ff3b00'}}>{previewError}</p> : (
          <table className="manager-table" style={{marginTop:8}}>
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
                <tr><td colSpan={6} style={{textAlign:'center'}}>Brak zamówień</td></tr>
              ) : ordersPreview.map(order => (
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
