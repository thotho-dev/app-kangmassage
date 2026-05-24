import { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard } from 'react-native';
import { useThemeColors } from '@/store/themeStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTherapistStore } from '@/store/therapistStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAlert } from '@/components/CustomAlert';
import { WEB_API_URL } from '@/lib/config';

interface Message {
  id: string;
  chat_id?: string;
  sender_type: 'therapist' | 'admin' | 'ai';
  message: string;
  created_at?: string;
}

export default function SupportChatScreen() {
  const t = useThemeColors();
  const styles = getStyles(t);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const therapist = useTherapistStore(s => s.profile);
  const { showAlert, AlertComponent } = useAlert();
  const flatListRef = useRef<FlatList>(null);

  const [mode, setMode] = useState<'ai' | 'admin' | 'admin-loading'>('ai');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [sessionClosed, setSessionClosed] = useState(false);

  // ─── AI Chat ─────────────────────────────────────────────
  const startAiChat = useCallback(() => {
    setMessages([{
      id: 'ai-welcome',
      sender_type: 'ai',
      message: 'Halo! Ada yang bisa saya bantu?\n\nTanyakan seputar:\n• Withdraw & Top Up saldo\n• Komisi & Tier\n• Status pesanan\n• Cara menggunakan aplikasi\n\nAtau ketik "Hubungi admin" untuk bicara dengan admin kami.',
    }]);
  }, []);

  useEffect(() => {
    startAiChat();
  }, []);

  const sendToAi = async (text: string) => {
    setSending(true);
    const userMsg: Message = { id: `user-${Date.now()}`, sender_type: 'therapist', message: text };
    setMessages(prev => [...prev, userMsg]);

    try {
      // Check if user wants admin
      const lower = text.toLowerCase();
      if (lower.includes('hubungi admin') || lower.includes('admin') && (lower.includes('butuh') || lower.includes('tolong') || lower.includes('bantuan') || lower.includes('bicara'))) {
        setTimeout(() => connectToAdmin(), 300);
        return;
      }

      const history = messages
        .filter(m => m.sender_type === 'therapist' || m.sender_type === 'ai')
        .map(m => ({ role: m.sender_type === 'therapist' ? 'user' as const : 'model' as const, text: m.message }));

      // Don't include the welcome message in history
      const filteredHistory = history.length > 1 ? history.slice(1) : [];

      const res = await fetch(`${WEB_API_URL}/api/chat-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: filteredHistory }),
      });

      const errorBody = !res.ok ? await res.text().catch(() => '') : null;
      if (!res.ok) {
        let detail = '';
        try { const e = JSON.parse(errorBody || '{}'); detail = e.error || res.statusText; } catch { detail = errorBody || res.statusText; }
        throw new Error(`HTTP ${res.status}: ${detail}`);
      }

      const data = await res.json();
      const aiMsg: Message = { id: `ai-${Date.now()}`, sender_type: 'ai', message: data.reply };
      setMessages(prev => [...prev, aiMsg]);
    } catch (e: any) {
      const errMsg: Message = { id: `ai-err-${Date.now()}`, sender_type: 'ai', message: `Maaf, saya mengalami kendala teknis. ${e?.message || ''}` };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setSending(false);
      setInput('');
    }
  };

  // ─── Admin Chat ───────────────────────────────────────────
  const connectToAdmin = async () => {
    if (!therapist?.id) return;
    setMode('admin-loading');
    try {
      const { data: existing } = await supabase
        .from('support_chats')
        .select('id')
        .eq('therapist_id', therapist.id)
        .eq('status', 'active')
        .maybeSingle();

      if (existing) {
        setChatId(existing.id);
        await fetchMessages(existing.id);
        setSessionClosed(false);
        setMode('admin');
        return;
      }

      const { data: newChat, error } = await supabase
        .from('support_chats')
        .insert({ therapist_id: therapist.id, status: 'active' })
        .select()
        .single();

      if (error) {
        showAlert('error', 'Gagal', 'Gagal terhubung ke admin');
        setMode('ai');
        return;
      }

      setChatId(newChat.id);
      setSessionClosed(false);
      setMessages([]);
      setMode('admin');
    } catch {
      showAlert('error', 'Gagal', 'Terjadi kesalahan');
      setMode('ai');
    }
  };

  const fetchMessages = async (id: string) => {
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('chat_id', id)
      .order('created_at', { ascending: true });
    if (data) {
      setMessages(data.map(m => ({ ...m, sender_type: m.sender_type as 'therapist' | 'admin' })));
    }
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    if (mode === 'ai') {
      sendToAi(input.trim());
      return;
    }

    if (!chatId) return;
    setSending(true);
    try {
      const userMsg: Message = { id: `user-${Date.now()}`, sender_type: 'therapist', message: input.trim() };
      setMessages(prev => [...prev, userMsg]);
      await supabase
        .from('support_messages')
        .insert({ chat_id: chatId, sender_type: 'therapist', message: input.trim() });
      setInput('');
    } catch {
      showAlert('error', 'Gagal', 'Gagal mengirim pesan');
    } finally {
      setSending(false);
    }
  };

  // Realtime for admin mode
  useEffect(() => {
    if (!chatId || mode !== 'admin') return;

    const channel = supabase
      .channel(`support-chat-${chatId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'support_chats', filter: `id=eq.${chatId}` },
        () => {
          setSessionClosed(true);
          showAlert('error', 'Sesi Ditutup', 'Sesi chat ditutup oleh admin');
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [chatId, mode]);

  // Auto scroll
  useEffect(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
    });
    return () => showSub.remove();
  }, []);

  // ─── Loading screen ──────────────────────────────────────
  if (mode === 'admin-loading') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={t.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: t.text }]}>Live Chat</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={t.primary} />
        </View>
      </View>
    );
  }

  const subtitle = mode === 'ai' ? 'AI Assistant' : (sessionClosed ? 'Sesi ditutup' : 'Admin Support');

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={'padding'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 44 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: t.headerBg, borderBottomWidth: 1, borderBottomColor: t.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={t.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: t.text }]}>Live Chat</Text>
          <Text style={[styles.subtitle, { color: t.textSecondary }]}>{subtitle}</Text>
        </View>
        {mode === 'ai' && (
          <TouchableOpacity onPress={connectToAdmin} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="headset" size={18} color={t.primary} />
            <Text style={{ fontSize: 12, color: t.primary, fontFamily: 'Inter_600SemiBold' }}>Admin</Text>
          </TouchableOpacity>
        )}
        {mode === 'admin' && !sessionClosed && (
          <TouchableOpacity onPress={() => { setMode('ai'); setChatId(null); startAiChat(); }}>
            <Ionicons name="sparkles" size={22} color={t.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          mode === 'admin' ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Ionicons name="chatbubble-ellipses-outline" size={40} color={t.textMuted} />
              <Text style={[styles.emptyText, { color: t.textMuted, marginTop: 8 }]}>Menghubungkan dengan admin...</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          if (item.sender_type === 'ai') {
            return (
              <View style={styles.msgRow}>
                <View style={[styles.botAvatar, { backgroundColor: t.primary + '20' }]}>
                  <Ionicons name="sparkles" size={16} color={t.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={[styles.botBubble, { backgroundColor: t.surface, borderColor: t.border }]}>
                    <Text style={[styles.msgText, { color: t.text }]}>{item.message}</Text>
                  </View>
                </View>
              </View>
            );
          }
          const isMe = item.sender_type === 'therapist';
          return (
            <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
              <View style={[
                styles.msgBubble,
                isMe
                  ? { backgroundColor: t.primary, borderBottomRightRadius: 4 }
                  : { backgroundColor: t.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: t.border }
              ]}>
                <Text style={[styles.msgText, { color: isMe ? '#fff' : t.text }]}>{item.message}</Text>
                {item.created_at && (
                  <Text style={[styles.msgTime, { color: isMe ? 'rgba(255,255,255,0.6)' : t.textMuted }]}>
                    {new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                )}
              </View>
            </View>
          );
        }}
      />

      {/* Typing indicator */}
      {sending && mode === 'ai' && (
        <View style={[styles.msgRow, { paddingHorizontal: 16, paddingBottom: 4 }]}>
          <View style={[styles.botAvatar, { backgroundColor: t.primary + '20' }]}>
            <Ionicons name="sparkles" size={16} color={t.primary} />
          </View>
          <View style={[styles.botBubble, { backgroundColor: t.surface, borderColor: t.border, paddingHorizontal: 16, paddingVertical: 12 }]}>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <View style={[styles.typingDot, { backgroundColor: t.textMuted }]} />
              <View style={[styles.typingDot, { backgroundColor: t.textMuted, opacity: 0.6 }]} />
              <View style={[styles.typingDot, { backgroundColor: t.textMuted, opacity: 0.3 }]} />
            </View>
          </View>
        </View>
      )}

      {/* Input */}
      {mode === 'admin' && sessionClosed ? (
        <View style={[styles.closedBar, { borderTopColor: t.border }]}>
          <Text style={{ color: t.textMuted, textAlign: 'center', fontSize: 13 }}>Sesi chat telah ditutup oleh admin</Text>
        </View>
      ) : (
        <View style={[styles.inputBar, { borderTopColor: t.border, backgroundColor: t.background, paddingBottom: insets.bottom + 12 }]}>
          <TextInput
            style={[styles.input, { backgroundColor: t.surface, color: t.text, borderColor: t.border }]}
            placeholder={mode === 'ai' ? 'Tanya apa saja...' : 'Ketik pesan...'}
            placeholderTextColor={t.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!input.trim() || sending}
            style={[styles.sendBtn, { backgroundColor: t.primary, opacity: !input.trim() || sending ? 0.5 : 1 }]}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      )}

      {AlertComponent}
    </KeyboardAvoidingView>
  );
}

const getStyles = (t: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12 },
  title: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  subtitle: { fontSize: 12, marginTop: 1 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  msgRow: { marginBottom: 12, flexDirection: 'row' },
  msgRowMe: { justifyContent: 'flex-end' },
  msgRowOther: { justifyContent: 'flex-start' },
  msgBubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  msgText: { fontSize: 14, lineHeight: 20 },
  msgTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingTop: 8, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, maxHeight: 100, borderWidth: 1 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  closedBar: { padding: 16, borderTopWidth: 1 },
  botAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 8, marginTop: 2 },
  botBubble: { borderRadius: 18, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1 },
  typingDot: { width: 8, height: 8, borderRadius: 4 },
});
