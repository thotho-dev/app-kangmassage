import { useEffect, useState } from 'react';
import { useThemeColors, useThemeStore } from '../../store/themeStore';
import { useTherapistStore } from '../../store/therapistStore';
import { supabase } from '../../lib/supabase';

import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator, RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/Theme';

const STATUS_COLOR: Record<string, string> = {
  pending: '#F97316',
  accepted: '#10B981',
  on_the_way: '#3B82F6',
  arrived: '#8B5CF6',
  in_progress: '#06B6D4',
  completed: '#10B981',
  cancelled: '#EF4444',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Menunggu',
  accepted: 'Diterima',
  on_the_way: 'Menuju Lokasi',
  arrived: 'Tiba',
  in_progress: 'Proses',
  completed: 'Selesai',
  cancelled: 'Batal',
};

export default function OrdersScreen() {
  const t = useThemeColors();
  const isDarkMode = useThemeStore(state => state.isDarkMode);
  const styles = getStyles(t);
  const { profile } = useTherapistStore();
  
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed'>('all');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [profile, activeTab]);

  const fetchOrders = async (isRefreshing = false) => {
    if (!profile) return;
    if (!isRefreshing) setLoading(true);
    
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          users (full_name, avatar_url, phone),
          services (name, duration_min)
        `)
        .eq('therapist_id', profile.id)
        .order('created_at', { ascending: false });

      if (activeTab === 'active') {
        query = query.in('status', ['pending', 'accepted', 'on_the_way', 'in_progress']);
      } else if (activeTab === 'completed') {
        query = query.eq('status', 'completed');
      }

      const { data, error } = await query;
      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders(true);
  };

  const handleAccept = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'accepted' })
        .eq('id', orderId);
      if (error) throw error;
      fetchOrders();
    } catch (error) {
      console.error('Error accepting order:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: t.headerBg, borderBottomWidth: 1, borderBottomColor: t.border }]}>
        <Text style={[styles.title, { color: t.text }]}>Pesanan</Text>
        <View style={[styles.tabs, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)' }]}>
          {(['all', 'active', 'completed'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && { backgroundColor: t.background }]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, { color: activeTab === tab ? t.text : (isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)') }]}>
                {tab === 'all' ? 'Semua' : tab === 'active' ? 'Aktif' : 'Selesai'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scroll} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.primary} />}
      >
        {loading ? (
          <View style={{ paddingTop: 100 }}>
            <ActivityIndicator size="large" color={t.primary} />
          </View>
        ) : orders.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 100 }}>
            <Ionicons name="bag-outline" size={64} color={t.textMuted} />
            <Text style={{ ...TYPOGRAPHY.body, color: t.textMuted, marginTop: 16 }}>Belum ada pesanan</Text>
          </View>
        ) : (
          orders.map(order => (
            <TouchableOpacity
              key={order.id}
              style={styles.orderCard}
              onPress={() => router.push(`/orders/${order.id}`)}
              activeOpacity={0.85}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.avatar, { backgroundColor: t.primary + '10' }]}>
                  <Text style={[styles.avatarText, { color: t.primary }]}>{(order.users?.full_name || '?')[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.customerName}>{order.users?.full_name || 'Pelanggan'}</Text>
                  <Text style={styles.serviceText}>{order.services?.name || 'Pijat Relaksasi'} · {order.services?.duration_min || 60} menit</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: (STATUS_COLOR[order.status] || t.textMuted) + '15' }]}>
                  <View style={[styles.badgeDot, { backgroundColor: STATUS_COLOR[order.status] || t.textMuted } ]} />
                  <Text style={[styles.badgeText, { color: STATUS_COLOR[order.status] || t.textMuted }]}>{STATUS_LABEL[order.status] || order.status}</Text>
                </View>
              </View>
  
              <View style={styles.divider} />
  
              <View style={styles.cardMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="location-outline" size={14} color={t.textMuted} />
                  <Text style={styles.metaText} numberOfLines={1}>{order.address || 'Alamat tidak tersedia'}</Text>
                </View>
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons name="navigate-outline" size={14} color={t.textMuted} />
                    <Text style={styles.metaText}>{order.distance || '1.2'} km</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={14} color={t.textMuted} />
                    <Text style={styles.metaText}>{new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                  <Text style={styles.price}>Rp {(order.total_price || 0).toLocaleString('id-ID')}</Text>
                </View>
              </View>
  
              {order.status === 'pending' && (
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.declineBtn}>
                    <Text style={styles.declineText}>Tolak</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.85} onPress={() => handleAccept(order.id)}>
                    <LinearGradient colors={['#10B981', '#059669']} style={styles.acceptBtn}>
                      <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                      <Text style={[styles.acceptText, { color: '#FFFFFF' }]}>Terima Pesanan</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const getStyles = (t: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  header: { 
    paddingHorizontal: SPACING.lg, paddingTop: 56, paddingBottom: SPACING.lg,
  },
  title: { ...TYPOGRAPHY.h2, marginBottom: SPACING.md },
  tabs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS.full, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: RADIUS.full, alignItems: 'center' },
  tabActive: { backgroundColor: t.background },
  tabText: { ...TYPOGRAPHY.bodySmall, color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter_600SemiBold' },
  tabTextActive: { color: t.text },
  scroll: { padding: SPACING.lg, paddingBottom: 100 },
  orderCard: { backgroundColor: t.surface, borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: t.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  avatar: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...TYPOGRAPHY.h4, fontFamily: 'Inter_700Bold' },
  customerName: { ...TYPOGRAPHY.bodySmall, color: t.text, fontFamily: 'Inter_700Bold' },
  serviceText: { ...TYPOGRAPHY.caption, color: t.textSecondary },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { ...TYPOGRAPHY.caption, fontFamily: 'Inter_700Bold' },
  divider: { height: 1, backgroundColor: t.border, marginVertical: SPACING.sm },
  cardMeta: { gap: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  metaText: { ...TYPOGRAPHY.caption, color: t.textSecondary, flex: 1 },
  price: { ...TYPOGRAPHY.bodySmall, color: t.text, fontFamily: 'Inter_700Bold', marginLeft: 'auto' },
  cardActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  declineBtn: { paddingVertical: 12, paddingHorizontal: SPACING.lg, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: t.border },
  declineText: { ...TYPOGRAPHY.bodySmall, color: t.textSecondary, fontFamily: 'Inter_600SemiBold' },
  acceptBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: RADIUS.full },
  acceptText: { ...TYPOGRAPHY.bodySmall, fontFamily: 'Inter_700Bold' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: t.surface, borderTopLeftRadius: RADIUS.xxl, borderTopRightRadius: RADIUS.xxl, padding: SPACING.xl, overflow: 'hidden' },
  modalGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.lg },
  modalIcon: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: t.secondary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 10 },
  modalPing: { backgroundColor: t.secondary + '15', borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: t.secondary + '30' },
  modalPingText: { ...TYPOGRAPHY.bodySmall, color: t.secondary, fontFamily: 'Inter_700Bold' },
  modalTitle: { ...TYPOGRAPHY.h2, color: t.text },
  modalService: { ...TYPOGRAPHY.body, color: t.textSecondary, marginBottom: SPACING.lg },
  modalInfo: { gap: SPACING.sm, marginBottom: SPACING.lg },
  modalInfoItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  modalInfoText: { ...TYPOGRAPHY.body, color: t.text, fontFamily: 'Inter_500Medium' },
  countdownBar: { height: 6, backgroundColor: t.background, borderRadius: 3, marginBottom: 8, overflow: 'hidden' },
  countdownFill: { height: '100%', borderRadius: 3 },
  countdownText: { ...TYPOGRAPHY.caption, color: t.textMuted, marginBottom: SPACING.lg, textAlign: 'center' },
  modalBtns: { flexDirection: 'row', gap: SPACING.sm },
  rejectBtn: { paddingVertical: 14, paddingHorizontal: SPACING.xl, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: t.border },
  rejectText: { ...TYPOGRAPHY.body, color: t.textSecondary, fontFamily: 'Inter_600SemiBold' },
  acceptModalBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: RADIUS.full },
  acceptModalText: { ...TYPOGRAPHY.body, fontFamily: 'Inter_700Bold' },
});
