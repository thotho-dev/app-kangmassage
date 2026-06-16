'use client';

import { useEffect, useState } from 'react';
import { Image, Plus, Pencil, Trash2, X, Upload, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { useLanguage } from '@/context/LanguageContext';
import { Portal } from '@/components/ui/Portal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { compressImage } from '@/lib/imageUtils';

function BannerModal({ banner, onClose, onSave }: { banner?: any | null; onClose: () => void; onSave: () => void }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    title: banner?.title || '',
    subtitle: banner?.subtitle || '',
    badge: banner?.badge || '',
    image_url: banner?.image_url || '',
    link: banner?.link || '',
    sort_order: banner?.sort_order || 0,
    is_active: banner?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(banner?.image_url || '');

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressed = await compressImage(file);
      if (compressed) {
        setImageFile(compressed);
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(compressed);
      }
    }
  };

  const handleDeleteImage = async () => {
    const url = form.image_url;
    if (!url) {
      setImagePreview('');
      setImageFile(null);
      return;
    }
    // Extract fileName from Supabase Storage URL
    const parts = url.split('/');
    const fileName = parts[parts.length - 1].split('?')[0];
    try {
      await fetch('/api/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucket: 'logos', fileName }),
      });
    } catch { /* file may not exist, ignore */ }
    setImagePreview('');
    setImageFile(null);
    setForm((prev) => ({ ...prev, image_url: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) {
      toast.error('Title is required');
      return;
    }
    setSaving(true);
    try {
      const url = banner ? `/api/banners/${banner.id}` : '/api/banners';
      const method = banner ? 'PUT' : 'POST';
      let finalImageUrl = form.image_url;

      if (imageFile) {
        const fd = new FormData();
        fd.append('file', imageFile);
        fd.append('bucket', 'logos');
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
        const uploadJson = await uploadRes.json();
        if (uploadJson.url) finalImageUrl = uploadJson.url;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, image_url: finalImageUrl, sort_order: parseInt(String(form.sort_order)) || 0 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(banner ? 'Banner updated' : 'Banner created');
      onSave();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onPointerDown={onClose}>
      <div className="modal-content !max-w-2xl" onPointerDown={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col h-full max-h-[90vh]">
          <div className="modal-header">
            <h2 className="text-xl font-bold text-text-primary">{banner ? 'Edit Banner' : 'Add Banner'}</h2>
            <button type="button" onClick={onClose}><X className="w-5 h-5 text-text-primary/40" /></button>
          </div>

          <div className="modal-body space-y-4">
            <div className="flex justify-center mb-6">
              <div className="relative group">
                <div className="w-48 h-28 rounded-2xl bg-primary/5 border-2 border-dashed border-ui-border flex items-center justify-center overflow-hidden transition-all group-hover:border-primary/50">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-4">
                      <Image className="w-10 h-10 mx-auto text-text-primary/20 mb-2" />
                      <p className="text-[10px] text-text-primary/40 uppercase font-bold tracking-wider">Banner Image</p>
                    </div>
                  )}
                </div>
                {imagePreview ? (
                  <button type="button" onClick={handleDeleteImage}
                    className="absolute -bottom-2 -right-2 w-10 h-10 bg-red-500 text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-red-600 transition-transform hover:scale-110">
                    <Trash2 className="w-5 h-5" />
                  </button>
                ) : (
                  <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-transform">
                    <Camera className="w-5 h-5" />
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                  </label>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm text-text-primary/60 mb-2 block">Title *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="input-field" placeholder="Banner title" />
              </div>
              <div className="col-span-2">
                <label className="text-sm text-text-primary/60 mb-2 block">Subtitle</label>
                <input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                  className="input-field" placeholder="Banner subtitle" />
              </div>
              <div>
                <label className="text-sm text-text-primary/60 mb-2 block">Badge</label>
                <input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })}
                  className="input-field" placeholder="HOT PROMO" />
              </div>
              <div>
                <label className="text-sm text-text-primary/60 mb-2 block">Sort Order</label>
                <input type="number" value={form.sort_order} min={0}
                  onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                  className="input-field" />
              </div>
              <div className="col-span-2">
                <label className="text-sm text-text-primary/60 mb-2 block">Link (optional)</label>
                <input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })}
                  className="input-field" placeholder="/services" />
              </div>
            </div>

            <div className="flex items-center gap-2 py-3 px-3 rounded-2xl bg-muted/20 border border-ui-border cursor-pointer hover:border-primary/50 transition-all group"
              onClick={() => setForm({ ...form, is_active: !form.is_active })}>
              <div className={clsx(
                "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-300 flex-shrink-0",
                form.is_active ? "bg-primary border-primary" : "border-ui-border"
              )}>
                {form.is_active && <div className="w-2 h-2 bg-white rounded-sm" />}
              </div>
              <p className="text-[11px] font-bold text-text-primary">Active</p>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : banner ? 'Update Banner' : 'Add Banner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BannersPage() {
  const { t } = useLanguage();
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; banner: any | null }>({ open: false, banner: null });
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void } | null>(null);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/banners');
      const data = await res.json();
      setBanners(data.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBanners(); }, []);

  const handleDelete = (id: string) => {
    setConfirmModal({
      open: true,
      title: 'Delete Banner?',
      message: 'This banner will be removed permanently. Continue?',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/banners/${id}`, { method: 'DELETE' });
          if (res.ok) {
            toast.success('Banner deleted');
            fetchBanners();
          } else {
            toast.error('Failed to delete banner');
          }
        } catch {
          toast.error('Failed to delete banner');
        }
        setConfirmModal(null);
      }
    });
  };

  return (
    <div className="page-container">
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Banners</h1>
          <p className="text-text-muted text-sm mt-1">{banners.length} banners</p>
        </div>
        <button onClick={() => setModal({ open: true, banner: null })}
          className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" />
          Add Banner
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card h-48 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {banners.map((banner) => (
            <div key={banner.id} className={clsx('glass-card p-5 relative', !banner.is_active && 'opacity-50')}>
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <button onClick={() => setModal({ open: true, banner })}
                  className="p-2 rounded-xl bg-orange-500 text-white shadow-sm hover:bg-orange-600 transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(banner.id)}
                  className="p-2 rounded-xl bg-red-500 text-white shadow-sm hover:bg-red-600 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="w-full h-32 rounded-xl overflow-hidden mb-4 bg-muted/10">
                {banner.image_url ? (
                  <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="w-8 h-8 text-text-primary/20" />
                  </div>
                )}
              </div>

              <h3 className="font-bold text-text-primary text-base mb-1">{banner.title}</h3>
              {banner.subtitle && <p className="text-text-muted text-xs mb-2">{banner.subtitle}</p>}
              <div className="flex flex-wrap gap-2">
                <span className={clsx('badge text-[10px] py-0.5', banner.is_active ? 'badge-online' : 'badge-offline')}>
                  {banner.is_active ? 'Active' : 'Inactive'}
                </span>
                {banner.badge && (
                  <span className="badge text-[10px] py-0.5 bg-primary/10 text-primary border border-primary/20">{banner.badge}</span>
                )}
                {banner.sort_order > 0 && (
                  <span className="badge text-[10px] py-0.5 bg-gold-500/10 text-gold-400 border border-gold-500/20">
                    Order {banner.sort_order}
                  </span>
                )}
              </div>
            </div>
          ))}

          {banners.length === 0 && (
            <div className="glass-card p-12 text-center col-span-1 md:col-span-2 lg:col-span-3">
              <Image className="w-12 h-12 mx-auto mb-3 text-text-primary/10" />
              <p className="text-text-primary/30">No banners yet. Create your first banner.</p>
            </div>
          )}
        </div>
      )}

      {modal.open && (
        <Portal>
          <BannerModal
            banner={modal.banner}
            onClose={() => setModal({ open: false, banner: null })}
            onSave={() => { setModal({ open: false, banner: null }); fetchBanners(); }}
          />
        </Portal>
      )}
      {confirmModal && (
        <ConfirmModal
          isOpen={confirmModal.open}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}
