import { useState } from 'react';
import { useThemeColors } from '@/store/themeStore';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/constants/Theme';

const SECTIONS = [
  {
    title: 'Memulai Aplikasi',
    icon: 'rocket-outline',
    content: [
      'Unduh aplikasi Kang Massage Therapist dari Play Store atau App Store.',
      'Daftar menggunakan nomor telepon aktif dan lengkapi data diri.',
      'Tunggu verifikasi dari admin (maksimal 1x24 jam).',
      'Setelah terverifikasi, kamu bisa login dan mulai menerima pesanan.',
    ],
  },
  {
    title: 'Mengatur Status Online/Offline',
    icon: 'power-outline',
    content: [
      'Tekan tombol toggle di halaman Profil untuk mengubah status.',
      'Status Online: kamu akan menerima notifikasi pesanan baru.',
      'Status Offline: kamu tidak akan menerima pesanan.',
      'Saat logout, status otomatis berubah menjadi offline.',
    ],
  },
  {
    title: 'Menerima & Menolak Pesanan',
    icon: 'hand-left-outline',
    content: [
      'Saat ada pesanan masuk, akan muncul notifikasi dan modal.',
      'Kamu bisa memilih Terima atau Tolak dalam waktu terbatas.',
      'Terlalu sering menolak pesanan bisa mempengaruhi ratingmu.',
      'Terima pesanan hanya jika kamu yakin bisa datang tepat waktu.',
    ],
  },
  {
    title: 'Proses Pesanan',
    icon: 'checkmark-done-outline',
    content: [
      'Accepted → On The Way → In Progress → Completed',
      'Setelah menerima, segera menuju lokasi pelanggan.',
      'Tekan "On The Way" saat kamu sudah dalam perjalanan.',
      'Tekan "In Progress" saat kamu sudah sampai dan memulai pijat.',
      'Tekan "Completed" setelah selesai memberikan layanan.',
    ],
  },
  {
    title: 'Menarik Saldo (Withdraw)',
    icon: 'wallet-outline',
    content: [
      'Saldo otomatis masuk ke dompet setelah pesanan selesai.',
      'Minimal penarikan: Rp50.000',
      'Tambahkan rekening bank di menu Profil → Metode Pembayaran.',
      'Proses pencairan 1x24 jam kerja.',
    ],
  },
  {
    title: 'Sistem Komisi & Tier',
    icon: 'trending-up-outline',
    content: [
      'Komisi platform dipotong dari setiap transaksi berhasil.',
      'Semakin banyak pesanan, semakin tinggi tier kamu.',
      'Tier lebih tinggi = komisi lebih kecil = pendapatan lebih besar.',
      'Cek tier kamu di halaman Profil.',
    ],
  },
  {
    title: 'Rating & Ulasan',
    icon: 'star-outline',
    content: [
      'Pelanggan bisa memberi rating dan ulasan setelah sesi selesai.',
      'Rating bagus meningkatkan peluang mendapatkan pesanan.',
      'Jaga profesionalitas dan kebersihan untuk rating terbaik.',
      'Kamu bisa lihat ulasan di menu Profil → Ulasan Pelanggan.',
    ],
  },
  {
    title: 'Lokasi & Navigasi',
    icon: 'location-outline',
    content: [
      'Aktifkan GPS agar pelanggan bisa melihat posisi kamu.',
      'Lokasi kamu diperbarui secara real-time saat online.',
      'Gunakan Google Maps atau Waze untuk navigasi ke pelanggan.',
      'Pastikan lokasi rumahmu sudah benar di Profil → Kelola Alamat.',
    ],
  },
  {
    title: 'Pusat Bantuan',
    icon: 'help-circle-outline',
    content: [
      'FAQ: jawaban pertanyaan umum di menu Bantuan.',
      'WhatsApp Support: chat admin untuk respon cepat.',
      'Live Chat: chat langsung dengan admin (tersedia jam kerja).',
      'Email: untuk pengaduan formal dan dokumen.',
    ],
  },
  {
    title: 'Tips Sukses',
    icon: 'bulb-outline',
    content: [
      'Jaga kebersihan diri: mandi, gunakan seragam, bawa handuk bersih.',
      'Tepat waktu: datang 5-10 menit sebelum jam yang dijadwalkan.',
      'Komunikasikan dengan pelanggan jika ada kendala di jalan.',
      'Tingkatkan skill: ikuti pelatihan pijat untuk nilai lebih.',
      'Jaga kesehatan: istirahat cukup antara sesi pijat.',
    ],
  },
];

export default function GuideScreen() {
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
        <Text style={[styles.title, { color: t.text }]}>Panduan Terapis</Text>
        <Text style={[styles.subtitle, { color: t.textSecondary }]}>Semua yang perlu kamu tahu</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {SECTIONS.map((section, index) => {
          const isExpanded = expandedIndex === index;
          return (
            <TouchableOpacity
              key={index}
              style={[styles.card, isExpanded && styles.cardExpanded]}
              onPress={() => setExpandedIndex(isExpanded ? null : index)}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconWrap, { backgroundColor: t.secondary + '20' }]}>
                  <Ionicons name={section.icon as any} size={22} color={t.secondary} />
                </View>
                <Text style={styles.cardTitle}>{section.title}</Text>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={isExpanded ? t.secondary : t.textMuted}
                />
              </View>
              {isExpanded && (
                <View style={styles.contentWrap}>
                  {section.content.map((item, i) => (
                    <View key={i} style={styles.listItem}>
                      <View style={[styles.bullet, { backgroundColor: t.secondary }]} />
                      <Text style={styles.listText}>{item}</Text>
                    </View>
                  ))}
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
  card: { backgroundColor: t.surface, borderRadius: RADIUS.lg, marginBottom: SPACING.md, borderWidth: 1, borderColor: t.bordertext, overflow: 'hidden' },
  cardExpanded: { borderColor: t.secondary + '40' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg, gap: SPACING.md },
  iconWrap: { width: 40, height: 40, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { ...TYPOGRAPHY.body, color: t.text, fontFamily: 'Inter_700Bold', flex: 1 },
  contentWrap: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg },
  listItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  listText: { ...TYPOGRAPHY.bodySmall, color: t.textSecondary, flex: 1, lineHeight: 20 },
});
