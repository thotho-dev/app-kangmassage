import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '@/store/themeStore';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/constants/Theme';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTherapistStore } from '@/store/therapistStore';

const formatTime = (dateStr: string) => {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} jam lalu`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} hari lalu`;
  } catch {
    return '';
  }
};

const getNotifDetails = (type: string) => {
  switch (type) {
    case 'order_new':
    case 'order_accepted':
    case 'order_broadcast':
      return { icon: 'briefcase', color: '#3B82F6' }; // Blue
    case 'order_completed':
    case 'topup_success':
      return { icon: 'checkmark-circle', color: '#10B981' }; // Green
    case 'order_cancelled':
      return { icon: 'close-circle', color: '#EF4444' }; // Red
    case 'support_chat':
    case 'chat_message':
      return { icon: 'chatbubble-ellipses', color: '#3B82F6' }; // Blue
    default:
      return { icon: 'notifications', color: '#F97316' }; // Orange
  }
};

export default function NotificationsScreen() {
  const t = useThemeColors();
  const router = useRouter();
  const { profile, setUnreadNotifCount } = useTherapistStore();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    if (!profile) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('therapist_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const items = deduplicateNotifications(data || []);
      setNotifications(items);
      setUnreadNotifCount(items.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching therapist notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const deduplicateNotifications = (items: any[]) => {
    const seenChat = new Set<string>();
    const seenConv = new Set<string>();
    return items.filter(item => {
      if (item.type === 'support_chat') {
        const chatId = item.data?.chat_id;
        if (chatId) {
          if (seenChat.has(chatId)) return false;
          seenChat.add(chatId);
        }
      }
      if (item.type === 'chat_message') {
        const convId = item.data?.conversation_id;
        if (convId) {
          if (seenConv.has(convId)) return false;
          seenConv.add(convId);
        }
      }
      return true;
    });
  };

  // Refetch on screen focus
  useFocusEffect(
    useCallback(() => {
      if (profile?.id) fetchNotifications();
    }, [profile?.id])
  );

  // Realtime: new notification appears immediately
  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel(`notifications-${profile.id}-${Math.random().toString(36).substring(7)}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `therapist_id=eq.${profile.id}` },
        (payload) => {
          const newNotif = payload.new as any;
          setNotifications(prev => {
            let updated = [newNotif, ...prev];
            const key = newNotif.type === 'support_chat' ? newNotif.data?.chat_id
              : newNotif.type === 'chat_message' ? newNotif.data?.conversation_id
              : null;
            if (key) {
              const type = newNotif.type;
              updated = updated.filter((n, i) => i === 0 || !(n.type === type && (
                type === 'support_chat' ? n.data?.chat_id === key : n.data?.conversation_id === key
              )));
            }
            return updated;
          });
          if (!newNotif.is_read) {
            setUnreadNotifCount(useTherapistStore.getState().unreadNotifCount + 1);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    if (!profile || notifications.length === 0) return;
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('therapist_id', profile.id);

      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadNotifCount(0);
    } catch (error) {
      console.warn('Could not mark all therapist notifications as read:', error);
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadNotifCount(0);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: t.headerBg, borderBottomColor: t.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={t.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.text }]}>Notifikasi</Text>
        {notifications.some(n => !n.is_read) ? (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.settingsBtn}>
            <Ionicons name="checkmark-done" size={24} color={t.text} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={t.text} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[t.text]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="notifications-off-outline" size={64} color={t.textMuted} />
              <Text style={[styles.emptyTitle, { color: t.text }]}>Belum Ada Notifikasi</Text>
              <Text style={[styles.emptySubtitle, { color: t.textMuted }]}>Pemberitahuan terbaru akan muncul di sini.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const { icon, color } = getNotifDetails(item.type);
            const isUnread = !item.is_read;
            const handlePress = async () => {
              // Mark as read
              if (!item.is_read) {
                try {
                  await supabase.from('notifications').update({ is_read: true }).eq('id', item.id);
                } catch {}
                setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, is_read: true } : n));
                setUnreadNotifCount(Math.max(0, useTherapistStore.getState().unreadNotifCount - 1));
              }
              // Navigate
              const d = item.data || {};
              if (d.order_id) {
                router.push(`/orders/${d.order_id}`);
              } else if (d.topup_id) {
                router.push(`/profile/topup-detail?id=${d.topup_id}`);
              } else if (d.withdrawal_id) {
                router.push(`/profile/withdraw-detail?id=${d.withdrawal_id}`);
              } else if (item.type === 'support_chat' || d.chat_id) {
                router.push('/support/chat');
              } else if (item.type === 'chat_message') {
                router.push(`/chats/${d.conversation_id}`);
              } else if (item.type === 'topup_success') {
                router.push('/profile/topup-history');
              } else if (item.type === 'withdrawal_success' || item.type === 'withdrawal_failed') {
                router.push('/profile/withdraw-history');
              }
            };
            return (
              <TouchableOpacity onPress={handlePress} style={[
                styles.card, 
                { backgroundColor: t.surface, borderColor: isUnread ? color + '60' : t.border },
                isUnread && { borderWidth: 2.5 }
              ]}>
                <View style={[styles.iconWrap, { backgroundColor: color + '15' }]}>
                  <Ionicons name={icon as any} size={24} color={color} />
                </View>
                <View style={styles.content}>
                  <View style={styles.row}>
                    <Text style={[styles.title, { color: t.text }]} numberOfLines={1}>{item.title}</Text>
                    <Text style={[styles.time, { color: t.textMuted }]}>{formatTime(item.created_at)}</Text>
                  </View>
                  <Text style={[styles.message, { color: t.textSecondary }]}>{item.body}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  settingsBtn: { width: 40, height: 40, alignItems: 'flex-end', justifyContent: 'center' },
  headerTitle: { ...TYPOGRAPHY.h3, fontFamily: 'Inter_700Bold' },
  list: { padding: SPACING.lg, paddingBottom: 40 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  emptyTitle: { ...TYPOGRAPHY.h3, fontFamily: 'Inter_700Bold', marginTop: 16 },
  emptySubtitle: { ...TYPOGRAPHY.body, marginTop: 8, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: RADIUS.lg,
    marginBottom: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  content: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { ...TYPOGRAPHY.body, fontFamily: 'Inter_700Bold', flex: 1, marginRight: 8 },
  time: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  message: { ...TYPOGRAPHY.bodySmall, lineHeight: 18 },
});
