import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Share, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export default function VoucherDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [voucher, setVoucher] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
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
          <Ionicons name="arrow-back" size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail Voucher</Text>
        <TouchableOpacity onPress={handleShare} style={styles.iconButton}>
          <Ionicons name="share-social-outline" size={24} color="#f8fafc" />
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
              <Text style={styles.tagText}>{voucher.category.replace('_', ' ').toUpperCase()}</Text>
            </View>
            <Text style={styles.voucherValue}>
              {voucher.type === 'percentage' ? `${voucher.value}% OFF` : `Rp ${voucher.value.toLocaleString('id-ID')}`}
            </Text>
            <Text style={styles.voucherCode}>{voucher.code}</Text>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deskripsi</Text>
          <Text style={styles.descriptionText}>
            {voucher.description || 'Gunakan voucher ini untuk mendapatkan potongan harga spesial pada setiap pemesanan layanan Kang Massage.'}
          </Text>
        </View>

        {/* Requirements Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Syarat & Ketentuan</Text>
          
          <View style={styles.requirementRow}>
            <View style={styles.reqIcon}>
              <MaterialCommunityIcons name="calendar-clock" size={20} color="#2563eb" />
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
              <MaterialCommunityIcons name="cash-multiple" size={20} color="#2563eb" />
            </View>
            <View style={styles.reqInfo}>
              <Text style={styles.reqLabel}>Minimal Transaksi</Text>
              <Text style={styles.reqValue}>Rp {voucher.min_order_amount.toLocaleString('id-ID')}</Text>
            </View>
          </View>

          {voucher.max_discount && (
            <View style={styles.requirementRow}>
              <View style={styles.reqIcon}>
                <MaterialCommunityIcons name="arrow-collapse-down" size={20} color="#2563eb" />
              </View>
              <View style={styles.reqInfo}>
                <Text style={styles.reqLabel}>Maksimal Potongan</Text>
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
                <MaterialCommunityIcons name="spa-outline" size={20} color="#a855f7" />
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

        <View style={styles.footerInfo}>
          <Ionicons name="information-circle-outline" size={16} color="#94a3b8" />
          <Text style={styles.footerInfoText}>Voucher akan otomatis terpotong saat melakukan pembayaran jika syarat terpenuhi.</Text>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity 
          style={styles.useButton}
          onPress={() => router.replace({ pathname: '/(main)/order', params: { initialVoucherCode: voucher.code } })}
        >
          <Text style={styles.useButtonText}>Gunakan Voucher Sekarang</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#020617',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#020617',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#f8fafc',
    fontSize: 16,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
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
    backgroundColor: '#0f172a',
    elevation: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  voucherImage: {
    width: '100%',
    height: '100%',
    opacity: 0.6,
  } as any,
  cardOverlay: {
    position: 'absolute',
    inset: 0,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  tag: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 10,
  },
  tagText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  voucherValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
  },
  voucherCode: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginTop: 5,
    opacity: 0.8,
  },
  section: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  descriptionText: {
    color: '#94a3b8',
    fontSize: 14,
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
    backgroundColor: 'rgba(37,99,235,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  reqInfo: {
    flex: 1,
  },
  reqLabel: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 2,
  },
  reqValue: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
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
    fontWeight: 'bold',
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
    flex: 1,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#020617',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  useButton: {
    backgroundColor: '#2563eb',
    height: 55,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  useButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
