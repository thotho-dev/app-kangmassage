import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, StatusBar, Image, ActivityIndicator, RefreshControl, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, Ticket, Info, Timer } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useLocation } from '@/context/LocationContext';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { id as idID } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/Skeleton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PURPLE = '#240080';
const BG = '#F5F5F7';
const TEXT_DARK = '#1A1A2E';
const TEXT_MUTED = '#6B7280';

export default function VouchersScreen() {
  const router = useRouter();
  const { from, sourceFrom, serviceId, therapistId, totalPrice } = useLocalSearchParams();
  const currentTotalPrice = totalPrice ? parseFloat(totalPrice as string) : 0;
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { address } = useLocation();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  
  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        if (from === 'order') {
          router.replace({ 
            pathname: '/order', 
            params: { 
              serviceId: serviceId as string, 
              therapistId: therapistId as string, 
              from: sourceFrom as string 
            } 
          });
          return true;
        }
        router.back();
        return true;
      };

      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        backAction
      );

      return () => backHandler.remove();
    }, [from, sourceFrom, serviceId, therapistId])
  );

  const fetchVouchers = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Active Vouchers
      const { data: voucherData, error: vError } = await supabase
        .from('vouchers')
        .select('*')
        .eq('is_active', true)
        .gte('valid_until', new Date().toISOString())
        .order('valid_until', { ascending: true });

      if (vError) throw vError;

      // 2. Fetch User Usages to check limits
      const { data: usageData, error: uError } = await supabase
        .from('voucher_usages')
        .select('voucher_id')
        .eq('user_id', profile?.id);

      if (uError) {
        console.error('Error fetching usage data:', uError);
      }

      // Map usage counts
      const usageCounts: Record<string, number> = {};
      usageData?.forEach((u: any) => {
        usageCounts[u.voucher_id] = (usageCounts[u.voucher_id] || 0) + 1;
      });

      // Combine data
      const processedVouchers = (voucherData || []).map(v => ({
        ...v,
        user_usage_count: usageCounts[v.id] || 0
      }));

      setVouchers(processedVouchers);
    } catch (error) {
      console.error('Error fetching vouchers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (profile?.id) fetchVouchers();
    }, [profile?.id])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchVouchers();
  };

  const formatExpiry = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return `Berlaku s/d ${format(date, 'dd MMM yyyy', { locale: idID })}`;
    } catch (e) {
      return 'Berlaku s/d -';
    }
  };

  const formatDiscount = (item: any) => {
    const prefix = item.is_cashback ? 'Cashback ' : '';
    if (item.type === 'percentage') return `${prefix}${item.value}%`;
    return `${prefix}Rp ${item.value.toLocaleString('id-ID')}`;
  };

  const checkVoucherValidity = (item: any) => {
    // 0. User Limit Check (Per User)
    const userLimit = Number(item.user_limit) || 1;
    if (item.user_usage_count >= userLimit) {
      return { valid: false, reason: 'Batas pemakaian tercapai' };
    }

    // 1. New User Check
    if (item.category === 'new_user') {
      const orderCount = profile?.total_orders || 0;
      if (orderCount > 0) {
        return { valid: false, reason: 'Khusus pesanan pertama' };
      }
    }

    // 2. Repeat Order Check
    if (item.category === 'repeat_order') {
      const orderCount = profile?.total_orders || 0;
      if (orderCount < (item.min_order_count || 0)) {
        return { valid: false, reason: `Min. ${item.min_order_count} pesanan` };
      }
    }
    
    // 3. Area Validation
    if (item.area_names && Array.isArray(item.area_names) && item.area_names.length > 0 && address) {
      const addressLower = address.toLowerCase();
      const isCovered = item.area_names.some((areaName: string) => {
        // Handle "Provinsi - Kota/Kab" or just "Kota/Kab"
        const target = areaName.includes(' - ') ? areaName.split(' - ')[1] : areaName;
        const cleanTarget = target.toLowerCase()
          .replace(/kota\s+/g, '')
          .replace(/kabupaten\s+/g, '')
          .replace(/adm\.\s+/g, '')
          .replace(/jakarta\s+/g, 'jakarta ') // Ensure space
          .trim();
        
        // If address contains the cleaned area name (e.g., "jakarta barat")
        return addressLower.includes(cleanTarget);
      });
      if (!isCovered) return { valid: false, reason: 'Wilayah tidak sesuai' };
    }

    // 4. Usage Limit Check
    if (item.usage_limit && item.usage_count >= item.usage_limit) {
      return { valid: false, reason: 'Kuota habis' };
    }

    // 5. Context Specific Checks (Only when coming from Order screen)
    if (from === 'order') {
      if (currentTotalPrice < item.min_order_amount) {
        return { valid: false, reason: `Min. order Rp ${item.min_order_amount.toLocaleString('id-ID')}` };
      }
      if (item.category === 'service' && item.service_id && item.service_id !== serviceId) {
        return { valid: false, reason: 'Layanan tidak sesuai' };
      }
    }

    return { valid: true };
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Voucher Saya</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading && !refreshing ? (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {[1, 2, 3, 4].map(i => (
            <View key={i} style={styles.voucherCard}>
              <View style={[styles.voucherLeft, { opacity: 0.3 }]} />
              <View style={styles.voucherRight}>
                <View style={styles.mainInfo}>
                  <Skeleton width="60%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
                  <Skeleton width="90%" height={10} borderRadius={4} style={{ marginBottom: 12 }} />
                  <Skeleton width="40%" height={22} borderRadius={4} />
                </View>
                <View style={styles.footerInfo}>
                  <Skeleton width="50%" height={12} borderRadius={4} />
                  <Skeleton width={60} height={28} borderRadius={15} />
                </View>
              </View>
              <View style={styles.cutoutTop} />
              <View style={styles.cutoutBottom} />
              <View style={styles.divider} />
            </View>
          ))}
          <View style={styles.infoBox}>
            <Info size={16} color={TEXT_MUTED} />
            <Text style={styles.infoText}>Voucher dapat digunakan saat proses pemesanan layanan.</Text>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={[...vouchers].sort((a, b) => {
            const va = checkVoucherValidity(a);
            const vb = checkVoucherValidity(b);
            if (va.valid && !vb.valid) return -1;
            if (!va.valid && vb.valid) return 1;
            return 0;
          })}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PURPLE} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ticket size={48} color={TEXT_MUTED} opacity={0.2} />
              </View>
              <Text style={styles.emptyTitle}>Belum Ada Voucher</Text>
              <Text style={styles.emptySubtitle}>Pantau terus halaman ini untuk promo menarik lainnya.</Text>
            </View>
          }
          ListFooterComponent={
            <View style={styles.infoBox}>
              <Info size={16} color={TEXT_MUTED} />
              <Text style={styles.infoText}>Voucher dapat digunakan saat proses pemesanan layanan.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const { valid, reason } = checkVoucherValidity(item);
            return (
              <TouchableOpacity 
                style={[styles.voucherCard, !valid && { opacity: 0.6 }]}
                onPress={() => router.push({ pathname: '/voucher-detail/[id]', params: { id: item.id } })}
              >
                <View style={[styles.statusDot, { backgroundColor: valid ? '#22C55E' : '#D1D5DB' }]} />
                <View style={styles.voucherLeft}>
                  <View style={styles.decoCircleS} />
                  <View style={styles.decoCircleM} />
                  <View style={styles.leftContent}>
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={styles.voucherImage} />
                    ) : (
                      <View style={styles.iconCircle}>
                        <Ticket size={24} color="#EA580C" />
                      </View>
                    )}
                  </View>
                  <View style={styles.leftEdgeDots}>
                    <View style={styles.edgeDot} />
                    <View style={styles.edgeDot} />
                    <View style={styles.edgeDot} />
                  </View>
                </View>
                
                <View style={styles.voucherRight}>
                  <View style={styles.mainInfo}>
                    <Text style={styles.voucherTitle} numberOfLines={1}>{item.code}</Text>
                    <Text style={styles.voucherDescription} numberOfLines={1}>{item.description || 'Diskon Spesial untuk Anda'}</Text>
                    <View style={styles.discountRow}>
                      <Text style={styles.voucherDiscount}>{formatDiscount(item)}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.footerInfo}>
                    <View>
                      {!valid && (
                        <View style={[styles.invalidBadge, { alignSelf: 'flex-start', marginBottom: 4 }]}>
                          <Info size={10} color="#EF4444" style={{ marginRight: 4 }} />
                          <Text style={styles.invalidText}>{reason}</Text>
                        </View>
                      )}
                      <View style={styles.expiryRow}>
                        <Timer size={10} color={TEXT_MUTED} style={{ marginRight: 4 }} />
                        <Text style={styles.voucherExpiry}>{formatExpiry(item.valid_until)}</Text>
                      </View>
                    </View>
                    <TouchableOpacity 
                      style={[styles.useButton, !valid && { backgroundColor: '#E5E7EB' }]}
                      disabled={!valid}
                      onPress={() => {
                        if (from === 'order') {
                          router.replace({ 
                            pathname: '/order', 
                            params: { 
                              serviceId: serviceId as string, 
                              therapistId: therapistId as string, 
                              voucherCode: item.code,
                              from: sourceFrom as string
                            } 
                          });
                        } else {
                          router.replace({ pathname: '/services', params: { voucherCode: item.code } });
                        }
                      }}
                    >
                      <Text style={[styles.useButtonText, !valid && { color: TEXT_MUTED }]}>Pakai</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.cutoutTop} />
                <View style={styles.cutoutBottom} />
                <View style={styles.divider} />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 15,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: TEXT_DARK,
  },
  scrollContent: {
    padding: 16,
  },
  voucherCard: {
    flexDirection: 'row',
    minHeight: 110,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#5B2A86',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  statusDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    zIndex: 10,
  },
  decoCircleS: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(234,88,12,0.06)',
  },
  decoCircleM: {
    position: 'absolute',
    bottom: -15,
    left: -15,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(234,88,12,0.05)',
  },
  voucherLeft: {
    width: '28%',
    backgroundColor: '#FFF7ED',
    position: 'relative',
    overflow: 'hidden',
  },
  leftContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftEdgeDots: {
    position: 'absolute',
    left: -4,
    top: 0,
    bottom: 0,
    justifyContent: 'space-around',
    paddingVertical: 10,
  },
  edgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BG,
  },
  voucherRight: {
    flex: 1,
    padding: 14,
    paddingLeft: 18,
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  mainInfo: {
    gap: 2,
  },
  voucherTitle: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#1A1A1A',
  },
  voucherDescription: {
    fontSize: 9,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#6B7280',
  },
  voucherDiscount: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#EA580C',
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  invalidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#FEE2E2',
  },
  invalidText: {
    fontSize: 9,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#EF4444',
  },
  footerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voucherExpiry: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#9CA3AF',
  },
  useButton: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  useButtonText: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#EA580C',
  },
  cutoutTop: {
    position: 'absolute',
    top: -8,
    left: '28%',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: BG,
    marginLeft: -8,
    zIndex: 2,
  },
  cutoutBottom: {
    position: 'absolute',
    bottom: -8,
    left: '28%',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: BG,
    marginLeft: -8,
    zIndex: 2,
  },
  divider: {
    position: 'absolute',
    left: '28%',
    top: 15,
    bottom: 15,
    width: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Regular',
    color: TEXT_MUTED,
    flex: 1,
  },
  loadingContainer: {
    paddingVertical: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Medium',
    color: TEXT_MUTED,
  },
  emptyContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    color: TEXT_DARK,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Regular',
    color: TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 20,
  },
  voucherImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
});
