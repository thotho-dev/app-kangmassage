import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ChevronLeft, 
  CreditCard, 
  History,
  TrendingUp,
  Plus,
  ChevronRight,
  Wallet,
  Star,
  RotateCcw,
  ArrowDownLeft,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { COLORS } from '@/constants/Theme';
import { supabase } from '@/lib/supabase';

const PURPLE = '#240080';
const PURPLE_DARK = '#12004D';
const GOLD = '#FDB927';
const SUCCESS = '#00A896';
const TEXT_DARK = '#1A1A2E';
const TEXT_MUTED = '#6B7280';
const BORDER = '#F0F0F0';
const BG = '#F8F8FB';

const TRANSACTIONS = [
  { id: 1, title: 'Pembayaran Pijat', date: 'Hari ini, 10:30', amount: -165000, type: 'debit', icon: CreditCard },
  { id: 2, title: 'Isi Saldo Dompet', date: 'Kemarin, 20:20', amount: 500000, type: 'credit', icon: Plus },
  { id: 3, title: 'Pengembalian Dana #ORD-992', date: '28 Apr, 14:15', amount: 150000, type: 'credit', icon: ArrowDownLeft },
  { id: 4, title: 'Pembayaran Pijat', date: '25 Apr, 18:45', amount: -120000, type: 'debit', icon: CreditCard },
];

import { useAuth } from '@/context/AuthContext';

export default function WalletScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { profile } = useAuth();
  const [transactions, setTransactions] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  const balance = profile?.wallet_balance || 0;
  const points = profile?.points || 0;
  const cashback = profile?.cashback || 0;

  React.useEffect(() => {
    if (profile?.supabase_uid) {
      fetchTransactions();
    }
  }, [profile?.supabase_uid]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', profile?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.log('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTxDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) return `Hari ini, ${date.getHours()}:${date.getMinutes()}`;
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
  };

  return (
    <View style={[styles.container, { backgroundColor: BG }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dompet Saya</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(main)/history')}>
          <History size={20} color={GOLD} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Balance Card */}
        <View style={styles.cardWrapper}>
          <LinearGradient
            colors={[PURPLE, PURPLE_DARK]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceCard}
          >
            {/* Decorative circles */}
            <View style={styles.circle1} />
            <View style={styles.circle2} />

            {/* Top Row */}
            <View style={styles.cardTopRow}>
              <View>
                <Text style={styles.balanceLabel}>SALDO SAAT INI</Text>
                <Text style={styles.balanceAmount}>Rp {balance.toLocaleString('id-ID')}</Text>
              </View>
              <View style={styles.walletIconBox}>
                <Wallet size={22} color={GOLD} />
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionBtn}>
                <Plus size={16} color={GOLD} />
                <Text style={styles.actionLabel}>Isi Saldo</Text>
              </TouchableOpacity>
              <View style={styles.actionDivider} />
              <TouchableOpacity style={styles.actionBtn}>
                <TrendingUp size={16} color={GOLD} />
                <Text style={styles.actionLabel}>Tarik Tunai</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Stats Row: Poin & Cash Back */}
        <View style={styles.statsRow}>
          {/* Poin */}
          <View style={[styles.statsCard, { backgroundColor: isDark ? '#1E1810' : '#FFFBF0', borderColor: '#FDE68A' }]}>
            <View style={[styles.statsIconBox, { backgroundColor: 'rgba(253, 185, 39, 0.15)' }]}>
              <Star size={14} color={GOLD} fill={GOLD} />
            </View>
            <Text style={[styles.statsLabel, { color: TEXT_MUTED }]}>Poin</Text>
            <Text style={[styles.statsValue, { color: TEXT_DARK }]}>{points.toLocaleString('id-ID')} Pts</Text>
          </View>

          {/* Cash Back */}
          <View style={[styles.statsCard, { backgroundColor: isDark ? '#0D1E1C' : '#F0FAFA', borderColor: '#A7E8E3' }]}>
            <View style={[styles.statsIconBox, { backgroundColor: 'rgba(0, 168, 150, 0.15)' }]}>
              <RotateCcw size={14} color={SUCCESS} />
            </View>
            <Text style={[styles.statsLabel, { color: TEXT_MUTED }]}>Cash Back</Text>
            <Text style={[styles.statsValue, { color: TEXT_DARK }]}>Rp {cashback.toLocaleString('id-ID')}</Text>
          </View>
        </View>

        {/* Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Aktivitas Terbaru</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>Lihat Semua</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.txList}>
            {transactions.length > 0 ? (
              transactions.map((tx) => {
                const isCredit = tx.type === 'credit' || tx.type === 'topup' || tx.type === 'refund';
                return (
                  <TouchableOpacity
                    key={tx.id}
                    activeOpacity={0.7}
                    style={styles.txItem}
                  >
                    <View style={[
                      styles.txIconBox,
                      { backgroundColor: isCredit ? 'rgba(0,168,150,0.08)' : 'rgba(36,0,128,0.06)' }
                    ]}>
                      {isCredit ? <Plus size={18} color={SUCCESS} /> : <CreditCard size={18} color={PURPLE} />}
                    </View>
                    <View style={styles.txInfo}>
                      <Text style={styles.txTitle} numberOfLines={1}>{tx.description || (isCredit ? 'Isi Saldo' : 'Pembayaran')}</Text>
                      <Text style={styles.txDate}>{formatTxDate(tx.created_at)}</Text>
                    </View>
                    <View style={styles.txRight}>
                      <Text style={[styles.txAmount, { color: isCredit ? SUCCESS : TEXT_DARK }]}>
                        {isCredit ? '+' : '-'} Rp {Math.abs(tx.amount).toLocaleString('id-ID')}
                      </Text>
                      <ChevronRight size={14} color={TEXT_MUTED} style={{ marginTop: 2 }} />
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ color: TEXT_MUTED, fontSize: 13 }}>Belum ada aktivitas transaksi</Text>
              </View>
            )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: TEXT_DARK,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  // Balance Card
  cardWrapper: {
    marginTop: 20,
    marginBottom: 16,
  },
  balanceCard: {
    borderRadius: 24,
    padding: 24,
    overflow: 'hidden',
    position: 'relative',
    elevation: 8,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  circle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 75,
  },
  circle2: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 200,
    height: 200,
    backgroundColor: 'rgba(253,185,39,0.04)',
    borderRadius: 100,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  balanceLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  balanceAmount: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  walletIconBox: {
    width: 46,
    height: 46,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  actionRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  actionDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  actionLabel: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },

  // Stats Cards
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statsCard: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
  },
  statsIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statsLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  statsValue: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },

  // Transactions
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: TEXT_DARK,
  },
  seeAll: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: GOLD,
  },
  txList: {
    gap: 10,
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  txIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txInfo: {
    flex: 1,
  },
  txTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: TEXT_DARK,
    marginBottom: 3,
  },
  txDate: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: TEXT_MUTED,
  },
  txRight: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 4,
  },
  txAmount: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
  },
});
