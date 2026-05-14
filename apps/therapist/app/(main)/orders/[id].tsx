import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Animated, PanResponder, Dimensions, Linking, Platform, StatusBar, Modal
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useThemeColors, useThemeStore } from '@/store/themeStore';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/constants/Theme';
import { supabase } from '@/lib/supabase';
import { useAlert } from '@/components/CustomAlert';
import { useTherapistStore } from '@/store/therapistStore';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  const [open, setOpen] = useState(false);
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
function SwipeButton({ label, onSwipe, t }: { label: string; onSwipe: () => void; t: any }) {
  const pan = useRef(new Animated.Value(0)).current;
  const [done, setDone] = useState(false);
  const thumbW = 56;
  const trackW = SW - SPACING.lg * 2;
  const maxDrag = trackW - thumbW - 8;

  const responder = PanResponder.create({
    onStartShouldSetPanResponder: () => !done,
    onMoveShouldSetPanResponder: () => !done,
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
            {done ? `✓ ${label}` : `Geser untuk ${label}`}
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

  const scrollY = useRef(new Animated.Value(0)).current;

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
      .channel(`order_detail_${id}`)
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
        setTherapistLoc({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude
        });
        
        // Also update therapist_locations table in DB
        if (profile?.id) {
          await supabase.from('therapist_locations').upsert({
            therapist_id: profile.id,
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
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

  const advanceStatus = async () => {
    if (!order || !NEXT[order.status]) return;
    const nextStatus = NEXT[order.status].status;
    
    // Add log entry first
    await supabase.from('order_logs').insert({
      order_id: order.id,
      status: nextStatus,
    });

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

          if (freshOrder.vouchers?.is_cashback && freshOrder.discount_amount > 0) {
            const cashbackAmount = freshOrder.discount_amount;
            userUpdateData.wallet_balance = currentBalance + cashbackAmount;
            userUpdateData.cashback = currentCashback + cashbackAmount;

            await supabase.from('transactions').insert({
              user_id: freshOrder.user_id,
              order_id: freshOrder.id,
              type: 'cashback',
              amount: cashbackAmount,
              balance_before: currentBalance,
              balance_after: currentBalance + cashbackAmount,
              description: `Cashback dari voucher ${freshOrder.vouchers.code}`
            });
          }
          await supabase.from('users').update(userUpdateData).eq('id', freshOrder.user_id);
        }

        // --- 2. THERAPIST EARNINGS (Commission Logic) ---
        const targetTherapistId = freshOrder.therapist_id || profile?.id;
        
        if (targetTherapistId) {
          console.log('[DEBUG Earnings] Processing therapist:', targetTherapistId);
          const { data: therapistData, error: tFetchErr } = await supabase
            .from('therapists')
            .select('wallet_balance, commission_rate, total_orders')
            .eq('id', targetTherapistId)
            .single();
          
          if (tFetchErr) {
            console.error('[DEBUG Earnings] Failed to fetch therapist profile:', tFetchErr);
          }

          if (therapistData) {
            const totalAmount = Number(freshOrder.total_price) || 0;
            const rate = Number(therapistData.commission_rate) || 80; 
            const therapistShare = (totalAmount * rate) / 100;
            const platformShare = totalAmount - therapistShare;
            
            let balanceUpdate = 0;
            let txType: 'credit' | 'debit' = 'credit';
            let txDesc = '';

            const pMethod = String(freshOrder.payment_method || '').toLowerCase();
            const isCash = pMethod === 'tunai' || pMethod === 'cash';

            if (isCash) {
              balanceUpdate = -platformShare;
              txType = 'debit';
              txDesc = `Bagi hasil (Tunai) - ${freshOrder.order_number}`;
            } else {
              balanceUpdate = therapistShare;
              txType = 'credit';
              txDesc = `Pendapatan layanan - ${freshOrder.order_number}`;
            }

            const currentBalance = Number(therapistData.wallet_balance) || 0;
            const durationHours = (Number(freshOrder.duration) || 60) / 60;
            
            console.log('[DEBUG Earnings] Calculated Update:', {
              isCash,
              currentBalance,
              balanceUpdate,
              newBalance: currentBalance + balanceUpdate
            });

            const { error: tUpdateErr } = await supabase.from('therapists').update({
              wallet_balance: currentBalance + balanceUpdate,
              total_orders: (Number(therapistData.total_orders) || 0) + 1
            }).eq('id', targetTherapistId);

            if (tUpdateErr) {
              console.error('[DEBUG Earnings] Update Failed:', tUpdateErr.message, tUpdateErr.details);
            } else {
              console.log('[DEBUG Earnings] Therapist table updated successfully');
            }

            const { error: txErr } = await supabase.from('transactions').insert({
              therapist_id: targetTherapistId,
              order_id: freshOrder.id,
              type: txType,
              amount: balanceUpdate,
              balance_before: currentBalance,
              balance_after: currentBalance + balanceUpdate,
              description: txDesc
            });
            
            if (txErr) {
              console.error('[DEBUG Earnings] Transaction record failed:', txErr.message);
            } else {
              console.log('[DEBUG Earnings] Transaction recorded successfully');
            }
          }
        } else {
          console.warn('[DEBUG Earnings] No therapist_id found for this order');
        }
      } catch (err) {
        console.error('[DEBUG Earnings] Catch Exception:', err);
      }
    }

    const orderUpdate: any = { status: nextStatus };
    if (nextStatus === 'completed') {
      orderUpdate.payment_status = 'settlement';
    }
    
    await supabase.from('orders').update(orderUpdate).eq('id', order.id);
    
    // Refresh both order and global therapist profile (to see new balance/hours immediately)
    await fetchOrder(); 
    if (nextStatus === 'completed') {
      await useTherapistStore.getState().fetchProfile();
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
    
    showAlert('warning', 'Batalkan Pesanan?', 'Apakah Anda yakin ingin membatalkan pesanan ini? Tindakan ini tidak dapat dibatalkan.', [
      { text: 'Tidak', style: 'cancel' },
      { 
        text: 'Ya, Batalkan', 
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', order.id);
            if (error) throw error;

            // Add log entry
            await supabase.from('order_logs').insert({
              order_id: order.id,
              status: 'cancelled',
              note: 'Dibatalkan oleh terapis'
            });

            fetchOrder(); // Update local state instead of immediate back
          } catch (error) {
            console.error('Error cancelling order:', error);
            showAlert('error', 'Gagal', 'Terjadi kesalahan saat membatalkan pesanan.');
          }
        }
      }
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={t.secondary} /></View>;
  if (!order) return <View style={styles.center}><Text style={{color: t.text}}>Pesanan tidak ditemukan</Text></View>;

  const currentStepIndex = STATUS_STEPS.findIndex(s => s.key === order.status);
  const nextAction = NEXT[order.status];
  const custName = order.users?.full_name || 'Pelanggan';

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
        {order.status !== 'completed' && (
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
                          }
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
                    <Text style={styles.detailValue}>{order.services?.duration_min || order.duration || 60} Menit</Text>
                  </View>
                </View>

                <View style={styles.accDividerSmall} />

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
                    <Text style={styles.detailValue}>{order.address}</Text>
                    <Text style={[styles.detailValue, { color: t.textSecondary, fontSize: 11, marginTop: 2 }]}>Estimasi jarak ± {calculatedDistance || order.distance || '0'} KM</Text>
                  </View>
                </View>

                {/* Catatan Lokasi */}
                {order.location_notes && (
                  <View style={[styles.noteBox, { backgroundColor: t.primary + '08', borderColor: t.primary + '20', marginTop: 10 }]}>
                    <Ionicons name="map-outline" size={20} color={t.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.detailLabel, { color: t.primary }]}>PETUNJUK LOKASI</Text>
                      <Text style={[styles.detailValue, { color: t.text }]}>{order.location_notes}</Text>
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
                    <View style={[styles.payBadge, { backgroundColor: order.payment_method === 'midtrans' ? t.secondary + '15' : t.success + '15' }]}>
                      <Text style={[styles.payBadgeText, { color: order.payment_method === 'midtrans' ? t.secondary : t.success }]}>
                        {order.payment_method === 'midtrans' ? 'E-WALLET' : 'CASH / TUNAI'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.payRow}>
                    <Text style={styles.payLabel}>Total Tagihan</Text>
                    <Text style={styles.payAmount}>Rp {(order.total_price || 0).toLocaleString('id-ID')}</Text>
                  </View>
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

            {nextAction && <SwipeButton  key={nextAction.status} label={nextAction.label} onSwipe={advanceStatus} t={t} />}
          </>
        )}

        {isMapFull && nextAction && (
          <View style={{ marginTop: 10 }}>
            <SwipeButton key={nextAction.status + '_full'} label={nextAction.label} onSwipe={advanceStatus} t={t} />
          </View>
        )}
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const accStyles = (t: any, color: string) => StyleSheet.create({
  wrap: { marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, backgroundColor: t.surface, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: t.border, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: SPACING.sm },
  iconBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: color + '20', alignItems: 'center', justifyContent: 'center' },
  title: { ...TYPOGRAPHY.body, flex: 1, color: t.text, fontFamily: 'Inter_600SemiBold' },
  body: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.md },
});

const getStyles = (t: any) => StyleSheet.create({
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
  customerCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: t.surface, margin: SPACING.lg, borderRadius: RADIUS.xl, padding: SPACING.md, borderWidth: 1, borderColor: t.border },
  avatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, color: '#FFFFFF', fontWeight: 'bold' },
  customerName: { fontSize: 16, color: t.text, fontFamily: 'Inter_700Bold' },
  serviceLabel: { fontSize: 12, color: t.textSecondary },
  callBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: t.success + '20', alignItems: 'center', justifyContent: 'center' },
  chatBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: t.secondary + '20', alignItems: 'center', justifyContent: 'center' },
  section: { paddingHorizontal: SPACING.lg, marginTop: SPACING.sm, marginBottom: SPACING.lg },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: t.text, marginBottom: SPACING.sm },
  stepsCard: { backgroundColor: t.surface, borderRadius: RADIUS.xl, padding: SPACING.md, borderWidth: 1, borderColor: t.border },
  step: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 8 },
  stepIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepDone: { backgroundColor: t.success },
  stepPending: { backgroundColor: t.border },
  stepLabel: { fontSize: 14, color: t.textMuted },
  stepLabelDone: { color: t.text, fontWeight: '600' },
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
  payLabel: { fontSize: 13, color: t.textSecondary },
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
});
