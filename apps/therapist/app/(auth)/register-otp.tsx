import { useState, useRef, useEffect } from 'react';
import { useThemeColors } from '@/store/themeStore';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/constants/Theme';
import { supabase } from '@/lib/supabase';
import { useAlert } from '@/components/CustomAlert';
import { useTherapistStore } from '@/store/therapistStore';
import { WEB_API_URL } from '@/lib/config';

const API_BASE = WEB_API_URL;

function normalizePhone(p: string): string {
  const d = p.replace(/\D/g, '');
  if (d.startsWith('0')) return '+62' + d.substring(1);
  if (d.startsWith('62')) return '+' + d;
  return '+62' + d;
}

export default function RegisterOTPScreen() {
  const t = useThemeColors();
  const styles = getStyles(t);
  const router = useRouter();
  const { phone, continue: continueParam } = useLocalSearchParams<{ phone: string; continue?: string }>();
  const { showAlert, AlertComponent } = useAlert();
  const fetchProfile = useTherapistStore(s => s.fetchProfile);

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const inputs = useRef<Array<TextInput | null>>([]);

  const startTimer = () => {
    setTimer(60);
    const interval = setInterval(() => {
      setTimer(t => { if (t <= 1) { clearInterval(interval); return 0; } return t - 1; });
    }, 1000);
  };

  useEffect(() => {
    startTimer();
    handleSendOTP();
  }, []);

  const handleSendOTP = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizePhone(phone), role: 'therapist', skip_check: true }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      startTimer();
    } catch (err: any) {
      showAlert('error', 'Gagal', err.message || 'Gagal mengirim OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPChange = (val: string, idx: number) => {
    const newOtp = [...otp];
    newOtp[idx] = val;
    setOtp(newOtp);
    if (val && idx < 5) inputs.current[idx + 1]?.focus();
    if (newOtp.every(d => d !== '') && newOtp.join('').length === 6) {
      verifyOTP(newOtp.join(''));
    }
  };

  const verifyOTP = async (otpCode: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizePhone(phone), otp: otpCode, role: 'therapist' }),
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);

      // Refresh therapist profile from Supabase
      if (continueParam === '1') {
        // Coming from registration — go login first, then continue filling data
        router.replace('/(auth)/login');
      } else {
        // Direct login OTP — go to dashboard
        await fetchProfile();
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      showAlert('error', 'Verifikasi Gagal', err.message || 'Kode OTP tidak valid');
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        {AlertComponent}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace(continueParam === '1' ? '/(auth)/register' : '/(auth)/login')}>
          <Ionicons name="arrow-back" size={24} color={t.text} />
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={[styles.icon, { backgroundColor: t.success }]}>
              <Ionicons name="checkmark-circle" size={40} color="#FFFFFF" />
            </View>

            <Text style={styles.title}>Akun Terdaftar!</Text>
            <Text style={styles.subtitle}>
              Tinggal satu langkah lagi! Masukkan kode OTP yang dikirim ke {phone || 'nomor Anda'}
            </Text>

            <View style={styles.card}>
              <Text style={styles.label}>Masukkan Kode OTP</Text>
              <View style={styles.otpRow}>
                {otp.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={ref => { inputs.current[i] = ref; }}
                    style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                    value={digit}
                    onChangeText={val => handleOTPChange(val.slice(-1), i)}
                    onKeyPress={({ nativeEvent }) => {
                      if (nativeEvent.key === 'Backspace' && !otp[i] && i > 0) {
                        inputs.current[i - 1]?.focus();
                        const n = [...otp]; n[i - 1] = ''; setOtp(n);
                      }
                    }}
                    keyboardType="number-pad"
                    maxLength={1}
                    textAlign="center"
                    selectTextOnFocus
                  />
                ))}
              </View>

              {loading && (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: SPACING.md }}>
                  <ActivityIndicator color={t.primary} size="small" />
                  <Text style={styles.timerText}>Memverifikasi...</Text>
                </View>
              )}

              {timer > 0 ? (
                <Text style={[styles.timerText, { marginTop: SPACING.md }]}>Kirim ulang dalam {timer} detik</Text>
              ) : (
                <TouchableOpacity onPress={handleSendOTP} disabled={loading} style={{ marginTop: SPACING.md }}>
                  <Text style={styles.resendText}>Kirim ulang OTP</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.footerText}>
              Akun Anda sedang menunggu verifikasi admin. Anda sudah bisa login dan melihat dashboard.
            </Text>

            <View style={[styles.supportCard, { borderColor: t.border }]}>
              <Ionicons name="help-buoy-outline" size={20} color={t.textSecondary} />
              <Text style={styles.supportText}>
                Tidak menerima OTP? Hubungi kami di{' '}
                <Text style={{ color: t.primary, fontFamily: 'Inter_700Bold' }}>support@kangmassage.app</Text>
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
  backBtn: { position: 'absolute', top: 52, left: SPACING.lg, padding: SPACING.sm, zIndex: 10 },
  scroll: { flexGrow: 1, justifyContent: 'center' },
  content: { alignItems: 'center', padding: SPACING.lg },
  icon: {
    width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.lg,
    shadowColor: t.success, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 10,
  },
  title: { ...TYPOGRAPHY.h2, color: t.text, marginBottom: 8, textAlign: 'center' },
  subtitle: { ...TYPOGRAPHY.body, color: t.textSecondary, textAlign: 'center', marginBottom: SPACING.xl, lineHeight: 22 },
  card: {
    width: '100%', backgroundColor: t.surface,
    borderRadius: RADIUS.xl, padding: SPACING.xl,
    borderWidth: 1, borderColor: t.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 8,
  },
  label: { ...TYPOGRAPHY.label, color: t.textSecondary, marginBottom: SPACING.sm, textAlign: 'center' },
  otpRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: SPACING.md },
  otpBox: {
    width: 44, height: 56, borderRadius: RADIUS.md,
    backgroundColor: t.background, borderWidth: 1.5, borderColor: t.border,
    ...TYPOGRAPHY.h3, color: t.text,
  },
  otpBoxFilled: { borderColor: t.primary, backgroundColor: t.primary + '05' },
  timerText: { ...TYPOGRAPHY.bodySmall, color: t.textMuted, textAlign: 'center' },
  resendText: { ...TYPOGRAPHY.bodySmall, color: t.primary, textAlign: 'center', fontFamily: 'Inter_700Bold' },
  footerText: {
    ...TYPOGRAPHY.caption, color: t.textMuted, textAlign: 'center',
    marginTop: SPACING.xl, lineHeight: 18, paddingHorizontal: SPACING.lg,
  },
  supportCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    marginTop: SPACING.lg, padding: SPACING.md,
    borderRadius: RADIUS.lg, borderWidth: 1,
  },
  supportText: {
    flex: 1, ...TYPOGRAPHY.caption, color: t.textSecondary, lineHeight: 18,
  },
});
