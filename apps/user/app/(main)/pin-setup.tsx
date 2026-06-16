import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, KeyRound, Shield, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/lib/config';

const PURPLE = '#240080';
const PURPLE_DARK = '#12004D';
const TEXT_DARK = '#1A1A2E';
const TEXT_MUTED = '#6B7280';
const ERROR = '#E74C3C';
const SUCCESS = '#00A896';
const BG = '#F8F8FB';
const BORDER = '#F0F0F0';

export default function PinSetupScreen() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const [step, setStep] = useState<'create' | 'confirm' | 'success'>('create');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const handleNext = () => {
    setError('');
    if (pin.length !== 6) {
      setError('PIN harus 6 digit');
      return;
    }
    setStep('confirm');
  };

  const handleSave = async () => {
    setError('');
    if (pin !== confirmPin) {
      setError('PIN tidak cocok');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/pin/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: profile?.id, pin, confirm_pin: confirmPin }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      await refreshProfile();
      setStep('success');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderDigitDots = (value: string) => (
    <View style={styles.dotsRow}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={[styles.dot, value.length > i && styles.dotFilled]} />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PIN Transaksi</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {step === 'success' ? (
          <View style={styles.successBox}>
            <View style={styles.successIconBox}>
              <CheckCircle2 size={64} color={SUCCESS} />
            </View>
            <Text style={styles.successTitle}>PIN Berhasil Dibuat!</Text>
            <Text style={styles.successDesc}>
              PIN transaksi Anda telah disimpan. Gunakan PIN ini setiap kali melakukan penarikan saldo.
            </Text>
            <TouchableOpacity
              style={styles.successBtn}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
              <Text style={styles.successBtnText}>Selesai</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.infoCard}>
              <View style={styles.infoIconBox}>
                <Shield size={24} color={PURPLE} />
              </View>
              <Text style={styles.infoTitle}>Keamanan Transaksi</Text>
              <Text style={styles.infoDesc}>
                PIN transaksi digunakan untuk memverifikasi setiap penarikan saldo Anda.
                Jangan bagikan PIN ini kepada siapa pun, termasuk pihak yang mengaku dari Kang Massage.
              </Text>
            </View>

            <View style={styles.formCard}>
              <View style={styles.pinDisplay}>
                {step === 'create' ? (
                  <>
                    <Text style={styles.formLabel}>Buat PIN 6 Digit</Text>
                    {renderDigitDots(pin)}
                    <Text style={styles.pinHint}>{pin.length}/6 digit</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.formLabel}>Konfirmasi PIN</Text>
                    {renderDigitDots(confirmPin)}
                    <Text style={styles.pinHint}>{confirmPin.length}/6 digit</Text>
                  </>
                )}
              </View>

              {error ? (
                <View style={styles.errorRow}>
                  <AlertCircle size={14} color={ERROR} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.numpadContainer}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'DEL'].map((key, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.numpadKey,
                    key === '' && { opacity: 0 },
                  ]}
                  onPress={() => {
                    if (key === 'DEL') {
                      if (step === 'create') setPin(p => p.slice(0, -1));
                      else setConfirmPin(p => p.slice(0, -1));
                    } else if (typeof key === 'number') {
                      if (step === 'create' && pin.length < 6) setPin(p => p + key);
                      else if (step === 'confirm' && confirmPin.length < 6) setConfirmPin(p => p + key);
                    }
                  }}
                  disabled={key === ''}
                  activeOpacity={0.6}
                >
                  <Text style={styles.numpadKeyText}>
                    {key === 'DEL' ? '⌫' : key}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {step === 'create' ? (
              <TouchableOpacity
                style={[styles.primaryBtn, pin.length < 6 && styles.btnDisabled]}
                onPress={handleNext}
                disabled={pin.length < 6}
                activeOpacity={0.85}
              >
                <Text style={[styles.primaryBtnText, pin.length < 4 && { color: TEXT_MUTED }]}>Lanjutkan</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.primaryBtn, (confirmPin.length < 6 || loading) && styles.btnDisabled]}
                onPress={handleSave}
                disabled={confirmPin.length < 6 || loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={[styles.primaryBtnText, (confirmPin.length < 4) && { color: TEXT_MUTED }]}>Simpan PIN</Text>
                )}
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'PlusJakartaSans-Bold', color: TEXT_DARK },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  infoCard: {
    backgroundColor: `${PURPLE}08`,
    borderRadius: 16, padding: 14, marginTop: 20, marginBottom: 20,
    borderWidth: 1, borderColor: `${PURPLE}20`,
    alignItems: 'center',
  },
  infoIconBox: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: `${PURPLE}15`,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 14, fontFamily: 'PlusJakartaSans-Bold', color: TEXT_DARK, marginBottom: 6,
  },
  infoDesc: {
    fontSize: 12, fontFamily: 'PlusJakartaSans-Medium', color: TEXT_MUTED,
    textAlign: 'center', lineHeight: 18,
  },

  formCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20,
    padding: 24, borderWidth: 1, borderColor: BORDER,
    marginBottom: 24, alignItems: 'center',
  },
  pinDisplay: { alignItems: 'center', gap: 16 },
  formLabel: {
    fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold',
    color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  dotsRow: { flexDirection: 'row', gap: 10 },
  dot: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#F0F0F0', borderWidth: 1.5, borderColor: '#E0E0E0',
  },
  dotFilled: { backgroundColor: PURPLE, borderColor: PURPLE },
  pinHint: {
    fontSize: 11, fontFamily: 'PlusJakartaSans-Medium', color: TEXT_MUTED,
  },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  errorText: { fontSize: 12, fontFamily: 'PlusJakartaSans-Medium', color: ERROR },

  numpadContainer: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 10, marginBottom: 24,
  },
  numpadKey: {
    flex: 1, maxWidth: '30%', height: 52, borderRadius: 14,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: BORDER,
  },
  numpadKeyText: { fontSize: 22, fontFamily: 'PlusJakartaSans-SemiBold', color: TEXT_DARK },

  primaryBtn: {
    backgroundColor: PURPLE, paddingVertical: 16,
    borderRadius: 28, alignItems: 'center', justifyContent: 'center',
  },
  btnDisabled: { backgroundColor: '#E2E8F0' },
  primaryBtnText: { fontSize: 14, fontFamily: 'PlusJakartaSans-Bold', color: '#FFFFFF' },

  successBox: { alignItems: 'center', paddingTop: 60 },
  successIconBox: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: `${SUCCESS}15`,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 22, fontFamily: 'PlusJakartaSans-Bold', color: TEXT_DARK, marginBottom: 12,
  },
  successDesc: {
    fontSize: 14, fontFamily: 'PlusJakartaSans-Medium',
    color: TEXT_MUTED, textAlign: 'center', lineHeight: 22,
    marginBottom: 32, paddingHorizontal: 20,
  },
  successBtn: {
    backgroundColor: PURPLE, paddingVertical: 16,
    paddingHorizontal: 48, borderRadius: 28,
  },
  successBtnText: { fontSize: 14, fontFamily: 'PlusJakartaSans-Bold', color: '#FFFFFF' },
});
