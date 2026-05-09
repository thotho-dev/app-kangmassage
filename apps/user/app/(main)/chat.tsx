import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, MessageSquare } from 'lucide-react-native';

const PURPLE = '#240080';
const BG = '#F5F5F7';
const TEXT_DARK = '#1A1A2E';
const TEXT_MUTED = '#6B7280';

const CHATS = [
  {
    id: '1',
    name: 'Maya Putri (Terapis)',
    lastMessage: 'Halo Kak, saya sudah di depan ya.',
    time: '10:30',
    unread: 2,
    avatar: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400',
  },
  {
    id: '2',
    name: 'Admin Kang Massage',
    lastMessage: 'Voucher diskon 50% berhasil diklaim.',
    time: 'Kemarin',
    unread: 0,
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
  },
  {
    id: '3',
    name: 'Andi Terapis',
    lastMessage: 'Terima kasih atas rating bintang 5 nya!',
    time: '28 Apr',
    unread: 0,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
  },
];

export default function ChatScreen() {
  const router = useRouter();

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
        {CHATS.map((chat) => (
          <TouchableOpacity key={chat.id} style={styles.chatItem} activeOpacity={0.7}>
            <Image source={{ uri: chat.avatar }} style={styles.avatar} />
            
            <View style={styles.chatContent}>
              <View style={styles.chatHeader}>
                <Text style={styles.chatName}>{chat.name}</Text>
                <Text style={styles.chatTime}>{chat.time}</Text>
              </View>
              
              <View style={styles.chatFooter}>
                <Text style={styles.lastMessage} numberOfLines={1}>
                  {chat.lastMessage}
                </Text>
                {chat.unread > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{chat.unread}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {CHATS.length === 0 && (
          <View style={styles.emptyState}>
            <MessageSquare size={64} color={TEXT_MUTED} />
            <Text style={styles.emptyTitle}>Belum Ada Chat</Text>
            <Text style={styles.emptySubtitle}>Pesan Anda dengan terapis akan muncul di sini.</Text>
          </View>
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
