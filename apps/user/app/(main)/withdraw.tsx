import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  ChevronLeft, Wallet, ArrowRight, Building2,
  AlertCircle, CheckCircle2, Receipt
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { useAlert } from '@/context/AlertContext';
import { API_URL } from '@/lib/config';
import { supabase } from '@/lib/supabase';

const PURPLE = '#240080';
const PURPLE_DARK = '#12004D';
const GOLD = '#FDB927';
const SUCCESS = '#00A896';
const ERROR = '#E74C3C';
const TEXT_DARK = '#1A1A2E';
const TEXT_MUTED = '#6B7280';
const BORDER = '#F0F0F0';
const BG = '#F8F8FB';

const MIN_WITHDRAW = 50000;
const ADMIN_FEE = 5000;

const BANK_LIST = [
  { id: 'dana', name: 'DANA Wallet', code: 'DANA' },
  { id: 'bca', name: 'BCA', code: '014' },
  { id: 'bni', name: 'BNI', code: '009' },
  { id: 'bri', name: 'BRI', code: '002' },
  { id: 'mandiri', name: 'Mandiri', code: '008' },
  { id: 'cimb', name: 'CIMB Niaga', code: '022' },
  { id: 'permata', name: 'Permata', code: '013' },
  { id: 'bsi', name: 'BSI', code: '451' },
  { id: 'danamon', name: 'Danamon', code: '011' },
];

const PRESETS = [50000, 100000, 200000, 500000];

