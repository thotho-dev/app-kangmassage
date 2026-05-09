import { useState } from 'react';
import { useThemeColors, useThemeStore } from '../../store/themeStore';
import { useTherapistStore } from '../../store/therapistStore';
import { useAlert } from '../../components/CustomAlert';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/Theme';

export default function PaymentMethodScreen() {
  const t = useThemeColors();
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const styles = getStyles(t);
  const router = useRouter();
  const { profile, updateProfile } = useTherapistStore();
  const { showAlert, AlertComponent } = useAlert();
  
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(!profile?.bank_account_number);
  const [form, setForm] = useState({
    bank: profile?.bank_name || '',
    number: profile?.bank_account_number || '',
  });

  const handleSave = async () => {
    if (!form.bank || !form.number) {
      showAlert('warning', 'Data Tidak Lengkap', 'Harap isi nama bank dan nomor rekening.');
      return;
    }

    setLoading(true);
    try {
      await updateProfile({
        bank_name: form.bank,
        bank_account_number: form.number,
        bank_account_name: profile?.full_name?.toUpperCase() || ''
      });
      
      showAlert('success', 'Berhasil', 'Rekening pencairan telah diperbarui.');
      setIsEditing(false);
    } catch (error: any) {
      showAlert('error', 'Gagal', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Adaptive Card Colors
  const cardColors = (isDarkMode 
    ? ['#0F172A', '#1E293B', '#334155'] // Dark Mode: Deep Slate/Black
    : [t.primaryDark, '#1E293B', t.secondary]) as [string, string, ...string[]];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        {AlertComponent}
        <View style={[styles.header, { backgroundColor: t.headerBg, borderBottomWidth: 1, borderBottomColor: t.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={t.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: t.text }]}>Rekening Pencairan</Text>
          <Text style={[styles.subtitle, { color: t.textSecondary }]}>Kelola rekening untuk menarik pendapatan</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {!isEditing && profile?.bank_account_number ? (
            /* Premium Card View */
            <View style={styles.bankCard}>
              <LinearGradient 
                colors={cardColors} 
                style={styles.cardGradient} 
                start={{x:0, y:0}} 
                end={{x:1, y:1}}
              >
                {/* Decorative Circles */}
                <View style={styles.circle1} />
                <View style={styles.circle2} />
                
                <View style={styles.cardHeader}>
                  <View style={styles.chipContainer}>
                    <LinearGradient colors={['#FCD34D', '#F59E0B']} style={styles.cardChip} />
                  </View>
                  <Ionicons name="wifi-outline" size={24} color="rgba(255,255,255,0.4)" style={{ transform: [{ rotate: '90deg' }] }} />
                </View>
                
                <View style={styles.cardBody}>
                  <Text style={styles.cardNumber}>
                    {profile.bank_account_number.replace(/\d(?=\d{4})/g, "● ")}
                  </Text>
                  
                  <View style={styles.cardFooter}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardLabel}>CARD HOLDER</Text>
                      <Text style={styles.cardValue} numberOfLines={1}>{profile.full_name?.toUpperCase()}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.cardLabel}>BANK NAME</Text>
                      <View style={styles.bankBadge}>
                        <Text style={styles.bankBadgeText}>{profile.bank_name?.toUpperCase()}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Glass Reflection Effect */}
                <View style={styles.glassEffect} />
              </LinearGradient>
              
              <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)}>
                <LinearGradient colors={[t.surface, t.background]} style={styles.editBtnGradient}>
                  <Ionicons name="create-outline" size={18} color={t.secondary} />
                  <Text style={styles.editBtnText}>Ubah Detail Rekening</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            /* Enhanced Form View */
            <View style={styles.formCard}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nama Pemilik Rekening</Text>
                <View style={[styles.input, { backgroundColor: t.background, borderColor: t.border, opacity: 0.8 }]}>
                  <Ionicons name="person-outline" size={18} color={t.textMuted} />
                  <Text style={{ color: t.text, fontFamily: 'Inter_600SemiBold' }}>{profile?.full_name?.toUpperCase() || 'NAMA PROFIL'}</Text>
                  <Ionicons name="lock-closed" size={14} color={t.textMuted} style={{ marginLeft: 'auto' }} />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nama Bank</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="business-outline" size={18} color={t.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputField}
                    placeholder="Contoh: BCA, Mandiri, BNI"
                    placeholderTextColor={t.textMuted}
                    value={form.bank}
                    onChangeText={(text) => setForm({ ...form, bank: text })}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nomor Rekening</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="card-outline" size={18} color={t.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputField}
                    placeholder="Masukkan nomor rekening"
                    placeholderTextColor={t.textMuted}
                    keyboardType="number-pad"
                    value={form.number}
                    onChangeText={(text) => setForm({ ...form, number: text })}
                  />
                </View>
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
                  <LinearGradient colors={[t.secondary, '#EA580C']} style={styles.saveBtnGradient}>
                    <Text style={[styles.saveBtnText, { color: '#FFFFFF' }]}>
                      {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
                
                {profile?.bank_account_number && (
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditing(false)}>
                    <Text style={styles.cancelBtnText}>Batalkan Perubahan</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          <View style={styles.securityBox}>
            <LinearGradient colors={['#10B98120', 'transparent']} style={styles.securityGradient} start={{x:0,y:0}} end={{x:1,y:0}}>
              <Ionicons name="shield-checkmark" size={20} color={t.success} />
              <Text style={styles.securityText}>
                Data rekening Anda dienkripsi secara aman untuk proses pencairan pendapatan.
              </Text>
            </LinearGradient>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const getStyles = (t: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  header: { paddingHorizontal: SPACING.lg, paddingTop: 56, paddingBottom: SPACING.xl },
  backBtn: { marginBottom: SPACING.md },
  title: { ...TYPOGRAPHY.h2, color: t.text, marginBottom: 4 },
  subtitle: { ...TYPOGRAPHY.bodySmall, color: t.textSecondary },
  scroll: { padding: SPACING.lg },
  
  /* Premium Card Styles */
  bankCard: { width: '100%', marginBottom: SPACING.lg },
  cardGradient: { 
    borderRadius: 24, padding: 24, height: 200, 
    justifyContent: 'space-between', elevation: 12, 
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, 
    shadowOpacity: 0.5, shadowRadius: 15, overflow: 'hidden' 
  },
  circle1: { position: 'absolute', top: -50, right: -50, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.05)' },
  circle2: { position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.05)' },
  glassEffect: { position: 'absolute', top: 0, left: 0, right: 0, height: '50%', backgroundColor: 'rgba(255,255,255,0.03)' },
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  chipContainer: { width: 45, height: 32, borderRadius: 6, overflow: 'hidden', backgroundColor: '#F59E0B' },
  cardChip: { flex: 1, opacity: 0.8 },
  
  cardBody: { gap: 20 },
  cardNumber: { 
    color: '#FFFFFF', fontSize: 22, 
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', 
    letterSpacing: 2, textShadowColor: 'rgba(0,0,0,0.3)', 
    textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 
  },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  cardLabel: { fontSize: 8, color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter_700Bold', marginBottom: 4, letterSpacing: 1 },
  cardValue: { fontSize: 14, color: '#FFFFFF', fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  
  bankBadge: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  bankBadgeText: { fontSize: 12, color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  
  editBtn: { marginTop: SPACING.md, borderRadius: RADIUS.lg, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  editBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  editBtnText: { ...TYPOGRAPHY.bodySmall, color: t.text, fontFamily: 'Inter_700Bold' },
  
  /* Enhanced Form Styles */
  formCard: { backgroundColor: t.surface, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: t.border },
  inputGroup: { marginBottom: 20 },
  label: { ...TYPOGRAPHY.caption, color: t.textSecondary, marginBottom: 8, marginLeft: 4 },
  input: { 
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: t.background, borderWidth: 1.5, 
    borderColor: t.border, borderRadius: 16, padding: 14 
  },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: t.background, borderWidth: 1.5, 
    borderColor: t.border, borderRadius: 16, paddingHorizontal: 14
  },
  inputIcon: { marginRight: 10 },
  inputField: { flex: 1, paddingVertical: 14, color: t.text, ...TYPOGRAPHY.body },
  
  formActions: { marginTop: 10 },
  saveBtn: { borderRadius: RADIUS.full, overflow: 'hidden', elevation: 4, shadowColor: t.secondary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  saveBtnGradient: { padding: 16, alignItems: 'center' },
  saveBtnText: { ...TYPOGRAPHY.h4, fontFamily: 'Inter_700Bold' },
  cancelBtn: { padding: 16, alignItems: 'center', marginTop: 4 },
  cancelBtnText: { ...TYPOGRAPHY.bodySmall, color: t.textMuted, fontFamily: 'Inter_600SemiBold' },
  
  securityBox: { marginTop: SPACING.xxl, marginBottom: 40 },
  securityGradient: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: 16, alignItems: 'center' },
  securityText: { flex: 1, fontSize: 11, color: t.textSecondary, lineHeight: 18 },
});
