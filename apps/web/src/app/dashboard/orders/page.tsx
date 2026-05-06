'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, RefreshCw, ShoppingBag, Filter, Eye } from 'lucide-react';
import { Order } from '@/types';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { useLanguage } from '@/context/LanguageContext';

const STATUS_COLORS: Record<string, string> = {
  pending: 'badge-pending',
  accepted: 'badge-accepted',
  on_the_way: 'badge-on_the_way',
  in_progress: 'badge-in_progress',
  completed: 'badge-completed',
  cancelled: 'badge-cancelled',
  rejected: 'badge-rejected',
};

function formatCurrency(amount: number) {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

export default function OrdersPage() {
  const { t } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (status) params.set('status', status);
      const res = await fetch(`/api/orders?${params}`);
      const data = await res.json();
      setOrders(data.data || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  return (
    <div className="page-container">
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t('orders_monitor')}</h1>
          <p className="text-text-muted text-sm mt-1">{total.toLocaleString()} {t('total_orders_count')} · {t('auto_refresh')}</p>
        </div>
        <button onClick={fetchOrders} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw className="w-4 h-4" />
          {t('refresh')}
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { value: '', label: t('all') },
          { value: 'pending', label: t('pending') },
          { value: 'accepted', label: t('accepted') },
          { value: 'in_progress', label: t('in_progress') },
          { value: 'completed', label: t('completed') },
          { value: 'cancelled', label: t('cancelled') },
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => { setStatus(value); setPage(1); }}
            className={clsx(
              'px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
              status === value
                ? 'bg-primary text-white'
                : 'bg-muted text-text-muted hover:text-text-primary border border-ui-border'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>{t('users')}</th>
                <th>{t('therapist')}</th>
                <th>{t('services')}</th>
                <th>{t('amount')}</th>
                <th>{t('status')}</th>
                <th>Payment</th>
                <th>{t('date')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 9 }).map((_, j) => (
                    <td key={j}><div className="h-4 bg-white/10 rounded animate-pulse w-20" /></td>
                  ))}</tr>
                ))
              ) : orders.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-text-muted opacity-50">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  No orders found
                </td></tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <span className="font-mono text-primary-400 text-xs font-medium">
                        {order.order_number}
                      </span>
                    </td>
                    <td>
                      <p className="font-medium text-sm">{(order.user as any)?.full_name || '—'}</p>
                      <p className="text-text-muted opacity-50 text-xs">{(order.user as any)?.phone}</p>
                    </td>
                    <td>
                      {order.therapist ? (
                        <p className="text-sm">{(order.therapist as any)?.full_name}</p>
                      ) : (
                        <span className="text-text-muted opacity-50 text-xs">Searching...</span>
                      )}
                    </td>
                    <td>
                      <p className="text-sm">{(order.service as any)?.name}</p>
                      <p className="text-text-muted opacity-50 text-xs">{(order.service as any)?.duration_min} min</p>
                    </td>
                    <td>
                      <span className="font-medium text-green-400">{formatCurrency(order.total_price)}</span>
                    </td>
                    <td>
                      <span className={clsx('badge', STATUS_COLORS[order.status] || 'badge')}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span className={clsx('badge',
                        order.payment_status === 'paid' ? 'badge-completed' :
                        order.payment_status === 'failed' ? 'badge-cancelled' : 'badge-pending'
                      )}>
                        {order.payment_status}
                      </span>
                    </td>
                    <td className="text-text-muted text-xs">
                      {format(new Date(order.created_at), 'dd MMM HH:mm')}
                    </td>
                    <td>
                      <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <Eye className="w-4 h-4 text-text-muted" />
                      </button>
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
              {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="btn-secondary text-sm py-2 px-3 disabled:opacity-30">Previous</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page * limit >= total}
                className="btn-secondary text-sm py-2 px-3 disabled:opacity-30">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
