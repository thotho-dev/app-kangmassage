import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '@/store/themeStore';
import { getAppSettings } from '@/lib/appSettings';
import Constants from 'expo-constants';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/constants/Theme';

export default function AboutScreen() {
  const t = useThemeColors();
  const styles = getStyles(t);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    getAppSettings().then(s => setLogoUrl(s.logo_url));
  }, []);
  
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.header, { backgroundColor: t.headerBg, borderBottomWidth: 1, borderBottomColor: t.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={t.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: t.text }]}>Tentang Aplikasi</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Image 
              source={logoUrl ? { uri: logoUrl } : require('@/assets/logo-kang-massage.png')} 
              style={{ width: 100, height: 100, resizeMode: 'contain' }} 
            />
          </View>
        </View>

        <Text style={styles.appName}>Kang Massage Mitra</Text>
        <Text style={styles.appVersion}>Versi {Constants.expoConfig?.version || '1.0.0'}</Text>

        <View style={styles.descCard}>
          <Text style={styles.descText}>
            Kang Massage adalah platform on-demand terkemuka yang menghubungkan pelanggan dengan terapis profesional. Kami berkomitmen untuk memberikan layanan terbaik, aman, dan tepercaya.
          </Text>
        </View>

        <View style={{ flex: 1 }} />
        <View style={styles.footer}>
          <Text style={styles.copyright}>© 2026 Kang Massage</Text>
          <Text style={styles.copyright}>Hak cipta dilindungi undang-undang.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (t: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  header: { paddingHorizontal: SPACING.lg, paddingTop: 35, paddingBottom: SPACING.xl },
  backBtn: { marginBottom: SPACING.md },
  title: { ...TYPOGRAPHY.h2, color: t.text },
  content: { flex: 1, alignItems: 'center', padding: SPACING.lg, marginTop: SPACING.xl },
  logoContainer: { marginBottom: SPACING.lg },
  logoCircle: { width: 120, height: 120, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', shadowColor: t.primary, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 16 },
  appName: { ...TYPOGRAPHY.h1, color: t.text, marginBottom: 4 },
  appVersion: { ...TYPOGRAPHY.bodySmall, color: t.textSecondary, marginBottom: SPACING.xxl },
  descCard: { backgroundColor: t.surface, borderRadius: RADIUS.lg, padding: SPACING.lg, borderWidth: 1, borderColor: t.border, width: '100%' },
  descText: { ...TYPOGRAPHY.bodySmall, color: t.textSecondary, textAlign: 'center', lineHeight: 22 },
  footer: { alignItems: 'center', paddingBottom: 20 },
  copyright: { ...TYPOGRAPHY.caption, color: t.textMuted },
});

