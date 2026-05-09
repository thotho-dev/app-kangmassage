'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Tag, Clock, Banknote, X, Upload, Camera, Check, RefreshCw, Settings, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { Service } from '@/types';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { useLanguage } from '@/context/LanguageContext';
import { Portal } from '@/components/ui/Portal';
import { z } from 'zod';
import { compressImage } from '@/lib/imageUtils';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { CustomSelect } from '@/components/ui/CustomSelect';

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



  const formatInputRupiah = (value: number | string) => {
    const number = typeof value === 'string' ? parseInt(value.replace(/\D/g, '')) : value;
    if (isNaN(number)) return '0';
    return number.toLocaleString('id-ID');
  };

  const parseInputRupiah = (value: string) => {
    const number = parseInt(value.replace(/\D/g, ''));
    return isNaN(number) ? 0 : number;
  };

  const [form, setForm] = useState({
    name: service?.name || '',
    description: service?.description || '',
    category_slug: service?.category_slug || [] as string[],
    duration_min: service?.duration_min || (service?.price_type === 'treatment' ? 1 : 60),
    base_price: service?.base_price || 0,
    duration_options: service?.duration_options || [{ duration: service?.duration_min || (service?.price_type === 'treatment' ? 1 : 60), price: service?.base_price || 0 }],
    image_url: service?.image_url || '',
    is_active: service?.is_active ?? true,
    price_type: service?.price_type || 'duration',
  });
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(service?.image_url || '');
  const [skills, setSkills] = useState<any[]>([]);

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const res = await fetch('/api/skills');
        const json = await res.json();
        setSkills(json.data || []);
        
        // No default for multi-select, or use empty array
        if (!service) {
          setForm(prev => ({ ...prev, category_slug: [] }));
        }
      } catch (err) {
        console.error('Failed to fetch skills:', err);
      }
    };
    fetchSkills();
  }, [service]);

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

    const serviceSchema = z.object({
      name: z.string().min(3, 'Nama layanan minimal 3 karakter'),
      duration_min: z.number().min(
        form.price_type === 'duration' ? 15 : 1, 
        form.price_type === 'duration' ? 'Durasi minimal 15 menit' : 'Minimal harus 1 sesi/unit'
      ),
      base_price: z.number().min(0, 'Harga tidak boleh negatif'),
    });

    const validation = serviceSchema.safeParse({
      ...form,
      duration_min: parseInt(String(form.duration_options[0]?.duration || form.duration_min)),
      base_price: parseFloat(String(form.duration_options[0]?.price || form.base_price))
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
        body: JSON.stringify({ 
          ...form, 
          image_url: finalImageUrl,
          // Sync base values with first option for compatibility
          duration_min: form.duration_options[0]?.duration || form.duration_min,
          base_price: form.duration_options[0]?.price || form.base_price
        }),
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
              <label className="text-sm font-medium text-text-secondary mb-2 block">{t('service_name')} *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-field" placeholder="e.g. Body Massage + Reflexology" />
            </div>

            <div>
              <label className="text-sm font-medium text-text-secondary mb-3 block">Keahlian yang Dibutuhkan*</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-ui-border/5 p-3 rounded-2xl border border-ui-border/50">
                {skills.map((skill) => (
                  <label key={skill.id} className={clsx(
                    "flex items-center gap-2 p-2 rounded-xl border transition-all duration-200 cursor-pointer",
                    form.category_slug.includes(skill.name)
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-card border-ui-border text-text-secondary hover:border-primary/30"
                  )}>
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={form.category_slug.includes(skill.name)}
                      onChange={() => {
                        const isSelected = form.category_slug.includes(skill.name);
                        const newCats = isSelected
                          ? form.category_slug.filter(c => c !== skill.name)
                          : [...form.category_slug, skill.name];
                        
                        // Detect types automatically
                        const selectedSkills = skills.filter(s => newCats.includes(s.name));
                        const hasDuration = selectedSkills.some(s => s.price_type === 'duration');
                        const hasTreatment = selectedSkills.some(s => s.price_type === 'treatment');

                        let newPriceType: 'duration' | 'treatment' = 'duration';
                        if (hasDuration) {
                          newPriceType = 'duration'; // Mixed or purely duration
                        } else if (hasTreatment) {
                          newPriceType = 'treatment'; // Purely treatment
                        }

                        const isSwitching = form.price_type !== newPriceType;
                        let newOpts = form.duration_options;
                        if (isSwitching) {
                          newOpts = form.duration_options.map(o => {
                            if (newPriceType === 'treatment' && (o.duration === 60 || o.duration === 90)) return { ...o, duration: 1 };
                            if (newPriceType === 'duration' && o.duration === 1) return { ...o, duration: 60 };
                            return o;
                          });
                        }

                        setForm({ ...form, category_slug: newCats, price_type: newPriceType, duration_options: newOpts });
                      }}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-bold truncate leading-tight">{skill.name}</span>
                      <span className={clsx(
                        "text-[8px] uppercase tracking-tighter font-bold",
                        skill.price_type === 'treatment' ? "text-orange-500/80" : "text-blue-500/80"
                      )}>
                        {skill.price_type === 'treatment' ? 'Treatment' : 'Durasi'}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-[10px] text-text-muted mt-2">Pilih lebih dari satu untuk layanan kombinasi/paket.</p>
            </div>

            <div>
              <label className="text-sm text-text-primary/60 mb-2 block">{t('brief_description')}</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input-field h-24 resize-none" placeholder="Service description..." />
            </div>



            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-text-secondary">
                  {form.price_type === 'duration' ? 'Pilihan Durasi & Harga' : 'Pilihan Paket / Treatment'} *
                </label>
                <button 
                  type="button" 
                  onClick={() => setForm({ 
                    ...form, 
                    duration_options: [...form.duration_options, { duration: form.price_type === 'duration' ? 60 : 1, price: 0 }] 
                  })}
                  className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 bg-primary/5 px-3 py-1.5 rounded-lg transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Opsi
                </button>
              </div>
              
              <div className="space-y-3 bg-ui-border/10 p-3 rounded-2xl border border-ui-border/50">
                {form.duration_options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="relative flex-1">
                      {form.price_type === 'duration' ? (
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted opacity-50" />
                      ) : (
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted opacity-50" />
                      )}
                      <input 
                        type="number" 
                        value={opt.duration} 
                        min={1}
                        step={form.price_type === 'duration' ? 15 : 1}
                        onChange={(e) => {
                          const newOpts = [...form.duration_options];
                          newOpts[idx] = { ...newOpts[idx], duration: parseInt(e.target.value) || 0 };
                          setForm({ ...form, duration_options: newOpts });
                        }}
                        className="input-field pl-10" 
                        placeholder={form.price_type === 'duration' ? "Menit" : "Sesi/Unit"}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-text-muted opacity-40 uppercase">
                        {form.price_type === 'duration' ? 'Min' : 'Sesi'}
                      </div>
                    </div>
                    <div className="relative flex-[1.5]">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center pointer-events-none">
                        <span className="text-[10px] font-bold text-text-muted opacity-60">Rp</span>
                      </div>
                      <input 
                        type="text" 
                        value={formatInputRupiah(opt.price)} 
                        onChange={(e) => {
                          const newOpts = [...form.duration_options];
                          newOpts[idx] = { ...newOpts[idx], price: parseInputRupiah(e.target.value) };
                          setForm({ ...form, duration_options: newOpts });
                        }}
                        className="input-field pl-10" 
                        placeholder="0"
                      />
                    </div>
                    {form.duration_options.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => {
                          const newOpts = form.duration_options.filter((_, i) => i !== idx);
                          setForm({ ...form, duration_options: newOpts });
                        }}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                        title="Hapus Opsi"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    )}
                  </div>
                ))}
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

function SkillsModal({ onClose, onUpdate }: { onClose: () => void; onUpdate: () => void }) {
  const { t } = useLanguage();
  const [skills, setSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSkill, setNewSkill] = useState('');
  const [newSkillType, setNewSkillType] = useState<'duration' | 'treatment'>('duration');
  const [submitting, setSubmitting] = useState(false);
  const [editingSkill, setEditingSkill] = useState<any | null>(null);

  const fetchSkills = async () => {
    try {
      const res = await fetch('/api/skills');
      const json = await res.json();
      setSkills(json.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSkills(); }, []);

  const handleAdd = async () => {
    if (!newSkill.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSkill.trim(), price_type: newSkillType })
      });
      if (res.ok) {
        toast.success('Skill baru ditambahkan');
        setNewSkill('');
        fetchSkills();
        onUpdate();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingSkill || !editingSkill.name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/skills', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: editingSkill.id, 
          name: editingSkill.name.trim(), 
          price_type: editingSkill.price_type 
        })
      });
      if (res.ok) {
        toast.success('Skill diperbarui');
        setEditingSkill(null);
        fetchSkills();
        onUpdate();
      }
    } catch (err) {
      toast.error('Gagal memperbarui');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Hapus skill "${name}"?`)) return;
    try {
      const res = await fetch(`/api/skills?name=${encodeURIComponent(name)}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Skill dihapus');
        fetchSkills();
        onUpdate();
      }
    } catch (err) {
      toast.error('Gagal menghapus');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
        <div className="modal-header border-b border-ui-border/50 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">{t('manage_service_types')}</h2>
              <p className="text-xs text-text-muted">{t('service_type_desc')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-ui-border/10 rounded-lg transition-colors text-text-muted hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="modal-body py-6 space-y-6">
          {/* Form Tambah */}
          {!editingSkill && (
            <div className="bg-primary/5 p-4 rounded-2xl border border-primary/20 space-y-4 animate-in fade-in duration-300">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-primary/70">{t('add_service_type')}</h3>
              <div className="space-y-3">
                <input 
                  value={newSkill}
                  onChange={e => setNewSkill(e.target.value)}
                  className="input-field text-sm"
                  placeholder="Contoh: Shiatsu, Bekam, dll"
                />
                <div className="flex items-center gap-2">
                  <div className="flex p-1 bg-ui-border/20 rounded-xl flex-1 border border-ui-border/50">
                    <button 
                      type="button"
                      onClick={() => setNewSkillType('duration')}
                      className={clsx(
                        "flex-1 py-2 rounded-lg text-[10px] font-bold transition-all", 
                        newSkillType === 'duration' ? "bg-primary text-white shadow-sm" : "text-text-muted hover:text-text-primary"
                      )}
                    >BERBASIS DURASI</button>
                    <button 
                      type="button"
                      onClick={() => setNewSkillType('treatment')}
                      className={clsx(
                        "flex-1 py-2 rounded-lg text-[10px] font-bold transition-all", 
                        newSkillType === 'treatment' ? "bg-primary text-white shadow-sm" : "text-text-muted hover:text-text-primary"
                      )}
                    >PER TREATMENT</button>
                  </div>
                  <button 
                    type="button"
                    onClick={handleAdd}
                    disabled={submitting || !newSkill.trim()}
                    className="btn-primary p-3 rounded-xl disabled:opacity-50 shadow-lg shadow-primary/20"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* List Keahlian */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-muted px-1">
              {editingSkill ? t('edit_service_type') : t('list_service_types')}
            </h3>
            <div className="max-h-80 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-10 text-text-muted gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-xs">Memuat data...</span>
                </div>
              ) : skills.length === 0 ? (
                <div className="text-center py-10 bg-ui-border/5 rounded-2xl border border-dashed border-ui-border">
                  <p className="text-xs text-text-muted">Belum ada keahlian yang ditambahkan</p>
                </div>
              ) : skills.map(skill => {
                const isEditing = editingSkill?.id === skill.id;
                
                if (isEditing) {
                  return (
                    <div key={skill.id} className="p-4 rounded-2xl bg-primary/5 border-2 border-primary animate-in zoom-in-95 duration-200 space-y-3">
                      <input 
                        value={editingSkill.name}
                        onChange={e => setEditingSkill({ ...editingSkill, name: e.target.value })}
                        className="input-field text-sm"
                        placeholder="Nama skill..."
                      />
                      <div className="flex items-center gap-2">
                        <div className="flex p-1 bg-white rounded-xl flex-1 border border-ui-border">
                          <button 
                            type="button"
                            onClick={() => setEditingSkill({ ...editingSkill, price_type: 'duration' })}
                            className={clsx(
                              "flex-1 py-1.5 rounded-lg text-[9px] font-bold transition-all", 
                              editingSkill.price_type === 'duration' ? "bg-primary text-white" : "text-text-muted"
                            )}
                          >DURASI</button>
                          <button 
                            type="button"
                            onClick={() => setEditingSkill({ ...editingSkill, price_type: 'treatment' })}
                            className={clsx(
                              "flex-1 py-1.5 rounded-lg text-[9px] font-bold transition-all", 
                              editingSkill.price_type === 'treatment' ? "bg-primary text-white" : "text-text-muted"
                            )}
                          >TREATMENT</button>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => setEditingSkill(null)} className="p-2 text-text-muted hover:bg-ui-border/20 rounded-lg">
                            <X className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={handleUpdate} 
                            disabled={submitting}
                            className="p-2 bg-primary text-white rounded-lg shadow-md shadow-primary/20"
                          >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={skill.id} className={clsx(
                    "flex items-center justify-between p-3 rounded-xl bg-card border border-ui-border hover:border-primary/30 transition-all group",
                    editingSkill && editingSkill.id !== skill.id && "opacity-40 grayscale-[0.5]"
                  )}>
                    <div className="flex items-center gap-3">
                      <div className={clsx(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        skill.price_type === 'treatment' ? "bg-orange-500/10 text-orange-500" : "bg-blue-500/10 text-blue-500"
                      )}>
                        {skill.price_type === 'treatment' ? <Tag className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{skill.name}</p>
                        <p className={clsx(
                          "text-[9px] font-bold uppercase tracking-wider",
                          skill.price_type === 'treatment' ? "text-orange-500/70" : "text-blue-500/70"
                        )}>{skill.price_type === 'treatment' ? 'Treatment' : 'Durasi (Min)'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => setEditingSkill(skill)} 
                        disabled={!!editingSkill}
                        className="p-2 text-text-muted hover:text-primary hover:bg-primary/5 rounded-lg"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(skill.name)} 
                        disabled={!!editingSkill}
                        className="p-2 text-text-muted hover:text-danger hover:bg-danger/5 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="modal-footer border-t border-ui-border/50 pt-4">
          <button onClick={onClose} disabled={!!editingSkill} className="btn-primary w-full py-3 rounded-xl shadow-lg shadow-primary/10 disabled:opacity-50">Selesai</button>
        </div>
      </div>
    </div>
  );
}

export default function ServicesPage() {
  const { t } = useLanguage();
  const [services, setServices] = useState<Service[]>([]);
  const [allSkills, setAllSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; service?: Service | null }>({ open: false });
  const [skillsModal, setSkillsModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void } | null>(null);

  const fetchSkills = async () => {
    try {
      const res = await fetch('/api/skills');
      const json = await res.json();
      setAllSkills(json.data || []);
    } catch (err) {}
  };
  useEffect(() => { fetchSkills(); }, []);

  const getServiceUnit = (service: Service) => {
    const serviceSkills = allSkills.filter(s => service.category_slug?.includes(s.name));
    const hasDuration = serviceSkills.some(s => s.price_type === 'duration');
    const hasTreatment = serviceSkills.some(s => s.price_type === 'treatment');

    if (hasDuration && hasTreatment) {
      return `min + 1 Treatment`;
    }
    return service.price_type === 'treatment' ? 'Treatment' : 'min';
  };

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
        <div className="flex items-center gap-3">
          <button onClick={() => setSkillsModal(true)}
            className="btn-secondary flex items-center gap-2 text-sm border-primary/20 hover:border-primary/50 text-primary">
            <Settings className="w-4 h-4" />
            {t('manage_service_types')}
          </button>
          <button onClick={() => setModal({ open: true, service: null })}
            className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            {t('add_service')}
          </button>
        </div>
      </div>

      {skillsModal && (
        <Portal>
          <SkillsModal onClose={() => setSkillsModal(false)} onUpdate={fetchServices} />
        </Portal>
      )}

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
                  <span className={clsx(
                    "px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase shadow-xl",
                    service.is_active 
                      ? "bg-green-600 text-white border border-green-400/50" 
                      : "bg-red-600 text-white border border-red-400/50"
                  )}>
                    {service.is_active ? t('active') : t('inactive')}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-text-primary text-base truncate">{service.name}</h3>
                    {service.description && (
                      <p className="text-text-muted text-[11px] mt-1 line-clamp-1">{service.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button onClick={() => setModal({ open: true, service })}
                      className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors text-text-muted hover:text-primary">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDeleteService(service.id)}
                      className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors text-text-muted hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Price Options List */}
                <div className="mt-4 space-y-2 pt-3 border-t border-ui-border/50">
                  {service.duration_options?.map((opt: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between group/row">
                      <div className="flex items-center gap-1.5 text-text-muted text-[10px] uppercase font-extrabold tracking-wider">
                        {getServiceUnit(service).includes('+') ? (
                          <RefreshCw className="w-3 h-3 text-orange-500" />
                        ) : service.price_type === 'treatment' ? (
                          <Tag className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        <span>{opt.duration} {getServiceUnit(service)}</span>
                      </div>
                      <span className="text-primary font-bold text-xs bg-primary/5 px-2 py-0.5 rounded-lg border border-primary/10">
                        Rp {opt.price.toLocaleString('id-ID')}
                      </span>
                    </div>
                  ))}
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
