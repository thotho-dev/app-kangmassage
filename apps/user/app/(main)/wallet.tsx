import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History,
  TrendingUp,
  Plus,
  ChevronRight,
  Wallet
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Card from '../../components/ui/Card';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/Theme';
import { useTheme } from '../../context/ThemeContext';

const TRANSACTIONS = [
  { id: 1, title: 'Pembayaran Pijat', date: 'Hari ini, 10:30', amount: -165000, type: 'debit', icon: CreditCard },
  { id: 2, title: 'Isi Saldo Dompet', date: 'Kemarin, 20:20', amount: 500000, type: 'credit', icon: Plus },
  { id: 3, title: 'Pengembalian Dana #ORD-992', date: '28 Apr, 14:15', amount: 150000, type: 'credit', icon: ArrowDownLeft },
  { id: 4, title: 'Pembayaran Pijat', date: '25 Apr, 18:45', amount: -120000, type: 'debit', icon: CreditCard },
];

export default function WalletScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}
        >
          <ArrowLeft size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Dompet Saya</Text>
        <TouchableOpacity style={[styles.historyButton, { backgroundColor: isDark ? 'rgba(253, 185, 39, 0.05)' : 'rgba(253, 185, 39, 0.03)', borderColor: isDark ? 'rgba(253, 185, 39, 0.1)' : 'rgba(253, 185, 39, 0.05)' }]}>
           <History size={20} color={COLORS.gold[500]} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Main Card */}
        <View style={styles.mainCardContainer}>
          <LinearGradient
            colors={[COLORS.primary[500], COLORS.primary[700]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.mainCardGradient as any}
          >
             <View style={styles.decorativeCircle1} />
             <View style={styles.decorativeCircle2} />

             <View style={styles.cardHeader}>
                <View>
                   <Text style={styles.balanceLabel}>Saldo Saat Ini</Text>
                   <Text style={styles.balanceText}>Rp 1.250.000</Text>
                </View>
                <View style={styles.cardIconWrapper}>
                   <Wallet size={24} color={COLORS.gold[500]} />
                </View>
             </View>

             <View style={styles.actionRow}>
                <TouchableOpacity style={styles.actionButton}>
                   <Plus size={20} color={COLORS.gold[500]} style={{ marginBottom: 6 }} />
                   <Text style={styles.actionText}>Isi Saldo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                   <TrendingUp size={20} color={COLORS.gold[500]} style={{ marginBottom: 6 }} />
                   <Text style={styles.actionText}>Tarik Tunai</Text>
                </TouchableOpacity>
             </View>
          </LinearGradient>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
           <Card style={[styles.statsCard, styles.incomeCard, { backgroundColor: isDark ? 'rgba(0, 168, 150, 0.05)' : 'rgba(0, 168, 150, 0.03)', borderColor: isDark ? 'rgba(0, 168, 150, 0.12)' : 'rgba(0, 168, 150, 0.08)' }]}>
              <View style={styles.statsIconWrapperIncome}>
                 <ArrowDownLeft size={16} color={COLORS.success} />
              </View>
              <Text style={[styles.statsLabel, { color: theme.textSecondary }]}>Pemasukan</Text>
              <Text style={[styles.statsValue, { color: theme.text }]}>Rp 650rb</Text>
           </Card>
           <Card style={[styles.statsCard, styles.spendingCard, { backgroundColor: isDark ? 'rgba(231, 76, 60, 0.05)' : 'rgba(231, 76, 60, 0.03)', borderColor: isDark ? 'rgba(231, 76, 60, 0.12)' : 'rgba(231, 76, 60, 0.08)' }]}>
              <View style={styles.statsIconWrapperSpending}>
                 <ArrowUpRight size={16} color={COLORS.error} />
              </View>
              <Text style={[styles.statsLabel, { color: theme.textSecondary }]}>Pengeluaran</Text>
              <Text style={[styles.statsValue, { color: theme.text }]}>Rp 285rb</Text>
           </Card>
        </View>

        {/* Transactions */}
        <View style={styles.transactionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Aktivitas Terbaru</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>Lihat Semua</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.transactionList}>
            {TRANSACTIONS.map((tx) => {
              const Icon = tx.icon;
              return (
                <TouchableOpacity key={tx.id} activeOpacity={0.7} style={[styles.transactionItem, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                  <View style={styles.txLeft}>
                    <View style={[styles.txIconWrapper, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.03)', borderColor: theme.border }]}>
                      <Icon size={20} color={tx.type === 'credit' ? COLORS.success : COLORS.primary[400]} />
                    </View>
                    <View>
                      <Text style={[styles.txTitle, { color: theme.text }]}>{tx.title}</Text>
                      <Text style={[styles.txDate, { color: theme.textSecondary }]}>{tx.date}</Text>
                    </View>
                  </View>
                  <View style={styles.txRight}>
                    <Text style={[styles.txAmount, tx.type === 'credit' ? styles.creditText : [styles.debitText, { color: theme.text }]]}>
                      {tx.type === 'credit' ? '+' : '-'} Rp {Math.abs(tx.amount).toLocaleString()}
                    </Text>
                    <ChevronRight size={14} color={theme.textSecondary} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 64,
    paddingBottom: 24,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    fontSize: 24,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  mainCardContainer: {
    marginBottom: 32,
    marginTop: 16,
  },
  mainCardGradient: {
    borderRadius: 32,
    padding: 32,
    position: 'relative',
    overflow: 'hidden',
    elevation: 12,
    shadowColor: COLORS.primary[500],
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 180,
    height: 180,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 90,
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 260,
    height: 260,
    backgroundColor: 'rgba(253, 185, 39, 0.05)',
    borderRadius: 130,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 48,
  },
  balanceLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  balanceText: {
    color: COLORS.white,
    fontSize: 34,
    fontFamily: TYPOGRAPHY.h1.fontFamily,
    fontWeight: '900',
  },
  cardIconWrapper: {
    width: 56,
    height: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionText: {
    color: COLORS.white,
    fontSize: 13,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 40,
  },
  statsCard: {
    flex: 1,
    padding: 20,
    borderRadius: 28,
    borderWidth: 1.5,
  },
  incomeCard: {
  },
  spendingCard: {
  },
  statsIconWrapperIncome: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 168, 150, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statsIconWrapperSpending: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(231, 76, 60, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statsLabel: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    textTransform: 'uppercase',
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  statsValue: {
    fontWeight: '900',
    fontSize: 18,
    fontFamily: TYPOGRAPHY.h3.fontFamily,
  },
  transactionsSection: {
    marginBottom: 48,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: TYPOGRAPHY.h3.fontFamily,
  },
  seeAllText: {
    color: COLORS.gold[500],
    fontSize: 14,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: '700',
  },
  transactionList: {
    gap: 20,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  txIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  txTitle: {
    fontWeight: '700',
    fontSize: 16,
    fontFamily: TYPOGRAPHY.body.fontFamily,
  },
  txDate: {
    fontSize: 12,
    marginTop: 4,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: '500',
  },
  txRight: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontWeight: '900',
    fontSize: 17,
    fontFamily: TYPOGRAPHY.h3.fontFamily,
    marginBottom: 4,
  },
  creditText: {
    color: COLORS.success,
  },
  debitText: {
  },
});
