import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, Dimensions, StatusBar, Image, TextInput, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Phone, ChevronLeft, Eye, EyeOff } from 'lucide-react-native';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { COLORS, TYPOGRAPHY } from '@/constants/Theme';
import { useTheme } from '@/context/ThemeContext';
import { useAlert } from '@/context/AlertContext';
import { supabase } from '@/lib/supabase';

const { width, height } = Dimensions.get('window');
const API_BASE = 'https://app-kangmassage-web.vercel.app';

WebBrowser.maybeCompleteAuthSession();

type Step = 'phone' | 'otp' | 'password';

export default function LoginScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { showAlert } = useAlert();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loginPassword, setLoginPassword] = useState('');
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
      if (result.error) throw new Error(result.error);

      setStep('otp');
      startTimer();

      if (result.mock_otp) {
        const digits = result.mock_otp.split('');
        setOtp(digits);
        setTimeout(() => handleVerifyOTP(result.mock_otp), 500);
      }
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

      if (result.is_new_user) {
        // New user: go to registration
        router.push({
          pathname: '/(auth)/register',
          params: { phone: result.phone, role: result.role },
        });
      } else {
        // Existing user: show error, go back
        setStep('phone');
        setOtp(['', '', '', '', '', '']);
        setPhone('');
        showAlert('Info', 'Nomor sudah terdaftar. Silakan login dengan kata sandi.');
      }
    } catch (error: any) {
      showAlert('Gagal', error.message || 'Kode OTP tidak valid');
      setOtp(['', '', '', '', '', '']);
      otpInputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async () => {
    if (!loginPassword) {
      showAlert('Error', 'Masukkan kata sandi');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        phone: displayPhone,
        password: loginPassword,
      });
      if (error) throw error;
      router.replace('/(main)/home');
    } catch (error: any) {
      showAlert('Gagal', error.message || 'Kata sandi salah');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTPForExisting = async () => {
    if (phone.length < 9) {
      showAlert('Error', 'Masukkan nomor telepon yang valid');
      return;
    }
    setLoading(true);
    try {
      await fetch(`${API_BASE}/api/auth/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: displayPhone, role: 'user' }),
      });
      setStep('otp');
      startTimer();
    } catch (error: any) {
      showAlert('Gagal', error.message);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const redirectTo = Linking.createURL('', { scheme: 'kangmassage' });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) throw error;

      const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (res.type === 'success') {
        const { url } = res;
        const { queryParams } = Linking.parse(url);
        const access_token = queryParams?.access_token as string;
        const refresh_token = queryParams?.refresh_token as string;
        if (access_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
          router.replace('/(main)/home');
        } else {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session) router.replace('/(main)/home');
        }
      }
    } catch (error: any) {
      showAlert('Google Login Gagal', error.message);
    } finally {
      setLoading(false);
    }
  };

  const goToRegister = () => {
    if (phone.length < 9) {
      showAlert('Error', 'Masukkan nomor telepon yang valid');
      return;
    }
    router.push({ pathname: '/(auth)/register', params: { phone: displayPhone } });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <LinearGradient
        colors={isDark ? [COLORS.dark[900], COLORS.dark[950]] : [COLORS.white, COLORS.light[100]]}
        style={StyleSheet.absoluteFill as any}
      />
      <View style={[styles.circle1, { backgroundColor: isDark ? 'rgba(106, 13, 189, 0.15)' : 'rgba(106, 13, 189, 0.05)' }]} />
      <View style={[styles.circle2, { backgroundColor: isDark ? 'rgba(253, 185, 39, 0.05)' : 'rgba(253, 185, 39, 0.03)' }]} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {step !== 'phone' && (
            <TouchableOpacity style={styles.backBtn} onPress={() => { setStep('phone'); setOtp(['', '', '', '', '', '']); }}>
              <ChevronLeft size={24} color={theme.text} />
            </TouchableOpacity>
          )}

          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image source={require('../../assets/logo-kang-massage.png')} style={styles.logoImage} />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>Kang Massage</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {step === 'phone' ? 'Masuk atau daftar akun baru' :
               step === 'otp' ? `Kode OTP dikirim ke ${displayPhone}` :
               'Masukkan kata sandi Anda'}
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
                    colors={loading || phone.length < 9 ? ['#E2E8F0', '#E2E8F0'] : [COLORS.primary[500], '#1E1B4B']}
                    style={styles.primaryBtn}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={[styles.primaryBtnText, (loading || phone.length < 9) && { color: '#94A3B8' }]}>
                        Daftar dengan OTP
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.dividerContainer}>
                  <View style={[styles.divider, { backgroundColor: theme.border }]} />
                  <Text style={[styles.dividerText, { color: theme.textSecondary }]}>ATAU</Text>
                  <View style={[styles.divider, { backgroundColor: theme.border }]} />
                </View>

                {/* Login with phone + password */}
                <Text style={[styles.label, { color: theme.textSecondary }]}>Sudah punya akun? Login</Text>
                <View style={[styles.passwordInputWrap, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                  <TextInput
                    style={[styles.passwordInput, { color: theme.text }]}
                    placeholder="Kata sandi"
                    placeholderTextColor={theme.textSecondary}
                    secureTextEntry={!showPassword}
                    value={loginPassword}
                    onChangeText={setLoginPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={20} color={theme.textSecondary} /> : <Eye size={20} color={theme.textSecondary} />}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={handlePasswordLogin} disabled={loading} activeOpacity={0.85}>
                  <LinearGradient
                    colors={loading ? ['#E2E8F0', '#E2E8F0'] : [COLORS.primary[500], '#1E1B4B']}
                    style={styles.primaryBtn}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.primaryBtnText}>Masuk</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleSendOTPForExisting} disabled={loading}>
                  <Text style={[styles.forgotLink, { color: COLORS.primary[500] }]}>Lupa kata sandi?</Text>
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
                      style={[styles.otpBox, { backgroundColor: theme.surfaceVariant, borderColor: digit ? COLORS.primary[500] : theme.border, color: theme.text }]}
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
                    <ActivityIndicator color={COLORS.primary[500]} size="small" />
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
  circle2: {
    position: 'absolute', bottom: height * 0.1, left: -width * 0.2,
    width: width * 0.6, height: width * 0.6, borderRadius: width * 0.3,
  },
  scrollContent: { flexGrow: 1, paddingHorizontal: 32, paddingTop: 24, paddingBottom: 40 },
  backBtn: { marginBottom: 8, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  header: { marginBottom: 32, alignItems: 'center' },
  logoContainer: { width: 90, height: 90, marginBottom: 16, alignItems: 'center', justifyContent: 'center' },
  logoImage: { width: 80, height: 80, resizeMode: 'contain' },
  title: { ...TYPOGRAPHY.h1, fontSize: 28, marginBottom: 8, textAlign: 'center' },
  subtitle: { ...TYPOGRAPHY.body, textAlign: 'center', paddingHorizontal: 20, lineHeight: 22, fontSize: 14 },
  form: {},
  label: { fontSize: 14, fontFamily: 'Inter-Medium', textAlign: 'center', marginBottom: 12 },
  phoneInputContainer: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  phonePrefix: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, borderRadius: 16, borderWidth: 1.5, height: 56,
  },
  prefixText: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  phoneInputWrap: { flex: 1, borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 16, height: 56, justifyContent: 'center' },
  phoneInput: { fontSize: 18, fontFamily: 'Inter-Medium' },
  passwordInputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 16, height: 56, marginBottom: 16,
  },
  passwordInput: { flex: 1, fontSize: 16, fontFamily: 'Inter-Medium' },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 16, borderRadius: 28, marginBottom: 16,
    elevation: 6, shadowColor: COLORS.primary[500],
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10,
  },
  primaryBtnText: { fontSize: 16, fontFamily: 'Inter-Bold', color: '#FFFFFF' },
  forgotLink: { fontSize: 14, fontFamily: 'Inter-SemiBold', textAlign: 'center', marginBottom: 24 },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  divider: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontFamily: 'Inter-Bold', marginHorizontal: 16, letterSpacing: 1 },

  // OTP Step
  otpLabel: { fontSize: 14, fontFamily: 'Inter-Medium', textAlign: 'center', marginBottom: 24 },
  otpRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 24 },
  otpBox: { width: 44, height: 56, borderRadius: 14, borderWidth: 1.5, fontSize: 22, fontFamily: 'Inter-Bold' },
  verifyingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 },
  verifyingText: { fontSize: 14, fontFamily: 'Inter-Medium' },
  timerContainer: { alignItems: 'center', marginBottom: 32 },
  timerText: { fontSize: 13, fontFamily: 'Inter-Medium' },
  resendText: { fontSize: 14, fontFamily: 'Inter-Bold' },
});
