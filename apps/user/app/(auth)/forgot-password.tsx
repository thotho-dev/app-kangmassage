import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView, Dimensions, StatusBar, TextInput, ActivityIndicator,
  Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Smartphone, Shield, CheckCircle2, Eye, EyeOff } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, TYPOGRAPHY } from '../../constants/Theme';
import { useTheme } from '../../context/ThemeContext';
import { useAlert } from '../../context/AlertContext';
import { supabase } from '../../lib/supabase';

const { width, height } = Dimensions.get('window');
const PURPLE = '#240080';

function normalizePhone(p: string) {
  const digits = p.replace(/\D/g, '');
  if (digits.startsWith('0')) return '+62' + digits.substring(1);
  if (digits.startsWith('62')) return '+' + digits;
  return '+62' + digits;
}

enum Step { Phone, Otp, NewPassword, Success }

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { showAlert } = useAlert();

  const [step, setStep] = useState(Step.Phone);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const otpRefs = useRef<(TextInput | null)[]>([]);

  const handleSendOtp = async () => {
    if (phone.length < 9) {
      showAlert('Eror', 'Masukkan nomor telepon yang valid');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: normalizePhone(phone),
      });
      if (error) throw error;
      setStep(Step.Otp);
    } catch (err: any) {
      showAlert('Gagal', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length < 6) {
      showAlert('Eror', 'Masukkan kode OTP 6 digit');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: normalizePhone(phone),
        token: code,
        type: 'sms',
      });
      if (error) throw error;
      setStep(Step.NewPassword);
    } catch (err: any) {
      showAlert('Kode Salah', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      showAlert('Eror', 'Password baru minimal 6 karakter');
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert('Eror', 'Konfirmasi password tidak sesuai');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setStep(Step.Success);
    } catch (err: any) {
      showAlert('Gagal', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (text: string, index: number) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <LinearGradient
        colors={isDark ? [COLORS.dark[900], COLORS.dark[950]] : [COLORS.white, COLORS.light[100]]}
        style={StyleSheet.absoluteFill as any}
      />
      <View style={[styles.circle2, { backgroundColor: isDark ? 'rgba(253, 185, 39, 0.05)' : 'rgba(253, 185, 39, 0.03)' }]} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.topNav}>
          <TouchableOpacity
            onPress={() => step === Step.Phone ? router.back() : setStep(Step.Phone)}
            style={[styles.backButton, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}
          >
            <ChevronLeft size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="always">
          {step === Step.Phone && (
            <View>
              <View style={styles.logoWrap}>
                <Image source={require('../../assets/logo-kang-massage.png')} style={styles.logo} />
              </View>
              <Text style={[styles.title, { color: theme.text }]}>Lupa Password?</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Masukkan nomor telepon yang terdaftar. Kami akan mengirimkan kode OTP untuk verifikasi.
              </Text>

              <View style={[styles.inputWrap, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                <Smartphone size={20} color={theme.primary} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="08xxxxxxxxxx"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>

              <TouchableOpacity onPress={handleSendOtp} disabled={loading || phone.length < 9} activeOpacity={0.85}>
                <LinearGradient
                  colors={loading || phone.length < 9 ? ['#E2E8F0', '#E2E8F0'] : [PURPLE, '#1E1B4B']}
                  style={styles.actionBtn}
                >
                  {loading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.actionBtnText}>Kirim OTP</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {step === Step.Otp && (
            <View>
              <View style={styles.logoWrap}>
                <Image source={require('../../assets/logo-kang-massage.png')} style={styles.logo} />
              </View>
              <Text style={[styles.title, { color: theme.text }]}>Verifikasi OTP</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Kode OTP telah dikirim ke {normalizePhone(phone)}
              </Text>

              <View style={styles.otpRow}>
                {otp.map((d, i) => (
                  <TextInput
                    key={i}
                    ref={(ref) => { otpRefs.current[i] = ref; }}
                    style={[styles.otpBox, { backgroundColor: theme.surfaceVariant, borderColor: otp[i] ? theme.primary : theme.border, color: theme.text }]}
                    value={d}
                    onChangeText={(t) => handleOtpChange(t, i)}
                    onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, i)}
                    keyboardType="number-pad"
                    maxLength={1}
                  />
                ))}
              </View>

              <TouchableOpacity onPress={handleVerifyOtp} disabled={loading || otp.join('').length < 6} activeOpacity={0.85}>
                <LinearGradient
                  colors={loading || otp.join('').length < 6 ? ['#E2E8F0', '#E2E8F0'] : [PURPLE, '#1E1B4B']}
                  style={styles.actionBtn}
                >
                  {loading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.actionBtnText}>Verifikasi</Text>}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleSendOtp} disabled={loading} style={{ marginTop: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold', color: theme.primary }}>
                  Kirim ulang OTP
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {step === Step.NewPassword && (
            <View>
              <View style={styles.logoWrap}>
                <Image source={require('../../assets/logo-kang-massage.png')} style={styles.logo} />
              </View>
              <Text style={[styles.title, { color: theme.text }]}>Password Baru</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Buat password baru untuk akun Anda.
              </Text>

              <View style={[styles.inputWrap, { backgroundColor: theme.surfaceVariant, borderColor: theme.border, marginBottom: 14 }]}>
                <Shield size={20} color={theme.primary} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Password baru (min. 6 karakter)"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry={!showPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={20} color={theme.textSecondary} /> : <Eye size={20} color={theme.textSecondary} />}
                </TouchableOpacity>
              </View>

              <View style={[styles.inputWrap, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                <Shield size={20} color={theme.primary} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Ulangi password baru"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry={!showPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
              </View>

              <TouchableOpacity onPress={handleSetPassword} disabled={loading || !newPassword || !confirmPassword} activeOpacity={0.85}>
                <LinearGradient
                  colors={loading || !newPassword || !confirmPassword ? ['#E2E8F0', '#E2E8F0'] : [PURPLE, '#1E1B4B']}
                  style={styles.actionBtn}
                >
                  {loading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.actionBtnText}>Simpan Password</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {step === Step.Success && (
            <View style={styles.successWrap}>
              <CheckCircle2 size={64} color="#00A896" />
              <Text style={[styles.title, { color: theme.text, textAlign: 'center' }]}>Password Berhasil Diubah!</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary, textAlign: 'center' }]}>
                Silakan masuk dengan password baru Anda.
              </Text>
              <TouchableOpacity onPress={() => router.replace('/login')} activeOpacity={0.85}>
                <LinearGradient colors={[PURPLE, '#1E1B4B']} style={[styles.actionBtn, { marginTop: 24 }]}>
                  <Text style={styles.actionBtnText}>Kembali ke Login</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  circle2: {
    position: 'absolute', bottom: height * 0.1, left: -width * 0.2,
    width: width * 0.6, height: width * 0.6, borderRadius: width * 0.3,
  },
  topNav: { paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 60 : 40, zIndex: 10 },
  backButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 32, paddingTop: 24, paddingBottom: 40 },
  logoWrap: { alignItems: 'center', marginBottom: 16 },
  logo: { width: 56, height: 56, resizeMode: 'contain' },
  title: { fontSize: 22, fontFamily: 'PlusJakartaSans-Bold', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 13, fontFamily: 'PlusJakartaSans-Medium', lineHeight: 20, marginBottom: 28, textAlign: 'center', paddingHorizontal: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, borderWidth: 1.5,
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 20,
  },
  input: { flex: 1, fontSize: 14, fontFamily: 'PlusJakartaSans-Medium' },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 28 },
  otpBox: {
    width: 48, height: 56, borderRadius: 14, borderWidth: 1.5,
    textAlign: 'center', fontSize: 22, fontFamily: 'PlusJakartaSans-Bold',
  },
  actionBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 24, marginTop: 8 },
  actionBtnText: { fontSize: 14, fontFamily: 'PlusJakartaSans-Bold', color: '#FFFFFF' },
  successWrap: { alignItems: 'center', paddingTop: 60 },
});
