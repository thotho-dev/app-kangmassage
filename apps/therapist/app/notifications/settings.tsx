import { useState } from 'react';
import { useThemeColors } from '../../store/themeStore';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/Theme';

const SETTINGS = [
  { id: 'new_order', label: 'Pesanan Baru', desc: 'Notifikasi saat ada pelanggan yang memesan', icon: 'bag-outline', color: '#F97316', enabled: true },
  { id: 'payment', label: 'Pembayaran Masuk', desc: 'Notifikasi saat pembayaran diterima', icon: 'cash-outline', color: '#10B981', enabled: true },
  { id: 'rating', label: 'Ulasan & Rating', desc: 'Notifikasi saat pelanggan memberi ulasan', icon: 'star-outline', color: '#F59E0B', enabled: true },
  { id: 'promo', label: 'Promosi & Info', desc: 'Info program bonus dan promosi platform', icon: 'megaphone-outline', color: '#3B82F6', enabled: false },
  { id: 'reminder', label: 'Pengingat Jadwal', desc: 'Pengingat 30 menit sebelum jadwal layanan', icon: 'alarm-outline', color: '#8B5CF6', enabled: true },
  { id: 'system', label: 'Notifikasi Sistem', desc: 'Pembaruan dan pengumuman penting', icon: 'shield-outline', color: '#64748B', enabled: true },
];

export default function NotificationSettingsScreen() {
  const t = useThemeColors();
  const styles = getStyles(t);
  const router = useRouter();
  const [settings, setSettings] = useState(
    SETTINGS.reduce((acc, s) => ({ ...acc, [s.id]: s.enabled }), {} as Record<string, boolean>)
  );
  const [allEnabled, setAllEnabled] = useState(true);

  const toggle = (id: string) => setSettings(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleAll = () => {
    const next = !allEnabled;
    setAllEnabled(next);
    setSettings(SETTINGS.reduce((acc, s) => ({ ...acc, [s.id]: next }), {}));
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: t.headerBg, borderBottomWidth: 1, borderBottomColor: t.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={t.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: t.text }]}>Pengaturan Notifikasi</Text>
        <Text style={[styles.subtitle, { color: t.textSecondary }]}>Kelola notifikasi yang ingin Anda terima</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.masterCard}>
          <LinearGradient colors={allEnabled ? [t.secondary + '20', t.secondary + '05'] : [t.surface, t.surface]} style={styles.masterGrad}>
            <View style={styles.masterLeft}>
              <View style={[styles.masterIcon, { backgroundColor: allEnabled ? t.secondary + '30' : t.background }]}>
                <Ionicons name="notifications" size={24} color={allEnabled ? t.secondary : t.textMuted} />
              </View>
              <View>
                <Text style={styles.masterTitle}>Semua Notifikasi</Text>
                <Text style={styles.masterDesc}>{allEnabled ? 'Aktif' : 'Nonaktif'}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={toggleAll}
              style={[styles.toggleBtn, allEnabled ? styles.toggleOn : styles.toggleOff]}
            >
              <View style={[styles.toggleThumb, allEnabled ? styles.thumbOn : styles.thumbOff]} />
            </TouchableOpacity>
          </LinearGradient>
        </View>

        <Text style={styles.sectionTitle}>Per Kategori</Text>

        <View style={styles.settingsCard}>
          {SETTINGS.map((setting, i) => (
            <View key={setting.id} style={[styles.settingItem, i < SETTINGS.length - 1 && styles.settingBorder]}>
              <View style={[styles.settingIcon, { backgroundColor: setting.color + '20' }]}>
                <Ionicons name={setting.icon as any} size={18} color={setting.color} />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>{setting.label}</Text>
                <Text style={styles.settingDesc}>{setting.desc}</Text>
              </View>
              <TouchableOpacity
                onPress={() => toggle(setting.id)}
                style={[styles.toggleBtn, settings[setting.id] ? styles.toggleOn : styles.toggleOff]}
              >
                <View style={[styles.toggleThumb, settings[setting.id] ? styles.thumbOn : styles.thumbOff]} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color={t.textSecondary} />
          <Text style={styles.infoText}>Notifikasi pesanan baru selalu aktif untuk memastikan Anda tidak melewatkan pesanan penting.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (t: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  header: { paddingHorizontal: SPACING.lg, paddingTop: 56, paddingBottom: SPACING.xl },
  backBtn: { marginBottom: SPACING.sm },
  title: { ...TYPOGRAPHY.h2, marginBottom: 4 },
  subtitle: { ...TYPOGRAPHY.body },
  scroll: { padding: SPACING.lg, paddingBottom: 60 },
  masterCard: { borderRadius: RADIUS.xl, overflow: 'hidden', marginBottom: SPACING.lg, borderWidth: 1, borderColor: t.border },
  masterGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg },
  masterLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  masterIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  masterTitle: { ...TYPOGRAPHY.h4, color: t.text },
  masterDesc: { ...TYPOGRAPHY.bodySmall, color: t.textSecondary },
  sectionTitle: { ...TYPOGRAPHY.label, color: t.textSecondary, marginBottom: SPACING.sm, marginLeft: 4 },
  settingsCard: { backgroundColor: t.surface, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: t.border, overflow: 'hidden', marginBottom: SPACING.md },
  settingItem: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: SPACING.sm },
  settingBorder: { borderBottomWidth: 1, borderBottomColor: t.border },
  settingIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  settingText: { flex: 1 },
  settingLabel: { ...TYPOGRAPHY.bodySmall, color: t.text, fontFamily: 'Inter_600SemiBold' },
  settingDesc: { ...TYPOGRAPHY.caption, color: t.textSecondary, marginTop: 1 },
  toggleBtn: { width: 50, height: 28, borderRadius: 14, padding: 3, justifyContent: 'center' },
  toggleOn: { backgroundColor: t.secondary },
  toggleOff: { backgroundColor: t.border },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF' },
  thumbOn: { alignSelf: 'flex-end' },
  thumbOff: { alignSelf: 'flex-start' },
  infoBox: { flexDirection: 'row', gap: SPACING.sm, backgroundColor: t.surface, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: t.border },
  infoText: { ...TYPOGRAPHY.caption, color: t.textSecondary, flex: 1, lineHeight: 18 },
});
