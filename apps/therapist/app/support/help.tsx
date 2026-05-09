import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useThemeColors } from '../../store/themeStore';


import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/Theme';

export default function HelpSupportScreen() {
  const t = useThemeColors();
  const styles = getStyles(t);
  
  const router = useRouter();

  const handleContactSupport = (method: 'whatsapp' | 'email' | 'phone') => {
    // Implement contact logic here
    console.log(`Contact via ${method}`);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: t.headerBg, borderBottomWidth: 1, borderBottomColor: t.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={t.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: t.text }]}>Bantuan & Dukungan</Text>
        <Text style={[styles.subtitle, { color: t.textSecondary }]}>Bagaimana kami bisa membantu Anda?</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hubungi Kami</Text>
          
          <TouchableOpacity style={styles.contactCard} onPress={() => handleContactSupport('whatsapp')}>
            <View style={[styles.iconWrap, { backgroundColor: '#25D366' + '20' }]}>
              <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>WhatsApp Support</Text>
              <Text style={styles.contactDesc}>Respon cepat (24/7)</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={t.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactCard} onPress={() => handleContactSupport('email')}>
            <View style={[styles.iconWrap, { backgroundColor: t.background + '20' }]}>
              <Ionicons name="mail" size={24} color={t.text} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>Email</Text>
              <Text style={styles.contactDesc}>support@pijatpro.id</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={t.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactCard} onPress={() => handleContactSupport('phone')}>
            <View style={[styles.iconWrap, { backgroundColor: t.background + '20' }]}>
              <Ionicons name="call" size={24} color={t.text} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>Telepon Bebas Pulsa</Text>
              <Text style={styles.contactDesc}>0800-1-234-567</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={t.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pusat Bantuan</Text>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/support/faq')}>
            <Ionicons name="chatbubbles-outline" size={20} color={t.textSecondary} />
            <Text style={styles.menuText}>Pertanyaan Umum (FAQ)</Text>
            <Ionicons name="chevron-forward" size={16} color={t.textMuted} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="book-outline" size={20} color={t.textSecondary} />
            <Text style={styles.menuText}>Panduan Terapis</Text>
            <Ionicons name="chevron-forward" size={16} color={t.textMuted} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (t: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  header: { paddingHorizontal: SPACING.lg, paddingTop: 56, paddingBottom: SPACING.xl },
  backBtn: { marginBottom: SPACING.md },
  title: { ...TYPOGRAPHY.h2, color: t.text, marginBottom: 4 },
  subtitle: { ...TYPOGRAPHY.bodySmall, color: t.textSecondary },
  scroll: { padding: SPACING.lg },
  section: { marginBottom: SPACING.xl },
  sectionTitle: { ...TYPOGRAPHY.h4, color: t.text, marginBottom: SPACING.md },
  contactCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.surface, padding: SPACING.md, borderRadius: RADIUS.lg, marginBottom: SPACING.sm, borderWidth: 1, borderColor: t.borderbackground },
  iconWrap: { width: 48, height: 48, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
  contactInfo: { flex: 1 },
  contactTitle: { ...TYPOGRAPHY.body, color: t.text, fontFamily: 'Inter_700Bold' },
  contactDesc: { ...TYPOGRAPHY.caption, color: t.textSecondary, marginTop: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: t.border },
  menuText: { ...TYPOGRAPHY.body, color: t.text, flex: 1, marginLeft: SPACING.md },
});
