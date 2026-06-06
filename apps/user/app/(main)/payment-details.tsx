import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAlert } from '@/context/AlertContext';
import { supabase } from '@/lib/supabase';
import * as Clipboard from 'expo-clipboard';

const PURPLE = '#240080';
const TEXT_DARK = '#1A1A2E';
const TEXT_MUTED = '#64748B';

export default function PaymentDetailsScreen() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const params = useLocalSearchParams();

  const paymentData = params.data ? JSON.parse(params.data as string) : null;
  const orderId = params.order_id;
  const source = paymentData?.source || 'order';

  if (!paymentData) return (
    <View style={styles.container}>
      <Text style={{ textAlign: 'center', marginTop: 100 }}>Data pembayaran tidak ditemukan.</Text>
    </View>
  );

  const { type, bank_code, va_number, retail_outlet_name, payment_code, qr_string, amount, actions, external_id, payment_method } = paymentData;
  const nominal = amount ? parseInt(amount.toString().split('.')[0]) : 0;

  let code = '';
  let label = 'Nomor Bayar';

  if (type === 'va') {
    code = va_number;
    label = `Virtual Account ${bank_code}`;
  } else if (type === 'retail') {
    code = payment_code;
    label = `Kode Bayar ${retail_outlet_name}`;
  } else if (type === 'qris') {
    label = 'QRIS';
  }

  const ewalletUrl = actions?.mobile_web_checkout_url || actions?.deeplink_checkout_url;

  const copyCode = async (text: string) => {
    await Clipboard.setStringAsync(text);
    showAlert('Berhasil', 'Kode berhasil disalin ke clipboard');
  };

  const openEwallet = () => {
    if (ewalletUrl) {
      Linking.openURL(ewalletUrl);
    } else {
      showAlert('Gagal', 'URL pembayaran tidak tersedia');
    }
  };

  const checkStatus = async () => {
    if (source === 'topup') {
      if (!external_id) { router.replace('/topup-history'); return; }
      try {
        const { data, error } = await supabase
          .from('user_topups')
          .select('status')
          .eq('external_id', external_id)
          .single();
        if (error) throw error;
        if (data.status === 'completed') {
          showAlert('Berhasil', 'Top up Anda telah dikonfirmasi!');
          router.replace('/topup-history');
        } else {
          showAlert('Belum Terdeteksi', 'Pembayaran Anda belum kami terima.');
        }
      } catch {
        router.replace('/topup-history');
      }
      return;
    }

    if (!orderId) { router.replace('/history'); return; }
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('payment_status, status')
        .eq('id', orderId)
        .single();
      if (error) throw error;
      if (data.payment_status === 'paid' || data.status !== 'pending') {
        if (data.status === 'accepted' || data.status === 'on_the_way' || data.status === 'arrived' || data.status === 'in_progress') {
          router.replace({ pathname: '/tracking', params: { id: orderId } });
        } else {
          const { data: fullOrder } = await supabase.from('orders').select('therapist_id').eq('id', orderId).single();
          if (fullOrder?.therapist_id) {
            router.replace({ pathname: '/tracking', params: { id: orderId } });
          } else {
            router.replace({ pathname: '/searching-therapist', params: { id: orderId } });
          }
        }
      } else {
        showAlert('Belum Terdeteksi', 'Pembayaran Anda belum kami terima.');
      }
    } catch {
      router.replace('/history');
    }
  };

  const goBack = () => {
    router.replace(source === 'topup' ? '/topup-history' : '/history');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Instruksi Pembayaran</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.paymentCard}>
          {type === 'ewallet' ? (
            <>
              <View style={styles.iconBox}>
                <Ionicons name="phone-portrait-outline" size={40} color={PURPLE} />
              </View>
              <Text style={styles.title}>{payment_method?.toUpperCase()} Payment</Text>
              <Text style={styles.desc}>
                Ketuk tombol di bawah untuk membuka aplikasi pembayaran.
              </Text>

              <View style={styles.amountBox}>
                <Text style={styles.amountLabel}>Total Tagihan</Text>
                <Text style={styles.amountValue}>Rp {nominal.toLocaleString('id-ID')}</Text>
              </View>

              <TouchableOpacity style={styles.payBtn} onPress={openEwallet}>
                <Ionicons name="open-outline" size={20} color="#FFFFFF" />
                <Text style={styles.payBtnText}>Bayar Sekarang</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.iconBox}>
                <Ionicons name={type === 'qris' ? 'qr-code-outline' : 'card-outline'} size={40} color={PURPLE} />
              </View>
              <Text style={styles.title}>{label}</Text>
              <Text style={styles.desc}>
                {type === 'qris' ? 'Scan QRIS di bawah menggunakan aplikasi pembayaran.' : 'Gunakan kode di bawah untuk melakukan pembayaran.'}
              </Text>

              {type === 'qris' && qr_string ? (
                <View style={styles.qrisBox}>
                  <Image source={{ uri: qr_string }} style={styles.qrImage} resizeMode="contain" />
                  <TouchableOpacity onPress={() => copyCode(qr_string)} style={styles.copyBtn}>
                    <Ionicons name="copy-outline" size={18} color={PURPLE} />
                    <Text style={styles.copyBtnText}>Salin QR</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.codeBox}>
                  <Text style={styles.paymentCode}>{code}</Text>
                  {code ? (
                    <TouchableOpacity onPress={() => copyCode(code)} style={styles.copyBtn}>
                      <Ionicons name="copy-outline" size={18} color={PURPLE} />
                      <Text style={styles.copyBtnText}>Salin Kode</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}

              <View style={styles.amountBox}>
                <Text style={styles.amountLabel}>Total Tagihan</Text>
                <Text style={styles.amountValue}>Rp {nominal.toLocaleString('id-ID')}</Text>
              </View>
            </>
          )}

          <View style={styles.instrContainer}>
            <Text style={styles.stepTitle}>Langkah Pembayaran:</Text>
            <Text style={styles.instrStep}>1. Buka aplikasi perbankan atau e-wallet Anda</Text>
            <Text style={styles.instrStep}>2. Pilih menu Bayar / Transfer</Text>
            <Text style={styles.instrStep}>3. Masukkan nomor atau scan kode di atas</Text>
            <Text style={styles.instrStep}>4. Pastikan nominal pembayaran sesuai</Text>
            <Text style={styles.instrStep}>5. Kembali dan ketuk "Cek Status"</Text>
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
  desc: { fontSize: 14, color: TEXT_MUTED, textAlign: 'center', lineHeight: 20 },

  codeBox: {
    backgroundColor: '#FFFFFF', padding: 24, borderRadius: 20,
    borderWidth: 1, borderColor: '#E2E8F0', width: '100%',
    alignItems: 'center', gap: 16,
  },
  paymentCode: { fontSize: 28, fontWeight: '800', color: TEXT_DARK, letterSpacing: 1.5, textAlign: 'center' },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 16,
    backgroundColor: `${PURPLE}10`, borderRadius: 12,
  },
  copyBtnText: { fontSize: 13, fontWeight: '600', color: PURPLE },

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

  qrisBox: {
    backgroundColor: '#FFFFFF', padding: 24, borderRadius: 20,
    borderWidth: 1, borderColor: '#E2E8F0', width: '100%',
    alignItems: 'center', gap: 16,
  },
  qrImage: { width: 200, height: 200 },
  doneBtn: {
    backgroundColor: PURPLE, paddingVertical: 18,
    borderRadius: 16, alignItems: 'center', width: '100%',
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  doneBtnText: { fontSize: 14, color: '#FFFFFF', fontWeight: '700' },
});
