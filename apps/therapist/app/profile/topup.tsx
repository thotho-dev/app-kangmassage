import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, LayoutAnimation, Image } from 'react-native';
import { useThemeColors } from '../../store/themeStore';
import { useTherapistStore } from '../../store/therapistStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/Theme';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../components/CustomAlert';

const PRESETS = [50000, 100000, 200000, 500000, 1000000];
const MIN_TOPUP = 20000;
const ADMIN_FEE = 2500;

const LOGOS = {
  gopay: 'https://i.ibb.co/8Ym8F2n/gopay.png',
  shopeepay: 'https://i.ibb.co/vYm6zW2/shopeepay.png',
  bca: 'https://i.ibb.co/M9V6Y6T/bca.png',
  mandiri: 'https://i.ibb.co/mH0y2Kq/mandiri.png',
  bni: 'https://i.ibb.co/k0rN2Xq/bni.png',
  bri: 'https://i.ibb.co/VWV6zW2/bri.png',
  alfamart: 'https://i.ibb.co/mH0y2Kq/alfamart.png',
  indomaret: 'https://i.ibb.co/M9V6Y6T/indomaret.png',
};

const PAYMENT_GROUPS = [
  {
    id: 'ewallet',
    title: 'E-Wallet & QRIS',
    icon: 'qr-code-outline',
    items: [
      { id: 'gopay', name: 'GoPay / QRIS', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Gopay_logo.svg/512px-Gopay_logo.svg.png' },
      { id: 'shopeepay', name: 'ShopeePay', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/ShopeePay.svg/512px-ShopeePay.svg.png' },
    ]
  },
  {
    id: 'va',
    title: 'Virtual Account (Transfer Bank)',
    icon: 'card-outline',
    items: [
      { id: 'bca_va', name: 'BCA Virtual Account', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Bank_Central_Asia.svg/512px-Bank_Central_Asia.svg.png' },
      { id: 'mandiri_va', name: 'Mandiri Virtual Account', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Bank_Mandiri_logo_2016.svg/512px-Bank_Mandiri_logo_2016.svg.png' },
      { id: 'bni_va', name: 'BNI Virtual Account', image: 'https://upload.wikimedia.org/wikipedia/id/thumb/5/55/BNI_logo.svg/512px-BNI_logo.svg.png' },
      { id: 'bri_va', name: 'BRI Virtual Account', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/BRI_Logo.svg/512px-BRI_Logo.svg.png' },
    ]
  },
  {
    id: 'retail',
    title: 'Gerai Retail',
    icon: 'storefront-outline',
    items: [
      { id: 'alfamart', name: 'Alfamart', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Alfamart_logo.svg/512px-Alfamart_logo.svg.png' },
      { id: 'indomaret', name: 'Indomaret', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Logo_Indomaret.svg/512px-Logo_Indomaret.svg.png' },
    ]
  }
];

export default function TopupScreen() {
  const t = useThemeColors();
  const styles = getStyles(t);
  const router = useRouter();
  const { profile } = useTherapistStore();
  const { showAlert, AlertComponent } = useAlert();

  const [displayAmount, setDisplayAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [expandedGroup, setExpandedGroup] = useState<string | null>('ewallet');
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setDisplayAmount('');
      setSelectedMethod('');
      setExpandedGroup('ewallet');
    }, [])
  );

  const formatNumber = (num: string) => {
    const value = num.replace(/\D/g, '');
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleAmountChange = (text: string) => setDisplayAmount(formatNumber(text));
  const getRawAmount = () => parseInt(displayAmount.replace(/\./g, '')) || 0;

  const toggleGroup = (groupId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedGroup(expandedGroup === groupId ? null : groupId);
  };

  const handleTopup = async () => {
    const rawAmount = getRawAmount();
    if (rawAmount < MIN_TOPUP) {
      showAlert('warning', 'Nominal Kurang', `Minimal top up adalah Rp ${MIN_TOPUP.toLocaleString('id-ID')}`);
      return;
    }
    if (!selectedMethod) {
      showAlert('warning', 'Pilih Metode', 'Silakan pilih metode pembayaran terlebih dahulu.');
      return;
    }

    setLoading(true);
    try {
      const { data: pendingTx } = await supabase
        .from('therapist_topups')
        .select('id')
        .eq('therapist_id', profile?.id)
        .eq('status', 'pending')
        .limit(1);

      if (pendingTx && pendingTx.length > 0) {
        showAlert('warning', 'Transaksi Tertunda', 'Anda masih memiliki transaksi yang belum dibayar.', [{ text: 'Lihat Riwayat', onPress: () => router.push('/profile/topup-history') }]);
        setLoading(false);
        return;
      }

      const response = await fetch('https://app-kangmassage-web.vercel.app/api/topup/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          therapist_id: profile?.id,
          amount: rawAmount + ADMIN_FEE,
          payment_method: selectedMethod,
        }),
      });

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      router.push({ pathname: '/profile/payment-details', params: { data: JSON.stringify(result.data) } });
    } catch (error: any) {
      showAlert('error', 'Gagal', error.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  const isAmountValid = getRawAmount() >= MIN_TOPUP;
  const currentSelectedMethodName = PAYMENT_GROUPS.flatMap(g => g.items).find(i => i.id === selectedMethod)?.name || '-';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        {AlertComponent}
        <View style={[styles.header, { backgroundColor: t.headerBg }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Top Up Saldo</Text>
          <TouchableOpacity onPress={() => router.push('/profile/topup-history')} style={styles.backBtn}>
            <Ionicons name="receipt-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.infoCard}>
            <View>
              <Text style={styles.infoLabel}>Saldo Saat Ini</Text>
              <Text style={styles.infoValue}>Rp {(profile?.wallet_balance || 0).toLocaleString('id-ID')}</Text>
            </View>
            <View style={[styles.walletIcon, { backgroundColor: t.secondary + '20' }]}>
              <Ionicons name="wallet-outline" size={24} color={t.secondary} />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pilih Nominal Top Up</Text>
            <View style={[styles.inputCard, !isAmountValid && displayAmount !== '' && { borderColor: t.danger }]}>
              <Text style={styles.currency}>Rp</Text>
              <TextInput style={styles.input} placeholder="0" placeholderTextColor={t.textMuted} keyboardType="number-pad" value={displayAmount} onChangeText={handleAmountChange} />
            </View>
            <Text style={[styles.minText, !isAmountValid && displayAmount !== '' ? { color: t.danger } : { color: t.textMuted }]}>Minimal TopUp Rp 20.000</Text>
            <View style={styles.presetGrid}>
              {PRESETS.map(p => (
                <TouchableOpacity key={p} style={[styles.presetBtn, getRawAmount() === p && { borderColor: t.secondary, backgroundColor: t.secondary + '10' }]} onPress={() => handleAmountChange(p.toString())}>
                  <Text style={[styles.presetText, getRawAmount() === p && { color: t.secondary }]}>{p >= 1000000 ? `${p / 1000000} Juta` : `${p / 1000}rb`}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Metode Pembayaran</Text>
            {PAYMENT_GROUPS.map((group) => (
              <View key={group.id} style={styles.accordionContainer}>
                <TouchableOpacity style={[styles.groupHeader, expandedGroup === group.id && styles.groupHeaderActive]} onPress={() => toggleGroup(group.id)} activeOpacity={0.7}>
                  <View style={[styles.groupIcon, { backgroundColor: t.background }]}>
                    <Ionicons name={group.icon as any} size={20} color={t.textSecondary} />
                  </View>
                  <Text style={styles.groupTitle}>{group.title}</Text>
                  <Ionicons name={expandedGroup === group.id ? "chevron-up" : "chevron-down"} size={20} color={t.textMuted} />
                </TouchableOpacity>

                {expandedGroup === group.id && (
                  <View style={styles.groupContent}>
                    {group.items.map((item) => (
                      <TouchableOpacity key={item.id} style={[styles.methodItem, selectedMethod === item.id && { borderColor: t.secondary, backgroundColor: t.secondary + '05' }]} onPress={() => setSelectedMethod(item.id)}>
                        <View style={styles.logoWrapper}>
                          <Image source={{ uri: item.image }} style={styles.paymentLogo} resizeMode="contain" />
                        </View>
                        <Text style={styles.methodName}>{item.name}</Text>
                        <View style={[styles.radio, selectedMethod === item.id && { borderColor: t.secondary }]}>
                          {selectedMethod === item.id && <View style={[styles.radioInner, { backgroundColor: t.secondary }]} />}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>

          {isAmountValid && selectedMethod !== '' && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Ringkasan Pembayaran</Text>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Nominal Top Up</Text><Text style={styles.summaryValue}>Rp {getRawAmount().toLocaleString('id-ID')}</Text></View>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Biaya Transaksi</Text><Text style={styles.summaryValue}>Rp {ADMIN_FEE.toLocaleString('id-ID')}</Text></View>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Metode</Text><Text style={styles.summaryValue}>{currentSelectedMethodName}</Text></View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: t.text, fontFamily: 'Inter_700Bold' }]}>Total Bayar</Text>
                <Text style={[styles.summaryValue, { color: t.secondary, fontSize: 18, fontFamily: 'Inter_800ExtraBold' }]}>Rp {(getRawAmount() + ADMIN_FEE).toLocaleString('id-ID')}</Text>
              </View>
            </View>
          )}

          <View style={{ marginTop: SPACING.lg, paddingBottom: 60 }}>
            <TouchableOpacity onPress={handleTopup} disabled={loading || !isAmountValid || !selectedMethod} activeOpacity={0.85}>
              <LinearGradient colors={loading || !isAmountValid || !selectedMethod ? [t.border, t.border] : [t.secondary, '#EA580C']} style={styles.btn}>
                <Text style={styles.btnText}>{loading ? 'Memproses...' : 'Lanjutkan Pembayaran'}</Text>
                {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const getStyles = (t: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: 56, paddingBottom: SPACING.lg },
  backBtn: { padding: 4 },
  headerTitle: { ...TYPOGRAPHY.h4, color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  scroll: { padding: SPACING.lg },
  infoCard: { backgroundColor: t.surface, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: t.border, marginBottom: SPACING.xl, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { ...TYPOGRAPHY.caption, color: t.textSecondary, marginBottom: 4 },
  infoValue: { ...TYPOGRAPHY.h2, color: t.text, fontFamily: 'Inter_700Bold' },
  walletIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  section: { marginBottom: SPACING.xl },
  sectionTitle: { ...TYPOGRAPHY.bodySmall, color: t.textSecondary, marginBottom: SPACING.md, fontFamily: 'Inter_600SemiBold' },
  inputCard: { backgroundColor: t.surface, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.lg, paddingVertical: 16, borderWidth: 1.5, borderColor: t.border, flexDirection: 'row', alignItems: 'center', gap: 10 },
  currency: { ...TYPOGRAPHY.h2, color: t.text, fontFamily: 'Inter_700Bold' },
  input: { ...TYPOGRAPHY.h2, color: t.text, flex: 1, fontFamily: 'Inter_700Bold', padding: 0 },
  minText: { ...TYPOGRAPHY.caption, marginTop: 6, marginLeft: 4, fontFamily: 'Inter_500Medium' },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: SPACING.md },
  presetBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: RADIUS.full, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border },
  presetText: { ...TYPOGRAPHY.bodySmall, color: t.textSecondary, fontFamily: 'Inter_600SemiBold' },
  accordionContainer: { marginBottom: SPACING.sm, backgroundColor: t.surface, borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1, borderColor: t.border },
  groupHeader: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: 12 },
  groupHeaderActive: { borderBottomWidth: 1, borderBottomColor: t.border },
  groupIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  groupTitle: { ...TYPOGRAPHY.body, color: t.text, flex: 1, fontFamily: 'Inter_600SemiBold' },
  groupContent: { padding: SPACING.sm, gap: SPACING.xs },
  methodItem: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: RADIUS.md, padding: SPACING.sm, borderWidth: 1, borderColor: 'transparent' },
  logoWrapper: { width: 40, height: 24, justifyContent: 'center', alignItems: 'center' },
  paymentLogo: { width: '100%', height: '100%' },
  methodName: { ...TYPOGRAPHY.bodySmall, color: t.text, flex: 1, fontFamily: 'Inter_500Medium' },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: t.border, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  summaryCard: { backgroundColor: t.surface, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: t.secondary + '30', marginTop: SPACING.md },
  summaryTitle: { ...TYPOGRAPHY.body, color: t.text, fontFamily: 'Inter_700Bold', marginBottom: SPACING.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  summaryLabel: { ...TYPOGRAPHY.bodySmall, color: t.textSecondary },
  summaryValue: { ...TYPOGRAPHY.bodySmall, color: t.text, fontFamily: 'Inter_600SemiBold' },
  summaryDivider: { height: 1, backgroundColor: t.border, marginVertical: 12, borderStyle: 'dashed' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: RADIUS.full, shadowColor: t.secondary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  btnText: { ...TYPOGRAPHY.h4, color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
});
