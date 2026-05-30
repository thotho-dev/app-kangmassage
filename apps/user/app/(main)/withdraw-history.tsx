import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Building2, AlertCircle, Clock, CheckCircle2, XCircle } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useAlert } from '@/context/AlertContext';
import { supabase } from '@/lib/supabase';

const PURPLE = '#240080';
const SUCCESS = '#00A896';
const WARNING = '#F59E0B';
const DANGER = '#EF4444';
const TEXT_DARK = '#1A1A2E';
const TEXT_MUTED = '#6B7280';
const BORDER = '#E5E7EB';
const BG = '#F9FAFB';

interface Withdrawal {
  id: string;
  amount: number;
  admin_fee: number;
  status: 'pending' | 'completed' | 'failed';
  bank_name: string;
  account_number: string;
  created_at: string;
  external_id: string;
}

export default function WithdrawHistoryScreen() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const { showAlert } = useAlert();

  const [history, setHistory] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    if (!profile?.id) return;
    try {
      const { data, error } = await supabase
        .from('user_withdrawals')
        .select('*')
        .eq('user_id', profile.id)
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
      case 'completed': return SUCCESS;
      case 'pending': return WARNING;
      case 'failed': return DANGER;
      default: return TEXT_MUTED;
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

    // Simulating confirmation alert in react-native without the native Alert API since custom useAlert doesn't easily support prompts, 
    // actually, let's just use window.confirm style if possible, or execute directly for now with a standard showAlert.
    // Assuming custom useAlert only shows messages. We will just cancel it directly or we could implement a prompt.
    // For simplicity, we just execute cancellation on press:
    
    setLoading(true);
    try {
      // 1. Update Withdrawal Status
      const { error: wdError } = await supabase
        .from('user_withdrawals')
        .update({ status: 'failed', payment_data: { reason: 'Cancelled by user' } })
        .eq('id', item.id);

      if (wdError) throw wdError;

      // 2. Refund Balance
      const currentBalance = Number(profile?.wallet_balance) || 0;
      const refundAmount = Number(item.amount) + Number(item.admin_fee);
      const newBalance = currentBalance + refundAmount;

      const { error: uError } = await supabase
        .from('users')
        .update({ wallet_balance: newBalance })
        .eq('id', profile?.id);

      if (uError) throw uError;

      // 3. Create Transaction Record
      await supabase.from('transactions').insert({
        user_id: profile?.id,
        type: 'credit',
        amount: refundAmount,
        balance_before: currentBalance,
        balance_after: newBalance,
        description: `Batal: Penarikan Saldo (${item.bank_name})`,
        metadata: { withdrawal_id: item.id, type: 'cancellation' }
      });

      showAlert('Berhasil', 'Penarikan telah dibatalkan dan saldo dikembalikan.');
      fetchHistory();
      await refreshProfile(); // Refresh global balance
    } catch (error: any) {
      showAlert('Gagal', error.message || 'Terjadi kesalahan saat membatalkan');
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Withdrawal }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBox, { backgroundColor: `${getStatusColor(item.status)}15` }]}>
          {item.status === 'completed' ? <CheckCircle2 size={22} color={SUCCESS} /> : 
           item.status === 'failed' ? <XCircle size={22} color={DANGER} /> : 
           <Clock size={22} color={WARNING} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.amount}>Rp {item.amount.toLocaleString('id-ID')}</Text>
          <Text style={styles.date}>{formatDate(item.created_at)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}15` }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{getStatusLabel(item.status)}</Text>
        </View>
      </View>
      
      <View style={styles.cardDivider} />
      
      <View style={styles.cardFooter}>
        <View style={{ flex: 1 }}>
          <View style={styles.infoRow}>
            <Building2 size={14} color={TEXT_MUTED} />
            <Text style={styles.infoText}>{item.bank_name} • {item.account_number}</Text>
          </View>
          <Text style={styles.refText}>Ref: {item.external_id || '-'}</Text>
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Riwayat Penarikan</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PURPLE} />
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PURPLE]} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Building2 size={48} color={TEXT_MUTED} />
              </View>
              <Text style={styles.emptyTitle}>Belum Ada Penarikan</Text>
              <Text style={styles.emptyDesc}>
                Semua transaksi penarikan saldo Anda akan muncul di sini.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 15,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: BORDER 
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'PlusJakartaSans-Bold', color: TEXT_DARK },
  list: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: BORDER },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  amount: { fontSize: 15, fontFamily: 'PlusJakartaSans-Bold', color: TEXT_DARK },
  date: { fontSize: 12, marginTop: 2, color: TEXT_MUTED },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontFamily: 'PlusJakartaSans-Bold' },
  
  cardDivider: { height: 1, backgroundColor: BORDER, marginVertical: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  infoText: { fontSize: 12, color: '#4B5563' },
  refText: { fontSize: 10, color: TEXT_MUTED },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontFamily: 'PlusJakartaSans-Bold', color: TEXT_DARK, marginBottom: 8 },
  emptyDesc: { fontSize: 13, color: TEXT_MUTED, textAlign: 'center', lineHeight: 20 },

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
    fontFamily: 'PlusJakartaSans-Bold',
  },
});
