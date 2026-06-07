'use client';

import { useEffect, useState } from 'react';
import { FlaskConical, Send, RefreshCw, CheckCircle, XCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Portal } from '@/components/ui/Portal';

const ADDRESS_PRESETS = [
  {
    label: '🏠 Rumah (Jaksel)',
    address: 'Jl. Pangeran Antasari No. 12, Cilandak, Jakarta Selatan',
    lat: -6.2889, lng: 106.7967,
  },
  {
    label: '🏢 Kantor (SCBD)',
    address: 'Menara BTPN, SCBD Lot 28, Jakarta Selatan',
    lat: -6.2264, lng: 106.8066,
  },
  {
    label: '🏪 Mall (Pondok Indah)',
    address: 'Pondok Indah Mall, Jl. Metro Pondok Indah, Jakarta Selatan',
    lat: -6.2700, lng: 106.7712,
  },
  {
    label: '🏘️ Perumahan (BSD)',
    address: 'BSD Green Office Park, Sektor 14, Tangerang',
    lat: -6.3029, lng: 106.6528,
  },
  {
    label: '📦 Custom',
    address: '',
    lat: -6.2000, lng: 106.8166,
  },
];

interface UserItem { id: string; full_name: string; phone: string; }
interface TherapistItem { id: string; full_name: string; phone: string; push_token: string | null; status: string; }
interface ServiceItem { id: string; name: string; description: string | null; duration_min: number; base_price: number; category_slug: string[]; price_type: 'duration' | 'treatment'; }

