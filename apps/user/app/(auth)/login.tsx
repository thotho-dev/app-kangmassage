import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, Dimensions, StatusBar, Image, TextInput, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

export default function LoginScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { showAlert } = useAlert();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<'phone' | 'password' | null>(null);

  const normalizedPhone = (p: string) => {
    const digits = p.replace(/\D/g, '');
    if (digits.startsWith('0')) return '+62' + digits.substring(1);
    if (digits.startsWith('62')) return '+' + digits;
    return '+62' + digits;
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const returnUrl = 'kangmassage://callback';
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${API_BASE}/api/auth/callback`,
          skipBrowserRedirect: true,
        },
      });
      if (error) throw error;

      const res = await WebBrowser.openAuthSessionAsync(data.url, returnUrl);
      if (res.type === 'success') {
        const { url } = res;
        const parsed = Linking.parse(url);
        const q = parsed.queryParams || {};

        // PKCE flow: exchange code for session
        if (q.code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(q.code as string);
          if (!exchangeError) {
            router.replace('/home');
            return;
          }
        }

        // Implicit flow: tokens in query params
        if (q.access_token) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: q.access_token as string,
            refresh_token: (q.refresh_token as string) || '',
          });
          if (!sessionError) {
            router.replace('/home');
            return;
          }
        }

        // Fallback: session might already be set
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) router.replace('/home');
      }
    } catch (error: any) {
      showAlert('Google Login Gagal', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (phone.length < 9) {
      showAlert('Error', 'Masukkan nomor telepon yang valid');
      return;
    }
    if (!password) {
      showAlert('Error', 'Masukkan kata sandi');
      return;
    }
    setLoading(true);
    try {
      const result = await fetchJSON(`${API_BASE}/api/auth/phone-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizedPhone(phone), password, role: 'user' }),
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
      <View style={[styles.circle2, { backgroundColor: isDark ? 'rgba(253, 185, 39, 0.05)' : 'rgba(253, 185, 39, 0.03)' }]} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="always">
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image source={require('../../assets/logo-kang-massage.png')} style={styles.logoImage} />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>Kang Massage</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Masuk dengan nomor telepon dan kata sandi
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={[styles.label, { color: theme.text }]}>Nomor Telepon</Text>
            <View style={[styles.inputWrap, focused === 'phone' && styles.inputFocused, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
              <Ionicons name="call-outline" size={20} color={focused === 'phone' ? theme.primary : theme.textSecondary} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="08xxxxxxxxxx"
                placeholderTextColor={theme.textSecondary}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                onFocus={() => setFocused('phone')}
                onBlur={() => setFocused(null)}
              />
            </View>

            <Text style={[styles.label, { marginTop: 16 }]}>Kata Sandi</Text>
            <View style={[styles.inputWrap, styles.inputLast, focused === 'password' && styles.inputFocused, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
              <Ionicons name="lock-closed-outline" size={20} color={focused === 'password' ? theme.primary : theme.textSecondary} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Masukkan kata sandi"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={20} color={theme.textSecondary} /> : <Eye size={20} color={theme.textSecondary} />}
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => router.push('/forgot-password')} style={styles.forgotBtn}>
              <Text style={[styles.forgotText, { color: theme.primary }]}>Lupa Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
              <LinearGradient
                colors={loading ? ['#E2E8F0', '#E2E8F0'] : [COLORS.primary[500], '#1E1B4B']}
                style={styles.loginBtn}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.loginBtnText}>Masuk</Text>
                )}
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

            <View style={styles.dividerContainer}>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <Text style={[styles.dividerText, { color: theme.textSecondary }]}>BELUM PUNYA AKUN?</Text>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
            </View>

            <TouchableOpacity 
              activeOpacity={0.85} 
              style={styles.registerBtn}
              onPress={() => {
                try {
                  router.push('/register');
                } catch (e: any) {
                  showAlert('Nav Error', e.message);
                }
              }}
            >
              <LinearGradient
                colors={[COLORS.gold[500], '#D97706']}
                style={styles.registerGradient}
              >
                <Text style={styles.registerBtnText}>Daftar Akun Baru</Text>
              </LinearGradient>
            </TouchableOpacity>
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
  scrollContent: { flexGrow: 1, paddingHorizontal: 32, paddingTop: 32, paddingBottom: 32 },
  header: { marginBottom: 32, alignItems: 'center' },
  logoContainer: { width: 72, height: 72, marginBottom: 12, alignItems: 'center', justifyContent: 'center' },
  logoImage: { width: 64, height: 64, resizeMode: 'contain' },
  title: { ...TYPOGRAPHY.h1, fontSize: 22, marginBottom: 6, textAlign: 'center' },
  subtitle: { ...TYPOGRAPHY.body, textAlign: 'center', paddingHorizontal: 20, lineHeight: 18, fontSize: 12 },
  form: {},
  label: { ...TYPOGRAPHY.body, fontFamily: 'PlusJakartaSans-SemiBold', marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, borderWidth: 1.5,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  inputFocused: { borderColor: COLORS.primary[500] },
  inputLast: { marginBottom: 24 },
  input: { flex: 1, fontSize: 13, fontFamily: 'PlusJakartaSans-Medium' },
  loginBtn: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 24, marginBottom: 12,
    elevation: 6, shadowColor: COLORS.primary[500],
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10,
  },
  loginBtnText: { fontSize: 13, fontFamily: 'PlusJakartaSans-Bold', color: '#FFFFFF' },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  divider: { flex: 1, height: 1 },
  dividerText: { fontSize: 11, fontFamily: 'PlusJakartaSans-Bold', marginHorizontal: 12, letterSpacing: 1 },
  registerBtn: {
    width: '100%', borderRadius: 28, overflow: 'hidden',
    elevation: 6, shadowColor: COLORS.gold[500],
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10,
  },
  registerGradient: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 16,
  },
  registerBtnText: { fontSize: 13, fontFamily: 'PlusJakartaSans-Bold', color: '#FFFFFF' },
  googleButton: {
    height: 48, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  googleContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  googleText: { fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold' },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotText: { fontSize: 12, fontFamily: 'PlusJakartaSans-SemiBold' },
});
