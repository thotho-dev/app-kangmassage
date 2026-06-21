import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  ChevronLeft, Wallet, ArrowRight, Building2,
  AlertCircle, CheckCircle2, Receipt, Shield, KeyRound
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { useAlert } from '@/context/AlertContext';
import { API_URL } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import PinModal from '@/components/PinModal';
import OtpModal from '@/components/OtpModal';

const PURPLE = '#240080';
const PURPLE_DARK = '#12004D';
const GOLD = '#FDB927';
const SUCCESS = '#00A896';
const ERROR = '#E74C3C';
const TEXT_DARK = '#1A1A2E';
const TEXT_MUTED = '#6B7280';
const BORDER = '#F0F0F0';
const BG = '#F8F8FB';

interface BankAccount {
  id: string;
  bank_code: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  is_verified: boolean;
}

const PRESETS = [50000, 100000, 200000, 500000];

export default function WithdrawScreen() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const { showAlert } = useAlert();

  const [displayAmount, setDisplayAmount] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  // PIN Modal
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  // OTP Modal
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [pendingWithdrawalId, setPendingWithdrawalId] = useState('');

  const balance = profile?.wallet_balance || 0;
  const minWithdraw = settings?.withdraw_min_amount ?? 50000;
  const adminFee = settings?.withdraw_admin_fee ?? 5000;
  const otpThreshold = settings?.withdrawal_otp_threshold ?? 500000;

  const fetchAccounts = async () => {
    if (!profile?.id) return;
    try {
      const { data, error } = await supabase
        .from('saved_bank_accounts')
        .select('*')
        .eq('user_id', profile?.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAccounts(data || []);
      if (data?.length > 0 && !selectedAccountId) {
        setSelectedAccountId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setDisplayAmount('');
      setSelectedAccountId('');
      setPendingWithdrawalId('');
      setPinError('');
      setOtpError('');
      fetchAccounts();
      getSettings();
    }, [profile?.id])
  );

  const getSettings = async () => {
    try {
      const { data } = await supabase.from('app_settings').select('*').single();
      if (data) setSettings(data);
    } catch {}
  };

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  const formatNumber = (num: string) => {
    const value = num.replace(/\D/g, '');
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };
  const handleAmountChange = (text: string) => setDisplayAmount(formatNumber(text));
  const getRawAmount = () => parseInt(displayAmount.replace(/\./g, '')) || 0;

  const isAmountValid = getRawAmount() >= minWithdraw;
  const isBalanceSufficient = getRawAmount() + adminFee <= balance;
  const isFormValid = isAmountValid && isBalanceSufficient && selectedAccountId;

  // Step 1: Show PIN Modal
  const handleWithdrawPress = () => {
    if (!isFormValid) return;
    setPinError('');
    setPinModalVisible(true);
  };

  // Step 2: PIN entered — call backend
  const handlePinVerified = async (pin: string) => {
    setPinLoading(true);
    setPinError('');

    const rawAmount = getRawAmount();
    if (!profile?.id || !rawAmount || !selectedAccountId || !pin) {
      setPinError(`Data tidak lengkap: ${!profile?.id ? 'user_id ' : ''}${!rawAmount ? 'amount ' : ''}${!selectedAccountId ? 'rekening ' : ''}${!pin ? 'pin ' : ''}`);
      setPinLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/withdraw/user-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: profile?.id,
          amount: rawAmount,
          bank_account_id: selectedAccountId,
          pin,
        }),
      });
      const data = await res.json();

      if (data.error) {
        setPinError(data.error);
        setPinLoading(false);
        return;
      }

      setPinModalVisible(false);
      setPinLoading(false);

      if (data.status === 'otp_sent') {
        setPendingWithdrawalId(data.withdrawal_id);
        setOtpError('');
        setOtpModalVisible(true);
      } else if (data.status === 'pending_approval') {
        await refreshProfile();
        showAlert('Berhasil', 'Permintaan penarikan menunggu persetujuan admin.');
        router.replace('/withdraw-history');
      } else if (data.status === 'success') {
        await refreshProfile();
        showAlert('Berhasil', 'Penarikan berhasil diproses.');
        router.replace('/withdraw-history');
      }
    } catch (err: any) {
      setPinError('Terjadi kesalahan sistem. Silakan coba lagi.');
      setPinLoading(false);
    }
  };

  // Step 3: OTP entered
  const handleOtpVerified = async (otp: string) => {
    setOtpLoading(true);
    setOtpError('');
    try {
      const res = await fetch(`${API_URL}/api/withdraw/user-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          withdrawal_id: pendingWithdrawalId,
          otp,
        }),
      });
      const data = await res.json();

      if (data.error) {
        setOtpError(data.error);
        setOtpLoading(false);
        return;
      }

      setOtpModalVisible(false);
      setOtpLoading(false);

      if (data.status === 'pending_approval') {
        await refreshProfile();
        showAlert('Berhasil', 'Permintaan penarikan menunggu persetujuan admin.');
      } else {
        await refreshProfile();
        showAlert('Berhasil', 'Penarikan berhasil diproses.');
      }
      router.replace('/withdraw-history');
    } catch (err: any) {
      setOtpError('Terjadi kesalahan sistem. Silakan coba lagi.');
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpError('');
    try {
      const res = await fetch(`${API_URL}/api/withdraw/otp-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withdrawal_id: pendingWithdrawalId }),
      });
      const data = await res.json();
      if (data.error) setOtpError(data.error);
    } catch {}
  };

  const maskAccount = (num: string) => {
    if (num.length <= 4) return num;
    return '••••' + num.slice(-4);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tarik Saldo</Text>
        <TouchableOpacity onPress={() => router.push('/withdraw-history')} style={styles.backButton}>
          <Receipt size={24} color={TEXT_DARK} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
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
                <Text style={styles.balanceLabel}>SALDO TERSEDIA</Text>
                <Text style={styles.balanceAmount}>Rp {balance.toLocaleString('id-ID')}</Text>
              </View>
            </View>
            {/* PIN Status */}
            <View style={styles.pinStatusRow}>
              <Shield size={12} color={profile?.transaction_pin ? SUCCESS : GOLD} />
              <Text style={styles.pinStatusText}>
                {profile?.transaction_pin ? 'PIN Aktif' : 'PIN Belum Diatur'}
              </Text>
            </View>
          </LinearGradient>

          {/* Amount Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Jumlah Penarikan</Text>
            <View style={[
              styles.inputCard,
              (!isAmountValid && displayAmount !== '') && styles.inputCardError,
              (!isBalanceSufficient && displayAmount !== '') && styles.inputCardError
            ]}>
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
            {!isAmountValid && displayAmount !== '' ? (
              <View style={styles.errorRow}>
                <AlertCircle size={12} color={ERROR} />
                <Text style={styles.errorText}>Minimal penarikan Rp {minWithdraw.toLocaleString('id-ID')}</Text>
              </View>
            ) : !isBalanceSufficient && displayAmount !== '' ? (
              <View style={styles.errorRow}>
                <AlertCircle size={12} color={ERROR} />
                <Text style={styles.errorText}>Saldo tidak mencukupi (termasuk biaya admin Rp {adminFee.toLocaleString('id-ID')})</Text>
              </View>
            ) : (
              <Text style={styles.minText}>
                Minimal Rp {minWithdraw.toLocaleString('id-ID')} · Biaya admin Rp {adminFee.toLocaleString('id-ID')}
                {getRawAmount() > otpThreshold ? ' · OTP diperlukan' : ''}
              </Text>
            )}

            {/* If amount > OTP threshold, show warning */}
            {getRawAmount() > otpThreshold && displayAmount !== '' && isAmountValid && (
              <View style={styles.otpWarning}>
                <KeyRound size={14} color={GOLD} />
                <Text style={styles.otpWarningText}>
                  Penarikan di atas Rp {otpThreshold.toLocaleString('id-ID')} memerlukan verifikasi OTP via WhatsApp
                </Text>
              </View>
            )}

            <View style={styles.presetGrid}>
              {PRESETS.filter(p => p + adminFee <= balance).map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.presetBtn, getRawAmount() === p && styles.presetBtnActive]}
                  onPress={() => handleAmountChange(p.toString())}
                >
                  <Text style={[styles.presetText, getRawAmount() === p && styles.presetTextActive]}>
                    {p >= 1000000 ? `${p / 1000000} Juta` : `${p / 1000}rb`}
                  </Text>
                </TouchableOpacity>
              ))}
              {balance - adminFee >= minWithdraw && (
                <TouchableOpacity
                  style={[styles.presetBtn, getRawAmount() === balance - adminFee && styles.presetBtnActive]}
                  onPress={() => handleAmountChange((balance - adminFee).toString())}
                >
                  <Text style={[styles.presetText, getRawAmount() === balance - adminFee && styles.presetTextActive]}>
                    Semua
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Saved Bank Accounts */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Rekening Tujuan</Text>
              <TouchableOpacity onPress={() => router.push('/bank-accounts')}>
                <Text style={styles.manageLink}>Kelola</Text>
              </TouchableOpacity>
            </View>

            {loadingAccounts ? (
              <ActivityIndicator color={PURPLE} size="small" style={{ marginVertical: 20 }} />
            ) : accounts.length === 0 ? (
              <TouchableOpacity
                style={styles.noAccountBox}
                onPress={() => router.push('/bank-accounts')}
                activeOpacity={0.7}
              >
                <Building2 size={24} color={TEXT_MUTED} />
                <Text style={styles.noAccountText}>
                  Belum ada rekening tujuan. Tambahkan sekarang.
                </Text>
                <ArrowRight size={18} color={PURPLE} />
              </TouchableOpacity>
            ) : (
              <View style={styles.accountList}>
                {accounts.map(acc => (
                  <TouchableOpacity
                    key={acc.id}
                    style={[styles.accountCard, selectedAccountId === acc.id && styles.accountCardActive]}
                    onPress={() => setSelectedAccountId(acc.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.radioOuter}>
                      {selectedAccountId === acc.id && <View style={styles.radioInner} />}
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.accountBankName}>{acc.bank_name}</Text>
                      <Text style={styles.accountDetail}>
                        {maskAccount(acc.account_number)} · {acc.account_name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Summary */}
          {isFormValid && selectedAccount && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Ringkasan Penarikan</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Jumlah Penarikan</Text>
                <Text style={styles.summaryValue}>Rp {getRawAmount().toLocaleString('id-ID')}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Biaya Admin</Text>
                <Text style={styles.summaryValue}>Rp {adminFee.toLocaleString('id-ID')}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tujuan</Text>
                <Text style={styles.summaryValue}>{selectedAccount.bank_name}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: TEXT_DARK, fontFamily: 'PlusJakartaSans-Bold' }]}>Total Dipotong</Text>
                <Text style={[styles.summaryValue, { color: ERROR, fontSize: 18, fontFamily: 'PlusJakartaSans-Bold' }]}>
                  Rp {(getRawAmount() + adminFee).toLocaleString('id-ID')}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: SUCCESS }]}>Dana Diterima</Text>
                <Text style={[styles.summaryValue, { color: SUCCESS, fontFamily: 'PlusJakartaSans-Bold' }]}>
                  Rp {getRawAmount().toLocaleString('id-ID')}
                </Text>
              </View>
            </View>
          )}

          <View style={{ marginTop: 20, paddingBottom: 60 }}>
            {!profile?.transaction_pin ? (
              <TouchableOpacity
                onPress={() => router.push('/pin-setup')}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[PURPLE, PURPLE_DARK]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitBtn}
                >
                  <Shield size={18} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>Atur PIN Transaksi</Text>
                  <ArrowRight size={20} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  onPress={handleWithdrawPress}
                  disabled={loading || !isFormValid}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={loading || !isFormValid
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
                        <Text style={styles.submitBtnText}>Ajukan Penarikan</Text>
                        <ArrowRight size={20} color="#FFFFFF" />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
                {!isFormValid && !loading && (
                  <Text style={{ textAlign: 'center', color: TEXT_MUTED, fontSize: 12, marginTop: 8 }}>
                    {!selectedAccountId ? 'Pilih rekening tujuan terlebih dahulu' :
                     !isAmountValid ? `Minimal penarikan Rp ${minWithdraw.toLocaleString('id-ID')}` :
                     !isBalanceSufficient ? 'Saldo tidak mencukupi' : ''}
                  </Text>
                )}
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* PIN Modal */}
      <PinModal
        visible={pinModalVisible}
        loading={pinLoading}
        error={pinError}
        onVerify={handlePinVerified}
        onClose={() => {
          setPinModalVisible(false);
          setPinError('');
        }}
      />

      {/* OTP Modal */}
      <OtpModal
        visible={otpModalVisible}
        phone={profile?.phone || 'WhatsApp Anda'}
        loading={otpLoading}
        error={otpError}
        onVerify={handleOtpVerified}
        onResend={handleResendOtp}
        onClose={() => {
          setOtpModalVisible(false);
          setOtpError('');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12, paddingBottom: 15, paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'PlusJakartaSans-Bold', color: TEXT_DARK },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

  balanceCard: {
    borderRadius: 20, padding: 20, overflow: 'hidden',
    position: 'relative', marginTop: 20, marginBottom: 24,
    elevation: 6, shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 12,
  },
  circle1: { position: 'absolute', top: -40, right: -40, width: 120, height: 120, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 60 },
  circle2: { position: 'absolute', bottom: -60, left: -60, width: 160, height: 160, backgroundColor: 'rgba(253,185,39,0.04)', borderRadius: 80 },
  walletIconBox: { width: 42, height: 42, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  balanceLabel: { fontSize: 9, fontFamily: 'PlusJakartaSans-Bold', color: 'rgba(255,255,255,0.55)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 },
  balanceAmount: { fontSize: 22, fontFamily: 'PlusJakartaSans-Bold', color: '#FFFFFF' },
  pinStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  pinStatusText: { fontSize: 11, fontFamily: 'PlusJakartaSans-Medium', color: 'rgba(255,255,255,0.7)' },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold', color: TEXT_MUTED, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  manageLink: { fontSize: 12, fontFamily: 'PlusJakartaSans-SemiBold', color: PURPLE },

  inputCard: { backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 16, borderWidth: 1.5, borderColor: BORDER, flexDirection: 'row', alignItems: 'center', gap: 10 },
  inputCardError: { borderColor: ERROR },
  currency: { fontSize: 24, fontFamily: 'PlusJakartaSans-Bold', color: TEXT_DARK },
  input: { fontSize: 24, fontFamily: 'PlusJakartaSans-Bold', color: TEXT_DARK, flex: 1, padding: 0 },
  minText: { fontSize: 11, fontFamily: 'PlusJakartaSans-Medium', color: TEXT_MUTED, marginTop: 6, marginLeft: 4 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, marginLeft: 4 },
  errorText: { fontSize: 11, fontFamily: 'PlusJakartaSans-Medium', color: ERROR },

  otpWarning: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFFBEB', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, marginTop: 8,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  otpWarningText: {
    flex: 1, fontSize: 11, fontFamily: 'PlusJakartaSans-Medium', color: '#92400E', lineHeight: 16,
  },

  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  presetBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: BORDER },
  presetBtnActive: { borderColor: PURPLE, backgroundColor: `${PURPLE}10` },
  presetText: { fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold', color: TEXT_MUTED },
  presetTextActive: { color: PURPLE },

  noAccountBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: BORDER, borderStyle: 'dashed',
  },
  noAccountText: { flex: 1, fontSize: 13, fontFamily: 'PlusJakartaSans-Medium', color: TEXT_MUTED },

  accountList: { gap: 10 },
  accountCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: BORDER,
  },
  accountCardActive: { borderColor: PURPLE, backgroundColor: `${PURPLE}05` },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#D1D5DB',
    alignItems: 'center', justifyContent: 'center',
  },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: PURPLE },
  accountBankName: { fontSize: 14, fontFamily: 'PlusJakartaSans-Bold', color: TEXT_DARK },
  accountDetail: { fontSize: 12, fontFamily: 'PlusJakartaSans-Medium', color: TEXT_MUTED, marginTop: 2 },

  summaryCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: `${PURPLE}20`, marginTop: 8 },
  summaryTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans-Bold', color: TEXT_DARK, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  summaryLabel: { fontSize: 13, fontFamily: 'PlusJakartaSans-Medium', color: TEXT_MUTED },
  summaryValue: { fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold', color: TEXT_DARK },
  summaryDivider: { height: 1, backgroundColor: BORDER, marginVertical: 12 },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 28, elevation: 6, shadowColor: PURPLE, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10 },
  submitBtnText: { fontSize: 14, fontFamily: 'PlusJakartaSans-Bold', color: '#FFFFFF' },
  submitBtnMuted: { fontSize: 14, fontFamily: 'PlusJakartaSans-Bold', color: TEXT_MUTED },
});
