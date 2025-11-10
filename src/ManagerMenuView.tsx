import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import './App.css';
import { API_BASE_URL } from './config';
import { useAuth } from './context/AuthContext';
import { useLocale, useTranslate } from './context/LocaleContext';

export type MenuItem = {
  id?: number;
  name: string;
  description: string;
  nameEn?: string | null;
  descriptionEn?: string | null;
  price: number;
  imageUrl: string;
  category: string;
  active?: boolean;
};

const API_URL = `${API_BASE_URL}/api/manager/menu`;
const UPLOAD_URL = `${API_BASE_URL}/api/manager/menu/upload`;
const CATEGORY_DEFS = [
  { id: 'napoje', labelPl: 'Napoje', labelEn: 'Drinks' },
  { id: 'zestawy', labelPl: 'Zestawy', labelEn: 'Combos' },
  { id: 'burgery', labelPl: 'Burgery', labelEn: 'Burgers' },
  { id: 'wrapy', labelPl: 'Wrapy', labelEn: 'Wraps' },
  { id: 'dodatki', labelPl: 'Dodatki', labelEn: 'Extras' },
] as const;

type UploadResponse = {
  url?: string;
  originalName?: string;
  error?: string;
};

const ManagerMenuView: React.FC = () => {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [form, setForm] = useState<Omit<MenuItem, 'imageUrl'> & { imageFile: File | null; nameEn: string; descriptionEn: string }>({
    name: '',
    description: '',
    price: 0,
    imageFile: null,
    category: '',
    nameEn: '',
    descriptionEn: '',
  });
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [filter, setFilter] = useState({ name: '', category: '', price: '', description: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const auth = useAuth();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [lastLoaded, setLastLoaded] = useState<number | null>(null);
  const { language } = useLocale();
  const t = useTranslate();

  const categories = useMemo(() => CATEGORY_DEFS.map(cat => ({
    id: cat.id,
    label: t(cat.labelPl, cat.labelEn),
  })), [t]);

  const authHeaders = useMemo(() => {
    const headers: Record<string, string> = {};
    if (auth.token) {
      headers.Authorization = `Bearer ${auth.token}`;
    }
    return headers;
  }, [auth.token]);

  const fetchMenu = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API_URL, { headers: authHeaders });
      if (!res.ok) throw new Error(t('Nie udało się pobrać menu.', 'Failed to fetch menu.'));
      const data = (await res.json()) as MenuItem[];
      setMenu(data);
      setLastLoaded(Date.now());
      setError(null);
    } catch (err: unknown) {
      const message = err instanceof Error && err.message ? err.message : t('Nieznany błąd', 'Unknown error');
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [authHeaders, t]);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

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
      setError(t('Wybierz kategorię przed dodaniem pozycji.', 'Select a category before adding an item.'));
      return;
    }

    let imageUrl = '';
    if (!editId && !form.imageFile) {
      setError(t('Wybierz plik JPG przed dodaniem pozycji.', 'Select a JPG image before adding an item.'));
      return;
    }

    if (form.imageFile) {
      setUploading(true);
      const data = new FormData();
      data.append('file', form.imageFile);
      try {
        const res = await fetch(UPLOAD_URL, {
          method: 'POST',
          body: data,
          headers: authHeaders,
        });
        const payload = await res.json().catch(() => null) as UploadResponse | null;
        if (!res.ok || !payload?.url) {
          const message = payload?.error ?? (res.status === 415 ? t('Niepoprawny typ pliku', 'Unsupported file type') : t('Nie udało się zapisać obrazka.', 'Could not save image.'));
          setError(t('Błąd przesyłania pliku:', 'File upload error: ') + message);
          setFeedback({ type: 'error', message });
          return;
        }
        imageUrl = payload.url;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t('Nieznany błąd', 'Unknown error');
        setError(t('Błąd przesyłania pliku:', 'File upload error: ') + message);
        setFeedback({ type: 'error', message: t('Nie udało się zapisać obrazka.', 'Could not save image.') });
        return;
      } finally {
        setUploading(false);
      }
    }

    const payload = {
      name: form.name,
      description: form.description,
      nameEn: form.nameEn?.trim() ? form.nameEn.trim() : null,
      descriptionEn: form.descriptionEn?.trim() ? form.descriptionEn.trim() : null,
      price: form.price,
      imageUrl: imageUrl || (editId ? menu.find(m => m.id === editId)?.imageUrl || '' : ''),
      category: form.category,
    };

    if (!payload.imageUrl) {
      setError(t('Nie udało się ustalić ścieżki do obrazka.', 'Could not determine image path.'));
      return;
    }

    const requestInit: RequestInit = {
      method: editId ? 'PUT' : 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    };

    const url = editId ? `${API_URL}/${editId}` : API_URL;
    const response = await fetch(url, requestInit);
    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null) as { message?: string } | null;
      const message = errorPayload?.message ?? t('Nie udało się zapisać pozycji.', 'Could not save menu item.');
      setError(message);
      setFeedback({ type: 'error', message });
      return;
    }

    setForm({ name: '', description: '', price: 0, imageFile: null, category: '', nameEn: '', descriptionEn: '' });
    setEditId(null);
    setPreview(null);
    const input = fileInputRef.current;
    if (input) {
      input.value = '';
    }
    fetchMenu();
    setFeedback({ type: 'success', message: editId ? t('Zmiany zapisane.', 'Changes saved.') : t('Dodano nową pozycję.', 'Menu item added.') });
  };

  const handleEdit = (item: MenuItem) => {
    setForm({
      name: item.name,
      description: item.description,
      price: item.price,
      imageFile: null,
      category: item.category,
      nameEn: item.nameEn ?? '',
      descriptionEn: item.descriptionEn ?? '',
    });
    setEditId(item.id!);
    setPreview(item.imageUrl?.startsWith('/uploads/') ? `${API_BASE_URL}${item.imageUrl}` : item.imageUrl);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('Usunąć tę pozycję z menu?', 'Remove this menu item?'))) {
      return;
    }
    await fetch(`${API_URL}/${id}`, { method: 'DELETE', headers: authHeaders });
    fetchMenu();
    setFeedback({ type: 'success', message: t('Pozycja została usunięta.', 'Menu item removed.') });
  };

  const toggleActive = async (item: MenuItem) => {
    await fetch(`${API_URL}/${item.id}/toggle-active`, { method: 'PATCH', headers: authHeaders });
    fetchMenu();
    setFeedback({
      type: 'success',
      message: item.active ? t('Pozycja ukryta w menu.', 'Item hidden from menu.') : t('Pozycja ponownie widoczna.', 'Item visible again.'),
    });
  };

  const filteredMenu = menu.filter(item =>
    (!filter.name || item.name.toLowerCase().includes(filter.name.toLowerCase())) &&
    (!filter.category || item.category === filter.category) &&
    (!filter.price || item.price.toString().includes(filter.price)) &&
    (!filter.description || item.description.toLowerCase().includes(filter.description.toLowerCase()))
  );

  const resolveImage = (url: string) => (url?.startsWith('/uploads/') ? `${API_BASE_URL}${url}` : url);

  const summary = useMemo(() => {
    const active = menu.filter(item => item.active !== false).length;
    const inactive = menu.length - active;
    return {
      total: menu.length,
      active,
      inactive,
    };
  }, [menu]);

  const categoryLabel = (id: string) => categories.find(cat => cat.id === id)?.label || id;
  const currencySymbol = language === 'pl' ? 'zł' : 'PLN';

  return (
    <div className="manager-view">
      <div className="manager-view-header manager-view-header--wrap">
        <h2>{t('Zarządzanie menu', 'Menu management')}</h2>
      </div>

      <form className="manager-form" onSubmit={handleSubmit}>
        <div className="manager-form-row">
          <label>
            {t('Nazwa (PL)', 'Name (PL)')}
            <input type="text" name="name" value={form.name} onChange={handleChange} required />
          </label>
          <label>
            {t('Nazwa (EN)', 'Name (EN)')}
            <input type="text" name="nameEn" value={form.nameEn} onChange={handleChange} placeholder={t('Opcjonalnie', 'Optional')} />
          </label>
          <label>
            {t('Kategoria', 'Category')}
            <select name="category" value={form.category} onChange={handleChange} required>
              <option value="">{t('Wybierz...', 'Select...')}</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </label>
          <label>
            {t('Cena', 'Price')} ({currencySymbol})
            <input type="number" name="price" value={form.price} min={0} step={0.01} onChange={handleChange} required />
          </label>
        </div>

        <label>
          {t('Opis (PL)', 'Description (PL)')}
          <textarea name="description" value={form.description} onChange={handleChange} rows={3} />
        </label>
        <label>
          {t('Opis (EN)', 'Description (EN)')}
          <textarea name="descriptionEn" value={form.descriptionEn} onChange={handleChange} rows={3} placeholder={t('Opcjonalnie', 'Optional')} />
        </label>

        <div className="manager-form-row">
          <label>
            {t('Obrazek (JPG)', 'Image (JPG)')}
            <input type="file" accept=".jpg,.jpeg" onChange={handleFileChange} ref={fileInputRef} />
          </label>
          {preview && (
            <img src={preview} alt={t('Podgląd', 'Preview')} className="manager-img-thumb" style={{ alignSelf: 'flex-end' }} />
          )}
        </div>

        <div className="manager-form-row">
          <button type="submit" disabled={uploading} className="manager-save-btn">
            {editId ? t('Zapisz zmiany', 'Save changes') : t('Dodaj pozycję', 'Add item')}
          </button>
          {editId && (
            <button
              type="button"
              className="manager-cancel-btn"
              onClick={() => {
                setEditId(null);
                setForm({ name: '', description: '', price: 0, imageFile: null, category: '', nameEn: '', descriptionEn: '' });
                setPreview(null);
                const input = fileInputRef.current;
                if (input) {
                  input.value = '';
                }
              }}
            >
              {t('Anuluj edycję', 'Cancel edit')}
            </button>
          )}
        </div>
      </form>

      {feedback && (
        <div className={`manager-feedback ${feedback.type}`}>
          {feedback.message}
        </div>
      )}

      {error && <div className="manager-error">{error}</div>}

      <div className="manager-summary-grid">
        <div className="manager-summary-card">
          <span className="manager-summary-title">{t('Pozycje w menu', 'Items in menu')}</span>
          <strong>{summary.total}</strong>
        </div>
        <div className="manager-summary-card">
          <span className="manager-summary-title">{t('Aktywne', 'Active')}</span>
          <strong>{summary.active}</strong>
        </div>
        <div className="manager-summary-card">
          <span className="manager-summary-title">{t('Nieaktywne', 'Inactive')}</span>
          <strong>{summary.inactive}</strong>
        </div>
        <div className="manager-summary-card">
          <span className="manager-summary-title">{t('Ostatnie pobranie', 'Last fetched')}</span>
          <strong>{lastLoaded ? new Date(lastLoaded).toLocaleTimeString(language === 'pl' ? 'pl-PL' : 'en-US', { hour: '2-digit', minute: '2-digit' }) : '---'}</strong>
        </div>
      </div>

      <div className="manager-list">
        <table className="manager-table">
          <thead>
            <tr>
              <th>
                {t('Nazwa', 'Name')}
                <br />
                <input
                  type="text"
                  placeholder={t('Filtruj...', 'Filter...')}
                  value={filter.name}
                  onChange={e => setFilter(f => ({ ...f, name: e.target.value }))}
                  style={{ width: '90%', fontSize: '0.95rem', marginTop: 4 }}
                />
              </th>
              <th>
                {t('Kategoria', 'Category')}
                <br />
                <select
                  value={filter.category}
                  onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}
                  style={{ width: '90%', fontSize: '0.95rem', marginTop: 4 }}
                >
                  <option value="">{t('Wszystkie', 'All')}</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </th>
              <th>
                {t('Cena', 'Price')}
                <br />
                <input
                  type="number"
                  placeholder={t('Filtruj...', 'Filter...')}
                  value={filter.price}
                  onChange={e => setFilter(f => ({ ...f, price: e.target.value }))}
                  style={{ width: '90%', fontSize: '0.95rem', marginTop: 4 }}
                />
              </th>
              <th>
                {t('Opis', 'Description')}
                <br />
                <input
                  type="text"
                  placeholder={t('Filtruj...', 'Filter...')}
                  value={filter.description}
                  onChange={e => setFilter(f => ({ ...f, description: e.target.value }))}
                  style={{ width: '90%', fontSize: '0.95rem', marginTop: 4 }}
                />
              </th>
              <th>{t('Obrazek', 'Image')}</th>
              <th>{t('Akcje', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center' }}>{t('Ładowanie...', 'Loading...')}</td></tr>
            ) : filteredMenu.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center' }}>{t('Brak pozycji', 'No items')}</td></tr>
            ) : (
              filteredMenu.map(item => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{categoryLabel(item.category)}</td>
                  <td>{item.price.toFixed(2)} {currencySymbol}</td>
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
                    <button className="manager-edit-btn" onClick={() => handleEdit(item)}>{t('Edytuj', 'Edit')}</button>
                    <button className="manager-delete-btn" onClick={() => handleDelete(item.id!)}>
                      {t('Usuń', 'Delete')}
                    </button>
                    <button
                      className={item.active ? 'manager-toggle-btn manager-toggle-on' : 'manager-toggle-btn manager-toggle-off'}
                      onClick={() => toggleActive(item)}
                    >
                      {item.active ? t('Dezaktywuj', 'Deactivate') : t('Aktywuj', 'Activate')}
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
