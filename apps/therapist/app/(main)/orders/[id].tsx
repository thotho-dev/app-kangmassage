import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Animated, PanResponder, Dimensions, Linking, Platform, StatusBar, Modal, Image
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useThemeColors, useThemeStore } from '@/store/themeStore';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/constants/Theme';
import { supabase } from '@/lib/supabase';
import { getTierDetails, calculateTier } from '@/lib/tierLogic';
import { getAppSettings } from '@/lib/appSettings';
import { titleCase } from '@/lib/utils';
import { useAlert } from '@/components/CustomAlert';
import { useTherapistStore } from '@/store/therapistStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_URL } from '@/lib/config';

import * as Location from 'expo-location';
// import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const { width: SW } = Dimensions.get('window');

const STATUS_STEPS = [
  { key: 'accepted',    label: 'Pesanan Diterima',   icon: 'checkmark-circle' },
  { key: 'on_the_way',  label: 'Menuju Lokasi',       icon: 'navigate'         },
  { key: 'arrived',     label: 'Tiba di Lokasi',      icon: 'location'         },
  { key: 'in_progress', label: 'Sedang Berlangsung',  icon: 'time'             },
  { key: 'completed',   label: 'Selesai',             icon: 'star'             },
];

const NEXT: Record<string, { label: string; status: string }> = {
  accepted:    { label: 'Mulai Menuju Lokasi', status: 'on_the_way'  },
  on_the_way:  { label: 'Tiba di Lokasi',      status: 'arrived'     },
  arrived:     { label: 'Mulai Pelayanan',     status: 'in_progress' },
  in_progress: { label: 'Selesaikan Pesanan',  status: 'completed'   },
};

const MOCK_ORDER = {
  id: 'e7b1a1a0-1234-4321-bcde-f1234567890a',
  users: { full_name: 'Siti Rahayu', phone: '+62 812-3456-7890' },
  service_name: 'Pijat Relaksasi',
  duration: 90,
  address: 'Jl. Sudirman No. 12, Jakarta',
  latitude: -6.2244,
  longitude: 106.8166,
  note: 'Mohon bawa minyak pijat aromaterapi.',
  total_price: 150000,
  distance: '1.2',
  status: 'on_the_way',
};

// ─── Accordion ─────────────────────────────────────────────────────────────────
function Accordion({ title, icon, color, children, t }: any) {
  const [open, setOpen] = useState(true);
  const anim = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    Animated.timing(anim, { toValue: open ? 0 : 1, duration: 200, useNativeDriver: true }).start();
    setOpen((v: boolean) => !v);
  };

  const rot = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const s = accStyles(t, color);
  
  return (
    <View style={s.wrap}>
      <TouchableOpacity onPress={toggle} activeOpacity={0.8} style={s.header}>
        <View style={s.iconBox}>
          <Ionicons name={icon} size={16} color={color} />
        </View>
        <Text style={s.title}>{title}</Text>
        {/* @ts-ignore */}
        <Animated.View style={{ transform: [{ rotate: rot }] }}>
          <Ionicons name="chevron-down" size={18} color={t.textSecondary} />
        </Animated.View>
      </TouchableOpacity>
      {open && <View style={s.body}>{children}</View>}
    </View>
  );
}

