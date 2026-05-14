import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { useThemeColors, useThemeStore } from '@/store/themeStore';
import { useTherapistStore } from '@/store/therapistStore';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/constants/Theme';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export default function ChatsScreen() {
  const t = useThemeColors();
  const isDarkMode = useThemeStore(state => state.isDarkMode);
  const { profile } = useTherapistStore();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const filteredChats = conversations.filter(chat => 
    chat.users?.full_name?.toLowerCase().includes(search.toLowerCase())
  );


  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={[styles.chatCard, { backgroundColor: t.surface, borderColor: t.border }]}
      activeOpacity={0.7}
      onPress={() => router.push(`/chats/${item.id}`)}
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
          <Text 
            numberOfLines={1} 
            style={[styles.lastMessage, { 
              color: item.therapist_unread_count > 0 ? t.text : t.textMuted, 
              fontFamily: item.therapist_unread_count > 0 ? 'Inter_600SemiBold' : 'Inter_400Regular' 
            }]}
          >
            {item.last_message || 'Belum ada pesan'}
          </Text>
          {item.therapist_unread_count > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: t.secondary }]}>
              <Text style={styles.unreadText}>{item.therapist_unread_count}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: t.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: t.headerBg, borderBottomWidth: 1, borderBottomColor: t.border }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: t.text }]}>Pesan</Text>
          <TouchableOpacity style={[styles.headerIcon, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)' }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 40,
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
  lastMessage: {
    flex: 1,
    fontSize: 13,
    marginRight: 10,
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
