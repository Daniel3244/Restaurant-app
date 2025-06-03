import React, { useEffect, useState, useRef } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import './App.css';

export type MenuItem = {
  id?: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  active?: boolean;
};

const API_URL = 'http://localhost:8081/api/manager/menu';
const UPLOAD_URL = 'http://localhost:8081/api/manager/menu/upload';
const CATEGORIES = [
  { id: 'napoje', name: 'Napoje' },
  { id: 'zestawy', name: 'Zestawy' },
  { id: 'burgery', name: 'Burgery' },
  { id: 'wrapy', name: 'Wrapy' },
  { id: 'dodatki', name: 'Dodatki' },
];

const ManagerMenuView: React.FC = () => {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [form, setForm] = useState<Omit<MenuItem, 'imageUrl'> & { imageFile: File | null}>(
    { name: '', description: '', price: 0, imageFile: null, category: CATEGORIES[0].id }
  );
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMenu = async () => {
    setLoading(true);
    const res = await fetch(API_URL);
    setMenu(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'file') return;
    setForm({ ...form, [name]: type === 'number' ? Number(value) : value });
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setForm({ ...form, imageFile: e.target.files[0] });
      setPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    let imageUrl = '';
    if (!editId && !form.imageFile) {
      setError('Wybierz plik JPG przed dodaniem pozycji.');
      return;
    }
    if (form.imageFile) {
      setUploading(true);
      const data = new FormData();
      data.append('file', form.imageFile);
      const res = await fetch(UPLOAD_URL, { method: 'POST', body: data });
      if (res.ok) {
        imageUrl = await res.text();
      } else {
        setUploading(false);
        setError('Błąd uploadu pliku: ' + (await res.text()));
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
      setError('Nie udało się ustalić ścieżki do obrazka.');
      return;
    }
    if (editId) {
      await fetch(`${API_URL}/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }
    setForm({ name: '', description: '', price: 0, imageFile: null, category: CATEGORIES[0].id });
    setEditId(null);
    fetchMenu();
  };

  const handleEdit = (item: MenuItem) => {
    setForm({ name: item.name, description: item.description, price: item.price, imageFile: null, category: item.category });
    setEditId(item.id!);
  };

  const handleDelete = async (id: number) => {
    await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    fetchMenu();
  };

  return (
    <div className="manager-view">
      <h2>Zarządzanie menu</h2>
      <form className="manager-form" onSubmit={handleSubmit}>
        <div className="manager-form-row">
          <input
            name="name"
            placeholder="Nazwa"
            value={form.name}
            onChange={handleChange}
            required
            style={{ background: '#fff', color: '#222' }}
          />
          <select name="category" value={form.category} onChange={handleChange} required>
            {CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <input name="price" type="number" step="0.01" placeholder="Cena" value={form.price} onChange={handleChange} required />
        </div>
        <div className="manager-form-row">
          <input
            name="imageFile"
            type="file"
            accept="image/jpeg"
            onChange={handleFileChange}
            ref={fileInputRef}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className="manager-upload-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            {form.imageFile ? 'Zmień obrazek' : 'Wybierz obrazek'}
          </button>
          {form.imageFile && (
            <span className="manager-file-name">{form.imageFile.name}</span>
          )}
          {preview && (
            <img src={preview} alt="Podgląd" className="manager-img-preview" />
          )}
        </div>
        <textarea name="description" placeholder="Opis" value={form.description} onChange={handleChange} />
        <div className="manager-form-row">
          <button type="submit" disabled={uploading} className="manager-save-btn">
            {editId ? 'Zapisz zmiany' : 'Dodaj pozycję'}
          </button>
          {editId && (
            <button
              type="button"
              className="manager-cancel-btn"
              onClick={() => {
                setEditId(null);
                setForm({ name: '', description: '', price: 0, imageFile: null, category: CATEGORIES[0].id });
                setPreview(null);
              }}
            >
              Anuluj edycję
            </button>
          )}
        </div>
      </form>
      {error && <div className="manager-error">{error}</div>}
      <div className="manager-list">
        {loading ? (
          <p>Ładowanie...</p>
        ) : menu.length === 0 ? (
          <p>Brak pozycji w menu.</p>
        ) : (
          <table className="manager-table">
            <thead>
              <tr>
                <th>Nazwa</th>
                <th>Kategoria</th>
                <th>Cena</th>
                <th>Opis</th>
                <th>Obrazek</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {menu.map(item => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{CATEGORIES.find(c => c.id === item.category)?.name || item.category}</td>
                  <td>{item.price.toFixed(2)} zł</td>
                  <td>{item.description}</td>
                  <td>
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl.startsWith('/uploads/') ? `http://localhost:8081${item.imageUrl}` : item.imageUrl}
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
                      Usuń
                    </button>
                    <button
                      className={item.active ? "manager-toggle-btn manager-toggle-on" : "manager-toggle-btn manager-toggle-off"}
                      onClick={async () => {
                        await fetch(`${API_URL}/${item.id}/toggle-active`, { method: 'PATCH' });
                        fetchMenu();
                      }}
                    >
                      {item.active ? 'Dezaktywuj' : 'Aktywuj'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ManagerMenuView;
