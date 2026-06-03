import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, CheckCircle, Clock, ExternalLink } from 'lucide-react-native';
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
    invoice_url,
    id: xendit_invoice_id,
    external_id,
    amount,
    status,
    topup_id,
  } = paymentData;

  const invoiceAmount = amount ? parseInt(amount.toString().split('.')[0]) : 0;
  const topupDbId = topup_id || paymentData.topup_id;

  const openPaymentUrl = () => {
    if (invoice_url) {
      Linking.openURL(invoice_url);
    } else {
      showAlert('Tautan Tidak Tersedia', 'Tautan pembayaran tidak ditemukan.');
    }
  };

  const checkPaymentStatus = async () => {
    setChecking(true);
    try {
      if (!topupDbId) {
        await refreshProfile();
        showAlert('Berhasil', 'Saldo Anda telah diperbarui!');
        router.replace('/wallet');
        return;
      }

      const { data, error } = await supabase
        .from('user_topups')
        .select('status')
        .eq('id', topupDbId)
        .single();

      if (error) throw error;

      if (data?.status === 'paid') {
        await refreshProfile();
        showAlert('Berhasil', 'Top up berhasil! Saldo Anda telah ditambahkan.');
        router.replace('/wallet');
      } else {
        showAlert('Belum Terdeteksi', 'Pembayaran belum kami terima. Silakan selesaikan pembayaran terlebih dahulu.');
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

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/wallet')} style={styles.backButton}>
          <ChevronLeft size={24} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Instruksi Pembayaran</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        <View style={styles.statusBadge}>
          <Clock size={14} color={GOLD} />
          <Text style={styles.statusText}>Menunggu Pembayaran</Text>
        </View>

        <Text style={styles.paymentMethodLabel}>Pembayaran</Text>

        {/* Pay Now Button */}
        <View style={styles.invoiceCard}>
          <View style={styles.invoiceIconBox}>
            <ExternalLink size={32} color={PURPLE} />
          </View>
          <Text style={styles.invoiceTitle}>Selesaikan Pembayaran</Text>
          <Text style={styles.invoiceDesc}>
            Ketuk tombol di bawah untuk membuka halaman pembayaran aman.
          </Text>

          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Jumlah yang Diterima</Text>
            <Text style={styles.amountValue}>Rp {invoiceAmount.toLocaleString('id-ID')}</Text>
          </View>

          <TouchableOpacity
            style={styles.payNowBtn}
            onPress={openPaymentUrl}
            activeOpacity={0.85}
          >
            <ExternalLink size={18} color="#FFFFFF" />
            <Text style={styles.payNowBtnText}>Bayar Sekarang</Text>
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={styles.instrCard}>
          <Text style={styles.stepTitle}>Langkah Pembayaran:</Text>
          <Text style={styles.instrStep}>1. Ketuk tombol "Bayar Sekarang" di atas</Text>
          <Text style={styles.instrStep}>2. Pilih metode pembayaran Anda (VA, QRIS, E-Wallet, Retail)</Text>
          <Text style={styles.instrStep}>3. Selesaikan transaksi di halaman Xendit</Text>
          <Text style={styles.instrStep}>4. Kembali ke aplikasi dan ketuk "Cek Status"</Text>
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

        <TouchableOpacity
          style={styles.backWalletBtn}
          onPress={() => router.replace('/wallet')}
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
    fontSize: 18, fontFamily: 'PlusJakartaSans-Bold', color: TEXT_DARK,
  },
  scrollContent: { padding: 20, paddingBottom: 60 },

  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'center', backgroundColor: '#FFFBEB',
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, marginBottom: 16,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  statusText: {
    fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold', color: '#92400E',
  },
  paymentMethodLabel: {
    fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold',
    color: TEXT_MUTED, textAlign: 'center', marginBottom: 16,
  },

  invoiceCard: {
    backgroundColor: '#FFFFFF', padding: 24, borderRadius: 24,
    alignItems: 'center', gap: 16,
    borderWidth: 1, borderColor: BORDER, marginBottom: 16,
  },
  invoiceIconBox: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: `${PURPLE}10`,
    alignItems: 'center', justifyContent: 'center',
  },
  invoiceTitle: {
    fontSize: 18, fontFamily: 'PlusJakartaSans-Bold', color: TEXT_DARK,
  },
  invoiceDesc: {
    fontSize: 13, fontFamily: 'PlusJakartaSans-Medium',
    color: TEXT_MUTED, textAlign: 'center', lineHeight: 20,
  },
  amountRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', width: '100%',
    backgroundColor: BG, padding: 16, borderRadius: 16,
  },
  amountLabel: {
    fontSize: 14, fontFamily: 'PlusJakartaSans-Medium', color: TEXT_MUTED,
  },
  amountValue: {
    fontSize: 20, fontFamily: 'PlusJakartaSans-Bold', color: TEXT_DARK,
  },
  payNowBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: PURPLE, paddingVertical: 16,
    borderRadius: 16, width: '100%',
    elevation: 4, shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8,
  },
  payNowBtnText: {
    fontSize: 14, fontFamily: 'PlusJakartaSans-Bold', color: '#FFFFFF',
  },

  instrCard: {
    backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20,
    gap: 12, borderWidth: 1, borderColor: BORDER, marginBottom: 20,
  },
  stepTitle: {
    fontSize: 14, fontFamily: 'PlusJakartaSans-Bold', color: TEXT_DARK, marginBottom: 4,
  },
  instrStep: {
    fontSize: 13, fontFamily: 'PlusJakartaSans-Medium', color: TEXT_MUTED, lineHeight: 22,
  },

  checkBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: PURPLE, paddingVertical: 16,
    borderRadius: 16, marginBottom: 12,
    elevation: 4, shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8,
  },
  checkBtnText: {
    fontSize: 15, fontFamily: 'PlusJakartaSans-Bold', color: '#FFFFFF',
  },
  backWalletBtn: {
    alignItems: 'center', paddingVertical: 14,
    borderRadius: 16, borderWidth: 1.5, borderColor: BORDER,
  },
  backWalletBtnText: {
    fontSize: 14, fontFamily: 'PlusJakartaSans-SemiBold', color: TEXT_MUTED,
  },
});
