import { useState, useEffect} from 'react';
import { useThemeColors, useThemeStore } from '@/store/themeStore';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/constants/Theme';
import { supabase } from '@/lib/supabase';
import { useAlert } from '@/components/CustomAlert';

import * as Application from 'expo-application';
import * as Device from 'expo-device';

export default function LoginScreen() {
  const t = useThemeColors();
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const styles = getStyles(t);
  const { showAlert, AlertComponent } = useAlert();

  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<'identifier' | 'password' | null>(null);

  // Security: Failed Attempts & Lockout
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(0); // seconds remaining

  useEffect(() => {
    let interval: any;
    if (lockoutTime > 0) {
      interval = setInterval(() => {
        setLockoutTime((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockoutTime]);

  const getDeviceId = async () => {
    try {
      if (Platform.OS === 'android') {
        return Application.getAndroidId();
      } else if (Platform.OS === 'ios') {
        return await Application.getIosIdForVendorAsync();
      }
      return Device.osBuildId; // Fallback
    } catch (e) {
      return 'unknown_device';
    }
  };

  const handleLogin = async () => {
    if (lockoutTime > 0) {
      showAlert('warning', 'Akses Terkunci', `Kamu terlalu banyak salah masukin password. Tunggu ${lockoutTime} detik lagi ya!`);
      return;
    }

    if (!identifier || !password) {
      showAlert('warning', 'Eits!', 'Tolong isi email/nomor telepon dan kata sandi ya.');
      return;
    }

    setLoading(true);
    try {
      const isEmail = identifier.includes('@');
      let loginData: any = { password };

      if (isEmail) {
        loginData.email = identifier.trim().toLowerCase();
      } else {
        // Normalize phone number
        let normalizedPhone = identifier.replace(/\D/g, '');
        if (normalizedPhone.startsWith('0')) {
          normalizedPhone = '+62' + normalizedPhone.substring(1);
        } else if (!normalizedPhone.startsWith('+')) {
          normalizedPhone = '+' + normalizedPhone;
        }
        loginData.phone = normalizedPhone;
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword(loginData);

      if (authError) {
        let friendlyMessage = 'Email/Nomor HP atau kata sandi kamu salah nih. Coba cek lagi ya!';
        
        if (authError.message.includes('Invalid login credentials')) {
          const newFailedAttempts = failedAttempts + 1;
          setFailedAttempts(newFailedAttempts);
          
          if (newFailedAttempts >= 5) {
            setLockoutTime(120); // 2 minutes
            setFailedAttempts(0);
            friendlyMessage = 'Kamu sudah salah 5 kali. Demi keamanan, akun kamu dikunci selama 2 menit ya!';
          } else {
            friendlyMessage = `Waduh, email/nomor HP atau kata sandi kamu salah. Sisa percobaan: ${5 - newFailedAttempts} kali lagi.`;
          }
        } else if (authError.message.includes('Email not confirmed')) {
          friendlyMessage = 'Email kamu belum diverifikasi nih. Yuk, cek email kamu dulu!';
        } else if (authError.message.includes('Too many requests')) {
          friendlyMessage = 'Sabar ya, kamu lagi sering banget coba masuk. Istirahat bentar, trus coba lagi nanti!';
        } else if (authError.message.includes('network')) {
          friendlyMessage = 'Aduh, koneksi internet kamu lagi bermasalah nih. Coba cari sinyal yang lebih bagus ya!';
        }

        showAlert('error', 'Gagal Masuk', friendlyMessage);
        setLoading(false);
        return;
      }

      if (authData.user) {
        setFailedAttempts(0); // Reset on success
        // Device Binding Logic
        const currentDeviceId = await getDeviceId();

        const { data: therapist, error: tError } = await supabase
          .from('therapists')
          .select('id, device_id')
          .eq('supabase_uid', authData.user.id)
          .single();

        if (tError) throw tError;

        if (!therapist.device_id) {
          // First time login - Bind device
          await supabase
            .from('therapists')
            .update({ device_id: currentDeviceId })
            .eq('id', therapist.id);

          router.replace('/(tabs)');
        } else if (therapist.device_id !== currentDeviceId) {
          // Device mismatch
          await supabase.auth.signOut();
          showAlert(
            'error',
            'Akses Ditolak',
            'Akun Anda sudah login di perangkat lain. Silakan hubungi admin jika Anda ingin mengganti perangkat.',
            [{ text: 'Mengerti' }]
          );
        } else {
          // Success
          router.replace('/(tabs)');
        }
      }
    } catch (err: any) {
      console.error(err);
      showAlert('error', 'Error', 'Terjadi kesalahan teknis. Coba lagi nanti ya.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        {AlertComponent}

        {/* Background Patterns (Simulated) */}
        <View style={styles.bgPatternContainer}>
          <Ionicons name="cube-outline" size={100} color={t.primary + '15'} style={styles.pattern1} />
          <Ionicons name="apps-outline" size={80} color={t.primary + '10'} style={styles.pattern2} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.topSpacer} />

          {/* Main Card */}
          <View style={styles.card}>
            <View style={styles.logoContainer}>
              <View style={styles.logoMark}>
                <Image
                  source={require('../../assets/logo-kang-massage.png')}
                  style={styles.logoImage}
                />
              </View>
              <Text style={styles.title}>Kang Massage</Text>
              <Text style={styles.subtitle}>Masuk ke akun Mitra Terapis Anda</Text>
            </View>

            {/* Identifier Input */}
            <Text style={styles.label}>Email atau Nomor Telepon</Text>
            <View style={[styles.inputWrap, focused === 'identifier' && styles.inputFocused]}>
              <Ionicons name={identifier.includes('@') ? "mail-outline" : "call-outline"} size={20} color={focused === 'identifier' ? t.primary : t.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Email atau 08xxxxxxxxxx"
                placeholderTextColor={t.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={identifier}
                onChangeText={setIdentifier}
                onFocus={() => setFocused('identifier')}
                onBlur={() => setFocused(null)}
              />
            </View>

            {/* Password Input */}
            <Text style={[styles.label, { marginTop: SPACING.md }]}>Kata Sandi</Text>
            <View style={[styles.inputWrap, focused === 'password' && styles.inputFocused]}>
              <Ionicons name="lock-closed-outline" size={20} color={focused === 'password' ? t.primary : t.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Masukkan kata sandi"
                placeholderTextColor={t.textMuted}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={t.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Actions Row */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={rememberMe ? "checkbox" : "square-outline"}
                  size={20}
                  color={rememberMe ? t.secondary : t.textSecondary}
                />
                <Text style={styles.rememberText}>Ingat saya</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
                <Text style={styles.forgotText}>Lupa kata sandi?</Text>
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
              <LinearGradient
                colors={loading 
                  ? (isDarkMode ? ['#1E293B', '#1E293B'] : ['#E2E8F0', '#E2E8F0']) 
                  : [t.secondary, '#EA580C']}
                style={styles.btn}
              >
                {loading ? (
                  <Text style={[styles.btnText, { color: t.textMuted }]}>Memuat...</Text>
                ) : (
                  <>
                    <Text style={[styles.btnText, { color: '#FFFFFF' }]}>Masuk</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* OTP divider */}
            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>atau</Text>
              <View style={styles.line} />
            </View>

            <TouchableOpacity style={styles.otpBtn} onPress={() => router.push('/(auth)/otp')}>
              <Ionicons name="chatbubble-outline" size={20} color={t.text} />
              <Text style={styles.otpText}>Masuk dengan OTP</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Ionicons name="shield-checkmark-outline" size={14} color={t.textMuted} />
            <Text style={styles.footerText}>Akun Anda dilindungi enkripsi penuh</Text>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const getStyles = (t: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  bgPatternContainer: { position: 'absolute', top: 0, left: 0, right: 0, height: 300, overflow: 'hidden' },
  pattern1: { position: 'absolute', top: -20, right: -20, transform: [{ rotate: '15deg' }] },
  pattern2: { position: 'absolute', top: 100, left: -20, transform: [{ rotate: '-10deg' }] },
  scroll: { flexGrow: 1, paddingBottom: 40 },
  topSpacer: { height: 60 },
  card: {
    backgroundColor: t.surface,
    marginHorizontal: 20,
    borderRadius: 32,
    padding: 24,
    borderWidth: 1, borderColor: t.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
  },
  logoContainer: { alignItems: 'center', marginBottom: 24 },
  logoMark: {
    width: 80, height: 80, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: t.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 10,
    overflow: 'hidden'
  },
  logoImage: {
    width: 60, height: 60, resizeMode: 'contain'
  },
  title: { ...TYPOGRAPHY.h2, color: t.text, marginBottom: 4 },
  subtitle: { ...TYPOGRAPHY.body, color: t.textSecondary, textAlign: 'center' },
  label: { ...TYPOGRAPHY.label, color: t.textSecondary, marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: t.background, borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1.5, borderColor: t.border,
  },
  inputFocused: { borderColor: t.primary },
  input: { ...TYPOGRAPHY.body, color: t.text, flex: 1 },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 20
  },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rememberText: { ...TYPOGRAPHY.bodySmall, color: t.textSecondary, fontFamily: 'Inter_600SemiBold' },
  forgotText: { ...TYPOGRAPHY.bodySmall, color: t.textSecondary, fontFamily: 'Inter_600SemiBold' },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 16,
    shadowColor: t.secondary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  btnText: { ...TYPOGRAPHY.h4, fontFamily: 'Inter_700Bold' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: t.border },
  dividerText: { ...TYPOGRAPHY.bodySmall, color: t.textMuted },
  otpBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 16,
    borderWidth: 1.5, borderColor: t.border,
  },
  otpText: { ...TYPOGRAPHY.h4, color: t.text, fontFamily: 'Inter_600SemiBold' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 24 },
  footerText: { ...TYPOGRAPHY.caption, color: t.textMuted },
});

