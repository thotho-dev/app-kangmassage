'use client';

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, ShoppingBag, Eye, X, Clock, MapPin, User, Phone, Star, Tag, FlaskConical, Trash2, RotateCcw } from 'lucide-react';
import { Order, OrderLog } from '@/types';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { useLanguage } from '@/context/LanguageContext';
import { titleCase } from '@/lib/utils';
import { Portal } from '@/components/ui/Portal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import CreateTestOrderModal from './CreateTestOrderModal';

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

function ViewOrderDetailModal({ order, onClose, onRefresh }: {
  order: Order;
  onClose: () => void;
  onRefresh?: () => void;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const canCancel = ['pending', 'accepted', 'on_the_way', 'in_progress'].includes(order.status);

  const handleCancel = async () => {
    if (!cancelReason.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled', cancellation_reason: cancelReason.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal membatalkan pesanan');
      }
      import('react-hot-toast').then(m => m.default.success('Pesanan berhasil dibatalkan'));
      setCancelling(false);
      onClose();
      onRefresh?.();
    } catch (err: any) {
      import('react-hot-toast').then(m => m.default.error(err.message || 'Gagal membatalkan pesanan'));
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor = (status: string) => clsx('badge', STATUS_COLORS[status] || 'badge');
  const paymentBadge = (status: string) => clsx('badge',
    status === 'paid' ? 'badge-completed' :
    status === 'failed' ? 'badge-cancelled' : 'badge-pending'
  );

  const timelineItems = [
    { label: 'Dibuat', time: order.created_at, done: true },
    { label: 'Diterima', time: order.accepted_at, done: !!order.accepted_at },
    { label: 'Dalam Perjalanan', time: null, done: order.status === 'on_the_way' || order.status === 'in_progress' || order.status === 'completed' },
    { label: 'Sedang Berlangsung', time: order.started_at, done: order.status === 'in_progress' || order.status === 'completed' },
    { label: order.status === 'cancelled' ? 'Dibatalkan' : 'Selesai', time: order.completed_at || order.cancelled_at, done: order.status === 'completed' || order.status === 'cancelled' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="text-xl font-bold text-text-primary">Detail Pesanan</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
        </div>

        <div className="modal-body space-y-6">
          {/* Order Number + Status */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider">Pesanan</p>
              <p className="font-mono text-lg font-bold text-primary-400">{order.order_number}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={statusColor(order.status)}>
                {order.status.replace('_', ' ')}
              </span>
              <span className={paymentBadge(order.payment_status)}>
                {order.payment_status}
              </span>
            </div>
          </div>

          {/* Customer & Therapist */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-card p-4">
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2 flex items-center gap-1">
                <User className="w-3 h-3" /> Pelanggan
              </p>
              <p className="text-sm font-semibold text-text-primary">{titleCase((order.user as any)?.full_name) || '-'}</p>
              <p className="text-xs text-text-muted flex items-center gap-1 mt-1">
                <Phone className="w-3 h-3" /> {(order.user as any)?.phone || '-'}
              </p>
            </div>
            <div className="glass-card p-4">
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2 flex items-center gap-1">
                <User className="w-3 h-3" /> Terapis
              </p>
              {order.therapist ? (
                <>
                  <p className="text-sm font-semibold text-text-primary">{titleCase((order.therapist as any)?.full_name)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-text-muted flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {(order.therapist as any)?.phone}
                    </p>
                    {(order.therapist as any)?.rating && (
                      <span className="text-xs text-yellow-500 flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-current" /> {(order.therapist as any)?.rating?.toFixed(1)}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-xs text-text-muted italic">Belum ditugaskan</p>
              )}
            </div>
          </div>

          {/* Service Info */}
          <div className="glass-card p-4">
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Detail Layanan</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-text-primary">{(order.service as any)?.name || '-'}</p>
                <p className="text-xs text-text-muted">{(order.service as any)?.duration_min || '-'} menit</p>
              </div>
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="glass-card p-4 space-y-2">
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Detail Pembayaran</p>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Harga Layanan</span>
              <span className="text-text-primary">{formatCurrency(order.service_price)}</span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Diskon</span>
                <span className="text-danger">-{formatCurrency(order.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold pt-2 border-t border-ui-border">
              <span className="text-text-primary">Total</span>
              <span className="text-green-400">{formatCurrency(order.total_price)}</span>
            </div>
            {order.payment_method && (
              <div className="flex justify-between text-xs pt-1">
                <span className="text-text-muted">Metode Pembayaran</span>
                <span className="text-text-secondary capitalize">{order.payment_method}</span>
              </div>
            )}
          </div>

          {/* Voucher */}
          {(order as any).voucher && (
            <div className="glass-card p-4 flex items-center gap-3">
              <Tag className="w-4 h-4 text-primary" />
              <div>
                <p className="text-xs font-semibold text-text-primary">{(order as any).voucher?.code}</p>
                <p className="text-[10px] text-text-muted">
                  {(order as any).voucher?.type === 'percentage' ? `${(order as any).voucher?.value}%` : formatCurrency((order as any).voucher?.value || 0)}
                </p>
              </div>
            </div>
          )}

          {/* Address */}
          <div className="glass-card p-4">
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Alamat
            </p>
            <p className="text-sm text-text-secondary">{order.address}</p>
            <p className="text-[10px] text-text-muted mt-1">
              {order.latitude?.toFixed(5)}, {order.longitude?.toFixed(5)}
            </p>
          </div>

          {/* User Notes */}
          {order.user_notes && (
            <div className="glass-card p-4">
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Catatan</p>
              <p className="text-sm text-text-secondary italic">"{order.user_notes}"</p>
            </div>
          )}

          {/* Timeline */}
          <div>
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3">Timeline</p>
            <div className="space-y-3">
              {timelineItems.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={clsx(
                      'w-3 h-3 rounded-full border-2 flex-shrink-0 mt-0.5',
                      item.done ? 'bg-green-500 border-green-500' : 'bg-card border-text-muted'
                    )} />
                    {i < timelineItems.length - 1 && (
                      <div className={clsx(
                        'w-0.5 h-8',
                        timelineItems[i + 1]?.done ? 'bg-green-500' : 'bg-ui-border'
                      )} />
                    )}
                  </div>
                  <div>
                    <p className={clsx('text-xs font-medium', item.done ? 'text-text-primary' : 'text-text-muted')}>{item.label}</p>
                    {item.time && (
                      <p className="text-[10px] text-text-muted">{format(new Date(item.time), 'dd MMM yyyy HH:mm')}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Logs */}
          {(order as any).order_logs?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3">Riwayat Aktivitas</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {(order as any).order_logs.map((log: OrderLog, i: number) => (
                  <div key={i} className="flex items-center justify-between glass-card p-2.5">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-text-muted" />
                      <span className="text-xs text-text-secondary">{log.status?.replace('_', ' ')}</span>
                    </div>
                    <span className="text-[10px] text-text-muted">{format(new Date(log.created_at), 'dd MMM HH:mm')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rating & Review */}
          {(order.status === 'completed' && (order.rating || order.review)) && (
            <div className="glass-card p-4">
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Rating & Ulasan</p>
              {order.rating && (
                <div className="flex items-center gap-1.5 text-yellow-500 font-bold mb-1">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="text-sm">{order.rating.toFixed(1)}</span>
                </div>
              )}
              {order.review && (
                <p className="text-xs text-text-secondary italic">"{order.review}"</p>
              )}
            </div>
          )}

          {/* Cancellation Reason */}
          {order.status === 'cancelled' && order.cancellation_reason && (
            <div className="glass-card p-4 border border-danger/20">
              <p className="text-[10px] font-bold text-danger uppercase tracking-widest mb-2">Alasan Pembatalan</p>
              <p className="text-sm text-text-secondary">{order.cancellation_reason}</p>
            </div>
          )}
        </div>

        {cancelling ? (
          <div className="p-4 border-t border-ui-border space-y-3">
            <p className="text-sm font-bold text-danger">Konfirmasi Pembatalan</p>
            <textarea
              className="input-field"
              placeholder="Alasan pembatalan..."
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setCancelling(false); setCancelReason(''); }}
                className="btn-secondary flex-1 py-3 text-sm font-semibold"
                disabled={submitting}
              >
                Batal
              </button>
              <button
                onClick={handleCancel}
                className="bg-danger text-white flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-50"
                disabled={submitting || !cancelReason.trim()}
              >
                {submitting ? 'Memproses...' : 'Ya, Batalkan'}
              </button>
            </div>
          </div>
        ) : (
          <div className="modal-footer">
            {canCancel && (
              <button
                onClick={() => setCancelling(true)}
                className="bg-danger text-white py-4 rounded-xl text-sm font-bold w-full shadow-lg shadow-danger/20"
              >
                Batalkan Pesanan
              </button>
            )}
            <button onClick={onClose} className="btn-primary w-full py-4 text-sm font-bold shadow-lg shadow-primary/20">
              Tutup
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const { t } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewModal, setViewModal] = useState<{ open: boolean; order: Order | null }>({ open: false, order: null });
  const [detailData, setDetailData] = useState<Order | null>(null);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
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

  const handleViewDetail = useCallback(async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      const result = await res.json();
      if (result.data) {
        setDetailData(result.data);
        setViewModal({ open: true, order: result.data });
      } else {
        import('react-hot-toast').then(m => m.default.error(result.error || 'Gagal memuat detail pesanan'));
      }
    } catch (err) {
      console.error('Failed to fetch order detail:', err);
      import('react-hot-toast').then(m => m.default.error('Gagal memuat detail pesanan'));
    }
  }, []);

  const handleDeleteOrder = (id: string) => {
    setConfirmModal({
      open: true,
      title: 'Hapus Pesanan?',
      message: 'Pesanan yang dihapus tidak bisa dikembalikan. Semua data terkait (log, transaksi) juga akan dihapus. Yakin ingin menghapus?',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/orders/${id}`, { method: 'DELETE' });
          if (res.ok) {
            import('react-hot-toast').then(m => m.default.success('Pesanan berhasil dihapus'));
            fetchOrders();
          } else {
            const err = await res.json();
            import('react-hot-toast').then(m => m.default.error(err.error || 'Gagal menghapus pesanan'));
          }
        } catch (err) {
          import('react-hot-toast').then(m => m.default.error('Gagal menghapus pesanan'));
        }
        setConfirmModal(null);
      },
    });
  };

  const handleReorderOrder = useCallback(async (order: Order) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: order.user_id,
          service_id: order.service_id,
          address: order.address,
          latitude: order.latitude,
          longitude: order.longitude,
          payment_method: order.payment_method || 'wallet',
          user_notes: `Order ulang dari ${order.order_number}`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        import('react-hot-toast').then(m => m.default.success(`Order ulang berhasil: ${data.data.order_number}`));
        fetchOrders();
      } else {
        import('react-hot-toast').then(m => m.default.error(data.error || 'Gagal membuat order ulang'));
      }
    } catch (err) {
      import('react-hot-toast').then(m => m.default.error('Gagal membuat order ulang'));
    }
  }, [fetchOrders]);

  return (
    <div className="page-container">
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t('orders_monitor')}</h1>
          <p className="text-text-muted text-sm mt-1">{total.toLocaleString()} {t('total_orders_count')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setTestModalOpen(true)} className="btn-secondary flex items-center gap-2 text-sm">
            <FlaskConical className="w-4 h-4" />
            Test Order
          </button>
          <button onClick={fetchOrders} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw className="w-4 h-4" />
            {t('refresh')}
          </button>
        </div>
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
                <th>{t('order_number')}</th>
                <th>{t('users')}</th>
                <th>{t('therapist')}</th>
                <th>{t('services')}</th>
                <th>{t('amount')}</th>
                <th>{t('status')}</th>
                <th>{t('payment')}</th>
                <th>{t('date')}</th>
                <th className="text-center">Aksi</th>
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
                      <p className="font-medium text-sm">{titleCase((order.user as any)?.full_name) || '—'}</p>
                      <p className="text-text-muted opacity-50 text-xs">{(order.user as any)?.phone}</p>
                    </td>
                    <td>
                      {order.therapist ? (
                        <p className="text-sm">{titleCase((order.therapist as any)?.full_name)}</p>
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
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleViewDetail(order.id)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                          title="Lihat Detail"
                        >
                          <Eye className="w-4 h-4 text-text-muted" />
                        </button>
                        <button
                          onClick={() => handleReorderOrder(order)}
                          className="p-2 hover:bg-emerald-500/10 rounded-lg transition-colors"
                          title="Order Ulang"
                        >
                          <RotateCcw className="w-4 h-4 text-emerald-400" />
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(order.id)}
                          className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Hapus Pesanan"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
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

      {/* Order Detail Modal */}
      {viewModal.open && viewModal.order && (
        <Portal>
          <ViewOrderDetailModal
            order={detailData || viewModal.order}
            onClose={() => { setViewModal({ open: false, order: null }); setDetailData(null); }}
            onRefresh={fetchOrders}
          />
        </Portal>
      )}

      {/* Test Order Modal */}
      {testModalOpen && (
        <CreateTestOrderModal
          onClose={() => setTestModalOpen(false)}
          onSuccess={() => fetchOrders()}
        />
      )}

      {/* Confirm Delete Modal */}
      {confirmModal && (
        <ConfirmModal
          isOpen={confirmModal.open}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
          confirmText="Ya, Hapus"
          cancelText="Batal"
          type="danger"
        />
      )}
    </div>
  );
}
