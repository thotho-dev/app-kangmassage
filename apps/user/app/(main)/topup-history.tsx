import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Linking, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Wallet, Clock, AlertCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useAlert } from '@/context/AlertContext';
import { supabase } from '@/lib/supabase';
import { format, addMinutes, differenceInSeconds } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

const PURPLE = '#240080';
const SUCCESS = '#00A896';
const WARNING = '#F59E0B';
const DANGER = '#EF4444';
const TEXT_DARK = '#1A1A2E';
const TEXT_MUTED = '#6B7280';
const BORDER = '#E5E7EB';
const BG = '#F9FAFB';

const CANCEL_TIMEOUT_MINUTES = 5;

export default function TopupHistoryScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { showAlert } = useAlert();
  
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchHistory = async () => {
    if (!profile) return;
    try {
      const { data, error } = await supabase
        .from('user_topups')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error: any) {
      console.error('Error fetching topup history:', error.message || error);
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
      await supabase.from('user_topups').update({ status: 'failed' }).eq('id', id);
      setHistory(prev => prev.map(h => h.id === id ? { ...h, status: 'failed' } : h));
    } catch (e) {
      console.error('Auto cancel error:', e);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'paid': return { color: SUCCESS, bg: `${SUCCESS}15`, label: 'Sukses' };
      case 'pending': return { color: WARNING, bg: `${WARNING}15`, label: 'Pending' };
      case 'failed': return { color: DANGER, bg: `${DANGER}15`, label: 'Gagal' };
      default: return { color: TEXT_MUTED, bg: BORDER, label: status };
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Riwayat Top Up</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PURPLE} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color={PURPLE} style={{ marginTop: 40 }} />
        ) : history.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Wallet size={48} color={TEXT_MUTED} />
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
                  <View style={styles.iconBox}>
                    <Wallet size={20} color={PURPLE} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.amount}>+ Rp {(item.amount || 0).toLocaleString('id-ID')}</Text>
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
                    <Text style={styles.detailLabel}>ID Top Up</Text>
                    <Text style={styles.detailValue}>{item.external_id?.split('-')[1] || item.id.slice(0,8)}</Text>
                  </View>
                  {item.fee > 0 && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Biaya Admin</Text>
                      <Text style={[styles.detailValue, { color: DANGER }]}>- Rp {item.fee.toLocaleString('id-ID')}</Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Masuk ke Saldo</Text>
                    <Text style={[styles.detailValue, { color: SUCCESS }]}>Rp {item.amount.toLocaleString('id-ID')}</Text>
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
                    <Clock size={14} color={DANGER} />
                    <Text style={styles.timerText}>
                      Batal otomatis dalam <Text style={{ fontFamily: 'PlusJakartaSans-Bold' }}>{renderCountdown(item.created_at, item.id)}</Text>
                    </Text>
                  </View>
                )}

                {isPending && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity 
                      style={[styles.actionBtn, { borderColor: DANGER, backgroundColor: 'transparent', flex: 1, marginRight: 8 }]} 
                      onPress={() => {
                        // We use a custom alert or default behavior
                        markAsFailed(item.id);
                        showAlert('Dibatalkan', 'Transaksi berhasil dibatalkan.');
                      }}
                    >
                      <Text style={[styles.actionText, { color: DANGER }]}>Batalkan</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: PURPLE, borderColor: PURPLE, flex: 1 }]} 
                      onPress={async () => {
                        if (item.payment_data?.invoice_url) {
                          await Linking.openURL(item.payment_data.invoice_url);
                        } else {
                          router.push({
                            pathname: '/topup-payment',
                            params: { data: JSON.stringify(item.payment_data) }
                          });
                        }
                      }}
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
  scroll: { padding: 16, paddingBottom: 40 },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyIcon: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 20, backgroundColor: '#FFFFFF' },
  emptyTitle: { fontSize: 18, fontFamily: 'PlusJakartaSans-Bold', color: TEXT_DARK, marginBottom: 8 },
  emptySub: { fontSize: 13, color: TEXT_MUTED, textAlign: 'center' },
  
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: `${PURPLE}10` },
  amount: { fontSize: 15, color: TEXT_DARK, fontFamily: 'PlusJakartaSans-Bold' },
  date: { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontFamily: 'PlusJakartaSans-Bold' },
  
  cardBottom: { borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 12, gap: 6 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: 12, color: TEXT_MUTED },
  detailValue: { fontSize: 12, color: TEXT_DARK, fontFamily: 'PlusJakartaSans-SemiBold' },
  
  timerContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: `${DANGER}10`, padding: 8, borderRadius: 8 },
  timerText: { fontSize: 12, color: DANGER },
  
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 16, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 16 },
  actionBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  actionText: { fontSize: 13, fontFamily: 'PlusJakartaSans-Bold' },
});
