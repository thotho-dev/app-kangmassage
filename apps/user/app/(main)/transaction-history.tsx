import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, TextInput, Platform, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Search, ChevronLeft, CreditCard, Plus, TrendingUp, RotateCcw, ChevronDown, ChevronRight, X, Calendar } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/Skeleton';

const PURPLE = '#240080';
const TEXT_DARK = '#1A1A2E';
const TEXT_MUTED = '#6B7280';
const BORDER = '#F0F0F0';
const BG = '#F8F8FB';

export default function TransactionHistoryScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [withdrawalStatuses, setWithdrawalStatuses] = useState<Record<string, string>>({});
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const applyFilter = useCallback(() => {
    let result = [...transactions];

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(tx =>
        (tx.description || '').toLowerCase().includes(q) ||
        (tx.type || '').toLowerCase().includes(q) ||
        (tx.id || '').toLowerCase().includes(q)
      );
    }

    const now = new Date();
    let rangeStart: Date | null = null;
    let rangeEnd: Date | null = null;

    if (activeFilter === 'today') {
      rangeStart = new Date(now); rangeStart.setHours(0, 0, 0, 0);
      rangeEnd = new Date(now); rangeEnd.setHours(23, 59, 59, 999);
    } else if (activeFilter === 'week') {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      rangeStart = weekStart;
      rangeEnd = new Date(now); rangeEnd.setHours(23, 59, 59, 999);
    } else if (activeFilter === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      monthStart.setHours(0, 0, 0, 0);
      rangeStart = monthStart;
      rangeEnd = new Date(now); rangeEnd.setHours(23, 59, 59, 999);
    } else if (activeFilter === 'custom' && selectedDate) {
      rangeStart = new Date(selectedDate); rangeStart.setHours(0, 0, 0, 0);
      rangeEnd = new Date(selectedDate); rangeEnd.setHours(23, 59, 59, 999);
    }

    if (rangeStart) {
      result = result.filter(tx => new Date(tx.created_at) >= rangeStart! && new Date(tx.created_at) <= rangeEnd!);
    }

    setFiltered(result);
  }, [transactions, searchText, activeFilter, selectedDate]);

  useEffect(() => {
    applyFilter();
  }, [searchText, activeFilter, selectedDate, transactions]);

  const quickFilter = (label: string) => {
    setActiveFilter(label);
    if (label !== 'custom') setSelectedDate(null);
  };

  const onDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    setShowPicker(Platform.OS === 'ios');
    if (date) { setSelectedDate(date); setActiveFilter('custom'); }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTransactions();
    setRefreshing(false);
  }, [profile?.id]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', profile?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);

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

  useEffect(() => {
    if (profile?.id) fetchTransactions();
  }, [profile?.id]);

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

  const formatDateDisplay = (date: Date | null) => {
    if (!date) return null;
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getTxInfo = (tx: any) => {
    const desc = (tx.description || '').toLowerCase();
    const meta = tx.metadata || {};
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
      return { icon: 'payment', label: tx.description || 'Pembayaran Pesanan', color: PURPLE, status: 'Selesai', statusColor: '#00A896' };
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
    return { icon: 'debit', label: tx.description || 'Transaksi', color: PURPLE, status: 'Selesai', statusColor: '#00A896' };
  };

  const getTxIcon = (icon: string) => {
    switch (icon) {
      case 'withdraw': return TrendingUp;
      case 'refund': return RotateCcw;
      case 'topup': return Plus;
      case 'payment': return CreditCard;
      default: return CreditCard;
    }
  };

  const TxSkeleton = () => (
    <View style={[styles.cardWrap, { marginBottom: 10 }]}>
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Riwayat Transaksi</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Search size={15} color={TEXT_MUTED} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari transaksi..."
          placeholderTextColor={TEXT_MUTED}
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <X size={15} color={TEXT_MUTED} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ gap: 6, paddingRight: 16 }}>
        {[
            { key: 'all', label: 'Semua' },
            { key: 'today', label: 'Hari Ini' },
            { key: 'week', label: 'Minggu Ini' },
            { key: 'month', label: 'Bulan Ini' },
          ].map(q => {
            const active = q.key === activeFilter;
            return (
              <TouchableOpacity
                key={q.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => quickFilter(q.key)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{q.label}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={[styles.chip, activeFilter === 'custom' && styles.chipActive]}
            onPress={() => { setShowPicker(true); }}
          >
            <Calendar size={12} color={activeFilter === 'custom' ? '#FFFFFF' : TEXT_MUTED} />
            <Text style={[styles.chipText, activeFilter === 'custom' && styles.chipTextActive]} numberOfLines={1}>
              {selectedDate ? formatDateDisplay(selectedDate) : 'Pilih tanggal'}
            </Text>
          </TouchableOpacity>
        </ScrollView>

      {showPicker && (
        <DateTimePicker
          value={selectedDate || new Date()}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={onDateChange}
        />
      )}

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PURPLE]} />
        }
      >
        <View style={styles.scrollContent}>
          {loading ? (
            <>
              <TxSkeleton />
              <TxSkeleton />
              <TxSkeleton />
            </>
          ) : filtered.length > 0 ? (
            filtered.map((tx) => {
            const info = getTxInfo(tx);
            const Icon = getTxIcon(info.icon);
            const isCredit = tx.type === 'credit' || tx.type === 'topup' || tx.type === 'refund';
            const isExpanded = expandedId === tx.id;
            return (
              <View key={tx.id} style={styles.cardWrap}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.txItem}
                  onPress={() => toggleExpand(tx.id)}
                >
                  <View style={[styles.txIconBox, { backgroundColor: isCredit ? 'rgba(0,168,150,0.08)' : 'rgba(231,76,60,0.08)' }]}>
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
                    <Text style={[styles.txAmount, { color: isCredit ? '#00A896' : '#E74C3C' }]}>
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
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <Text style={{ color: TEXT_MUTED, fontSize: 14, fontFamily: 'PlusJakartaSans-Medium' }}>
              {transactions.length === 0 ? 'Belum ada transaksi' : 'Tidak ada transaksi yang cocok'}
            </Text>
          </View>
        )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 6,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    color: TEXT_DARK,
  },
  filterRow: {
    flexGrow: 0,
    marginTop: 4,
    marginBottom: 2,
    paddingLeft: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
    gap: 4,
    height: 40,
  },
  chipActive: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  chipText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: TEXT_MUTED,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 4,
    gap: 8,
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
