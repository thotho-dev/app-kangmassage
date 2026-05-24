'use client';

import { useEffect, useState } from 'react';
import {
  TrendingUp, Users, UserCheck, ShoppingBag,
  Activity, ArrowUpRight, RefreshCw,
  Wallet, Clock, ShieldCheck, UserPlus, DollarSign,
  Percent, CreditCard, Landmark, ArrowDownLeft,
  UserCircle, Receipt, PiggyBank
} from 'lucide-react';

import dynamic from 'next/dynamic';
import { DashboardStats } from '@/types';
import { clsx } from 'clsx';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';

const TherapistMap = dynamic(() => import('@/components/map/TherapistMap'), {
  ssr: false,
  loading: () => (
    <div className="glass-card p-6 flex items-center justify-center" style={{ height: 460 }}>
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

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

type TabKey = 'therapists' | 'users' | 'revenue' | 'transactions' | 'wallet';

export default function DashboardPage() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('therapists');

  const statusLabels = getStatusLabels(t);

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: 'therapists', label: t('info_therapists'), icon: UserCircle },
    { key: 'users', label: t('info_users'), icon: Users },
    { key: 'revenue', label: t('info_revenue'), icon: PiggyBank },
    { key: 'transactions', label: t('info_transactions'), icon: Receipt },
    { key: 'wallet', label: t('info_wallet'), icon: Wallet },
  ];

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
    const interval = setInterval(fetchStats, 30000);
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

  const pctOfTotal = (val: number, total: number) =>
    total > 0 ? `${((val / total) * 100).toFixed(0)}${t('pct_of_total')}` : undefined;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
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

      {/* Top Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-6">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors',
              activeTab === key
                ? 'bg-card text-text-primary border border-ui-border shadow-sm'
                : 'text-text-muted hover:text-text-primary hover:bg-muted border border-transparent'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ===== INFO TERAPIS ===== */}
      {activeTab === 'therapists' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
          <StatCard
            label={t('total_therapists')}
            value={stats?.totalTherapists.toLocaleString() || '0'}
            icon={UserCheck}
            color="bg-slate-700"
          />
          <StatCard
            label={t('online_therapists')}
            value={stats?.onlineTherapists.toLocaleString() || '0'}
            icon={Activity}
            color="bg-teal-600"
          />
          <StatCard
            label={t('verified')}
            value={stats?.verifiedTherapists.toLocaleString() || '0'}
            icon={ShieldCheck}
            color="bg-emerald-600"
            sub={pctOfTotal(stats?.verifiedTherapists || 0, stats?.totalTherapists || 0)}
          />
          <StatCard
            label={t('total_therapist_balance')}
            value={stats ? formatCurrency(stats.totalTherapistBalance) : 'Rp 0'}
            icon={Wallet}
            color="bg-slate-700"
          />
        </div>
      )}

      {/* ===== INFO PENGGUNA ===== */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
          <StatCard
            label={t('total_users')}
            value={stats?.totalUsers.toLocaleString() || '0'}
            icon={Users}
            color="bg-blue-600"
          />
          <StatCard
            label={t('new_users_today')}
            value={stats?.newUsersToday.toLocaleString() || '0'}
            icon={UserPlus}
            color="bg-indigo-600"
          />
          <StatCard
            label={t('total_user_balance')}
            value={stats ? formatCurrency(stats.totalUserBalance) : 'Rp 0'}
            icon={Wallet}
            color="bg-blue-600"
          />
        </div>
      )}

      {/* ===== INFO PENDAPATAN ===== */}
      {activeTab === 'revenue' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
          <StatCard
            label={t('todays_revenue_label')}
            value={stats ? formatCurrency(stats.todayRevenue) : 'Rp 0'}
            icon={TrendingUp}
            color="bg-success"
            sub={t('from_service_price')}
          />
          <StatCard
            label={t('todays_platform_fee')}
            value={stats ? formatCurrency(stats.todayPlatformFee) : 'Rp 0'}
            icon={Percent}
            color="bg-primary"
            sub={stats?.todayRevenue ? `${((stats.todayPlatformFee / stats.todayRevenue) * 100).toFixed(0)}${t('pct_of_revenue')}` : undefined}
          />
          <StatCard
            label={t('total_revenue')}
            value={stats ? formatCurrency(stats.totalRevenue) : 'Rp 0'}
            icon={DollarSign}
            color="bg-sky-600"
          />
          <StatCard
            label={t('total_platform_fee')}
            value={stats ? formatCurrency(stats.totalPlatformFee) : 'Rp 0'}
            icon={Wallet}
            color="bg-violet-600"
          />
        </div>
      )}

      {/* ===== INFO TRANSAKSI ===== */}
      {activeTab === 'transactions' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
          <StatCard
            label={t('total_orders')}
            value={stats?.totalOrders.toLocaleString() || '0'}
            icon={ShoppingBag}
            color="bg-primary"
          />
          <StatCard
            label={t('active_orders')}
            value={stats?.activeOrders.toLocaleString() || '0'}
            icon={Activity}
            color="bg-orange-600"
          />
          <StatCard
            label={t('todays_orders')}
            value={stats?.todayOrders.toLocaleString() || '0'}
            icon={Clock}
            color="bg-indigo-600"
          />
          <StatCard
            label={t('completed_orders')}
            value={stats?.completedOrders.toLocaleString() || '0'}
            icon={ShoppingBag}
            color="bg-emerald-600"
          />
        </div>
      )}

      {/* ===== TOPUP & TARIK SALDO ===== */}
      {activeTab === 'wallet' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
          <StatCard
            label={t('total_topup')}
            value={stats ? formatCurrency(stats.totalTopup) : 'Rp 0'}
            icon={CreditCard}
            color="bg-blue-600"
          />
          <StatCard
            label={t('todays_topup')}
            value={stats ? formatCurrency(stats.todayTopup) : 'Rp 0'}
            icon={ArrowDownLeft}
            color="bg-cyan-600"
          />
          <StatCard
            label={t('total_withdrawal')}
            value={stats ? formatCurrency(stats.totalWithdrawal) : 'Rp 0'}
            icon={Landmark}
            color="bg-purple-600"
          />
          <StatCard
            label={t('todays_withdrawal')}
            value={stats ? formatCurrency(stats.todayWithdrawal) : 'Rp 0'}
            icon={Wallet}
            color="bg-rose-600"
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-text-primary">{t('recent_orders')}</h2>
              <p className="text-text-muted text-xs mt-1">{t('real_time_overview')}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ui-border">
                  <th className="text-left py-3 px-2 text-text-muted font-medium text-xs uppercase tracking-wider">{t('order')}</th>
                  <th className="text-left py-3 px-2 text-text-muted font-medium text-xs uppercase tracking-wider">{t('user')}</th>
                  <th className="text-left py-3 px-2 text-text-muted font-medium text-xs uppercase tracking-wider">{t('therapist')}</th>
                  <th className="text-left py-3 px-2 text-text-muted font-medium text-xs uppercase tracking-wider">{t('status')}</th>
                  <th className="text-right py-3 px-2 text-text-muted font-medium text-xs uppercase tracking-wider">{t('amount')}</th>
                  <th className="text-right py-3 px-2 text-text-muted font-medium text-xs uppercase tracking-wider">{t('date')}</th>
                </tr>
              </thead>
              <tbody>
                {(stats?.recentOrders?.length || 0) > 0 ? (
                  stats!.recentOrders.map((o) => (
                    <tr key={o.id} className="border-b border-ui-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-2 text-text-primary font-mono text-xs">#{o.order_number}</td>
                      <td className="py-3 px-2 text-text-primary">{o.user_name}</td>
                      <td className="py-3 px-2 text-text-primary">{o.therapist_name}</td>
                      <td className="py-3 px-2">
                        <span className={clsx(
                          'badge',
                          o.status === 'completed' && 'badge-success',
                          o.status === 'cancelled' && 'badge-danger',
                          o.status === 'pending' && 'badge-warning',
                          o.status === 'accepted' && 'badge-info',
                          o.status === 'on_the_way' && 'badge-info',
                          o.status === 'in_progress' && 'badge-primary',
                          o.status === 'rejected' && 'badge-danger',
                        )}>
                          {statusLabels[o.status] || o.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right text-text-primary font-medium">{formatCurrency(o.total_price)}</td>
                      <td className="py-3 px-2 text-right text-text-muted text-xs whitespace-nowrap">
                        {new Date(o.created_at).toLocaleDateString('id-ID', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-text-muted/40 text-sm">{t('no_orders_yet')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="mb-4">
            <h2 className="font-semibold text-text-primary">{t('activity_history')}</h2>
            <p className="text-text-muted text-xs mt-1">{t('real_time_overview')}</p>
          </div>
          <div className="space-y-1 max-h-[360px] overflow-y-auto">
            {(stats?.recentActivity?.length || 0) > 0 ? (
              stats!.recentActivity.map((a) => (
                <div key={a.id} className="flex items-start gap-3 py-2.5 px-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className={clsx(
                    'w-2 h-2 rounded-full mt-2 flex-shrink-0',
                    a.status === 'completed' && 'bg-emerald-500',
                    a.status === 'cancelled' && 'bg-red-500',
                    a.status === 'rejected' && 'bg-gray-500',
                    a.status === 'pending' && 'bg-yellow-500',
                    a.status === 'accepted' && 'bg-blue-500',
                    a.status === 'on_the_way' && 'bg-indigo-500',
                    a.status === 'in_progress' && 'bg-purple-500',
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">
                      <span className="font-mono text-xs text-text-muted">#{a.order_number}</span>
                      {' '}
                      <span className={clsx(
                        'font-medium',
                        a.status === 'completed' && 'text-emerald-400',
                        a.status === 'cancelled' && 'text-red-400',
                        a.status === 'rejected' && 'text-gray-400',
                        a.status === 'pending' && 'text-yellow-400',
                      )}>{statusLabels[a.status] || a.status}</span>
                    </p>
                    {a.note && <p className="text-xs text-text-muted/60 truncate mt-0.5">{a.note}</p>}
                  </div>
                  <span className="text-xs text-text-muted/40 whitespace-nowrap flex-shrink-0">
                    {new Date(a.created_at).toLocaleDateString('id-ID', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-40 text-text-muted/40 text-sm">
                {t('no_orders_yet')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Therapist Map */}
      <div className="mt-6">
        <TherapistMap />
      </div>
    </div>
  );
}
