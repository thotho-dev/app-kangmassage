import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useThemeColors } from '../../store/themeStore';


import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SPACING, TYPOGRAPHY } from '../../constants/Theme';

export default function PrivacyPolicyScreen() {
  const t = useThemeColors();
  const styles = getStyles(t);
  
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: t.headerBg, borderBottomWidth: 1, borderBottomColor: t.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={t.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: t.text }]}>Kebijakan Privasi</Text>
        <Text style={[styles.subtitle, { color: t.textSecondary }]}>Terakhir diperbarui: 24 Mei 2026</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.content}>
          PijatPro berkomitmen untuk melindungi privasi Anda. Kebijakan ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi informasi pribadi Anda sebagai mitra terapis.
          {'\n\n'}
          <Text style={styles.bold}>1. Informasi yang Kami Kumpulkan</Text>{'\n'}
          Kami mengumpulkan informasi yang Anda berikan secara langsung, seperti nama, nomor telepon, alamat email, foto profil, dan informasi rekening bank. Kami juga mengumpulkan data lokasi saat aplikasi sedang digunakan untuk keperluan pelacakan pesanan.
          {'\n\n'}
          <Text style={styles.bold}>2. Penggunaan Informasi</Text>{'\n'}
          Informasi Anda digunakan untuk memfasilitasi pesanan dengan pelanggan, memproses pembayaran, meningkatkan kualitas layanan, dan tujuan keamanan.
          {'\n\n'}
          <Text style={styles.bold}>3. Pembagian Informasi</Text>{'\n'}
          Kami membagikan sebagian informasi profil Anda (nama, foto, rating, dan lokasi saat menuju pelanggan) kepada pelanggan yang memesan layanan Anda. Kami tidak menjual data Anda kepada pihak ketiga.
          {'\n\n'}
          <Text style={styles.bold}>4. Keamanan Data</Text>{'\n'}
          Kami menerapkan langkah-selangkah keamanan teknis dan organisasi yang ketat untuk melindungi data Anda dari akses yang tidak sah, perubahan, atau penghancuran.
          {'\n\n'}
          <Text style={styles.bold}>5. Hak Anda</Text>{'\n'}
          Anda memiliki hak untuk mengakses, memperbaiki, atau menghapus informasi pribadi Anda dari sistem kami dengan menghubungi layanan dukungan.
        </Text>
      </ScrollView>
    </View>
  );
}

const getStyles = (t: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  header: { paddingHorizontal: SPACING.lg, paddingTop: 56, paddingBottom: SPACING.xl },
  backBtn: { marginBottom: SPACING.md },
  title: { ...TYPOGRAPHY.h2, color: t.text, marginBottom: 4 },
  subtitle: { ...TYPOGRAPHY.caption, color: t.textSecondary },
  scroll: { padding: SPACING.lg, paddingBottom: 40 },
  content: { ...TYPOGRAPHY.bodySmall, color: t.textSecondary, lineHeight: 24 },
  bold: { color: t.text, fontFamily: 'Inter_700Bold' },
});
