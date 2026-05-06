'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Tag, Clock, DollarSign, X, Upload, Camera } from 'lucide-react';
import { Service } from '@/types';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { useLanguage } from '@/context/LanguageContext';
import { Portal } from '@/components/ui/Portal';
import { z } from 'zod';
import { compressImage } from '@/lib/imageUtils';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

function ServiceModal({
  service,
  onClose,
  onSave,
}: {
  service?: Service | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const { t } = useLanguage();

  const serviceSchema = z.object({
    name: z.string().min(3, 'Service name is too short (min 3)'),
    duration_min: z.number().min(15, 'Duration must be at least 15 minutes'),
    base_price: z.number().min(0, 'Price cannot be negative'),
  });

  const [form, setForm] = useState({
    name: service?.name || '',
    description: service?.description || '',
    duration_min: service?.duration_min || 60,
    base_price: service?.base_price || 0,
    image_url: service?.image_url || '',
    is_active: service?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(service?.image_url || '');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = serviceSchema.safeParse({
      ...form,
      duration_min: parseInt(String(form.duration_min)),
      base_price: parseFloat(String(form.base_price))
    });

    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setSaving(true);
    try {
      const url = service ? `/api/services/${service.id}` : '/api/services';
      const method = service ? 'PUT' : 'POST';
      
      let finalImageUrl = service?.image_url || '';

      if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('bucket', 'services');
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        const uploadJson = await uploadRes.json();
        if (uploadJson.url) finalImageUrl = uploadJson.url;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, image_url: finalImageUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(service ? t('service_updated') : t('service_created'));
      onSave();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col h-full max-h-[90vh]">
          <div className="modal-header">
            <h2 className="text-xl font-bold text-text-primary">{service ? t('edit_service') : t('add_service')}</h2>
            <button type="button" onClick={onClose} className="text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
          </div>

          <div className="modal-body space-y-4">
            <div>
              <label className="text-sm text-text-primary/60 mb-2 block">{t('service_name')} *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-field" placeholder="e.g. Swedish Massage" />
            </div>

            <div>
              <label className="text-sm text-text-primary/60 mb-2 block">{t('brief_description')}</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input-field h-24 resize-none" placeholder="Service description..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-text-primary/60 mb-2 block">{t('duration_min')} *</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted opacity-50" />
                  <input type="number" value={form.duration_min} min={15} step={15}
                    onChange={(e) => setForm({ ...form, duration_min: parseInt(e.target.value) })}
                    className="input-field pl-10" />
                </div>
              </div>
              <div>
                <label className="text-sm text-text-primary/60 mb-2 block">{t('price_idr')} *</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted opacity-50" />
                  <input type="number" value={form.base_price} min={0}
                    onChange={(e) => setForm({ ...form, base_price: parseFloat(e.target.value) })}
                    className="input-field pl-10" />
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm text-text-primary/60 mb-4 block">Foto Layanan</label>
              <div className="flex justify-center">
                <div className="relative group">
                  <div className="w-full min-w-[280px] h-40 rounded-2xl bg-primary/5 border-2 border-dashed border-ui-border flex items-center justify-center overflow-hidden transition-all group-hover:border-primary/50">
                    {imagePreview ? (
                      <Image src={imagePreview} alt="Preview" fill unoptimized={true} className="object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    ) : (
                      <div className="text-center p-4">
                        <Upload className="w-8 h-8 mx-auto text-text-primary/20 mb-2" />
                        <p className="text-[10px] text-text-primary/40 uppercase font-bold tracking-wider">Upload Foto</p>
                      </div>
                    )}
                  </div>
                  <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-transform z-10">
                    <Camera className="w-5 h-5" />
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setForm({ ...form, is_active: !form.is_active })}
                className={`w-12 h-6 rounded-full transition-colors ${form.is_active ? 'bg-primary-600' : 'bg-dark-600'}`}>
                <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-sm text-text-primary/60">{t('is_active_label')} {form.is_active ? t('active') : t('inactive')}</span>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">{t('cancel')}</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? t('saving') : service ? t('update_service') : t('add_service')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ServicesPage() {
  const { t } = useLanguage();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; service?: Service | null }>({ open: false });
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void } | null>(null);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/services?active=false');
      const data = await res.json();
      setServices(data.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchServices(); }, []);

  const handleDeleteService = (id: string) => {
    setConfirmModal({
      open: true,
      title: 'Hapus Layanan?',
      message: 'Layanan yang dihapus tidak bisa dikembalikan. Yakin ingin menghapusnya?',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/services/${id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Gagal menghapus');
          toast.success('Layanan berhasil dihapus');
          fetchServices();
        } catch (err) {
          console.error(err);
          toast.error('Maaf, ada kendala saat menghapus layanan');
        }
        setConfirmModal(null);
      }
    });
  };

  return (
    <div className="page-container">
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t('services')}</h1>
          <p className="text-text-muted text-sm mt-1">{services.length} {t('services_configured')}</p>
        </div>
        <button onClick={() => setModal({ open: true, service: null })}
          className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" />
          {t('add_service')}
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card h-64 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <div key={service.id} className="glass-card overflow-hidden group hover:border-primary-500/30 transition-all duration-300">
              {/* Image */}
              <div className="relative h-40 bg-muted">
                {service.image_url ? (
                  <Image 
                    src={service.image_url} 
                    alt={service.name}
                    fill
                    unoptimized={true}
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                    className="object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Tag className="w-12 h-12 text-text-primary/10" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                <div className="absolute top-3 right-3">
                  <span className={`badge ${service.is_active ? 'badge-online' : 'badge-offline'} text-xs`}>
                    {service.is_active ? t('active') : t('inactive')}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold text-text-primary text-base">{service.name}</h3>
                {service.description && (
                  <p className="text-text-muted text-xs mt-1 line-clamp-2">{service.description}</p>
                )}
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-text-primary/50 text-xs">
                      <Clock className="w-3.5 h-3.5" />
                      {service.duration_min} min
                    </div>
                    <p className="text-primary-400 font-semibold text-sm">
                      Rp {service.base_price.toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setModal({ open: true, service })}
                      className="p-2 hover:bg-primary/10 rounded-lg transition-colors text-text-muted hover:text-text-primary">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteService(service.id)}
                      className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-text-muted hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Add Card */}
          <button onClick={() => setModal({ open: true, service: null })}
            className="glass-card border-dashed border-2 border-ui-border hover:border-primary/50 h-64 flex flex-col items-center justify-center gap-3 text-text-muted opacity-50 hover:text-primary transition-all duration-300 group">
            <div className="w-12 h-12 rounded-2xl border-2 border-dashed border-ui-border group-hover:border-primary/50 flex items-center justify-center">
              <Plus className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium">{t('add_service')}</span>
          </button>
        </div>
      )}

      {modal.open && (
        <Portal>
          <ServiceModal
            service={modal.service}
            onClose={() => setModal({ open: false })}
            onSave={() => { setModal({ open: false }); fetchServices(); }}
          />
        </Portal>
      )}
      {/* Confirm Modal */}
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
