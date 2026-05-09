'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, RefreshCw, UserCheck, Star, MapPin, Plus, Filter, X, Loader2, Check, Trash2, Camera, Upload, Eye, EyeOff, Pencil, Power } from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { Therapist } from '@/types';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { useLanguage } from '@/context/LanguageContext';
import { Portal } from '@/components/ui/Portal';
import { z } from 'zod';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { compressImage } from '@/lib/imageUtils';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

const STATUS_OPTIONS = ['', 'online', 'offline', 'busy'];

export default function TherapistsPage() {
  const { t } = useLanguage();
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('online');
  const [activeFilter, setActiveFilter] = useState('true');
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modal, setModal] = useState<{ open: boolean; therapist: Therapist | null }>({ open: false, therapist: null });
  const [viewModal, setViewModal] = useState<{ open: boolean; therapist: Therapist | null }>({ open: false, therapist: null });
  const [imageModal, setImageModal] = useState<{ open: boolean; url: string }>({ open: false, url: '' });
  const [submitting, setSubmitting] = useState(false);
  const limit = 10;

  const fetchTherapists = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit), search });
      if (status) params.set('status', status);
      if (activeFilter) params.set('is_active', activeFilter);
      const res = await fetch(`/api/therapists?${params}`);
      const data = await res.json();
      setTherapists(data.data || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }, [page, search, status, activeFilter]);
  
  const handleAddTherapist = async (formData: any) => {
    setSubmitting(true);
    try {
      const isEditing = !!modal.therapist;
      const url = isEditing ? `/api/therapists/${modal.therapist?.id}` : '/api/therapists';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      const data = await res.json();

      if (res.ok) {
        toast.success(isEditing ? 'Data terapis berhasil diperbarui!' : 'Terapis baru berhasil ditambahkan!');
        setModal({ open: false, therapist: null });
        fetchTherapists();
      } else {
        toast.error(data.error || 'Maaf, data gagal disimpan. Silakan coba lagi.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Waduh, sepertinya ada masalah koneksi. Coba lagi ya.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTherapist = (id: string) => {
    setConfirmModal({
      open: true,
      title: 'Hapus Terapis?',
      message: 'Data terapis yang dihapus tidak bisa dikembalikan. Apakah Anda yakin?',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/therapists/${id}`, { method: 'DELETE' });
          if (res.ok) {
            toast.success('Terapis berhasil dihapus');
            fetchTherapists();
          }
        } catch (err) {
          console.error(err);
          toast.error('Gagal menghapus terapis');
        }
        setConfirmModal(null);
      }
    });
  };

  useEffect(() => { fetchTherapists(); }, [fetchTherapists]);

  return (
    <div className="page-container">
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t('therapists')}</h1>
          <p className="text-text-muted text-sm mt-1">{total.toLocaleString()} {t('total_therapists')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchTherapists} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw className="w-4 h-4" />
            {t('refresh')}
          </button>
          <button onClick={() => setModal({ open: true, therapist: null })} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            {t('add_therapist')}
          </button>
        </div>
      </div>

      {modal.open && (
        <Portal>
          <TherapistModal 
            onClose={() => setModal({ open: false, therapist: null })}
            onSubmit={handleAddTherapist}
            submitting={submitting}
            initialData={modal.therapist}
          />
        </Portal>
      )}

      {viewModal.open && viewModal.therapist && (
        <Portal>
          <ViewDetailModal 
            therapist={viewModal.therapist}
            onClose={() => setViewModal({ open: false, therapist: null })}
            onRefresh={fetchTherapists}
            onImageClick={(url) => setImageModal({ open: true, url })}
            onEdit={(t) => setModal({ open: true, therapist: t })}
            onDelete={handleDeleteTherapist}
          />
        </Portal>
      )}

      {imageModal.open && (
        <Portal>
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 p-4" onClick={() => setImageModal({ open: false, url: '' })}>
            <button className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors">
              <X className="w-8 h-8" />
            </button>
              <Image 
                src={imageModal.url} 
                alt="Therapist Detail" 
                width={1200}
                height={800}
                className="max-w-full max-h-full rounded-lg shadow-2xl animate-in zoom-in-95 duration-200 object-contain" 
              />
          </div>
        </Portal>
      )}

      {/* Filters */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted opacity-50" />
          <input
            type="text"
            placeholder={t('search')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-field pl-10"
          />
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-40">
            <CustomSelect
              value={status}
              onChange={(val) => { setStatus(val); setPage(1); }}
              options={[
                { value: '', label: t('all') },
                { value: 'online', label: t('online') },
                { value: 'offline', label: t('offline') },
                { value: 'busy', label: t('busy') }
              ]}
            />
          </div>
          <div className="relative w-full sm:w-40">
            <CustomSelect
              value={activeFilter}
              onChange={(val) => { setActiveFilter(val); setPage(1); }}
              options={[
                { value: '', label: t('all') },
                { value: 'true', label: t('active') },
                { value: 'false', label: t('inactive') }
              ]}
            />
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: t('online'), value: therapists.filter(t => t.status === 'online').length, color: 'text-green-400' },
          { label: t('offline'), value: therapists.filter(t => t.status === 'offline').length, color: 'text-text-muted' },
          { label: t('busy'), value: therapists.filter(t => t.status === 'busy').length, color: 'text-orange-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-card p-4 text-center">
            <p className={clsx('text-2xl font-bold', color)}>{value}</p>
            <p className="text-xs text-text-muted mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('therapist')}</th>
                <th>{t('phone')}</th>
                <th>{t('rating')}</th>
                <th>{t('orders')}</th>
                <th>{t('status')}</th>
                <th>{t('tier')}</th>
                <th>{t('verified')}</th>
                <th>{t('registered')}</th>
                <th className="text-center">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 8 }).map((_, j) => (
                    <td key={j}><div className="h-4 bg-white/10 rounded animate-pulse w-20" /></td>
                  ))}</tr>
                ))
              ) : therapists.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-text-muted opacity-50">
                  <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  {t('no_therapists')}
                </td></tr>
              ) : (
                therapists.map((therapist) => (
                  <tr key={therapist.id} className={clsx(!therapist.is_active && "opacity-50 bg-black/20 grayscale-[0.3]")}>
                    <td>
                      <div className="flex items-center gap-3">
                        {therapist.avatar_url ? (
                          <div className="relative w-9 h-9 flex-shrink-0 cursor-zoom-in hover:scale-105 transition-transform" onClick={() => setImageModal({ open: true, url: therapist.avatar_url! })}>
                            <Image 
                              src={therapist.avatar_url} 
                              alt={therapist.full_name}
                              fill
                              unoptimized={true}
                              className="rounded-xl object-cover" 
                              onError={(e) => {
                                // Fallback to initial if image fails
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold">
                            {therapist.full_name[0]}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-text-primary">{therapist.full_name}</p>
                          <div className="text-xs text-text-muted">
                            {therapist.gender === 'male' ? t('male') : t('female')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td><div className="text-sm">{therapist.phone}</div></td>
                    <td>
                      <div className="flex items-center gap-1 text-yellow-500 font-bold">
                        <Star className="w-3 h-3 fill-current" />
                        {(therapist.rating || 0).toFixed(1)}
                      </div>
                    </td>
                    <td>{therapist.total_orders || 0}</td>
                     <td>
                        <div className="flex justify-start">
                          <span className={clsx('badge text-[10px] min-w-[70px] justify-center font-bold uppercase', 
                            (therapist.status?.toLowerCase() === 'online') ? 'badge-online' : 'bg-slate-700 text-white border-slate-600'
                          )}>
                            {therapist.status?.toLowerCase() === 'online' ? t('online') : (therapist.status || 'offline')}
                          </span>
                        </div>
                      </td>
                     <td>
                       <span className={clsx('badge text-[10px] font-bold uppercase', 
                         therapist.tier === 'diamond' ? 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' :
                         therapist.tier === 'gold' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                         therapist.tier === 'silver' ? 'bg-slate-300/10 text-slate-300 border-slate-300/20' :
                         'bg-orange-700/10 text-orange-700 border-orange-700/20'
                       )}>
                         {t(therapist.tier || 'bronze')}
                       </span>
                     </td>
                    <td>
                      <div className="flex justify-start">
                        <span className={clsx('badge text-[10px] text-center', therapist.is_verified ? 'badge-online' : 'badge-cancelled')}>
                          {therapist.is_verified ? `✓ ${t('verified')}` : `✕ ${t('not_verified')}`}
                        </span>
                      </div>
                    </td>
                    <td className="text-text-muted whitespace-nowrap">{format(new Date(therapist.created_at), 'dd MMM yyyy')}</td>
                    <td className="text-center w-28">
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          onClick={() => setViewModal({ open: true, therapist })}
                          className="p-2 hover:bg-info/10 rounded-xl text-info transition-all duration-200 hover:scale-110"
                          title="Detail"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteTherapist(therapist.id)}
                          className="p-2 hover:bg-danger/10 rounded-xl text-danger transition-all duration-200 hover:scale-110"
                          title={t('delete')}
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>

        {total > limit && (
          <div className="flex items-center justify-between px-4 py-4 border-t border-ui-border">
            <p className="text-sm text-text-muted">
              {t('showing')} {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} {t('of')} {total}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="btn-secondary text-sm py-2 px-3 disabled:opacity-30">{t('previous')}</button>
              <span className="text-sm text-text-muted">{t('page')} {page}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page * limit >= total}
                className="btn-secondary text-sm py-2 px-3 disabled:opacity-30">{t('next')}</button>
            </div>
          </div>
        )}
      </div>
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

function TherapistModal({ onClose, onSubmit, submitting, initialData }: { 
  onClose: () => void; 
  onSubmit: (data: any) => void; 
  submitting: boolean;
  initialData?: Therapist | null;
}) {
  const { t } = useLanguage();

  const therapistSchema = z.object({
    full_name: z.string().min(3, 'Nama terapis harus diisi lengkap (minimal 3 huruf)'),
    phone: z.string().min(10, 'Nomor telepon sepertinya kurang lengkap, minimal 10 angka'),
    email: z.string().email('Format email yang Anda masukkan belum benar'),
    gender: z.enum(['male', 'female']),
    device_id: z.string().optional(),
    password: initialData ? z.string().optional() : z.string().min(6, 'Kata sandi minimal 6 karakter supaya aman'),
    specializations: z.array(z.string()).min(1, 'Jangan lupa pilih minimal satu keahlian terapis'),
    bio: z.string().optional(),
  });

  const [form, setForm] = useState({
    full_name: initialData?.full_name || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    gender: initialData?.gender || 'female',
    device_id: initialData?.device_id || '',
    skills: initialData?.specializations || [] as string[],
    description: initialData?.bio || '',
    is_verified: initialData?.is_verified ?? true,
    password: initialData ? '' : 'KM12345',
  });

  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>(initialData?.avatar_url || '');
  const [uploading, setUploading] = useState(false);
  const [skillsOptions, setSkillsOptions] = useState<string[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    try {
      const res = await fetch('/api/skills');
      const json = await res.json();
      if (json.data && json.data.length > 0) {
        setSkillsOptions(json.data.map((s: any) => s.name));
      } else {
        // Default fallback if table is empty or missing
        setSkillsOptions([
          'Body Massage', 'Reflexy', 'Bekam', 'Pijat Ibu Hamil', 'Pijat Anak', 
          'Totok Wajah', 'Shiatsu', 'Lulur', 'Ear Candle', 'Kerik/Kop', 
          'Deep Tissue', 'Facial'
        ]);
      }
    } catch (err) {
      console.error('Failed to fetch skills:', err);
    } finally {
      setLoadingSkills(false);
    }
  };

  const toggleSkill = (skill: string) => {
    setForm(prev => ({
      ...prev,
      skills: prev.skills.includes(skill) 
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };



  const handleToggleAll = () => {
    if (form.skills.length === skillsOptions.length) {
      setForm(prev => ({ ...prev, skills: [] }));
    } else {
      setForm(prev => ({ ...prev, skills: [...skillsOptions] }));
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressed = await compressImage(file);
      if (compressed) {
        setAvatar(compressed);
        const reader = new FileReader();
        reader.onloadend = () => {
          setAvatarPreview(reader.result as string);
        };
        reader.readAsDataURL(compressed);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate with Zod
    const validation = therapistSchema.safeParse({
      ...form,
      specializations: form.skills,
      bio: form.description
    });

    if (!validation.success) {
      const errorMsg = validation.error.errors[0].message;
      toast.error(errorMsg);
      return;
    }

    setUploading(true);

    try {
      let finalAvatarUrl = initialData?.avatar_url || '';
      
      // 1. Upload photo if exists
      if (avatar) {
        const formData = new FormData();
        formData.append('file', avatar);
        formData.append('bucket', 'therapists');
        
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        const uploadJson = await uploadRes.json();
        console.log('Upload response:', uploadJson);
        if (uploadJson.url) {
          finalAvatarUrl = uploadJson.url;
        } else if (uploadJson.error) {
          alert(`Gagal upload foto: ${uploadJson.error}`);
        }
      }

      // 2. Submit form
      const submissionData = {
        full_name: form.full_name,
        phone: form.phone,
        email: form.email,
        gender: form.gender,
        device_id: form.device_id,
        avatar_url: finalAvatarUrl,
        specializations: form.skills,
        bio: form.description,
        is_verified: form.is_verified,
        password: form.password,
        tier: initialData?.tier || 'bronze',
        status: initialData?.status || 'online',
        rating: initialData?.rating || 5.0,
        commission_rate: 80.0
      };
      onSubmit(submissionData);
    } catch (err) {
      console.error('Submit error:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col h-full max-h-[90vh]">
          <div className="modal-header">
            <h2 className="text-xl font-bold text-text-primary">
              {initialData ? t('edit_therapist') : t('add_therapist')}
            </h2>
            <button type="button" onClick={onClose} className="text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
          </div>

          <div className="modal-body space-y-5">
            {/* Photo Upload */}
            <div className="flex flex-col items-center py-2">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full bg-muted border-2 border-dashed border-ui-border flex items-center justify-center overflow-hidden transition-all group-hover:border-primary">
                  {avatarPreview ? (
                    <Image 
                      src={avatarPreview} 
                      alt="Preview" 
                      width={96}
                      height={96}
                      unoptimized={true}
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <Camera className="w-8 h-8 text-text-muted group-hover:text-primary transition-colors" />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-transform">
                  <Upload className="w-4 h-4 text-white" />
                  <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                </label>
              </div>
              <p className="text-[10px] text-text-muted mt-2 uppercase tracking-widest font-bold">Foto Profil Therapist</p>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-text-secondary mb-2 block">{t('full_name')} *</label>
                <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })}
                  className="input-field" placeholder="e.g. Siti Aminah" />
              </div>
              <div>
                <label className="text-sm font-medium text-text-secondary mb-2 block">Id Perangkat (Device ID)</label>
                <input value={form.device_id} onChange={e => setForm({ ...form, device_id: e.target.value })}
                  className="input-field" placeholder="e.g. DEVICE-123" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-text-secondary mb-2 block">{t('phone_number')} *</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="input-field" placeholder="0812..." />
              </div>
              <div className="flex flex-col">
                <CustomSelect 
                  label={`${t('gender')} *`}
                  value={form.gender}
                  onChange={val => setForm({ ...form, gender: val })}
                  options={[
                    { value: 'female', label: t('female') },
                    { value: 'male', label: t('male') }
                  ]}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-text-secondary mb-2 block">{t('email_address')} *</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="input-field" placeholder="email@example.com" />
            </div>

            {!initialData && (
              <div>
                <label className="text-sm font-medium text-text-secondary mb-2 block">{t('password')} *</label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    value={form.password} 
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    className="input-field pr-12" 
                    placeholder="KM12345" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-text-muted hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Skills Section */}
            <div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-text-secondary">Keahlian Terapis *</label>
                {!loadingSkills && skillsOptions.length > 0 && (
                  <button 
                    type="button" 
                    onClick={handleToggleAll}
                    className="text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors"
                  >
                    {form.skills.length === skillsOptions.length ? 'Uncheck All' : 'Check All'}
                  </button>
                )}
              </div>
              {loadingSkills ? (
                <div className="flex items-center gap-2 text-text-muted text-xs animate-pulse bg-ui-border/5 p-4 rounded-2xl border border-dashed border-ui-border">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>Memuat daftar keahlian...</span>
                </div>
              ) : skillsOptions.length === 0 ? (
                <div className="text-center py-6 bg-ui-border/5 rounded-2xl border border-dashed border-ui-border">
                  <p className="text-xs text-text-muted">Belum ada data keahlian. Silakan tambahkan di menu Layanan.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {skillsOptions.map(skill => (
                    <label key={skill} className={clsx(
                      "flex items-center gap-2 p-2.5 rounded-xl border transition-all duration-200 cursor-pointer",
                      form.skills.includes(skill) 
                        ? "bg-primary/10 border-primary text-primary shadow-sm" 
                        : "bg-muted/30 border-ui-border text-text-secondary hover:border-primary/30"
                    )}>
                      <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={form.skills.includes(skill)}
                        onChange={() => toggleSkill(skill)}
                      />
                      <div className={clsx(
                        "w-4 h-4 rounded flex items-center justify-center border transition-colors flex-shrink-0",
                        form.skills.includes(skill) ? "bg-primary border-primary" : "border-text-muted/30"
                      )}>
                        {form.skills.includes(skill) && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-[11px] font-medium leading-tight truncate pr-1">{skill}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>



            <div>
              <label className="text-sm font-medium text-text-secondary mb-2 block">{t('brief_description')}</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="input-field h-24 resize-none" placeholder="Experience, specialties, etc." />
            </div>
            <div 
              className="flex items-center gap-3 py-3 px-4 rounded-2xl bg-muted/20 border border-ui-border cursor-pointer hover:border-primary/50 transition-all group"
              onClick={() => setForm({ ...form, is_verified: !form.is_verified })}
            >
              <div className={clsx(
                "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300",
                form.is_verified 
                  ? "bg-primary border-primary shadow-[0_0_15px_rgba(37,99,235,0.4)]" 
                  : "border-ui-border bg-transparent group-hover:border-primary/30"
              )}>
                {form.is_verified && <Check className="w-4 h-4 text-white animate-in zoom-in duration-200" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-text-primary transition-colors group-hover:text-primary">{t('verify_therapist')}</p>
              </div>
              <input 
                type="checkbox" 
                className="hidden" 
                checked={form.is_verified} 
                onChange={() => {}} 
              />
            </div>

          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">{t('cancel')}</button>
            <button type="submit" disabled={submitting || uploading} className="btn-primary flex-1">
              {submitting || uploading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{uploading ? 'Uploading Photo...' : t('saving')}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  {initialData ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>{initialData ? t('update') : t('add_therapist')}</span>
                </div>
              )}
            </button>
          </div>
        </form>
      </div>
      {/* Local Confirm Modal for TherapistModal internal actions */}
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

function ViewDetailModal({ therapist, onClose, onRefresh, onImageClick, onEdit, onDelete }: { 
  therapist: Therapist; 
  onClose: () => void; 
  onRefresh: () => void;
  onImageClick: (url: string) => void;
  onEdit: (therapist: Therapist) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  const handleToggleActive = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/therapists/${therapist.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !therapist.is_active })
      });
      if (res.ok) {
        onRefresh();
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="text-xl font-bold text-text-primary">{t('therapist_detail')}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
        </div>
        <div className="modal-body space-y-6">
          <div className="flex items-center gap-4">
            <div 
              className={clsx(
                "relative w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden border border-ui-border",
                therapist.avatar_url && "cursor-zoom-in hover:border-primary transition-colors"
              )}
              onClick={() => therapist.avatar_url && onImageClick(therapist.avatar_url)}
            >
              {therapist.avatar_url ? (
                <Image 
                  src={therapist.avatar_url} 
                  alt={therapist.full_name} 
                  fill 
                  unoptimized={true}
                  className="object-cover" 
                />
              ) : (
                <span className="text-2xl font-bold text-primary">{therapist.full_name[0]}</span>
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-text-primary">{therapist.full_name}</h3>
              <p className="text-sm text-text-muted">{therapist.phone}</p>
              <div className="flex items-center gap-2 mt-1">
                 <span className={clsx('badge badge-xs min-w-[64px] justify-center font-bold uppercase', 
                   (therapist.status?.toLowerCase() === 'online') ? 'badge-online' : 'bg-slate-700 text-white border-slate-600'
                 )}>
                   {therapist.status?.toLowerCase() === 'online' ? t('online') : (therapist.status || 'offline')}
                 </span>
                {therapist.is_verified && (
                  <span className="badge badge-xs badge-completed">✓ {t('verified')}</span>
                )}
              </div>
            </div>
            {/* Wallet Balance Text Only */}
            <div className="text-right">
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{t('wallet_balance')}</p>
              <p className="text-lg font-black text-primary">
                Rp {(therapist.wallet_balance || 0).toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-card p-4">
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">{t('email_address')}</p>
              <p className="text-sm text-text-secondary truncate">{therapist.email || '-'}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">{t('gender')}</p>
              <p className="text-sm text-text-secondary">
                {therapist.gender === 'male' ? t('male') : t('female')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card p-4">
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">{t('device_id_label')}</p>
              <p className="text-sm font-mono text-text-secondary">{therapist.device_id || '-'}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">{t('registered_date')}</p>
              <p className="text-sm text-text-secondary">
                {format(new Date(therapist.created_at), 'dd MMM yyyy')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card p-4">
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">{t('rating')}</p>
              <div className="flex items-center gap-1.5 text-yellow-500 font-bold">
                <Star className="w-4 h-4 fill-current" />
                {(therapist.rating || 0).toFixed(1)}
              </div>
            </div>
            <div className="glass-card p-4">
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">{t('total_orders')}</p>
              <p className="text-lg font-bold text-text-primary">{therapist.total_orders || 0}</p>
            </div>
          </div>

          <div className="glass-card p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">{t('therapist_level')}</p>
              <span className={clsx('px-4 py-1.5 rounded-xl text-xs font-bold uppercase border', 
                therapist.tier === 'diamond' ? 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.2)]' :
                therapist.tier === 'gold' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.2)]' :
                therapist.tier === 'silver' ? 'bg-slate-300/10 text-slate-300 border-slate-300/20' :
                'bg-orange-700/10 text-orange-700 border-orange-700/20'
              )}>
                {therapist.tier?.toUpperCase() || 'BRONZE'}
              </span>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">{t('account_status')}</p>
              <div className="flex items-center gap-2 justify-end">
                <div className={clsx("w-2 h-2 rounded-full", therapist.is_active ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-red-500")} />
                <span className="text-xs font-medium">{therapist.is_active ? t('active') : t('inactive')}</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-bold text-text-primary mb-2">{t('skills_specialization')}</p>
            <div className="flex flex-wrap gap-2">
              {therapist.specializations?.map(skill => (
                <span key={skill} className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary rounded-full text-[10px] font-medium">
                  {skill}
                </span>
              )) || <p className="text-xs text-text-muted italic">{t('no_skills')}</p>}
            </div>
          </div>

          {therapist.bio && (
            <div>
              <p className="text-sm font-bold text-text-primary mb-2">{t('short_bio')}</p>
              <p className="text-xs text-text-secondary leading-relaxed bg-muted/30 p-3 rounded-xl border border-ui-border">
                {therapist.bio}
              </p>
            </div>
          )}
        </div>
        <div className="modal-footer flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3 w-full">
            {/* Status Toggle */}
            <button
              onClick={handleToggleActive}
              disabled={loading}
              className={clsx(
                "flex items-center justify-center py-4 rounded-xl font-bold transition-all border shadow-sm",
                therapist.is_active 
                  ? "bg-danger/10 text-danger border-danger/20 hover:bg-danger/20" 
                  : "bg-success/10 text-success border-success/20 hover:bg-success/20"
              )}
              title={therapist.is_active ? t('inactive') : t('active')}
            >
              {loading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Power className="w-3 h-3" />
              )}
            </button>

            {/* Hapus */}
            <button 
              onClick={() => { onClose(); onDelete(therapist.id); }}
              className="flex items-center justify-center py-4 bg-danger/10 text-danger border border-danger/20 rounded-xl font-bold hover:bg-danger/20 transition-all shadow-sm"
              title={t('delete')}
            >
              <Trash2 className="w-3 h-3" />
            </button>

            {/* Ubah */}
            <button 
              onClick={() => { onClose(); onEdit(therapist); }}
              className="flex items-center justify-center py-4 bg-primary/10 text-primary border border-primary/20 rounded-xl font-bold hover:bg-primary/20 transition-all shadow-sm"
              title={t('edit')}
            >
              <Pencil className="w-3 h-3" />
            </button>
          </div>

          <button 
            onClick={onClose} 
            className="btn-primary w-full py-4 text-sm font-bold shadow-lg shadow-primary/20"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}
