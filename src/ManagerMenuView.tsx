import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import './App.css';
import { API_BASE_URL } from './config';
import { useAuth } from './context/AuthContext';

export type MenuItem = {
  id?: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  active?: boolean;
};

const API_URL = `${API_BASE_URL}/api/manager/menu`;
const UPLOAD_URL = `${API_BASE_URL}/api/manager/menu/upload`;
const CATEGORIES = [
  { id: 'napoje', name: 'Napoje' },
  { id: 'zestawy', name: 'Zestawy' },
  { id: 'burgery', name: 'Burgery' },
  { id: 'wrapy', name: 'Wrapy' },
  { id: 'dodatki', name: 'Dodatki' },
];

const ManagerMenuView: React.FC = () => {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [form, setForm] = useState<Omit<MenuItem, 'imageUrl'> & { imageFile: File | null }>({
    name: '',
    description: '',
    price: 0,
    imageFile: null,
    category: '',
  });
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [filter, setFilter] = useState({ name: '', category: '', price: '', description: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const auth = useAuth();

  const authHeaders = useMemo(() => {
    const headers: Record<string, string> = {};
    if (auth.token) {
      headers.Authorization = `Bearer ${auth.token}`;
    }
    return headers;
  }, [auth.token]);

  const fetchMenu = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_URL, { headers: authHeaders });
      if (!res.ok) throw new Error('Nie udalo sie pobrac menu');
      const data = (await res.json()) as MenuItem[];
      setMenu(data);
    } catch (e: any) {
      setError(e?.message ?? 'Nieznany blad');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, [authHeaders]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'file') return;
    setForm(prev => ({ ...prev, [name]: type === 'number' ? Number(value) : value }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setForm(prev => ({ ...prev, imageFile: e.target.files![0] }));
      setPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.category) {
      setError('Wybierz kategorie przed dodaniem pozycji.');
      return;
    }

    let imageUrl = '';
    if (!editId && !form.imageFile) {
      setError('Wybierz plik JPG przed dodaniem pozycji.');
      return;
    }

    if (form.imageFile) {
      setUploading(true);
      const data = new FormData();
      data.append('file', form.imageFile);
      const res = await fetch(UPLOAD_URL, {
        method: 'POST',
        body: data,
        headers: authHeaders,
      });
      if (res.ok) {
        imageUrl = await res.text();
      } else {
        setUploading(false);
        setError('Blad uploadu pliku: ' + (await res.text()));
        return;
      }
      setUploading(false);
    }

    const payload = {
      name: form.name,
      description: form.description,
      price: form.price,
      imageUrl: imageUrl || (editId ? menu.find(m => m.id === editId)?.imageUrl || '' : ''),
      category: form.category,
    };

    if (!payload.imageUrl) {
      setError('Nie udalo sie ustalic sciezki do obrazka.');
      return;
    }

    const requestInit: RequestInit = {
      method: editId ? 'PUT' : 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    };

    const url = editId ? `${API_URL}/${editId}` : API_URL;
    await fetch(url, requestInit);

    setForm({ name: '', description: '', price: 0, imageFile: null, category: '' });
    setEditId(null);
    setPreview(null);
    const input = fileInputRef.current;
    if (input) {
      input.value = '';
    }
    fetchMenu();
  };

  const handleEdit = (item: MenuItem) => {
    setForm({
      name: item.name,
      description: item.description,
      price: item.price,
      imageFile: null,
      category: item.category,
    });
    setEditId(item.id!);
    setPreview(item.imageUrl?.startsWith('/uploads/') ? `${API_BASE_URL}${item.imageUrl}` : item.imageUrl);
  };

  const handleDelete = async (id: number) => {
    await fetch(`${API_URL}/${id}`, { method: 'DELETE', headers: authHeaders });
    fetchMenu();
  };

  const toggleActive = async (item: MenuItem) => {
    await fetch(`${API_URL}/${item.id}/toggle-active`, { method: 'PATCH', headers: authHeaders });
    fetchMenu();
  };

  const filteredMenu = menu.filter(item =>
    (!filter.name || item.name.toLowerCase().includes(filter.name.toLowerCase())) &&
    (!filter.category || item.category === filter.category) &&
    (!filter.price || item.price.toString().includes(filter.price)) &&
    (!filter.description || item.description.toLowerCase().includes(filter.description.toLowerCase()))
  );

  const resolveImage = (url: string) => (url?.startsWith('/uploads/') ? `${API_BASE_URL}${url}` : url);

  return (
    <div className="manager-view">
      <h2>Zarzadzanie menu</h2>

      <form className="manager-form" onSubmit={handleSubmit}>
        <div className="manager-form-row">
          <label>
            Nazwa
            <input type="text" name="name" value={form.name} onChange={handleChange} required />
          </label>
          <label>
            Kategoria
            <select name="category" value={form.category} onChange={handleChange} required>
              <option value="">Wybierz...</option>
              {CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </label>
          <label>
            Cena (zl)
            <input type="number" name="price" value={form.price} min={0} step={0.01} onChange={handleChange} required />
          </label>
        </div>

        <label>
          Opis
          <textarea name="description" value={form.description} onChange={handleChange} rows={3} />
        </label>

        <div className="manager-form-row">
          <label>
            Obrazek (JPG)
            <input type="file" accept=".jpg,.jpeg" onChange={handleFileChange} ref={fileInputRef} />
          </label>
          {preview && (
            <img src={preview} alt="Podglad" className="manager-img-thumb" style={{ alignSelf: 'flex-end' }} />
          )}
        </div>

        <div className="manager-form-row">
          <button type="submit" disabled={uploading} className="manager-save-btn">
            {editId ? 'Zapisz zmiany' : 'Dodaj pozycje'}
          </button>
          {editId && (
            <button
              type="button"
              className="manager-cancel-btn"
              onClick={() => {
                setEditId(null);
                setForm({ name: '', description: '', price: 0, imageFile: null, category: '' });
                setPreview(null);
                const input = fileInputRef.current;
                if (input) {
                  input.value = '';
                }
              }}
            >
              Anuluj edycje
            </button>
          )}
        </div>
      </form>

      {error && <div className="manager-error">{error}</div>}

      <div className="manager-list">
        <table className="manager-table">
          <thead>
            <tr>
              <th>
                Nazwa
                <br />
                <input
                  type="text"
                  placeholder="Filtruj..."
                  value={filter.name}
                  onChange={e => setFilter(f => ({ ...f, name: e.target.value }))}
                  style={{ width: '90%', fontSize: '0.95rem', marginTop: 4 }}
                />
              </th>
              <th>
                Kategoria
                <br />
                <select
                  value={filter.category}
                  onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}
                  style={{ width: '90%', fontSize: '0.95rem', marginTop: 4 }}
                >
                  <option value="">Wszystkie</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </th>
              <th>
                Cena
                <br />
                <input
                  type="number"
                  placeholder="Filtruj..."
                  value={filter.price}
                  onChange={e => setFilter(f => ({ ...f, price: e.target.value }))}
                  style={{ width: '90%', fontSize: '0.95rem', marginTop: 4 }}
                />
              </th>
              <th>
                Opis
                <br />
                <input
                  type="text"
                  placeholder="Filtruj..."
                  value={filter.description}
                  onChange={e => setFilter(f => ({ ...f, description: e.target.value }))}
                  style={{ width: '90%', fontSize: '0.95rem', marginTop: 4 }}
                />
              </th>
              <th>Obrazek</th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center' }}>Loading...</td></tr>
            ) : filteredMenu.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center' }}>Brak pozycji</td></tr>
            ) : (
              filteredMenu.map(item => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{CATEGORIES.find(c => c.id === item.category)?.name || item.category}</td>
                  <td>{item.price.toFixed(2)} zl</td>
                  <td>{item.description}</td>
                  <td>
                    {item.imageUrl && (
                      <img
                        src={resolveImage(item.imageUrl)}
                        alt={item.name}
                        className="manager-img-thumb"
                        onError={e => {
                          (e.target as HTMLImageElement).src = '/img/logo.jpg';
                        }}
                        style={{ background: '#fff' }}
                      />
                    )}
                  </td>
                  <td>
                    <button className="manager-edit-btn" onClick={() => handleEdit(item)}>Edytuj</button>
                    <button className="manager-delete-btn" onClick={() => handleDelete(item.id!)}>
                      Usun
                    </button>
                    <button
                      className={item.active ? 'manager-toggle-btn manager-toggle-on' : 'manager-toggle-btn manager-toggle-off'}
                      onClick={() => toggleActive(item)}
                    >
                      {item.active ? 'Dezaktywuj' : 'Aktywuj'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManagerMenuView;

