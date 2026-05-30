import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAlert } from '@/context/AlertContext';
import { supabase } from '@/lib/supabase';

const PURPLE = '#240080';
const TEXT_DARK = '#1A1A2E';
const TEXT_MUTED = '#64748B';

export default function PaymentDetailsScreen() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const params = useLocalSearchParams();

  const paymentData = params.data ? JSON.parse(params.data as string) : null;
  const orderId = params.order_id;

  if (!paymentData) return (
    <View style={styles.container}>
      <Text style={{ textAlign: 'center', marginTop: 100 }}>Data pembayaran tidak ditemukan.</Text>
    </View>
  );

  const { invoice_url, amount, order_id } = paymentData;
  const invoiceAmount = amount ? parseInt(amount.toString().split('.')[0]) : 0;
  // Prioritize UUID from navigation params — paymentData.order_id may contain order_number (string)
  const dbOrderId = (orderId as string) || order_id;

  const openPaymentUrl = () => {
    if (invoice_url) {
      Linking.openURL(invoice_url);
    } else {
      showAlert('Tautan Tidak Tersedia', 'Tautan pembayaran tidak ditemukan.');
    }
  };

  const checkStatus = async () => {
    if (!dbOrderId) {
      router.replace('/(main)/history');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('payment_status, status')
        .eq('id', dbOrderId)
        .single();

      if (error) throw error;

      if (data.payment_status === 'paid' || data.status !== 'pending') {
        if (data.status === 'accepted' || data.status === 'on_the_way' || data.status === 'arrived' || data.status === 'in_progress') {
          router.replace({ pathname: '/(main)/tracking', params: { id: dbOrderId } });
        } else {
          const { data: fullOrder } = await supabase.from('orders').select('therapist_id').eq('id', dbOrderId).single();

          if (fullOrder?.therapist_id) {
            router.replace({ pathname: '/(main)/tracking', params: { id: dbOrderId } });
          } else {
            router.replace({ pathname: '/(main)/searching-therapist', params: { id: dbOrderId } });
          }
        }
      } else {
        showAlert('Belum Terdeteksi', 'Pembayaran Anda belum kami terima. Silakan selesaikan pembayaran Anda.');
      }
    } catch (error) {
      console.error('Error checking status:', error);
      router.replace('/(main)/history');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(main)/history')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Instruksi Pembayaran</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.paymentCard}>
          <View style={styles.iconBox}>
            <Ionicons name="card-outline" size={40} color={PURPLE} />
          </View>
          <Text style={styles.title}>Pembayaran</Text>
          <Text style={styles.desc}>
            Ketuk tombol di bawah untuk membuka halaman pembayaran aman.
          </Text>

          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>Total Tagihan</Text>
            <Text style={styles.amountValue}>Rp {invoiceAmount.toLocaleString('id-ID')}</Text>
          </View>

          <TouchableOpacity style={styles.payBtn} onPress={openPaymentUrl}>
            <Ionicons name="open-outline" size={20} color="#FFFFFF" />
            <Text style={styles.payBtnText}>Bayar Sekarang</Text>
          </TouchableOpacity>

          <View style={styles.instrContainer}>
            <Text style={styles.stepTitle}>Langkah Pembayaran:</Text>
            <Text style={styles.instrStep}>1. Ketuk tombol "Bayar Sekarang" di atas</Text>
            <Text style={styles.instrStep}>2. Pilih metode pembayaran (VA, QRIS, E-Wallet)</Text>
            <Text style={styles.instrStep}>3. Selesaikan transaksi Anda</Text>
            <Text style={styles.instrStep}>4. Kembali dan ketuk "Cek Status"</Text>
          </View>

          <TouchableOpacity style={styles.doneBtn} onPress={checkStatus}>
            <Text style={styles.doneBtnText}>Sudah Bayar? Cek Status</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FE' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: 'white'
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: TEXT_DARK },
  scroll: { padding: 20 },

  paymentCard: { gap: 20, alignItems: 'center' },
  iconBox: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: `${PURPLE}10`,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '700', color: TEXT_DARK },
  desc: {
    fontSize: 14, color: TEXT_MUTED, textAlign: 'center', lineHeight: 20,
  },
  amountBox: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', width: '100%',
    backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  amountLabel: { fontSize: 14, color: TEXT_MUTED },
  amountValue: { fontSize: 22, fontWeight: '800', color: TEXT_DARK },
  payBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: PURPLE, paddingVertical: 18,
    borderRadius: 16, width: '100%',
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  payBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  instrContainer: {
    backgroundColor: 'white', padding: 20, borderRadius: 24,
    gap: 12, borderWidth: 1, borderColor: '#E2E8F0', width: '100%',
  },
  stepTitle: { fontSize: 14, fontWeight: '700', color: TEXT_DARK, marginBottom: 4 },
  instrStep: { fontSize: 14, color: TEXT_MUTED, lineHeight: 22 },

  doneBtn: {
    backgroundColor: PURPLE, paddingVertical: 18,
    borderRadius: 16, alignItems: 'center', width: '100%',
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  doneBtnText: { fontSize: 14, color: '#FFFFFF', fontWeight: '700' },
});
