import React, { useState } from 'react';
import './App.css';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { pl } from 'date-fns/locale';

const API_URL = 'http://localhost:8081/api/manager/orders/report';

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
              // Ostatnie 7 dni (włącznie z dzisiaj)
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
              // Ostatni tydzień (poniedziałek-niedziela poprzedniego tygodnia)
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
              // Dodaj jeden dzień do obu dat, by uniknąć przesunięcia strefy czasowej
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
              // Dodaj jeden dzień, by uniknąć przesunięcia na ostatni dzień poprzedniego roku
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
    </div>
  );
};

export default ManagerReportsView;
