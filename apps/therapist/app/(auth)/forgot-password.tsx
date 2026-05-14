import { useState } from 'react';
import { useThemeColors } from '@/store/themeStore';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/constants/Theme';

type Step = 'phone' | 'otp' | 'password';

export default function ForgotPasswordScreen() {
  const t = useThemeColors();
  const styles = getStyles(t);
  
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [loading, setLoading] = useState(false);

  const stepInfo = {
    phone: { icon: 'phone-portrait-outline', title: 'Lupa Kata Sandi', subtitle: 'Masukkan nomor telepon Anda untuk reset kata sandi' },
    otp: { icon: 'shield-checkmark-outline', title: 'Verifikasi OTP', subtitle: 'Masukkan kode 6 digit yang kami kirimkan' },
    password: { icon: 'lock-closed-outline', title: 'Buat Kata Sandi Baru', subtitle: 'Pastikan kata sandi minimal 8 karakter' },
  };

  const info = stepInfo[step];

  const handleAction = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (step === 'phone') setStep('otp');
      else if (step === 'otp') setStep('password');
      else router.replace('/(auth)/login');
    }, 1200);
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
                <Text style={styles.label}>Kode OTP (6 digit)</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="keypad-outline" size={20} color={t.textMuted} />
                  <TextInput style={styles.input} placeholder="xxxxxx" placeholderTextColor={t.textMuted} keyboardType="number-pad" value={otp} onChangeText={setOtp} maxLength={6} />
                </View>
              </>
            )}
            {step === 'password' && (
              <>
                <Text style={styles.label}>Kata Sandi Baru</Text>
                <View style={[styles.inputWrap, { marginBottom: SPACING.md }]}>
                  <Ionicons name="lock-closed-outline" size={20} color={t.textMuted} />
                  <TextInput style={styles.input} placeholder="Minimal 8 karakter" placeholderTextColor={t.textMuted} secureTextEntry value={newPwd} onChangeText={setNewPwd} />
                </View>
                <Text style={styles.label}>Konfirmasi Kata Sandi</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="shield-outline" size={20} color={t.textMuted} />
                  <TextInput style={styles.input} placeholder="Ulangi kata sandi baru" placeholderTextColor={t.textMuted} secureTextEntry value={confirmPwd} onChangeText={setConfirmPwd} />
                </View>
              </>
            )}

            <TouchableOpacity onPress={handleAction} disabled={loading} activeOpacity={0.85} style={{ marginTop: SPACING.md }}>
              <LinearGradient colors={[t.secondary, '#EA580C']} style={styles.btn}>
                <Text style={[styles.btnText, { color: '#FFFFFF' }]}>{loading ? 'Memproses...' : step === 'password' ? 'Simpan Kata Sandi' : 'Lanjut'}</Text>
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
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: RADIUS.full,
    shadowColor: t.secondary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  btnText: { ...TYPOGRAPHY.h4, fontFamily: 'Inter_700Bold' },
});
