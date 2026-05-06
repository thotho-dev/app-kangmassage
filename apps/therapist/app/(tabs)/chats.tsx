import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput } from 'react-native';
import { useThemeColors } from '../../store/themeStore';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/Theme';
import { LinearGradient } from 'expo-linear-gradient';

const MOCK_CHATS = [
  {
    id: '1',
    name: 'Siti Rahayu',
    lastMessage: 'Mas, sudah sampai mana ya? Saya sudah di lokasi.',
    time: '10:30',
    unread: 2,
    online: true,
    avatar: 'https://i.pravatar.cc/150?u=siti',
  },
  {
    id: '2',
    name: 'Budi Santoso',
    lastMessage: 'Terima kasih mas, pijatannya enak sekali.',
    time: 'Kemarin',
    unread: 0,
    online: false,
    avatar: 'https://i.pravatar.cc/150?u=budi',
  },
  {
    id: '3',
    name: 'Anisa Putri',
    lastMessage: 'Bisa minta tolong bawakan aromaterapi yang lavender?',
    time: 'Kemarin',
    unread: 0,
    online: true,
    avatar: 'https://i.pravatar.cc/150?u=anisa',
  },
];

export default function ChatsScreen() {
  const t = useThemeColors();
  const [search, setSearch] = useState('');

  const renderItem = ({ item }: { item: typeof MOCK_CHATS[0] }) => (
    <TouchableOpacity 
      style={[styles.chatCard, { backgroundColor: t.surface, borderColor: t.border }]}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
        {item.online && <View style={[styles.onlineBadge, { borderColor: t.surface }]} />}
      </View>
      
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={[styles.name, { color: t.text }]}>{item.name}</Text>
          <Text style={[styles.time, { color: t.textMuted }]}>{item.time}</Text>
        </View>
        
        <View style={styles.messageRow}>
          <Text 
            numberOfLines={1} 
            style={[styles.lastMessage, { color: item.unread > 0 ? t.text : t.textMuted, fontFamily: item.unread > 0 ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}
          >
            {item.lastMessage}
          </Text>
          {item.unread > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: t.secondary }]}>
              <Text style={styles.unreadText}>{item.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: t.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: t.headerBg }]}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Pesan</Text>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="settings-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
          <Ionicons name="search-outline" size={20} color="rgba(255,255,255,0.6)" />
          <TextInput
            placeholder="Cari percakapan..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <FlatList
        data={MOCK_CHATS}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color={t.textMuted} />
            <Text style={[styles.emptyText, { color: t.textMuted }]}>Belum ada percakapan</Text>
          </View>
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
    paddingTop: 52,
    paddingHorizontal: SPACING.lg,
    paddingBottom: 24,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: '#fff',
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
