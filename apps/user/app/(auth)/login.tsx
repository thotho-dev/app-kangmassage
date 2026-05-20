import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, Dimensions, StatusBar, Image, TextInput, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Phone, Eye, EyeOff } from 'lucide-react-native';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { COLORS, TYPOGRAPHY } from '@/constants/Theme';
import { useTheme } from '@/context/ThemeContext';
import { useAlert } from '@/context/AlertContext';
import { supabase } from '@/lib/supabase';

const API_BASE = 'https://app-kangmassage-web.vercel.app';

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

  const normalizedPhone = (p: string) => {
    const digits = p.replace(/\D/g, '');
    if (digits.startsWith('0')) return '+62' + digits.substring(1);
    if (digits.startsWith('62')) return '+' + digits;
    return '+62' + digits;
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
      router.replace('/(main)/home');
    } catch (error: any) {
      showAlert('Login Gagal', error.message || 'Nomor atau kata sandi salah');
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
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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

            <View style={[styles.passwordInputWrap, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
              <TextInput
                style={[styles.passwordInput, { color: theme.text }]}
                placeholder="Kata sandi"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={20} color={theme.textSecondary} /> : <Eye size={20} color={theme.textSecondary} />}
              </TouchableOpacity>
            </View>

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

            <TouchableOpacity onPress={() => router.push('/(auth)/register')} activeOpacity={0.85}>
              <LinearGradient
                colors={[COLORS.gold[500], '#D97706']}
                style={styles.registerBtn}
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
  scrollContent: { flexGrow: 1, paddingHorizontal: 32, paddingTop: 40, paddingBottom: 40 },
  header: { marginBottom: 40, alignItems: 'center' },
  logoContainer: { width: 90, height: 90, marginBottom: 16, alignItems: 'center', justifyContent: 'center' },
  logoImage: { width: 80, height: 80, resizeMode: 'contain' },
  title: { ...TYPOGRAPHY.h1, fontSize: 28, marginBottom: 8, textAlign: 'center' },
  subtitle: { ...TYPOGRAPHY.body, textAlign: 'center', paddingHorizontal: 20, lineHeight: 22, fontSize: 14 },
  form: {},
  phoneInputContainer: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  phonePrefix: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, borderRadius: 16, borderWidth: 1.5, height: 56,
  },
  prefixText: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  phoneInputWrap: { flex: 1, borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 16, height: 56, justifyContent: 'center' },
  phoneInput: { fontSize: 18, fontFamily: 'Inter-Medium' },
  passwordInputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 16, height: 56, marginBottom: 24,
  },
  passwordInput: { flex: 1, fontSize: 16, fontFamily: 'Inter-Medium' },
  loginBtn: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 28, marginBottom: 16,
    elevation: 6, shadowColor: COLORS.primary[500],
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10,
  },
  loginBtnText: { fontSize: 16, fontFamily: 'Inter-Bold', color: '#FFFFFF' },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  divider: { flex: 1, height: 1 },
  dividerText: { fontSize: 11, fontFamily: 'Inter-Bold', marginHorizontal: 12, letterSpacing: 1 },
  registerBtn: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 28,
    elevation: 6, shadowColor: COLORS.gold[500],
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10,
  },
  registerBtnText: { fontSize: 16, fontFamily: 'Inter-Bold', color: '#FFFFFF' },
  googleButton: {
    height: 52, borderRadius: 16, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  googleContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  googleText: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
});
