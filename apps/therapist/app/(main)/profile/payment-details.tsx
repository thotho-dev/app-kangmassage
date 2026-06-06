import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Clipboard } from 'react-native';
import { useThemeColors } from '@/store/themeStore';
import { useTherapistStore } from '@/store/therapistStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/constants/Theme';
import { useAlert } from '@/components/CustomAlert';
import QRCode from 'react-native-qrcode-svg';

export default function PaymentDetailsScreen() {
  const t = useThemeColors();
  const styles = getStyles(t);
  const router = useRouter();
  const params = useLocalSearchParams();
  const { showAlert, AlertComponent } = useAlert();

  const paymentData = params.data ? JSON.parse(params.data as string) : null;

  const copyToClipboard = (text: string) => {
    Clipboard.setString(text);
    showAlert('success', 'Berhasil', 'Nomor berhasil disalin ke clipboard');
  };

  if (!paymentData) return null;

  const { type, bank_code, va_number, retail_outlet_name, payment_code, qr_string, amount } = paymentData;
  let code = '';
  let label = 'Nomor Bayar';

  if (type === 'va') {
    code = va_number;
    label = `Virtual Account ${bank_code}`;
  } else if (type === 'retail') {
    code = payment_code;
    label = `Kode Bayar ${retail_outlet_name}`;
  }

  return (
    <View style={styles.container}>
      {AlertComponent}
      <View style={[styles.header, { backgroundColor: t.headerBg, borderBottomWidth: 1, borderBottomColor: t.border }]}>
        <TouchableOpacity onPress={() => router.replace('/profile/topup-history')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={t.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.text }]}>Instruksi Pembayaran</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.paymentCard}>
          <Text style={styles.paymentMethodTitle}>{label}</Text>

          {type === 'qris' && qr_string ? (
            <View style={styles.codeRow}>
              <QRCode value={qr_string} size={200} backgroundColor="white" />
              <TouchableOpacity onPress={() => copyToClipboard(qr_string)} style={styles.copyBtn}>
                <Ionicons name="copy-outline" size={20} color={t.secondary} />
                <Text style={{ color: t.secondary, fontWeight: 'bold' }}>Salin QR</Text>
              </TouchableOpacity>
            </View>
          ) : code ? (
            <View style={styles.codeRow}>
              <Text style={styles.paymentCode}>{code}</Text>
              <TouchableOpacity onPress={() => copyToClipboard(code)} style={styles.copyBtn}>
                <Ionicons name="copy-outline" size={20} color={t.secondary} />
                <Text style={{ color: t.secondary, fontWeight: 'bold' }}>Salin Kode</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.instrContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total Tagihan</Text>
              <Text style={styles.detailValue}>Rp {(amount || 0).toLocaleString('id-ID')}</Text>
            </View>
            <View style={styles.divider} />
            <Text style={styles.stepTitle}>Langkah Pembayaran:</Text>
            <Text style={styles.instrStep}>1. Buka aplikasi perbankan atau e-wallet Anda</Text>
            <Text style={styles.instrStep}>2. Pilih menu Bayar / Transfer</Text>
            <Text style={styles.instrStep}>3. Masukkan nomor/kode di atas</Text>
            <Text style={styles.instrStep}>4. Pastikan nominal pembayaran sesuai</Text>
            <Text style={styles.instrStep}>5. Selesaikan transaksi Anda</Text>
          </View>

          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: t.secondary }]}
            onPress={() => {
              useTherapistStore.getState().fetchProfile();
              router.push('/profile/topup-history');
            }}
          >
            <Text style={styles.doneBtnText}>Sudah Bayar? Cek Riwayat</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (t: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: 30, paddingBottom: SPACING.lg },
  backBtn: { padding: 4 },
  headerTitle: { ...TYPOGRAPHY.h4, fontFamily: 'Inter_700Bold' },
  scroll: { padding: SPACING.lg },

  paymentCard: { gap: SPACING.lg },
  paymentMethodTitle: { ...TYPOGRAPHY.label, color: t.textSecondary, textAlign: 'center', marginTop: 10 },
  codeRow: { backgroundColor: t.surface, padding: 30, borderRadius: RADIUS.xl, alignItems: 'center', gap: 16, borderWidth: 1, borderColor: t.border },
  paymentCode: { fontSize: 36, color: t.primary, fontFamily: 'Inter_700Bold', letterSpacing: 1.5 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: t.secondary + '10', borderRadius: RADIUS.md },
  qrLabel: { fontSize: 16, color: t.text, fontFamily: 'Inter_700Bold' },
  qrString: { fontSize: 12, color: t.textMuted, textAlign: 'center' },

  instrContainer: { backgroundColor: t.surface, padding: SPACING.lg, borderRadius: RADIUS.xl, gap: 12, borderWidth: 1, borderColor: t.border },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { ...TYPOGRAPHY.bodySmall, color: t.textMuted },
  detailValue: { ...TYPOGRAPHY.h3, color: t.text, fontFamily: 'Inter_700Bold' },
  divider: { height: 1, backgroundColor: t.border },
  stepTitle: { ...TYPOGRAPHY.bodySmall, color: t.text, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  instrStep: { ...TYPOGRAPHY.bodySmall, color: t.textSecondary, lineHeight: 20 },

  doneBtn: { paddingVertical: 18, borderRadius: RADIUS.full, alignItems: 'center', marginTop: SPACING.xl, shadowColor: t.secondary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  doneBtnText: { ...TYPOGRAPHY.h4, color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
});

