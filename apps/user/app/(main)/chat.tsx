import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, StatusBar, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, MessageSquare } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

const PURPLE = '#240080';
const BG = '#F5F5F7';
const TEXT_DARK = '#1A1A2E';
const TEXT_MUTED = '#6B7280';

export default function ChatScreen() {
  const router = useRouter();
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
    const channel = supabase.channel('user_conversations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('conversations')
        .select('*, therapist:therapists(full_name, avatar_url)')
        .eq('user_id', user.id)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      setChats(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat</Text>
        <TouchableOpacity style={styles.searchButton}>
          <Search size={20} color={TEXT_DARK} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator size="large" color={PURPLE} style={{ marginTop: 50 }} />
        ) : chats.length === 0 ? (
          <View style={styles.emptyState}>
            <MessageSquare size={64} color={TEXT_MUTED} />
            <Text style={styles.emptyTitle}>Belum Ada Chat</Text>
            <Text style={styles.emptySubtitle}>Pesan Anda dengan terapis akan muncul di sini.</Text>
          </View>
        ) : (
          chats.map((chat) => (
            <TouchableOpacity 
              key={chat.id} 
              style={styles.chatItem} 
              activeOpacity={0.7}
              onPress={() => router.push(`/chats/${chat.id}`)}
            >
              <Image 
                source={{ uri: chat.therapist?.avatar_url || 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400' }} 
                style={styles.avatar} 
              />
              
              <View style={styles.chatContent}>
                <View style={styles.chatHeader}>
                  <Text style={styles.chatName}>{chat.therapist?.full_name || 'Terapis'}</Text>
                  <Text style={styles.chatTime}>{formatTime(chat.last_message_at)}</Text>
                </View>
                
                <View style={styles.chatFooter}>
                  <Text style={styles.lastMessage} numberOfLines={1}>
                    {chat.last_message || 'Mulai percakapan'}
                  </Text>
                  {chat.user_unread_count > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{chat.user_unread_count}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: TEXT_DARK,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingVertical: 10,
  },
  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F5F5F7',
  },
  chatContent: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: TEXT_DARK,
  },
  chatTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: TEXT_MUTED,
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: TEXT_MUTED,
    flex: 1,
    marginRight: 10,
  },
  badge: {
    backgroundColor: PURPLE,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Inter-Bold',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: TEXT_DARK,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: TEXT_MUTED,
    marginTop: 8,
    textAlign: 'center',
  },
});
