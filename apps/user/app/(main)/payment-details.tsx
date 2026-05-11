import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

const PURPLE = '#240080';
const TEXT_DARK = '#1A1A2E';
const TEXT_MUTED = '#64748B';
const SUCCESS = '#10B981';

export default function PaymentDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { profile } = useAuth();
  
  const paymentData = params.data ? JSON.parse(params.data as string) : null;
  const orderId = params.order_id;

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Berhasil', 'Nomor berhasil disalin ke clipboard');
  };

  if (!paymentData) return (
    <View style={styles.container}>
      <Text style={{ textAlign: 'center', marginTop: 100 }}>Data pembayaran tidak ditemukan.</Text>
    </View>
  );

  console.log('Payment Data Received:', paymentData);

  const { 
    payment_type, 
    va_numbers, 
    permata_va_number, 
    bill_key, 
    biller_code, 
    actions, 
    payment_code, 
    gross_amount,
    transaction_status
  } = paymentData;

  let code = '-';
  let label = 'Nomor Bayar';
  let qrUrl = '';

  // 1. Extract Payment Code/VA
  if (va_numbers && va_numbers.length > 0) {
    code = va_numbers[0].va_number;
    label = `Virtual Account ${va_numbers[0].bank.toUpperCase()}`;
  } else if (permata_va_number) {
    code = permata_va_number;
    label = 'Virtual Account PERMATA';
  } else if (bill_key && biller_code) {
    code = `${biller_code}${bill_key}`;
    label = 'Mandiri Bill Code';
  } else if (payment_type === 'gopay' || payment_type === 'qris') {
    qrUrl = actions?.find((a: any) => a.name === 'generate-qr-code')?.url;
    label = payment_type === 'gopay' ? 'GoPay / QRIS' : 'QRIS';
  } else if (payment_code) {
    code = payment_code;
    label = 'Kode Pembayaran';
  }

  // 2. Format Amount (Fix NaN)
  const displayAmount = gross_amount ? parseInt(gross_amount.toString().split('.')[0]) : 0;

  const checkStatus = async () => {
    if (!orderId) {
      router.replace('/(main)/history');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('payment_status, status')
        .eq('id', orderId)
        .single();

      if (error) throw error;

      if (data.payment_status === 'paid' || data.status !== 'pending') {
        if (data.status === 'accepted' || data.status === 'on_the_way' || data.status === 'arrived' || data.status === 'working') {
          // Jika sudah ada terapis & jalan, ke tracking
          router.replace({ pathname: '/(main)/tracking', params: { id: orderId } });
        } else {
          // Jika sudah bayar tapi masih menunggu terapis (pending)
          router.replace({ pathname: '/(main)/searching-therapist', params: { id: orderId } });
        }
      } else {
        Alert.alert('Belum Terdeteksi', 'Pembayaran Anda belum kami terima. Silakan tunggu sebentar atau selesaikan pembayaran Anda.');
      }
    } catch (error) {
      console.error('Error checking status:', error);
      router.replace('/(main)/history');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(main)/history')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Instruksi Pembayaran</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.paymentCard}>
          <Text style={styles.paymentMethodTitle}>{label}</Text>
          
          {qrUrl ? (
            <View style={styles.qrContainer}>
              <Image source={{ uri: qrUrl }} style={styles.qrImage} />
              <Text style={styles.qrHint}>Scan QR di atas menggunakan aplikasi pembayaran Anda</Text>
            </View>
          ) : (
            <View style={styles.codeRow}>
              <Text style={styles.paymentCode}>{code}</Text>
              <TouchableOpacity onPress={() => copyToClipboard(code)} style={styles.copyBtn}>
                <Ionicons name="copy-outline" size={18} color={PURPLE} />
                <Text style={{ color: PURPLE, fontWeight: '700' }}>Salin Kode</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.instrContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total Tagihan</Text>
              <Text style={styles.detailValue}>Rp {displayAmount.toLocaleString('id-ID')}</Text>
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
            style={styles.doneBtn} 
            onPress={checkStatus}
          >
            <Text style={styles.doneBtnText}>Sudah Bayar? Cek Status</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FE' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingTop: 60, 
    paddingBottom: 20,
    backgroundColor: 'white'
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: TEXT_DARK },
  scroll: { padding: 20 },
  
  paymentCard: { gap: 20 },
  paymentMethodTitle: { fontSize: 14, color: TEXT_MUTED, textAlign: 'center', fontWeight: '600' },
  codeRow: { backgroundColor: 'white', padding: 30, borderRadius: 24, alignItems: 'center', gap: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  paymentCode: { fontSize: 32, color: PURPLE, fontWeight: '800', letterSpacing: 2 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#F0E7FF', borderRadius: 12 },
  
  qrContainer: { alignItems: 'center', gap: 16, backgroundColor: '#FFFFFF', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#E2E8F0' },
  qrImage: { width: 260, height: 260 },
  qrHint: { fontSize: 12, color: TEXT_MUTED, textAlign: 'center' },
  
  instrContainer: { backgroundColor: 'white', padding: 20, borderRadius: 24, gap: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: 14, color: TEXT_MUTED },
  detailValue: { fontSize: 20, color: TEXT_DARK, fontWeight: '800' },
  divider: { height: 1, backgroundColor: '#E2E8F0' },
  stepTitle: { fontSize: 14, color: TEXT_DARK, fontWeight: '700', marginBottom: 4 },
  instrStep: { fontSize: 14, color: TEXT_MUTED, lineHeight: 22 },
  
  doneBtn: { 
    backgroundColor: PURPLE,
    paddingVertical: 18, 
    borderRadius: 16, 
    alignItems: 'center', 
    marginTop: 10,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4 
  },
  doneBtnText: { fontSize: 16, color: '#FFFFFF', fontWeight: '700' },
});
