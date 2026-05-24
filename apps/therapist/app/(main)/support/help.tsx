import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Modal } from 'react-native';
import { useThemeColors } from '@/store/themeStore';
import { WebView } from 'react-native-webview';


import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/constants/Theme';
import { getAppSettings } from '@/lib/appSettings';

export default function HelpSupportScreen() {
  const t = useThemeColors();
  const styles = getStyles(t);
  const router = useRouter();
  const [settings, setSettings] = useState<{ support_whatsapp: string; support_email: string; chat_link: string }>({ support_whatsapp: '', support_email: '', chat_link: '' });
  const [chatVisible, setChatVisible] = useState(false);

  useEffect(() => {
    getAppSettings().then(s => setSettings({ support_whatsapp: s.support_whatsapp, support_email: s.support_email, chat_link: s.chat_link }));
  }, []);

  const handleWhatsApp = () => {
    const num = settings.support_whatsapp.replace(/[^0-9]/g, '');
    if (num) Linking.openURL(`https://wa.me/${num}`);
  };

  const handleEmail = () => {
    if (settings.support_email) Linking.openURL(`mailto:${settings.support_email}`);
  };

  const handleChat = () => {
    if (settings.chat_link) setChatVisible(true);
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
          
          <TouchableOpacity style={styles.contactCard} onPress={handleWhatsApp}>
            <View style={[styles.iconWrap, { backgroundColor: '#25D366' + '20' }]}>
              <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>WhatsApp Support</Text>
              <Text style={styles.contactDesc}>Respon cepat (24/7)</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={t.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactCard} onPress={handleEmail}>
            <View style={[styles.iconWrap, { backgroundColor: t.background + '20' }]}>
              <Ionicons name="mail" size={24} color={t.text} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>Email</Text>
              <Text style={styles.contactDesc}>{settings.support_email || 'support@kangmassage.app'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={t.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactCard} onPress={handleChat}>
            <View style={[styles.iconWrap, { backgroundColor: t.primary + '20' }]}>
              <Ionicons name="chatbubble-ellipses" size={24} color={t.primary} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactTitle}>Live Chat</Text>
              <Text style={styles.contactDesc}>Chat langsung dengan admin</Text>
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

      <Modal visible={chatVisible} animationType="slide" onRequestClose={() => setChatVisible(false)}>
        <View style={{ flex: 1, backgroundColor: t.background }}>
          <View style={[styles.header, { backgroundColor: t.headerBg, borderBottomWidth: 1, borderBottomColor: t.border }]}>
            <TouchableOpacity onPress={() => setChatVisible(false)} style={styles.backBtn}>
              <Ionicons name="close" size={24} color={t.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: t.text }]}>Live Chat</Text>
          </View>
          <WebView source={{ uri: settings.chat_link }} style={{ flex: 1 }} />
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (t: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  header: { paddingHorizontal: SPACING.lg, paddingTop: 35, paddingBottom: SPACING.xl },
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

