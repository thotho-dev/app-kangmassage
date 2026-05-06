import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Animated, PanResponder, Dimensions,
} from 'react-native';
import { useThemeColors } from '../../store/themeStore';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SPACING, RADIUS, TYPOGRAPHY } from '../../constants/Theme';
import { supabase } from '../../lib/supabase';

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
  address: 'Jl. Sudirman No. 12, RT 03/04, Kel. Karet, Kec. Setiabudi, Jakarta Pusat 12930',
  note: 'Mohon bawa minyak pijat aromaterapi. Saya punya alergi parfum keras.',
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
    setOpen(v => !v);
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
        <Animated.View style={{ transform: [{ rotate: rot }] }}>
          <Ionicons name="chevron-down" size={18} color={t.textSecondary} />
        </Animated.View>
      </TouchableOpacity>
      {open && (
        <View style={s.body}>
          {children}
        </View>
      )}
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
        <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: t.secondary, opacity: bgOpacity }]} />
        <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ ...TYPOGRAPHY.body, color: '#fff', fontFamily: 'Inter_600SemiBold', opacity: 0.9 }}>
            {done ? `✓ ${label}` : `← Geser untuk ${label}`}
          </Text>
        </View>
        {!done && (
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
  const styles = getStyles(t);
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // ALL hooks must be declared before any early return
  const scrollY = useRef(new Animated.Value(0)).current;
  const mapParallax = scrollY.interpolate({
    inputRange: [0, 220],
    outputRange: [0, -80],
    extrapolate: 'clamp',
  });
  const mapScale = scrollY.interpolate({
    inputRange: [-80, 0],
    outputRange: [1.15, 1],
    extrapolate: 'clamp',
  });
  const mapOpacity = scrollY.interpolate({
    inputRange: [100, 200],
    outputRange: [1, 0.4],
    extrapolate: 'clamp',
  });

  useEffect(() => { fetchOrder(); }, []);

  const fetchOrder = async () => {
    const uuidRx = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (typeof id !== 'string' || !uuidRx.test(id)) {
      setOrder(MOCK_ORDER); setLoading(false); return;
    }
    try {
      const { data, error } = await supabase.from('orders').select('*, users(*)').eq('id', id).single();
      if (error) throw error;
      setOrder(data);
    } catch {
      setOrder(MOCK_ORDER);
    } finally {
      setLoading(false);
    }
  };

  const advanceStatus = useCallback(() => {
    if (!order || !NEXT[order.status]) return;
    const nextStatus = NEXT[order.status].status;
    setOrder((o: any) => ({ ...o, status: nextStatus }));
    supabase.from('orders').update({ status: nextStatus }).eq('id', order.id).then();
  }, [order]);

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.background }}>
      <ActivityIndicator size="large" color={t.secondary} />
    </View>
  );

  if (!order) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.background }}>
      <Text style={{ color: t.text }}>Pesanan tidak ditemukan</Text>
    </View>
  );

  const currentStepIndex = STATUS_STEPS.findIndex(s => s.key === order.status);
  const nextAction = NEXT[order.status];
  const custName = order.users?.full_name || order.customerName || 'Pelanggan';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: t.headerBg }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.orderId}>#{String(order.id).slice(0, 8).toUpperCase()}</Text>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>{order.status.replace('_', ' ').toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <Animated.ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >

        {/* Map Placeholder – Parallax */}
        <View style={[styles.mapPlaceholder, { overflow: 'hidden' }]}>
          <Animated.View style={[
            StyleSheet.absoluteFillObject,
            { transform: [{ translateY: mapParallax }, { scale: mapScale }], opacity: mapOpacity }
          ]}>
            <LinearGradient colors={[t.primaryLight + 'CC', t.background]} style={StyleSheet.absoluteFillObject} />
          </Animated.View>
          <View style={styles.mapContent}>
            <Ionicons name="map" size={48} color={t.textSecondary} />
            <Text style={styles.mapText}>Peta Navigasi</Text>
            <Text style={styles.mapSub}>{order.distance || '1.2'} km · ~8 menit</Text>
          </View>
          <View style={styles.destPin}>
            <Ionicons name="location" size={20} color={t.secondary} />
          </View>
          <TouchableOpacity style={styles.openMapBtn}>
            <Ionicons name="navigate-outline" size={16} color={t.primary} />
            <Text style={styles.openMapText}>Buka Google Maps</Text>
          </TouchableOpacity>
        </View>

        {/* Customer Card */}
        <View style={styles.customerCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{custName[0]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.customerName}>{custName}</Text>
            <Text style={styles.serviceLabel}>{order.service_name || 'Pijat Relaksasi'} · {order.duration || 90} menit</Text>
          </View>
          <TouchableOpacity style={styles.callBtn}>
            <Ionicons name="call" size={20} color={t.success} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.chatBtn}>
            <Ionicons name="chatbubble" size={20} color={t.secondary} />
          </TouchableOpacity>
        </View>

        {/* Accordion: Detail Pesanan (Lokasi + Pembayaran) */}
        <Accordion title="Detail Pesanan" icon="receipt-outline" color={t.secondary} t={t}>
          <View style={styles.accContent}>
            {/* Lokasi */}
            <Text style={styles.accSectionLabel}>LOKASI PELANGGAN</Text>
            <View style={styles.accRow}>
              <Ionicons name="navigate-outline" size={16} color={t.textSecondary} style={{ marginTop: 2 }} />
              <Text style={styles.accBodyText}>{order.address || 'Alamat tidak tersedia'}</Text>
            </View>
            {(order.note || MOCK_ORDER.note) && (
              <View style={[styles.accNoteBox, { backgroundColor: t.warning + '15' }]}>
                <Ionicons name="alert-circle-outline" size={16} color={t.warning} style={{ marginTop: 2 }} />
                <Text style={[styles.accNoteText, { color: t.warning }]}>{order.note || MOCK_ORDER.note}</Text>
              </View>
            )}

            <View style={styles.accDivider} />

            {/* Pembayaran */}
            <Text style={styles.accSectionLabel}>RINCIAN PEMBAYARAN</Text>

            <View style={styles.accPayRow}>
              <Text style={styles.accPayLabel}>Metode Pembayaran</Text>
              <View style={[styles.accMethodBadge, { backgroundColor: t.info + '15' }]}>
                <Ionicons name={order.payment_method === 'transfer' ? 'card-outline' : 'cash-outline'} size={13} color={t.info} />
                <Text style={[styles.accMethodText, { color: t.info }]}>
                  {order.payment_method === 'transfer' ? 'Transfer Bank' : order.payment_method === 'ewallet' ? 'E-Wallet' : 'Tunai'}
                </Text>
              </View>
            </View>

            <View style={styles.accPayRow}>
              <Text style={styles.accPayLabel}>Harga Layanan</Text>
              <Text style={styles.accPayValue}>Rp {(order.total_price || 150000).toLocaleString('id-ID')}</Text>
            </View>
            <View style={styles.accPayRow}>
              <Text style={styles.accPayLabel}>Komisi Platform (20%)</Text>
              <Text style={[styles.accPayValue, { color: t.danger }]}>-Rp {((order.total_price || 150000) * 0.2).toLocaleString('id-ID')}</Text>
            </View>
            <View style={styles.accPayRow}>
              <Text style={styles.accPayLabel}>Biaya Transaksi (2%)</Text>
              <Text style={[styles.accPayValue, { color: t.danger }]}>-Rp {((order.total_price || 150000) * 0.02).toLocaleString('id-ID')}</Text>
            </View>
            <View style={styles.accDivider} />
            <View style={styles.accPayRow}>
              <Text style={styles.accPayTotal}>Pendapatan Bersih</Text>
              <Text style={[styles.accPayTotal, { color: t.secondary }]}>Rp {((order.total_price || 150000) * 0.78).toLocaleString('id-ID')}</Text>
            </View>
          </View>
        </Accordion>

        {/* Status Pesanan – Vertical (original) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status Pesanan</Text>
          <View style={styles.stepsCard}>
            {STATUS_STEPS.map((step, i) => {
              const isDone    = i <= currentStepIndex;
              const isCurrent = i === currentStepIndex;
              return (
                <View key={step.key} style={styles.step}>
                  <View style={styles.stepLeft}>
                    <View style={[styles.stepIcon, isDone ? styles.stepDone : isCurrent ? styles.stepCurrent : styles.stepPending]}>
                      <Ionicons
                        name={isDone && !isCurrent ? 'checkmark' : step.icon as any}
                        size={16}
                        color={isDone ? '#FFFFFF' : isCurrent ? t.primary : t.textMuted}
                      />
                    </View>
                    {i < STATUS_STEPS.length - 1 && (
                      <View style={[styles.stepLine, isDone && !isCurrent && styles.stepLineDone]} />
                    )}
                  </View>
                  <Text style={[styles.stepLabel, isDone && styles.stepLabelDone, isCurrent && styles.stepLabelCurrent]}>
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Swipe button – outside card */}
        {nextAction && (
          <SwipeButton
            key={order.status}
            label={nextAction.label}
            onSwipe={advanceStatus}
            t={t}
          />
        )}

        {order.status === 'completed' && (
          <View style={styles.completedBanner}>
            <Ionicons name="checkmark-circle" size={28} color={t.success} />
            <Text style={styles.completedText}>Pesanan Telah Selesai!</Text>
          </View>
        )}
      </Animated.ScrollView>
    </View>
  );
}

