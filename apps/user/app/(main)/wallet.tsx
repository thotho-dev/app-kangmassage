import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  ChevronLeft, 
  CreditCard, 
  TrendingUp,
  Plus,
  ChevronRight,
  ChevronDown,
  Wallet,
  Star,
  RotateCcw,
  ArrowDownLeft,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { COLORS } from '@/constants/Theme';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/Skeleton';

const PURPLE = '#240080';
const PURPLE_DARK = '#12004D';
const GOLD = '#FDB927';
const SUCCESS = '#00A896';
const TEXT_DARK = '#1A1A2E';
const TEXT_MUTED = '#6B7280';
const BORDER = '#F0F0F0';
const BG = '#F8F8FB';

import { useAuth } from '@/context/AuthContext';

export default function WalletScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { profile, refreshProfile } = useAuth();
  const [transactions, setTransactions] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [withdrawalStatuses, setWithdrawalStatuses] = React.useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchTransactions(),
      refreshProfile()
    ]);
    setRefreshing(false);
  }, [profile?.supabase_uid]);

  const balance = profile?.wallet_balance || 0;
  const points = profile?.points || 0;
  const cashback = profile?.cashback_balance || 0;

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

      // Fetch withdrawal statuses
      const wdIds = (data || [])
        .map(tx => tx.metadata?.withdrawal_id)
        .filter(Boolean);
      if (wdIds.length > 0) {
        const { data: wds } = await supabase
          .from('user_withdrawals')
          .select('id, status')
          .in('id', wdIds);
        const statusMap: Record<string, string> = {};
        (wds || []).forEach(w => { statusMap[w.id] = w.status; });
        setWithdrawalStatuses(statusMap);
      }
    } catch (error) {
      console.log('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTxDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    if (date.toDateString() === now.toDateString()) return `Hari ini, ${h}:${m}`;
    if (date.toDateString() === yesterday.toDateString()) return `Kemarin, ${h}:${m}`;
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  };

  const getTxInfo = (tx: any) => {
    const desc = (tx.description || '').toLowerCase();
    const meta = tx.metadata || {};

    // Withdrawal — check real status
    if (desc.includes('penarikan') || desc.includes('withdrawal')) {
      const wdId = meta?.withdrawal_id;
      const wdStatus = wdId ? withdrawalStatuses[wdId] : null;
      if (wdStatus === 'failed' || wdStatus === 'rejected') {
        return { icon: 'withdraw', label: tx.description || 'Penarikan Saldo', color: '#E74C3C', status: 'Gagal', statusColor: '#E74C3C' };
      }
      if (wdStatus === 'completed') {
        return { icon: 'withdraw', label: tx.description || 'Penarikan Saldo', color: '#E74C3C', status: 'Berhasil', statusColor: '#00A896' };
      }
      return { icon: 'withdraw', label: tx.description || 'Penarikan Saldo', color: '#E74C3C', status: 'Diproses', statusColor: '#F59E0B' };
    }
    if (tx.type === 'payment' || desc.includes('pembayaran')) {
      return { icon: 'payment', label: tx.description || 'Pembayaran Pesanan', color: '#240080', status: 'Selesai', statusColor: '#00A896' };
    }
    if (desc.includes('refund') || desc.includes('batal') || meta?.type === 'cancellation') {
      return { icon: 'refund', label: tx.description || 'Pengembalian Dana', color: '#00A896', status: 'Dibatalkan', statusColor: '#E74C3C' };
    }
    if (desc.includes('top up') || desc.includes('topup') || desc.includes('isi saldo')) {
      return { icon: 'topup', label: 'Isi Saldo', color: '#00A896', status: 'Berhasil', statusColor: '#00A896' };
    }
    if (tx.type === 'credit') {
      return { icon: 'credit', label: tx.description || 'Pemasukan', color: '#00A896', status: 'Selesai', statusColor: '#00A896' };
    }
    return { icon: 'debit', label: tx.description || 'Transaksi', color: '#240080', status: 'Selesai', statusColor: '#00A896' };
  };

  const getTxIcon = (info: { icon: string }) => {
    switch (info.icon) {
      case 'withdraw': return TrendingUp;
      case 'refund': return RotateCcw;
      case 'topup': return Plus;
      case 'payment': return CreditCard;
      default: return CreditCard;
    }
  };

  const TxSkeleton = () => (
    <View style={styles.cardWrap}>
      <View style={styles.txItem}>
        <Skeleton width={42} height={42} borderRadius={13} style={{ marginRight: 12 }} />
        <View style={styles.txInfo}>
          <Skeleton width="60%" height={13} borderRadius={4} style={{ marginBottom: 6 }} />
          <Skeleton width="40%" height={10} borderRadius={3} />
        </View>
        <Skeleton width={80} height={13} borderRadius={4} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: BG }]} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dompet Saya</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PURPLE]} />
        }
      >

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
              <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/topup')}>
                <Plus size={16} color={GOLD} />
                <Text style={styles.actionLabel}>Isi Saldo</Text>
              </TouchableOpacity>
              <View style={styles.actionDivider} />
              <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/withdraw')}>
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
            <TouchableOpacity onPress={() => router.push('/transaction-history')}>
              <Text style={styles.seeAll}>Lihat Semua</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.txList}>
            {loading ? (
              <>
                <TxSkeleton />
                <TxSkeleton />
                <TxSkeleton />
              </>
            ) : transactions.length > 0 ? (
              transactions.map((tx) => {
                const info = getTxInfo(tx);
                const Icon = getTxIcon(info);
                const isCredit = tx.type === 'credit' || tx.type === 'topup' || tx.type === 'refund';
                const isExpanded = expandedId === tx.id;
                return (
                  <View key={tx.id} style={styles.cardWrap}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={styles.txItem}
                      onPress={() => toggleExpand(tx.id)}
                    >
                      <View style={[
                        styles.txIconBox,
                        { backgroundColor: isCredit ? 'rgba(0,168,150,0.08)' : 'rgba(231,76,60,0.08)' }
                      ]}>
                        <Icon size={18} color={info.color as any} />
                      </View>
                      <View style={styles.txInfo}>
                        <Text style={styles.txTitle} numberOfLines={1}>{info.label}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                          <Text style={styles.txDate}>{formatTxDate(tx.created_at)}</Text>
                          {info.status && (
                            <View style={{ backgroundColor: `${info.statusColor}15`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                              <Text style={{ fontSize: 10, fontFamily: 'PlusJakartaSans-Bold', color: info.statusColor }}>{info.status}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <View style={styles.txRight}>
                        <Text style={[styles.txAmount, { color: isCredit ? SUCCESS : '#E74C3C' }]}>
                          {isCredit ? '+' : '-'} Rp {Math.abs(tx.amount).toLocaleString('id-ID')}
                        </Text>
                        {isExpanded ? (
                          <ChevronDown size={14} color={TEXT_MUTED} style={{ marginTop: 2 }} />
                        ) : (
                          <ChevronRight size={14} color={TEXT_MUTED} style={{ marginTop: 2 }} />
                        )}
                      </View>
                    </TouchableOpacity>
                    {isExpanded && (
                      <View style={styles.txDetail}>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>ID Transaksi</Text>
                          <Text style={styles.detailValue}>{tx.id?.slice(0, 12)}...</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Tipe</Text>
                          <Text style={[styles.detailValue, { textTransform: 'capitalize' }]}>{tx.type || '-'}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Metode</Text>
                          <Text style={[styles.detailValue, { textTransform: 'capitalize' }]}>{tx.payment_method || '-'}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Waktu</Text>
                          <Text style={styles.detailValue}>{new Date(tx.created_at).toLocaleString('id-ID')}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Status</Text>
                          <Text style={[styles.detailValue, { color: info.statusColor }]}>{info.status}</Text>
                        </View>
                        {tx.description && (
                          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                            <Text style={styles.detailLabel}>Keterangan</Text>
                            <Text style={[styles.detailValue, { flex: 1, textAlign: 'right' }]}>{tx.description}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
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
    </SafeAreaView>
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
    paddingTop: 12,
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
    fontFamily: 'PlusJakartaSans-Bold',
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
    fontFamily: 'PlusJakartaSans-Bold',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  balanceAmount: {
    fontSize: 28,
    fontFamily: 'PlusJakartaSans-Bold',
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
    fontFamily: 'PlusJakartaSans-SemiBold',
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
    fontFamily: 'PlusJakartaSans-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  statsValue: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
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
    fontFamily: 'PlusJakartaSans-Bold',
    color: TEXT_DARK,
  },
  seeAll: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: GOLD,
  },
  txList: {
    gap: 10,
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
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
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: TEXT_DARK,
    marginBottom: 3,
  },
  txDate: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    color: TEXT_MUTED,
  },
  txRight: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 4,
  },
  txAmount: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  cardWrap: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  txDetail: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    color: TEXT_MUTED,
  },
  detailValue: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: TEXT_DARK,
  },
});
