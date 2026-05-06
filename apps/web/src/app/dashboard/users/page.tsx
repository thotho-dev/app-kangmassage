'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, RefreshCw, User, Phone, Mail, Calendar, Trash2 } from 'lucide-react';
import { User as UserType } from '@/types';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { useLanguage } from '@/context/LanguageContext';

export default function UsersPage() {
  const { t } = useLanguage();
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const limit = 10;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit), search });
      const res = await fetch(`/api/users?${params}`);
      const data = await res.json();
      setUsers(data.data || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  const handleDeleteUser = (id: string) => {
    setConfirmModal({
      open: true,
      title: 'Hapus Pengguna?',
      message: 'Data pengguna dan akun autentikasinya akan dihapus permanen. Apakah Anda yakin?',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
          if (res.ok) {
            import('react-hot-toast').then(m => m.default.success('Pengguna berhasil dihapus'));
            fetchUsers();
          } else {
            import('react-hot-toast').then(m => m.default.error('Gagal menghapus pengguna'));
          }
        } catch (err) {
          console.error(err);
          import('react-hot-toast').then(m => m.default.error('Terjadi kesalahan saat menghapus'));
        }
        setConfirmModal(null);
      }
    });
  };

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t('users')}</h1>
          <p className="text-text-muted text-sm mt-1">{total.toLocaleString()} {t('total_users')}</p>
        </div>
        <button onClick={fetchUsers} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw className="w-4 h-4" />
          {t('refresh')}
        </button>
      </div>

      {/* Search */}
      <div className="glass-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder={t('search')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('user')}</th>
                <th>{t('phone')}</th>
                <th>{t('email')}</th>
                <th>{t('wallet')}</th>
                <th>{t('status')}</th>
                <th>{t('date')}</th>
                <th className="text-center">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j}><div className="h-4 bg-white/10 rounded animate-pulse w-24" /></td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-text-muted opacity-50">
                    <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    {t('no_users_found')}
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} className="w-full h-full rounded-xl object-cover" alt="" />
                          ) : (
                            <span className="text-primary font-semibold text-sm">
                              {user.full_name[0]?.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-text-primary text-sm">{user.full_name}</p>
                          <p className="text-text-muted text-xs">ID: {user.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-text-muted" />
                        <span className="text-text-secondary">{user.phone}</span>
                      </div>
                    </td>
                    <td>
                      {user.email ? (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-text-muted" />
                          <span className="text-text-secondary">{user.email}</span>
                        </div>
                      ) : (
                        <span className="text-text-primary/20">—</span>
                      )}
                    </td>
                    <td>
                      <span className="text-success font-medium">
                        Rp {(user.wallet_balance || 0).toLocaleString('id-ID')}
                      </span>
                    </td>
                    <td>
                      <span className={clsx('badge', user.is_active ? 'badge-online' : 'badge-offline')}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2 text-text-muted">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{format(new Date(user.created_at), 'dd MMM yyyy')}</span>
                      </div>
                    </td>
                    <td className="text-center w-20">
                      <button 
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 hover:bg-danger/10 rounded-xl text-danger transition-all duration-200 hover:scale-110"
                        title={t('delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-between px-4 py-4 border-t border-border">
            <p className="text-sm text-text-muted">
              Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary text-sm py-2 px-3 disabled:opacity-30"
              >
                Previous
              </button>
              <span className="text-sm text-text-muted">Page {page}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * limit >= total}
                className="btn-secondary text-sm py-2 px-3 disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Confirm Modal */}
      {confirmModal && (
        <ConfirmModal 
          isOpen={confirmModal.open}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}
