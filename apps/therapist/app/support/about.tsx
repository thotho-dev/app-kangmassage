import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useThemeColors } from '../../store/themeStore';


import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/Theme';

export default function AboutScreen() {
  const t = useThemeColors();
  const styles = getStyles(t);
  
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: t.headerBg, borderBottomWidth: 1, borderBottomColor: t.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={t.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: t.text }]}>Tentang Aplikasi</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <LinearGradient colors={[t.secondary, '#EA580C']} style={styles.logoCircle}>
            <Ionicons name="hand-left" size={64} color="#FFFFFF" />
          </LinearGradient>
        </View>

        <Text style={styles.appName}>PijatPro Mitra Terapis</Text>
        <Text style={styles.appVersion}>Versi 1.0.0 (Build 12)</Text>

        <View style={styles.descCard}>
          <Text style={styles.descText}>
            PijatPro adalah platform on-demand terkemuka di Indonesia yang menghubungkan pelanggan dengan terapis profesional. Kami berkomitmen untuk memberikan layanan terbaik, aman, dan tepercaya.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.copyright}>© 2026 PT PijatPro Digital Nusantara.</Text>
          <Text style={styles.copyright}>Hak cipta dilindungi undang-undang.</Text>
        </View>
      </View>
    </View>
  );
}

const getStyles = (t: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  header: { paddingHorizontal: SPACING.lg, paddingTop: 56, paddingBottom: SPACING.xl },
  backBtn: { marginBottom: SPACING.md },
  title: { ...TYPOGRAPHY.h2, color: t.text },
  content: { flex: 1, alignItems: 'center', padding: SPACING.lg, marginTop: SPACING.xl },
  logoContainer: { marginBottom: SPACING.lg },
  logoCircle: { width: 120, height: 120, borderRadius: 36, alignItems: 'center', justifyContent: 'center', shadowColor: t.texttext, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 16 },
  appName: { ...TYPOGRAPHY.h1, color: t.text, marginBottom: 4 },
  appVersion: { ...TYPOGRAPHY.bodySmall, color: t.textSecondary, marginBottom: SPACING.xxl },
  descCard: { backgroundColor: t.surface, borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: t.bordertext, width: '100%' },
  descText: { ...TYPOGRAPHY.bodySmall, color: t.textSecondary, textAlign: 'center', lineHeight: 22 },
  footer: { position: 'absolute', bottom: 40, alignItems: 'center' },
  copyright: { ...TYPOGRAPHY.caption, color: t.textMuted },
});
