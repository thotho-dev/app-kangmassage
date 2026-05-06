'use client';

import { useEffect, useState } from 'react';
import {
  TrendingUp, Users, UserCheck, ShoppingBag,
  Activity, Star, ArrowUpRight, RefreshCw,
  Wallet, Clock
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { DashboardStats } from '@/types';
import { clsx } from 'clsx';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';

const STATUS_COLORS: Record<string, string> = {
  pending: '#eab308',
  accepted: '#3b82f6',
  on_the_way: '#6366f1',
  in_progress: '#9333ea',
  completed: '#22c55e',
  cancelled: '#ef4444',
  rejected: '#6b7280',
};

const getStatusLabels = (t: any): Record<string, string> => ({
  pending: t('pending'),
  accepted: t('accepted'),
  on_the_way: t('on_the_way'),
  in_progress: t('in_progress'),
  completed: t('completed'),
  cancelled: t('cancelled'),
  rejected: t('rejected'),
});

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

function StatCard({
  label, value, icon: Icon, color, trend, sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  trend?: number;
  sub?: string;
}) {
  return (
    <div className="stat-card group">
      <div className="flex items-center justify-between mb-4">
        <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center', color)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend !== undefined && (
          <div className={clsx(
            'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg',
            trend >= 0 ? 'text-success bg-success/10' : 'text-danger bg-danger/10'
          )}>
            <ArrowUpRight className={clsx('w-3 h-3', trend < 0 && 'rotate-180')} />
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
      <p className="text-sm text-text-muted mt-1">{label}</p>
      {sub && <p className="text-xs text-text-muted opacity-60 mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const statusLabels = getStatusLabels(t);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/analytics/dashboard');
      const { data } = await res.json();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="page-container">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="stat-card h-36 animate-pulse bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t('dashboard')}</h1>
          <p className="text-text-muted text-sm mt-1">{t('real_time_overview')}</p>
        </div>
        <button
          onClick={fetchStats}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          {t('refresh')}
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t('total_orders')}
          value={stats?.totalOrders.toLocaleString() || '0'}
          icon={ShoppingBag}
          color="bg-primary"
          sub={`${stats?.todayOrders || 0} ${t('x_today')}`}
        />
        <StatCard
          label={t('total_revenue')}
          value={stats ? `Rp ${stats.totalRevenue.toLocaleString('id-ID')}` : 'Rp 0'}
          icon={TrendingUp}
          color="bg-success"
          sub={`Rp ${(stats?.todayRevenue || 0).toLocaleString('id-ID')} ${t('x_today')}`}
        />
        <StatCard
          label={t('total_users')}
          value={stats?.totalUsers.toLocaleString() || '0'}
          icon={Users}
          color="bg-blue-600"
        />
        <StatCard
          label={t('total_therapists')}
          value={stats?.totalTherapists.toLocaleString() || '0'}
          icon={UserCheck}
          color="bg-slate-700"
          sub={`${stats?.onlineTherapists || 0} ${t('x_online')}`}
        />
        <StatCard
          label={t('active_orders')}
          value={stats?.activeOrders.toLocaleString() || '0'}
          icon={Activity}
          color="bg-orange-600"
        />
        <StatCard
          label={t('online_therapists')}
          value={stats?.onlineTherapists.toLocaleString() || '0'}
          icon={Star}
          color="bg-teal-600"
        />
        <StatCard
          label={t('todays_orders')}
          value={stats?.todayOrders.toLocaleString() || '0'}
          icon={Clock}
          color="bg-indigo-600"
        />
        <StatCard
          label={t('todays_revenue')}
          value={stats ? `Rp ${stats.todayRevenue.toLocaleString('id-ID')}` : 'Rp 0'}
          icon={Wallet}
          color="bg-pink-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-semibold text-text-primary">Revenue & Orders</h2>
              <p className="text-text-muted text-xs mt-1">Last 30 days</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={stats?.revenueByDay || []}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6A0DAD" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6A0DAD" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FDB927" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FDB927" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
              <XAxis
                dataKey="date"
                tick={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)', fontSize: 11 }}
                tickFormatter={(v) => new Date(v).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
              />
              <YAxis tick={{ fill: theme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ 
                  background: theme === 'dark' ? '#1e293b' : '#ffffff', 
                  border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, 
                  borderRadius: '12px' 
                }}
                labelStyle={{ color: theme === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}
                formatter={(value, name) => [
                  name === 'revenue' ? formatCurrency(value as number) : value,
                  name === 'revenue' ? 'Revenue' : 'Orders',
                ]}
              />
              <Area type="monotone" dataKey="revenue" stroke="#9333ea" fill="url(#colorRevenue)" strokeWidth={2} />
              <Area type="monotone" dataKey="orders" stroke="#FDB927" fill="url(#colorOrders)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Orders by Status Pie */}
        <div className="glass-card p-6">
          <div className="mb-6">
            <h2 className="font-semibold text-text-primary">Order Status</h2>
            <p className="text-text-muted text-xs mt-1">Distribution overview</p>
          </div>
          {(stats?.ordersByStatus.length || 0) > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={stats?.ordersByStatus}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {stats?.ordersByStatus.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#6b7280'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ 
                    background: theme === 'dark' ? '#1e293b' : '#ffffff', 
                    border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, 
                    borderRadius: '12px' 
                  }}
                  formatter={(value, name) => [value, statusLabels[name as string] || name]}
                />
                <Legend
                  formatter={(value) => statusLabels[value] || value}
                  wrapperStyle={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.6)', fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-60 text-text-primary/20 text-sm">
              {t('no_orders_yet')}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity placeholder */}
      <div className="glass-card p-6">
        <h2 className="font-semibold text-text-primary mb-4">{t('quick_actions')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: t('orders'), href: '/dashboard/orders', color: 'from-primary to-primary-700' },
            { label: t('users'), href: '/dashboard/users', color: 'from-secondary to-secondary-700' },
            { label: t('settings'), href: '/dashboard/settings', color: 'from-info to-info-700' },
            { label: t('reports'), href: '/dashboard/reports', color: 'from-success to-success-700' },
          ].map(({ label, href, color }) => (
            <a
              key={href}
              href={href}
              className={`flex items-center justify-center py-3 px-4 rounded-xl bg-gradient-to-r ${color} text-white text-sm font-medium hover:opacity-90 transition-opacity text-center shadow-sm`}
            >
              {label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
