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
      // 1. Fetch History
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          *,
          users (full_name),
          services (name)
        `)
        .eq('therapist_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(orders || []);

      // 2. Calculate Summary
      calculateSummary(orders || [], period);

    } catch (error) {
      console.error('Error fetching earnings data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateSummary = (orders: any[], periodIdx: number) => {
    const now = new Date();
    let startDate: Date;

    switch (periodIdx) {
      case 0: startDate = startOfDay(now); break;
      case 1: startDate = startOfWeek(now, { weekStartsOn: 1 }); break;
      case 2: startDate = startOfMonth(now); break;
      default: startDate = new Date(0); // All time
    }

    const filtered = orders.filter(o => {
      if (o.status !== 'completed') return false;
      const date = new Date(o.created_at);
      return date >= startDate;
    });

    const gross = filtered.reduce((acc, o) => acc + (Number(o.total_price) || 0), 0);
    const commission = gross * 0.2; // 20%
    const net = gross - commission;

    setSummary({
      gross,
      net,
      orders: filtered.length,
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

        {/* Month Picker (Only show when period is 3) */}
        {period === 3 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthScroll}>
            {VISIBLE_MONTHS.map((m, i) => (
              <TouchableOpacity 
                key={m} 
                style={[styles.monthItem, selectedMonth === i && { backgroundColor: t.primary, borderColor: t.primary }]} 
                onPress={() => setSelectedMonth(i)}
              >
                <Text style={[styles.monthText, { color: selectedMonth === i ? '#FFFFFF' : (isDarkMode ? 'rgba(255,255,255,0.6)' : t.textSecondary) }]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

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
              <Text style={styles.earningsMetaLabel}>Komisi (20%)</Text>
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
          history.map(item => (
            <View key={item.id} style={styles.historyCard}>
              <View style={styles.historyLeft}>
                <View style={[styles.historyIcon, { backgroundColor: item.status === 'cancelled' ? t.danger + '15' : t.primary + '10' }]}>
                  <Ionicons
                    name={item.status === 'cancelled' ? 'close-circle' : 'checkmark-circle'}
                    size={24}
                    color={item.status === 'cancelled' ? t.danger : t.primary}
                  />
                </View>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyName}>{item.users?.full_name || 'Pelanggan'}</Text>
                  <Text style={styles.historyService}>{item.services?.name || 'Pijat Relaksasi'}</Text>
                  <Text style={styles.historyDate}>{new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
              </View>
              <View style={styles.historyRight}>
                <Text style={[styles.historyAmount, { color: item.status === 'cancelled' ? t.textMuted : t.primary }]}>
                  {item.status === 'cancelled' ? '—' : `+Rp ${(Number(item.total_price) || 0).toLocaleString('id-ID')}`}
                </Text>
                {item.rating > 0 && (
                  <View style={styles.ratingRow}>
                    {Array.from({ length: item.rating }).map((_, i) => (
                      <Ionicons key={i} name="star" size={10} color={t.warning} />
                    ))}
                  </View>
                )}
              </View>
            </View>
          ))
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
