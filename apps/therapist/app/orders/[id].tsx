import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Animated, PanResponder, Dimensions, Linking, Platform, StatusBar
} from 'react-native';
import { useThemeColors, useThemeStore } from '../../store/themeStore';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/Theme';
import { supabase } from '../../lib/supabase';
import { useTherapistStore } from '../../store/therapistStore';

import * as Location from 'expo-location';

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
  const trackW = SW - SPACING.lg * 2 - 8;
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
      <View style={{ height: 60, borderRadius: 30, backgroundColor: t.border, overflow: 'hidden' }}>
        {/* @ts-ignore */}
        <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: t.secondary, opacity: bgOpacity }]} />
        <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ ...TYPOGRAPHY.body, color: '#fff', fontFamily: 'Inter_600SemiBold', opacity: 0.9 }}>
            {done ? `✓ ${label}` : `← Geser untuk ${label}`}
          </Text>
        </View>
        {!done && (
          /* @ts-ignore */
          <Animated.View
            {...responder.panHandlers}
            style={{ position: 'absolute', left: 4, top: 4, width: thumbW, height: thumbW, transform: [{ translateX: pan }] }}
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

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [routeCoords, setRouteCoords] = useState<{latitude: number, longitude: number}[]>([]);
  const [therapistLoc, setTherapistLoc] = useState<{latitude: number, longitude: number} | null>(null);

  const scrollY = useRef(new Animated.Value(0)).current;

  const fetchOrder = useCallback(async () => {
    const uuidRx = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (typeof id !== 'string' || !uuidRx.test(id)) {
      setOrder(MOCK_ORDER); setLoading(false); return;
    }
    try {
      const { data, error } = await supabase.from('orders').select('*, users(*), services(*)').eq('id', id).single();
      if (error) throw error;
      setOrder(data);
    } catch {
      setOrder(MOCK_ORDER);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { 
    fetchOrder();
    
    const getLoc = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({});
        setTherapistLoc({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      } catch (e) { console.warn(e); }
    };
    getLoc();
  }, [fetchOrder]);

  useEffect(() => {
    if (order?.latitude && therapistLoc) {
      const fetchRoute = async () => {
        try {
          const lat1 = therapistLoc.latitude;
          const lon1 = therapistLoc.longitude;
          const lat2 = order.latitude;
          const lon2 = order.longitude;
          const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson`);
          const data = await response.json();
          if (data.routes?.[0]) {
            const coords = data.routes[0].geometry.coordinates.map((p: any) => ({ latitude: p[1], longitude: p[0] }));
            setRouteCoords(coords);
          }
        } catch (e) { console.error(e); }
      };
      fetchRoute();
    }
  }, [order?.latitude, therapistLoc]);

  const advanceStatus = async () => {
    if (!order || !NEXT[order.status]) return;
    const nextStatus = NEXT[order.status].status;
    setOrder((o: any) => ({ ...o, status: nextStatus }));
    await supabase.from('orders').update({ status: nextStatus }).eq('id', order.id);
  };

  const handleChat = async () => {
    if (!order || !profile) return;
    const { data: existing } = await supabase.from('conversations').select('id').eq('user_id', order.user_id).eq('therapist_id', profile.id).maybeSingle();
    if (existing) {
      router.push(`/chats/${existing.id}`);
    } else {
      const { data: n } = await supabase.from('conversations').insert({ user_id: order.user_id, therapist_id: profile.id, last_message: 'Halo' }).select().single();
      if (n) router.push(`/chats/${n.id}`);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={t.secondary} /></View>;
  if (!order) return <View style={styles.center}><Text style={{color: t.text}}>Pesanan tidak ditemukan</Text></View>;

  const currentStepIndex = STATUS_STEPS.findIndex(s => s.key === order.status);
  const nextAction = NEXT[order.status];
  const custName = order.users?.full_name || 'Pelanggan';

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <View style={[styles.header, { backgroundColor: t.headerBg }]}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={t.text} /></TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.orderId, { color: t.text }]}>{order.order_number || String(order.id).slice(0, 8).toUpperCase()}</Text>
          <View style={styles.statusBadge}><View style={styles.statusDot} /><Text style={[styles.statusText, { color: t.text }]}>{order.status.toUpperCase()}</Text></View>
        </View>
      </View>

      {/* @ts-ignore */}
      <Animated.ScrollView contentContainerStyle={styles.scroll} onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}>
        <View style={[styles.mapContainer, { backgroundColor: t.border, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.xl, marginHorizontal: SPACING.lg, marginTop: SPACING.sm, height: 150 }]}>
          <Ionicons name="map-outline" size={40} color={t.textSecondary} style={{ marginBottom: 12 }} />
          <TouchableOpacity style={[styles.openMapBtn, { position: 'relative', bottom: 0 }]} onPress={() => {
            const url = Platform.OS === 'ios' ? `maps://0,0?q=${order.latitude},${order.longitude}` : `geo:0,0?q=${order.latitude},${order.longitude}`;
            Linking.openURL(url);
          }}>
            <Ionicons name="navigate-outline" size={16} color={t.primary} /><Text style={styles.openMapText}>Buka di Aplikasi Maps</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.customerCard}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{custName[0]}</Text></View>
          <View style={{ flex: 1 }}><Text style={styles.customerName}>{custName}</Text><Text style={styles.serviceLabel}>{order.services?.name || 'Layanan'}</Text></View>
          <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${order.users?.phone}`)}><Ionicons name="call" size={20} color={t.success} /></TouchableOpacity>
          <TouchableOpacity style={styles.chatBtn} onPress={handleChat}><Ionicons name="chatbubble" size={20} color={t.secondary} /></TouchableOpacity>
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
                <Text style={[styles.detailValue, { color: t.textSecondary, fontSize: 11, marginTop: 2 }]}>Estimasi jarak ± {order.distance || '0'} KM</Text>
              </View>
            </View>

            {/* Catatan */}
            {order.note && (
              <View style={[styles.noteBox, { backgroundColor: t.secondary + '08', borderColor: t.secondary + '20' }]}>
                <Ionicons name="chatbubble-ellipses" size={20} color={t.secondary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.detailLabel, { color: t.secondary }]}>CATATAN KHUSUS</Text>
                  <Text style={[styles.detailValue, { color: t.text, fontStyle: 'italic' }]}>"{order.note}"</Text>
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

          </View>
        </Accordion>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status</Text>
          <View style={styles.stepsCard}>
            {STATUS_STEPS.map((step, i) => (
              <View key={step.key} style={styles.step}>
                <View style={[styles.stepIcon, i <= currentStepIndex ? styles.stepDone : styles.stepPending]}><Ionicons name={step.icon as any} size={14} color="#fff" /></View>
                <Text style={[styles.stepLabel, i <= currentStepIndex && styles.stepLabelDone]}>{step.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {nextAction && <SwipeButton  key={nextAction.status} label={nextAction.label} onSwipe={advanceStatus} t={t} />}
      </Animated.ScrollView>
    </View>
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
  header: { paddingHorizontal: SPACING.lg, paddingTop: 52, paddingBottom: SPACING.lg, flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
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
  openMapBtn: { position: 'absolute', bottom: 16, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', borderRadius: RADIUS.full, paddingHorizontal: 16, paddingVertical: 8, elevation: 4 },
  openMapText: { fontSize: 12, color: t.primary, fontFamily: 'Inter_700Bold' },
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
});
