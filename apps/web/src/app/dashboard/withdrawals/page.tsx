'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Search, RefreshCw, Eye, CheckCircle, XCircle, ChevronDown, Wallet, Clock,
} from 'lucide-react';
import { clsx } from 'clsx';
import { createClient } from '@/lib/supabase/client';

interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  admin_fee: number;
  status: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  external_id: string;
  admin_notes: string;
  created_at: string;
  approved_at: string | null;
  pin_verified: boolean;
  otp_verified: boolean;
  users: {
    id: string;
    full_name: string;
    phone: string;
    wallet_balance: number;
  };
}

export default function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>('pending');
  const [detail, setDetail] = useState<Withdrawal | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null);
  const [confirmWd, setConfirmWd] = useState<Withdrawal | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  const supabase = createClient();

  const tabs = [
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Disetujui' },
    { key: 'rejected', label: 'Ditolak' },
    { key: 'completed', label: 'Selesai' },
    { key: 'all', label: 'Semua' },
  ];

  const fetchWithdrawals = useCallback(async () => {
    setLoading(true);
    try {
      const statusFilter = tab === 'all' ? ['pending', 'approved', 'rejected', 'completed', 'failed', 'awaiting_otp'] : [tab];
      const { data, error } = await supabase
        .from('user_withdrawals')
        .select('*, users:user_id(id, full_name, phone, wallet_balance)')
        .in('status', statusFilter)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWithdrawals(data || []);
    } catch (err) {
      console.error('Failed to fetch withdrawals:', err);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { fetchWithdrawals(); }, [fetchWithdrawals]);

  const statusChip = (status: string) => {
    const map: Record<string, { label: string; bg: string; text: string }> = {
      pending: { label: 'Pending', bg: 'bg-yellow-100', text: 'text-yellow-800' },
      approved: { label: 'Disetujui', bg: 'bg-blue-100', text: 'text-blue-800' },
      rejected: { label: 'Ditolak', bg: 'bg-red-100', text: 'text-red-800' },
      completed: { label: 'Selesai', bg: 'bg-green-100', text: 'text-green-800' },
      failed: { label: 'Gagal', bg: 'bg-red-100', text: 'text-red-800' },
      awaiting_otp: { label: 'OTP', bg: 'bg-purple-100', text: 'text-purple-800' },
    };
    const s = map[status] || { label: status, bg: 'bg-gray-100', text: 'text-gray-800' };
    return <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', s.bg, s.text)}>{s.label}</span>;
  };

  const fmt = (v: number) => `Rp ${v.toLocaleString('id-ID')}`;
  const mask = (n: string) => n.length > 4 ? '••••' + n.slice(-4) : n;
  const dateFmt = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const handleAction = async () => {
    if (!confirmWd || !confirmAction) return;
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const res = await fetch('/api/withdraw/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          withdrawal_id: confirmWd.id,
          action: confirmAction,
          admin_id: user?.id,
          admin_notes: adminNotes,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setToast({ show: true, message: confirmAction === 'approve' ? 'Penarikan disetujui' : 'Penarikan ditolak', type: 'success' });
      setConfirmWd(null);
      setConfirmAction(null);
      setDetail(null);
      setShowDetail(false);
      fetchWithdrawals();
    } catch (err: any) {
      setToast({ show: true, message: err.message, type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
          <Wallet className="w-7 h-7 text-primary" />
          Penarikan Saldo User
        </h1>
        <button
          onClick={fetchWithdrawals}
          className="flex items-center gap-2 px-4 py-2 bg-card border border-ui-border rounded-xl text-sm font-medium text-text-primary hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-card border border-ui-border rounded-xl p-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              tab === t.key ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text-primary'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card border border-ui-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ui-border bg-gray-50/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Tanggal</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Bank</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Rekening</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Amount</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ui-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <div className="flex items-center justify-center gap-3 text-text-muted">
                      <Clock className="w-5 h-5 animate-spin" /> Memuat data...
                    </div>
                  </td>
                </tr>
              ) : withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-text-muted">
                    <Wallet className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    Tidak ada data penarikan
                  </td>
                </tr>
              ) : (
                withdrawals.map(wd => (
                  <tr key={wd.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-text-muted whitespace-nowrap">{dateFmt(wd.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-text-primary">{wd.users?.full_name || '-'}</div>
                      <div className="text-xs text-text-muted">{wd.users?.phone || ''}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-primary">{wd.bank_name}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-text-primary">{mask(wd.account_number)}</div>
                      <div className="text-xs text-text-muted">{wd.account_name}</div>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-text-primary text-right whitespace-nowrap">{fmt(Number(wd.amount))}</td>
                    <td className="px-4 py-3 text-center">{statusChip(wd.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-primary transition-colors"
                          onClick={() => { setDetail(wd); setShowDetail(true); }}
                          title="Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {wd.status === 'pending' && (
                          <>
                            <button
                              className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors"
                              onClick={() => { setConfirmWd(wd); setConfirmAction('approve'); setAdminNotes(''); }}
                              title="Setujui"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                              onClick={() => { setConfirmWd(wd); setConfirmAction('reject'); setAdminNotes(''); }}
                              title="Tolak"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetail && detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowDetail(false)}>
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-ui-border">
              <h2 className="text-lg font-bold text-text-primary">Detail Penarikan</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wider">User</label>
                  <p className="text-sm font-semibold text-text-primary">{detail.users?.full_name}</p>
                </div>
                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wider">Phone</label>
                  <p className="text-sm text-text-primary">{detail.users?.phone}</p>
                </div>
                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wider">Bank</label>
                  <p className="text-sm text-text-primary">{detail.bank_name}</p>
                </div>
                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wider">No. Rekening</label>
                  <p className="text-sm text-text-primary">{mask(detail.account_number)}</p>
                </div>
                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wider">Atas Nama</label>
                  <p className="text-sm text-text-primary">{detail.account_name}</p>
                </div>
                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wider">Amount</label>
                  <p className="text-sm font-bold text-text-primary">{fmt(Number(detail.amount))}</p>
                </div>
                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wider">Admin Fee</label>
                  <p className="text-sm text-text-primary">{fmt(Number(detail.admin_fee))}</p>
                </div>
                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wider">Saldo User</label>
                  <p className="text-sm text-text-primary">{fmt(Number(detail.users?.wallet_balance || 0))}</p>
                </div>
              </div>
              <div>
                <label className="text-xs text-text-muted uppercase tracking-wider">External ID</label>
                <p className="text-sm font-mono text-text-primary">{detail.external_id}</p>
              </div>
              <div>
                <label className="text-xs text-text-muted uppercase tracking-wider">Status</label>
                <div className="mt-1">{statusChip(detail.status)}</div>
              </div>
              {detail.admin_notes && (
                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wider">Catatan Admin</label>
                  <p className="text-sm text-text-primary">{detail.admin_notes}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-ui-border flex items-center justify-end gap-3">
              {detail.status === 'pending' && (
                <>
                  <button
                    onClick={() => { setShowDetail(false); setConfirmWd(detail); setConfirmAction('reject'); setAdminNotes(''); }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
                  >
                    <XCircle className="w-4 h-4" /> Tolak
                  </button>
                  <button
                    onClick={() => { setShowDetail(false); setConfirmWd(detail); setConfirmAction('approve'); setAdminNotes(''); }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" /> Setujui & Proses
                  </button>
                </>
              )}
              <button onClick={() => setShowDetail(false)} className="px-4 py-2.5 text-text-muted hover:text-text-primary text-sm font-medium transition-colors">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmWd && confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setConfirmWd(null); setConfirmAction(null); }}>
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-lg font-bold text-text-primary mb-2">
                {confirmAction === 'approve' ? 'Setujui Penarikan' : 'Tolak Penarikan'}
              </h2>
              <p className="text-sm text-text-muted mb-4">
                {confirmAction === 'approve'
                  ? 'Penarikan akan diproses dan dana dikirim ke rekening user via Xendit.'
                  : 'Penarikan akan ditolak dan user dapat mengajukan ulang.'}
              </p>
              <textarea
                className="w-full border border-ui-border rounded-xl p-3 text-sm text-text-primary bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                rows={3}
                placeholder="Catatan (opsional)"
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
              />
            </div>
            <div className="px-6 pb-6 flex items-center justify-end gap-3">
              <button
                onClick={() => { setConfirmWd(null); setConfirmAction(null); }}
                className="px-4 py-2.5 text-text-muted hover:text-text-primary text-sm font-medium transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleAction}
                disabled={processing}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors',
                  confirmAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700',
                  processing && 'opacity-60 cursor-not-allowed'
                )}
              >
                {processing ? 'Memproses...' : confirmAction === 'approve' ? 'Setujui' : 'Tolak'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div className={clsx(
            'flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-medium',
            toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          )}>
            {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            {toast.message}
            <button onClick={() => setToast(t => ({ ...t, show: false }))} className="ml-2 opacity-70 hover:opacity-100">×</button>
          </div>
          {setTimeout(() => setToast(t => ({ ...t, show: false })), 4000)}
        </div>
      )}
    </div>
  );
}
