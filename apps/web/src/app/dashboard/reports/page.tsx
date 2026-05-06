'use client';

import { useEffect, useState } from 'react';
import { DashboardStats } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format } from 'date-fns';
import { useLanguage } from '@/context/LanguageContext';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

export default function ReportsPage() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics/dashboard')
      .then(res => res.json())
      .then(({ data }) => setStats(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="page-container">
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="glass-card h-48 animate-pulse" />)}
      </div>
    </div>
  );

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">{t('reports')}</h1>
        <p className="text-text-muted text-sm mt-1">{t('platform_performance')}</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t('total_revenue'), value: formatCurrency(stats?.totalRevenue || 0), color: 'text-green-400' },
          { label: t('total_orders'), value: (stats?.totalOrders || 0).toLocaleString(), color: 'text-primary-400' },
          { label: t('total_users'), value: (stats?.totalUsers || 0).toLocaleString(), color: 'text-blue-400' },
          { label: t('total_therapists'), value: (stats?.totalTherapists || 0).toLocaleString(), color: 'text-gold-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-card p-5">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-text-muted mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Revenue Bar Chart */}
      <div className="glass-card p-6">
        <h2 className="font-semibold text-text-primary mb-6">{t('daily_revenue')}</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stats?.revenueByDay || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date"
              tickFormatter={(v) => format(new Date(v), 'dd/MM')}
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
              formatter={(value) => [formatCurrency(value as number), t('revenue')]} />
            <Bar dataKey="revenue" fill="#6A0DAD" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Orders Line Chart */}
      <div className="glass-card p-6">
        <h2 className="font-semibold text-text-primary mb-6">{t('daily_orders')}</h2>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={stats?.revenueByDay || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date"
              tickFormatter={(v) => format(new Date(v), 'dd/MM')}
              tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
            <Line type="monotone" dataKey="orders" stroke="#FDB927" strokeWidth={2} dot={{ fill: '#FDB927', r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Order Status Breakdown */}
      <div className="glass-card p-6">
        <h2 className="font-semibold text-text-primary mb-4">{t('status_breakdown')}</h2>
        <div className="space-y-3">
          {(stats?.ordersByStatus || []).map(({ status, count }) => {
            const total = stats?.totalOrders || 1;
            const pct = Math.round((count / total) * 100);
            return (
              <div key={status} className="flex items-center gap-4">
                <span className="text-sm text-text-primary/60 w-24 capitalize">{t(status)}</span>
                <div className="flex-1 bg-dark-700 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-sm text-text-muted w-20 text-right">{count} ({pct}%)</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
