import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { useThemeColors, useThemeStore } from '@/store/themeStore';
import { useTherapistStore } from '@/store/therapistStore';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/constants/Theme';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAlert } from '@/components/CustomAlert';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export default function ChatsScreen() {
  const t = useThemeColors();
  const isDarkMode = useThemeStore(state => state.isDarkMode);
  const { profile } = useTherapistStore();
  const { showAlert } = useAlert();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sortBy, setSortBy] = useState<'latest' | 'unread'>('latest');
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  const fetchConversations = async (isRefreshing = false) => {
    if (!profile) return;
    if (!isRefreshing) setLoading(true);

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          users (id, full_name, avatar_url)
        `)
        .eq('therapist_id', profile.id)
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [profile])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations(true);
  };

  const markAllAsRead = async () => {
    try {
      const ids = conversations.filter(c => c.therapist_unread_count > 0).map(c => c.id);
      if (ids.length === 0) return;
      await supabase.from('conversations').update({ therapist_unread_count: 0 }).in('id', ids);
      setConversations(prev => prev.map(c => ({ ...c, therapist_unread_count: 0 })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const sortedChats = [...conversations].sort((a, b) => {
    if (sortBy === 'unread') {
      const aUnread = (a.therapist_unread_count || 0) > 0 ? 1 : 0;
      const bUnread = (b.therapist_unread_count || 0) > 0 ? 1 : 0;
      if (aUnread !== bUnread) return bUnread - aUnread;
    }
    return new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime();
  });

  const filteredChats = sortedChats.filter(chat => 
    chat.users?.full_name?.toLowerCase().includes(search.toLowerCase())
  );


  const handleDelete = (item: any) => {
    showAlert('warning', 'Hapus Percakapan', `Hapus percakapan dengan ${item.users?.full_name || 'Pelanggan'}?`, [
      { text: 'Batal', style: 'cancel', onPress: () => swipeableRefs.current.get(item.id)?.close() },
      { text: 'Hapus', style: 'destructive', onPress: () => confirmDelete(item) },
    ]);
  };

  const confirmDelete = (item: any) => {
    setConversations(prev => prev.filter(c => c.id !== item.id));
  };

  const renderRightActions = (item: any) => (
    <TouchableOpacity
      style={[styles.deleteAction, { backgroundColor: t.danger }]}
      activeOpacity={0.8}
      onPress={() => handleDelete(item)}
    >
      <Ionicons name="trash-outline" size={22} color="#fff" />
      <Text style={styles.deleteActionText}>Hapus</Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: any }) => (
    <Swipeable
      ref={(ref) => {
        if (ref) swipeableRefs.current.set(item.id, ref);
        else swipeableRefs.current.delete(item.id);
      }}
      renderRightActions={() => renderRightActions(item)}
      overshootRight={false}
    >
      <TouchableOpacity 
        style={[styles.chatCard, { backgroundColor: t.surface, borderColor: t.border }]}
        activeOpacity={0.7}
        onPress={() => router.push(`/(main)/chats/${item.id}`)}
      >
        <View style={styles.avatarContainer}>
          {item.users?.avatar_url ? (
            <Image source={{ uri: item.users.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: t.primary + '20', alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ color: t.primary, fontWeight: 'bold' }}>{item.users?.full_name?.[0]}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={[styles.name, { color: t.text }]}>{item.users?.full_name || 'Pelanggan'}</Text>
            <Text style={[styles.time, { color: t.textMuted }]}>
              {item.last_message_at ? format(new Date(item.last_message_at), 'HH:mm', { locale: localeId }) : ''}
            </Text>
          </View>
          
          <View style={styles.messageRow}>
            <View style={styles.messageRowLeft}>
              {item.last_message_sender === 'therapist' && (
                <Ionicons
                  name={item.last_message_is_read ? "checkmark-done" : "checkmark"}
                  size={14}
                  color={item.last_message_is_read ? t.success : t.textMuted}
                  style={{ marginRight: 4 }}
                />
              )}
              <Text 
                numberOfLines={1} 
                style={[styles.lastMessage, { 
                  color: item.therapist_unread_count > 0 ? t.text : t.textMuted, 
                  fontFamily: item.therapist_unread_count > 0 ? 'Inter_600SemiBold' : 'Inter_400Regular' 
                }]}
              >
                {item.last_message || 'Belum ada pesan'}
              </Text>
            </View>
            {item.therapist_unread_count > 0 && (
              <View style={[styles.unreadBadge, { backgroundColor: t.secondary }]}>
                <Text style={styles.unreadText}>{item.therapist_unread_count}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: t.headerBg, borderBottomWidth: 1, borderBottomColor: t.border }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: t.text }]}>Pesan</Text>
          <TouchableOpacity
            style={[styles.headerIcon, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)' }]}
            onPress={() => setShowSettings(true)}
          >
            <Ionicons name="settings-outline" size={22} color={t.text} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.05)' }]}>
          <Ionicons name="search-outline" size={20} color={t.textMuted} />
          <TextInput
            placeholder="Cari percakapan..."
            placeholderTextColor={t.textMuted}
            style={[styles.searchInput, { color: t.text }]}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <FlatList
        data={filteredChats}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.primary} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="small" color={t.primary} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color={t.textMuted} />
              <Text style={[styles.emptyText, { color: t.textMuted }]}>Belum ada percakapan</Text>
            </View>
          )
        }
      />
      {/* Settings Modal */}
      <Modal transparent visible={showSettings} animationType="none" onRequestClose={() => setShowSettings(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSettings(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.settingsSheet, { backgroundColor: t.surface, borderColor: t.border }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: t.text }]}>Pengaturan Pesan</Text>

            <TouchableOpacity style={styles.sheetRow} onPress={() => { markAllAsRead(); setShowSettings(false); }}>
              <Ionicons name="checkmark-done" size={22} color={t.primary} />
              <Text style={[styles.sheetRowText, { color: t.text }]}>Tandai Semua Dibaca</Text>
            </TouchableOpacity>

            <View style={[styles.sheetDivider, { backgroundColor: t.border }]} />

            <Text style={[styles.sheetLabel, { color: t.textMuted }]}>Urutkan</Text>
            <TouchableOpacity
              style={styles.sheetRow}
              onPress={() => { setSortBy('latest'); setShowSettings(false); }}
            >
              <Ionicons name={sortBy === 'latest' ? 'radio-button-on' : 'radio-button-off'} size={22} color={t.primary} />
              <Text style={[styles.sheetRowText, { color: t.text }]}>Terbaru</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetRow}
              onPress={() => { setSortBy('unread'); setShowSettings(false); }}
            >
              <Ionicons name={sortBy === 'unread' ? 'radio-button-on' : 'radio-button-off'} size={22} color={t.primary} />
              <Text style={[styles.sheetRowText, { color: t.text }]}>Belum Dibaca</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 46,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    color: '#fff',
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: 100,
  },
  chatCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
  },
  chatInfo: {
    flex: 1,
    marginLeft: 14,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    ...TYPOGRAPHY.body,
    fontFamily: 'Inter_700Bold',
  },
  time: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  lastMessage: {
    flex: 1,
    fontSize: 13,
  },
  unreadBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
  },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: 12,
    marginLeft: 8,
    borderRadius: 16,
  },
  deleteActionText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  settingsSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(150,150,150,0.3)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    ...TYPOGRAPHY.h3,
    marginBottom: 20,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  sheetRowText: {
    ...TYPOGRAPHY.body,
    fontFamily: 'Inter_500Medium',
  },
  sheetDivider: {
    height: 1,
    marginVertical: 8,
  },
  sheetLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyText: {
    marginTop: 16,
    ...TYPOGRAPHY.body,
  },
});
