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
      return { icon: 'chatbubble-ellipses', color: '#3B82F6' }; // Blue
    default:
      return { icon: 'notifications', color: '#F97316' }; // Orange
  }
};

export default function NotificationsScreen() {
  const t = useThemeColors();
  const router = useRouter();
  const { profile } = useTherapistStore();
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
      setNotifications(deduplicateNotifications(data || []));
    } catch (error) {
      console.error('Error fetching therapist notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const deduplicateNotifications = (items: any[]) => {
    const seen = new Set<string>();
    return items.filter(item => {
      if (item.type === 'support_chat') {
        const chatId = item.data?.chat_id;
        if (chatId) {
          if (seen.has(chatId)) return false;
          seen.add(chatId);
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
      .channel('notifications')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `therapist_id=eq.${profile.id}` },
        (payload) => {
          const newNotif = payload.new as any;
          setNotifications(prev => {
            let updated = [newNotif, ...prev];
            if (newNotif.type === 'support_chat' && newNotif.data?.chat_id) {
              const chatId = newNotif.data.chat_id;
              updated = updated.filter((n, i) => i === 0 || !(n.type === 'support_chat' && n.data?.chat_id === chatId));
            }
            return updated;
          });
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
    } catch (error) {
      console.warn('Could not mark all therapist notifications as read:', error);
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
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
            const handlePress = () => {
              if (item.type === 'support_chat') {
                router.push('/support/chat');
              }
            };
            return (
              <TouchableOpacity onPress={handlePress} style={[
                styles.card, 
                { backgroundColor: t.surface, borderColor: isUnread ? color + '40' : t.border },
                isUnread && { borderWidth: 1.5 }
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
