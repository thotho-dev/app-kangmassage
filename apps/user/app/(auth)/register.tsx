import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, Dimensions, StatusBar, TextInput, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Phone, User, ChevronLeft, Eye, EyeOff } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, TYPOGRAPHY } from '@/constants/Theme';
import { useTheme } from '@/context/ThemeContext';
import { useAlert } from '@/context/AlertContext';
import { supabase } from '@/lib/supabase';
import { API_URL } from '@/lib/config';

const { width, height } = Dimensions.get('window');
const API_BASE = API_URL;

type Step = 'phone' | 'otp' | 'form';

export default function RegisterScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { showAlert } = useAlert();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<'L' | 'P' | ''>('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const otpInputs = useRef<Array<TextInput | null>>([]);

  const normalizedPhone = (p: string) => {
    const digits = p.replace(/\D/g, '');
    if (digits.startsWith('0')) return '+62' + digits.substring(1);
    if (digits.startsWith('62')) return '+' + digits;
    return '+62' + digits;
  };

  const displayPhone = normalizedPhone(phone);

  const handleSendOTP = async () => {
    if (phone.length < 9) {
      showAlert('Error', 'Masukkan nomor telepon yang valid');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: displayPhone, role: 'user' }),
      });
      const result = await response.json();

      if (response.status === 409) {
        showAlert('Info', 'Nomor sudah terdaftar. Silakan login.');
        return;
      }
      if (result.error) throw new Error(result.error);

      setStep('otp');
      startTimer();
    } catch (error: any) {
      showAlert('Gagal', error.message || 'Gagal mengirim OTP');
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
    if (val && idx < 5) otpInputs.current[idx + 1]?.focus();
    if (newOtp.every(d => d !== '') && newOtp.join('').length === 6) {
      handleVerifyOTP(newOtp.join(''));
    }
  };

  const handleVerifyOTP = async (otpCode: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: displayPhone, otp: otpCode, role: 'user' }),
      });
      const result = await response.json();
      if (result.error) throw new Error(result.error);

      setStep('form');
    } catch (error: any) {
      showAlert('Gagal', error.message || 'Kode OTP tidak valid');
      setOtp(['', '', '', '', '', '']);
      otpInputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!fullName.trim()) {
      showAlert('Error', 'Nama lengkap wajib diisi');
      return;
    }
    if (!gender) {
      showAlert('Error', 'Pilih jenis kelamin');
      return;
    }
    if (!password || password.length < 6) {
      showAlert('Error', 'Kata sandi minimal 6 karakter');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: displayPhone,
          full_name: fullName.trim(),
          gender,
          password,
          role: 'user',
        }),
      });
      const result = await response.json();
      if (result.error) throw new Error(result.error);

      const { session } = result.data;
      if (session?.access_token) {
        const { error } = await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
        if (error) throw error;
      }
      router.replace('/home');
    } catch (error: any) {
      showAlert('Daftar Gagal', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <LinearGradient
        colors={isDark ? [COLORS.dark[900], COLORS.dark[950]] : [COLORS.white, COLORS.light[100]]}
        style={StyleSheet.absoluteFill as any}
      />
      <View style={[styles.circle1, { backgroundColor: isDark ? 'rgba(106, 13, 189, 0.15)' : 'rgba(106, 13, 189, 0.05)' }]} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {step !== 'phone' && (
            <TouchableOpacity style={styles.backBtn} onPress={() => {
              if (step === 'otp') { setStep('phone'); setOtp(['', '', '', '', '', '']); }
              else if (step === 'form') { setStep('otp'); }
            }}>
              <ChevronLeft size={24} color={theme.text} />
            </TouchableOpacity>
          )}

          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>
              {step === 'phone' ? 'Daftar Akun' : step === 'otp' ? 'Verifikasi OTP' : 'Lengkapi Data'}
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {step === 'phone' ? 'Masukkan nomor untuk menerima kode verifikasi' :
               step === 'otp' ? `Kode dikirim ke ${displayPhone}` :
               'Isi data diri Anda'}
            </Text>
          </View>

          <View style={styles.form}>
            {/* STEP: PHONE */}
            {step === 'phone' && (
              <>
                <View style={styles.phoneInputContainer}>
                  <View style={[styles.phonePrefix, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                    <Phone size={18} color={theme.textSecondary} />
                    <Text style={[styles.prefixText, { color: theme.text }]}>+62</Text>
                  </View>
                  <View style={[styles.phoneInputWrap, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                    <TextInput
                      style={[styles.phoneInput, { color: theme.text }]}
                      placeholder="8xxxxxxxxx"
                      placeholderTextColor={theme.textSecondary}
                      keyboardType="phone-pad"
                      value={phone}
                      onChangeText={setPhone}
                      autoFocus
                    />
                  </View>
                </View>

                <TouchableOpacity onPress={handleSendOTP} disabled={loading || phone.length < 9} activeOpacity={0.85}>
                  <LinearGradient
                    colors={loading || phone.length < 9 ? ['#E2E8F0', '#E2E8F0'] : [COLORS.gold[500], '#D97706']}
                    style={styles.primaryBtn}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={[styles.primaryBtnText, (loading || phone.length < 9) && { color: '#94A3B8' }]}>
                        Kirim Kode OTP
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

            {/* STEP: OTP */}
            {step === 'otp' && (
              <>
                <Text style={[styles.otpLabel, { color: theme.textSecondary }]}>Masukkan Kode OTP</Text>
                <View style={styles.otpRow}>
                  {otp.map((digit, i) => (
                    <TextInput
                      key={i}
                      ref={ref => { otpInputs.current[i] = ref; }}
                      style={[styles.otpBox, { backgroundColor: theme.surfaceVariant, borderColor: digit ? COLORS.gold[500] : theme.border, color: theme.text }]}
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

                {loading && (
                  <View style={styles.verifyingContainer}>
                    <ActivityIndicator color={COLORS.gold[500]} size="small" />
                    <Text style={[styles.verifyingText, { color: theme.textSecondary }]}>Memverifikasi...</Text>
                  </View>
                )}

                <View style={styles.timerContainer}>
                  {timer > 0 ? (
                    <Text style={[styles.timerText, { color: theme.textSecondary }]}>Kirim ulang dalam {timer} detik</Text>
                  ) : (
                    <TouchableOpacity onPress={handleSendOTP} disabled={loading}>
                      <Text style={[styles.resendText, { color: COLORS.gold[500] }]}>Kirim Ulang OTP</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}

            {/* STEP: FORM (Nama + Gender + Password) */}
            {step === 'form' && (
              <>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Nama Lengkap</Text>
                <View style={[styles.inputWrap, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                  <User size={20} color={theme.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Nama lengkap Anda"
                    placeholderTextColor={theme.textSecondary}
                    value={fullName}
                    onChangeText={setFullName}
                    autoFocus
                  />
                </View>

                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Jenis Kelamin</Text>
                <View style={styles.genderRow}>
                  <TouchableOpacity
                    style={[styles.genderBtn, {
                      backgroundColor: gender === 'L' ? COLORS.primary[500] : theme.surfaceVariant,
                      borderColor: gender === 'L' ? COLORS.primary[500] : theme.border,
                    }]}
                    onPress={() => setGender('L')}
                  >
                    <Text style={[styles.genderText, { color: gender === 'L' ? '#FFFFFF' : theme.text }]}>Laki-laki</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.genderBtn, {
                      backgroundColor: gender === 'P' ? COLORS.primary[500] : theme.surfaceVariant,
                      borderColor: gender === 'P' ? COLORS.primary[500] : theme.border,
                    }]}
                    onPress={() => setGender('P')}
                  >
                    <Text style={[styles.genderText, { color: gender === 'P' ? '#FFFFFF' : theme.text }]}>Perempuan</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Kata Sandi</Text>
                <View style={[styles.inputWrap, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Minimal 6 karakter"
                    placeholderTextColor={theme.textSecondary}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={20} color={theme.textSecondary} /> : <Eye size={20} color={theme.textSecondary} />}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
                  <LinearGradient
                    colors={loading ? ['#E2E8F0', '#E2E8F0'] : [COLORS.gold[500], '#D97706']}
                    style={styles.primaryBtn}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.primaryBtnText}>Daftar</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  circle1: {
    position: 'absolute', top: -height * 0.1, right: -width * 0.2,
    width: width * 0.8, height: width * 0.8, borderRadius: width * 0.4,
  },
  scrollContent: { flexGrow: 1, paddingHorizontal: 32, paddingTop: 24, paddingBottom: 40 },
  backBtn: { marginBottom: 8, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  header: { marginBottom: 32, alignItems: 'center' },
  title: { ...TYPOGRAPHY.h1, fontSize: 26, marginBottom: 8, textAlign: 'center' },
  subtitle: { ...TYPOGRAPHY.body, textAlign: 'center', paddingHorizontal: 20, lineHeight: 22, fontSize: 14 },
  form: {},
  phoneInputContainer: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  phonePrefix: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, borderRadius: 16, borderWidth: 1.5, height: 56,
  },
  prefixText: { fontSize: 14, fontFamily: 'PlusJakartaSans-SemiBold' },
  phoneInputWrap: { flex: 1, borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 16, height: 56, justifyContent: 'center' },
  phoneInput: { fontSize: 18, fontFamily: 'PlusJakartaSans-Medium' },
  primaryBtn: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 28, marginTop: 8,
    elevation: 6, shadowColor: COLORS.gold[500],
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10,
  },
  primaryBtnText: { fontSize: 14, fontFamily: 'PlusJakartaSans-Bold', color: '#FFFFFF' },
  fieldLabel: { fontSize: 14, fontFamily: 'PlusJakartaSans-Medium', marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 16, height: 56, marginBottom: 20,
  },
  input: { flex: 1, fontSize: 14, fontFamily: 'PlusJakartaSans-Medium' },
  genderRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  genderBtn: {
    flex: 1, height: 48, borderRadius: 14, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  genderText: { fontSize: 15, fontFamily: 'PlusJakartaSans-SemiBold' },
  otpLabel: { fontSize: 14, fontFamily: 'PlusJakartaSans-Medium', textAlign: 'center', marginBottom: 24 },
  otpRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 24 },
  otpBox: { width: 44, height: 56, borderRadius: 14, borderWidth: 1.5, fontSize: 22, fontFamily: 'PlusJakartaSans-Bold' },
  verifyingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 },
  verifyingText: { fontSize: 14, fontFamily: 'PlusJakartaSans-Medium' },
  timerContainer: { alignItems: 'center', marginBottom: 32 },
  timerText: { fontSize: 13, fontFamily: 'PlusJakartaSans-Medium' },
  resendText: { fontSize: 14, fontFamily: 'PlusJakartaSans-Bold' },
});
