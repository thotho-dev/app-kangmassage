import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image, Linking, Modal,
  ScrollView, Keyboard, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useThemeColors, useThemeStore } from '@/store/themeStore';
import { useTherapistStore } from '@/store/therapistStore';
import { supabase } from '@/lib/supabase';
import { API_URL } from '@/lib/config';
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
  
  // Attachments & Quick Responses States
  const [attachModalVisible, setAttachModalVisible] = useState(false);
  const [templatesModalVisible, setTemplatesModalVisible] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const keyboardBottom = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(show, (e) => {
      Animated.timing(keyboardBottom, {
        toValue: e.endCoordinates.height,
        duration: Platform.OS === 'ios' ? e.duration || 250 : 100,
        useNativeDriver: false,
      }).start();
    });
    const hideSub = Keyboard.addListener(hide, () => {
      Animated.timing(keyboardBottom, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? 250 : 100,
        useNativeDriver: false,
      }).start();
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  // Direct Message Sending via API (handles push notification + atomic unread)
  const sendDirectMessage = async (text: string) => {
    if (!profile || !conversation) return;
    try {
      const res = await fetch(`${API_URL}/api/chat/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          sender_id: profile.id,
          sender_type: 'therapist',
          content: text
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { message } = await res.json();
      return message;
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
        alert('Izin lokasi diperlukan untuk mengirim lokasi terkini.');
        return;
      }
      
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const addr = await Location.reverseGeocodeAsync(loc.coords);
      const address = addr?.[0] 
        ? [addr[0].street, addr[0].district, addr[0].city, addr[0].region].filter(Boolean).join(', ')
        : `${loc.coords.latitude.toFixed(6)}, ${loc.coords.longitude.toFixed(6)}`;
      const mapUrl = `📍 ${address}\nhttps://www.google.com/maps?q=${loc.coords.latitude},${loc.coords.longitude}`;
      await sendDirectMessage(mapUrl);
    } catch (e) {
      console.error('Error sharing location:', e);
      alert('Gagal mengambil lokasi terkini.');
    }
  };

  const handleSendPhoto = async () => {
    setAttachModalVisible(false);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Izin akses galeri diperlukan untuk mengirim foto.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsEditing: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const uri = result.assets[0].uri;
      setUploadingImage(true);
      setUploadProgress(10);

      // Upload to Supabase Storage
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `chat_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      setUploadProgress(40);

      const { data, error } = await supabase.storage
        .from('chat-images')
        .upload(fileName, blob, {
          contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
          upsert: true
        });

      if (error) {
        console.warn('Upload to storage failed, sending as link:', error.message);
        setUploadingImage(false);
        await sendDirectMessage(`📷 [Foto] ${uri}`);
        return;
      }

      setUploadProgress(75);

      const { data: { publicUrl } } = supabase.storage
        .from('chat-images')
        .getPublicUrl(fileName);

      setUploadProgress(100);
      setTimeout(async () => {
        setUploadingImage(false);
        await sendDirectMessage(`📷 [Foto] ${publicUrl}`);
      }, 300);
    } catch (e) {
      console.error('Error sending photo:', e);
      setUploadingImage(false);
      alert('Gagal mengirim foto.');
    }
  };

  useEffect(() => {
    if (conversationId && profile) {
      fetchConversation();
      fetchMessages();
      markAsRead();
      checkActiveOrder();
      return subscribeToMessages();
    }
  }, [conversationId, profile]);

  useEffect(() => {
    if (messages.length > 0) markMessagesAsRead();
  }, [messages]);

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

  const markMessagesAsRead = async () => {
    try {
      const unreadIds = messages.filter(m => m.sender_type !== 'therapist' && !m.is_read).map(m => m.id);
      if (unreadIds.length === 0) return;
      await supabase.from('messages').update({ is_read: true }).in('id', unreadIds);
      setMessages(prev => prev.map(m => unreadIds.includes(m.id) ? { ...m, is_read: true } : m));
      const { data: conv } = await supabase.from('conversations').select('last_message_sender').eq('id', conversationId).single();
      if (conv && conv.last_message_sender !== 'therapist') {
        await supabase.from('conversations').update({ last_message_is_read: true }).eq('id', conversationId);
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
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
        } else if (payload.eventType === 'UPDATE') {
          setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSend = async () => {
    if (!inputText.trim() || !profile || !conversation || sending) return;

    let text = inputText.trim();
    if (replyingTo) {
      const repliedContent = replyingTo.content?.replace(/^📷 \[Foto\] /, '').replace(/^📍 /, '');
      text = `> ${repliedContent}\n\n${text}`;
    }
    setInputText('');
    setReplyingTo(null);
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
    const isMe = item.sender_type === 'therapist';
    const isPhoto = item.content?.startsWith('📷 [Foto] ');
    const photoUrl = isPhoto ? item.content.replace('📷 [Foto] ', '') : null;
    const isLocation = item.content?.startsWith('📍');
    const locUrl = isLocation ? item.content?.split('\n')?.find((l: string) => l.startsWith('https://www.google.com/maps?q=')) : null;
    const locAddress = isLocation ? item.content?.replace('\n' + locUrl, '').replace('📍 ', '') : null;

    const isReply = item.content?.startsWith('> ');
    const replyQuote = isReply ? item.content?.split('\n\n')[0]?.replace('> ', '') : null;
    const mainContent = isReply ? item.content?.split('\n\n').slice(1).join('\n\n') : item.content;

    const isRead = item.is_read;

    return (
      <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.otherMessageRow]}>
        {!isMe && (
            conversation?.users?.avatar_url ? (
              <Image source={{ uri: conversation.users.avatar_url }} style={styles.bubbleAvatar} />
            ) : (
              <View style={[styles.bubbleAvatar, { backgroundColor: t.primary + '20' }]}>
                <Text style={[styles.avatarLetter, { color: t.primary }]}>
                  {conversation?.users?.full_name?.[0]?.toUpperCase() || 'C'}
                </Text>
              </View>
            )
          )}
          
          <TouchableOpacity
            activeOpacity={0.8}
            onLongPress={() => { if (hasActiveOrder) setReplyingTo(item); }}
            delayLongPress={400}
            style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble, isMe ? { marginRight: 8 } : { marginLeft: 8 }]}
          >
            {replyQuote && (
              <View style={[styles.replyQuote, { borderLeftColor: isMe ? 'rgba(255,255,255,0.6)' : t.primary }]}>
                <Text style={[styles.replyQuoteText, { color: isMe ? 'rgba(255,255,255,0.8)' : t.textMuted }]} numberOfLines={2}>
                  {replyQuote}
                </Text>
              </View>
            )}
            {isPhoto && photoUrl ? (
              <TouchableOpacity onPress={() => setSelectedImage(photoUrl)}>
                <Image source={{ uri: photoUrl }} style={styles.photoMessage} resizeMode="cover" />
              </TouchableOpacity>
            ) : isLocation && locUrl ? (
              <View>
                <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText, { marginBottom: 8 }]}>
                  {locAddress}
                </Text>
                <TouchableOpacity onPress={() => Linking.openURL(locUrl)} style={[styles.mapBtn, { backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : t.primary + '15' }]}>
                  <Ionicons name="map-outline" size={16} color={isMe ? '#FFFFFF' : t.primary} />
                  <Text style={[styles.mapBtnText, { color: isMe ? '#FFFFFF' : t.primary }]}>Lihat Google Maps</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
                {mainContent}
              </Text>
            )}
            <View style={styles.messageFooter}>
              <Text style={[styles.timeText, isMe ? styles.myTimeText : styles.otherTimeText]}>
                {format(new Date(item.created_at), 'HH:mm')}
              </Text>
              {isMe && (
                <Ionicons
                  name={isRead ? "checkmark-done" : "checkmark"}
                  size={14}
                  color={isRead ? t.success : t.textMuted}
                />
              )}
            </View>
          </TouchableOpacity>

          {isMe && (
            profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.bubbleAvatar} />
            ) : (
              <View style={[styles.bubbleAvatar, { backgroundColor: t.secondary + '20' }]}>
                <Text style={[styles.avatarLetter, { color: t.secondary }]}>
                  {profile?.full_name?.[0]?.toUpperCase() || 'T'}
                </Text>
              </View>
            )
          )}
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
      <View style={styles.container}>
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
        <Animated.View style={{ paddingBottom: keyboardBottom }}>
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: t.surface }}>
          {replyingTo && (
            <View style={[styles.replyBar, { backgroundColor: t.surface, borderTopColor: t.border }]}>
              <View style={[styles.replyBarLine, { backgroundColor: t.primary }]} />
              <View style={styles.replyBarContent}>
                <Text style={[styles.replyBarLabel, { color: t.primary }]}>Membalas</Text>
                <Text style={[styles.replyBarText, { color: t.textMuted }]} numberOfLines={1}>
                  {replyingTo.content?.replace(/^📷 \[Foto\] /, 'Foto').replace(/^📍 /, 'Lokasi')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setReplyingTo(null)} style={styles.replyBarClose}>
                <Ionicons name="close" size={20} color={t.textMuted} />
              </TouchableOpacity>
            </View>
          )}
          <View style={[styles.inputContainer, { borderTopColor: t.border }]}>
            <TouchableOpacity 
              style={[styles.attachBtn, !hasActiveOrder && { opacity: 0.3 }]} 
              onPress={() => hasActiveOrder && setAttachModalVisible(true)}
              disabled={!hasActiveOrder}
            >
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
              style={[styles.emojiBtn, !hasActiveOrder && { opacity: 0.3 }]}
              onPress={() => hasActiveOrder && setShowEmojiPicker(true)}
              disabled={!hasActiveOrder}
            >
              <Ionicons name="happy-outline" size={24} color={t.textMuted} />
            </TouchableOpacity>
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
        </Animated.View>

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
            <View style={[styles.attachSheet, { backgroundColor: t.surface }]}>
              <View style={[styles.dragIndicator, { backgroundColor: t.border }]} />
              <Text style={[styles.sheetTitle, { color: t.text }]}>Kirim Fitur Chat</Text>
              
              <View style={styles.sheetActions}>
                {/* Send Photo */}
                <TouchableOpacity style={styles.sheetActionItem} onPress={handleSendPhoto}>
                  <View style={[styles.sheetIconCircle, { backgroundColor: t.success + '15' }]}>
                    <Ionicons name="camera" size={24} color={t.success} />
                  </View>
                  <Text style={[styles.sheetActionLabel, { color: t.text }]}>Kirim Foto</Text>
                </TouchableOpacity>

                {/* Send Location */}
                <TouchableOpacity style={styles.sheetActionItem} onPress={handleSendLocation}>
                  <View style={[styles.sheetIconCircle, { backgroundColor: t.primary + '15' }]}>
                    <Ionicons name="location" size={24} color={t.primary} />
                  </View>
                  <Text style={[styles.sheetActionLabel, { color: t.text }]}>Kirim Lokasi</Text>
                </TouchableOpacity>

                {/* Quick Templates */}
                <TouchableOpacity style={styles.sheetActionItem} onPress={() => {
                  setAttachModalVisible(false);
                  setTimeout(() => setTemplatesModalVisible(true), 300);
                }}>
                  <View style={[styles.sheetIconCircle, { backgroundColor: t.secondary + '15' }]}>
                    <Ionicons name="chatbubbles" size={24} color={t.secondary} />
                  </View>
                  <Text style={[styles.sheetActionLabel, { color: t.text }]}>Pesan Cepat</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={[styles.sheetCancelBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : '#F1F5F9' }]}
                onPress={() => setAttachModalVisible(false)}
              >
                <Text style={[styles.sheetCancelText, { color: t.text }]}>Batal</Text>
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
            <View style={[styles.templatesBox, { backgroundColor: t.surface, borderColor: t.border }]}>
              <View style={styles.templatesHeader}>
                <Text style={[styles.templatesTitle, { color: t.text }]}>Templat Balasan Cepat</Text>
                <TouchableOpacity onPress={() => setTemplatesModalVisible(false)}>
                  <Ionicons name="close" size={24} color={t.text} />
                </TouchableOpacity>
              </View>

              <FlatList
                data={[
                  "Halo, saya terapis Kang Massage. Saya sedang dalam perjalanan menuju lokasi Anda.",
                  "Saya sudah sampai di depan lokasi/rumah Anda. Silakan kabari jika Anda sudah siap.",
                  "Permisi, bolehkah saya menanyakan detail patokan rumah atau nomor kamar/pintu Anda?",
                  "Pijatan selesai. Terima kasih banyak atas kepercayaan Anda. Semoga lekas bugar kembali!",
                  "Halo, apakah ada keluhan spesifik atau area tubuh yang ingin lebih difokuskan hari ini?"
                ]}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={[styles.templateItem, { borderBottomColor: t.border }]}
                    onPress={() => handleSendTemplate(item)}
                  >
                    <Ionicons name="flash-outline" size={16} color={t.secondary} style={{ marginRight: 8, marginTop: 2 }} />
                    <Text style={[styles.templateText, { color: t.text }]}>{item}</Text>
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
            <View style={[styles.uploadBox, { backgroundColor: t.surface }]}>
              <ActivityIndicator size="large" color={t.secondary} />
              <Text style={[styles.uploadTitle, { color: t.text }]}>Mengunggah Foto...</Text>
              <Text style={[styles.uploadProgressText, { color: t.textSecondary }]}>{uploadProgress}%</Text>
              
              <View style={[styles.progressBarBg, { backgroundColor: t.border }]}>
                <View style={[styles.progressBarFill, { backgroundColor: t.secondary, width: `${uploadProgress}%` }]} />
              </View>
            </View>
          </View>
        </Modal>

        {/* Fullscreen Image Modal */}
        <Modal visible={!!selectedImage} transparent animationType="fade" onRequestClose={() => setSelectedImage(null)}>
          <View style={styles.imageModalOverlay}>
            <TouchableOpacity style={styles.imageModalClose} onPress={() => setSelectedImage(null)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            {selectedImage && (
              <Image source={{ uri: selectedImage }} style={styles.imageModalFull} resizeMode="contain" />
            )}
          </View>
        </Modal>

        {/* Emoji Picker Modal */}
        <Modal transparent visible={showEmojiPicker} animationType="slide" onRequestClose={() => setShowEmojiPicker(false)}>
          <TouchableOpacity style={styles.emojiOverlay} activeOpacity={1} onPress={() => setShowEmojiPicker(false)}>
            <TouchableOpacity activeOpacity={1} style={[styles.emojiSheet, { backgroundColor: t.surface, borderColor: t.border }]}>
              <View style={[styles.dragIndicator, { backgroundColor: t.border }]} />
              <Text style={[styles.sheetTitle, { color: t.text }]}>Pilih Emoji</Text>
              <ScrollView contentContainerStyle={styles.emojiGrid}>
                {['😊','😂','❤️','👍','🔥','😍','🥰','😁','🙏','💪','✨','🎉','😢','😡','🤔','🙄','😴','🤗','🥺','😎','💯','👌','💕','😘','🤩','😭','😤','🤯','🥳','😏','😇','🤠','🤡','💀','👋','✌️','🤞','🖖','🤙','👀','🙈','🙉','🙊','💖','💗','💝','⭐','🌈','💧','💤'].map((emoji, idx) => (
                  <TouchableOpacity
                    key={`emoji-${idx}`}
                    style={styles.emojiItem}
                    onPress={() => {
                      setInputText(prev => prev + emoji);
                      setShowEmojiPicker(false);
                    }}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </View>
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
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 4,
  },
  readDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  replyQuote: {
    borderLeftWidth: 3,
    paddingLeft: 10,
    marginBottom: 6,
    paddingVertical: 4,
  },
  replyQuoteText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  photoMessage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  mapBtnText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  myMessageText: { color: '#FFFFFF' },
  otherMessageText: { color: t.text },
  timeText: { fontSize: 10 },
  myTimeText: { color: 'rgba(255,255,255,0.7)' },
  otherTimeText: { color: t.textMuted },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  replyBarLine: {
    width: 3,
    height: 32,
    borderRadius: 2,
  },
  replyBarContent: {
    flex: 1,
  },
  replyBarLabel: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
  },
  replyBarText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  replyBarClose: {
    padding: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  attachBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  emojiBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  bubbleAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  avatarLetter: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
  },
  
  /* Attachment Modal Styles */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  attachSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.lg,
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: 'Inter_700Bold',
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
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  sheetCancelBtn: {
    width: '100%',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  sheetCancelText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },

  /* Templates Modal Styles */
  templatesModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
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
    padding: SPACING.lg,
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
    fontFamily: 'Inter_700Bold',
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
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },

  /* Fullscreen Image Modal Styles */
  imageModalOverlay: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalClose: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  imageModalFull: {
    width: '100%',
    height: '100%',
  },

  /* Emoji Picker Styles */
  emojiOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  emojiSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 30,
    paddingTop: 12,
    maxHeight: 300,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 8,
  },
  emojiItem: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  emojiText: {
    fontSize: 24,
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
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    marginTop: 16,
  },
  uploadProgressText: {
    fontFamily: 'Inter_600SemiBold',
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
