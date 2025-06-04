import React, { useState } from 'react';
import './App.css';

const API_URL = 'http://localhost:8081/api/manager/orders/report';

const ManagerReportsView: React.FC = () => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="manager-view">
      <h2>Raporty PDF</h2>
      <div className="manager-filters">
        <label>
          Data od:
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </label>
        <label>
          Data do:
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </label>
      </div>
      <div style={{marginTop:24, display:'flex', gap:16}}>
        <button className="manager-save-btn" disabled={loading} onClick={() => downloadReport('orders')}>
          Pobierz raport zamówień
        </button>
        <button className="manager-save-btn" disabled={loading} onClick={() => downloadReport('stats')}>
          Pobierz raport statystyk
        </button>
      </div>
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