export default function CreateTestOrderModal({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [therapists, setTherapists] = useState<TherapistItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState({ users: true, therapists: true, services: true });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    user_id: '',
    service_id: '',
    therapist_id: '',
    therapist_preference: 'any',
    user_gender: '',
    address: '',
    latitude: -6.2000,
    longitude: 106.8166,
    duration: 60,
    payment_method: 'wallet',
    user_notes: 'Test order dari admin',
  });

  const fetchData = async () => {
    setLoading({ users: true, therapists: true, services: true });
    const [usersRes, therapistsRes, servicesRes] = await Promise.all([
      fetch('/api/users?page=1&limit=200'),
      fetch('/api/therapists?page=1&limit=200&status=online'),
      fetch('/api/services'),
    ]);
    const usersData = await usersRes.json();
    const therapistsData = await therapistsRes.json();
    const servicesData = await servicesRes.json();
    setUsers(usersData.data || []);
    setTherapists(therapistsData.data || []);
    setServices(servicesData.data || servicesData);
    setLoading({ users: false, therapists: false, services: false });
  };

  useEffect(() => { fetchData(); }, []);

  const selectedService = services.find(s => s.id === form.service_id);

  const handleSubmit = async () => {
    if (!form.user_id || !form.service_id || !form.address) {
      toast.error('Harap isi User, Service, dan Alamat');
      return;
    }
    setSubmitting(true);
    setError('');
    setResult(null);
    try {
      const body: any = {
        user_id: form.user_id,
        service_id: form.service_id,
        address: form.address,
        latitude: form.latitude,
        longitude: form.longitude,
        payment_method: form.payment_method,
        user_notes: form.user_notes || undefined,
        therapist_preference: form.therapist_preference,
        user_gender: form.user_gender || undefined,
      };
      if (form.therapist_id) body.therapist_id = form.therapist_id;
      if (selectedService?.price_type === 'duration') body.duration = form.duration;

      const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok) {
        setResult(data.data);
        toast.success('Pesanan berhasil dibuat!');
        onSuccess?.();
      } else {
        setError(data.error || 'Gagal membuat pesanan');
        toast.error(data.error || 'Gagal membuat pesanan');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePresetSelect = (index: number) => {
    const preset = ADDRESS_PRESETS[index];
    if (index === ADDRESS_PRESETS.length - 1) return;
    setForm(f => ({ ...f, address: preset.address, latitude: preset.lat, longitude: preset.lng }));
  };

  return (
    <Portal>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content max-w-xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-primary" />
              Test Order
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted bg-warning/10 text-warning px-3 py-1.5 rounded-full font-medium">
                Mode Testing
              </span>
              <button onClick={onClose} className="text-text-muted hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="modal-body overflow-y-auto space-y-5">
            {!result ? (
              <>
                {/* Refresh */}
                <div className="flex justify-end">
                  <button onClick={fetchData} className="btn-secondary flex items-center gap-2 text-sm">
                    <RefreshCw className="w-4 h-4" />
                    Refresh Data
                  </button>
                </div>

                {/* User */}
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-1.5">
                    Pelanggan <span className="text-danger">*</span>
                  </label>
                  {loading.users ? (
                    <div className="h-10 bg-white/5 rounded-xl animate-pulse" />
                  ) : (
                    <select value={form.user_id} onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))} className="input-field">
                      <option value="">Pilih Pelanggan...</option>
                      {users.map((u: UserItem) => (
                        <option key={u.id} value={u.id}>{u.full_name} — {u.phone}</option>
                      ))}
                    </select>
                  )}
                  {form.user_id && (
                    <p className="text-xs text-emerald-400 mt-1">
                      Pelanggan: {users.find(u => u.id === form.user_id)?.full_name}
                    </p>
                  )}
                </div>

                {/* Therapist */}
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-1.5">
                    Terapis <span className="text-text-muted text-xs">(kosongkan untuk broadcast)</span>
                  </label>
                  {loading.therapists ? (
                    <div className="h-10 bg-white/5 rounded-xl animate-pulse" />
                  ) : (
                    <select value={form.therapist_id} onChange={e => setForm(f => ({ ...f, therapist_id: e.target.value }))} className="input-field">
                      <option value="">Broadcast — Cari terapis otomatis</option>
                      {therapists.map((t: TherapistItem) => (
                        <option key={t.id} value={t.id}>
                          {t.full_name} — {t.phone} {t.push_token ? '📱' : '🚫'}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Service */}
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-1.5">
                    Layanan <span className="text-danger">*</span>
                  </label>
                  {loading.services ? (
                    <div className="h-10 bg-white/5 rounded-xl animate-pulse" />
                  ) : (
                    <select value={form.service_id} onChange={e => setForm(f => ({ ...f, service_id: e.target.value }))} className="input-field">
                      <option value="">Pilih Layanan...</option>
                      {services.map((s: ServiceItem) => (
                        <option key={s.id} value={s.id}>
                          {s.name} — Rp {s.base_price.toLocaleString('id-ID')} ({s.duration_min} menit)
                        </option>
                      ))}
                    </select>
                  )}
                  {selectedService && (
                    <p className="text-xs text-text-muted mt-1">
                      {selectedService.price_type === 'treatment' ? '💊 Treatment' : '⏱️ Durasi'}
                      {' · '} Kategori: {selectedService.category_slug?.join(', ') || '-'}
                    </p>
                  )}
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-2">
                    Alamat <span className="text-danger">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {ADDRESS_PRESETS.map((preset, i) => (
                      <button key={i} type="button" onClick={() => handlePresetSelect(i)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-ui-border bg-white/5 hover:bg-white/10 transition-colors text-text-secondary"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    className="input-field min-h-[80px]" placeholder="Masukkan alamat lengkap..."
                  />
                  <div className="flex gap-3 mt-2">
                    <div className="flex-1">
                      <label className="block text-xs text-text-muted mb-1">Latitude</label>
                      <input type="number" step="0.00001" value={form.latitude}
                        onChange={e => setForm(f => ({ ...f, latitude: parseFloat(e.target.value) || 0 }))}
                        className="input-field text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-text-muted mb-1">Longitude</label>
                      <input type="number" step="0.00001" value={form.longitude}
                        onChange={e => setForm(f => ({ ...f, longitude: parseFloat(e.target.value) || 0 }))}
                        className="input-field text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Method + Gender + Notes */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-text-primary mb-1.5">Metode Pembayaran</label>
                    <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))} className="input-field">
                      <option value="wallet">Wallet (Saldo)</option>
                      <option value="midtrans">Midtrans</option>
                      <option value="cash">Cash</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-text-primary mb-1.5">Preferensi Terapis</label>
                    <select value={form.therapist_preference} onChange={e => setForm(f => ({ ...f, therapist_preference: e.target.value }))} className="input-field">
                      <option value="any">Bebas</option>
                      <option value="male">Pria</option>
                      <option value="female">Wanita</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-text-primary mb-1.5">Gender Customer</label>
                    <select value={form.user_gender} onChange={e => setForm(f => ({ ...f, user_gender: e.target.value }))} className="input-field">
                      <option value="">Tidak tahu</option>
                      <option value="male">Pria</option>
                      <option value="female">Wanita</option>
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-1.5">Catatan (opsional)</label>
                  <input value={form.user_notes} onChange={e => setForm(f => ({ ...f, user_notes: e.target.value }))}
                    className="input-field" placeholder="Test order dari admin"
                  />
                </div>
              </>
            ) : (
              /* Result */
              <div className="border-l-4 border-emerald-500 pl-4 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-lg font-bold text-text-primary">Pesanan Berhasil Dibuat!</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex gap-2">
                    <span className="font-semibold text-text-secondary min-w-[120px]">Order Number:</span>
                    <span className="text-primary-400 font-mono font-bold">{result.order_number}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-semibold text-text-secondary min-w-[120px]">Order ID:</span>
                    <span className="text-text-primary text-xs font-mono">{result.id}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-semibold text-text-secondary min-w-[120px]">Status:</span>
                    <span className="badge badge-pending">pending</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-semibold text-text-secondary min-w-[120px]">Total:</span>
                    <span className="font-bold text-emerald-400">Rp {(result.total_price || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-semibold text-text-secondary min-w-[120px]">Therapist:</span>
                    <span className="text-text-primary">
                      {result.therapist_id
                        ? therapists.find(t => t.id === result.therapist_id)?.full_name || result.therapist_id
                        : 'Broadcast (menunggu terapis)'
                      }
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-semibold text-text-secondary min-w-[120px]">Push Notifikasi:</span>
                    <span className="text-text-primary">
                      {form.therapist_id ? 'Tidak (direct assignment)' : `Dikirim ke therapist eligible`}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && !result && (
              <div className="border-l-4 border-danger pl-4">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="w-5 h-5 text-danger" />
                  <h3 className="text-base font-bold text-text-primary">Gagal Membuat Pesanan</h3>
                </div>
                <p className="text-sm text-text-secondary">{error}</p>
              </div>
            )}
          </div>

          <div className="modal-footer flex gap-2">
            {result ? (
              <>
                <button onClick={() => { setResult(null); setForm(f => ({ ...f, therapist_id: '', address: '', user_notes: 'Test order dari admin' })); }}
                  className="btn-secondary flex-1 py-3 text-sm font-semibold"
                >
                  Buat Lagi
                </button>
                <button onClick={onClose} className="btn-primary flex-1 py-3 text-sm font-bold">
                  Tutup
                </button>
              </>
            ) : (
              <>
                <button onClick={onClose} className="btn-secondary flex-1 py-3 text-sm font-semibold" disabled={submitting}>
                  Batal
                </button>
                <button onClick={handleSubmit} disabled={submitting}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold"
                >
                  {submitting ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> Membuat...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Buat Pesanan</>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}
