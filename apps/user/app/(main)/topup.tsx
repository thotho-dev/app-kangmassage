import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, 
  LayoutAnimation, Image, StatusBar, Linking, RefreshControl 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { 
  ChevronLeft, Wallet, ArrowRight, Receipt, 
  QrCode, ChevronDown, ChevronUp 
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { useAlert } from '@/context/AlertContext';
import { API_URL } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import { getAppSettings, AppSettings } from '@/lib/appSettings';

const PURPLE = '#240080';
const PURPLE_DARK = '#12004D';
const GOLD = '#FDB927';
const SUCCESS = '#00A896';
const ERROR = '#E74C3C';
const TEXT_DARK = '#1A1A2E';
const TEXT_MUTED = '#6B7280';
const BORDER = '#F0F0F0';
const BG = '#F8F8FB';

const PRESETS = [50000, 100000, 200000, 500000, 1000000];

const PAYMENT_GROUPS = [
  {
    id: 'ewallet',
    title: 'E-Wallet & QRIS',
    icon: QrCode,
    items: [
      { id: 'gopay', name: 'GoPay', image: require('@/assets/Gopay.png') },
      { id: 'qris', name: 'QRIS Dinamis GoPay', image: require('@/assets/Gopay.png') },
    ]
  },
];

export default function TopupScreen() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const { showAlert } = useAlert();

  const [displayAmount, setDisplayAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [expandedGroup, setExpandedGroup] = useState<string | null>('ewallet');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel(`user-balance-${profile.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        filter: `id=eq.${profile.id}`,
      }, () => {
        refreshProfile();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id]);

  useFocusEffect(
    useCallback(() => {
      setDisplayAmount('');
      setSelectedMethod('');
      setExpandedGroup('ewallet');
      getAppSettings().then(setSettings);
    }, [])
  );

  const formatNumber = (num: string) => {
    const value = num.replace(/\D/g, '');
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleAmountChange = (text: string) => setDisplayAmount(formatNumber(text));
  const getRawAmount = () => parseInt(displayAmount.replace(/\./g, '')) || 0;

  const minTopup = settings?.topup_min_amount ?? 10000;
  const adminFee = settings?.topup_admin_fee ?? 2500;

  const toggleGroup = (groupId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedGroup(expandedGroup === groupId ? null : groupId);
  };

  const handleTopup = async () => {
    const rawAmount = getRawAmount();
    if (rawAmount < minTopup) {
      showAlert('Nominal Kurang', `Minimal top up adalah Rp ${minTopup.toLocaleString('id-ID')}`);
      return;
    }
    if (!selectedMethod) {
      showAlert('Pilih Metode', 'Silakan pilih metode pembayaran terlebih dahulu.');
      return;
    }

    setLoading(true);
    try {
      // Check pending topup
      const { data: pendingTx } = await supabase
        .from('user_topups')
        .select('id')
        .eq('user_id', profile?.id)
        .eq('status', 'pending')
        .limit(1);

      if (pendingTx && pendingTx.length > 0) {
        showAlert('Transaksi Tertunda', 'Anda masih memiliki transaksi yang belum dibayar.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/topup/user-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: profile?.id,
          amount: rawAmount + adminFee,
          payment_method: selectedMethod,
        }),
      });

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      if (result.data.type === 'ewallet') {
        const url = result.data.actions?.mobile_web_checkout_url || result.data.actions?.deeplink_checkout_url;
        if (url) {
          await Linking.openURL(url);
          router.push('/topup-history');
        } else {
          throw new Error('URL pembayaran tidak ditemukan');
        }
      } else {
        router.push({ pathname: '/payment-details', params: { data: JSON.stringify({ ...result.data, source: 'topup' }) } });
      }
    } catch (error: any) {
      showAlert('Gagal', error.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      getAppSettings().then(setSettings),
      refreshProfile(),
    ]);
    setRefreshing(false);
  }, [refreshProfile]);

  const isAmountValid = getRawAmount() >= minTopup;
  const balance = profile?.wallet_balance || 0;
  const currentSelectedMethodName = PAYMENT_GROUPS.flatMap(g => g.items).find(i => i.id === selectedMethod)?.name || '-';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Isi Saldo</Text>
        <TouchableOpacity onPress={() => router.push('/topup-history')} style={styles.backButton}>
          <Receipt size={24} color={TEXT_DARK} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PURPLE]} tintColor={PURPLE} />}
        >
          {/* Balance Info Card */}
          <LinearGradient
            colors={[PURPLE, PURPLE_DARK]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceCard}
          >
            <View style={styles.circle1} />
            <View style={styles.circle2} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={styles.walletIconBox}>
                <Wallet size={20} color={GOLD} />
              </View>
              <View>
                <Text style={styles.balanceLabel}>SALDO SAAT INI</Text>
                <Text style={styles.balanceAmount}>Rp {balance.toLocaleString('id-ID')}</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Amount Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pilih Nominal Top Up</Text>
            <View style={[styles.inputCard, !isAmountValid && displayAmount !== '' && styles.inputCardError]}>
              <Text style={styles.currency}>Rp</Text>
              <TextInput 
                style={styles.input} 
                placeholder="0" 
                placeholderTextColor={TEXT_MUTED} 
                keyboardType="number-pad" 
                value={displayAmount} 
                onChangeText={handleAmountChange} 
              />
            </View>
            <Text style={[
              styles.minText, 
              !isAmountValid && displayAmount !== '' ? { color: ERROR } : {}
            ]}>
              Minimal Top Up Rp {minTopup.toLocaleString('id-ID')}
            </Text>

            {/* Preset Buttons */}
            <View style={styles.presetGrid}>
              {PRESETS.map(p => (
                <TouchableOpacity 
                  key={p} 
                  style={[
                    styles.presetBtn, 
                    getRawAmount() === p && styles.presetBtnActive
                  ]} 
                  onPress={() => handleAmountChange(p.toString())}
                >
                  <Text style={[
                    styles.presetText, 
                    getRawAmount() === p && styles.presetTextActive
                  ]}>
                    {p >= 1000000 ? `${p / 1000000} Juta` : `${p / 1000}rb`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Payment Methods */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Metode Pembayaran</Text>
            {PAYMENT_GROUPS.map((group) => {
              const GroupIcon = group.icon;
              const isExpanded = expandedGroup === group.id;
              return (
                <View key={group.id} style={styles.accordionContainer}>
                  <TouchableOpacity 
                    style={[styles.groupHeader, isExpanded && styles.groupHeaderActive]} 
                    onPress={() => toggleGroup(group.id)} 
                    activeOpacity={0.7}
                  >
                    <View style={styles.groupIconBox}>
                      <GroupIcon size={18} color={PURPLE} />
                    </View>
                    <Text style={styles.groupTitle}>{group.title}</Text>
                    {isExpanded ? (
                      <ChevronUp size={18} color={TEXT_MUTED} />
                    ) : (
                      <ChevronDown size={18} color={TEXT_MUTED} />
                    )}
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.groupContent}>
                      {group.items.map((item) => (
                        <TouchableOpacity 
                          key={item.id} 
                          style={[
                            styles.methodItem, 
                            selectedMethod === item.id && styles.methodItemActive
                          ]} 
                          onPress={() => setSelectedMethod(item.id)}
                        >
                          <Image source={item.image} style={styles.paymentLogo} />
                          <Text style={styles.methodName}>{item.name}</Text>
                          <View style={[styles.radio, selectedMethod === item.id && styles.radioActive]}>
                            {selectedMethod === item.id && <View style={styles.radioInner} />}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Summary */}
          {isAmountValid && selectedMethod !== '' && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Ringkasan Pembayaran</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Nominal Top Up</Text>
                <Text style={styles.summaryValue}>Rp {getRawAmount().toLocaleString('id-ID')}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Biaya Transaksi</Text>
                <Text style={styles.summaryValue}>Rp {adminFee.toLocaleString('id-ID')}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Metode</Text>
                <Text style={styles.summaryValue}>{currentSelectedMethodName}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: TEXT_DARK, fontFamily: 'PlusJakartaSans-Bold' }]}>Total Bayar</Text>
                <Text style={[styles.summaryValue, { color: PURPLE, fontSize: 18, fontFamily: 'PlusJakartaSans-Bold' }]}>
                  Rp {(getRawAmount() + adminFee).toLocaleString('id-ID')}
                </Text>
              </View>
            </View>
          )}

          {/* Submit Button */}
          <View style={{ marginTop: 20, paddingBottom: 60 }}>
            <TouchableOpacity 
              onPress={handleTopup} 
              disabled={loading || !isAmountValid || !selectedMethod} 
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={loading || !isAmountValid || !selectedMethod 
                  ? ['#E2E8F0', '#E2E8F0'] 
                  : [PURPLE, PURPLE_DARK]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitBtn}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={[
                      styles.submitBtnText, 
                      (loading || !isAmountValid || !selectedMethod) && { color: TEXT_MUTED }
                    ]}>
                      Lanjutkan Pembayaran
                    </Text>
                    <ArrowRight 
                      size={20} 
                      color={(loading || !isAmountValid || !selectedMethod) ? TEXT_MUTED : '#FFFFFF'} 
                    />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
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
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18, fontFamily: 'PlusJakartaSans-Bold', color: TEXT_DARK,
  },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

  // Balance Card
  balanceCard: {
    borderRadius: 20, padding: 20, overflow: 'hidden',
    position: 'relative', marginTop: 20, marginBottom: 24,
    elevation: 6, shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 12,
  },
  circle1: {
    position: 'absolute', top: -40, right: -40,
    width: 120, height: 120,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 60,
  },
  circle2: {
    position: 'absolute', bottom: -60, left: -60,
    width: 160, height: 160,
    backgroundColor: 'rgba(253,185,39,0.04)', borderRadius: 80,
  },
  walletIconBox: {
    width: 42, height: 42,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  balanceLabel: {
    fontSize: 9, fontFamily: 'PlusJakartaSans-Bold',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 22, fontFamily: 'PlusJakartaSans-Bold', color: '#FFFFFF',
  },

  // Section
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold',
    color: TEXT_MUTED, marginBottom: 12,
  },

  // Input
  inputCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    paddingHorizontal: 20, paddingVertical: 16,
    borderWidth: 1.5, borderColor: BORDER,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  inputCardError: { borderColor: ERROR },
  currency: {
    fontSize: 24, fontFamily: 'PlusJakartaSans-Bold', color: TEXT_DARK,
  },
  input: {
    fontSize: 24, fontFamily: 'PlusJakartaSans-Bold', color: TEXT_DARK,
    flex: 1, padding: 0,
  },
  minText: {
    fontSize: 11, fontFamily: 'PlusJakartaSans-Medium',
    color: TEXT_MUTED, marginTop: 6, marginLeft: 4,
  },

  // Preset
  presetGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12,
  },
  presetBtn: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 20, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: BORDER,
  },
  presetBtnActive: {
    borderColor: PURPLE, backgroundColor: `${PURPLE}10`,
  },
  presetText: {
    fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold', color: TEXT_MUTED,
  },
  presetTextActive: { color: PURPLE },

  // Accordion
  accordionContainer: {
    marginBottom: 10, backgroundColor: '#FFFFFF',
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: BORDER,
  },
  groupHeader: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, gap: 12,
  },
  groupHeaderActive: {
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  groupIconBox: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: `${PURPLE}08`,
  },
  groupTitle: {
    fontSize: 14, fontFamily: 'PlusJakartaSans-SemiBold',
    color: TEXT_DARK, flex: 1,
  },
  groupContent: { padding: 8, gap: 4 },
  methodItem: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: 'transparent',
  },
  methodItemActive: {
    borderColor: PURPLE, backgroundColor: `${PURPLE}05`,
  },
  paymentLogo: { width: 32, height: 32, resizeMode: 'contain' },
  methodName: {
    fontSize: 13, fontFamily: 'PlusJakartaSans-Medium',
    color: TEXT_DARK, flex: 1,
  },
  radio: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: PURPLE },
  radioInner: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: PURPLE,
  },


  // Summary
  summaryCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20,
    padding: 20, borderWidth: 1, borderColor: `${PURPLE}20`,
    marginTop: 8,
  },
  summaryTitle: {
    fontSize: 14, fontFamily: 'PlusJakartaSans-Bold',
    color: TEXT_DARK, marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13, fontFamily: 'PlusJakartaSans-Medium', color: TEXT_MUTED,
  },
  summaryValue: {
    fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold', color: TEXT_DARK,
  },
  summaryDivider: {
    height: 1, backgroundColor: BORDER,
    marginVertical: 12,
  },

  // Submit
  submitBtn: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10,
    paddingVertical: 16, borderRadius: 28,
    elevation: 6, shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 10,
  },
  submitBtnText: {
    fontSize: 14, fontFamily: 'PlusJakartaSans-Bold', color: '#FFFFFF',
  },
});
