import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Copy, CheckCircle, Clock, ArrowRight } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@/context/AuthContext';
import { useAlert } from '@/context/AlertContext';
import { supabase } from '@/lib/supabase';

const PURPLE = '#240080';
const GOLD = '#FDB927';
const SUCCESS = '#00A896';
const TEXT_DARK = '#1A1A2E';
const TEXT_MUTED = '#6B7280';
const BORDER = '#F0F0F0';
const BG = '#F8F8FB';

export default function TopupPaymentScreen() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const { profile, refreshProfile } = useAuth();
  const params = useLocalSearchParams();
  const [checking, setChecking] = useState(false);

  const paymentData = params.data ? JSON.parse(params.data as string) : null;

  if (!paymentData) return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: TEXT_MUTED, fontSize: 14 }}>Data pembayaran tidak ditemukan.</Text>
      </View>
    </SafeAreaView>
  );

  const { 
    payment_type, va_numbers, permata_va_number,
    bill_key, biller_code, actions, payment_code,
    gross_amount, transaction_id, order_id
  } = paymentData;

  let code = '-';
  let label = 'Nomor Bayar';
  let qrUrl = '';

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

  const displayAmount = gross_amount ? parseInt(gross_amount.toString().split('.')[0]) : 0;

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    showAlert('Berhasil', 'Nomor berhasil disalin ke clipboard');
  };

  const checkPaymentStatus = async () => {
    setChecking(true);
    try {
      const topupId = paymentData.topup_id || paymentData.order_id;
      if (!topupId) {
        await refreshProfile();
        showAlert('Berhasil', 'Saldo Anda telah diperbarui!');
        router.replace('/(main)/wallet');
        return;
      }

      const { data, error } = await supabase
        .from('user_topups')
        .select('status')
        .eq('id', topupId)
        .single();

      if (error) throw error;

      if (data?.status === 'paid' || data?.status === 'settlement') {
        await refreshProfile();
        showAlert('Berhasil', 'Top up berhasil! Saldo Anda telah ditambahkan.');
        router.replace('/(main)/wallet');
      } else {
        showAlert('Belum Terdeteksi', 'Pembayaran belum kami terima. Silakan tunggu atau selesaikan pembayaran.');
      }
    } catch (error) {
      console.error('Error checking topup status:', error);
      showAlert('Error', 'Gagal memeriksa status pembayaran.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(main)/wallet')} style={styles.backButton}>
          <ChevronLeft size={24} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Instruksi Pembayaran</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Status Badge */}
        <View style={styles.statusBadge}>
          <Clock size={14} color={GOLD} />
          <Text style={styles.statusText}>Menunggu Pembayaran</Text>
        </View>

        {/* Payment Method Label */}
        <Text style={styles.paymentMethodLabel}>{label}</Text>

        {/* QR or Code */}
        {qrUrl ? (
          <View style={styles.qrCard}>
            <Image source={{ uri: qrUrl }} style={styles.qrImage} />
            <Text style={styles.qrHint}>
              Scan QR di atas menggunakan aplikasi pembayaran Anda
            </Text>
          </View>
        ) : (
          <View style={styles.codeCard}>
            <Text style={styles.paymentCode}>{code}</Text>
            <TouchableOpacity onPress={() => copyToClipboard(code)} style={styles.copyBtn}>
              <Copy size={16} color={PURPLE} />
              <Text style={styles.copyBtnText}>Salin Kode</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Amount & Instructions */}
        <View style={styles.instrCard}>
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

        {/* Check Status Button */}
        <TouchableOpacity 
          style={styles.checkBtn} 
          onPress={checkPaymentStatus}
          disabled={checking}
          activeOpacity={0.85}
        >
          {checking ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <CheckCircle size={18} color="#FFFFFF" />
              <Text style={styles.checkBtnText}>Sudah Bayar? Cek Status</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Back to Wallet */}
        <TouchableOpacity 
          style={styles.backWalletBtn} 
          onPress={() => router.replace('/(main)/wallet')}
          activeOpacity={0.7}
        >
          <Text style={styles.backWalletBtnText}>Kembali ke Dompet</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12, paddingBottom: 15, paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18, fontFamily: 'Inter-Bold', color: TEXT_DARK,
  },
  scrollContent: { padding: 20, paddingBottom: 60 },

  // Status
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'center', backgroundColor: '#FFFBEB',
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, marginBottom: 16,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  statusText: {
    fontSize: 13, fontFamily: 'Inter-SemiBold', color: '#92400E',
  },
  paymentMethodLabel: {
    fontSize: 13, fontFamily: 'Inter-SemiBold',
    color: TEXT_MUTED, textAlign: 'center', marginBottom: 16,
  },

  // QR
  qrCard: {
    alignItems: 'center', gap: 16, backgroundColor: '#FFFFFF',
    padding: 24, borderRadius: 24,
    borderWidth: 1, borderColor: BORDER, marginBottom: 16,
  },
  qrImage: { width: 240, height: 240 },
  qrHint: {
    fontSize: 12, fontFamily: 'Inter-Medium',
    color: TEXT_MUTED, textAlign: 'center',
  },

  // Code
  codeCard: {
    backgroundColor: '#FFFFFF', padding: 28, borderRadius: 24,
    alignItems: 'center', gap: 16,
    borderWidth: 1, borderColor: BORDER, marginBottom: 16,
  },
  paymentCode: {
    fontSize: 28, fontFamily: 'Inter-Bold',
    color: PURPLE, letterSpacing: 2,
  },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: `${PURPLE}10`, borderRadius: 12,
  },
  copyBtnText: {
    fontSize: 13, fontFamily: 'Inter-Bold', color: PURPLE,
  },

  // Instructions
  instrCard: {
    backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20,
    gap: 12, borderWidth: 1, borderColor: BORDER, marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  detailLabel: { fontSize: 14, fontFamily: 'Inter-Medium', color: TEXT_MUTED },
  detailValue: { fontSize: 20, fontFamily: 'Inter-Bold', color: TEXT_DARK },
  divider: { height: 1, backgroundColor: BORDER },
  stepTitle: {
    fontSize: 14, fontFamily: 'Inter-Bold', color: TEXT_DARK, marginBottom: 4,
  },
  instrStep: {
    fontSize: 13, fontFamily: 'Inter-Medium', color: TEXT_MUTED, lineHeight: 22,
  },

  // Buttons
  checkBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: PURPLE, paddingVertical: 16,
    borderRadius: 16, marginBottom: 12,
    elevation: 4, shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8,
  },
  checkBtnText: {
    fontSize: 15, fontFamily: 'Inter-Bold', color: '#FFFFFF',
  },
  backWalletBtn: {
    alignItems: 'center', paddingVertical: 14,
    borderRadius: 16, borderWidth: 1.5,
    borderColor: BORDER,
  },
  backWalletBtnText: {
    fontSize: 14, fontFamily: 'Inter-SemiBold', color: TEXT_MUTED,
  },
});
