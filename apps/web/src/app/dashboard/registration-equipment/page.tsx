'use client';

import { useEffect, useState, useRef } from 'react';
import { Plus, Pencil, Trash2, Loader2, GripVertical, Eye, EyeOff, CheckCircle2, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

interface Equipment {
  id: string;
  name: string;
  description: string;
  price: number;
  discount_price: number;
  image_url?: string;
  is_active: boolean;
  is_mandatory?: boolean;
  sort_order: number;
}

const emptyForm = { name: '', description: '', price: 0, discount_price: 0, image_url: '', is_active: true, is_mandatory: false, sort_order: 0 };
const UPLOAD_BUCKET = 'registration-equipment';

export default function RegistrationEquipmentPage() {
  const [items, setItems] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Equipment | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchItems(); }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', UPLOAD_BUCKET);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload gagal');
      setForm(p => ({ ...p, image_url: data.url }));
      toast.success('Gambar berhasil diupload');
    } catch (err: any) {
      toast.error(err.message || 'Gagal upload gambar');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    setForm(p => ({ ...p, image_url: '' }));
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/registration-equipment');
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setItems(json.data || []);
    } catch (err: any) {
      toast.error(err.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Nama perlengkapan wajib diisi');
      return;
    }
    try {
      setSaving(true);
      const url = editingId ? `/api/registration-equipment/${editingId}` : '/api/registration-equipment';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      toast.success(editingId ? 'Perlengkapan diperbarui' : 'Perlengkapan ditambahkan');
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      fetchItems();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: Equipment) => {
    setForm({
      name: item.name,
      description: item.description || '',
      price: item.price,
      discount_price: item.discount_price || 0,
      image_url: item.image_url || '',
      is_active: item.is_active,
      is_mandatory: item.is_mandatory === true,
      sort_order: item.sort_order,
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/registration-equipment/${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      toast.success('Perlengkapan dihapus');
      setDeleteTarget(null);
      fetchItems();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus');
    }
  };

  const handleToggleActive = async (item: Equipment) => {
    try {
      const res = await fetch(`/api/registration-equipment/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !item.is_active }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      fetchItems();
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengubah status');
    }
  };

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Perlengkapan Pendaftaran</h1>
          <p className="text-text-muted text-sm mt-1">Kelola perlengkapan yang bisa dibeli mitra saat pendaftaran.</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }} className="btn-primary text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Tambah Perlengkapan
        </button>
      </div>

      {showForm && (
        <div className="glass-card p-6 mb-6">
          <h3 className="font-semibold text-text-primary mb-4">{editingId ? 'Edit Perlengkapan' : 'Tambah Perlengkapan Baru'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            <div className="md:col-span-2">
              <label className="text-sm text-text-primary/60 mb-2 block">Nama Perlengkapan *</label>
              <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="input-field" placeholder="Seragam, Handuk, dll" />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-text-primary/60 mb-2 block">Deskripsi</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="input-field min-h-[80px]" placeholder="Deskripsi perlengkapan..." rows={2} />
            </div>
            <div>
              <label className="text-sm text-text-primary/60 mb-2 block">Harga Normal (Rp)</label>
              <input type="text" value={form.price.toLocaleString('id-ID')} onChange={e => setForm(p => ({ ...p, price: parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0 }))} className="input-field" placeholder="0" />
            </div>
            <div>
              <label className="text-sm text-text-primary/60 mb-2 block">Harga Diskon (Rp)</label>
              <input type="text" value={form.discount_price.toLocaleString('id-ID')} onChange={e => setForm(p => ({ ...p, discount_price: parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0 }))} className="input-field" placeholder="0" />
              <p className="text-xs text-text-muted/60 mt-1">Biarkan 0 jika tidak ada diskon.</p>
            </div>
            <div>
              <label className="text-sm text-text-primary/60 mb-2 block">Urutan</label>
              <input type="number" min="0" value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} className="input-field" />
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, is_mandatory: !p.is_mandatory }))}
                className="w-12 h-6 rounded-full transition-colors border flex items-center px-0.5 flex-shrink-0"
                style={{backgroundColor: form.is_mandatory ? '#1E1B4B' : '#e5e7eb', borderColor: form.is_mandatory ? '#1E1B4B' : '#d1d5db'}}
              >
                <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_mandatory ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
              <div>
                <span className="text-sm font-medium text-text-primary">Wajib</span>
                <p className="text-xs text-text-muted/60">Mitra WAJIB membeli perlengkapan ini</p>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-text-primary/60 mb-2 block">Gambar</label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl bg-muted border border-ui-border flex items-center justify-center overflow-hidden flex-shrink-0">
                  {form.image_url ? (
                    <img src={form.image_url} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-text-muted/40" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <label className="btn-primary text-sm px-4 py-2 cursor-pointer">
                    {uploadingImage ? (
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Upload'
                    )}
                    <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageUpload} className="hidden" />
                  </label>
                  {form.image_url && (
                    <button onClick={handleRemoveImage} className="px-4 py-2 rounded-xl text-sm font-medium text-danger hover:bg-danger/10 transition-colors border border-transparent hover:border-danger/20">
                      Hapus
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-text-muted/60 mt-2">Format: PNG, JPG, WebP. Maks 2MB.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId ? 'Simpan' : 'Tambah')}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }} className="px-4 py-2 rounded-xl text-sm font-medium text-text-muted hover:bg-muted transition-colors">Batal</button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <GripVertical className="w-8 h-8 text-text-muted/40" />
          </div>
          <p className="text-text-muted">Belum ada perlengkapan. Tambahkan perlengkapan yang bisa dibeli mitra.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <div key={item.id} className={`glass-card p-4 flex items-center gap-4 ${!item.is_active ? 'opacity-60' : ''}`}>
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <GripVertical className="w-5 h-5 text-text-muted/40" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text-primary text-sm truncate">{item.name}</span>
                    {item.is_mandatory && <span className="badge bg-danger/10 text-danger text-[10px] px-1.5 py-0.5 rounded font-medium">Wajib</span>}
                    {!item.is_active && <span className="badge badge-warning text-[10px]">Nonaktif</span>}
                  </div>
                {item.description && <p className="text-xs text-text-muted/60 truncate mt-0.5">{item.description}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                {item.discount_price > 0 ? (
                  <div className="text-right">
                    <p className="text-xs text-text-muted/60 line-through">Rp {item.price.toLocaleString('id-ID')}</p>
                    <p className="font-semibold text-success text-sm">Rp {item.discount_price.toLocaleString('id-ID')}</p>
                  </div>
                ) : (
                  <p className="font-semibold text-text-primary text-sm">Rp {item.price.toLocaleString('id-ID')}</p>
                )}
                <p className="text-[10px] text-text-muted/40">Urutan {item.sort_order}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => handleToggleActive(item)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors" title={item.is_active ? 'Nonaktifkan' : 'Aktifkan'}>
                  {item.is_active ? <Eye className="w-4 h-4 text-text-muted" /> : <EyeOff className="w-4 h-4 text-text-muted" />}
                </button>
                <button onClick={() => handleEdit(item)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
                  <Pencil className="w-4 h-4 text-text-muted" />
                </button>
                <button onClick={() => setDeleteTarget(item)} className="w-8 h-8 rounded-lg hover:bg-danger/10 flex items-center justify-center transition-colors">
                  <Trash2 className="w-4 h-4 text-danger" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Hapus Perlengkapan"
        message={`Yakin ingin menghapus "${deleteTarget?.name}"? Tindakan ini tidak bisa dibatalkan.`}
        type="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
