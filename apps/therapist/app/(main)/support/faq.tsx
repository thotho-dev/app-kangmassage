import { useState } from 'react';
import { useThemeColors } from '@/store/themeStore';


import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/constants/Theme';

const FAQS = [
  { q: 'Bagaimana cara menarik saldo (withdraw)?', a: 'Pencairan saldo dapat dilakukan melalui menu Pendapatan. Pastikan Anda telah menambahkan rekening bank yang valid. Proses penarikan biasanya memakan waktu 1x24 jam kerja.' },
  { q: 'Mengapa akun saya ditangguhkan?', a: 'Penangguhan akun biasanya terjadi karena pelanggaran Syarat & Ketentuan, seperti membatalkan pesanan terlalu sering atau menerima banyak ulasan buruk. Hubungi Support untuk informasi lebih lanjut.' },
  { q: 'Bagaimana sistem komisi bekerja?', a: 'Platform PijatPro mengambil komisi sebesar 20% dari setiap transaksi yang berhasil. Sisa 80% akan masuk ke saldo dompet Anda.' },
  { q: 'Apakah saya bisa memilih pesanan?', a: 'Ya, Anda memiliki opsi untuk menerima atau menolak pesanan yang masuk. Namun, menolak pesanan terlalu sering dapat mempengaruhi performa dan rating Anda di sistem.' },
  { q: 'Bagaimana cara mengubah layanan yang saya tawarkan?', a: 'Saat ini, perubahan jenis layanan harus melalui proses verifikasi. Silakan hubungi tim Support kami dengan melampirkan sertifikat keahlian baru Anda.' },
];

export default function FAQScreen() {
  const t = useThemeColors();
  const styles = getStyles(t);
  
  const router = useRouter();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: t.headerBg, borderBottomWidth: 1, borderBottomColor: t.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={t.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: t.text }]}>FAQ</Text>
        <Text style={[styles.subtitle, { color: t.textSecondary }]}>Pertanyaan yang sering diajukan</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {FAQS.map((faq, index) => {
          const isExpanded = expandedIndex === index;
          return (
            <TouchableOpacity 
              key={index} 
              style={[styles.faqCard, isExpanded && styles.faqCardExpanded]} 
              onPress={() => setExpandedIndex(isExpanded ? null : index)}
              activeOpacity={0.8}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.question}>{faq.q}</Text>
                <Ionicons 
                  name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                  size={20} 
                  color={isExpanded ?t.text :t.textMuted} 
                />
              </View>
              {isExpanded && (
                <View style={styles.answerWrap}>
                  <View style={styles.divider} />
                  <Text style={styles.answer}>{faq.a}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const getStyles = (t: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  header: { paddingHorizontal: SPACING.lg, paddingTop: 35, paddingBottom: SPACING.xl },
  backBtn: { marginBottom: SPACING.md },
  title: { ...TYPOGRAPHY.h2, color: t.text, marginBottom: 4 },
  subtitle: { ...TYPOGRAPHY.bodySmall, color: t.textSecondary },
  scroll: { padding: SPACING.lg, paddingBottom: 40 },
  faqCard: { backgroundColor: t.surface, borderRadius: RADIUS.lg, marginBottom: SPACING.md, borderWidth: 1, borderColor: t.bordertext, overflow: 'hidden' },
  faqCardExpanded: { borderColor: t.border + '50' },
  faqHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg },
  question: { ...TYPOGRAPHY.body, color: t.text, fontFamily: 'Inter_700Bold', flex: 1, paddingRight: SPACING.md },
  answerWrap: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg },
  divider: { height: 1, backgroundColor: t.surface, marginBottom: SPACING.md },
  answer: { ...TYPOGRAPHY.bodySmall, color: t.textSecondary, lineHeight: 22 },
});

