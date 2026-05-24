'use client';

import { Settings, Bell, Shield, Globe, MapPin, Star, Wallet, Landmark, Save, Loader2, CheckCircle2, AlertCircle, Sliders, Image as ImageIcon } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

type AppSettings = {
  matching_radius_km: number;
  min_rating: number;
  min_wallet_balance: number;
  bronze_platform_cut: number;
  silver_platform_cut: number;
  gold_platform_cut: number;
  platinum_platform_cut: number;
  diamond_platform_cut: number;
  topup_admin_fee: number;
  topup_min_amount: number;
  topup_max_amount: number;
  withdraw_admin_fee: number;
  withdraw_min_amount: number;
  withdraw_max_amount: number;
  order_service_fee: number;
  order_admin_fee: number;
  platform_name: string;
  support_email: string;
  support_whatsapp: string;
  chat_link: string;
  logo_url: string | null;
};

const defaultSettings: AppSettings = {
  matching_radius_km: 3,
  min_rating: 4.5,
  min_wallet_balance: 15000,
  bronze_platform_cut: 27,
  silver_platform_cut: 25,
  gold_platform_cut: 23,
  platinum_platform_cut: 21,
  diamond_platform_cut: 20,
  topup_admin_fee: 2500,
  topup_min_amount: 10000,
  topup_max_amount: 2000000,
  withdraw_admin_fee: 5000,
  withdraw_min_amount: 50000,
  withdraw_max_amount: 5000000,
  order_service_fee: 2000,
  order_admin_fee: 0,
  platform_name: 'Kang Massage',
  support_email: 'support@kangmassage.app',
  support_whatsapp: '',
  chat_link: '',
  logo_url: null,
};

type TabKey = 'general' | 'matching' | 'commission' | 'topup' | 'withdrawal' | 'order_fees' | 'notifications' | 'security';

const tabs: { key: TabKey; label: string; icon: any }[] = [
  { key: 'general', label: 'general', icon: Settings },
  { key: 'matching', label: 'matching_settings', icon: MapPin },
  { key: 'commission', label: 'commission_settings', icon: Star },
  { key: 'topup', label: 'topup_settings', icon: Wallet },
  { key: 'withdrawal', label: 'withdrawal_settings', icon: Landmark },
  { key: 'order_fees', label: 'order_fee_settings', icon: Sliders },
  { key: 'notifications', label: 'notifications', icon: Bell },
  { key: 'security', label: 'security', icon: Shield },
];

