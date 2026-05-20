import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, 
  Platform, ScrollView, Dimensions, StatusBar, TextInput, ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { User, Lock, ChevronLeft, Eye, EyeOff } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, TYPOGRAPHY } from '@/constants/Theme';
import { useTheme } from '@/context/ThemeContext';
import { useAlert } from '@/context/AlertContext';
import { supabase } from '@/lib/supabase';

const { width, height } = Dimensions.get('window');
const API_BASE = 'https://app-kangmassage-web.vercel.app';

export default function RegisterScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { theme, isDark } = useTheme();
  const { showAlert } = useAlert();

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim()) {
      showAlert('Error', 'Nama lengkap wajib diisi');
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
        body: JSON.stringify({ phone, full_name: fullName.trim(), password, role: 'user' }),
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

      router.replace('/(main)/home');
    } catch (error: any) {
      showAlert('Pendaftaran Gagal', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <LinearGradient
        colors={isDark ? [COLORS.dark[900], COLORS.dark[950]] : [COLORS.white, COLORS.light[100]]}
        style={StyleSheet.absoluteFill as any}
      />
      <View style={[styles.circle1, { backgroundColor: isDark ? 'rgba(106, 13, 189, 0.15)' : 'rgba(106, 13, 189, 0.05)' }]} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.topNav}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
            <ChevronLeft size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>Lengkapi Akun</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Terakhir! Masukkan nama dan buat kata sandi untuk akun Anda
            </Text>
          </View>

          <View style={styles.form}>
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

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Kata Sandi</Text>
            <View style={[styles.inputWrap, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
              <Lock size={20} color={theme.textSecondary} />
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

            <View style={styles.infoBox}>
              <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                Nomor {phone} akan digunakan untuk login selanjutnya bersama kata sandi.
              </Text>
            </View>

            <TouchableOpacity onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
              <LinearGradient
                colors={loading ? ['#E2E8F0', '#E2E8F0'] : [COLORS.primary[500], '#1E1B4B']}
                style={styles.registerBtn}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.registerBtnText}>Buat Akun</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  circle1: {
    position: 'absolute', top: -height * 0.1, right: -width * 0.2,
    width: width * 0.8, height: width * 0.8, borderRadius: width * 0.4,
  },
  topNav: { paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 60 : 40, zIndex: 10 },
  backButton: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 32, paddingTop: 20, paddingBottom: 40 },
  header: { marginBottom: 40 },
  title: { ...TYPOGRAPHY.h1, fontSize: 28, marginBottom: 12 },
  subtitle: { ...TYPOGRAPHY.body, paddingRight: 40, fontSize: 14, lineHeight: 22 },
  form: {},
  fieldLabel: { fontSize: 14, fontFamily: 'Inter-Medium', marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 16, height: 56, marginBottom: 20,
  },
  input: { flex: 1, fontSize: 16, fontFamily: 'Inter-Medium' },
  infoBox: { backgroundColor: 'rgba(106, 13, 189, 0.08)', borderRadius: 12, padding: 16, marginBottom: 32 },
  infoText: { fontSize: 13, lineHeight: 20, fontFamily: 'Inter-Medium' },
  registerBtn: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 28,
    elevation: 6, shadowColor: COLORS.primary[500],
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10,
  },
  registerBtnText: { fontSize: 16, fontFamily: 'Inter-Bold', color: '#FFFFFF' },
});
