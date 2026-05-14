'use client';

import { Settings, Bell, Shield, Globe, Palette } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { CustomSelect } from '@/components/ui/CustomSelect';

export default function SettingsPage() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">{t('settings')}</h1>
        <p className="text-text-muted text-sm mt-1">Platform configuration</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-primary/30 flex items-center justify-center">
              <Settings className="w-5 h-5 text-primary-400" />
            </div>
            <h2 className="font-semibold text-text-primary">{t('general')}</h2>
          </div>
          <div className="space-y-4">
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
            {[
              { label: t('platform_name'), value: 'Kang Massage', type: 'text' },
              { label: t('support_email'), value: 'support@kangmassage.app', type: 'email' },
              { label: t('commission_rate'), value: '20', type: 'number' },
            ].map(({ label, value, type }) => (
              <div key={label}>
                <label className="text-sm text-text-primary/60 mb-2 block">{label}</label>
                <input type={type} defaultValue={value} className="input-field" />
              </div>
            ))}
            <button className="btn-primary text-sm w-full sm:w-auto">{t('save_changes')}</button>
          </div>
        </div>

        {/* Notifications */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 flex items-center justify-center">
              <Bell className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="font-semibold text-text-primary">Notifications</h2>
          </div>
          <div className="space-y-4">
            {[
              { label: 'New order alerts', key: 'new_order', enabled: true },
              { label: 'Order completion', key: 'completed', enabled: true },
              { label: 'Payment alerts', key: 'payment', enabled: true },
              { label: 'Therapist status', key: 'therapist', enabled: false },
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

        {/* Security */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-red-600/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-400" />
            </div>
            <h2 className="font-semibold text-text-primary">Security</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-text-primary/60 mb-2 block">Current Password</label>
              <input type="password" className="input-field" placeholder="••••••••" />
            </div>
            <div>
              <label className="text-sm text-text-primary/60 mb-2 block">New Password</label>
              <input type="password" className="input-field" placeholder="••••••••" />
            </div>
            <div>
              <label className="text-sm text-text-primary/60 mb-2 block">Confirm Password</label>
              <input type="password" className="input-field" placeholder="••••••••" />
            </div>
            <button className="btn-primary text-sm">Update Password</button>
          </div>
        </div>

        {/* API Keys */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-teal-600/30 flex items-center justify-center">
              <Globe className="w-5 h-5 text-teal-400" />
            </div>
            <h2 className="font-semibold text-text-primary">Integrations</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-text-primary/60 mb-2 block">Supabase URL</label>
              <input type="text" className="input-field font-mono text-xs" placeholder="https://xxx.supabase.co" />
            </div>
            <div>
              <label className="text-sm text-text-primary/60 mb-2 block">Midtrans Server Key</label>
              <input type="password" className="input-field font-mono text-xs" placeholder="SB-Mid-server-..." />
            </div>
            <div>
              <label className="text-sm text-text-primary/60 mb-2 block">FCM Server Key</label>
              <input type="password" className="input-field font-mono text-xs" placeholder="AAAA..." />
            </div>
            <button className="btn-primary text-sm">Save API Keys</button>
          </div>
        </div>
      </div>
    </div>
  );
}
