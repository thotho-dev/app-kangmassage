import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useThemeColors } from '@/store/themeStore';


import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SPACING, TYPOGRAPHY } from '@/constants/Theme';
import { getAppSettings } from '@/lib/appSettings';

export default function TermsOfServiceScreen() {
  const t = useThemeColors();
  const styles = getStyles(t);
  
  const router = useRouter();
  const [platformName, setPlatformName] = useState('Kang Massage');

  useEffect(() => {
    getAppSettings().then(s => setPlatformName(s.platform_name));
  }, []);

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
          Selamat datang di {platformName}. Dengan mendaftar sebagai mitra terapis, Anda menyetujui syarat dan ketentuan yang ditetapkan di bawah ini. Harap baca dengan saksama.
          {'\n\n'}
          <Text style={styles.bold}>2. Kualifikasi Mitra Terapis</Text>{'\n'}
          Anda harus berusia minimal 18 tahun, memiliki identitas resmi (KTP), dan memiliki sertifikasi atau pengalaman yang memadai dalam bidang pijat atau relaksasi yang ditawarkan.
          {'\n\n'}
          <Text style={styles.bold}>3. Tanggung Jawab Mitra</Text>{'\n'}
          - Menyediakan layanan dengan profesional dan sopan.{'\n'}
          - Tiba di lokasi pelanggan tepat waktu.{'\n'}
          - Menjaga kerahasiaan informasi pelanggan.{'\n'}
          - Tidak melakukan tindakan yang melanggar hukum, etika, atau norma kesusilaan.{'\n'}
          - Dilarang keras melakukan tindak pidana, kejahatan, penipuan, pengancaman, kekerasan fisik, pelecehan seksual, tindakan asusila, atau perbuatan melanggar hukum lainnya.{'\n'}
          - Pelanggaran terhadap ketentuan di atas akan mengakibatkan pemutusan kemitraan permanen, penghapusan akun, dan pelaporan kepada pihak berwajib.
          {'\n\n'}
          <Text style={styles.bold}>4. Komisi dan Pembayaran</Text>{'\n'}
          Komisi platform bersifat dinamis berdasarkan tier mitra:{'\n'}
          - Bronze: 27%{'\n'}
          - Silver: 25%{'\n'}
          - Gold: 23%{'\n'}
          - Platinum: 21%{'\n'}
          - Diamond: 20%{'\n'}
          Semakin tinggi tier, semakin kecil potongan komisi. Selain itu, mitra yang berhasil memenuhi target pesanan dan pendapatan pada masa evaluasi akan mendapatkan Reward Target yang otomatis ditambahkan ke saldo wallet. Pembayaran bersih akan masuk ke dompet aplikasi dan dapat ditarik ke rekening bank yang terdaftar.
          {'\n\n'}
          <Text style={styles.bold}>5. Penangguhan & Pemutusan Akun</Text>{'\n'}
          {platformName} berhak menangguhkan, membekukan, atau menghapus akun Anda secara sepihak jika ditemukan pelanggaran terhadap syarat dan ketentuan ini, termasuk namun tidak terbatas pada: pelanggaran hukum pidana, tindakan asusila, kekerasan, penipuan, pelanggaran privasi, komplain serius dari pelanggan, atau pelanggaran berulang terhadap standar layanan.

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

