import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useThemeColors, useThemeStore } from '@/store/themeStore';
import { useTherapistStore } from '@/store/therapistStore';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/constants/Theme';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export default function ChatDetailScreen() {
  const { id: conversationId } = useLocalSearchParams();
  const t = useThemeColors();
  const isDarkMode = useThemeStore(state => state.isDarkMode);
  const { profile } = useTherapistStore();
  const router = useRouter();
  const styles = getStyles(t);

  const [messages, setMessages] = useState<any[]>([]);
  const [conversation, setConversation] = useState<any>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasActiveOrder, setHasActiveOrder] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (conversationId && profile) {
      fetchConversation();
      fetchMessages();
      markAsRead();
      checkActiveOrder();
      return subscribeToMessages();
    }
  }, [conversationId, profile]);

  const checkActiveOrder = async () => {
    if (!profile) return;
    try {
      const { data: conv } = await supabase.from('conversations').select('user_id').eq('id', conversationId).single();
      if (!conv) return;

      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', conv.user_id)
        .eq('therapist_id', profile.id)
        .not('status', 'in', '("completed","cancelled")');
      
      setHasActiveOrder((count || 0) > 0);
    } catch (e) {
      console.error('Error checking active order:', e);
    }
  };

  const fetchConversation = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*, users (full_name, avatar_url, phone)')
        .eq('id', conversationId)
        .single();
      if (error) throw error;
      setConversation(data);
    } catch (error) {
      console.error('Error fetching conversation:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      await supabase
        .from('conversations')
        .update({ therapist_unread_count: 0 })
        .eq('id', conversationId);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setMessages(prev => {
            if (prev.find(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
          markAsRead();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSend = async () => {
    if (!inputText.trim() || !profile || !conversation || sending) return;

    const text = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const { data: msgData, error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: profile.id,
          sender_type: 'therapist',
          content: text
        })
        .select()
        .single();

      if (msgError) throw msgError;

      // Update conversation last message
      await supabase
        .from('conversations')
        .update({
          last_message: text,
          last_message_at: new Date().toISOString(),
          user_unread_count: (conversation.user_unread_count || 0) + 1
        })
        .eq('id', conversationId);

    } catch (error) {
      console.error('Error sending message:', error);
      // Restore text if failed? Maybe just show error
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.sender_type === 'therapist';
    return (
      <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.otherMessageRow]}>
        <View style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}>
          <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
            {item.content}
          </Text>
          <Text style={[styles.timeText, isMe ? styles.myTimeText : styles.otherTimeText]}>
            {format(new Date(item.created_at), 'HH:mm')}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={t.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.background }}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <SafeAreaView edges={['top']} style={{ backgroundColor: t.headerBg }}>
          <View style={[styles.header, { borderBottomWidth: 1, borderBottomColor: t.border }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={t.text} />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              {conversation?.users?.avatar_url ? (
                <Image source={{ uri: conversation.users.avatar_url }} style={styles.headerAvatar} />
              ) : (
                <View style={[styles.headerAvatar, { backgroundColor: t.primary + '20', alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ color: t.primary, fontWeight: 'bold' }}>{conversation?.users?.full_name?.[0]}</Text>
                </View>
              )}
              <View>
                <Text style={[styles.headerName, { color: t.text }]}>{conversation?.users?.full_name || 'Pelanggan'}</Text>
                <Text style={[styles.headerStatus, { color: t.success }]}>Online</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.headerAction, !hasActiveOrder && { opacity: 0.3 }]}
              onPress={() => {
                if (!hasActiveOrder) return;
                if (conversation?.users?.phone) Linking.openURL(`tel:${conversation.users.phone}`);
              }}
              disabled={!hasActiveOrder}
            >
              <Ionicons name="call-outline" size={22} color={t.text} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Input */}
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: t.surface }}>
          <View style={[styles.inputContainer, { borderTopColor: t.border }]}>
            <TouchableOpacity style={styles.attachBtn}>
              <Ionicons name="add" size={24} color={t.textMuted} />
            </TouchableOpacity>
            <TextInput
              style={[styles.input, { color: t.text, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }, !hasActiveOrder && { opacity: 0.5 }]}
              placeholder={hasActiveOrder ? "Tulis pesan..." : "Chat dinonaktifkan"}
              placeholderTextColor={t.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              editable={hasActiveOrder}
            />
            <TouchableOpacity 
              style={[styles.sendBtn, { backgroundColor: inputText.trim() ? t.secondary : t.border }]} 
              onPress={handleSend}
              disabled={!inputText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const getStyles = (t: any) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20 },
  headerName: { ...TYPOGRAPHY.body, fontFamily: 'Inter_700Bold' },
  headerStatus: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  headerAction: { padding: 8 },
  listContent: { padding: SPACING.lg, gap: 12 },
  messageRow: { flexDirection: 'row', marginBottom: 4 },
  myMessageRow: { justifyContent: 'flex-end' },
  otherMessageRow: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 16 },
  myBubble: { backgroundColor: t.secondary, borderBottomRightRadius: 4 },
  otherBubble: { backgroundColor: t.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: t.border },
  messageText: { ...TYPOGRAPHY.bodySmall },
  myMessageText: { color: '#FFFFFF' },
  otherMessageText: { color: t.text },
  timeText: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  myTimeText: { color: 'rgba(255,255,255,0.7)' },
  otherTimeText: { color: t.textMuted },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 12,
    borderTopWidth: 1,
    gap: 10,
  },
  attachBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
