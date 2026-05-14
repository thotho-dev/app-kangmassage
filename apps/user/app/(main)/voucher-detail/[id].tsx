import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Share, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { useAuth } from '@/context/AuthContext';
import { useLocation } from '@/context/LocationContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Skeleton } from '@/components/ui/Skeleton';

export default function VoucherDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [voucher, setVoucher] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const { address } = useLocation();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (id) {
      fetchVoucherDetail();
    }
  }, [id]);

  const fetchVoucherDetail = async () => {
    try {
      const { data, error } = await supabase
        .from('vouchers')
        .select('*, service:services(name)')
        .eq('id', id)
        .single();

      if (!error && data) {
        setVoucher(data);
      }
    } catch (err) {
      console.error('Error fetching voucher detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Gunakan kode voucher "${voucher.code}" untuk mendapatkan diskon di Kang Massage! Download aplikasinya sekarang.`,
      });
    } catch (error) {
      console.log(error);
    }
  };

  const checkVoucherValidity = () => {
    if (!voucher) return { valid: false, reason: '' };

    // 1. New User Check
    if (voucher.category === 'new_user') {
      const orderCount = profile?.total_orders || 0;
      if (orderCount > 0) {
        return { valid: false, reason: 'Khusus pesanan pertama' };
      }
    }

    // 2. Repeat Order Check
    if (voucher.category === 'repeat_order') {
      const orderCount = profile?.total_orders || 0;
      if (orderCount < (voucher.min_order_count || 0)) {
        return { valid: false, reason: `Min. ${voucher.min_order_count} pesanan` };
      }
    }
    
    // 3. Area Validation
    if (voucher.category === 'location' && voucher.area_names && voucher.area_names.length > 0) {
      if (!address) return { valid: false, reason: 'Lokasi tidak terdeteksi' };
      
      const addressLower = address.toLowerCase();
      const isCovered = voucher.area_names.some((areaName: string) => {
        const target = areaName.includes(' - ') ? areaName.split(' - ')[1] : areaName;
        const cleanTarget = target.toLowerCase()
          .replace(/kota\s+/g, '')
          .replace(/kabupaten\s+/g, '')
          .replace(/adm\.\s+/g, '')
          .replace(/jakarta\s+/g, 'jakarta ')
          .trim();
        return addressLower.includes(cleanTarget);
      });

      if (!isCovered) {
        return { valid: false, reason: 'Wilayah tidak sesuai' };
      }
    }

    // 4. Happy Hour Validation
    if (voucher.category === 'happy_hour' && voucher.start_time && voucher.end_time) {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      
      const [startH, startM] = voucher.start_time.split(':').map(Number);
      const [endH, endM] = voucher.end_time.split(':').map(Number);
      const startTime = startH * 60 + startM;
      const endTime = endH * 60 + endM;

      if (currentTime < startTime || currentTime > endTime) {
        return { valid: false, reason: 'Belum waktunya' };
      }
    }

    return { valid: true, reason: '' };
  };

  const { valid, reason } = checkVoucherValidity();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Skeleton width={40} height={40} borderRadius={12} />
          <Skeleton width={120} height={20} borderRadius={4} />
          <Skeleton width={40} height={40} borderRadius={12} />
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Skeleton width="100%" height={180} borderRadius={24} style={{ marginBottom: 25 }} />
          <View style={styles.section}>
            <Skeleton width={80} height={16} borderRadius={4} style={{ marginBottom: 15 }} />
            <Skeleton width="100%" height={60} borderRadius={8} />
          </View>
          <View style={styles.section}>
            <Skeleton width={120} height={16} borderRadius={4} style={{ marginBottom: 20 }} />
            {[1, 2, 3].map(i => (
              <View key={i} style={{ flexDirection: 'row', marginBottom: 18 }}>
                <Skeleton width={36} height={36} borderRadius={10} style={{ marginRight: 15 }} />
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <Skeleton width="40%" height={10} borderRadius={2} style={{ marginBottom: 6 }} />
                  <Skeleton width="70%" height={14} borderRadius={4} />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!voucher) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Voucher tidak ditemukan</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Voucher</Text>
        <TouchableOpacity onPress={handleShare} style={styles.iconButton}>
          <Ionicons name="share-social-outline" size={24} color="#1A1A2E" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Voucher Card Header */}
        <View style={styles.card}>
          <Image 
            source={{ uri: voucher.image_url || 'https://images.unsplash.com/photo-1544161515-4af6b1d462c2?q=80&w=500' }} 
            style={styles.voucherImage}
            resizeMode="cover"
          />
          <View style={styles.cardOverlay}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{voucher.is_cashback ? 'CASHBACK' : voucher.category.replace('_', ' ').toUpperCase()}</Text>
            </View>
            <Text style={styles.voucherValue}>
              {voucher.is_cashback ? 'CASHBACK ' : ''}
              {voucher.type === 'percentage' ? `${voucher.value}%` : `Rp ${voucher.value.toLocaleString('id-ID')}`}
            </Text>
            <Text style={styles.voucherCode}>{voucher.code}</Text>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deskripsi</Text>
          <Text style={styles.descriptionText}>
            {voucher.description || (voucher.is_cashback 
              ? `Dapatkan cashback saldo senilai ${voucher.type === 'percentage' ? voucher.value + '%' : 'Rp ' + voucher.value.toLocaleString('id-ID')} yang akan masuk ke dompet Anda setelah pesanan selesai.`
              : 'Gunakan voucher ini untuk mendapatkan potongan harga spesial pada setiap pemesanan layanan Kang Massage.')}
          </Text>
        </View>

        {/* Requirements Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Syarat & Ketentuan</Text>
          
          <View style={styles.requirementRow}>
            <View style={styles.reqIcon}>
              <MaterialCommunityIcons name="calendar-clock" size={20} color="#5B2A86" />
            </View>
            <View style={styles.reqInfo}>
              <Text style={styles.reqLabel}>Masa Berlaku</Text>
              <Text style={styles.reqValue}>
                {format(new Date(voucher.valid_from), 'd MMM', { locale: localeId })} - {format(new Date(voucher.valid_until), 'd MMM yyyy', { locale: localeId })}
              </Text>
            </View>
          </View>

          <View style={styles.requirementRow}>
            <View style={styles.reqIcon}>
              <MaterialCommunityIcons name="cash-multiple" size={20} color="#5B2A86" />
            </View>
            <View style={styles.reqInfo}>
              <Text style={styles.reqLabel}>Minimal Transaksi</Text>
              <Text style={styles.reqValue}>Rp {voucher.min_order_amount.toLocaleString('id-ID')}</Text>
            </View>
          </View>

          {voucher.max_discount && (
            <View style={styles.requirementRow}>
              <View style={styles.reqIcon}>
                <MaterialCommunityIcons name="arrow-collapse-down" size={20} color="#5B2A86" />
              </View>
              <View style={styles.reqInfo}>
                <Text style={styles.reqLabel}>{voucher.is_cashback ? 'Maksimal Cashback' : 'Maksimal Potongan'}</Text>
                <Text style={styles.reqValue}>Rp {voucher.max_discount.toLocaleString('id-ID')}</Text>
              </View>
            </View>
          )}

          {voucher.start_time && voucher.end_time && (
            <View style={styles.requirementRow}>
              <View style={styles.reqIcon}>
                <MaterialCommunityIcons name="clock-outline" size={20} color="#fb923c" />
              </View>
              <View style={styles.reqInfo}>
                <Text style={styles.reqLabel}>Jam Operasional (Happy Hour)</Text>
                <Text style={styles.reqValue}>{voucher.start_time.substring(0, 5)} - {voucher.end_time.substring(0, 5)} WIB</Text>
              </View>
            </View>
          )}

          {voucher.area_names && voucher.area_names.length > 0 && (
            <View style={styles.requirementRow}>
              <View style={styles.reqIcon}>
                <MaterialCommunityIcons name="map-marker-radius" size={20} color="#22c55e" />
              </View>
              <View style={styles.reqInfo}>
                <Text style={styles.reqLabel}>Berlaku di Wilayah</Text>
                <View style={styles.areaContainer}>
                  {voucher.area_names.map((area: string) => (
                    <View key={area} style={styles.areaBadge}>
                      <Text style={styles.areaText}>{area}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {voucher.service && (
            <View style={styles.requirementRow}>
              <View style={styles.reqIcon}>
                <MaterialCommunityIcons name="spa-outline" size={20} color="#5B2A86" />
              </View>
              <View style={styles.reqInfo}>
                <Text style={styles.reqLabel}>Khusus Layanan</Text>
                <Text style={styles.reqValue}>{voucher.service.name}</Text>
              </View>
            </View>
          )}

          {voucher.category === 'new_user' && (
            <View style={styles.requirementRow}>
              <View style={styles.reqIcon}>
                <MaterialCommunityIcons name="account-plus-outline" size={20} color="#f97316" />
              </View>
              <View style={styles.reqInfo}>
                <Text style={styles.reqLabel}>Kriteria Pengguna</Text>
                <Text style={styles.reqValue}>Hanya berlaku untuk pesanan pertama Anda</Text>
              </View>
            </View>
          )}
        </View>

          <Ionicons name="information-circle-outline" size={16} color="#94a3b8" />
          <Text style={styles.footerInfoText}>
            {voucher.is_cashback 
              ? 'Cashback akan otomatis masuk ke saldo dompet Anda setelah status pesanan dinyatakan Selesai.' 
              : 'Voucher akan otomatis terpotong saat melakukan pembayaran jika syarat terpenuhi.'}
          </Text>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity 
          style={[styles.useButton, !valid && { backgroundColor: '#E5E7EB', shadowOpacity: 0 }]}
          disabled={!valid}
          onPress={() => router.replace({ pathname: '/(main)/order', params: { initialVoucherCode: voucher.code } })}
        >
          <Text style={[styles.useButtonText, !valid && { color: '#94a3b8' }]}>
            {valid ? 'Gunakan Voucher Sekarang' : reason}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#1A1A2E',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#5B2A86',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#fff',
    fontFamily: 'Inter-Bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    color: '#1A1A2E',
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    flex: 1,
    textAlign: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  card: {
    height: 180,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 25,
    backgroundColor: '#5B2A86',
    elevation: 8,
    shadowColor: '#5B2A86',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  voucherImage: {
    width: '100%',
    height: '100%',
    opacity: 0.4,
  } as any,
  cardOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  tagText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Inter-Bold',
  },
  voucherValue: {
    color: '#fff',
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
  },
  voucherCode: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    letterSpacing: 2,
    marginTop: 5,
    opacity: 0.8,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    color: '#1A1A2E',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 15,
  },
  descriptionText: {
    color: '#6B7280',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
  },
  requirementRow: {
    flexDirection: 'row',
    marginBottom: 18,
    alignItems: 'flex-start',
  },
  reqIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  reqInfo: {
    flex: 1,
  },
  reqLabel: {
    color: '#6B7280',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginBottom: 2,
  },
  reqValue: {
    color: '#1A1A2E',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  areaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 5,
  },
  areaBadge: {
    backgroundColor: 'rgba(34,197,94,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
  },
  areaText: {
    color: '#22c55e',
    fontSize: 10,
    fontFamily: 'Inter-Bold',
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 8,
  },
  footerInfoText: {
    color: '#64748b',
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    flex: 1,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  useButton: {
    backgroundColor: '#5B2A86',
    height: 55,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5B2A86',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  useButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  }
});
