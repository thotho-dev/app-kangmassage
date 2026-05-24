'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { MessageSquare, RefreshCw, Search, User, X, Loader2, Send, ArrowLeft, Trash2, Phone, MoreVertical, Smile, Paperclip } from 'lucide-react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useLanguage } from '@/context/LanguageContext';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

interface SupportChat {
  id: string;
  therapist_id: string;
  status: string;
  admin_unread_count: number;
  created_at: string;
  updated_at: string;
  therapist: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    phone: string;
  } | null;
}

interface Message {
  id: string;
  chat_id: string;
  sender_type: 'therapist' | 'admin';
  message: string;
  created_at: string;
}

interface ChatInfo {
  id: string;
  therapist_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  therapist: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    phone: string;
  } | null;
}

function formatConversationTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return format(d, 'HH:mm');
  if (diffDays === 1) return 'Kemarin';
  return format(d, 'dd/MM/yyyy');
}

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'Hari ini';
  if (diffDays === 1) return 'Kemarin';
  return format(d, 'dd MMMM yyyy', { locale: id });
}

// ─── Right Panel Component ───────────────────────────────────────
function ChatPanel({
  chatId,
  onBack,
  onSessionClosed,
}: {
  chatId: string;
  onBack: () => void;
  onSessionClosed: () => void;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [chat, setChat] = useState<ChatInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/chats/${chatId}`);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) router.push('/login');
        throw new Error('Failed to fetch');
      }
      const json = await res.json();
      setMessages(json.messages || []);
      setChat(json.chat || null);
      supabase.from('support_chats').update({ admin_unread_count: 0 }).eq('id', chatId);
    } catch {
      toast.error('Gagal memuat chat');
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const channel = supabase
      .channel(`support-chat-${chatId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [chatId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/chats/${chatId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Gagal mengirim pesan');
      }
      setInput('');
    } catch {
      toast.error('Gagal mengirim pesan');
    } finally {
      setSending(false);
    }
  };

  const handleCloseSession = async () => {
    try {
      const res = await fetch(`/api/chats/${chatId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Sesi chat ditutup');
        onSessionClosed();
      } else {
        toast.error('Gagal menutup sesi');
      }
    } catch {
      toast.error('Gagal menutup sesi');
    }
    setShowCloseConfirm(false);
  };

  const groupMessagesByDate = (msgs: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = [];
    msgs.forEach(msg => {
      const dateKey = format(new Date(msg.created_at), 'yyyy-MM-dd');
      const last = groups[groups.length - 1];
      if (last && last.date === dateKey) last.messages.push(msg);
      else groups.push({ date: dateKey, messages: [msg] });
    });
    return groups;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <p className="text-text-muted">Chat tidak ditemukan</p>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-card border-b border-ui-border">
        <button onClick={onBack} className="text-text-muted hover:text-text-primary lg:hidden">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {chat.therapist?.avatar_url ? (
            <img src={chat.therapist.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <User className="w-5 h-5 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-text-primary truncate">{chat.therapist?.full_name || 'Unknown'}</h2>
          <p className="text-xs text-text-muted">{chat.status === 'active' ? 'online' : 'offline'}</p>
        </div>
        <div className="flex items-center gap-1">
          {chat.status === 'active' && (
            <button onClick={() => setShowCloseConfirm(true)}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted text-text-muted hover:text-danger transition-colors"
              title="Tutup sesi">
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          {chat.therapist?.phone && (
            <a href={`tel:${chat.therapist.phone}`}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted text-text-muted hover:text-text-primary transition-colors">
              <Phone className="w-5 h-5" />
            </a>
          )}
          <button className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted text-text-muted hover:text-text-primary transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-12 py-4 bg-muted/30">
        <div className="max-w-4xl mx-auto space-y-1">
          {messageGroups.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center mb-4 shadow-sm">
                <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-text-muted text-sm">Belum ada pesan</p>
              <p className="text-text-muted/60 text-xs mt-1">Kirim pesan untuk memulai percakapan</p>
            </div>
          )}
          {messageGroups.map(group => (
            <div key={group.date}>
              <div className="flex justify-center my-3">
                <span className="text-[11px] px-3 py-1 rounded-full shadow-sm text-text-muted bg-card">
                  {formatDateLabel(group.date)}
                </span>
              </div>
              {group.messages.map((msg, idx) => {
                const isMe = msg.sender_type === 'admin';
                const prev = idx > 0 ? group.messages[idx - 1] : null;
                const showTail = !(prev && prev.sender_type === msg.sender_type);
                return (
                  <div key={msg.id} className={clsx('flex px-1', isMe ? 'justify-end' : 'justify-start')}>
                    <div className={clsx('max-w-[75%] md:max-w-[60%]')}>
                      <div className={clsx(
                        'px-3 py-1.5 text-sm whitespace-pre-wrap leading-relaxed shadow-sm',
                        isMe
                          ? 'bg-primary text-white rounded-lg'
                          : 'bg-card text-text-primary rounded-lg border border-ui-border',
                        showTail && isMe && 'rounded-br-md',
                        showTail && !isMe && 'rounded-bl-md'
                      )}>
                        <span>{msg.message}</span>
                        <span className={clsx(
                          'text-[11px] ml-2 select-none float-right mt-0.5',
                          isMe ? 'text-white/60' : 'text-text-muted'
                        )}>
                          {format(new Date(msg.created_at), 'HH:mm')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Input */}
      {chat.status === 'active' ? (
        <div className="px-4 py-2.5 bg-card border-t border-ui-border">
          <div className="flex items-center gap-2 max-w-4xl mx-auto">
            <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-muted text-text-muted hover:text-text-primary transition-colors flex-shrink-0">
              <Smile className="w-6 h-6" />
            </button>
            <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-muted text-text-muted hover:text-text-primary transition-colors flex-shrink-0">
              <Paperclip className="w-6 h-6" />
            </button>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Ketik pesan"
              className="flex-1 rounded-lg px-3 py-2.5 text-sm bg-muted text-text-primary border-0 outline-none ring-0"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className={clsx('w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0',
                input.trim() && !sending ? 'bg-primary hover:bg-primary/80 text-white' : 'text-text-muted'
              )}>
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 bg-card border-t border-ui-border text-center">
          <p className="text-text-muted text-sm">Sesi chat telah ditutup</p>
        </div>
      )}

      {showCloseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCloseConfirm(false)}>
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl border border-ui-border" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text-primary mb-2">Tutup Sesi Chat</h3>
            <p className="text-text-muted text-sm mb-6">
              Apakah Anda yakin ingin menutup sesi chat dengan {chat.therapist?.full_name || 'terapis'}? Semua pesan akan dihapus permanen.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowCloseConfirm(false)} className="btn-secondary px-4 py-2 text-sm">Batal</button>
              <button onClick={handleCloseSession} className="btn-danger px-4 py-2 text-sm">Ya, Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────
export default function ChatsPage() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [chats, setChats] = useState<SupportChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const supabase = createClient();

  const selectedChatId = searchParams.get('chatId');

  const setSelectedChatId = (id: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set('chatId', id);
    else params.delete('chatId');
    router.replace(`/dashboard/chats?${params.toString()}`);
  };

  const fetchChats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/chats?status=${statusFilter}`);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) return;
        throw new Error('Failed to fetch');
      }
      const json = await res.json();
      setChats(json.data || []);
    } catch {
      toast.error('Gagal memuat data chat');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchChats(); }, [fetchChats]);

  useEffect(() => {
    const channel = supabase
      .channel('support-messages-global')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages' },
        (payload) => {
          const msg = payload.new as any;
          if (msg.sender_type === 'therapist') {
            toast.success('Pesan baru dari terapis!');
            fetchChats();
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = chats.filter(c =>
    !search || c.therapist?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-80px)]">
      {/* ─── Left Panel: Conversation List ─── */}
      <div className={clsx(
        'flex flex-col border-r border-ui-border',
        selectedChatId ? 'hidden lg:flex w-[35%] max-w-[420px] min-w-[300px]' : 'flex-1 lg:flex lg:w-[35%] lg:max-w-[420px] lg:min-w-[300px]'
      )}>
        {/* Header */}
        <div className="px-4 py-2.5 bg-card border-b border-ui-border">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-semibold text-text-primary">Chats</h1>
            <div className="flex items-center gap-2">
              <button onClick={fetchChats} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted text-text-muted hover:text-text-primary transition-colors" title="Refresh">
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <div className="flex gap-0.5 bg-muted rounded-lg p-0.5">
                {['active', 'closed'].map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={clsx('px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                      statusFilter === s ? 'bg-card text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'
                    )}>
                    {s === 'active' ? 'Aktif' : 'Riwayat'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input type="text" placeholder="Cari atau mulai chat baru..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg pl-9 pr-8 py-2 text-sm bg-muted text-text-primary border-0 outline-none ring-0 placeholder:text-text-muted" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-text-muted" />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto bg-background">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center px-8">
              <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center mb-4 shadow-sm">
                <MessageSquare className="w-8 h-8 text-text-muted" />
              </div>
              <p className="text-text-muted text-sm">
                {search ? 'Tidak ada chat yang cocok' : `Belum ada chat ${statusFilter === 'active' ? 'aktif' : 'riwayat'}`}
              </p>
            </div>
          ) : (
            <div>
              {filtered.map((chat, idx) => (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChatId(chat.id)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-3 transition-colors text-left border-b',
                    idx < filtered.length - 1 ? 'border-ui-border' : '',
                    selectedChatId === chat.id
                      ? 'bg-muted'
                      : 'bg-card hover:bg-muted/50'
                  )}
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {chat.therapist?.avatar_url ? (
                      <img src={chat.therapist.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-normal text-text-primary truncate flex items-center gap-2">
                        {chat.therapist?.full_name || 'Unknown'}
                      </h3>
                      <span className="text-[11px] text-text-muted flex-shrink-0 ml-2">
                        {formatConversationTime(chat.updated_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[13px] text-text-muted truncate flex-1">
                        {chat.status === 'active' ? 'Klik untuk membalas' : 'Sesi ditutup'}
                      </span>
                      {chat.admin_unread_count > 0 && (
                        <span className="bg-secondary text-white text-[11px] font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center leading-none">
                          {chat.admin_unread_count > 99 ? '99+' : chat.admin_unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Right Panel: Chat Detail or Placeholder ─── */}
      {selectedChatId ? (
        <ChatPanel
          chatId={selectedChatId}
          onBack={() => setSelectedChatId(null)}
          onSessionClosed={() => setSelectedChatId(null)}
        />
      ) : (
        <div className="hidden lg:flex flex-1 flex-col items-center justify-center bg-muted/30">
          <div className="text-center max-w-md px-8">
            <div className="w-24 h-24 rounded-full bg-card flex items-center justify-center mx-auto mb-6 shadow-sm">
              <svg className="w-12 h-12 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-light text-text-primary mb-2">Chat Admin</h2>
            <p className="text-text-muted text-sm leading-relaxed">
              Pilih chat dari daftar di samping untuk mulai merespon pesan dari terapis.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
