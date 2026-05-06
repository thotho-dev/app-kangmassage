import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/Theme';
import { useThemeColors } from '../../store/themeStore';
import { useTherapistStore } from '../../store/therapistStore';

export default function ProfileDetailScreen() {
  const router = useRouter();
  const { profile } = useTherapistStore();
  const t = useThemeColors();
  const styles = getStyles(t);

  const detailItems = [
    { label: 'Nama Lengkap', value: profile?.full_name, icon: 'person-outline' },
    { label: 'Nomor Telepon', value: profile?.phone, icon: 'call-outline' },
    { label: 'Email', value: profile?.email || 'Belum diatur', icon: 'mail-outline' },
    { label: 'Gender', value: profile?.gender === 'male' ? 'Laki-laki' : (profile?.gender === 'female' ? 'Perempuan' : 'Tidak ditentukan'), icon: 'transgender-outline' },
    { label: 'Tanggal Bergabung', value: new Date(profile?.created_at || Date.now()).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }), icon: 'calendar-outline' },
  ];

  const documentItems = [
    { label: 'NIK (No. KTP)', value: profile?.nik || 'Terverifikasi', icon: 'card-outline' },
    { label: 'Sertifikasi', value: profile?.is_verified ? 'Terapis Berlisensi' : 'Dalam Proses', icon: 'ribbon-outline' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={t.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Profil</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Profile Picture Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: t.secondary }]}>
                <Text style={styles.avatarText}>{profile?.full_name?.charAt(0) || '?'}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.changePhotoBtn}>
              <Ionicons name="camera" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.profileName}>{profile?.full_name}</Text>
          <Text style={styles.profileStatus}>Mitra Terapis Aktif</Text>
        </View>

        {/* Bio Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tentang Saya (Bio)</Text>
          <View style={styles.card}>
            <View style={{ padding: SPACING.md }}>
              <Text style={styles.bioText}>
                {profile?.bio || 'Belum ada bio. Tambahkan bio singkat untuk menarik pelanggan.'}
              </Text>
            </View>
          </View>
        </View>

        {/* Specializations Chips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Spesialisasi & Keahlian</Text>
          <View style={styles.chipContainer}>
            {(profile?.specializations && profile.specializations.length > 0) ? (
              profile.specializations.map((spec) => (
                <View key={spec} style={[styles.chip, { backgroundColor: t.info + '15', borderColor: t.info + '30' }]}>
                  <Text style={[styles.chipText, { color: t.info }]}>{spec}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Belum ada spesialisasi ditambahkan</Text>
            )}
          </View>
        </View>

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informasi Dasar</Text>
          <View style={styles.card}>
            {detailItems.map((item, index) => (
              <View key={item.label} style={[styles.infoRow, index < detailItems.length - 1 && styles.borderBottom]}>
                <View style={[styles.iconContainer, { backgroundColor: t.info + '20' }]}>
                  <Ionicons name={item.icon as any} size={18} color={t.info} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text style={styles.infoValue}>{item.value}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Documents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dokumen & Verifikasi</Text>
          <View style={styles.card}>
            {documentItems.map((item, index) => (
              <View key={item.label} style={[styles.infoRow, index < documentItems.length - 1 && styles.borderBottom]}>
                <View style={[styles.iconContainer, { backgroundColor: t.success + '20' }]}>
                  <Ionicons name={item.icon as any} size={18} color={t.success} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text style={styles.infoValue}>{item.value}</Text>
                </View>
                {index === 1 && profile?.is_verified && (
                  <Ionicons name="checkmark-circle" size={20} color={t.success} />
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Edit Button */}
        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: t.primary }]}>
          <Text style={styles.submitBtnText}>Ajukan Perubahan Data</Text>
        </TouchableOpacity>
        
        <Text style={styles.footerNote}>
          Perubahan data inti memerlukan verifikasi dari tim admin kami.
        </Text>
      </ScrollView>
    </View>
  );
}

const getStyles = (t: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    paddingHorizontal: SPACING.md, paddingTop: 56, paddingBottom: SPACING.md,
    backgroundColor: t.background, borderBottomWidth: 1, borderBottomColor: t.border
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...TYPOGRAPHY.h4, color: t.text, fontFamily: 'Inter_700Bold' },
  
  scroll: { padding: SPACING.lg, paddingBottom: 60 },
  
  avatarSection: { alignItems: 'center', marginBottom: SPACING.xl },
  avatarWrap: { position: 'relative', marginBottom: SPACING.md },
  avatar: { width: 100, height: 100, borderRadius: 32 },
  avatarText: { ...TYPOGRAPHY.h1, color: '#FFFFFF', fontSize: 40 },
  changePhotoBtn: { 
    position: 'absolute', bottom: -5, right: -5, 
    width: 36, height: 36, borderRadius: 18, 
    backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: t.background
  },
  profileName: { ...TYPOGRAPHY.h3, color: t.text, marginBottom: 2 },
  profileStatus: { ...TYPOGRAPHY.caption, color: t.textSecondary },
  
  bioText: { ...TYPOGRAPHY.bodySmall, color: t.text, lineHeight: 20 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 4 },
  chip: { 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: RADIUS.full, 
    borderWidth: 1 
  },
  chipText: { ...TYPOGRAPHY.caption, fontFamily: 'Inter_600SemiBold' },
  emptyText: { ...TYPOGRAPHY.caption, color: t.textMuted, fontStyle: 'italic' },
  
  section: { marginBottom: SPACING.xl },
  sectionTitle: { ...TYPOGRAPHY.label, color: t.textSecondary, marginBottom: SPACING.sm, marginLeft: 4, fontFamily: 'Inter_600SemiBold' },
  card: { backgroundColor: t.surface, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: t.border, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: SPACING.md },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: t.border },
  iconContainer: { 
    width: 36, 
    height: 36, 
    borderRadius: 10, 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.15)' // Light blue tint
  },
  infoContent: { flex: 1 },
  infoLabel: { ...TYPOGRAPHY.caption, color: t.textSecondary, marginBottom: 2 },
  infoValue: { ...TYPOGRAPHY.body, color: t.text, fontFamily: 'Inter_600SemiBold' },
  
  submitBtn: { 
    height: 56, borderRadius: RADIUS.xl, 
    alignItems: 'center', justifyContent: 'center', 
    marginTop: SPACING.md,
    shadowColor: t.primary, shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 
  },
  submitBtnText: { ...TYPOGRAPHY.body, color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  footerNote: { ...TYPOGRAPHY.caption, color: t.textMuted, textAlign: 'center', marginTop: SPACING.md, paddingHorizontal: SPACING.xl },
});
