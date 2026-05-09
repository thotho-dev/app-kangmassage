import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useThemeColors, useThemeStore } from '../../store/themeStore';
import { useTherapistStore } from '../../store/therapistStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/Theme';
import { useAlert } from '../../components/CustomAlert';

const MIN_WITHDRAW = 50000;
const WITHDRAW_FEE = 5000;

export default function WithdrawScreen() {
  const t = useThemeColors();
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const styles = getStyles(t);
  const router = useRouter();
  const { profile, fetchProfile } = useTherapistStore();
  const { showAlert, AlertComponent } = useAlert();

  const [displayAmount, setDisplayAmount] = useState('');
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
      setDisplayAmount('');
    }, [])
  );

  const formatNumber = (num: string) => {
    const value = num.replace(/\D/g, '');
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleAmountChange = (text: string) => setDisplayAmount(formatNumber(text));
  const getRawAmount = () => parseInt(displayAmount.replace(/\./g, '')) || 0;

  const handleWithdraw = async () => {
    const rawAmount = getRawAmount();

    if (!profile?.bank_account_number) {
      showAlert('warning', 'Bank Belum Diatur', 'Harap lengkapi informasi rekening bank Anda terlebih dahulu.', [
        { text: 'Atur Sekarang', onPress: () => router.push('/profile/payment') }
      ]);
      return;
    }

    if (rawAmount < MIN_WITHDRAW) {
      showAlert('warning', 'Nominal Kurang', `Minimal penarikan adalah Rp ${MIN_WITHDRAW.toLocaleString('id-ID')}`);
      return;
    }

    if (rawAmount > (profile?.wallet_balance || 0)) {
      showAlert('warning', 'Saldo Tidak Cukup', 'Nominal penarikan melebihi saldo dompet Anda.');
      return;
    }

    setLoading(true);
    try {
      // In production, use your actual domain
      const response = await fetch('https://app-kangmassage-web.vercel.app/api/withdraw/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          therapist_id: profile?.id,
          amount: rawAmount,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Gagal memproses penarikan');

      showAlert('success', 'Berhasil', 'Permintaan penarikan Anda sedang diproses. Dana akan masuk ke rekening dalam 1x24 jam.', [
        { text: 'Oke', onPress: () => router.replace('/(tabs)/earnings') }
      ]);

      fetchProfile(); // Refresh balance
    } catch (error: any) {
      showAlert('error', 'Gagal', error.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  const isAmountValid = getRawAmount() >= MIN_WITHDRAW && getRawAmount() <= (profile?.wallet_balance || 0);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        {AlertComponent}
        <View style={[styles.header, { backgroundColor: t.headerBg, borderBottomWidth: 1, borderBottomColor: t.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={t.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: t.text }]}>Tarik Saldo</Text>
          <TouchableOpacity onPress={() => router.push('/profile/withdraw-history')} style={styles.backBtn}>
            <Ionicons name="receipt-outline" size={24} color={t.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Balance Card */}
          <LinearGradient colors={[t.primary, t.primaryDark]} style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Saldo Tersedia</Text>
            <Text style={styles.balanceValue}>Rp {(profile?.wallet_balance || 0).toLocaleString('id-ID')}</Text>
            <View style={styles.balanceDecoration} />
          </LinearGradient>

          {/* Bank Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rekening Tujuan</Text>
            <TouchableOpacity
              style={styles.bankInfoBox}
              onPress={() => router.push('/profile/payment')}
              activeOpacity={0.7}
            >
              <View style={[styles.bankIcon, { backgroundColor: t.secondary + '15' }]}>
                <Ionicons name="business" size={24} color={t.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                {profile?.bank_account_number ? (
                  <>
                    <Text style={styles.bankName}>{profile.bank_name} - {profile.bank_account_number}</Text>
                    <Text style={styles.bankOwner}>{profile.bank_account_name || profile.full_name}</Text>
                  </>
                ) : (
                  <Text style={[styles.bankName, { color: t.danger }]}>Rekening belum diatur</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color={t.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Input Amount */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nominal Penarikan</Text>
            <View style={[styles.inputCard, !isAmountValid && displayAmount !== '' && { borderColor: t.danger }]}>
              <Text style={styles.currency}>Rp</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={t.textMuted}
                keyboardType="number-pad"
                value={displayAmount}
                onChangeText={handleAmountChange}
              />
              {displayAmount !== '' && (
                <TouchableOpacity onPress={() => setDisplayAmount('')}>
                  <Ionicons name="close-circle" size={20} color={t.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            <Text style={[styles.hintText, !isAmountValid && displayAmount !== '' ? { color: t.danger } : { color: t.textMuted }]}>
              Minimal penarikan Rp 50.000
            </Text>
          </View>

          {/* Summary */}
          {getRawAmount() > 0 && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Rincian Penarikan</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Jumlah Penarikan</Text>
                <Text style={styles.summaryValue}>Rp {getRawAmount().toLocaleString('id-ID')}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Biaya Admin</Text>
                <Text style={styles.summaryValue}>- Rp {WITHDRAW_FEE.toLocaleString('id-ID')}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: t.text, fontFamily: 'Inter_700Bold' }]}>Dana Diterima</Text>
                <Text style={[styles.summaryValue, { color: t.success, fontSize: 16, fontFamily: 'Inter_700Bold' }]}>
                  Rp {Math.max(0, getRawAmount() - WITHDRAW_FEE).toLocaleString('id-ID')}
                </Text>
              </View>
            </View>
          )}

          {/* Action Button */}
          <View style={{ marginTop: SPACING.xl, paddingBottom: 60 }}>
            <TouchableOpacity
              onPress={handleWithdraw}
              disabled={loading || !isAmountValid}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={loading || !isAmountValid
                  ? (isDarkMode ? ['#1E293B', '#1E293B'] : ['#E2E8F0', '#E2E8F0'])
                  : [t.secondary, '#EA580C']}
                style={styles.btn}
              >
                {loading ? (
                  <ActivityIndicator color={t.white} />
                ) : (
                  <>
                    <Text style={[styles.btnText, (loading || !isAmountValid) && { color: t.textMuted }]}>
                      Konfirmasi Penarikan
                    </Text>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={(loading || !isAmountValid) ? t.textMuted : t.white}
                    />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={16} color={t.textMuted} />
              <Text style={styles.infoText}>
                Proses penarikan saldo diproses secara otomatis melalui sistem Midtrans Iris. Waktu masuk dana tergantung pada bank penerima.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const getStyles = (t: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingTop: 56, paddingBottom: SPACING.lg
  },
  backBtn: { padding: 4 },
  headerTitle: { ...TYPOGRAPHY.h4, fontFamily: 'Inter_700Bold' },
  scroll: { padding: SPACING.lg },

  balanceCard: {
    borderRadius: RADIUS.xl, padding: 24, marginBottom: SPACING.xl,
    overflow: 'hidden', elevation: 8, shadowColor: t.primary,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12
  },
  balanceLabel: { ...TYPOGRAPHY.caption, color: 'rgba(255,255,255,0.7)', marginBottom: 8 },
  balanceValue: { ...TYPOGRAPHY.h1, color: '#FFFFFF', fontFamily: 'Inter_800ExtraBold' },
  balanceDecoration: {
    position: 'absolute', right: -20, bottom: -20, width: 100, height: 100,
    borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.1)'
  },

  section: { marginBottom: SPACING.xl },
  sectionTitle: { ...TYPOGRAPHY.bodySmall, color: t.textSecondary, marginBottom: SPACING.md, fontFamily: 'Inter_600SemiBold' },

  bankInfoBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: t.surface, borderRadius: RADIUS.lg,
    padding: SPACING.md, borderWidth: 1, borderColor: t.border
  },
  bankIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  bankName: { ...TYPOGRAPHY.body, color: t.text, fontFamily: 'Inter_700Bold' },
  bankOwner: { ...TYPOGRAPHY.caption, color: t.textSecondary },

  inputCard: {
    backgroundColor: t.surface, borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg, paddingVertical: 16,
    borderWidth: 1.5, borderColor: t.border,
    flexDirection: 'row', alignItems: 'center', gap: 10
  },
  currency: { ...TYPOGRAPHY.h2, color: t.text, fontFamily: 'Inter_700Bold' },
  input: { ...TYPOGRAPHY.h2, color: t.text, flex: 1, fontFamily: 'Inter_700Bold', padding: 0 },
  hintText: { ...TYPOGRAPHY.caption, marginTop: 6, marginLeft: 4 },

  summaryCard: {
    backgroundColor: t.surface, borderRadius: RADIUS.lg,
    padding: SPACING.lg, borderWidth: 1, borderColor: t.border
  },
  summaryTitle: { ...TYPOGRAPHY.body, color: t.text, fontFamily: 'Inter_700Bold', marginBottom: SPACING.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { ...TYPOGRAPHY.bodySmall, color: t.textSecondary },
  summaryValue: { ...TYPOGRAPHY.bodySmall, color: t.text, fontFamily: 'Inter_600SemiBold' },
  summaryDivider: { height: 1, backgroundColor: t.border, marginVertical: 12 },

  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16, borderRadius: RADIUS.full,
    shadowColor: t.secondary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 6
  },
  btnText: { ...TYPOGRAPHY.h4, color: '#FFFFFF', fontFamily: 'Inter_700Bold' },

  infoBox: { flexDirection: 'row', gap: 8, marginTop: 20, paddingHorizontal: 10 },
  infoText: { flex: 1, fontSize: 11, color: t.textMuted, lineHeight: 16 },
});