// ─── Swipe Button ──────────────────────────────────────────────────────────────
function SwipeButton({ label, onSwipe, t, disabled = false }: { label: string; onSwipe: () => void; t: any; disabled?: boolean }) {
  const pan = useRef(new Animated.Value(0)).current;
  const [done, setDone] = useState(false);
  const thumbW = 56;
  const trackW = SW - SPACING.lg * 2;
  const maxDrag = trackW - thumbW - 8;

  const responder = PanResponder.create({
    onStartShouldSetPanResponder: () => !done && !disabled,
    onMoveShouldSetPanResponder: () => !done && !disabled,
    onPanResponderMove: (_, g) => {
      pan.setValue(Math.max(0, Math.min(g.dx, maxDrag)));
    },
    onPanResponderRelease: (_, g) => {
      if (g.dx >= maxDrag * 0.75) {
        Animated.timing(pan, { toValue: maxDrag, duration: 150, useNativeDriver: false }).start(() => {
          setDone(true);
          onSwipe();
        });
      } else {
        Animated.spring(pan, { toValue: 0, useNativeDriver: false }).start();
      }
    },
  });

  const bgOpacity = pan.interpolate({ inputRange: [0, maxDrag], outputRange: [0.25, 1], extrapolate: 'clamp' });

  return (
    <View style={{ marginHorizontal: SPACING.lg, marginBottom: SPACING.xl }}>
      <View style={{ 
        height: 64, 
        borderRadius: 32, 
        backgroundColor: t.border, 
        overflow: 'hidden',
      }}>
        {/* @ts-ignore */}
        <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: t.secondary, opacity: bgOpacity }]} />
        <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ ...TYPOGRAPHY.body, color: done ? '#fff' : t.textMuted, fontFamily: 'Inter_700Bold', opacity: 0.9 }}>
            {done ? `✓ ${label}` : disabled ? `Jadwal belum dimulai` : `Geser untuk ${label}`}
          </Text>
        </View>
        {!done && (
          /* @ts-ignore */
          <Animated.View
            {...responder.panHandlers}
            style={{ 
              position: 'absolute', 
              left: 4, 
              top: 4, 
              width: thumbW, 
              height: thumbW, 
              transform: [{ translateX: pan }],
              elevation: 5,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
            }}
          >
            <LinearGradient
              colors={[t.secondary, '#EA580C']}
              style={{ width: thumbW, height: thumbW, borderRadius: thumbW / 2, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="chevron-forward" size={24} color="#fff" />
            </LinearGradient>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function OrderDetailScreen() {
  const t = useThemeColors();
  const isDarkMode = useThemeStore(state => state.isDarkMode);
  const styles = getStyles(t);
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { profile } = useTherapistStore();
  const { showAlert } = useAlert();

  const [order, setOrder] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [therapistLoc, setTherapistLoc] = useState<{latitude: number, longitude: number} | null>(null);
  const [fixedCustomerLoc, setFixedCustomerLoc] = useState<{latitude: number, longitude: number} | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [calculatedDistance, setCalculatedDistance] = useState<string | null>(null);
  const [isMapFull, setIsMapFull] = useState(false);
  const [qrisModalVisible, setQrisModalVisible] = useState(false);
  const [qrisState, setQrisState] = useState<'idle' | 'loading' | 'ready' | 'checking' | 'paid' | 'error'>('idle');
  const [qrisData, setQrisData] = useState<{ qr_code_url: string | null; external_id: string; amount: number } | null>(null);
  const [qrisError, setQrisError] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState<string>('');
  const [serviceRemaining, setServiceRemaining] = useState<string>('');

  const scrollY = useRef(new Animated.Value(0)).current;

  // Helper: check if a scheduled order's time has passed
  const isScheduleActive = (order: any) => {
    if (!order?.scheduled_at) return false;
    const now = new Date();
    const scheduled = new Date(order.scheduled_at);
    return now >= scheduled;
  };

  // Effect: update countdown every second while order is scheduled and not active
  useEffect(() => {
    if (!order?.scheduled_at) {
      setRemainingTime('');
      return;
    }
    const update = () => {
      const now = new Date();
      const scheduled = new Date(order.scheduled_at);
      const diff = scheduled.getTime() - now.getTime();
      if (diff <= 0) {
        setRemainingTime('');
        return;
      }
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      const formatted = `${hrs.toString().padStart(2, '0')}:${mins
        .toString()
        .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      setRemainingTime(formatted);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [order]);

  // In-progress service countdown timer from logs (duration-based only)
  useEffect(() => {
    if (!logs || !order || order.status !== 'in_progress') {
      setServiceRemaining('');
      return;
    }
    if (order.services?.price_type && order.services.price_type !== 'duration') {
      setServiceRemaining('');
      return;
    }
    const inProgressLog = logs.find(l => l.status === 'in_progress');
    if (!inProgressLog) {
      setServiceRemaining('');
      return;
    }
    const startTime = new Date(inProgressLog.created_at).getTime();
    const durationMinutes = order.services?.duration_min || order.duration || 60;
    const endTime = startTime + durationMinutes * 60 * 1000;
    const update = () => {
      const now = Date.now();
      const diff = Math.max(0, endTime - now);
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setServiceRemaining(`${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [order?.status, logs, order?.services?.price_type]);

  const fetchOrder = useCallback(async () => {
    if (!id || typeof id !== 'string') {
      console.error('[DEBUG OrderDetail] Invalid ID:', id);
      setOrder(MOCK_ORDER); 
      setLoading(false); 
      return;
    }

    try {
      // Fetch Order with aliases to match UI expectations
      const fetchRes = await supabase
        .from('orders')
        .select(`
          *,
          users:users(*),
          services:services(*)
        `)
        .eq('id', id)
        .limit(1);
      
      const orderData = fetchRes.data ? fetchRes.data[0] : null;
      const orderError = fetchRes.error;
      
      if (orderError) {
        console.error('[DEBUG OrderDetail] Supabase Fetch Error:', orderError);
        throw orderError;
      }
      
      if (!orderData) {
        console.error('[DEBUG OrderDetail] No data found for ID:', id);
        setOrder(MOCK_ORDER);
      } else {
        // Fetch Voucher separately if exists to avoid relationship error
        if (orderData.voucher_id) {
          const { data: voucherData } = await supabase
            .from('vouchers')
            .select('*')
            .eq('id', orderData.voucher_id)
            .single();
          
          if (voucherData) {
            orderData.vouchers = voucherData;
          }
        }

        setOrder(orderData);
        if (!fixedCustomerLoc) {
          setFixedCustomerLoc({ latitude: orderData.latitude, longitude: orderData.longitude });
        }
      }

      // Fetch Logs
      const { data: logsData } = await supabase
        .from('order_logs')
        .select('*')
        .eq('order_id', id)
        .order('created_at', { ascending: true });
      
      setLogs(logsData || []);

    } catch (err) {
      console.error('[DEBUG OrderDetail] Catch Exception:', err);
      // Fallback to mock only if truly failed
      if (!order) setOrder(MOCK_ORDER);
    } finally {
      setLoading(false);
    }
  }, [id, fixedCustomerLoc]);

  useEffect(() => { 
    fetchOrder();
    
    let locationWatcher: any = null;

    const startWatching = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        // Watch position updates
        locationWatcher = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000, // Update every 5 seconds
            distanceInterval: 10, // Or every 10 meters
          },
          (location) => {
            setTherapistLoc({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });
          }
        );
      } catch (e) {
        console.warn('Location watch error:', e);
      }
    };

    startWatching();

    // Realtime listener for order updates (e.g. customer cancels)
    const subscription = supabase
      .channel(`order_detail_${id}_${Math.random().toString(36).substring(7)}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` },
        (payload) => {
          console.log('[DEBUG OrderDetail] Update received:', payload.new.status);
          if (payload.new.status === 'cancelled' || payload.new.status !== order?.status) {
            fetchOrder();
          }
        }
      )
      .subscribe();

    return () => {
      if (locationWatcher) {
        locationWatcher.remove();
      }
      supabase.removeChannel(subscription);
    };
  }, [fetchOrder, id, order?.status]);

  const handleManualRefresh = async () => {
    // 1. Fetch latest order data
    await fetchOrder();
    
    // 2. Immediate GPS update for therapist
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const latitude = loc.coords.latitude;
        const longitude = loc.coords.longitude;
        setTherapistLoc({ latitude, longitude });
        
        // Geocode coordinates to readable address
        let live_address = '';
        try {
          const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (geocode && geocode.length > 0) {
            const addressObj = geocode[0];
            const street = addressObj.street || addressObj.name || '';
            const streetNumber = addressObj.streetNumber || '';
            const streetInfo = streetNumber ? `${street} No. ${streetNumber}` : street;
            const district = addressObj.district || addressObj.subregion || '';
            const city = addressObj.city || '';
            const region = addressObj.region || '';
            
            const parts = [
              streetInfo,
              district,
              city,
              region !== city ? region : null
            ].filter(p => p && p.trim().length > 0);
            live_address = parts.join(', ');
          }
        } catch (geocodeErr) {
          console.warn('Failed to reverse geocode live location:', geocodeErr);
        }
        
        // Also update therapist_locations table in DB
        if (profile?.id) {
          await supabase.from('therapist_locations').upsert({
            therapist_id: profile.id,
            latitude,
            longitude,
            live_address: live_address || null,
            last_updated: new Date().toISOString()
          }, { onConflict: 'therapist_id' });
        }
      }
    } catch (e) {
      console.warn('Manual refresh error:', e);
    }
    
    // 3. Trigger Map WebView reload
    setRefreshKey(prev => prev + 1);
  };

  const generateQris = async () => {
    if (!order || !profile) return;
    setQrisState('loading');
    setQrisError(null);
    try {
      const res = await fetch(`${API_URL}/api/payments/qris-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id, therapist_id: profile.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal generate QRIS');
      setQrisData(json.data);
      setQrisState('ready');
    } catch (err: any) {
      setQrisError(err.message);
      setQrisState('error');
    }
  };

  const checkQrisPayment = async () => {
    if (!order) return;
    setQrisState('checking');
    try {
      const { data } = await supabase.from('orders').select('payment_status').eq('id', order.id).single();
      if (data?.payment_status === 'paid') {
        setQrisState('paid');
        setQrisModalVisible(false);
        showAlert('success', 'Pembayaran Berhasil', `Pembayaran QRIS sebesar Rp ${(order.total_price || 0).toLocaleString('id-ID')} telah sukses terdeteksi! Silakan geser tombol konfirmasi untuk menyelesaikan pesanan.`);
        await fetchOrder();
      } else {
        setQrisState('ready');
        showAlert('error', 'Belum Dibayar', 'Pembayaran belum terdeteksi. Silakan coba lagi setelah pelanggan melakukan pembayaran.');
      }
    } catch (err: any) {
      setQrisState('ready');
      showAlert('error', 'Gagal', err.message || 'Gagal mengecek status pembayaran.');
    }
  };

  const advanceStatus = async () => {
    if (!order || !NEXT[order.status]) return;
    const nextStatus = NEXT[order.status].status;
    
    setLoading(true);
    try {
      // 1. Add log entry
      const { error: logErr } = await supabase.from('order_logs').insert({
        order_id: order.id,
        status: nextStatus,
      });
      if (logErr) console.warn('[DEBUG OrderDetail] Log entry failed:', logErr.message);

    // Handle Cashback and Points if completed
    if (nextStatus === 'completed') {
      try {
        console.log('[DEBUG Earnings] Starting rewards & earnings process for Order:', order.id);

        // 0. Fetch FRESH order data (Using limit(1) to avoid single() error)
        const { data: freshData, error: freshErr } = await supabase
          .from('orders')
          .select('*')
          .eq('id', order.id)
          .limit(1);
        
        const freshOrder = freshData ? freshData[0] : null;
        
        if (freshErr || !freshOrder) {
          console.error('[DEBUG Earnings] Failed to fetch fresh order data:', freshErr);
          throw new Error('Fresh order data not found');
        }

        // Fetch voucher separately to avoid relation error
        if (freshOrder.voucher_id) {
          const { data: voucherData } = await supabase
            .from('vouchers')
            .select('*')
            .eq('id', freshOrder.voucher_id)
            .maybeSingle();
          if (voucherData) {
            freshOrder.vouchers = voucherData;
          }
        }

        console.log('[DEBUG Earnings] Fresh Order Data:', {
          id: freshOrder.id,
          therapist_id: freshOrder.therapist_id,
          payment: freshOrder.payment_method,
          total: freshOrder.total_price
        });

        // --- 1. USER REWARDS (Points & Cashback) ---
        const { data: userData } = await supabase.from('users').select('wallet_balance, cashback, points, total_orders').eq('id', freshOrder.user_id).single();
        if (userData) {
          const currentBalance = userData.wallet_balance || 0;
          const currentCashback = userData.cashback || 0;
          const currentPoints = userData.points || 0;
          const currentTotalOrders = userData.total_orders || 0;

          let userUpdateData: any = { 
            total_orders: currentTotalOrders + 1,
            points: currentPoints + 1000 
          };

          await supabase.from('users').update(userUpdateData).eq('id', freshOrder.user_id);
        }

        // --- 2. THERAPIST EARNINGS (Commission Logic) ---
        const targetTherapistId = freshOrder.therapist_id || profile?.id;
        
        if (targetTherapistId) {
          console.log('[DEBUG Earnings] Processing therapist:', targetTherapistId);
          const { data: therapistData, error: tFetchErr } = await supabase
            .from('therapists')
            .select('wallet_balance, commission_rate, total_orders, tier')
            .eq('id', targetTherapistId)
            .single();
          
          if (tFetchErr) {
            console.error('[DEBUG Earnings] Failed to fetch therapist profile:', tFetchErr);
          }

          if (therapistData) {
            const isCashbackVoucher = freshOrder.vouchers?.is_cashback === true;
            const discountAmount = Number(freshOrder.discount_amount) || 0;
            const usedCashback = Number(freshOrder.used_cashback) || 0;
            const serviceFee = Number(freshOrder.service_fee) || 0;
            const totalPrice = Number(freshOrder.total_price) || 0;

            // Fallback: Jika service_price null/hilang dari database, hitung manual dari total_price + potongan
            const calculatedServicePrice = totalPrice - serviceFee + usedCashback + (isCashbackVoucher ? 0 : discountAmount);
            const servicePrice = Number(freshOrder.service_price) || calculatedServicePrice;

            const cashCollected = totalPrice;
            // Get dynamic commission based on tier
            const currentTier = therapistData.tier || 'Bronze';
            const tierInfo = getTierDetails(currentTier);
            const commissionRate = tierInfo.komisi; // Platform cut, e.g. 27%
            
            const commissionAmount = (servicePrice * commissionRate) / 100;
            const therapistShare = servicePrice - commissionAmount;
            
            const pMethod = String(freshOrder.payment_method || '').toLowerCase();
            const isCash = (pMethod === 'tunai' || pMethod === 'cash') && freshOrder.payment_status !== 'paid';

            const currentBalance = Number(therapistData.wallet_balance) || 0;
            
            let txsToInsert = [];
            let balanceCounter = currentBalance;

            if (isCash) {
              // 1. Potongan Komisi Aplikasi
              const commTx = {
                therapist_id: targetTherapistId,
                order_id: freshOrder.id,
                type: 'debit',
                amount: -commissionAmount,
                balance_before: balanceCounter,
                balance_after: balanceCounter - commissionAmount,
                description: `Potongan Komisi (Tunai) - ${freshOrder.order_number}`
              };
              balanceCounter -= commissionAmount;
              txsToInsert.push(commTx);

              // 2. Adjust for cash collected differences (Service Fee and Promo)
              const adjustment = servicePrice - cashCollected;
              
              if (adjustment > 0) {
                // Customer paid less than service price (e.g. used promo/discount)
                const adjTx = {
                  therapist_id: targetTherapistId,
                  order_id: freshOrder.id,
                  type: 'credit',
                  amount: adjustment,
                  balance_before: balanceCounter,
                  balance_after: balanceCounter + adjustment,
                  description: `Kompensasi Diskon Pesanan - ${freshOrder.order_number}`
                };
                balanceCounter += adjustment;
                txsToInsert.push(adjTx);
              } else if (adjustment < 0) {
                // Customer paid more than service price (e.g. app fee was included in cash)
                const adjTx = {
                  therapist_id: targetTherapistId,
                  order_id: freshOrder.id,
                  type: 'debit',
                  amount: adjustment, // this is negative
                  balance_before: balanceCounter,
                  balance_after: balanceCounter + adjustment,
                  description: `Titipan Biaya Aplikasi - ${freshOrder.order_number}`
                };
                balanceCounter += adjustment;
                txsToInsert.push(adjTx);
              }
            } else {
              // NON-CASH (Saldo)
              // 1. Pendapatan Layanan
              const incomeTx = {
                therapist_id: targetTherapistId,
                order_id: freshOrder.id,
                type: 'credit',
                amount: servicePrice,
                balance_before: balanceCounter,
                balance_after: balanceCounter + servicePrice,
                description: `Pendapatan Layanan (Non-Tunai) - ${freshOrder.order_number}`
              };
              balanceCounter += servicePrice;
              txsToInsert.push(incomeTx);

              // 2. Potongan Komisi Aplikasi
              const commTx = {
                therapist_id: targetTherapistId,
                order_id: freshOrder.id,
                type: 'debit',
                amount: -commissionAmount,
                balance_before: balanceCounter,
                balance_after: balanceCounter - commissionAmount,
                description: `Potongan Komisi Aplikasi - ${freshOrder.order_number}`
              };
              balanceCounter -= commissionAmount;
              txsToInsert.push(commTx);
            }

            // --- Admin Fee Pesanan ---
            const appSettings = await getAppSettings();
            const adminFee = appSettings.order_admin_fee;
            if (adminFee > 0) {
              const afTx = {
                therapist_id: targetTherapistId,
                order_id: freshOrder.id,
                type: 'debit',
                amount: -adminFee,
                balance_before: balanceCounter,
                balance_after: balanceCounter - adminFee,
                description: `Biaya Admin Pesanan - ${freshOrder.order_number}`
              };
              balanceCounter -= adminFee;
              txsToInsert.push(afTx);
            }

            // --- 3. REWARD / TIER TARGET LOGIC & AUTO PROMOTION ---
            const now = new Date();
            const isDiamond = currentTier.toLowerCase() === 'diamond';
            let startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            
            if (isDiamond) {
               // Reset Juli & Januari (0 = Jan, 6 = Jul)
               const startMonth = now.getMonth() >= 6 ? 6 : 0; 
               startDate = new Date(now.getFullYear(), startMonth, 1);
            }

            const { data: periodOrders } = await supabase
              .from('orders')
              .select('id, total_price, service_price, service_fee')
              .eq('therapist_id', targetTherapistId)
              .eq('status', 'completed')
              .gte('created_at', startDate.toISOString());
              
            const periodOrderCount = (periodOrders?.length || 0) + 1; // includes current
            const periodOrderAmount = (periodOrders?.reduce((sum, o) => {
               const price = Number(o.service_price) || (Number(o.total_price) - (Number(o.service_fee) || 0));
               return sum + price;
            }, 0) || 0) + servicePrice; // includes current
            
            // Auto promotion logic based on target completion in current period
            const TIER_ORDER = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
            const calculatedTierName = calculateTier(periodOrderCount, periodOrderAmount);
            const calculatedTierIdx = TIER_ORDER.indexOf(calculatedTierName.toLowerCase());
            const currentTierIdx = TIER_ORDER.indexOf(currentTier.toLowerCase());
            
            let finalTier = currentTier;
            let earnedRewardTier = currentTier;
            
            if (calculatedTierIdx > currentTierIdx) {
              // Upgraded! Promote immediately
              finalTier = calculatedTierName;
              earnedRewardTier = calculatedTierName;
              console.log(`[DEBUG Earnings] Therapist promoted! Old tier: ${currentTier}, New tier: ${finalTier}`);
            }
            
            const rewardTierInfo = getTierDetails(earnedRewardTier);
            
            if ((rewardTierInfo.orderUnit === 0 || periodOrderCount >= rewardTierInfo.orderUnit) && periodOrderAmount >= rewardTierInfo.orderAmount) {
                // Check if already rewarded this period for this tier
                const rewardDescription = `Reward Pencapaian Target ${rewardTierInfo.tier} - ${startDate.getFullYear()}-${startDate.getMonth()+1}`;
                const { data: existingReward } = await supabase
                  .from('transactions')
                  .select('id')
                  .eq('therapist_id', targetTherapistId)
                  .eq('description', rewardDescription)
                  .maybeSingle();
                  
                if (!existingReward && rewardTierInfo.reward > 0) {
                    const rewardTx = {
                        therapist_id: targetTherapistId,
                        order_id: freshOrder.id,
                        type: 'credit',
                        amount: rewardTierInfo.reward,
                        balance_before: balanceCounter,
                        balance_after: balanceCounter + rewardTierInfo.reward,
                        description: rewardDescription
                    };
                    balanceCounter += rewardTierInfo.reward;
                    txsToInsert.push(rewardTx);
                }
            }

            // Update Therapist Table (includes wallet balance, total orders, and new tier)
            const { error: tUpdateErr } = await supabase.from('therapists').update({
              wallet_balance: balanceCounter,
              total_orders: (Number(therapistData.total_orders) || 0) + 1,
              tier: finalTier.toLowerCase() // Save as lowercase enum ('bronze', 'silver', 'gold', 'platinum', 'diamond')
            }).eq('id', targetTherapistId);

            if (tUpdateErr) {
              console.error('[DEBUG Earnings] Update Failed:', tUpdateErr.message, tUpdateErr.details);
            } else {
              // Insert all explicit transactions
              for (const tx of txsToInsert) {
                const { error: txErr } = await supabase.from('transactions').insert(tx);
                if (txErr) console.error('[DEBUG Earnings] Transaction record failed:', txErr.message);
              }
              console.log('[DEBUG Earnings] Transactions recorded successfully');
            }
          }
        } else {
          console.warn('[DEBUG Earnings] No therapist_id found for this order');
        }
      } catch (err: any) {
        console.error('[DEBUG Earnings] Catch Exception:', err);
        throw err;
      }
    }

    const orderUpdate: any = { status: nextStatus };
    if (nextStatus === 'completed') {
      orderUpdate.payment_status = 'paid';
    }
    
    const { error: finalErr } = await supabase.from('orders').update(orderUpdate).eq('id', order.id);
    if (finalErr) throw finalErr;

    // Send push notification to user
    try {
      const NOTIF_MAP: Record<string, { title: string; body: string }> = {
        on_the_way: { title: 'Terapis Menuju Lokasi', body: `Terapis ${titleCase(profile?.full_name)} sedang dalam perjalanan menuju lokasi Anda.` },
        arrived: { title: 'Terapis Tiba di Lokasi', body: 'Terapis telah tiba di lokasi Anda.' },
        in_progress: { title: 'Layanan Dimulai', body: 'Layanan pijat sedang berlangsung.' },
        completed: { title: 'Pesanan Selesai', body: 'Pesanan Anda telah selesai. Terima kasih telah menggunakan Kang Massage!' },
      };
      const msg = NOTIF_MAP[nextStatus];
      if (msg && order.user_id) {
        fetch(`${API_URL}/api/notifications/send`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: order.user_id, ...msg, type: `order_${nextStatus}`, data: { order_id: order.id } }),
        }).catch((err: any) => console.warn('Push notif error:', err?.message));
      }
    } catch (e) {
      console.warn('Push notification error:', e);
    }

    // Refresh both order and global therapist profile
    await fetchOrder(); 
    if (nextStatus === 'completed') {
      await useTherapistStore.getState().fetchProfile();
      showAlert('success', 'Berhasil', 'Pesanan telah diselesaikan.');
    }
    } catch (err: any) {
      console.error('[DEBUG OrderDetail] Error in advanceStatus:', err);
      showAlert('error', 'Gagal', err.message || 'Terjadi kesalahan saat memproses status.');
    } finally {
      setLoading(false);
    }
  };

  const handleChat = async () => {
    if (!order || !profile) return;
    if (order.status === 'completed' || order.status === 'cancelled') {
      showAlert('info', 'Selesai', 'Fitur chat dinonaktifkan untuk pesanan yang sudah selesai atau dibatalkan.');
      return;
    }
    const { data: existing } = await supabase.from('conversations').select('id').eq('user_id', order.user_id).eq('therapist_id', profile.id).maybeSingle();
    if (existing) {
      router.push(`/chats/${existing.id}`);
    } else {
      const { data: n } = await supabase.from('conversations').insert({ user_id: order.user_id, therapist_id: profile.id, last_message: 'Halo' }).select().single();
      if (n) router.push(`/chats/${n.id}`);
    }
  };

  const handleCancel = async () => {
    if (!order) return;
    
    showAlert('warning', 'Kembalikan ke Antrian?', 'Pesanan akan dikembalikan ke antrian dan terapis lain bisa mengambilnya.', [
      { text: 'Tidak', style: 'cancel' },
      { 
        text: 'Ya, Kembalikan', 
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('orders')
              .update({ status: 'pending', therapist_id: null, updated_at: new Date().toISOString() })
              .eq('id', order.id);
            if (error) throw error;

            // Add log entry
            await supabase.from('order_logs').insert({
              order_id: order.id,
              status: 'pending',
              note: 'Dikembalikan ke antrian oleh terapis'
            });

            router.back();
          } catch (error) {
            console.error('Error returning order to queue:', error);
            showAlert('error', 'Gagal', 'Terjadi kesalahan saat mengembalikan pesanan.');
          }
        }
      }
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={t.secondary} /></View>;
  if (!order) return <View style={styles.center}><Text style={{color: t.text}}>Pesanan tidak ditemukan</Text></View>;

  const currentStepIndex = STATUS_STEPS.findIndex(s => s.key === order.status);
  const nextAction = NEXT[order.status];
  const custName = titleCase(order.users?.full_name) || 'Pelanggan';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      {!isMapFull && (
        <View style={[styles.header, { backgroundColor: t.headerBg }]}>
          <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={t.text} /></TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={[styles.orderId, { color: t.text }]}>{order.order_number || String(order.id).slice(0, 8).toUpperCase()}</Text>
            <View style={styles.statusBadge}><View style={[styles.statusDot, { backgroundColor: order.status === 'cancelled' ? t.danger : t.success }]} /><Text style={[styles.statusText, { color: t.text }]}>{order.status === 'cancelled' ? 'DIBATALKAN' : order.status.toUpperCase()}</Text></View>
          </View>
        </View>
      )}

      {order.scheduled_at && !isMapFull && (
        <View style={{ backgroundColor: '#8B5CF615', borderBottomWidth: 1, borderBottomColor: '#8B5CF625', paddingHorizontal: 20, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="calendar" size={16} color="#8B5CF6" />
          <Text style={{ fontSize: 12, color: '#5B21B6', fontFamily: 'Inter_700Bold' }}>
            Jadwal Reservasi: {new Date(order.scheduled_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} · {new Date(order.scheduled_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
        </View>
      )}

      {order.status === 'cancelled' && (
        <View style={styles.cancelledOverlay}>
          <View style={[styles.cancelledBox, { backgroundColor: t.surface }]}>
            <Ionicons name="close-circle" size={60} color={t.danger} />
            <Text style={[styles.cancelledText, { color: t.text }]}>Pesanan Dibatalkan</Text>
            <Text style={[styles.cancelledSub, { color: t.textSecondary }]}>Pelanggan atau Anda telah membatalkan pesanan ini.</Text>
            <TouchableOpacity 
              style={[styles.backBtn, { backgroundColor: t.secondary }]} 
              onPress={() => router.back()}
            >
              <Text style={styles.backBtnText}>Kembali ke Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* @ts-ignore */}
      <Animated.ScrollView 
        scrollEnabled={!isMapFull}
        contentContainerStyle={isMapFull ? { flex: 1 } : styles.scroll} 
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
      >
        {order.status === 'on_the_way' && (
          <Animated.View style={[
            styles.mapContainer, 
            isMapFull ? { height: Dimensions.get('window').height * 0.9, marginHorizontal: 0, marginTop: 0, borderRadius: 0 } : { borderRadius: RADIUS.xl, marginHorizontal: SPACING.lg, marginTop: SPACING.sm, overflow: 'hidden', backgroundColor: t.border },
            !isMapFull && {
              opacity: scrollY.interpolate({
                inputRange: [0, 200],
                outputRange: [1, 0],
                extrapolate: 'clamp'
              }),
              transform: [
                {
                  translateY: scrollY.interpolate({
                    inputRange: [-250, 0, 250],
                    outputRange: [-125, 0, 125],
                    extrapolate: 'clamp'
                  })
                }
              ]
            }
          ]}>
            <WebView
              key={refreshKey}
              originWhitelist={['*']}
              style={styles.map}
              scrollEnabled={false}
              onMessage={(event) => {
                setCalculatedDistance(event.nativeEvent.data);
              }}
              source={{
                html: `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                    <style>
                      body { margin: 0; padding: 0; }
                      #map { height: 100vh; width: 100vw; background: #f0f0f0; }
                      .marker-pin {
                        width: 24px; height: 24px; border-radius: 50% 50% 50% 0;
                        background: #3B82F6; position: absolute; transform: rotate(-45deg);
                        left: 50%; top: 50%; margin: -20px 0 0 -12px;
                        border: 1.5px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                        overflow: hidden;
                      }
                      .marker-pin img {
                        width: 100%; height: 100%; transform: rotate(45deg); object-fit: cover;
                      }
                      .marker-pin.customer { background: #EA580C; }
                    </style>
                  </head>
                  <body>
                    <div id="map"></div>
                    <script>
                      const therapist = [${therapistLoc?.latitude || -6.200000}, ${therapistLoc?.longitude || 106.816666}];
                      const customer = [${fixedCustomerLoc?.latitude || order.latitude || -6.210000}, ${fixedCustomerLoc?.longitude || order.longitude || 106.826666}];
                      const therapistImg = "${profile?.avatar_url || 'https://ui-avatars.com/api/?name=' + (profile?.full_name || 'T') + '&background=3B82F6&color=fff'}";
                      const customerImg = "${order.users?.avatar_url || 'https://ui-avatars.com/api/?name=' + (order.users?.full_name || 'C') + '&background=EA580C&color=fff'}";
                      
                      const map = L.map('map', { zoomControl: false, attributionControl: false }).setView(therapist, 13);
                      
                      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(map);

                      const therapistIcon = L.divIcon({
                        className: 'custom-div-icon',
                        html: "<div class='marker-pin'><img src='" + therapistImg + "' /></div>",
                        iconSize: [24, 34],
                        iconAnchor: [12, 34]
                      });

                      const customerIcon = L.divIcon({
                        className: 'custom-div-icon',
                        html: "<div class='marker-pin customer'><img src='" + customerImg + "' /></div>",
                        iconSize: [24, 34],
                        iconAnchor: [12, 34]
                      });

                      L.marker(therapist, { icon: therapistIcon }).addTo(map);
                      L.marker(customer, { icon: customerIcon }).addTo(map);

                      // Fetch Route
                      fetch('https://router.project-osrm.org/route/v1/driving/' + therapist[1] + ',' + therapist[0] + ';' + customer[1] + ',' + customer[0] + '?overview=full&geometries=geojson')
                        .then(response => response.json())
                        .then(data => {
                          if (data.routes && data.routes[0]) {
                            const coords = data.routes[0].geometry.coordinates.map(p => [p[1], p[0]]);
                            // Pastikan garis rute menyentuh tepat pada pin user
                            coords.push(customer);
                            
                            L.polyline(coords, { color: '#22C55E', weight: 6, opacity: 1.0 }).addTo(map);
                            
                            const bounds = L.latLngBounds([therapist, customer]);
                            map.fitBounds(bounds, { padding: [50, 50] });
                            
                            const distance = (data.routes[0].distance / 1000).toFixed(1);
                            window.ReactNativeWebView.postMessage(distance);
                          } else {
                            throw new Error('No route found in response');
                          }
                        })
                        .catch(err => {
                          console.warn('OSRM routing failed, using geodesic line fallback:', err);
                          // Geodesic line fallback
                          L.polyline([therapist, customer], { color: '#EA580C', weight: 4, dashArray: '5, 10', opacity: 0.8 }).addTo(map);
                          
                          const bounds = L.latLngBounds([therapist, customer]);
                          map.fitBounds(bounds, { padding: [50, 50] });
                          
                          // Haversine formula for distance fallback
                          const R = 6371; // Earth radius in km
                          const dLat = (customer[0] - therapist[0]) * Math.PI / 180;
                          const dLon = (customer[1] - therapist[1]) * Math.PI / 180;
                          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                                    Math.cos(therapist[0] * Math.PI / 180) * Math.cos(customer[0] * Math.PI / 180) * 
                                    Math.sin(dLon/2) * Math.sin(dLon/2);
                          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                          const distance = (R * c).toFixed(1);
                          window.ReactNativeWebView.postMessage(distance);
                        });
                    </script>
                  </body>
                  </html>
                `
              }}
            />
            <TouchableOpacity 
              style={[styles.fullViewBtn, isMapFull && { top: 50, right: 20 }]} 
              onPress={() => setIsMapFull(!isMapFull)}
            >
              <Ionicons name={isMapFull ? "close" : "expand"} size={isMapFull ? 24 : 18} color={t.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.openMapBtn} onPress={() => {
              const url = Platform.OS === 'ios' ? `maps://0,0?q=${order.latitude},${order.longitude}` : `geo:0,0?q=${order.latitude},${order.longitude}`;
              Linking.openURL(url);
            }}>
              <Ionicons name="navigate-outline" size={16} color={t.primary} /><Text style={styles.openMapText}>Buka G-Maps</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.refreshMapBtn, isMapFull && { bottom: 30, right: 20 }]} 
              onPress={handleManualRefresh}
            >
              <Ionicons name="refresh" size={16} color={t.text} />
            </TouchableOpacity>
          </Animated.View>
        )}

        {!isMapFull && (
          <>
            {order.status !== 'in_progress' && (
              <View style={styles.customerCard}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{custName[0]}</Text></View>
                <View style={{ flex: 1 }}><Text style={styles.customerName}>{custName}</Text><Text style={styles.serviceLabel}>{order.services?.name || 'Layanan'}</Text></View>
                <TouchableOpacity 
                  style={[styles.callBtn, (order.status === 'completed' || order.status === 'cancelled') && { opacity: 0.3 }]} 
                  onPress={() => {
                    if (order.status === 'completed' || order.status === 'cancelled') {
                      showAlert('info', 'Selesai', 'Anda tidak dapat menghubungi pelanggan untuk pesanan yang sudah selesai atau dibatalkan.');
                    } else {
                      Linking.openURL(`tel:${order.users?.phone}`);
                    }
                  }}
                  disabled={order.status === 'completed' || order.status === 'cancelled'}
                >
                  <Ionicons name="call" size={20} color={t.success} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.chatBtn, (order.status === 'completed' || order.status === 'cancelled') && { opacity: 0.3 }]} 
                  onPress={handleChat}
                  disabled={order.status === 'completed' || order.status === 'cancelled'}
                >
                  <Ionicons name="chatbubble" size={20} color={t.secondary} />
                </TouchableOpacity>
              </View>
            )}

            {order.status === 'in_progress' && (
              <View style={[styles.timerCard, { backgroundColor: t.surface, borderColor: t.success + '40' }]}>
                <View style={styles.timerHeader}>
                  <Ionicons name="time-outline" size={20} color={t.success} />
                  <Text style={[styles.timerTitle, { color: t.success }]}>
                    {order.services?.price_type === 'duration' ? 'Sisa Waktu Pelayanan' : 'Status Pelayanan'}
                  </Text>
                </View>
                {order.services?.price_type === 'duration' ? (
                  <>
                    <Text style={[styles.timerDisplay, { color: t.text }]}>{serviceRemaining || '00:00:00'}</Text>
                    <Text style={[styles.timerSub, { color: t.textSecondary }]}>
                      Durasi: {order.services?.duration_min || order.duration || 60} Menit
                    </Text>
                  </>
                ) : (
                  <View style={styles.treatmentStatusContainer}>
                    <Ionicons name="sparkles" size={32} color={t.success} />
                    <Text style={[styles.treatmentStatusText, { color: t.text }]}>Sedang Treatment</Text>
                    <Text style={[styles.timerSub, { color: t.textSecondary }]}>
                      Layanan sedang berlangsung
                    </Text>
                  </View>
                )}
              </View>
            )}

            <Accordion title="Detail Pesanan" icon="information-circle-outline" color={t.primary} t={t}>
              <View style={styles.accContent}>
                
                {/* Layanan */}
                <View style={styles.detailItemLong}>
                  <View style={[styles.detailIcon, { backgroundColor: t.primary + '15' }]}>
                    <Ionicons name="sparkles" size={16} color={t.primary} />
                  </View>
                  <View>
                    <Text style={styles.detailLabel}>LAYANAN</Text>
                    <Text style={styles.detailValue}>{order.services?.name || order.service_name}</Text>
                  </View>
                </View>

                {/* Catatan Layanan (Inline) */}
                {(order.service_notes || order.note) && (
                  <View style={[styles.noteBox, { backgroundColor: t.secondary + '08', borderColor: t.secondary + '20', marginTop: 8, marginLeft: 36 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.detailLabel, { color: t.secondary, fontSize: 10 }]}>CATATAN LAYANAN</Text>
                      <Text style={[styles.detailValue, { color: t.text, fontSize: 12 }]}>{order.service_notes || order.note}</Text>
                    </View>
                  </View>
                )}

                <View style={styles.accDividerSmall} />

                {/* Durasi */}
                <View style={styles.detailItemLong}>
                  <View style={[styles.detailIcon, { backgroundColor: t.secondary + '15' }]}>
                    <Ionicons name="time" size={16} color={t.secondary} />
                  </View>
                  <View>
                    <Text style={styles.detailLabel}>DURASI LAYANAN</Text>
                    <Text style={styles.detailValue}>{order.services?.price_type === 'treatment' ? '1 Treatment' : `${order.services?.duration_min || order.duration || 60} Menit`}</Text>
                  </View>
                </View>

                <View style={styles.accDividerSmall} />

                {order.scheduled_at && (
                  <>
                    <View style={styles.detailItemLong}>
                      <View style={[styles.detailIcon, { backgroundColor: '#8B5CF615' }]}>
                        <Ionicons name="alarm" size={16} color="#8B5CF6" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.detailLabel, { color: '#8B5CF6' }]}>JADWAL RESERVASI</Text>
                        <Text style={[styles.detailValue, { color: '#5B21B6', fontFamily: 'Inter_700Bold' }]}>
                          {new Date(order.scheduled_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} · {new Date(order.scheduled_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.accDividerSmall} />
                  </>
                )}

                {/* Waktu */}
                <View style={styles.detailItemLong}>
                  <View style={[styles.detailIcon, { backgroundColor: t.success + '15' }]}>
                    <Ionicons name="calendar" size={16} color={t.success} />
                  </View>
                  <View>
                    <Text style={styles.detailLabel}>WAKTU PEMESANAN</Text>
                    <Text style={styles.detailValue}>
                      {new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} · {new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </Text>
                  </View>
                </View>

                <View style={styles.accDividerSmall} />

                {/* Gender */}
                <View style={styles.detailItemLong}>
                  <View style={[styles.detailIcon, { backgroundColor: '#8B5CF6' + '15' }]}>
                    <Ionicons name="person" size={16} color="#8B5CF6" />
                  </View>
                  <View>
                    <Text style={styles.detailLabel}>JENIS KELAMIN PELANGGAN</Text>
                    <Text style={styles.detailValue}>{order.user_gender === 'female' ? 'Perempuan' : 'Laki-laki'}</Text>
                  </View>
                </View>

                <View style={styles.accDivider} />

                {/* Lokasi */}
                <View style={styles.detailItemLong}>
                  <View style={[styles.detailIcon, { backgroundColor: t.primary + '10' }]}>
                    <Ionicons name="location" size={18} color={t.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailLabel}>ALAMAT CUSTOMER</Text>
                    <Text style={styles.detailValue}>
                      {(order.status === 'completed' || order.status === 'cancelled')
                        ? 'Alamat disembunyikan'
                        : order.address}
                    </Text>
                    <Text style={[styles.detailValue, { color: t.textSecondary, fontSize: 11, marginTop: 2 }]}>Estimasi jarak ± {calculatedDistance || order.distance || '0'} KM</Text>
                  </View>
                </View>

                {/* Catatan Lokasi */}
                {order.location_notes && (
                  <View style={[styles.noteBox, { backgroundColor: t.primary + '08', borderColor: t.primary + '20', marginTop: 10 }]}>
                    <Ionicons name="map-outline" size={20} color={t.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.detailLabel, { color: t.primary }]}>PETUNJUK LOKASI</Text>
                      <Text style={[styles.detailValue, { color: t.text }]}>
                        {(order.status === 'completed' || order.status === 'cancelled')
                          ? 'Detail disembunyikan'
                          : order.location_notes}
                      </Text>
                    </View>
                  </View>
                )}



                <View style={styles.accDivider} />

                {/* Rincian Pembayaran Card */}
                <View style={[styles.payCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
                  <View style={styles.payHeader}>
                    <Ionicons name="card-outline" size={18} color={t.textSecondary} />
                    <Text style={styles.payTitle}>RINGKASAN PEMBAYARAN</Text>
                  </View>
                  
                  <View style={styles.payRow}>
                    <Text style={styles.payLabel}>Metode</Text>
                    <View style={[styles.payBadge, { backgroundColor: order.payment_method === 'midtrans' || order.payment_method === 'qris' || order.payment_method === 'saldo' ? t.secondary + '15' : t.success + '15' }]}>
                      <Text style={[styles.payBadgeText, { color: order.payment_method === 'midtrans' || order.payment_method === 'qris' || order.payment_method === 'saldo' ? t.secondary : t.success }]}>
                        {order.payment_method === 'saldo' ? 'SALDO' : order.payment_method === 'qris' ? 'QRIS' : order.payment_method === 'midtrans' ? 'E-WALLET' : 'CASH / TUNAI'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.payRow}>
                    <Text style={styles.payLabel}>Harga Layanan</Text>
                    <Text style={[styles.payAmount, { color: t.text }]}>Rp {(order.service_price || order.total_price || 0).toLocaleString('id-ID')}</Text>
                  </View>

                  {order.discount_amount > 0 && (
                    <View style={styles.payRow}>
                      <Text style={styles.payLabel}>Diskon Promo</Text>
                      <Text style={[styles.payAmount, { color: t.danger }]}>- Rp {order.discount_amount.toLocaleString('id-ID')}</Text>
                    </View>
                  )}

                  {order.used_cashback > 0 && (
                    <View style={styles.payRow}>
                      <Text style={styles.payLabel}>Potongan Cashback</Text>
                      <Text style={[styles.payAmount, { color: t.danger }]}>- Rp {order.used_cashback.toLocaleString('id-ID')}</Text>
                    </View>
                  )}

                  {order.service_fee > 0 && (
                    <View style={styles.payRow}>
                      <Text style={styles.payLabel}>Biaya Layanan (Customer)</Text>
                      <Text style={[styles.payAmount, { color: t.text }]}>Rp {order.service_fee.toLocaleString('id-ID')}</Text>
                    </View>
                  )}

                  <View style={{ height: 1, backgroundColor: t.border, marginVertical: 8 }} />

                  <View style={styles.payRow}>
                    <Text style={[styles.payLabel, { fontFamily: 'Inter_700Bold', color: t.text }]}>
                      {order.payment_method === 'saldo' ? 'Total (Saldo Pembeli)' : 'Tagihan ke Customer'}
                    </Text>
                    <Text style={[styles.payAmount, { fontSize: 16 }]}>
                      Rp {(order.total_price || 0).toLocaleString('id-ID')}
                    </Text>
                  </View>

                  {(order.discount_amount > 0 || order.used_cashback > 0) && (
                    <Text style={{ fontSize: 10, color: t.textSecondary, marginTop: 4, fontStyle: 'italic', lineHeight: 14 }}>
                      *Jangan khawatir, kompensasi selisih diskon akan otomatis ditambahkan ke saldo dompet Anda saat pesanan selesai.
                    </Text>
                  )}

                  {order.payment_method !== 'midtrans' && (
                    <TouchableOpacity 
                      style={[styles.qrisBtn, { backgroundColor: order.status === 'in_progress' ? t.primary : t.border }]}
                      onPress={() => order.status === 'in_progress' && setQrisModalVisible(true)}
                      activeOpacity={0.8}
                      disabled={order.status !== 'in_progress'}
                    >
                      <Ionicons name="qr-code-outline" size={16} color={order.status === 'in_progress' ? '#FFFFFF' : t.textMuted} />
                      <Text style={[styles.qrisBtnText, { color: order.status === 'in_progress' ? '#FFFFFF' : t.textMuted }]}>
                        {order.status === 'in_progress' ? 'Tampilkan QRIS Pembayaran' : 'QRIS (Tunggu Sedang Berlangsung)'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {order.status === 'accepted' && (
                  <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                    <Ionicons name="close-circle-outline" size={20} color={t.danger} />
                    <Text style={styles.cancelBtnText}>Batalkan Pesanan</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Accordion>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Status</Text>
              <View style={styles.stepsCard}>
                {STATUS_STEPS.map((step, i) => {
                  const log = logs.find(l => l.status === step.key);
                  const logTime = log ? new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : null;

                  return (
                  <View key={step.key} style={styles.step}>
                      <View style={[styles.stepIcon, i <= currentStepIndex ? styles.stepDone : styles.stepPending]}>
                        <Ionicons name={step.icon as any} size={14} color="#fff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.stepLabel, i <= currentStepIndex && styles.stepLabelDone]}>{step.label}</Text>
                      </View>
                      {logTime && (
                        <Text style={{ fontSize: 12, color: t.textMuted, fontFamily: 'Inter_500Medium' }}>{logTime}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>

            {nextAction && !isMapFull && (
              <View>
                {remainingTime && (
                  <View style={{ alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ color: t.textMuted, fontFamily: 'Inter_500Medium' }}>
                      Mulai dalam {remainingTime}
                    </Text>
                  </View>
                )}
                <SwipeButton
                  key={nextAction.status}
                  label={nextAction.label}
                  onSwipe={advanceStatus}
                  t={t}
                  disabled={order?.scheduled_at && !isScheduleActive(order)}
                />
              </View>
            )}
          </>
        )}

        {isMapFull && nextAction && (
          <View style={{ marginTop: 10 }}>
            {remainingTime && (
              <View style={{ alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ color: t.textMuted, fontFamily: 'Inter_500Medium' }}>
                  Mulai dalam {remainingTime}
                </Text>
              </View>
            )}
            <SwipeButton
              key={nextAction.status + '_full'}
              label={nextAction.label}
              onSwipe={advanceStatus}
              t={t}
              disabled={order?.scheduled_at && !isScheduleActive(order)}
            />
          </View>
        )}
      </Animated.ScrollView>

      {/* QRIS PAYMENT MODAL */}
      <Modal
        visible={qrisModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setQrisModalVisible(false);
          setQrisState('idle');
          setQrisData(null);
          setQrisError(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: t.surface }]}>
            {/* Top Close Indicator */}
            <View style={styles.modalDragHandle} />

            {/* Header */}
            <View style={styles.qrisModalHeader}>
              <Text style={[styles.qrisModalTitle, { color: t.text }]}>QRIS Pembayaran Mitra</Text>
              <TouchableOpacity 
                style={[styles.modalCloseBtn, { backgroundColor: t.border }]}
                onPress={() => {
                  setQrisModalVisible(false);
                  setQrisState('idle');
                  setQrisData(null);
                  setQrisError(null);
                }}
              >
                <Ionicons name="close" size={20} color={t.text} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ alignItems: 'center', paddingBottom: 20 }}
            >
              {qrisState === 'idle' || qrisState === 'error' ? (
                <>
                  <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: SPACING.lg }}>
                    <Ionicons name="qr-code-outline" size={80} color={t.primary} style={{ marginBottom: 20 }} />
                    <Text style={[styles.qrisModalTitle, { color: t.text, marginBottom: 12 }]}>
                      {qrisState === 'error' ? 'Gagal Generate QRIS' : 'QRIS Pembayaran'}
                    </Text>
                    <Text style={[styles.scanHintText, { color: t.textSecondary, textAlign: 'center', marginBottom: 24 }]}>
                      {qrisState === 'error'
                        ? qrisError || 'Terjadi kesalahan. Silakan coba lagi.'
                        : 'Generate kode QRIS untuk menerima pembayaran dari pelanggan melalui E-Wallet atau M-Banking.'}
                    </Text>
                    <TouchableOpacity
                      style={[styles.qrisBtnBig, { backgroundColor: t.primary }]}
                      onPress={generateQris}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="qr-code-outline" size={20} color="#FFFFFF" />
                      <Text style={styles.qrisBtnBigText}>Generate QRIS</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : qrisState === 'loading' ? (
                <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                  <ActivityIndicator size="large" color={t.primary} />
                  <Text style={[styles.scanHintText, { color: t.textSecondary, marginTop: 16 }]}>
                    Menghasilkan kode QRIS...
                  </Text>
                </View>
              ) : qrisState === 'ready' || qrisState === 'checking' ? (
                <>
                  {/* QRIS Standard Slip Header */}
                  <View style={styles.qrisReceiptHeader}>
                    <View style={styles.qrisReceiptLogoRow}>
                      <View style={styles.gpnEmblem}>
                        <Ionicons name="shield" size={12} color="#0E7490" style={{ marginRight: 2 }} />
                        <Text style={styles.gpnEmblemText}>GPN</Text>
                      </View>
                      <View style={styles.qrisStandardLogo}>
                        <Text style={[styles.qrisLogoTxtPart, { color: '#019FD9' }]}>QR</Text>
                        <Text style={[styles.qrisLogoTxtPart, { color: '#ED2C24' }]}>IS</Text>
                      </View>
                    </View>
                    <Text style={[styles.receiptMerchantName, { color: t.text }]}>KANG MASSAGE MITRA</Text>
                    <Text style={styles.receiptMerchantNmid}>NMID : ID10260518992</Text>
                  </View>

                  {/* Order Amount Info */}
                  <View style={styles.receiptAmountCard}>
                    <Text style={styles.amountLabel}>TOTAL BILL / TAGIHAN</Text>
                    <Text style={[styles.amountValue, { color: t.text }]}>
                      Rp {(order?.total_price || 0).toLocaleString('id-ID')}
                    </Text>
                    <Text style={styles.receiptOrderNumber}>Order No: {order?.order_number || 'KM-ORDER'}</Text>
                  </View>

                  {/* Dynamic QRIS Code Image */}
                  <View style={[styles.qrisCodeBorder, { borderColor: t.border }]}>
                    {qrisData?.qr_code_url ? (
                      <Image source={{ uri: qrisData.qr_code_url }} style={styles.qrisImage} />
                    ) : (
                      <View style={[styles.qrisImage, { alignItems: 'center', justifyContent: 'center', backgroundColor: t.background }]}>
                        <Ionicons name="qr-code" size={120} color={t.textSecondary} />
                      </View>
                    )}
                    <View style={[styles.qrisCorner, styles.cornerTL]} />
                    <View style={[styles.qrisCorner, styles.cornerTR]} />
                    <View style={[styles.qrisCorner, styles.cornerBL]} />
                    <View style={[styles.qrisCorner, styles.cornerBR]} />
                  </View>

                  <Text style={[styles.scanHintText, { color: t.textSecondary }]}>
                    Arahkan aplikasi pemindai E-Wallet atau M-Banking Anda ke kode QR di atas untuk menyelesaikan transaksi.
                  </Text>

                  {/* Status Action Buttons */}
                  <View style={{ width: '100%', paddingHorizontal: SPACING.md, marginTop: SPACING.md, gap: 10 }}>
                    <TouchableOpacity 
                      style={[styles.qrisCheckBtn, { backgroundColor: t.success }]}
                      onPress={checkQrisPayment}
                      disabled={qrisState === 'checking'}
                      activeOpacity={0.8}
                    >
                      {qrisState === 'checking' ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="sync-outline" size={18} color="#FFFFFF" />
                          <Text style={styles.qrisCheckBtnText}>Cek Status Pembayaran</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function accStyles(t: any, color: string) { 
  return StyleSheet.create({
    wrap: { marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, backgroundColor: t.surface, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: t.border, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: SPACING.sm },
  iconBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: color + '20', alignItems: 'center', justifyContent: 'center' },
  title: { ...TYPOGRAPHY.body, flex: 1, color: t.text, fontFamily: 'Inter_600SemiBold' },
    body: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.md },
  });
}

function getStyles(t: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.background },
  header: { paddingHorizontal: SPACING.lg, paddingTop: 30, paddingBottom: SPACING.lg, flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  headerContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  orderId: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: 'rgba(0,0,0,0.05)' },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  statusText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
  scroll: { paddingBottom: 32 },
  mapContainer: { height: 250, position: 'relative' },
  map: { ...StyleSheet.absoluteFillObject },
  markerContainer: { alignItems: 'center', justifyContent: 'center', width: 40, height: 40 },
  markerPulse: { position: 'absolute', width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(59, 130, 246, 0.3)' },
  markerDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#3B82F6', borderWidth: 2, borderColor: '#FFFFFF' },
  fullViewBtn: { position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
  openMapBtn: { position: 'absolute', bottom: 16, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', borderRadius: RADIUS.full, paddingHorizontal: 16, paddingVertical: 8, elevation: 4 },
  openMapText: { fontSize: 12, color: t.primary, fontFamily: 'Inter_700Bold' },
  refreshMapBtn: { 
    position: 'absolute', 
    bottom: 16, 
    right: 12, 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    backgroundColor: '#FFFFFF', 
    alignItems: 'center', 
    justifyContent: 'center', 
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3 
  },
  timerCard: { marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1.5, alignItems: 'center' },
  timerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  timerTitle: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  timerDisplay: { fontSize: 42, fontFamily: 'Inter_800ExtraBold', letterSpacing: 4, marginBottom: 6 },
  timerSub: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  treatmentStatusContainer: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  treatmentStatusText: { fontSize: 20, fontFamily: 'Inter_700Bold', marginTop: 4 },
  customerCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: t.surface, margin: SPACING.lg, borderRadius: RADIUS.xl, padding: SPACING.md, borderWidth: 1, borderColor: t.border },
  avatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  customerName: { fontSize: 16, color: t.text, fontFamily: 'Inter_700Bold' },
  serviceLabel: { fontSize: 12, color: t.textSecondary },
  callBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: t.success + '20', alignItems: 'center', justifyContent: 'center' },
  chatBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: t.secondary + '20', alignItems: 'center', justifyContent: 'center' },
  section: { paddingHorizontal: SPACING.lg, marginTop: SPACING.sm, marginBottom: SPACING.lg },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', color: t.text, marginBottom: SPACING.sm },
  stepsCard: { backgroundColor: t.surface, borderRadius: RADIUS.xl, padding: SPACING.md, borderWidth: 1, borderColor: t.border },
  step: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 8 },
  stepIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepDone: { backgroundColor: t.success },
  stepPending: { backgroundColor: t.border },
  stepLabel: { fontSize: 14, color: t.textMuted },
  stepLabelDone: { color: t.text, fontFamily: 'Inter_600SemiBold' },
  accContent: { paddingVertical: 10 },
  accSectionLabel: { fontSize: 10, color: t.textSecondary, marginBottom: 4 },
  accBodyText: { fontSize: 14, color: t.text, marginBottom: 10 },
  accDivider: { height: 1, backgroundColor: t.border, marginVertical: 16 },
  accDividerSmall: { height: 1, backgroundColor: t.border, marginVertical: 12, marginLeft: 46, opacity: 0.5 },
  detailIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  detailLabel: { fontSize: 9, color: t.textSecondary, fontFamily: 'Inter_700Bold', letterSpacing: 0.5, marginBottom: 2 },
  detailValue: { fontSize: 13, color: t.text, fontFamily: 'Inter_600SemiBold' },
  detailItemLong: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  noteBox: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: RADIUS.lg, borderWidth: 1, marginTop: 16 },
  payCard: { borderRadius: RADIUS.lg, padding: 12, marginTop: 8 },
  payHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  payTitle: { fontSize: 10, color: t.textSecondary, fontFamily: 'Inter_700Bold' },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  payLabel: { fontSize: 13, color: t.textSecondary, fontFamily: 'Inter_500Medium' },
  payAmount: { fontSize: 14, color: t.primary, fontFamily: 'Inter_700Bold' },
  payBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  payBadgeText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
  cancelBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8, 
    marginTop: 16, 
    paddingVertical: 12, 
    borderRadius: RADIUS.lg, 
    borderWidth: 1, 
    borderColor: t.danger + '30',
    backgroundColor: t.danger + '05'
  },
  cancelBtnText: { color: t.danger, fontFamily: 'Inter_700Bold', fontSize: 14 },
  backBtnText: { color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  cancelledOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  cancelledBox: {
    width: '100%',
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    gap: 12,
  },
  cancelledText: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  cancelledSub: { fontSize: 14, textAlign: 'center', opacity: 0.7, marginBottom: 20 },
  backBtn: { width: '100%', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  qrisBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
  },
  qrisBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
  },
  qrisBtnBig: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: RADIUS.full,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  qrisBtnBigText: {
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '90%',
  },
  modalDragHandle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignSelf: 'center',
    marginBottom: 10,
  },
  qrisModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  qrisModalTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrisReceiptHeader: {
    alignItems: 'center',
    width: '90%',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    marginBottom: 12,
  },
  qrisReceiptLogoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  gpnEmblem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0E749020',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gpnEmblemText: {
    fontSize: 10,
    fontFamily: 'Inter_900Black',
    color: '#0E7490',
  },
  qrisStandardLogo: {
    flexDirection: 'row',
  },
  qrisLogoTxtPart: {
    fontSize: 14,
    fontFamily: 'Inter_900Black',
    letterSpacing: -1,
  },
  receiptMerchantName: {
    fontSize: 13,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 0.5,
  },
  receiptMerchantNmid: {
    fontSize: 10,
    color: '#64748B',
    fontFamily: 'Inter_500Medium',
    marginTop: 2,
  },
  receiptAmountCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 16,
    width: '90%',
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  amountLabel: {
    fontSize: 9,
    color: '#64748B',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: 22,
    fontFamily: 'Inter_800ExtraBold',
    marginVertical: 4,
  },
  receiptOrderNumber: {
    fontSize: 10,
    color: '#64748B',
    fontFamily: 'Inter_500Medium',
  },
  qrisCodeBorder: {
    width: 250,
    height: 250,
    padding: 10,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  qrisImage: {
    width: 220,
    height: 220,
  },
  qrisCorner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#0F172A',
  },
  cornerTL: {
    top: -1,
    left: -1,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  cornerTR: {
    top: -1,
    right: -1,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  cornerBL: {
    bottom: -1,
    left: -1,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  cornerBR: {
    bottom: -1,
    right: -1,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  scanHintText: {
    width: '85%',
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 14,
    fontStyle: 'italic',
  },
  qrisCheckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: RADIUS.full,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  qrisCheckBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  });
}
