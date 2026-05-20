import { useState, useRef } from 'react';
import { useThemeColors } from '@/store/themeStore';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/constants/Theme';
import { supabase } from '@/lib/supabase';
import { useAlert } from '@/components/CustomAlert';

const API_BASE = 'https://app-kangmassage-web.vercel.app';

function normalizePhone(p: string): string {
  const d = p.replace(/\D/g, '');
  if (d.startsWith('0')) return '+62' + d.substring(1);
  if (d.startsWith('62')) return '+' + d;
  return '+62' + d;
}

export default function OTPScreen() {
  const t = useThemeColors();
  const styles = getStyles(t);
  const router = useRouter();
  const { showAlert, AlertComponent } = useAlert();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const inputs = useRef<Array<TextInput | null>>([]);

  const handleSendOTP = async () => {
    if (phone.length < 9) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizePhone(phone), role: 'therapist' }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStep('otp');
      startTimer();
    } catch (err: any) {
      showAlert('error', 'Gagal', err.message || 'Gagal mengirim OTP');
    } finally {
      setLoading(false);
    }
  };

  const startTimer = () => {
    setTimer(60);
    const interval = setInterval(() => {
      setTimer(t => { if (t <= 1) { clearInterval(interval); return 0; } return t - 1; });
    }, 1000);
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

      const { session } = result.data;
      if (session?.access_token) {
        const { error } = await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
        if (error) throw error;
      }
      router.replace('/(tabs)');
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
        <TouchableOpacity style={styles.backBtn} onPress={() => step === 'otp' ? setStep('phone') : router.back()}>
          <Ionicons name="arrow-back" size={24} color={t.text} />
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={[styles.icon, { backgroundColor: t.primary }]}>
              <Ionicons name="chatbubble-ellipses" size={40} color="#FFFFFF" />
            </View>

            <Text style={styles.title}>{step === 'phone' ? 'Masuk dengan OTP' : 'Verifikasi OTP'}</Text>
            <Text style={styles.subtitle}>
              {step === 'phone'
                ? 'Kami akan kirim kode 6 digit ke nomor Anda'
                : `Kode telah dikirim ke ${normalizePhone(phone)}`}
            </Text>

            <View style={styles.card}>
              {step === 'phone' ? (
                <>
                  <Text style={styles.label}>Nomor Telepon</Text>
                  <View style={styles.inputWrap}>
                    <Text style={styles.prefix}>+62</Text>
                    <View style={styles.vDivider} />
                    <TextInput
                      style={styles.input}
                      placeholder="8xxxxxxxxx"
                      placeholderTextColor={t.textMuted}
                      keyboardType="phone-pad"
                      value={phone}
                      onChangeText={setPhone}
                    />
                  </View>
                  <TouchableOpacity onPress={handleSendOTP} disabled={loading || phone.length < 9} activeOpacity={0.85}>
                    <LinearGradient colors={[t.secondary, '#EA580C']} style={styles.btn}>
                      {loading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={[styles.btnText, { color: '#FFFFFF' }]}>Kirim OTP</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              ) : (
                <>
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: SPACING.md }}>
                      <ActivityIndicator color={t.primary} size="small" />
                      <Text style={[styles.timerText, { color: t.textSecondary }]}>Memverifikasi...</Text>
                    </View>
                  )}

                  {timer > 0 ? (
                    <Text style={styles.timerText}>Kirim ulang dalam {timer} detik</Text>
                  ) : (
                    <TouchableOpacity onPress={handleSendOTP} disabled={loading}>
                      <Text style={styles.resendText}>Kirim ulang OTP</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
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
    shadowColor: t.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 10,
  },
  title: { ...TYPOGRAPHY.h2, color: t.text, marginBottom: 8, textAlign: 'center' },
  subtitle: { ...TYPOGRAPHY.body, color: t.textSecondary, textAlign: 'center', marginBottom: SPACING.xl, lineHeight: 22 },
  card: {
    width: '100%', backgroundColor: t.surface,
    borderRadius: RADIUS.xl, padding: SPACING.xl,
    borderWidth: 1, borderColor: t.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 8,
  },
  label: { ...TYPOGRAPHY.label, color: t.textSecondary, marginBottom: SPACING.sm },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: t.background, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: t.border, overflow: 'hidden',
    marginBottom: SPACING.lg,
  },
  prefix: { ...TYPOGRAPHY.body, color: t.text, paddingHorizontal: SPACING.md, fontFamily: 'Inter_600SemiBold' },
  vDivider: { width: 1.5, height: '60%', backgroundColor: t.border },
  input: { ...TYPOGRAPHY.body, color: t.text, flex: 1, paddingHorizontal: SPACING.md, paddingVertical: 14 },
  btn: {
    paddingVertical: 16, borderRadius: RADIUS.full, alignItems: 'center',
    shadowColor: t.secondary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  btnText: { ...TYPOGRAPHY.h4, fontFamily: 'Inter_700Bold' },
  otpRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: SPACING.md },
  otpBox: {
    width: 44, height: 56, borderRadius: RADIUS.md,
    backgroundColor: t.background, borderWidth: 1.5, borderColor: t.border,
    ...TYPOGRAPHY.h3, color: t.text,
  },
  otpBoxFilled: { borderColor: t.primary, backgroundColor: t.primary + '05' },
  timerText: { ...TYPOGRAPHY.bodySmall, color: t.textMuted, textAlign: 'center', marginBottom: SPACING.sm },
  resendText: { ...TYPOGRAPHY.bodySmall, color: t.primary, textAlign: 'center', fontFamily: 'Inter_700Bold' },
});