export default function WithdrawScreen() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const { showAlert } = useAlert();

  const [displayAmount, setDisplayAmount] = useState('');
  const [selectedBank, setSelectedBank] = useState('dana');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const balance = profile?.wallet_balance || 0;

  useFocusEffect(
    useCallback(() => {
      setDisplayAmount('');
      setSelectedBank('dana');
      setAccountNumber('');
      setAccountName('');
      setSuccess(false);
    }, [])
  );

  const formatNumber = (num: string) => {
    const value = num.replace(/\D/g, '');
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleAmountChange = (text: string) => setDisplayAmount(formatNumber(text));
  const getRawAmount = () => parseInt(displayAmount.replace(/\./g, '')) || 0;

  const isAmountValid = getRawAmount() >= MIN_WITHDRAW;
  const isBalanceSufficient = getRawAmount() + ADMIN_FEE <= balance;
  const isFormValid = isAmountValid && isBalanceSufficient && selectedBank && accountNumber.length >= 8 && accountName.length >= 3;

  const selectedBankName = BANK_LIST.find(b => b.id === selectedBank)?.name || '-';
  const selectedBankCode = BANK_LIST.find(b => b.id === selectedBank)?.code || '';

  const handleWithdraw = async () => {
    if (!isFormValid) return;

    setLoading(true);
    try {
      const { data: pendingWd } = await supabase
        .from('user_withdrawals')
        .select('id')
        .eq('user_id', profile?.id)
        .eq('status', 'pending')
        .limit(1);

      if (pendingWd && pendingWd.length > 0) {
        showAlert('Proses Tertunda', 'Anda masih memiliki penarikan yang sedang diproses.');
        setLoading(false);
        return;
      }

      const rawAmount = getRawAmount();

      const response = await fetch(`${API_URL}/api/withdraw/user-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: profile?.id,
          amount: rawAmount,
          bank_name: selectedBankName,
          bank_code: selectedBankCode,
          account_number: accountNumber,
          account_name: accountName,
        }),
      });

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      await refreshProfile();
      showAlert('Penarikan Berhasil', 'Permintaan penarikan Anda sedang diproses. Dana akan masuk ke rekening dalam 1-3 hari kerja.');
      router.replace('/withdraw-history');
    } catch (error: any) {
      showAlert('Gagal', error.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.successContainer}>
          <View style={styles.successIconBox}>
            <CheckCircle2 size={64} color={SUCCESS} />
          </View>
          <Text style={styles.successTitle}>Penarikan Berhasil!</Text>
          <Text style={styles.successDesc}>
            Permintaan penarikan sebesar{'\n'}
            <Text style={{ fontFamily: 'PlusJakartaSans-Bold', color: TEXT_DARK }}>
              Rp {getRawAmount().toLocaleString('id-ID')}
            </Text>
            {'\n'}telah dikirim ke {selectedBankName} ({accountNumber}).
          </Text>
          <Text style={styles.successNote}>
            Dana akan masuk ke rekening Anda dalam 1-3 hari kerja.
          </Text>

          <TouchableOpacity
            style={styles.backToWalletBtn}
            onPress={() => router.replace('/wallet')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[PURPLE, PURPLE_DARK]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientBtn}
            >
              <Text style={styles.gradientBtnText}>Kembali ke Dompet</Text>
              <ArrowRight size={18} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

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
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
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
          </LinearGradient>

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
                <Text style={styles.errorText}>
                  Minimal penarikan Rp {MIN_WITHDRAW.toLocaleString('id-ID')}
                </Text>
              </View>
            ) : !isBalanceSufficient && displayAmount !== '' ? (
              <View style={styles.errorRow}>
                <AlertCircle size={12} color={ERROR} />
                <Text style={styles.errorText}>Saldo tidak mencukupi (termasuk biaya admin Rp {ADMIN_FEE.toLocaleString('id-ID')})</Text>
              </View>
            ) : (
              <Text style={styles.minText}>
                Minimal Rp {MIN_WITHDRAW.toLocaleString('id-ID')} · Biaya admin Rp {ADMIN_FEE.toLocaleString('id-ID')}
              </Text>
            )}

            <View style={styles.presetGrid}>
              {PRESETS.filter(p => p + ADMIN_FEE <= balance).map(p => (
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
              {balance - ADMIN_FEE >= MIN_WITHDRAW && (
                <TouchableOpacity
                  style={[styles.presetBtn, getRawAmount() === balance - ADMIN_FEE && styles.presetBtnActive]}
                  onPress={() => handleAmountChange((balance - ADMIN_FEE).toString())}
                >
                  <Text style={[styles.presetText, getRawAmount() === balance - ADMIN_FEE && styles.presetTextActive]}>
                    Semua
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pilih Bank Tujuan</Text>
            <View style={styles.bankGrid}>
              {BANK_LIST.map(bank => (
                <TouchableOpacity
                  key={bank.id}
                  style={[styles.bankBtn, selectedBank === bank.id && styles.bankBtnActive]}
                  onPress={() => setSelectedBank(bank.id)}
                >
                  <Building2 size={16} color={selectedBank === bank.id ? PURPLE : TEXT_MUTED} />
                  <Text style={[
                    styles.bankBtnText,
                    selectedBank === bank.id && styles.bankBtnTextActive
                  ]}>
                    {bank.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{selectedBank === 'dana' ? 'Detail Akun DANA' : 'Detail Rekening'}</Text>
            <View style={styles.fieldCard}>
              <Text style={styles.fieldLabel}>{selectedBank === 'dana' ? 'Nomor HP DANA' : 'Nomor Rekening'}</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder={selectedBank === 'dana' ? 'Contoh: 08xxxxxxxxxx' : 'Masukkan nomor rekening'}
                placeholderTextColor={TEXT_MUTED}
                keyboardType="number-pad"
                value={accountNumber}
                onChangeText={setAccountNumber}
              />
            </View>
            <View style={[styles.fieldCard, { marginTop: 10 }]}>
              <Text style={styles.fieldLabel}>{selectedBank === 'dana' ? 'Nama Akun DANA' : 'Nama Pemilik Rekening'}</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder={selectedBank === 'dana' ? 'Masukkan nama terdaftar di DANA' : 'Masukkan nama sesuai rekening'}
                placeholderTextColor={TEXT_MUTED}
                value={accountName}
                onChangeText={setAccountName}
                autoCapitalize="words"
              />
            </View>
          </View>

          {isFormValid && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Ringkasan Penarikan</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Jumlah Penarikan</Text>
                <Text style={styles.summaryValue}>Rp {getRawAmount().toLocaleString('id-ID')}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Biaya Admin</Text>
                <Text style={styles.summaryValue}>Rp {ADMIN_FEE.toLocaleString('id-ID')}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{selectedBank === 'dana' ? 'Tujuan' : 'Bank Tujuan'}</Text>
                <Text style={styles.summaryValue}>{selectedBankName}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{selectedBank === 'dana' ? 'No. Handphone DANA' : 'No. Rekening'}</Text>
                <Text style={styles.summaryValue}>{accountNumber}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: TEXT_DARK, fontFamily: 'PlusJakartaSans-Bold' }]}>Total Dipotong</Text>
                <Text style={[styles.summaryValue, { color: ERROR, fontSize: 18, fontFamily: 'PlusJakartaSans-Bold' }]}>
                  Rp {(getRawAmount() + ADMIN_FEE).toLocaleString('id-ID')}
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
            <TouchableOpacity
              onPress={handleWithdraw}
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
                    <Text style={[
                      styles.submitBtnText,
                      (!isFormValid) && { color: TEXT_MUTED }
                    ]}>
                      Ajukan Penarikan
                    </Text>
                    <ArrowRight
                      size={20}
                      color={!isFormValid ? TEXT_MUTED : '#FFFFFF'}
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
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12, paddingBottom: 15, paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18, fontFamily: 'PlusJakartaSans-Bold', color: TEXT_DARK,
  },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

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

  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold',
    color: TEXT_MUTED, marginBottom: 12,
  },

  inputCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    paddingHorizontal: 20, paddingVertical: 16,
    borderWidth: 1.5, borderColor: BORDER,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  inputCardError: { borderColor: ERROR },
  currency: { fontSize: 24, fontFamily: 'PlusJakartaSans-Bold', color: TEXT_DARK },
  input: {
    fontSize: 24, fontFamily: 'PlusJakartaSans-Bold', color: TEXT_DARK,
    flex: 1, padding: 0,
  },
  minText: {
    fontSize: 11, fontFamily: 'PlusJakartaSans-Medium',
    color: TEXT_MUTED, marginTop: 6, marginLeft: 4,
  },
  errorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 6, marginLeft: 4,
  },
  errorText: {
    fontSize: 11, fontFamily: 'PlusJakartaSans-Medium', color: ERROR,
  },

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

  bankGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  bankBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 14, backgroundColor: '#FFFFFF',
    borderWidth: 1.5, borderColor: BORDER,
  },
  bankBtnActive: {
    borderColor: PURPLE, backgroundColor: `${PURPLE}08`,
  },
  bankBtnText: {
    fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold', color: TEXT_MUTED,
  },
  bankBtnTextActive: { color: PURPLE },

  fieldCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: BORDER,
  },
  fieldLabel: {
    fontSize: 11, fontFamily: 'PlusJakartaSans-SemiBold',
    color: TEXT_MUTED, marginBottom: 8, textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldInput: {
    fontSize: 14, fontFamily: 'PlusJakartaSans-SemiBold', color: TEXT_DARK,
    padding: 0,
  },

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
    height: 1, backgroundColor: BORDER, marginVertical: 12,
  },

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

  successContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32,
  },
  successIconBox: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: `${SUCCESS}15`,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 22, fontFamily: 'PlusJakartaSans-Bold',
    color: TEXT_DARK, marginBottom: 12,
  },
  successDesc: {
    fontSize: 14, fontFamily: 'PlusJakartaSans-Medium',
    color: TEXT_MUTED, textAlign: 'center', lineHeight: 22,
    marginBottom: 12,
  },
  successNote: {
    fontSize: 12, fontFamily: 'PlusJakartaSans-Medium',
    color: GOLD, textAlign: 'center',
    marginBottom: 32, backgroundColor: '#FFFBEB',
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 12,
  },
  backToWalletBtn: { width: '100%' },
  gradientBtn: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10,
    paddingVertical: 16, borderRadius: 28,
  },
  gradientBtnText: {
    fontSize: 14, fontFamily: 'PlusJakartaSans-Bold', color: '#FFFFFF',
  },
});
