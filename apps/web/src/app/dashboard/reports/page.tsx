'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { DashboardStats } from '@/types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Line, AreaChart, Area, PieChart, Pie, Cell, ComposedChart
} from 'recharts';
import { format } from 'date-fns';
import { useLanguage } from '@/context/LanguageContext';
import { DollarSign, ShoppingBag, Users, UserCheck, Star, Wallet, Activity, TrendingUp, TrendingDown, Minus, Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  accepted: '#3B82F6',
  on_the_way: '#8B5CF6',
  in_progress: '#06B6D4',
  completed: '#22C55E',
  cancelled: '#EF4444',
  rejected: '#6B7280',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Menunggu',
  accepted: 'Diterima',
  on_the_way: 'Dalam Perjalanan',
  in_progress: 'Sedang Berlangsung',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
  rejected: 'Ditolak',
};

const MONTHS = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' },
];

interface MonthlyData {
  totalOrders: number;
  totalRevenue: number;
  completedOrders: number;
  newUsers: number;
  ordersByStatus: { status: string; count: number }[];
  revenueByDay: { date: string; revenue: number; orders: number }[];
}

function calcChange(current: number, previous: number): { pct: number; dir: 'up' | 'down' | 'same' } {
  if (previous === 0) return { pct: current > 0 ? 100 : 0, dir: current > 0 ? 'up' : 'same' };
  const pct = Math.round(((current - previous) / previous) * 100);
  return { pct: Math.abs(pct), dir: pct > 0 ? 'up' : pct < 0 ? 'down' : 'same' };
}

