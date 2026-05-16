import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useThemeColors } from '@/store/themeStore';
import { useTherapistStore } from '@/store/therapistStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/constants/Theme';
import { supabase } from '@/lib/supabase';
import { useAlert } from '@/components/CustomAlert';

interface Withdrawal {
  id: string;
  amount: number;
  fee: number;
  status: 'pending' | 'completed' | 'failed';
  bank_name: string;
  account_number: string;
  created_at: string;
  external_id: string;
}

export default function WithdrawHistoryScreen() {
  const t = useThemeColors();
  const styles = getStyles(t);
  const router = useRouter();
  const { profile } = useTherapistStore();
  const { showAlert, AlertComponent } = useAlert();

  const [history, setHistory] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    if (!profile?.id) return;
    try {
      const { data, error } = await supabase
        .from('therapist_withdrawals')
        .select('*')
        .eq('therapist_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching withdrawal history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [profile?.id])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return t.success;
      case 'pending': return t.warning;
      case 'failed': return t.danger;
      default: return t.textMuted;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Selesai';
      case 'pending': return 'Diproses';
      case 'failed': return 'Gagal';
      default: return status;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCancel = async (item: Withdrawal) => {
    if (item.status !== 'pending') return;

    showAlert('warning', 'Batalkan Penarikan?', 'Saldo akan dikembalikan ke dompet Anda.', [
      { text: 'Tidak', style: 'cancel' },
      { 
        text: 'Ya, Batalkan', 
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            // 1. Update Withdrawal Status
            const { error: wdError } = await supabase
              .from('therapist_withdrawals')
              .update({ status: 'failed', payment_data: { reason: 'Cancelled by therapist' } })
              .eq('id', item.id);

            if (wdError) throw wdError;

            // 2. Refund Balance
            const currentBalance = Number(profile?.wallet_balance) || 0;
            const refundAmount = Number(item.amount) + Number(item.fee);
            const newBalance = currentBalance + refundAmount;

            const { error: tError } = await supabase
              .from('therapists')
              .update({ wallet_balance: newBalance })
              .eq('id', profile?.id);

            if (tError) throw tError;

            // 3. Create Transaction Record
            await supabase.from('transactions').insert({
              therapist_id: profile?.id,
              type: 'credit',
              amount: refundAmount,
              balance_before: currentBalance,
              balance_after: newBalance,
              description: `Batal: Penarikan Saldo (${item.bank_name})`,
              metadata: { withdrawal_id: item.id, type: 'cancellation' }
            });

            showAlert('success', 'Berhasil', 'Penarikan telah dibatalkan dan saldo dikembalikan.');
            fetchHistory();
            useTherapistStore.getState().fetchProfile(); // Refresh global balance
          } catch (error: any) {
            showAlert('error', 'Gagal', error.message || 'Terjadi kesalahan saat membatalkan');
          } finally {
            setLoading(false);
          }
        }
      }
    ]);
  };

  const renderItem = ({ item }: { item: Withdrawal }) => (
    <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBox, { backgroundColor: getStatusColor(item.status) + '15' }]}>
          <Ionicons 
            name={item.status === 'completed' ? "checkmark-circle" : item.status === 'failed' ? "close-circle" : "time"} 
            size={22} 
            color={getStatusColor(item.status)} 
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.amount, { color: t.text }]}>Rp {item.amount.toLocaleString('id-ID')}</Text>
          <Text style={[styles.date, { color: t.textMuted }]}>{formatDate(item.created_at)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{getStatusLabel(item.status)}</Text>
        </View>
      </View>
      
      <View style={styles.cardDivider} />
      
      <View style={styles.cardFooter}>
        <View style={{ flex: 1 }}>
          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={14} color={t.textMuted} />
            <Text style={[styles.infoText, { color: t.textSecondary }]}>{item.bank_name} • {item.account_number}</Text>
          </View>
          <Text style={[styles.refText, { color: t.textMuted }]}>Ref: {item.external_id}</Text>
        </View>
        
        {item.status === 'pending' && (
          <TouchableOpacity 
            style={styles.cancelActionBtn} 
            onPress={() => handleCancel(item)}
          >
            <Text style={styles.cancelActionText}>Batalkan</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: t.background }]}>
      {AlertComponent}
      <View style={[styles.header, { backgroundColor: t.headerBg, borderBottomWidth: 1, borderBottomColor: t.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={t.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.text }]}>Riwayat Penarikan</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={t.primary} />
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[t.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: t.surface }]}>
                <Ionicons name="receipt-outline" size={48} color={t.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: t.text }]}>Belum Ada Penarikan</Text>
              <Text style={[styles.emptyDesc, { color: t.textMuted }]}>
                Semua transaksi penarikan saldo Anda akan muncul di sini.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const getStyles = (t: any) => StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    paddingHorizontal: SPACING.lg, paddingTop: 30, paddingBottom: SPACING.lg 
  },
  backBtn: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { ...TYPOGRAPHY.h4, fontFamily: 'Inter_700Bold' },
  list: { padding: SPACING.lg, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  
  card: { borderRadius: RADIUS.lg, padding: 16, marginBottom: 12, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  amount: { ...TYPOGRAPHY.body, fontFamily: 'Inter_700Bold' },
  date: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  
  cardDivider: { height: 1, backgroundColor: t.border, marginVertical: 12, opacity: 0.5 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 12 },
  refText: { fontSize: 10 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyIcon: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { ...TYPOGRAPHY.h3, fontFamily: 'Inter_700Bold', marginBottom: 8 },
  emptyDesc: { ...TYPOGRAPHY.bodySmall, textAlign: 'center', lineHeight: 20 },

  cancelActionBtn: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cancelActionText: {
    color: '#DC2626',
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
});

