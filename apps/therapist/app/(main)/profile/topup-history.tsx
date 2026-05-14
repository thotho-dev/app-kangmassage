import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useThemeColors } from '@/store/themeStore';
import { useTherapistStore } from '@/store/therapistStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/constants/Theme';
import { supabase } from '@/lib/supabase';
import { format, addMinutes, isAfter, differenceInSeconds } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useAlert } from '@/components/CustomAlert';

const CANCEL_TIMEOUT_MINUTES = 5;

export default function TopupHistoryScreen() {
  const t = useThemeColors();
  const styles = getStyles(t);
  const router = useRouter();
  const { profile } = useTherapistStore();
  const { showAlert, AlertComponent } = useAlert();
  
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(new Date());

  // Update 'now' every second for countdown
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchHistory = async () => {
    if (!profile) return;
    try {
      const { data, error } = await supabase
        .from('therapist_topups')
        .select('*')
        .eq('therapist_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error: any) {
      console.error('Error fetching history:', error.message || error);
      showAlert('error', 'Gagal Memuat', 'Tidak dapat mengambil riwayat transaksi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (profile) {
      fetchHistory();
    }
  }, [profile]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const markAsFailed = async (id: string) => {
    try {
      await supabase.from('therapist_topups').update({ status: 'failed' }).eq('id', id);
      setHistory(prev => prev.map(h => h.id === id ? { ...h, status: 'failed' } : h));
    } catch (e) {
      console.error('Auto cancel error:', e);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'paid': return { color: t.success, bg: t.success + '15', label: 'Sukses' };
      case 'pending': return { color: t.warning, bg: t.warning + '15', label: 'Pending' };
      case 'failed': return { color: t.danger, bg: t.danger + '15', label: 'Gagal' };
      default: return { color: t.textSecondary, bg: t.border, label: status };
    }
  };

  const renderCountdown = (createdAt: string, id: string) => {
    const expiry = addMinutes(new Date(createdAt), CANCEL_TIMEOUT_MINUTES);
    const diff = differenceInSeconds(expiry, now);

    if (diff <= 0) {
      markAsFailed(id);
      return null;
    }

    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <View style={styles.container}>
      {AlertComponent}
      <View style={[styles.header, { backgroundColor: t.headerBg, borderBottomWidth: 1, borderBottomColor: t.border }]}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={t.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.text }]}>Riwayat Top Up</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.secondary} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color={t.primary} style={{ marginTop: 40 }} />
        ) : history.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: t.surface }]}>
              <Ionicons name="receipt-outline" size={48} color={t.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Belum ada riwayat</Text>
            <Text style={styles.emptySub}>Transaksi top up Anda akan muncul di sini.</Text>
          </View>
        ) : (
          history.map((item) => {
            const status = getStatusStyle(item.status);
            const isPending = item.status === 'pending';
            
            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={[styles.iconBox, { backgroundColor: t.background }]}>
                    <Ionicons name="wallet-outline" size={20} color={t.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.amount}>+ Rp {item.amount.toLocaleString('id-ID')}</Text>
                    <Text style={styles.date}>
                      {format(new Date(item.created_at), 'dd MMM yyyy, HH:mm', { locale: localeId })}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                  </View>
                </View>
                
                <View style={styles.cardBottom}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>ID Transaksi</Text>
                    <Text style={styles.detailValue}>{item.external_id?.split('-')[1] || item.id.slice(0,8)}</Text>
                  </View>
                  {item.payment_method && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Metode</Text>
                      <Text style={[styles.detailValue, { textTransform: 'uppercase' }]}>{item.payment_method.replace('_', ' ')}</Text>
                    </View>
                  )}
                </View>

                {isPending && (
                  <View style={styles.timerContainer}>
                    <Ionicons name="time-outline" size={14} color={t.danger} />
                    <Text style={styles.timerText}>
                      Batal otomatis dalam <Text style={{ fontWeight: 'bold' }}>{renderCountdown(item.created_at, item.id)}</Text>
                    </Text>
                  </View>
                )}

                {isPending && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: t.secondary, borderColor: t.secondary, flex: 1 }]} 
                      onPress={() => router.push({
                        pathname: '/profile/payment-details',
                        params: { data: JSON.stringify(item.payment_data) }
                      })}
                      disabled={!item.payment_data}
                    >
                      <Text style={[styles.actionText, { color: '#FFFFFF' }]}>Lanjut Bayar</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const getStyles = (t: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: 30, paddingBottom: SPACING.lg },
  backBtn: { padding: 4 },
  headerTitle: { ...TYPOGRAPHY.h4, fontFamily: 'Inter_700Bold' },
  scroll: { padding: SPACING.lg, paddingBottom: 40 },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyIcon: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg },
  emptyTitle: { ...TYPOGRAPHY.h4, color: t.text, marginBottom: 8 },
  emptySub: { ...TYPOGRAPHY.bodySmall, color: t.textMuted, textAlign: 'center' },
  card: { backgroundColor: t.surface, borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: t.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: SPACING.md },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  amount: { ...TYPOGRAPHY.body, color: t.text, fontFamily: 'Inter_700Bold' },
  date: { ...TYPOGRAPHY.caption, color: t.textMuted },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  statusText: { ...TYPOGRAPHY.caption, fontFamily: 'Inter_700Bold' },
  cardBottom: { borderTopWidth: 1, borderTopColor: t.border, paddingTop: SPACING.sm, gap: 4 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { ...TYPOGRAPHY.caption, color: t.textMuted },
  detailValue: { ...TYPOGRAPHY.caption, color: t.textSecondary, fontFamily: 'Inter_600SemiBold' },
  timerContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: t.danger + '10', padding: 8, borderRadius: 8 },
  timerText: { fontSize: 12, color: t.danger },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: SPACING.md, borderTopWidth: 1, borderTopColor: t.border, paddingTop: SPACING.md },
  actionBtn: { paddingVertical: 12, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  actionText: { ...TYPOGRAPHY.bodySmall, fontFamily: 'Inter_700Bold' },
});

