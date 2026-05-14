import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, StatusBar, ActivityIndicator, RefreshControl, TextInput, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, MessageSquare, ShieldCheck, Clock, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { COLORS } from '@/constants/Theme';

const PURPLE = '#240080';

export default function ChatScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const [chats, setChats] = useState<any[]>([]);
  const [activeOrderTherapists, setActiveOrderTherapists] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const searchAnim = useRef(new Animated.Value(0)).current;

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from('users').select('id').eq('supabase_uid', user.id).single();
      if (!profile) return;

      const { data: activeOrders } = await supabase
        .from('orders')
        .select('therapist_id')
        .eq('user_id', profile.id)
        .not('status', 'in', '("completed","cancelled")');
      
      const activeIds = activeOrders?.map(o => o.therapist_id) || [];
      setActiveOrderTherapists(activeIds);

      const { data, error } = await supabase
        .from('conversations')
        .select('*, therapist:therapists(id, full_name, avatar_url)')
        .eq('user_id', profile.id)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      setChats(data || []);
    } catch (e) {
      console.error('Chat list error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Gunakan nama channel unik untuk menghindari error "callback after subscribe"
    const channelName = `user_conversations_${Math.random().toString(36).substring(7)}`;
    const channel = supabase.channel(channelName)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'conversations' 
      }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const toggleSearch = () => {
    if (isSearchVisible) {
      Animated.timing(searchAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start(() => {
        setIsSearchVisible(false);
        setSearchQuery('');
      });
    } else {
      setIsSearchVisible(true);
      Animated.timing(searchAnim, { toValue: 1, duration: 250, useNativeDriver: false }).start(() => {
        searchInputRef.current?.focus();
      });
    }
  };

  const filteredChats = chats.filter(chat => 
    chat.therapist?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.last_message?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        {!isSearchVisible ? (
          <View style={styles.headerTop}>
            <View>
              <Text style={[styles.headerTitle, { color: theme.text }]}>Pesan</Text>
              <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Komunikasi dengan terapis Anda</Text>
            </View>
            <TouchableOpacity 
              style={[styles.searchButton, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
              onPress={toggleSearch}
            >
              <Search size={20} color={theme.text} />
            </TouchableOpacity>
          </View>
        ) : (
          <Animated.View style={[styles.searchBar, { 
            opacity: searchAnim,
            transform: [{ translateY: searchAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }]
          }]}>
            <View style={[styles.searchInputWrapper, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
              <Search size={18} color={theme.textSecondary} style={{ marginLeft: 12 }} />
              <TextInput
                ref={searchInputRef}
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Cari pesan atau terapis..."
                placeholderTextColor={theme.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={18} color={theme.textSecondary} style={{ marginRight: 10 }} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={toggleSearch} style={styles.cancelSearch}>
              <Text style={{ color: PURPLE, fontFamily: 'Inter-SemiBold' }}>Batal</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PURPLE} />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={PURPLE} />
          </View>
        ) : filteredChats.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrapper}>
              <MessageSquare size={48} color={theme.textSecondary} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {searchQuery ? 'Hasil Tidak Ditemukan' : 'Belum Ada Percakapan'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              {searchQuery ? `Tidak ada pesan yang cocok dengan "${searchQuery}"` : 'Chat akan muncul di sini saat Anda mulai memesan layanan.'}
            </Text>
          </View>
        ) : (
          filteredChats.map((chat) => {
            const isActive = activeOrderTherapists.includes(chat.therapist_id);
            return (
              <TouchableOpacity 
                key={chat.id} 
                style={[styles.chatCard, { backgroundColor: theme.surface, borderColor: theme.border }]} 
                activeOpacity={0.7}
                onPress={() => router.push(`/chats/${chat.id}`)}
              >
                <View style={styles.avatarContainer}>
                  <Image 
                    source={{ uri: chat.therapist?.avatar_url || 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400' }} 
                    style={styles.avatar} 
                  />
                  {isActive && <View style={styles.onlineDot} />}
                </View>
                
                <View style={styles.chatInfo}>
                  <View style={styles.chatHeader}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                        {chat.therapist?.full_name || 'Terapis'}
                      </Text>
                      {isActive && (
                        <View style={styles.activeBadge}>
                          <Text style={styles.activeBadgeText}>AKTIF</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.time, { color: theme.textSecondary }]}>
                      {formatTime(chat.last_message_at)}
                    </Text>
                  </View>
                  
                  <View style={styles.messageRow}>
                    <Text 
                      numberOfLines={1} 
                      style={[
                        styles.lastMessage, 
                        { color: chat.user_unread_count > 0 ? theme.text : theme.textSecondary },
                        chat.user_unread_count > 0 && styles.unreadMessage
                      ]} 
                    >
                      {chat.last_message || 'Mulai percakapan...'}
                    </Text>
                    {chat.user_unread_count > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{chat.user_unread_count}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 15,
    paddingHorizontal: 20,
    paddingTop: 10,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: 'Inter-Bold',
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginTop: 2,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 10,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  cancelSearch: {
    paddingHorizontal: 4,
  },
  scrollContent: {
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    marginTop: 100,
    alignItems: 'center',
  },
  chatCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  onlineDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    marginRight: 6,
  },
  activeBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  activeBadgeText: {
    color: '#0369A1',
    fontSize: 8,
    fontFamily: 'Inter-Bold',
  },
  time: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    flex: 1,
    marginRight: 10,
  },
  unreadMessage: {
    fontFamily: 'Inter-SemiBold',
  },
  unreadBadge: {
    backgroundColor: PURPLE,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Inter-Bold',
  },
  emptyState: {
    marginTop: 120,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
});
