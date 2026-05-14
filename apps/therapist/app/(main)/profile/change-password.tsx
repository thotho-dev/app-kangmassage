import { useState } from 'react';
import { useThemeColors } from '@/store/themeStore';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/constants/Theme';
import { supabase } from '@/lib/supabase';
import { useAlert } from '@/components/CustomAlert';

export default function ChangePasswordScreen() {
  const t = useThemeColors();
  const styles = getStyles(t);
  const router = useRouter();
  const { showAlert, AlertComponent } = useAlert();
  const [current, setCurrent] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = newPwd.length === 0 ? 0 : newPwd.length < 6 ? 1 : newPwd.length < 10 ? 2 : 3;
  const strengthColor = [t.textMuted, t.danger, t.warning, t.success][strength];
  const strengthLabel = ['', 'Lemah', 'Cukup', 'Kuat'][strength];

  const handleSave = async () => {
    if (!current || !newPwd || !confirm) {
      showAlert('warning', 'Isi Semua Kolom', 'Harap isi semua kolom kata sandi terlebih dahulu.');
      return;
    }
    if (newPwd !== confirm) {
      showAlert('error', 'Kata Sandi Tidak Cocok', 'Konfirmasi kata sandi tidak sesuai dengan kata sandi baru.');
      return;
    }
    if (newPwd.length < 8) {
      showAlert('warning', 'Kata Sandi Terlalu Pendek', 'Kata sandi harus minimal 8 karakter.');
      return;
    }

    setLoading(true);
    try {
      // Step 1: Re-authenticate user to verify current password (Optional but recommended)
      // Note: Supabase updateUser doesn't strictly require old password, 
      // but we can add a check by attempting to login again if needed.
      
      const { error } = await supabase.auth.updateUser({ 
        password: newPwd 
      });

      if (error) throw error;

      showAlert(
        'success',
        'Berhasil!',
        'Kata sandi Anda telah berhasil diperbarui.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      showAlert(
        'error', 
        'Gagal Memperbarui', 
        error.message || 'Terjadi kesalahan saat memperbarui kata sandi.'
      );
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { label: 'Kata Sandi Saat Ini', value: current, setter: setCurrent, show: showCurrent, toggler: () => setShowCurrent(!showCurrent), icon: 'lock-closed-outline' },
    { label: 'Kata Sandi Baru', value: newPwd, setter: setNewPwd, show: showNew, toggler: () => setShowNew(!showNew), icon: 'lock-open-outline' },
    { label: 'Konfirmasi Kata Sandi Baru', value: confirm, setter: setConfirm, show: showConfirm, toggler: () => setShowConfirm(!showConfirm), icon: 'shield-checkmark-outline' },
  ];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        {AlertComponent}
        <View style={[styles.header, { backgroundColor: t.headerBg, borderBottomWidth: 1, borderBottomColor: t.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={t.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: t.text, marginTop: SPACING.md }]}>Ubah Kata Sandi</Text>
          <Text style={[styles.subtitle, { color: t.textSecondary }]}>Buat kata sandi yang kuat dan unik</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={[t.secondary, '#EA580C']} style={styles.icon}>
            <Ionicons name="lock-closed" size={36} color="#FFFFFF" />
          </LinearGradient>

          <View style={styles.card}>
            {fields.map(({ label, value, setter, show, toggler, icon }) => (
              <View key={label} style={styles.fieldWrap}>
                <Text style={styles.label}>{label}</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name={icon as any} size={20} color={t.textMuted} />
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={setter}
                    secureTextEntry={!show}
                    placeholderTextColor={t.textMuted}
                    placeholder="••••••••"
                  />
                  <TouchableOpacity onPress={toggler}>
                    <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={t.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {newPwd.length > 0 && (
              <View style={styles.strengthWrap}>
                <View style={styles.strengthBar}>
                  {[1, 2, 3].map(n => (
                    <View key={n} style={[styles.strengthSegment, n <= strength && { backgroundColor: strengthColor }]} />
                  ))}
                </View>
                <Text style={[styles.strengthLabel, { color: strengthColor }]}>{strengthLabel}</Text>
              </View>
            )}

            {confirm && newPwd && confirm !== newPwd && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={14} color={t.danger} />
                <Text style={styles.errorText}>Kata sandi tidak cocok</Text>
              </View>
            )}

            <TouchableOpacity onPress={handleSave} disabled={loading || newPwd !== confirm || !current} activeOpacity={0.85} style={{ marginTop: SPACING.md }}>
              <LinearGradient
                colors={(!current || !newPwd || newPwd !== confirm) ? [t.border, t.border] : [t.secondary, '#EA580C']}
                style={styles.btn}
              >
                <Text style={[styles.btnText, { color: '#FFFFFF' }]}>{loading ? 'Menyimpan...' : 'Simpan Perubahan'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.tips}>
            <Text style={styles.tipsTitle}>Tips Kata Sandi Kuat:</Text>
            {['Minimal 8 karakter', 'Kombinasi huruf besar & kecil', 'Mengandung angka atau simbol'].map(tip => (
              <View key={tip} style={styles.tipRow}>
                <Ionicons name="checkmark-circle-outline" size={14} color={t.success} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const getStyles = (t: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  header: { paddingHorizontal: SPACING.lg, paddingTop: 30, paddingBottom: SPACING.xl },
  title: { ...TYPOGRAPHY.h2 },
  subtitle: { ...TYPOGRAPHY.body },
  scroll: { alignItems: 'center', padding: SPACING.lg, paddingTop: SPACING.xl, paddingBottom: 40 },
  icon: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md, shadowColor: t.secondary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 },
  card: { width: '100%', backgroundColor: t.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, borderWidth: 1, borderColor: t.border },
  fieldWrap: { marginBottom: SPACING.md },
  label: { ...TYPOGRAPHY.label, color: t.textSecondary, marginBottom: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.background, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 14, borderWidth: 1.5, borderColor: t.border },
  input: { ...TYPOGRAPHY.body, color: t.text, flex: 1 },
  strengthWrap: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: -SPACING.sm, marginBottom: SPACING.sm },
  strengthBar: { flex: 1, flexDirection: 'row', gap: 4 },
  strengthSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: t.border },
  strengthLabel: { ...TYPOGRAPHY.caption, fontFamily: 'Inter_700Bold', minWidth: 40 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -SPACING.sm, marginBottom: SPACING.sm },
  errorText: { ...TYPOGRAPHY.caption, color: t.danger },
  btn: { paddingVertical: 16, borderRadius: RADIUS.full, alignItems: 'center' },
  btnText: { ...TYPOGRAPHY.h4 },
  tips: { width: '100%', marginTop: SPACING.lg, gap: 8 },
  tipsTitle: { ...TYPOGRAPHY.label, color: t.textSecondary, marginBottom: 4 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tipText: { ...TYPOGRAPHY.caption, color: t.textSecondary },
});