// Accordion dedicated styles
const accStyles = (t: any, color: string) => StyleSheet.create({
  wrap: { marginHorizontal: SPACING.lg, marginBottom: SPACING.sm, backgroundColor: t.surface, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: t.border, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: SPACING.sm },
  iconBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: color + '20', alignItems: 'center', justifyContent: 'center' },
  title: { ...TYPOGRAPHY.body, flex: 1, color: t.text, fontFamily: 'Inter_600SemiBold' },
  body: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.md },
});

const getStyles = (t: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  header: { paddingHorizontal: SPACING.lg, paddingTop: 52, paddingBottom: SPACING.lg, flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  backBtn: { padding: 4 },
  headerContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  orderId: { ...TYPOGRAPHY.h3, color: '#FFFFFF' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 5 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10B981' },
  statusText: { ...TYPOGRAPHY.caption, color: '#FFFFFF', fontFamily: 'Inter_700Bold' },
  scroll: { paddingBottom: 32 },
  mapPlaceholder: { height: 220, justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' },
  mapContent: { alignItems: 'center', gap: 6 },
  mapText: { ...TYPOGRAPHY.h4, color: t.text },
  mapSub: { ...TYPOGRAPHY.bodySmall, color: t.textSecondary },
  destPin: { position: 'absolute', top: 40, right: 60, backgroundColor: '#FFFFFF', padding: 8, borderRadius: 20, borderWidth: 2, borderColor: t.secondary },
  openMapBtn: { position: 'absolute', bottom: 16, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: 8, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  openMapText: { ...TYPOGRAPHY.caption, color: t.primary, fontFamily: 'Inter_700Bold' },
  customerCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: t.surface, margin: SPACING.lg, marginBottom: SPACING.sm, borderRadius: RADIUS.xl, padding: SPACING.md, borderWidth: 1, borderColor: t.border },
  avatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...TYPOGRAPHY.h4, color: '#FFFFFF' },
  customerName: { ...TYPOGRAPHY.body, color: t.text, fontFamily: 'Inter_700Bold' },
  serviceLabel: { ...TYPOGRAPHY.caption, color: t.textSecondary },
  callBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: t.success + '20', alignItems: 'center', justifyContent: 'center' },
  chatBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: t.secondary + '20', alignItems: 'center', justifyContent: 'center' },
  section: { paddingHorizontal: SPACING.lg, marginTop: SPACING.sm, marginBottom: SPACING.lg },
  sectionTitle: { ...TYPOGRAPHY.h4, color: t.text, marginBottom: SPACING.sm },
  stepsCard: { backgroundColor: t.surface, borderRadius: RADIUS.xl, padding: SPACING.md, borderWidth: 1, borderColor: t.border },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, paddingVertical: 4 },
  stepLeft: { alignItems: 'center', width: 32 },
  stepIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepDone: { backgroundColor: t.success },
  stepCurrent: { backgroundColor: t.primary + '20', borderWidth: 2, borderColor: t.primary },
  stepPending: { backgroundColor: t.border },
  stepLine: { width: 2, height: 24, backgroundColor: t.border, marginVertical: 2 },
  stepLineDone: { backgroundColor: t.success },
  stepLabel: { ...TYPOGRAPHY.body, color: t.textMuted, paddingTop: 6 },
  stepLabelDone: { color: t.success },
  stepLabelCurrent: { ...TYPOGRAPHY.body, color: t.primary, fontFamily: 'Inter_600SemiBold' },
  // Accordion inner content
  accContent: { gap: SPACING.sm },
  accSectionLabel: { ...TYPOGRAPHY.label, color: t.textSecondary, marginBottom: 2 },
  accRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start' },
  accBodyText: { ...TYPOGRAPHY.body, color: t.textSecondary, flex: 1, lineHeight: 20 },
  accNoteBox: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start', borderRadius: 10, padding: 10 },
  accNoteText: { ...TYPOGRAPHY.caption, flex: 1, lineHeight: 18 },
  accDivider: { height: 1, backgroundColor: t.border, marginVertical: SPACING.sm },
  accPayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  accPayLabel: { ...TYPOGRAPHY.body, color: t.textSecondary },
  accPayValue: { ...TYPOGRAPHY.body, color: t.text, fontFamily: 'Inter_600SemiBold' },
  accPayTotal: { ...TYPOGRAPHY.h4, color: t.text },
  accMethodBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  accMethodText: { ...TYPOGRAPHY.caption, fontFamily: 'Inter_600SemiBold' },
  // Completed banner
  completedBanner: { marginHorizontal: SPACING.lg, marginBottom: SPACING.xl, padding: SPACING.md, backgroundColor: t.success + '15', borderRadius: RADIUS.xl, alignItems: 'center', borderWidth: 1, borderColor: t.success + '30' },
  completedText: { ...TYPOGRAPHY.body, color: t.success, fontFamily: 'Inter_700Bold', marginTop: 6 },
});
