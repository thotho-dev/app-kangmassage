import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image, StatusBar, Linking, Modal, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/Theme';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export default function ChatDetailScreen() {
  const { id: conversationId } = useLocalSearchParams();
  const { theme, isDark } = useTheme();
  const { profile } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();

  const [messages, setMessages] = useState<any[]>([]);
  const [conversation, setConversation] = useState<any>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [hasActiveOrder, setHasActiveOrder] = useState(true);
  
  // Attachments & Quick Responses States
  const [attachModalVisible, setAttachModalVisible] = useState(false);
  const [templatesModalVisible, setTemplatesModalVisible] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        fetchConversation();
        fetchMessages();
        markAsRead();
        checkActiveOrder(user.id);
      }
    };
    init();
  }, [conversationId]);

  const checkActiveOrder = async (uid: string) => {
    try {
      // Dapatkan internal user ID
      const { data: u } = await supabase.from('users').select('id').eq('supabase_uid', uid).single();
      if (!u) return;

      // Dapatkan therapist_id dari conversation
      const { data: conv } = await supabase.from('conversations').select('therapist_id').eq('id', conversationId).single();
      if (!conv) return;

      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', u.id)
        .eq('therapist_id', conv.therapist_id)
        .not('status', 'in', '("completed","cancelled")');
      
      setHasActiveOrder((count || 0) > 0);
    } catch (e) {
      console.error('Error checking active order:', e);
    }
  };

  useEffect(() => {
    if (conversationId) {
      const unsubscribe = subscribeToMessages();
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [conversationId]);

  const fetchConversation = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*, therapist:therapists(full_name, avatar_url, phone)')
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
        .update({ user_unread_count: 0 })
        .eq('id', conversationId);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        setMessages((prev: any[]) => {
          if (prev.find((m: any) => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
        markAsRead();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendDirectMessage = async (text: string) => {
    if (!userId || !conversation) return;
    try {
      const { data: msgData, error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          sender_type: 'user',
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
          therapist_unread_count: (conversation.therapist_unread_count || 0) + 1
        })
        .eq('id', conversationId);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleSendTemplate = async (templateText: string) => {
    setTemplatesModalVisible(false);
    await sendDirectMessage(templateText);
  };

  const handleSendLocation = async () => {
    setAttachModalVisible(false);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Izin Diperlukan', 'Izin lokasi diperlukan untuk mengirim lokasi terkini.');
        return;
      }
      
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const mapUrl = `📍 Lokasi Terkini Saya:\nhttps://www.google.com/maps?q=${loc.coords.latitude},${loc.coords.longitude}`;
      await sendDirectMessage(mapUrl);
    } catch (e) {
      console.error('Error sharing location:', e);
      showAlert('Gagal', 'Gagal mengambil lokasi terkini.');
    }
  };

  const handleSendPhoto = () => {
    setAttachModalVisible(false);
    setUploadingImage(true);
    setUploadProgress(10);
    
    let progress = 10;
    const interval = setInterval(() => {
      progress += 30;
      if (progress >= 100) {
        clearInterval(interval);
        setUploadProgress(100);
        setTimeout(async () => {
          setUploadingImage(false);
          const mockImgUrl = `📷 [Foto Terkirim] https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=600`;
          await sendDirectMessage(mockImgUrl);
        }, 500);
      } else {
        setUploadProgress(progress);
      }
    }, 300);
  };

  const handleSend = async () => {
    if (!inputText.trim() || !userId || !conversation || sending) return;

    const text = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      await sendDirectMessage(text);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.sender_type === 'user';
    return (
      <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.otherMessageRow]}>
        {!isMe && (
          conversation?.therapist?.avatar_url ? (
            <Image source={{ uri: conversation.therapist.avatar_url }} style={styles.bubbleAvatar} />
          ) : (
            <View style={[styles.bubbleAvatar, { backgroundColor: COLORS.primary[500] + '20' }]}>
              <Text style={[styles.avatarLetter, { color: COLORS.primary[500] }]}>
                {conversation?.therapist?.full_name?.[0]?.toUpperCase() || 'T'}
              </Text>
            </View>
          )
        )}

        <View style={[
          styles.bubble, 
          isMe ? styles.myBubble : styles.otherBubble,
          isMe ? { marginRight: 8 } : { marginLeft: 8 },
          { backgroundColor: isMe ? COLORS.primary[500] : (isDark ? '#1E293B' : '#F1F5F9') }
        ]}>
          <Text style={[styles.messageText, { color: isMe ? '#FFFFFF' : theme.text }]}>
            {item.content}
          </Text>
          <Text style={[styles.timeText, { color: isMe ? 'rgba(255,255,255,0.7)' : theme.textSecondary }]}>
            {format(new Date(item.created_at), 'HH:mm')}
          </Text>
        </View>

        {isMe && (
          profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.bubbleAvatar} />
          ) : (
            <View style={[styles.bubbleAvatar, { backgroundColor: COLORS.primary[500] + '20' }]}>
              <Text style={[styles.avatarLetter, { color: COLORS.primary[500] }]}>
                {profile?.full_name?.[0]?.toUpperCase() || 'U'}
              </Text>
            </View>
          )
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary[500]} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        
        {/* Header */}
        <SafeAreaView edges={['top']} style={{ backgroundColor: theme.surface }}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={28} color={theme.text} />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              {conversation?.therapist?.avatar_url ? (
                <Image source={{ uri: conversation.therapist.avatar_url }} style={styles.headerAvatar} />
              ) : (
                <View style={[styles.headerAvatar, { backgroundColor: COLORS.primary[500] + '20', alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ color: COLORS.primary[500], fontWeight: 'bold' }}>{conversation?.therapist?.full_name?.[0]}</Text>
                </View>
              )}
              <View>
                <Text style={[styles.headerName, { color: theme.text }]}>{conversation?.therapist?.full_name || 'Terapis'}</Text>
                <Text style={[styles.headerStatus, { color: COLORS.success }]}>Online</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.headerAction, !hasActiveOrder && { opacity: 0.3 }]}
              onPress={() => {
                if (!hasActiveOrder) return;
                if (conversation?.therapist?.phone) Linking.openURL(`tel:${conversation.therapist.phone}`);
              }}
              disabled={!hasActiveOrder}
            >
              <Ionicons name="call-outline" size={22} color={theme.text} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item: any) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Input */}
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: theme.surface }}>
          <View style={[styles.inputContainer, { borderTopColor: theme.border }]}>
            <TouchableOpacity 
              style={[styles.attachBtn, !hasActiveOrder && { opacity: 0.3 }]} 
              onPress={() => hasActiveOrder && setAttachModalVisible(true)}
              disabled={!hasActiveOrder}
            >
              <Ionicons name="add-circle-outline" size={28} color={theme.textSecondary} />
            </TouchableOpacity>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }, !hasActiveOrder && { opacity: 0.5 }]}
              placeholder={hasActiveOrder ? "Tulis pesan..." : "Chat dinonaktifkan"}
              placeholderTextColor={theme.textSecondary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              editable={hasActiveOrder}
            />
            <TouchableOpacity 
              style={[styles.sendBtn, { backgroundColor: inputText.trim() ? COLORS.primary[500] : theme.border }]} 
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

        {/* Attachment Bottom Sheet Modal */}
        <Modal
          visible={attachModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setAttachModalVisible(false)}
        >
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setAttachModalVisible(false)}
          >
            <View style={[styles.attachSheet, { backgroundColor: theme.surface }]}>
              <View style={[styles.dragIndicator, { backgroundColor: theme.border }]} />
              <Text style={[styles.sheetTitle, { color: theme.text }]}>Kirim Fitur Chat</Text>
              
              <View style={styles.sheetActions}>
                {/* Send Photo */}
                <TouchableOpacity style={styles.sheetActionItem} onPress={handleSendPhoto}>
                  <View style={[styles.sheetIconCircle, { backgroundColor: '#10B98115' }]}>
                    <Ionicons name="camera" size={24} color="#10B981" />
                  </View>
                  <Text style={[styles.sheetActionLabel, { color: theme.text }]}>Kirim Foto</Text>
                </TouchableOpacity>

                {/* Send Location */}
                <TouchableOpacity style={styles.sheetActionItem} onPress={handleSendLocation}>
                  <View style={[styles.sheetIconCircle, { backgroundColor: COLORS.primary[500] + '15' }]}>
                    <Ionicons name="location" size={24} color={COLORS.primary[500]} />
                  </View>
                  <Text style={[styles.sheetActionLabel, { color: theme.text }]}>Kirim Lokasi</Text>
                </TouchableOpacity>

                {/* Quick Templates */}
                <TouchableOpacity style={styles.sheetActionItem} onPress={() => {
                  setAttachModalVisible(false);
                  setTimeout(() => setTemplatesModalVisible(true), 300);
                }}>
                  <View style={[styles.sheetIconCircle, { backgroundColor: '#FDB92715' }]}>
                    <Ionicons name="chatbubbles" size={24} color="#FDB927" />
                  </View>
                  <Text style={[styles.sheetActionLabel, { color: theme.text }]}>Pesan Cepat</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={[styles.sheetCancelBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F1F5F9' }]}
                onPress={() => setAttachModalVisible(false)}
              >
                <Text style={[styles.sheetCancelText, { color: theme.text }]}>Batal</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Quick Templates Modal */}
        <Modal
          visible={templatesModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setTemplatesModalVisible(false)}
        >
          <View style={styles.templatesModalContainer}>
            <TouchableOpacity 
              style={styles.templatesBackdrop} 
              activeOpacity={1} 
              onPress={() => setTemplatesModalVisible(false)}
            />
            <View style={[styles.templatesBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.templatesHeader}>
                <Text style={[styles.templatesTitle, { color: theme.text }]}>Templat Balasan Cepat</Text>
                <TouchableOpacity onPress={() => setTemplatesModalVisible(false)}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>

              <FlatList
                data={[
                  "Halo, saya sudah berada di lokasi titik penjemputan/alamat Anda.",
                  "Tolong pijatannya lebih difokuskan di bagian bahu dan punggung ya.",
                  "Terima kasih banyak atas pelayanannya yang ramah dan sangat profesional!",
                  "Apakah Anda memerlukan petunjuk arah tambahan untuk sampai ke rumah saya?",
                  "Halo terapis, mohon ditunggu sebentar ya."
                ]}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={[styles.templateItem, { borderBottomColor: theme.border }]}
                    onPress={() => handleSendTemplate(item)}
                  >
                    <Ionicons name="flash-outline" size={16} color="#FDB927" style={{ marginRight: 8, marginTop: 2 }} />
                    <Text style={[styles.templateText, { color: theme.text }]}>{item}</Text>
                  </TouchableOpacity>
                )}
                contentContainerStyle={{ paddingBottom: 12 }}
              />
            </View>
          </View>
        </Modal>

        {/* Uploading Image Modal */}
        <Modal visible={uploadingImage} transparent animationType="fade">
          <View style={styles.uploadOverlay}>
            <View style={[styles.uploadBox, { backgroundColor: theme.surface }]}>
              <ActivityIndicator size="large" color={COLORS.primary[500]} />
              <Text style={[styles.uploadTitle, { color: theme.text }]}>Mengunggah Foto...</Text>
              <Text style={[styles.uploadProgressText, { color: theme.textSecondary }]}>{uploadProgress}%</Text>
              
              <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
                <View style={[styles.progressBarFill, { backgroundColor: COLORS.primary[500], width: `${uploadProgress}%` }]} />
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20 },
  headerName: { fontSize: 16, fontFamily: 'Inter-Bold' },
  headerStatus: { fontSize: 12, fontFamily: 'Inter-Regular' },
  headerAction: { padding: 8 },
  listContent: { padding: 16, gap: 12 },
  messageRow: { flexDirection: 'row', marginBottom: 4, alignItems: 'flex-end', gap: 8 },
  myMessageRow: { justifyContent: 'flex-end' },
  otherMessageRow: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '75%', padding: 12, borderRadius: 16 },
  myBubble: { borderBottomRightRadius: 4 },
  otherBubble: { borderBottomLeftRadius: 4 },
  messageText: { fontSize: 14, fontFamily: 'Inter-Regular' },
  timeText: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
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
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  bubbleAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
  },
  
  /* Attachment Modal Styles */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  attachSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    alignItems: 'center',
  },
  dragIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    marginBottom: 20,
  },
  sheetActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 24,
  },
  sheetActionItem: {
    alignItems: 'center',
    gap: 8,
  },
  sheetIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetActionLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
  },
  sheetCancelBtn: {
    width: '100%',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  sheetCancelText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },

  /* Templates Modal Styles */
  templatesModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  templatesBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  templatesBox: {
    width: '100%',
    maxHeight: '70%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  templatesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  templatesTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
  },
  templateItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  templateText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
  },

  /* Image Uploading Modal Styles */
  uploadOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBox: {
    width: '80%',
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
  },
  uploadTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    marginTop: 16,
  },
  uploadProgressText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    marginTop: 4,
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});
