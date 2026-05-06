'use client';

import { useEffect, useState } from 'react';
import { Ticket, Plus, Pencil, Trash2, X, Filter, Camera, Upload, Check } from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { CustomDatePicker } from '@/components/ui/CustomDatePicker';
import { Voucher } from '@/types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { useLanguage } from '@/context/LanguageContext';
import { Portal } from '@/components/ui/Portal';
import { z } from 'zod';
import Image from 'next/image';
import { compressImage } from '@/lib/imageUtils';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

function VoucherModal({ voucher, onClose, onSave }: { voucher?: Voucher | null; onClose: () => void; onSave: () => void }) {
  const { t } = useLanguage();

  const voucherSchema = z.object({
    code: z.string().min(3, 'Voucher code is too short (min 3)'),
    value: z.number().positive('Value must be greater than 0'),
    valid_from: z.string().min(1, 'Valid from is required'),
    valid_until: z.string().min(1, 'Valid until is required'),
    category: z.string(),
    type: z.string(),
  });

  const [form, setForm] = useState({
    code: voucher?.code || '',
    description: voucher?.description || '',
    category: voucher?.category || 'direct',
    type: voucher?.type || 'percentage',
    value: voucher?.value || 0,
    min_order_amount: voucher?.min_order_amount || 0,
    max_discount: voucher?.max_discount || '',
    min_order_count: voucher?.min_order_count || 0,
    usage_limit: voucher?.usage_limit || '',
    user_limit: voucher?.user_limit || 1,
    start_time: voucher?.start_time || '',
    end_time: voucher?.end_time || '',
    area_name: voucher?.area_name || '',
    target_tier: voucher?.target_tier || '',
    is_cashback: voucher?.is_cashback ?? false,
    valid_from: voucher?.valid_from ? voucher.valid_from.split('T')[0] : new Date().toISOString().split('T')[0],
    valid_until: voucher?.valid_until ? voucher.valid_until.split('T')[0] : '',
    is_active: voucher?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(voucher?.image_url || '');

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

    const validation = voucherSchema.safeParse({
      ...form,
      value: parseFloat(String(form.value))
    });

    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setSaving(true);
    try {
      const url = voucher ? `/api/vouchers/${voucher.id}` : '/api/vouchers';
      const method = voucher ? 'PUT' : 'POST';
      let finalImageUrl = voucher?.image_url || '';

      if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('bucket', 'vouchers');
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
          value: parseFloat(String(form.value)),
          min_order_amount: parseFloat(String(form.min_order_amount)),
          max_discount: form.max_discount ? parseFloat(String(form.max_discount)) : null,
          min_order_count: parseInt(String(form.min_order_count)),
          usage_limit: form.usage_limit ? parseInt(String(form.usage_limit)) : null,
          user_limit: parseInt(String(form.user_limit)),
          start_time: form.start_time || null,
          end_time: form.end_time || null,
          valid_from: new Date(form.valid_from).toISOString(),
          valid_until: new Date(form.valid_until).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(voucher ? t('voucher_updated') : t('voucher_created'));
      onSave();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col h-full max-h-[90vh]">
          <div className="modal-header">
            <h2 className="text-xl font-bold text-text-primary">{voucher ? t('edit_voucher') : t('add_voucher')}</h2>
            <button type="button" onClick={onClose}><X className="w-5 h-5 text-text-primary/40" /></button>
          </div>

          <div className="modal-body space-y-4">
            {/* Image Upload */}
            <div className="flex justify-center mb-6">
              <div className="relative group">
                <div className="w-32 h-32 rounded-2xl bg-primary/5 border-2 border-dashed border-ui-border flex items-center justify-center overflow-hidden transition-all group-hover:border-primary/50">
                  {imagePreview ? (
                    <Image src={imagePreview} alt="Preview" fill unoptimized={true} className="object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  ) : (
                    <div className="text-center p-4">
                      <Upload className="w-8 h-8 mx-auto text-text-primary/20 mb-2" />
                      <p className="text-[10px] text-text-primary/40 uppercase font-bold tracking-wider">Voucher Image</p>
                    </div>
                  )}
                </div>
                <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-transform">
                  <Camera className="w-5 h-5" />
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-text-primary/60 mb-2 block">{t('voucher_code')} *</label>
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="input-field font-mono" placeholder="PROMO20" />
              </div>
              <div>
                <CustomSelect 
                  label={`${t('category')} *`}
                  value={form.category} 
                  onChange={(val) => setForm({ ...form, category: val as any })}
                  options={[
                    { value: 'direct', label: t('direct') },
                    { value: 'new_user', label: t('new_user') },
                    { value: 'repeat_order', label: t('repeat_order') },
                    { value: 'happy_hour', label: t('happy_hour') },
                    { value: 'location', label: t('location') },
                    { value: 'tier', label: t('user_tier') },
                    { value: 'cashback', label: t('cashback') }
                  ]}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <CustomSelect 
                  label={`${t('type')} *`}
                  value={form.type} 
                  onChange={(val) => setForm({ ...form, type: val as any })}
                  options={[
                    { value: 'percentage', label: `${t('percentage')} (%)` },
                    { value: 'fixed', label: `${t('fixed')} (IDR)` }
                  ]}
                />
              </div>
              <div 
                className="flex items-center gap-2 py-3 px-3 rounded-2xl bg-muted/20 border border-ui-border cursor-pointer hover:border-primary/50 transition-all group mt-6"
                onClick={() => setForm({ ...form, is_cashback: !form.is_cashback })}
              >
                <div className={clsx(
                  "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-300 flex-shrink-0",
                  form.is_cashback 
                    ? "bg-primary border-primary shadow-[0_0_15px_rgba(37,99,235,0.4)]" 
                    : "border-ui-border bg-transparent group-hover:border-primary/30"
                )}>
                  {form.is_cashback && <Check className="w-3 h-3 text-white animate-in zoom-in duration-200" />}
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-text-primary transition-colors group-hover:text-primary whitespace-nowrap">{t('cashback_to_wallet')}</p>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm text-text-primary/60 mb-2 block">{t('description')}</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input-field" placeholder={t('description')} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-text-primary/60 mb-2 block">{t('value')} * ({form.type === 'percentage' ? '%' : 'IDR'})</label>
                <input type="number" value={form.value} min={0} max={form.type === 'percentage' ? 100 : undefined}
                  onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) })}
                  className="input-field" />
              </div>
              <div>
                <label className="text-sm text-text-primary/60 mb-2 block">{t('min_order')} (IDR)</label>
                <input type="number" value={form.min_order_amount} min={0}
                  onChange={(e) => setForm({ ...form, min_order_amount: parseFloat(e.target.value) })}
                  className="input-field" />
              </div>
            </div>

            {form.category === 'happy_hour' && (
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-primary/5 border border-border">
                <div>
                  <label className="text-sm text-text-primary/60 mb-2 block">{t('start_time')}</label>
                  <input type="time" value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    className="input-field" />
                </div>
                <div>
                  <label className="text-sm text-text-primary/60 mb-2 block">{t('end_time')}</label>
                  <input type="time" value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    className="input-field" />
                </div>
              </div>
            )}

            {form.category === 'repeat_order' && (
              <div>
                <label className="text-sm text-text-primary/60 mb-2 block">{t('target_order_number')}</label>
                <input type="number" value={form.min_order_count} min={0}
                  onChange={(e) => setForm({ ...form, min_order_count: parseInt(e.target.value) })}
                  className="input-field" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-text-primary/60 mb-2 block">{t('max_discount')} (IDR)</label>
                <input type="number" value={form.max_discount} min={0}
                  onChange={(e) => setForm({ ...form, max_discount: e.target.value })}
                  className="input-field" placeholder={t('no_cap')} />
              </div>
              <div>
                <label className="text-sm text-text-primary/60 mb-2 block">{t('usage_limit')}</label>
                <input type="number" value={form.usage_limit} min={1}
                  onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
                  className="input-field" placeholder={t('unlimited')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-text-primary/60 mb-2 block">{t('user_limit')}</label>
                <input type="number" value={form.user_limit} min={1}
                  onChange={(e) => setForm({ ...form, user_limit: parseInt(e.target.value) })}
                  className="input-field" />
              </div>
              <div>
                <label className="text-sm text-text-primary/60 mb-2 block">{t('area_name')}</label>
                <input value={form.area_name}
                  onChange={(e) => setForm({ ...form, area_name: e.target.value })}
                  className="input-field" placeholder="e.g. Jakarta Selatan" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <CustomDatePicker 
                label={`${t('valid_from')} *`}
                value={form.valid_from}
                onChange={(val) => setForm({ ...form, valid_from: val })}
              />
              <CustomDatePicker 
                label={`${t('valid_until')} *`}
                value={form.valid_until}
                onChange={(val) => setForm({ ...form, valid_until: val })}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">{t('cancel')}</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? t('saving') : voucher ? t('edit_voucher') : t('add_voucher')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function VouchersPage() {
  const { t } = useLanguage();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; voucher: Voucher | null }>({ open: false, voucher: null });
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void } | null>(null);

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vouchers');
      const data = await res.json();
      setVouchers(data.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVouchers(); }, []);

  const handleDeleteVoucher = (id: string) => {
    setConfirmModal({
      open: true,
      title: 'Hapus Voucher?',
      message: 'Voucher yang dihapus tidak bisa digunakan kembali oleh pelanggan. Yakin ingin menghapus?',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/vouchers/${id}`, { method: 'DELETE' });
          if (res.ok) {
            toast.success('Voucher berhasil dihapus');
            fetchVouchers();
          } else {
            toast.error('Gagal menghapus voucher');
          }
        } catch (err) {
          console.error(err);
          toast.error('Gagal menghapus voucher');
        }
        setConfirmModal(null);
      }
    });
  };

  const isExpired = (date: string) => new Date(date) < new Date();

  return (
    <div className="page-container">
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t('vouchers')}</h1>
          <p className="text-text-muted text-sm mt-1">{vouchers.length} {t('total_vouchers')}</p>
        </div>
        <button onClick={() => setModal({ open: true, voucher: null })}
          className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" />
          {t('add_voucher')}
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={`skeleton-${i}`} className="glass-card h-48 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vouchers.map((voucher) => {
            const expired = isExpired(voucher.valid_until);
            return (
              <div key={voucher.id} className={clsx(
                'glass-card p-5 flex flex-col justify-between h-full relative',
                expired && 'opacity-60'
              )}>
                {/* Actions - absolute top right */}
                <div className="absolute top-4 right-4 flex items-center gap-1">
                  <button onClick={() => setModal({ open: true, voucher })}
                    className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors text-text-primary/40 hover:text-text-primary">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDeleteVoucher(voucher.id)}
                    className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors text-text-primary/40 hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  {/* Icon & Code */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gold-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                      {voucher.image_url ? (
                        <Image 
                          src={voucher.image_url} 
                          alt="" 
                          fill
                          unoptimized={true}
                          className="object-cover" 
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      ) : (
                        <Ticket className="w-5 h-5 text-gold-400" />
                      )}
                    </div>
                    <span className="font-mono font-bold text-text-primary text-lg tracking-wider truncate pr-16">{voucher.code}</span>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className={clsx('badge text-[10px] py-0.5', voucher.is_active && !expired ? 'badge-online' : 'badge-offline')}>
                      {expired ? t('expired') : voucher.is_active ? t('active') : t('inactive')}
                    </span>
                    <span className="badge text-[10px] py-0.5 bg-gold-500/10 text-gold-400 border border-gold-500/20 capitalize">
                      {voucher.category.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Value display */}
                  <div className="mb-4">
                    <div className="text-2xl font-bold text-primary-400">
                      {voucher.type === 'percentage' ? `${voucher.value}% OFF` : `Rp ${voucher.value.toLocaleString('id-ID')}`}
                    </div>
                    {voucher.is_cashback && <span className="text-[10px] text-primary-300/60 uppercase tracking-widest font-semibold">{t('cashback_voucher')}</span>}
                  </div>

                  {voucher.description && <p className="text-text-primary/50 text-xs line-clamp-2 mb-4">{voucher.description}</p>}
                </div>

                {/* Bottom details */}
                <div className="pt-4 border-t border-ui-border space-y-2">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-text-primary/30">{t('min_order')}:</span>
                    <span className="text-text-primary/60">Rp {voucher.min_order_amount.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-text-primary/30">{t('validity')}:</span>
                    <span className="text-text-primary/60">{format(new Date(voucher.valid_from), 'dd MMM')} - {format(new Date(voucher.valid_until), 'dd MMM')}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-text-primary/30">{t('used')}:</span>
                    <span className="text-text-primary/60">{voucher.usage_count} / {voucher.usage_limit || '∞'}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {vouchers.length === 0 && (
            <div className="glass-card p-12 text-center col-span-1 md:col-span-2 lg:col-span-3">
              <Ticket className="w-12 h-12 mx-auto mb-3 text-text-primary/10" />
              <p className="text-text-primary/30">{t('no_vouchers_yet')}. {t('create_first_voucher')}</p>
            </div>
          )}
        </div>
      )}

      {modal.open && (
        <Portal>
          <VoucherModal
            voucher={modal.voucher}
            onClose={() => setModal({ open: false, voucher: null })}
            onSave={() => { setModal({ open: false, voucher: null }); fetchVouchers(); }}
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