export default function ReportsPage() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [monthlyData, setMonthlyData] = useState<{ current: MonthlyData; previous: MonthlyData } | null>(null);
  const [loadingMonthly, setLoadingMonthly] = useState(false);

  // Fetch overall stats
  useEffect(() => {
    fetch('/api/analytics/dashboard')
      .then(res => res.json())
      .then(({ data }) => setStats(data))
      .finally(() => setLoading(false));
  }, []);

  // Fetch monthly comparison data
  const fetchMonthly = useCallback(async (month: number, year: number) => {
    setLoadingMonthly(true);
    try {
      const res = await fetch(`/api/analytics/monthly?month=${month}&year=${year}`);
      const data = await res.json();
      if (data.current) setMonthlyData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMonthly(false);
    }
  }, []);

  useEffect(() => {
    fetchMonthly(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear, fetchMonthly]);

  const handleMonthChange = (m: number, y: number) => {
    setSelectedMonth(m);
    setSelectedYear(y);
  };

  if (loading) return (
    <div className="page-container">
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="glass-card h-28 animate-pulse" />)}
        </div>
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="glass-card h-64 animate-pulse" />)}
      </div>
    </div>
  );

  if (!stats) return null;

  const monthly = monthlyData?.current;
  const previous = monthlyData?.previous;
  const revenueByDay = stats.revenueByDay || [];
  const ordersByStatus = stats.ordersByStatus || [];

  // Build comparison chart data: merge current & previous month revenue by day-of-month
  const maxDays = Math.max(
    monthly?.revenueByDay?.length || 0,
    previous?.revenueByDay?.length || 0
  );
  const comparisonData: { day: number; currentRevenue: number; previousRevenue: number; currentOrders: number; previousOrders: number }[] = [];
  for (let d = 1; d <= maxDays; d++) {
    const cur = monthly?.revenueByDay[d - 1];
    const prev = previous?.revenueByDay[d - 1];
    comparisonData.push({
      day: d,
      currentRevenue: cur?.revenue || 0,
      previousRevenue: prev?.revenue || 0,
      currentOrders: cur?.orders || 0,
      previousOrders: prev?.orders || 0,
    });
  }

  const totalForPie = ordersByStatus.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="page-container">
      {/* Header with Month Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t('reports')}</h1>
          <p className="text-text-muted text-sm mt-1">{t('platform_performance')}</p>
        </div>
        <MonthPicker month={selectedMonth} year={selectedYear} onChange={handleMonthChange} />
      </div>

      {/* Monthly Summary Cards with Comparison */}
      {monthly && previous && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MonthlySummaryCard
            icon={<DollarSign className="w-5 h-5" />}
            label="Pendapatan"
            value={formatCurrency(monthly.totalRevenue)}
            prevValue={formatCurrency(previous.totalRevenue)}
            change={calcChange(monthly.totalRevenue, previous.totalRevenue)}
            color="text-green-400"
            bgColor="bg-green-500/10"
          />
          <MonthlySummaryCard
            icon={<ShoppingBag className="w-5 h-5" />}
            label="Pesanan"
            value={monthly.totalOrders.toLocaleString()}
            prevValue={previous.totalOrders.toLocaleString()}
            change={calcChange(monthly.totalOrders, previous.totalOrders)}
            color="text-primary-400"
            bgColor="bg-primary/10"
          />
          <MonthlySummaryCard
            icon={<Users className="w-5 h-5" />}
            label="Pengguna Baru"
            value={monthly.newUsers.toLocaleString()}
            prevValue={previous.newUsers.toLocaleString()}
            change={calcChange(monthly.newUsers, previous.newUsers)}
            color="text-blue-400"
            bgColor="bg-blue-500/10"
          />
          <MonthlySummaryCard
            icon={<Star className="w-5 h-5" />}
            label="Pesanan Selesai"
            value={monthly.completedOrders.toLocaleString()}
            prevValue={previous.completedOrders.toLocaleString()}
            change={calcChange(monthly.completedOrders, previous.completedOrders)}
            color="text-yellow-400"
            bgColor="bg-yellow-500/10"
          />
        </div>
      )}

      {/* Comparison Charts */}
      {comparisonData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Revenue Comparison */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-semibold text-text-primary">Perbandingan Pendapatan</h2>
                <p className="text-xs text-text-muted mt-0.5">
                  {MONTHS[selectedMonth - 1]?.label} {selectedYear} vs {selectedMonth === 1 ? MONTHS[11]?.label : MONTHS[selectedMonth - 2]?.label} {selectedMonth === 1 ? selectedYear - 1 : selectedYear}
                </p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} itemStyle={{ color: '#fff' }} labelStyle={{ color: '#fff' }}
                  formatter={(value: number, name: string) => {
                    const labels: Record<string, string> = { currentRevenue: 'Bulan Ini', previousRevenue: 'Bulan Lalu' };
                    return [formatCurrency(value), labels[name] || name];
                  }}
                />
                <Bar dataKey="currentRevenue" fill="#6A0DAD" radius={[4, 4, 0, 0]} name="currentRevenue" />
                <Bar dataKey="previousRevenue" fill="rgba(107,114,128,0.4)" radius={[4, 4, 0, 0]} name="previousRevenue" />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-6 mt-4 text-xs">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-[#6A0DAD]" />
                {MONTHS[selectedMonth - 1]?.label}
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-gray-500/40" />
                Bulan Lalu
              </span>
            </div>
          </div>

          {/* Orders Comparison */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-semibold text-text-primary">Perbandingan Pesanan</h2>
                <p className="text-xs text-text-muted mt-0.5">Per hari (bulan ini vs bulan lalu)</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={comparisonData}>
                <defs>
                  <linearGradient id="currentOrderGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6A0DAD" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6A0DAD" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="prevOrderGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6B7280" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6B7280" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} itemStyle={{ color: '#fff' }} labelStyle={{ color: '#fff' }}
                  formatter={(value: number, name: string) => {
                    const labels: Record<string, string> = { currentOrders: 'Bulan Ini', previousOrders: 'Bulan Lalu' };
                    return [value, labels[name] || name];
                  }}
                />
                <Area type="monotone" dataKey="currentOrders" stroke="#6A0DAD" strokeWidth={2} fill="url(#currentOrderGrad)" name="currentOrders" />
                <Area type="monotone" dataKey="previousOrders" stroke="#6B7280" strokeWidth={2} fill="url(#prevOrderGrad)" strokeDasharray="5 5" name="previousOrders" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-6 mt-4 text-xs">
              <span className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-[#6A0DAD]" />
                {MONTHS[selectedMonth - 1]?.label}
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-gray-500" style={{ borderTop: '2px dashed #6B7280', height: 0 }} />
                Bulan Lalu
              </span>
            </div>
          </div>
        </div>
      )}

      {/* All-time Overview Section */}
      {!loadingMonthly && (
        <>
          {/* Overall Summary Cards */}
          <h2 className="font-semibold text-text-primary mb-4 text-lg">Ringkasan Keseluruhan</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <OverallCard
              icon={<DollarSign className="w-5 h-5" />}
              label="Total Pendapatan"
              value={formatCurrency(stats.totalRevenue)}
              sub={`Hari ini: ${formatCurrency(stats.todayRevenue)}`}
              color="text-green-400"
              bgColor="bg-green-500/10"
            />
            <OverallCard
              icon={<ShoppingBag className="w-5 h-5" />}
              label="Total Pesanan"
              value={stats.totalOrders.toLocaleString()}
              sub={`Selesai: ${stats.completedOrders} · Aktif: ${stats.activeOrders}`}
              color="text-primary-400"
              bgColor="bg-primary/10"
            />
            <OverallCard
              icon={<Users className="w-5 h-5" />}
              label="Total Pengguna"
              value={stats.totalUsers.toLocaleString()}
              sub={`Baru hari ini: ${stats.newUsersToday}`}
              color="text-blue-400"
              bgColor="bg-blue-500/10"
            />
            <OverallCard
              icon={<UserCheck className="w-5 h-5" />}
              label="Total Terapis"
              value={stats.totalTherapists.toLocaleString()}
              sub={`Online: ${stats.onlineTherapists} · Rating: ${stats.avgRating.toFixed(1)}`}
              color="text-yellow-400"
              bgColor="bg-yellow-500/10"
            />
          </div>

          {/* Revenue Trend (30 days) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-semibold text-text-primary">Tren Pendapatan (30 Hari)</h2>
                  <p className="text-xs text-text-muted mt-0.5">Pendapatan harian dari pesanan selesai</p>
                </div>
                <span className="text-green-400 text-sm font-medium">{formatCurrency(stats.totalRevenue)}</span>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={revenueByDay}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6A0DAD" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6A0DAD" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tickFormatter={(v) => format(new Date(v), 'dd/MM')} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} itemStyle={{ color: '#fff' }} labelStyle={{ color: '#fff' }}
                    formatter={(value: number) => [formatCurrency(value), 'Pendapatan']}
                    labelFormatter={(label) => format(new Date(label), 'dd MMM yyyy')}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#6A0DAD" strokeWidth={2} fill="url(#revenueGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Orders Trend */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-semibold text-text-primary">Tren Pesanan (30 Hari)</h2>
                  <p className="text-xs text-text-muted mt-0.5">Pesanan selesai per hari</p>
                </div>
                <span className="text-primary-400 text-sm font-medium">{stats.totalOrders.toLocaleString()} total</span>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={revenueByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tickFormatter={(v) => format(new Date(v), 'dd/MM')} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} itemStyle={{ color: '#fff' }} labelStyle={{ color: '#fff' }}
                    labelFormatter={(label) => format(new Date(label), 'dd MMM yyyy')}
                  />
                  <Bar dataKey="orders" fill="#6A0DAD" radius={[4, 4, 0, 0]} name="Pesanan" />
                  <Line type="monotone" dataKey="revenue" stroke="#FDB927" strokeWidth={2} dot={false} name="Pendapatan" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Breakdown & Platform Fee */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="glass-card p-6 lg:col-span-2">
              <h2 className="font-semibold text-text-primary mb-4">Status Pesanan</h2>
              <div className="flex flex-col md:flex-row items-center gap-6">
                <ResponsiveContainer width={240} height={240}>
                  <PieChart>
                    <Pie
                      data={ordersByStatus}
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={100}
                      paddingAngle={3}
                      dataKey="count" nameKey="status"
                    >
                      {ordersByStatus.map((entry) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#6B7280'} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} itemStyle={{ color: '#fff' }} labelStyle={{ color: '#fff' }}
                      formatter={(value: number, name: string) => [value, STATUS_LABELS[name] || name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2 w-full">
                  {ordersByStatus.map(({ status, count }) => {
                    const pct = totalForPie > 0 ? Math.round((count / totalForPie) * 100) : 0;
                    return (
                      <div key={status} className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[status] || '#6B7280' }} />
                        <span className="text-sm text-text-secondary flex-1">{STATUS_LABELS[status] || status}</span>
                        <span className="text-sm text-text-muted">{count}</span>
                        <div className="w-24 bg-dark-700 rounded-full h-1.5 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: STATUS_COLORS[status] || '#6B7280' }} />
                        </div>
                        <span className="text-xs text-text-muted w-10 text-right">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="glass-card p-6">
              <h2 className="font-semibold text-text-primary mb-4">Fee Platform & Pendapatan</h2>
              <div className="space-y-6">
                <div className="glass-card p-4 bg-success/5 border border-success/10">
                  <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-1">Total Fee Platform</p>
                  <p className="text-2xl font-bold text-green-400">{formatCurrency(stats.totalPlatformFee)}</p>
                  <p className="text-xs text-text-muted mt-1">Hari ini: {formatCurrency(stats.todayPlatformFee)}</p>
                </div>
                <div className="glass-card p-4 bg-primary/5 border border-primary/10">
                  <p className="text-[10px] font-bold text-primary-400 uppercase tracking-widest mb-1">Pendapatan Terapis</p>
                  <p className="text-2xl font-bold text-primary-400">{formatCurrency(stats.totalTherapistEarnings)}</p>
                </div>
                <div className="glass-card p-4 bg-blue-500/5 border border-blue-500/10">
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Rating Rata-rata</p>
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500 fill-current" />
                    <p className="text-2xl font-bold text-yellow-400">{stats.avgRating.toFixed(1)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Wallet Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="glass-card p-6">
              <h2 className="font-semibold text-text-primary mb-2">Dompet: Topup & Penarikan</h2>
              <p className="text-xs text-text-muted mb-6">Total topup dan penarikan (semua waktu)</p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="glass-card p-4 bg-green-500/5 border border-green-500/10">
                  <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-1">Total Topup</p>
                  <p className="text-lg font-bold text-green-400">{formatCurrency(stats.totalTopup)}</p>
                  <p className="text-xs text-text-muted mt-1">Hari ini: {formatCurrency(stats.todayTopup)}</p>
                </div>
                <div className="glass-card p-4 bg-red-500/5 border border-red-500/10">
                  <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">Total Penarikan</p>
                  <p className="text-lg font-bold text-red-400">{formatCurrency(stats.totalWithdrawal)}</p>
                  <p className="text-xs text-text-muted mt-1">Hari ini: {formatCurrency(stats.todayWithdrawal)}</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={[
                  { name: 'Topup Total', value: stats.totalTopup, fill: '#22C55E' },
                  { name: 'Withdrawal Total', value: stats.totalWithdrawal, fill: '#EF4444' },
                ]} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} width={120} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} itemStyle={{ color: '#fff' }} labelStyle={{ color: '#fff' }}
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                    {[
                      { name: 'Topup Total', value: stats.totalTopup, fill: '#22C55E' },
                      { name: 'Withdrawal Total', value: stats.totalWithdrawal, fill: '#EF4444' },
                    ].map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="glass-card p-6">
              <h2 className="font-semibold text-text-primary mb-2">Saldo Dompet</h2>
              <p className="text-xs text-text-muted mb-6">Total saldo saat ini</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-card p-4 bg-blue-500/5 border border-blue-500/10">
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">
                    <Wallet className="w-3 h-3 inline mr-1" /> Saldo User
                  </p>
                  <p className="text-lg font-bold text-blue-400">{formatCurrency(stats.totalUserBalance)}</p>
                </div>
                <div className="glass-card p-4 bg-purple-500/5 border border-purple-500/10">
                  <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1">
                    <Wallet className="w-3 h-3 inline mr-1" /> Saldo Terapis
                  </p>
                  <p className="text-lg font-bold text-purple-400">{formatCurrency(stats.totalTherapistBalance)}</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={[
                  { name: 'Saldo User', value: stats.totalUserBalance, fill: '#3B82F6' },
                  { name: 'Saldo Terapis', value: stats.totalTherapistBalance, fill: '#8B5CF6' },
                ]} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}jt`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} width={110} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} itemStyle={{ color: '#fff' }} labelStyle={{ color: '#fff' }}
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                    {[
                      { name: 'Saldo User', value: stats.totalUserBalance, fill: '#3B82F6' },
                      { name: 'Saldo Terapis', value: stats.totalTherapistBalance, fill: '#8B5CF6' },
                    ].map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2 text-xs">
                <FeeRow label="Fee Topup" total={stats.totalTopupFee} today={stats.todayTopupFee} />
                <FeeRow label="Fee Penarikan" total={stats.totalWithdrawalFee} today={stats.todayWithdrawalFee} />
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="glass-card p-6">
            <h2 className="font-semibold text-text-primary mb-4">Pesanan Terbaru</h2>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="text-left">Order</th>
                    <th className="text-left">User</th>
                    <th className="text-left">Terapis</th>
                    <th className="text-left">Status</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">Tanggal</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats.recentOrders || []).slice(0, 10).map((order) => (
                    <tr key={order.id}>
                      <td className="font-mono text-xs text-primary-400">{order.order_number}</td>
                      <td className="text-sm text-text-secondary">{order.user_name}</td>
                      <td className="text-sm text-text-secondary">{order.therapist_name}</td>
                      <td>
                        <span className={clsx('badge', `badge-${order.status}`)}>
                          {STATUS_LABELS[order.status] || order.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="text-sm text-green-400 text-right font-medium">{formatCurrency(order.total_price)}</td>
                      <td className="text-xs text-text-muted text-right">{format(new Date(order.created_at), 'dd MMM HH:mm')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Activity History */}
          {stats.recentActivity && stats.recentActivity.length > 0 && (
            <div className="glass-card p-6 mt-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-text-muted" />
                <h2 className="font-semibold text-text-primary">Aktivitas Terbaru</h2>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {stats.recentActivity.slice(0, 15).map((a) => (
                  <div key={a.id} className="flex items-center gap-3 py-2 border-b border-ui-border/50">
                    <div className={clsx('w-2 h-2 rounded-full flex-shrink-0',
                      a.status === 'completed' ? 'bg-green-500' :
                      a.status === 'cancelled' ? 'bg-red-500' : 'bg-yellow-500'
                    )} />
                    <span className="text-xs text-text-secondary flex-1">{a.note}</span>
                    <span className="text-[10px] text-text-muted">{format(new Date(a.created_at), 'dd MMM HH:mm')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MonthlySummaryCard({ icon, label, value, prevValue, change, color, bgColor }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  prevValue: string;
  change: { pct: number; dir: 'up' | 'down' | 'same' };
  color: string;
  bgColor: string;
}) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-2">
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', bgColor)}>
          <div className={color}>{icon}</div>
        </div>
        <span className={clsx('flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full',
          change.dir === 'up' ? 'text-green-400 bg-green-500/10' :
          change.dir === 'down' ? 'text-red-400 bg-red-500/10' :
          'text-text-muted bg-white/5'
        )}>
          {change.dir === 'up' ? <TrendingUp className="w-3 h-3" /> :
           change.dir === 'down' ? <TrendingDown className="w-3 h-3" /> :
           <Minus className="w-3 h-3" />}
          {change.pct}%
        </span>
      </div>
      <p className={clsx('text-xl font-bold truncate', color)}>{value}</p>
      <p className="text-xs text-text-muted mt-0.5">{label}</p>
      <p className="text-[10px] text-text-muted/60 mt-1">Bulan lalu: {prevValue}</p>
    </div>
  );
}

function OverallCard({ icon, label, value, sub, color, bgColor }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', bgColor)}>
          <div className={color}>{icon}</div>
        </div>
      </div>
      <p className={clsx('text-xl font-bold truncate', color)}>{value}</p>
      <p className="text-xs text-text-muted mt-0.5">{label}</p>
      <p className="text-[10px] text-text-muted/60 mt-1">{sub}</p>
    </div>
  );
}

function MonthPicker({ month, year, onChange }: { month: number; year: number; onChange: (m: number, y: number) => void }) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(year);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setViewYear(year); }, [year]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const label = MONTHS.find(m => m.value === month)?.label || '';
  const canGoNextYear = viewYear < currentYear;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="input-field py-2 px-3 text-sm flex items-center gap-2 whitespace-nowrap"
      >
        <Calendar className="w-4 h-4 text-text-muted" />
        <span className="text-text-primary font-medium min-w-[7rem] text-left">{label} {year}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 glass-card p-4 z-50" style={{ width: '280px' }}>
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setViewYear(viewYear - 1)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
              <ChevronLeft className="w-4 h-4 text-text-muted" />
            </button>
            <span className="text-sm font-semibold text-text-primary">{viewYear}</span>
            <button
              onClick={() => canGoNextYear && setViewYear(viewYear + 1)}
              className={clsx('p-1 rounded-lg transition-colors', canGoNextYear ? 'hover:bg-white/10' : 'opacity-30 cursor-not-allowed')}
            >
              <ChevronRight className="w-4 h-4 text-text-muted" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {MONTHS.map(m => {
              const isFuture = viewYear > currentYear || (viewYear === currentYear && m.value > currentMonth);
              const isSelected = m.value === month && viewYear === year;
              const isCurrent = m.value === currentMonth && viewYear === currentYear;
              return (
                <button
                  key={m.value}
                  disabled={isFuture}
                  onClick={() => { onChange(m.value, viewYear); setOpen(false); }}
                  className={clsx(
                    'py-2 px-2 text-xs rounded-lg transition-colors font-medium',
                    isFuture ? 'text-text-muted/30 cursor-not-allowed' :
                    isSelected ? 'bg-primary text-white' : isCurrent ? 'border border-white/10 text-text-secondary' : 'text-text-secondary hover:bg-white/5'
                  )}
                >
                  {m.label.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function FeeRow({ label, total, today }: { label: string; total: number; today: number }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-text-muted">{label}</span>
      <div className="text-right">
        <span className="text-text-secondary font-medium">{formatCurrency(total)}</span>
        <span className="text-text-muted ml-2">(hari ini: {formatCurrency(today)})</span>
      </div>
    </div>
  );
}
