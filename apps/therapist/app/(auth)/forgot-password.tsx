import { useState, useRef, useEffect, useCallback } from 'react';
import { useThemeColors } from '@/store/themeStore';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/constants/Theme';
import { WEB_API_URL } from '@/lib/config';
import { CustomAlertTrigger } from '@/store/alertStore';
import * as Clipboard from 'expo-clipboard';

const API_BASE = WEB_API_URL;

type Step = 'phone' | 'otp' | 'password';

export default function ForgotPasswordScreen() {
  const t = useThemeColors();
  const styles = getStyles(t);
  
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const otpInputs = useRef<Array<TextInput | null>>([]);

  const startTimer = () => {
    setTimer(60);
    const interval = setInterval(() => {
      setTimer(t => { if (t <= 1) { clearInterval(interval); return 0; } return t - 1; });
    }, 1000);
  };

  const stepInfo = {
    phone: { icon: 'phone-portrait-outline', title: 'Lupa Kata Sandi', subtitle: 'Masukkan nomor telepon Anda untuk reset kata sandi' },
    otp: { icon: 'shield-checkmark-outline', title: 'Verifikasi OTP', subtitle: 'Masukkan kode 6 digit yang kami kirimkan' },
    password: { icon: 'lock-closed-outline', title: 'Buat Kata Sandi Baru', subtitle: 'Min 8 karakter, huruf besar & angka' },
  };

  const info = stepInfo[step];

  const handleSendOtp = async () => {
    if (!phone.trim()) {
      CustomAlertTrigger.show({ type: 'error', title: 'Error', message: 'Masukkan nomor telepon Anda' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/otp/forgot-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, role: 'therapist' }),
      });
      const data = await res.json();
      if (!res.ok) {
        CustomAlertTrigger.show({ type: 'error', title: 'Error', message: data.error || 'Gagal mengirim OTP' });
        return;
      }
      if (!data.fonnte_configured) {
        CustomAlertTrigger.show({ type: 'warning', title: 'Mode Development', message: `Gunakan kode OTP: ${data.otp || '(lihat log server)'}` });
      } else if (!data.fonnte_sent && data.otp) {
        CustomAlertTrigger.show({ type: 'warning', title: 'WhatsApp Gagal', message: `Gagal kirim via WhatsApp. Gunakan kode: ${data.otp}`, buttons: [{ text: 'OK' }] });
      }
      CustomAlertTrigger.show({ type: 'success', title: 'Berhasil', message: 'OTP terkirim ke WhatsApp' });
      startTimer();
      setStep('otp');
    } catch (e: any) {
      CustomAlertTrigger.show({ type: 'error', title: 'Error', message: 'Gagal terhubung ke server. Periksa koneksi Anda.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step !== 'otp') return;
    const interval = setInterval(async () => {
      try {
        const text = await Clipboard.getStringAsync();
        const match = text?.match(/\b(\d{6})\b/);
        if (match && otp.join('') !== match[1]) {
          const code = match[1].split('');
          setOtp(code);
          otpInputs.current[5]?.focus();
          handleVerifyOtp(match[1]);
        }
      } catch { }
    }, 2000);
    return () => clearInterval(interval);
  }, [step, otp]);

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/otp/forgot-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, role: 'therapist' }),
      });
      const data = await res.json();
      if (!res.ok) {
        CustomAlertTrigger.show({ type: 'error', title: 'Error', message: data.error || 'Gagal mengirim ulang OTP' });
        return;
      }
      if (!data.fonnte_configured) {
        CustomAlertTrigger.show({ type: 'warning', title: 'Mode Development', message: `Gunakan kode OTP: ${data.otp || '(lihat log server)'}` });
      } else if (!data.fonnte_sent && data.otp) {
        CustomAlertTrigger.show({ type: 'warning', title: 'WhatsApp Gagal', message: `Gagal kirim via WhatsApp. Gunakan kode: ${data.otp}`, buttons: [{ text: 'OK' }] });
      }
      CustomAlertTrigger.show({ type: 'success', title: 'Berhasil', message: 'OTP telah dikirim ulang' });
      startTimer();
    } catch {
      CustomAlertTrigger.show({ type: 'error', title: 'Error', message: 'Gagal terhubung ke server.' });
    } finally {
      setLoading(false);
    }
  };

  const handleOTPChange = (val: string, idx: number) => {
    const newOtp = [...otp];
    newOtp[idx] = val;
    setOtp(newOtp);
    if (val && idx < 5) otpInputs.current[idx + 1]?.focus();
    if (newOtp.every(d => d !== '') && newOtp.join('').length === 6) {
      handleVerifyOtp(newOtp.join(''));
    }
  };

  const handleVerifyOtp = async (directCode?: string) => {
    const code = directCode || otp.join('');
    if (code.length !== 6) {
      CustomAlertTrigger.show({ type: 'error', title: 'Error', message: 'Masukkan kode OTP 6 digit' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp: code, role: 'therapist', skip_step_update: true, mark_used: false }),
      });
      const data = await res.json();
      if (!res.ok) {
        CustomAlertTrigger.show({ type: 'error', title: 'Error', message: data.error || 'Kode OTP tidak valid' });
        return;
      }
      setStep('password');
    } catch (e: any) {
      CustomAlertTrigger.show({ type: 'error', title: 'Error', message: 'Gagal terhubung ke server.' });
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = useCallback((pwd: string) => {
    const errors: string[] = [];
    if (pwd.length < 8) errors.push('Minimal 8 karakter');
    if (!/[A-Z]/.test(pwd)) errors.push('Huruf besar');
    if (!/[0-9]/.test(pwd)) errors.push('Angka');
    setPasswordErrors(errors);
    setNewPwd(pwd);
  }, []);

  const handleResetPassword = async () => {
    if (passwordErrors.length > 0) {
      CustomAlertTrigger.show({ type: 'error', title: 'Error', message: `Kata sandi: ${passwordErrors.join(', ')}` });
      return;
    }
    if (newPwd !== confirmPwd) {
      CustomAlertTrigger.show({ type: 'error', title: 'Error', message: 'Konfirmasi kata sandi tidak cocok' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp: otp.join(''), new_password: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) {
        CustomAlertTrigger.show({ type: 'error', title: 'Error', message: data.error || 'Gagal mereset kata sandi' });
        return;
      }
      CustomAlertTrigger.show({
        type: 'success',
        title: 'Berhasil',
        message: 'Kata sandi Anda telah diperbarui. Silakan login.',
        buttons: [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }],
      });
    } catch (e: any) {
      CustomAlertTrigger.show({ type: 'error', title: 'Error', message: 'Gagal terhubung ke server.' });
    } finally {
      setLoading(false);
    }
  };

  const stepCount = step === 'phone' ? 1 : step === 'otp' ? 2 : 3;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => step === 'phone' ? router.back() : setStep(step === 'otp' ? 'phone' : 'otp')}>
          <Ionicons name="arrow-back" size={24} color={t.text} />
        </TouchableOpacity>
        
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Steps */}
          <View style={styles.stepRow}>
            {[1, 2, 3].map(n => (
              <View key={n} style={styles.stepWrap}>
                <View style={[styles.stepCircle, n <= stepCount && styles.stepActive]}>
                  <Text style={[styles.stepNum, n <= stepCount && styles.stepNumActive]}>{n}</Text>
                </View>
                {n < 3 && <View style={[styles.stepLine, n < stepCount && styles.stepLineActive]} />}
              </View>
            ))}
          </View>

          {/* Icon */}
          <View style={[styles.icon, { backgroundColor: t.primary }]}>
            <Ionicons name={info.icon as any} size={40} color="#FFFFFF" />
          </View>

          <Text style={styles.title}>{info.title}</Text>
          <Text style={styles.subtitle}>{info.subtitle}</Text>

          <View style={styles.card}>
            {step === 'phone' && (
              <>
                <Text style={styles.label}>Nomor Telepon</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="call-outline" size={20} color={t.textMuted} />
                  <TextInput style={styles.input} placeholder="08xxxxxxxxxx" placeholderTextColor={t.textMuted} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
                </View>
              </>
            )}
              {step === 'otp' && (
              <>
                <Text style={[styles.label, { textAlign: 'center' }]}>Kode OTP (6 digit)</Text>
                <View style={styles.otpRow}>
                  {otp.map((digit, i) => (
                    <TextInput
                      key={i}
                      ref={ref => { otpInputs.current[i] = ref; }}
                      style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                      value={digit}
                      onChangeText={val => handleOTPChange(val.slice(-1), i)}
                      onKeyPress={({ nativeEvent }) => {
                        if (nativeEvent.key === 'Backspace' && !otp[i] && i > 0) {
                          otpInputs.current[i - 1]?.focus();
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
                {timer > 0 ? (
                  <Text style={[styles.timerText, { marginTop: SPACING.sm }]}>Kirim ulang dalam {timer} detik</Text>
                ) : (
                  <TouchableOpacity onPress={handleResendOtp} disabled={loading} style={{ marginTop: SPACING.sm }}>
                    <Text style={styles.resendText}>Kirim ulang OTP</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
            {step === 'password' && (
              <>
                <Text style={styles.label}>Kata Sandi Baru</Text>
                <View style={[styles.inputWrap, passwordErrors.length > 0 && { borderColor: t.danger }]}>
                  <Ionicons name="lock-closed-outline" size={20} color={t.textMuted} />
                  <TextInput style={styles.input} placeholder="Min 8 karakter, huruf besar & angka" placeholderTextColor={t.textMuted} secureTextEntry value={newPwd} onChangeText={validatePassword} />
                </View>
                {passwordErrors.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6, marginBottom: SPACING.sm }}>
                    {['Minimal 8 karakter', 'Huruf besar', 'Angka'].map(rule => {
                      const passed = rule === 'Minimal 8 karakter' ? newPwd.length >= 8
                        : rule === 'Huruf besar' ? /[A-Z]/.test(newPwd)
                        : /[0-9]/.test(newPwd);
                      return (
                        <View key={rule} style={[styles.ruleChip, { backgroundColor: passed ? t.success + '20' : t.danger + '15', borderColor: passed ? t.success + '30' : t.danger + '25' }]}>
                          <Ionicons name={passed ? 'checkmark-circle' : 'close-circle'} size={12} color={passed ? t.success : t.danger} />
                          <Text style={[styles.ruleText, { color: passed ? t.success : t.danger }]}>{rule}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
                <Text style={styles.label}>Konfirmasi Kata Sandi</Text>
                <View style={[styles.inputWrap, confirmPwd && newPwd !== confirmPwd && { borderColor: t.danger }]}>
                  <Ionicons name="shield-outline" size={20} color={t.textMuted} />
                  <TextInput style={styles.input} placeholder="Ulangi kata sandi baru" placeholderTextColor={t.textMuted} secureTextEntry value={confirmPwd} onChangeText={setConfirmPwd} />
                </View>
                {confirmPwd && newPwd !== confirmPwd && (
                  <Text style={{ color: t.danger, fontSize: 11, marginTop: 4, marginLeft: 4 }}>Kata sandi tidak cocok</Text>
                )}
              </>
            )}

            <TouchableOpacity
              onPress={step === 'phone' ? handleSendOtp : step === 'otp' ? handleVerifyOtp : handleResetPassword}
              disabled={loading}
              activeOpacity={0.85}
              style={{ marginTop: SPACING.md }}
            >
              <LinearGradient colors={[t.secondary, '#EA580C']} style={styles.btn}>
                <Text style={[styles.btnText, { color: '#FFFFFF' }]}>
                  {loading ? 'Memproses...' : step === 'password' ? 'Simpan Kata Sandi' : 'Lanjut'}
                </Text>
                {!loading && <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />}
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
  backBtn: { position: 'absolute', top: 52, left: SPACING.lg, padding: SPACING.sm, zIndex: 10 },

  scroll: { alignItems: 'center', padding: SPACING.lg, paddingTop: 100, paddingBottom: 40 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xl },
  stepWrap: { flexDirection: 'row', alignItems: 'center' },
  stepCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: t.surface, borderWidth: 2, borderColor: t.border, alignItems: 'center', justifyContent: 'center' },
  stepActive: { backgroundColor: t.surface, borderColor: t.primary },
  stepNum: { ...TYPOGRAPHY.caption, color: t.textMuted, fontFamily: 'Inter_700Bold' },
  stepNumActive: { color: t.primary },
  stepLine: { width: 40, height: 2, backgroundColor: t.border },
  stepLineActive: { backgroundColor: t.primary },
  icon: {
    width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md,
    shadowColor: t.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 10,
  },
  title: { ...TYPOGRAPHY.h2, color: t.text, textAlign: 'center', marginBottom: 8 },
  subtitle: { ...TYPOGRAPHY.body, color: t.textSecondary, textAlign: 'center', marginBottom: SPACING.xl, lineHeight: 22 },
  card: { width: '100%', backgroundColor: t.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, borderWidth: 1, borderColor: t.border, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 6 },
  label: { ...TYPOGRAPHY.label, color: t.textSecondary, marginBottom: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.background, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 14, borderWidth: 1.5, borderColor: t.border, marginBottom: 4 },
  input: { ...TYPOGRAPHY.body, color: t.text, flex: 1 },
  otpRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: SPACING.md },
  otpBox: { width: 44, height: 56, borderRadius: RADIUS.md, backgroundColor: t.background, borderWidth: 1.5, borderColor: t.border, ...TYPOGRAPHY.h3, color: t.text },
  otpBoxFilled: { borderColor: t.primary, backgroundColor: t.primary + '05' },
  timerText: { ...TYPOGRAPHY.bodySmall, color: t.textMuted, textAlign: 'center' },
  resendText: { ...TYPOGRAPHY.bodySmall, color: t.primary, textAlign: 'center', fontFamily: 'Inter_700Bold' },
  ruleChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full, borderWidth: 1 },
  ruleText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: RADIUS.full,
    shadowColor: t.secondary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  btnText: { ...TYPOGRAPHY.h4, fontFamily: 'Inter_700Bold' },
});
