'use client';

import { useEffect, useState } from 'react';
import { Send, Radio, Users, UserCheck, History, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { useLanguage } from '@/context/LanguageContext';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

export default function BroadcastPage() {
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState<'users' | 'therapists' | 'all'>('all');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<{ title: string; body: string; data?: { target?: string }; created_at: string }[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{ title: string; body: string } | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await fetch('/api/broadcast');
      const data = await res.json();
      if (Array.isArray(data)) setHistory(data);
    } catch {
      // silent
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Judul dan pesan harus diisi');
      return;
    }

    try {
      setSending(true);
      const res = await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, title: title.trim(), body: body.trim() }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Gagal mengirim');

      toast.success(`Broadcast terkirim ke ${data.count} penerima`);
      setTitle('');
      setBody('');
      fetchHistory();
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengirim broadcast');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      const res = await fetch('/api/broadcast', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: deleteTarget.title, body: deleteTarget.body }),
      });
      if (!res.ok) throw new Error('Gagal menghapus');
      toast.success('Broadcast dihapus');
      setDeleteTarget(null);
      fetchHistory();
    } catch {
      toast.error('Gagal menghapus broadcast');
    }
  };

  const targets = [
    { value: 'all', label: 'Semua (User & Terapis)', icon: Send },
    { value: 'users', label: 'Semua Pengguna', icon: Users },
    { value: 'therapists', label: 'Semua Terapis', icon: UserCheck },
  ] as const;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-600/30 flex items-center justify-center">
          <Radio className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h1 className="font-bold text-text-primary text-lg">Broadcast</h1>
          <p className="text-text-muted text-sm">Kirim notifikasi ke semua pengguna atau terapis</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Compose Card */}
        <div className="glass-card p-6 flex-[7] min-w-0">
          <h2 className="font-semibold text-text-primary mb-4">Buat Broadcast Baru</h2>
          <div className="space-y-4">
            {/* Target */}
            <div>
              <label className="text-sm text-text-muted mb-2 block">Target Penerima</label>
              <div className="flex flex-wrap gap-2">
                {targets.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setTarget(value)}
                    className={clsx(
                      'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors border',
                      target === value
                        ? 'bg-purple-600/20 text-purple-300 border-purple-500/30'
                        : 'bg-muted text-text-muted border-transparent hover:text-text-primary hover:bg-muted/80'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="text-sm text-text-muted mb-2 block">Judul</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="input-field w-full"
                placeholder="Contoh: Promo Akhir Pekan"
              />
            </div>

            {/* Body */}
            <div>
              <label className="text-sm text-text-muted mb-2 block">Pesan</label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                className="input-field w-full min-h-[120px] resize-y"
                placeholder="Tulis pesan broadcast di sini..."
                rows={5}
              />
            </div>

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={sending || !title.trim() || !body.trim()}
              className="btn-primary flex items-center gap-2"
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {sending ? 'Mengirim...' : 'Kirim Broadcast'}
            </button>
          </div>
        </div>

        {/* History */}
        <div className="glass-card p-6 flex-[3] min-w-0">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-5 h-5 text-text-muted" />
            <h2 className="font-semibold text-text-primary">Riwayat</h2>
          </div>

          {loadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-text-muted text-sm py-4 text-center">Belum ada broadcast</p>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {history.map((item, i) => {
                const targetLabel = item.data?.target === 'users' ? 'Pengguna' : item.data?.target === 'therapists' ? 'Terapis' : 'Semua';
                return (
                  <div key={i} className="bg-muted rounded-xl p-3 border border-ui-border">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-text-primary">{item.title}</h3>
                      <span className={clsx(
                        'text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0',
                        targetLabel === 'Semua' ? 'bg-purple-600/20 text-purple-300' :
                        targetLabel === 'Pengguna' ? 'bg-blue-600/20 text-blue-300' :
                        'bg-emerald-600/20 text-emerald-300'
                      )}>{targetLabel}</span>
                    </div>
                    <p className="text-xs text-text-muted line-clamp-3">{item.body}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-text-muted/60">
                        {new Date(item.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <button
                        onClick={() => setDeleteTarget({ title: item.title, body: item.body })}
                        className="p-1 rounded-lg hover:bg-danger/10 text-text-muted hover:text-danger transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Hapus Broadcast"
        message={`Apakah Anda yakin ingin menghapus broadcast "${deleteTarget?.title}"? Semua notifikasi terkait akan dihapus.`}
        confirmText="Ya, Hapus"
        cancelText="Batal"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        type="danger"
      />
    </div>
  );
}
