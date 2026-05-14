import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useThemeColors } from '@/store/themeStore';


import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SPACING, TYPOGRAPHY } from '@/constants/Theme';

export default function TermsOfServiceScreen() {
  const t = useThemeColors();
  const styles = getStyles(t);
  
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: t.headerBg, borderBottomWidth: 1, borderBottomColor: t.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={t.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: t.text }]}>Syarat & Ketentuan</Text>
        <Text style={[styles.subtitle, { color: t.textSecondary }]}>Berlaku sejak: 24 Mei 2026</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.content}>
          <Text style={styles.bold}>1. Pendahuluan</Text>{'\n'}
          Selamat datang di Kang Massage. Dengan mendaftar sebagai mitra terapis, Anda menyetujui syarat dan ketentuan yang ditetapkan di bawah ini. Harap baca dengan saksama.
          {'\n\n'}
          <Text style={styles.bold}>2. Kualifikasi Mitra Terapis</Text>{'\n'}
          Anda harus berusia minimal 18 tahun, memiliki identitas resmi (KTP), dan memiliki sertifikasi atau pengalaman yang memadai dalam bidang pijat atau relaksasi yang ditawarkan.
          {'\n\n'}
          <Text style={styles.bold}>3. Tanggung Jawab Mitra</Text>{'\n'}
          - Menyediakan layanan dengan profesional dan sopan.{'\n'}
          - Tiba di lokasi pelanggan tepat waktu.{'\n'}
          - Menjaga kerahasiaan informasi pelanggan.{'\n'}
          - Tidak melakukan tindakan yang melanggar hukum, etika, atau norma kesopanan.
          {'\n\n'}
          <Text style={styles.bold}>4. Komisi dan Pembayaran</Text>{'\n'}
          Kang Massage berhak memotong komisi sebesar 20% dari total nilai pesanan yang berhasil diselesaikan. Pembayaran bersih (80%) akan masuk ke dompet aplikasi dan dapat ditarik ke rekening bank yang terdaftar.
          {'\n\n'}
          <Text style={styles.bold}>5. Penangguhan Akun</Text>{'\n'}
          Kang Massage berhak menangguhkan atau menghapus akun Anda secara sepihak jika ditemukan pelanggaran terhadap syarat dan ketentuan ini, atau jika Anda menerima komplain serius dari pelanggan.
        </Text>
      </ScrollView>
    </View>
  );
}

const getStyles = (t: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  header: { paddingHorizontal: SPACING.lg, paddingTop: 35, paddingBottom: SPACING.xl },
  backBtn: { marginBottom: SPACING.md },
  title: { ...TYPOGRAPHY.h2, color: t.text, marginBottom: 4 },
  subtitle: { ...TYPOGRAPHY.caption, color: t.textSecondary },
  scroll: { padding: SPACING.lg, paddingBottom: 40 },
  content: { ...TYPOGRAPHY.bodySmall, color: t.textSecondary, lineHeight: 24 },
  bold: { color: t.text, fontFamily: 'Inter_700Bold' },
});

