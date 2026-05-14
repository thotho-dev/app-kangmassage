import { useState, useCallback, useEffect } from 'react';
import { useThemeColors, useThemeStore } from '@/store/themeStore';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/constants/Theme';
import { supabase } from '@/lib/supabase';
import { useTherapistStore } from '@/store/therapistStore';
import { startOfDay, startOfWeek, startOfMonth, isWithinInterval, endOfDay } from 'date-fns';

const SUMMARY_PERIODS = ['Hari Ini', 'Minggu Ini', 'Bulan Ini', 'Semua'];
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const CURRENT_MONTH = new Date().getMonth();
const VISIBLE_MONTHS = MONTHS.slice(0, CURRENT_MONTH + 1);

export default function EarningsScreen() {
  const t = useThemeColors();
  const isDarkMode = useThemeStore(state => state.isDarkMode);
  const router = useRouter();
  const styles = getStyles(t);
  const { profile } = useTherapistStore();
  
  const [period, setPeriod] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [summary, setSummary] = useState({ gross: 0, net: 0, orders: 0, commission: 0 });

  const fetchData = async (isRefreshing = false) => {
    if (!profile) return;
    if (!isRefreshing) setLoading(true);

    try {
      // 1. Fetch Transactions with Order, Service, and User details
      const { data: trans, error } = await supabase
        .from('transactions')
        .select(`
          *,
          orders (
            id,
            order_number,
            total_price,
            users (full_name),
            services (name)
          )
        `)
        .eq('therapist_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('[DEBUG Summary] Data item example:', trans?.[0]);
      setHistory(trans || []);

      // 2. Calculate Summary
      calculateSummary(trans || [], period);

    } catch (error) {
      console.error('Error fetching earnings data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateSummary = (trans: any[], periodIdx: number) => {
    const now = new Date();
    let startDate: Date;

    switch (periodIdx) {
      case 0: startDate = startOfDay(now); break;
      case 1: startDate = startOfWeek(now, { weekStartsOn: 1 }); break;
      case 2: startDate = startOfMonth(now); break;
      default: startDate = new Date(0);
    }

    const filtered = trans.filter(t => {
      const date = new Date(t.created_at);
      return date >= startDate;
    });

    let gross = 0;
    const orderIds = new Set();

    filtered.forEach(t => {
      if (t.order_id && !orderIds.has(t.order_id)) {
        orderIds.add(t.order_id);
        
        // Cek apakah orders adalah objek atau array (Supabase join bisa mengembalikan keduanya)
        const orderInfo = Array.isArray(t.orders) ? t.orders[0] : t.orders;
        
        if (orderInfo) {
          const price = Number(orderInfo.total_price) || 0;
          gross += price;
        }
      }
    });

    // Komisi adalah 20% dari total bruto
    const commission = gross * 0.2;
    const net = gross - commission;

    setSummary({
      gross,
      net,
      orders: orderIds.size,
      commission
    });
  };

  useEffect(() => {
    if (history.length > 0) calculateSummary(history, period);
  }, [period]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [profile])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };


  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: t.headerBg, borderBottomWidth: 1, borderBottomColor: t.border }]}>
        <Text style={[styles.title, { color: t.text }]}>Pendapatan</Text>

        {/* Period Selector */}
        <View style={[styles.periods, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)' }]}>
          {SUMMARY_PERIODS.map((p, i) => (
            <TouchableOpacity key={p} style={[styles.periodBtn, period === i && { backgroundColor: t.background }]} onPress={() => setPeriod(i)}>
              <Text style={[styles.periodText, { color: period === i ? t.text : (isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)') }]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Big Earnings Card */}
        <LinearGradient colors={[t.secondary, '#EA580C']} style={styles.earningsCard}>
          <Text style={styles.cardSubLabel}>{period === 3 ? `Total Seluruh Pendapatan` : 'Total Pendapatan Bersih'}</Text>
          <Text style={styles.earningsValue}>Rp {summary.net.toLocaleString('id-ID')}</Text>
          <View style={styles.earningsMeta}>
            <View style={styles.earningsMetaItem}>
              <Text style={styles.earningsMetaLabel}>Bruto</Text>
              <Text style={styles.earningsMetaValue}>Rp {summary.gross.toLocaleString('id-ID')}</Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.earningsMetaItem}>
              <Text style={styles.earningsMetaLabel}>Komisi</Text>
              <Text style={[styles.earningsMetaValue, { color: 'rgba(255,255,255,0.7)' }]}>-Rp {summary.commission.toLocaleString('id-ID')}</Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.earningsMetaItem}>
              <Text style={styles.earningsMetaLabel}>Pesanan</Text>
              <Text style={styles.earningsMetaValue}>{summary.orders}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Withdraw Button */}
        <TouchableOpacity style={styles.withdrawBtn} activeOpacity={0.85} onPress={() => router.push('/profile/withdraw')}>
          <LinearGradient 
            colors={isDarkMode ? ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)'] : [t.surfaceLight, t.surface]} 
            style={[styles.withdrawGradient, { borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : t.border }]}
          >
            <Ionicons name="wallet-outline" size={20} color={t.text} />
            <Text style={[styles.withdrawText, { color: t.text }]}>Tarik Saldo ke Rekening</Text>
            <Ionicons name="arrow-forward" size={16} color={t.textMuted} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scroll} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.secondary} />}
      >
        <Text style={styles.historyTitle}>Riwayat Transaksi</Text>

        {loading ? (
          <ActivityIndicator size="small" color={t.primary} style={{ marginTop: 20 }} />
        ) : history.length === 0 ? (
          <Text style={{ textAlign: 'center', color: t.textMuted, marginTop: 20 }}>Belum ada riwayat</Text>
        ) : (
          history.map(item => {
            const isDebit = item.type === 'debit' || (item.amount < 0);
            // Support both array and object response from Supabase joins
            const orderData = Array.isArray(item.orders) ? item.orders[0] : item.orders;
            const customerName = orderData?.users?.full_name || 'Pelanggan';
            const serviceName = orderData?.services?.name || 'Layanan Pijat';
            const orderNum = orderData?.order_number?.slice(-6) || '---';

            return (
              <View key={item.id} style={styles.historyCard}>
                <View style={styles.historyLeft}>
                  <View style={[styles.historyIcon, { backgroundColor: isDebit ? t.danger + '15' : t.primary + '10' }]}>
                    <Ionicons
                      name={isDebit ? 'remove-circle' : 'add-circle'}
                      size={24}
                      color={isDebit ? t.danger : t.primary}
                    />
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyName}>
                      {isDebit ? (item.description || 'Potongan Komisi') : customerName}
                    </Text>
                    <Text style={styles.historyService}>
                      {isDebit ? `Pesanan #${orderNum}` : serviceName}
                    </Text>
                    <Text style={styles.historyDate}>{new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                </View>
                <View style={styles.historyRight}>
                  <Text style={[styles.historyAmount, { color: isDebit ? t.danger : t.primary }]}>
                    {isDebit ? '-' : '+'}Rp {Math.abs(Number(item.amount) || 0).toLocaleString('id-ID')}
                  </Text>
                </View>
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
  header: { 
    paddingHorizontal: SPACING.lg, paddingTop: 40, paddingBottom: SPACING.xl, gap: SPACING.md,
  },
  title: { ...TYPOGRAPHY.h2 },
  periods: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS.full, padding: 4 },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  periodActive: { backgroundColor: t.background },
  periodText: { ...TYPOGRAPHY.caption, color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter_600SemiBold' },
  periodTextActive: { color: t.text, fontFamily: 'Inter_700Bold' },
  monthScroll: { gap: SPACING.sm, paddingBottom: 4 },
  monthItem: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  monthText: { ...TYPOGRAPHY.caption, fontFamily: 'Inter_600SemiBold' },
  earningsCard: { borderRadius: RADIUS.xl, padding: SPACING.lg, gap: SPACING.sm, shadowColor: t.secondary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  cardSubLabel: { ...TYPOGRAPHY.caption, color: 'rgba(255,255,255,0.7)' },
  earningsValue: { ...TYPOGRAPHY.h1, color: '#FFFFFF', fontSize: 32 },
  earningsMeta: { flexDirection: 'row', gap: SPACING.sm, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  earningsMetaItem: { flex: 1, gap: 2 },
  earningsMetaLabel: { ...TYPOGRAPHY.caption, color: 'rgba(255,255,255,0.6)' },
  earningsMetaValue: { ...TYPOGRAPHY.bodySmall, color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  separator: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  withdrawBtn: { borderRadius: RADIUS.xl, overflow: 'hidden', marginTop: 4 },
  withdrawGradient: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 14, paddingHorizontal: SPACING.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: RADIUS.xl },
  withdrawText: { ...TYPOGRAPHY.body, fontFamily: 'Inter_600SemiBold', flex: 1 },
  scroll: { padding: SPACING.lg, paddingBottom: 100 },
  historyTitle: { ...TYPOGRAPHY.h4, color: t.text, marginBottom: SPACING.md },
  historyCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: t.surface, borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: t.border },
  historyLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1 },
  historyIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  historyInfo: { gap: 2 },
  historyName: { ...TYPOGRAPHY.bodySmall, color: t.text, fontFamily: 'Inter_700Bold' },
  historyService: { ...TYPOGRAPHY.caption, color: t.textSecondary },
  historyDate: { ...TYPOGRAPHY.caption, color: t.textMuted },
  historyRight: { alignItems: 'flex-end', gap: 4 },
  historyAmount: { ...TYPOGRAPHY.body, fontFamily: 'Inter_700Bold' },
  ratingRow: { flexDirection: 'row', gap: 1 },
});