export default function SettingsPage() {
  const { language, setLanguage, t } = useLanguage();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [originalSettings, setOriginalSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previousLogos, setPreviousLogos] = useState<{ name: string; url: string; created_at: string }[]>([]);
  const [loadingLogos, setLoadingLogos] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ name: string; url: string } | null>(null);

  const hasChanges = Object.keys(defaultSettings).some(
    key => settings[key as keyof AppSettings] !== originalSettings[key as keyof AppSettings]
  );
  const [activeTab, setActiveTab] = useState<TabKey>('general');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchPreviousLogos = async () => {
    try {
      setLoadingLogos(true);
      const res = await fetch('/api/upload?bucket=logos', { cache: 'no-store' });
      const data = await res.json();
      if (!data.error) setPreviousLogos(data.files || []);
    } catch (err) {
      console.error('Failed to fetch logos:', err);
    } finally {
      setLoadingLogos(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'general') fetchPreviousLogos();
  }, [activeTab]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings', { cache: 'no-store' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSettings(prev => ({ ...prev, ...data }));
      setOriginalSettings(prev => ({ ...prev, ...data }));
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Gagal menyimpan' }));
        throw new Error(err.error || 'Gagal menyimpan');
      }
      await fetchSettings();
      toast.success(t('settings_saved'));
    } catch (err) {
      console.error('Failed to save settings:', err);
      toast.error(t('settings_save_error'));
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof AppSettings, value: string | number | null) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <><div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t('settings')}</h1>
          <p className="text-text-muted text-sm mt-1">{t('platform_config')}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className={clsx('btn-primary text-sm flex items-center gap-2', !hasChanges && 'opacity-50 cursor-not-allowed')}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? t('saving') : t('save_changes')}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Tabs */}
        <nav className="lg:w-56 flex-shrink-0">
          <div className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === key
                    ? 'bg-card text-text-primary border border-ui-border shadow-sm'
                    : 'text-text-muted hover:text-text-primary hover:bg-muted border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {t(label)}
              </button>
            ))}
          </div>
        </nav>

        {/* Tab Content */}
        <div className="flex-1 min-w-0">
          {/* General */}
          {activeTab === 'general' && (
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-primary/30 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-primary-400" />
                </div>
                <h2 className="font-semibold text-text-primary">{t('general')}</h2>
              </div>
              <div className="space-y-4 max-w-lg">
                <div>
                  <CustomSelect
                    label={t('language')}
                    value={language}
                    onChange={(val) => setLanguage(val as any)}
                    options={[
                      { value: 'id', label: 'Bahasa Indonesia' },
                      { value: 'en', label: 'English' }
                    ]}
                    icon={Globe}
                  />
                </div>
                <div>
                  <label className="text-sm text-text-primary/60 mb-2 block">{t('platform_name')}</label>
                  <input
                    type="text"
                    value={settings.platform_name}
                    onChange={e => updateField('platform_name', e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="text-sm text-text-primary/60 mb-2 block">{t('support_email')}</label>
                  <input
                    type="email"
                    value={settings.support_email}
                    onChange={e => updateField('support_email', e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="text-sm text-text-primary/60 mb-2 block">WhatsApp Support</label>
                  <input
                    type="text"
                    value={settings.support_whatsapp}
                    onChange={e => updateField('support_whatsapp', e.target.value)}
                    className="input-field"
                    placeholder="6281234567890"
                  />
                </div>
                <div>
                  <label className="text-sm text-text-primary/60 mb-2 block">Link Chat (Tawk.to / Live Chat)</label>
                  <input
                    type="text"
                    value={settings.chat_link}
                    onChange={e => updateField('chat_link', e.target.value)}
                    className="input-field"
                    placeholder="https://tawk.to/chat/..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Logo */}
          {activeTab === 'general' && (
            <div className="glass-card p-6 mt-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-sky-600/30 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-sky-400" />
                </div>
                <h2 className="font-semibold text-text-primary">{t('logo')}</h2>
              </div>
              <LogoField
                label="Logo Aplikasi"
                description="Ini branding logo di semua aplikasi"
                value={settings.logo_url}
                onUpload={(url) => { updateField('logo_url', url); fetchPreviousLogos(); }}
                onRemove={() => updateField('logo_url', null)}
              />
              {previousLogos.length > 0 && (
                <div className="mt-6 pt-6 border-t border-ui-border">
                  <label className="text-sm text-text-primary/60 mb-3 block">Logo Sebelumnya</label>
                  <div className="flex flex-wrap gap-3">
                    {previousLogos.map((logo) => (
                      <div key={logo.name} className="relative group">
                        <button
                          onClick={() => updateField('logo_url', logo.url)}
                          className={`w-16 h-16 rounded-xl border-2 overflow-hidden flex items-center justify-center bg-muted transition-all hover:scale-105 ${
                            settings.logo_url === logo.url ? 'border-primary' : 'border-transparent hover:border-ui-border'
                          }`}
                        >
                          <img src={logo.url} alt={logo.name} className="w-full h-full object-contain" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ name: logo.name, url: logo.url })}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-danger text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                        >
                          <span className="text-xs leading-none">✕</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Therapist Matching */}
          {activeTab === 'matching' && (
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/30 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-emerald-400" />
                </div>
                <h2 className="font-semibold text-text-primary">{t('matching_settings')}</h2>
              </div>
              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="text-sm text-text-primary/60 mb-2 block">{t('search_radius')}</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="50"
                    value={settings.matching_radius_km}
                    onChange={e => updateField('matching_radius_km', parseFloat(e.target.value) || 3)}
                    className="input-field"
                  />
                  <p className="text-xs text-text-muted/60 mt-1">{t('radius_desc')}</p>
                </div>
                <div>
                  <label className="text-sm text-text-primary/60 mb-2 block">{t('min_rating_label')}</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={settings.min_rating}
                    onChange={e => updateField('min_rating', parseFloat(e.target.value) || 4.5)}
                    className="input-field"
                  />
                  <p className="text-xs text-text-muted/60 mt-1">{t('rating_desc')}</p>
                </div>
                <div>
                  <label className="text-sm text-text-primary/60 mb-2 block">{t('min_wallet_label')}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm pointer-events-none z-10">Rp</span>
                    <input
                      type="text"
                      value={Number(settings.min_wallet_balance).toLocaleString('id-ID')}
                      onChange={e => updateField('min_wallet_balance', parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0)}
                      className="input-field pl-10"
                    />
                  </div>
                  <p className="text-xs text-text-muted/60 mt-1">{t('wallet_desc')}</p>
                </div>
              </div>
            </div>
          )}

          {/* Commission Rates */}
          {activeTab === 'commission' && (
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-amber-600/30 flex items-center justify-center">
                  <Star className="w-5 h-5 text-amber-400" />
                </div>
                <h2 className="font-semibold text-text-primary">{t('commission_settings')}</h2>
              </div>
              <p className="text-xs text-text-muted/70 mb-4">{t('platform_cut_desc')}</p>
              <div className="space-y-3 max-w-md">
                {(['bronze', 'silver', 'gold', 'platinum', 'diamond'] as const).map(tier => {
                  const field = `${tier}_platform_cut` as keyof AppSettings;
                  return (
                    <div key={tier} className="flex items-center gap-3">
                      <span className="text-sm text-text-primary/70 w-24 capitalize">{tier}</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        value={settings[field] as string | number}
                        onChange={e => updateField(field, parseFloat(e.target.value) || 0)}
                        className="input-field w-24 text-center"
                      />
                      <span className="text-xs text-text-muted">%</span>
                      <span className="text-xs text-emerald-400 ml-auto">
                        {t('therapist_gets')}: {100 - Number(settings[field])}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Topup Settings */}
          {activeTab === 'topup' && (
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-blue-600/30 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-blue-400" />
                </div>
                <h2 className="font-semibold text-text-primary">{t('topup_settings')}</h2>
              </div>
              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="text-sm text-text-primary/60 mb-2 block">{t('admin_fee')}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm pointer-events-none z-10">Rp</span>
                    <input
                      type="text"
                      value={Number(settings.topup_admin_fee).toLocaleString('id-ID')}
                      onChange={e => updateField('topup_admin_fee', parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0)}
                      className="input-field pl-10"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-text-primary/60 mb-2 block">{t('min_amount')}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm pointer-events-none z-10">Rp</span>
                      <input
                        type="text"
                        value={Number(settings.topup_min_amount).toLocaleString('id-ID')}
                        onChange={e => updateField('topup_min_amount', parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0)}
                        className="input-field pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-text-primary/60 mb-2 block">{t('max_amount')}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm pointer-events-none z-10">Rp</span>
                      <input
                        type="text"
                        value={Number(settings.topup_max_amount).toLocaleString('id-ID')}
                        onChange={e => updateField('topup_max_amount', parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0)}
                        className="input-field pl-10"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Withdrawal Settings */}
          {activeTab === 'withdrawal' && (
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-purple-600/30 flex items-center justify-center">
                  <Landmark className="w-5 h-5 text-purple-400" />
                </div>
                <h2 className="font-semibold text-text-primary">{t('withdrawal_settings')}</h2>
              </div>
              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="text-sm text-text-primary/60 mb-2 block">{t('admin_fee')}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm pointer-events-none z-10">Rp</span>
                    <input
                      type="text"
                      value={Number(settings.withdraw_admin_fee).toLocaleString('id-ID')}
                      onChange={e => updateField('withdraw_admin_fee', parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0)}
                      className="input-field pl-10"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-text-primary/60 mb-2 block">{t('min_amount')}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm pointer-events-none z-10">Rp</span>
                      <input
                        type="text"
                        value={Number(settings.withdraw_min_amount).toLocaleString('id-ID')}
                        onChange={e => updateField('withdraw_min_amount', parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0)}
                        className="input-field pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-text-primary/60 mb-2 block">{t('max_amount')}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm pointer-events-none z-10">Rp</span>
                      <input
                        type="text"
                        value={Number(settings.withdraw_max_amount).toLocaleString('id-ID')}
                        onChange={e => updateField('withdraw_max_amount', parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0)}
                        className="input-field pl-10"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Order Fees */}
          {activeTab === 'order_fees' && (
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-cyan-600/30 flex items-center justify-center">
                  <Sliders className="w-5 h-5 text-cyan-400" />
                </div>
                <h2 className="font-semibold text-text-primary">{t('order_fee_settings')}</h2>
              </div>
              <p className="text-xs text-text-muted/70 mb-4">{t('order_fee_desc')}</p>
              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="text-sm text-text-primary/60 mb-2 block">{t('order_service_fee_label')}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm pointer-events-none z-10">Rp</span>
                    <input
                      type="text"
                      value={Number(settings.order_service_fee).toLocaleString('id-ID')}
                      onChange={e => updateField('order_service_fee', parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0)}
                      className="input-field pl-10"
                    />
                  </div>
                  <p className="text-xs text-text-muted/60 mt-1">{t('order_fee_user_desc')}</p>
                </div>
                <div>
                  <label className="text-sm text-text-primary/60 mb-2 block">{t('order_admin_fee_label')}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm pointer-events-none z-10">Rp</span>
                    <input
                      type="text"
                      value={Number(settings.order_admin_fee).toLocaleString('id-ID')}
                      onChange={e => updateField('order_admin_fee', parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0)}
                      className="input-field pl-10"
                    />
                  </div>
                  <p className="text-xs text-text-muted/60 mt-1">{t('order_fee_therapist_desc')}</p>
                </div>
              </div>
            </div>
          )}

          {/* Branding */}
          {/* Notifications */}
          {activeTab === 'notifications' && (
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-blue-600/30 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-blue-400" />
                </div>
                <h2 className="font-semibold text-text-primary">{t('notifications')}</h2>
              </div>
              <div className="space-y-4 max-w-lg">
                {[
                  { label: t('new_order_alerts'), key: 'new_order', enabled: true },
                  { label: t('order_completion'), key: 'completed', enabled: true },
                  { label: t('payment_alerts'), key: 'payment', enabled: true },
                  { label: t('therapist_status'), key: 'therapist', enabled: false },
                ].map(({ label, key, enabled }) => (
                  <div key={key} className="flex items-center justify-between py-2">
                    <span className="text-sm text-text-primary/70">{label}</span>
                    <button className={`w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-primary-600' : 'bg-dark-600'}`}>
                      <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Security */}
          {activeTab === 'security' && (
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-red-600/30 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-red-400" />
                </div>
                <h2 className="font-semibold text-text-primary">{t('security')}</h2>
              </div>
              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="text-sm text-text-primary/60 mb-2 block">{t('current_password')}</label>
                  <input type="password" className="input-field" placeholder="••••••••" />
                </div>
                <div>
                  <label className="text-sm text-text-primary/60 mb-2 block">{t('new_password')}</label>
                  <input type="password" className="input-field" placeholder="••••••••" />
                </div>
                <div>
                  <label className="text-sm text-text-primary/60 mb-2 block">{t('confirm_password')}</label>
                  <input type="password" className="input-field" placeholder="••••••••" />
                </div>
                <button className="btn-primary text-sm">{t('update_password')}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Hapus Logo"
        message="Yakin ingin menghapus logo ini? Tidak bisa dibatalkan."
        type="danger"
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            const res = await fetch('/api/upload', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ bucket: 'logos', fileName: deleteTarget.name }),
            });
            if (!res.ok) throw new Error('Gagal menghapus');
            toast.success('Logo dihapus');
            fetchPreviousLogos();
            if (settings.logo_url === deleteTarget.url) updateField('logo_url', null);
          } catch {
            toast.error('Gagal menghapus logo');
          } finally {
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      /></>
  );
}

function LogoField({ label, description, value, onUpload, onRemove }: { label: string; description?: string; value: string | null; onUpload: (url: string) => void; onRemove: () => void }) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'logos');

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Upload gagal');
      onUpload(data.url);
      toast.success('Logo berhasil diupload');
    } catch (err: any) {
      toast.error(err.message || 'Gagal upload logo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="text-sm text-text-muted mb-2 block">{label}</label>
      {description && <p className="text-xs text-text-muted/60 mb-3">{description}</p>}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-xl bg-muted border border-ui-border flex items-center justify-center overflow-hidden flex-shrink-0">
          {value ? (
            <img src={value} alt={label} className="w-full h-full object-contain" />
          ) : (
            <ImageIcon className="w-6 h-6 text-text-muted/40" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="btn-primary text-sm px-4 py-2 cursor-pointer">
            {uploading ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              'Upload'
            )}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleFile} className="hidden" />
          </label>
          {value && (
            <button onClick={onRemove} className="px-4 py-2 rounded-xl text-sm font-medium text-danger hover:bg-danger/10 transition-colors border border-transparent hover:border-danger/20">
              Hapus
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
