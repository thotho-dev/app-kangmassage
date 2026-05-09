import { useState } from 'react';
import { useThemeColors } from '../../store/themeStore';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/Theme';

import { useTherapistStore } from '../../store/therapistStore';
import { useAlert } from '../../components/CustomAlert';

type Step = 'input' | 'verify' | 'done';

export default function ChangePhoneScreen() {
  const t = useThemeColors();
  const styles = getStyles(t);
  const { profile, updateProfile } = useTherapistStore();
  const { showAlert, AlertComponent } = useAlert();
  
  const router = useRouter();
  const [step, setStep] = useState<Step>('input');
  const [newPhone, setNewPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (step === 'input') {
      if (!newPhone || newPhone.length < 9) {
        showAlert('warning', 'Nomor Tidak Valid', 'Harap masukkan nomor telepon yang valid.');
        return;
      }
      setLoading(true);
      // Simulate sending OTP
      setTimeout(() => {
        setLoading(false);
        setStep('verify');
      }, 1000);
    } else if (step === 'verify') {
      if (otp.length < 6) {
        showAlert('warning', 'OTP Tidak Lengkap', 'Harap masukkan 6 digit kode OTP.');
        return;
      }
      
      setLoading(true);
      try {
        // In a real app, you'd verify the OTP here. 
        // For this demo/setup, we'll assume OTP is valid and update the profile.
        const fullPhone = `+62${newPhone}`;
        await updateProfile({ phone: fullPhone });
        
        setStep('done');
      } catch (error: any) {
        showAlert('error', 'Gagal Memperbarui', error.message || 'Terjadi kesalahan saat memperbarui nomor.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        {AlertComponent}
        <View style={[styles.header, { backgroundColor: t.headerBg, borderBottomWidth: 1, borderBottomColor: t.border }]}>
          <TouchableOpacity onPress={() => step !== 'done' ? (step === 'input' ? router.back() : setStep('input')) : router.back()}>
            <Ionicons name="arrow-back" size={24} color={t.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: t.text, marginTop: SPACING.md }]}>
            {step === 'done' ? 'Berhasil' : step === 'input' ? 'Ubah Nomor Telepon' : 'Verifikasi OTP'}
          </Text>
        </View>

        <View style={styles.content}>
          {step !== 'done' ? (
            <>
              <LinearGradient colors={[t.secondary, '#EA580C']} style={styles.icon}>
                <Ionicons name="phone-portrait-outline" size={36} color="#FFFFFF" />
              </LinearGradient>

              <Text style={styles.subtitle}>
                {step === 'input'
                  ? 'Masukkan nomor telepon baru Anda'
                  : `Kode OTP dikirim ke +62 ${newPhone}`}
              </Text>

              <View style={styles.card}>
                {step === 'input' ? (
                  <>
                    <View style={styles.currentPhone}>
                      <Ionicons name="phone-portrait-outline" size={16} color={t.textMuted} />
                      <Text style={styles.currentPhoneText}>Nomor saat ini: {profile?.phone || '-'}</Text>
                    </View>
                    <Text style={styles.label}>Nomor Baru</Text>
                    <View style={styles.inputRow}>
                      <View style={styles.prefix}>
                        <Text style={styles.prefixText}>+62</Text>
                      </View>
                      <TextInput
                        style={styles.input}
                        placeholder="8xxxxxxxxx"
                        placeholderTextColor={t.textMuted}
                        keyboardType="phone-pad"
                        value={newPhone}
                        onChangeText={setNewPhone}
                      />
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.label}>Masukkan Kode OTP (6 digit)</Text>
                    <TextInput
                      style={styles.otpInput}
                      placeholder="— — — — — —"
                      placeholderTextColor={t.textMuted}
                      keyboardType="number-pad"
                      value={otp}
                      onChangeText={setOtp}
                      maxLength={6}
                      textAlign="center"
                    />
                    <TouchableOpacity style={styles.resendBtn}>
                      <Text style={styles.resendText}>Kirim ulang OTP</Text>
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity onPress={handleNext} disabled={loading} activeOpacity={0.85} style={{ marginTop: SPACING.md }}>
                  <LinearGradient colors={[t.secondary, '#EA580C']} style={styles.btn}>
                    <Text style={[styles.btnText, { color: '#FFFFFF' }]}>{loading ? 'Memproses...' : step === 'input' ? 'Kirim OTP' : 'Verifikasi'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.doneWrap}>
              <LinearGradient colors={['#10B981', '#059669']} style={styles.doneIcon}>
                <Ionicons name="checkmark" size={48} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.doneTitle}>Berhasil!</Text>
              <Text style={styles.doneSubtitle}>Nomor telepon Anda telah berhasil diperbarui menjadi +62 {newPhone}</Text>
              <TouchableOpacity onPress={() => router.back()} activeOpacity={0.85}>
                <LinearGradient colors={[t.secondary, '#EA580C']} style={styles.doneBtn}>
                  <Text style={[styles.doneBtnText, { color: '#FFFFFF' }]}>Kembali ke Profil</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const getStyles = (t: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  header: { paddingHorizontal: SPACING.lg, paddingTop: 52, paddingBottom: SPACING.xl },
  title: { ...TYPOGRAPHY.h2 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', padding: SPACING.lg, paddingTop: SPACING.xxl },
  icon: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md, shadowColor: t.secondary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 },
  subtitle: { ...TYPOGRAPHY.body, color: t.textSecondary, marginBottom: SPACING.xl, textAlign: 'center' },
  card: { width: '100%', backgroundColor: t.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, borderWidth: 1, borderColor: t.border },
  currentPhone: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.background, borderRadius: RADIUS.md, padding: SPACING.sm, marginBottom: SPACING.md },
  currentPhoneText: { ...TYPOGRAPHY.caption, color: t.textSecondary },
  label: { ...TYPOGRAPHY.label, color: t.textSecondary, marginBottom: 8 },
  inputRow: { flexDirection: 'row', borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: t.border, overflow: 'hidden', marginBottom: 4 },
  prefix: { backgroundColor: t.background, paddingHorizontal: SPACING.md, paddingVertical: 14, justifyContent: 'center', borderRightWidth: 1, borderRightColor: t.border },
  prefixText: { ...TYPOGRAPHY.body, color: t.text },
  input: { ...TYPOGRAPHY.body, color: t.text, flex: 1, paddingHorizontal: SPACING.md, backgroundColor: t.background },
  otpInput: { ...TYPOGRAPHY.h3, color: t.text, backgroundColor: t.background, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: t.border, paddingVertical: 16, letterSpacing: 8, marginBottom: SPACING.sm },
  resendBtn: { alignSelf: 'center' },
  resendText: { ...TYPOGRAPHY.bodySmall, color: t.text, fontFamily: 'Inter_600SemiBold' },
  btn: { paddingVertical: 16, borderRadius: RADIUS.full, alignItems: 'center' },
  btnText: { ...TYPOGRAPHY.h4 },
  doneWrap: { alignItems: 'center', gap: SPACING.md, marginTop: SPACING.xxl },
  doneIcon: { width: 100, height: 100, borderRadius: 30, alignItems: 'center', justifyContent: 'center', shadowColor: t.success, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 14 },
  doneTitle: { ...TYPOGRAPHY.h1, color: t.text },
  doneSubtitle: { ...TYPOGRAPHY.body, color: t.textSecondary, textAlign: 'center', lineHeight: 24 },
  doneBtn: { paddingVertical: 16, paddingHorizontal: 40, borderRadius: RADIUS.full },
  doneBtnText: { ...TYPOGRAPHY.h4 },
});
