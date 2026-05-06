import { useState } from 'react';
import { useThemeColors } from '../../store/themeStore';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/Theme';

const HISTORY = [
  { id: '1', name: 'Siti Rahayu', service: 'Pijat Relaksasi 90 menit', date: 'Hari ini, 10:30', amount: 150000, status: 'completed', rating: 5 },
  { id: '2', name: 'Budi Santoso', service: 'Deep Tissue 60 menit', date: 'Hari ini, 08:00', amount: 200000, status: 'completed', rating: 4 },
  { id: '3', name: 'Rina Wulandari', service: 'Refleksi Kaki 45 menit', date: 'Kemarin, 15:00', amount: 100000, status: 'completed', rating: 5 },
  { id: '4', name: 'Doni Pratama', service: 'Pijat Kepala 30 menit', date: 'Kemarin, 11:00', amount: 75000, status: 'cancelled', rating: 0 },
  { id: '5', name: 'Maya Sari', service: 'Pijat Badan Full 120 menit', date: '2 hari lalu, 14:00', amount: 250000, status: 'completed', rating: 5 },
];

const SUMMARY_PERIODS = ['Hari Ini', 'Minggu Ini', 'Bulan Ini', 'Pilih Bulan'];
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const CURRENT_MONTH = new Date().getMonth();
const VISIBLE_MONTHS = MONTHS.slice(0, CURRENT_MONTH + 1);

export default function EarningsScreen() {
  const t = useThemeColors();
  const styles = getStyles(t);
  
  const [period, setPeriod] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const summaryData = [
    { gross: 450000, net: 360000, orders: 3, commission: 90000 },
    { gross: 2150000, net: 1720000, orders: 14, commission: 430000 },
    { gross: 4750000, net: 3800000, orders: 31, commission: 950000 },
    { gross: 5200000, net: 4160000, orders: 38, commission: 1040000 },
  ];
  const current = summaryData[period];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: t.headerBg }]}>
        <Text style={[styles.title, { color: '#FFFFFF' }]}>Pendapatan</Text>

        {/* Period Selector */}
        <View style={styles.periods}>
          {SUMMARY_PERIODS.map((p, i) => (
            <TouchableOpacity key={p} style={[styles.periodBtn, period === i && styles.periodActive]} onPress={() => setPeriod(i)}>
              <Text style={[styles.periodText, period === i && styles.periodTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Month Picker (Only show when period is 3) */}
        {period === 3 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthScroll}>
            {VISIBLE_MONTHS.map((m, i) => (
              <TouchableOpacity 
                key={m} 
                style={[styles.monthItem, selectedMonth === i && { backgroundColor: t.background, borderColor: t.background }]} 
                onPress={() => setSelectedMonth(i)}
              >
                <Text style={[styles.monthText, { color: selectedMonth === i ? t.text : 'rgba(255,255,255,0.6)' }]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Big Earnings Card */}
        <LinearGradient colors={[t.secondary, '#EA580C']} style={styles.earningsCard}>
          <Text style={styles.cardSubLabel}>{period === 3 ? `Total Pendapatan ${VISIBLE_MONTHS[selectedMonth]}` : 'Total Pendapatan Bersih'}</Text>
          <Text style={styles.earningsValue}>Rp {current.net.toLocaleString('id-ID')}</Text>
          <View style={styles.earningsMeta}>
            <View style={styles.earningsMetaItem}>
              <Text style={styles.earningsMetaLabel}>Bruto</Text>
              <Text style={styles.earningsMetaValue}>Rp {current.gross.toLocaleString('id-ID')}</Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.earningsMetaItem}>
              <Text style={styles.earningsMetaLabel}>Komisi (20%)</Text>
              <Text style={[styles.earningsMetaValue, { color: 'rgba(255,255,255,0.7)' }]}>-Rp {current.commission.toLocaleString('id-ID')}</Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.earningsMetaItem}>
              <Text style={styles.earningsMetaLabel}>Pesanan</Text>
              <Text style={styles.earningsMetaValue}>{current.orders}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Withdraw Button */}
        <TouchableOpacity style={styles.withdrawBtn} activeOpacity={0.85}>
          <LinearGradient colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']} style={styles.withdrawGradient}>
            <Ionicons name="wallet-outline" size={20} color="#FFFFFF" />
            <Text style={[styles.withdrawText, { color: '#FFFFFF' }]}>Tarik Saldo ke Rekening</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.historyTitle}>Riwayat Transaksi</Text>

        {HISTORY.map(item => (
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
                <Text style={styles.historyName}>{item.name}</Text>
                <Text style={styles.historyService}>{item.service}</Text>
                <Text style={styles.historyDate}>{item.date}</Text>
              </View>
            </View>
            <View style={styles.historyRight}>
              <Text style={[styles.historyAmount, { color: item.status === 'cancelled' ? t.textMuted : t.primary }]}>
                {item.status === 'cancelled' ? '—' : `+Rp ${item.amount.toLocaleString('id-ID')}`}
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
        ))}
      </ScrollView>
    </View>
  );
}

const getStyles = (t: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  header: { 
    paddingHorizontal: SPACING.lg, paddingTop: 56, paddingBottom: SPACING.xl, gap: SPACING.md,
    borderBottomLeftRadius: RADIUS.xl, borderBottomRightRadius: RADIUS.xl,
  },
  title: { ...TYPOGRAPHY.h2, color: '#FFFFFF' },
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
