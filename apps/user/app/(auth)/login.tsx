import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, Dimensions, StatusBar, Image, TextInput, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, Phone, User, Lock } from 'lucide-react-native';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { COLORS, TYPOGRAPHY } from '@/constants/Theme';
import { useTheme } from '@/context/ThemeContext';
import { useAlert } from '@/context/AlertContext';
import { supabase } from '@/lib/supabase';
import { API_URL } from '@/lib/config';

const API_BASE = API_URL;

async function fetchJSON(url: string, opts: RequestInit) {
  const res = await fetch(url, opts);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Server error (${res.status})`);
  }
}

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

type Tab = 'login' | 'register';

export default function AuthScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { showAlert } = useAlert();

  const [tab, setTab] = useState<Tab>('login');

  // ── Login state ──
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [focused, setFocused] = useState<'phone' | 'password' | null>(null);

  // ── Register state ──
  const [regStep, setRegStep] = useState<'phone' | 'otp' | 'form'>('phone');
  const [regPhone, setRegPhone] = useState('');
  const [regOtp, setRegOtp] = useState(['', '', '', '', '', '']);
  const [regFullName, setRegFullName] = useState('');
  const [regGender, setRegGender] = useState<'L' | 'P' | ''>('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regTimer, setRegTimer] = useState(0);
  const otpInputs = useRef<Array<TextInput | null>>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const normalizedPhone = (p: string) => {
    const digits = p.replace(/\D/g, '');
    if (digits.startsWith('0')) return '+62' + digits.substring(1);
    if (digits.startsWith('62')) return '+' + digits;
    return '+62' + digits;
  };

  const resetRegister = () => {
    setRegStep('phone');
    setRegPhone('');
    setRegOtp(['', '', '', '', '', '']);
    setRegFullName('');
    setRegGender('');
    setRegPassword('');
    setRegTimer(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '864216508187-tgo3rd4ltgkf67oc158hpkq3pugq6kjd.apps.googleusercontent.com',
    });
  }, []);

  // ── Login handlers ──
  const signInWithGoogle = async () => {
    setLoginLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const signInResult = await GoogleSignin.signIn();
      if (signInResult.type === 'cancelled') return;

      const idToken = signInResult.data.idToken;
      if (!idToken) throw new Error('Tidak dapat memperoleh token Google');

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      if (error) throw error;

      // Ensure profile exists in users table
      const supabaseUid = data.user?.id;
      if (supabaseUid) {
        const { data: existingProfile } = await supabase
          .from('users')
          .select('id')
          .eq('supabase_uid', supabaseUid)
          .maybeSingle();

        if (!existingProfile) {
          const gu = signInResult.data.user;
          const fullName = gu.name || data.user?.user_metadata?.full_name || data.user?.email?.split('@')[0] || 'User';
          const email = data.user?.email || gu.email || '';

          const { error: insertError } = await supabase.from('users').insert({
            supabase_uid: supabaseUid,
            full_name: fullName,
            email,
            phone: '',
            role: 'user',
            wallet_balance: 0,
          });
          if (insertError) throw new Error('Gagal membuat profil: ' + insertError.message);
        }
      }

      router.replace('/home');
    } catch (error: any) {
      const code = error.code;
      if (code === statusCodes.SIGN_IN_CANCELLED || code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) return;
      showAlert('Google Login Gagal', error.message || 'Terjadi kesalahan');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogin = async () => {
    if (loginPhone.length < 9) { showAlert('Error', 'Masukkan nomor telepon yang valid'); return; }
    if (!loginPassword) { showAlert('Error', 'Masukkan kata sandi'); return; }
    setLoginLoading(true);
    try {
      const result = await fetchJSON(`${API_BASE}/api/auth/phone-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizedPhone(loginPhone), password: loginPassword, role: 'user' }),
      });
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
      const message = error.message || '';
      const indonesianErrors: Record<string, string> = {
        'Invalid login credentials': 'Nomor atau kata sandi salah',
        'Akun tidak ditemukan': 'Nomor telepon belum terdaftar',
        'Akun tidak memiliki autentikasi': 'Akun bermasalah, hubungi admin',
        'Email not confirmed': 'Email belum dikonfirmasi',
        'Phone and password required': 'Nomor telepon dan kata sandi wajib diisi',
        'Internal server error': 'Terjadi kesalahan server, coba lagi',
      };
      showAlert('Login Gagal', indonesianErrors[message] || message || 'Nomor atau kata sandi salah');
    } finally {
      setLoginLoading(false);
    }
  };

  // ── Register handlers ──
  const startRegTimer = () => {
    setRegTimer(60);
    intervalRef.current = setInterval(() => {
      setRegTimer(t => { if (t <= 1) { if (intervalRef.current) clearInterval(intervalRef.current); return 0; } return t - 1; });
    }, 1000);
  };

  const handleSendOTP = async () => {
    if (regPhone.length < 9) { showAlert('Error', 'Masukkan nomor telepon yang valid'); return; }
    setRegLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizedPhone(regPhone), role: 'user' }),
      });
      const result = await response.json();
      if (response.status === 409) { showAlert('Info', 'Nomor ini sudah terdaftar, yuk masuk aja!', [{ text: 'Masuk', onPress: () => setTab('login') }, { text: 'Tutup', style: 'cancel' }]); return; }
      if (result.error) throw new Error(result.error);
      setRegStep('otp');
      startRegTimer();
    } catch (error: any) {
      showAlert('Gagal', error.message || 'Gagal mengirim OTP');
    } finally {
      setRegLoading(false);
    }
  };

  const handleOTPChange = (val: string, idx: number) => {
    const newOtp = [...regOtp];
    newOtp[idx] = val;
    setRegOtp(newOtp);
    if (val && idx < 5) otpInputs.current[idx + 1]?.focus();
    if (newOtp.every(d => d !== '') && newOtp.join('').length === 6) {
      handleVerifyOTP(newOtp.join(''));
    }
  };

  const handleVerifyOTP = async (otpCode: string) => {
    setRegLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizedPhone(regPhone), otp: otpCode, role: 'user' }),
      });
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      setRegStep('form');
    } catch (error: any) {
      showAlert('Gagal', error.message || 'Kode OTP tidak valid');
      setRegOtp(['', '', '', '', '', '']);
      otpInputs.current[0]?.focus();
    } finally {
      setRegLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!regFullName.trim()) { showAlert('Error', 'Nama lengkap wajib diisi'); return; }
    if (!regGender) { showAlert('Error', 'Pilih jenis kelamin'); return; }
    if (!regPassword || regPassword.length < 6) { showAlert('Error', 'Kata sandi minimal 6 karakter'); return; }
    setRegLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: normalizedPhone(regPhone),
          full_name: regFullName.trim(),
          gender: regGender,
          password: regPassword,
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
      const msg = error.message || '';
      if (msg.includes('sudah terdaftar')) {
        showAlert('Info', 'Nomor ini sudah terdaftar, yuk masuk aja!', [{ text: 'Masuk', onPress: () => setTab('login') }, { text: 'Tutup', style: 'cancel' }]);
      } else {
        showAlert('Daftar Gagal', msg);
      }
    } finally {
      setRegLoading(false);
    }
  };

  // ── Tab indicator animation style ──
  const ORANGE = '#F97316';
  const tabActiveStyle = { backgroundColor: ORANGE };
  const tabInactiveStyle = { backgroundColor: 'transparent' };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <LinearGradient
        colors={isDark ? [COLORS.dark[900], COLORS.dark[950]] : [COLORS.white, COLORS.light[100]]}
        style={StyleSheet.absoluteFill as any}
      />
      <View style={[styles.circle1, { backgroundColor: isDark ? 'rgba(106, 13, 189, 0.15)' : 'rgba(106, 13, 189, 0.05)' }]} />
      <View style={[styles.circle2, { backgroundColor: isDark ? 'rgba(253, 185, 39, 0.05)' : 'rgba(253, 185, 39, 0.03)' }]} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="always">
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image source={require('../../assets/logo-kang-massage.png')} style={styles.logoImage} />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>Kang Massage</Text>
          </View>

          {/* ── Tabs ── */}
          <View style={[styles.tabBar, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.tab, tab === 'login' ? tabActiveStyle : tabInactiveStyle]}
              onPress={() => { setTab('login'); resetRegister(); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, { color: tab === 'login' ? '#FFFFFF' : theme.textSecondary }]}>Masuk</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === 'register' ? tabActiveStyle : tabInactiveStyle]}
              onPress={() => { setTab('register'); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, { color: tab === 'register' ? '#FFFFFF' : theme.textSecondary }]}>Daftar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            {/* ══════ LOGIN TAB ══════ */}
            {tab === 'login' && (
              <>
                <Text style={[styles.label, { color: theme.text }]}>Nomor Telepon</Text>
                <View style={[styles.inputWrap, focused === 'phone' && styles.inputFocused, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                  <Ionicons name="call-outline" size={20} color={focused === 'phone' ? theme.primary : theme.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="08xxxxxxxxxx"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="phone-pad"
                    value={loginPhone}
                    onChangeText={setLoginPhone}
                    onFocus={() => setFocused('phone')}
                    onBlur={() => setFocused(null)}
                  />
                </View>

                <Text style={[styles.label, { marginTop: 16 }]}>Kata Sandi</Text>
                <View style={[styles.inputWrap, focused === 'password' && styles.inputFocused, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                  <Ionicons name="lock-closed-outline" size={20} color={focused === 'password' ? theme.primary : theme.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Masukkan kata sandi"
                    placeholderTextColor={theme.textSecondary}
                    secureTextEntry={!showLoginPassword}
                    value={loginPassword}
                    onChangeText={setLoginPassword}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused(null)}
                  />
                  <TouchableOpacity onPress={() => setShowLoginPassword(!showLoginPassword)}>
                    {showLoginPassword ? <EyeOff size={20} color={theme.textSecondary} /> : <Eye size={20} color={theme.textSecondary} />}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={() => router.push('/forgot-password')} style={styles.forgotBtn}>
                  <Text style={[styles.forgotText, { color: theme.primary }]}>Lupa Password?</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleLogin} disabled={loginLoading} activeOpacity={0.85}>
                  <LinearGradient
                    colors={loginLoading ? ['#E2E8F0', '#E2E8F0'] : [COLORS.primary[500], '#1E1B4B']}
                    style={styles.submitBtn}
                  >
                    {loginLoading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.submitBtnText}>Masuk</Text>}
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.dividerContainer}>
                  <View style={[styles.divider, { backgroundColor: theme.border }]} />
                  <Text style={[styles.dividerText, { color: theme.textSecondary }]}>ATAU</Text>
                  <View style={[styles.divider, { backgroundColor: theme.border }]} />
                </View>

                <TouchableOpacity
                  style={[styles.googleButton, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}
                  onPress={signInWithGoogle}
                >
                  <View style={styles.googleContent}>
                    <FontAwesome name="google" size={22} color="#DB4437" />
                    <Text style={[styles.googleText, { color: theme.text }]}>Lanjutkan dengan Google</Text>
                  </View>
                </TouchableOpacity>
              </>
            )}

            {/* ══════ REGISTER TAB ══════ */}
            {tab === 'register' && (
              <>
                {/* STEP: PHONE */}
                {regStep === 'phone' && (
                  <>
                    <Text style={[styles.regInfo, { color: theme.textSecondary }]}>
                      Masukkan nomor untuk menerima kode verifikasi
                    </Text>
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
                          value={regPhone}
                          onChangeText={setRegPhone}
                          autoFocus
                        />
                      </View>
                    </View>
                    <TouchableOpacity onPress={handleSendOTP} disabled={regLoading || regPhone.length < 9} activeOpacity={0.85}>
                      <LinearGradient
                        colors={regLoading || regPhone.length < 9 ? ['#E2E8F0', '#E2E8F0'] : [COLORS.gold[500], '#D97706']}
                        style={styles.submitBtn}
                      >
                        {regLoading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={[styles.submitBtnText, (regLoading || regPhone.length < 9) && { color: '#94A3B8' }]}>Kirim Kode OTP</Text>}
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                )}

                {/* STEP: OTP */}
                {regStep === 'otp' && (
                  <>
                    <Text style={[styles.regInfo, { color: theme.textSecondary }]}>
                      Kode dikirim ke {normalizedPhone(regPhone)}
                    </Text>
                    <Text style={[styles.otpLabel, { color: theme.textSecondary }]}>Masukkan Kode OTP</Text>
                    <View style={styles.otpRow}>
                      {regOtp.map((digit, i) => (
                        <TextInput
                          key={i}
                          ref={ref => { otpInputs.current[i] = ref; }}
                          style={[styles.otpBox, { backgroundColor: theme.surfaceVariant, borderColor: digit ? COLORS.gold[500] : theme.border, color: theme.text }]}
                          value={digit}
                          onChangeText={val => handleOTPChange(val.slice(-1), i)}
                          onKeyPress={({ nativeEvent }) => {
                            if (nativeEvent.key === 'Backspace' && !regOtp[i] && i > 0) {
                              otpInputs.current[i - 1]?.focus();
                              const n = [...regOtp]; n[i - 1] = ''; setRegOtp(n);
                            }
                          }}
                          keyboardType="number-pad"
                          maxLength={1}
                          textAlign="center"
                          selectTextOnFocus
                        />
                      ))}
                    </View>

                    {regLoading && (
                      <View style={styles.verifyingContainer}>
                        <ActivityIndicator color={COLORS.gold[500]} size="small" />
                        <Text style={[styles.verifyingText, { color: theme.textSecondary }]}>Memverifikasi...</Text>
                      </View>
                    )}

                    <View style={styles.timerContainer}>
                      {regTimer > 0 ? (
                        <Text style={[styles.timerText, { color: theme.textSecondary }]}>Kirim ulang dalam {regTimer} detik</Text>
                      ) : (
                        <TouchableOpacity onPress={handleSendOTP} disabled={regLoading}>
                          <Text style={[styles.resendText, { color: COLORS.gold[500] }]}>Kirim Ulang OTP</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </>
                )}

                {/* STEP: FORM */}
                {regStep === 'form' && (
                  <>
                    <Text style={[styles.label, { color: theme.text }]}>Nama Lengkap</Text>
                    <View style={[styles.inputWrap, { backgroundColor: theme.surfaceVariant, borderColor: theme.border, marginBottom: 20 }]}>
                      <User size={20} color={theme.textSecondary} />
                      <TextInput
                        style={[styles.input, { color: theme.text }]}
                        placeholder="Nama lengkap Anda"
                        placeholderTextColor={theme.textSecondary}
                        value={regFullName}
                        onChangeText={setRegFullName}
                        autoFocus
                      />
                    </View>

                    <Text style={[styles.label, { color: theme.text }]}>Jenis Kelamin</Text>
                    <View style={styles.genderRow}>
                      <TouchableOpacity
                        style={[styles.genderBtn, {
                          backgroundColor: regGender === 'L' ? COLORS.primary[500] : theme.surfaceVariant,
                          borderColor: regGender === 'L' ? COLORS.primary[500] : theme.border,
                        }]}
                        onPress={() => setRegGender('L')}
                      >
                        <Text style={[styles.genderText, { color: regGender === 'L' ? '#FFFFFF' : theme.text }]}>Laki-laki</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.genderBtn, {
                          backgroundColor: regGender === 'P' ? COLORS.primary[500] : theme.surfaceVariant,
                          borderColor: regGender === 'P' ? COLORS.primary[500] : theme.border,
                        }]}
                        onPress={() => setRegGender('P')}
                      >
                        <Text style={[styles.genderText, { color: regGender === 'P' ? '#FFFFFF' : theme.text }]}>Perempuan</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={[styles.label, { color: theme.text }]}>Kata Sandi</Text>
                    <View style={[styles.inputWrap, { backgroundColor: theme.surfaceVariant, borderColor: theme.border, marginBottom: 20 }]}>
                      <Lock size={20} color={theme.textSecondary} />
                      <TextInput
                        style={[styles.input, { color: theme.text }]}
                        placeholder="Minimal 6 karakter"
                        placeholderTextColor={theme.textSecondary}
                        secureTextEntry={!showRegPassword}
                        value={regPassword}
                        onChangeText={setRegPassword}
                      />
                      <TouchableOpacity onPress={() => setShowRegPassword(!showRegPassword)}>
                        {showRegPassword ? <EyeOff size={20} color={theme.textSecondary} /> : <Eye size={20} color={theme.textSecondary} />}
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity onPress={handleRegister} disabled={regLoading} activeOpacity={0.85} style={{ marginTop: 16 }}>
                      <LinearGradient
                        colors={regLoading ? ['#E2E8F0', '#E2E8F0'] : [COLORS.gold[500], '#D97706']}
                        style={styles.submitBtn}
                      >
                        {regLoading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.submitBtnText}>Daftar</Text>}
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </View>
        </ScrollView>

      </KeyboardAvoidingView>

      <Text style={[styles.footerVersion, { color: theme.textSecondary }]}>Kang Massage v1.1.1</Text>
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
  scrollContent: { flexGrow: 1, paddingHorizontal: 32, paddingTop: 24, paddingBottom: 32 },
  header: { marginBottom: 20, alignItems: 'center' },
  logoContainer: { width: 72, height: 72, marginBottom: 8, alignItems: 'center', justifyContent: 'center' },
  logoImage: { width: 60, height: 60, resizeMode: 'contain' },
  title: { ...TYPOGRAPHY.h1, fontSize: 20, marginBottom: 4, textAlign: 'center' },

  // ── Tabs ──
  tabBar: {
    flexDirection: 'row', borderRadius: 14, borderWidth: 1,
    padding: 4, marginBottom: 24,
  },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  tabText: { fontSize: 13, fontFamily: 'PlusJakartaSans-Bold' },

  // ── Form shared ──
  form: {},
  label: { ...TYPOGRAPHY.body, fontFamily: 'PlusJakartaSans-SemiBold', marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, borderWidth: 1.5,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  inputFocused: { borderColor: COLORS.primary[500] },
  input: { flex: 1, fontSize: 13, fontFamily: 'PlusJakartaSans-Medium' },
  submitBtn: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 24, marginBottom: 12,
    elevation: 6, shadowColor: COLORS.primary[500],
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10,
  },
  submitBtnText: { fontSize: 13, fontFamily: 'PlusJakartaSans-Bold', color: '#FFFFFF' },

  // ── Login specific ──
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotText: { fontSize: 12, fontFamily: 'PlusJakartaSans-SemiBold' },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  divider: { flex: 1, height: 1 },
  dividerText: { fontSize: 11, fontFamily: 'PlusJakartaSans-Bold', marginHorizontal: 12, letterSpacing: 1 },
  googleButton: {
    height: 48, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  googleContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  googleText: { fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold' },

  // ── Register specific ──
  regInfo: { fontSize: 12, fontFamily: 'PlusJakartaSans-Medium', textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  phoneInputContainer: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  phonePrefix: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, borderRadius: 14, borderWidth: 1.5, height: 48,
  },
  prefixText: { fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold' },
  phoneInputWrap: { flex: 1, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 14, height: 48, justifyContent: 'center' },
  phoneInput: { fontSize: 15, fontFamily: 'PlusJakartaSans-Medium' },
  otpLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans-Medium', textAlign: 'center', marginBottom: 20 },
  otpRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 20 },
  otpBox: { width: 40, height: 48, borderRadius: 12, borderWidth: 1.5, fontSize: 18, fontFamily: 'PlusJakartaSans-Bold', textAlign: 'center' },
  verifyingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 },
  verifyingText: { fontSize: 13, fontFamily: 'PlusJakartaSans-Medium' },
  timerContainer: { alignItems: 'center', marginBottom: 24 },
  timerText: { fontSize: 12, fontFamily: 'PlusJakartaSans-Medium' },
  resendText: { fontSize: 13, fontFamily: 'PlusJakartaSans-Bold' },
  genderRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  genderBtn: {
    flex: 1, height: 42, borderRadius: 14, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  genderText: { fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold' },
  footerVersion: { textAlign: 'center', fontSize: 11, fontFamily: 'PlusJakartaSans-Medium', paddingVertical: 12 },
  flex: { flex: 1 },
});
