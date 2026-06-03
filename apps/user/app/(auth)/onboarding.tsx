import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS, COLORS } from '../../constants/Theme';
import Button from '../../components/ui/Button';

// ── Floating blob config ─────────────────────────────────────────────────────
const BLOBS = [
  { size: 220, color: COLORS.primary[500], opacity: 0.10, top: -40, left: -60, dur: 6000, dx: 18, dy: 24 },
  { size: 180, color: COLORS.primary[300], opacity: 0.08, top: 120, right: -50, dur: 8000, dx: -20, dy: 30 },
  { size: 140, color: COLORS.primary[500], opacity: 0.07, top: 340, left: 30, dur: 7000, dx: 25, dy: -18 },
  { size: 200, color: COLORS.primary[400], opacity: 0.09, bottom: 200, right: -30, dur: 9000, dx: -15, dy: -25 },
  { size: 120, color: COLORS.primary[500], opacity: 0.06, bottom: 80, left: 40, dur: 5500, dx: 20, dy: 20 },
];

function FloatingBlob({ blob }: { blob: typeof BLOBS[0] }) {
  const transX = useRef(new Animated.Value(0)).current;
  const transY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animX = Animated.loop(
      Animated.sequence([
        Animated.timing(transX, { toValue: blob.dx, duration: blob.dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(transX, { toValue: -blob.dx * 0.6, duration: blob.dur * 0.9, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(transX, { toValue: 0, duration: blob.dur * 0.7, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const animY = Animated.loop(
      Animated.sequence([
        Animated.timing(transY, { toValue: blob.dy, duration: blob.dur * 1.1, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(transY, { toValue: -blob.dy * 0.5, duration: blob.dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(transY, { toValue: 0, duration: blob.dur * 0.8, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    animX.start();
    animY.start();
    return () => { animX.stop(); animY.stop(); };
  }, []);

  const pos: any = {};
  if (blob.top !== undefined) pos.top = blob.top;
  if (blob.bottom !== undefined) pos.bottom = blob.bottom;
  if (blob.left !== undefined) pos.left = blob.left;
  if (blob.right !== undefined) pos.right = blob.right;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: blob.size,
          height: blob.size,
          borderRadius: blob.size / 2,
          backgroundColor: blob.color,
          opacity: blob.opacity,
          transform: [{ translateX: transX }, { translateY: transY }],
        },
        pos,
      ]}
    />
  );
}

const { width, height } = Dimensions.get('window');

const ORANGE = COLORS.primary[500];
const ORANGE_LIGHT = COLORS.primary[500] + '18';
const TOTAL_PAGES = 4;

// ── Service items for slide 2 ────────────────────────────────────────────────
const SERVICES = [
  { icon: 'hand-wave-outline', lib: 'mci', label: 'Pijat\nTradisional' },
  { icon: 'foot-print', lib: 'mci', label: 'Reflexology' },
  { icon: 'radiobox-marked', lib: 'mci', label: 'Shiatsu' },
  { icon: 'dumbbell', lib: 'mci', label: 'Deep Tissue' },
];

// ── Steps for slide 3 ────────────────────────────────────────────────────────
const STEPS = [
  { step: 1, icon: 'calendar-outline', label: 'Pilih Waktu', active: false },
  { step: 2, icon: 'location-outline', label: 'Tentukan Lokasi', active: false },
  { step: 3, icon: 'navigate-outline', label: 'Terapis Datang', active: true },
  { step: 4, icon: 'sparkles-outline', label: 'Nikmati Layanan', active: false },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [currentPage, setCurrentPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const finish = useCallback(async () => {
    await SecureStore.setItemAsync('onboarding_completed', 'true');
    router.replace('/home');
  }, [router]);

  const handleNext = useCallback(() => {
    if (currentPage < TOTAL_PAGES - 1) {
      const next = currentPage + 1;
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
      setCurrentPage(next);
    } else {
      finish();
    }
  }, [currentPage, finish]);

  const handleBack = useCallback(() => {
    if (currentPage > 0) {
      const prev = currentPage - 1;
      scrollRef.current?.scrollTo({ x: prev * width, animated: true });
      setCurrentPage(prev);
    }
  }, [currentPage]);

  const handleSkip = useCallback(() => finish(), [finish]);

  const onMomentumScrollEnd = (event: any) => {
    const page = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentPage(page);
  };

  const isFirst = currentPage === 0;
  const isLast = currentPage === TOTAL_PAGES - 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0F0F5" />

      {/* ── Animated floating background ── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {BLOBS.map((blob, i) => <FloatingBlob key={i} blob={blob} />)}
      </View>

      {/* ── Top Bar ── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        {!isFirst ? (
          <TouchableOpacity onPress={handleBack} style={styles.navBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#1a1a2e" />
          </TouchableOpacity>
        ) : (
          <View style={styles.navBtn} />
        )}
        <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
          <Text style={[styles.skipText, !isFirst && { color: ORANGE }]}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* ── Scrollable Pages ── */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onMomentumScrollEnd}
        bounces={false}
        scrollEnabled={false}
        style={{ flex: 1 }}
      >
        {/* ══ Slide 1: Hero ══════════════════════════════════════════════════ */}
        <View style={styles.page}>
          {/* Big rounded image */}
          <View style={styles.heroImageCard}>
            <Image
              source={require('../../assets/on-boarding01.jpeg')}
              style={styles.heroImage}
              resizeMode="cover"
            />
          </View>

          {/* Title & subtitle */}
          <View style={styles.heroTextBlock}>
            <Text style={styles.bigTitle}>Relaksasi di Ujung Jari</Text>
            <Text style={styles.bodyText}>
              Temukan ketenangan dan kenyamanan pijat profesional langsung di rumah Anda.
            </Text>
          </View>
        </View>

        {/* ══ Slide 2: Services Grid ════════════════════════════════════════ */}
        <View style={styles.page}>
          <Text style={styles.bigTitleslide2}>Berbagai Pilihan Layanan</Text>
          <Text style={[styles.bodyText, { marginBottom: 20 }]}>
            Dari pijat tradisional hingga refleksi, pilih layanan yang paling sesuai dengan
            kebutuhan Anda.
          </Text>

          {/* 2×2 grid */}
          <View style={styles.grid}>
            {SERVICES.map((svc, i) => (
              <View key={i} style={styles.serviceCard}>
                <View style={styles.serviceIconBg}>
                  <MaterialCommunityIcons
                    name={svc.icon as any}
                    size={26}
                    color={ORANGE}
                  />
                </View>
                <Text style={styles.serviceLabel}>{svc.label}</Text>
              </View>
            ))}
          </View>

          {/* Preview image */}
          <View style={styles.previewCard}>
            <Image
              source={require('../../assets/on-boarding02.jpeg')}
              style={styles.previewImage}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* ══ Slide 3: How It Works ═════════════════════════════════════════ */}
        <View style={styles.page}>
          {/* Steps */}
          <View style={styles.stepsBlock}>
            {STEPS.map((s, i) => (
              <View key={i} style={[styles.stepCard, s.active && styles.stepCardActive]}>
                <View style={[styles.stepIconBg, s.active && styles.stepIconBgActive]}>
                  <Ionicons
                    name={s.icon as any}
                    size={20}
                    color={s.active ? '#fff' : ORANGE}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stepSmall, s.active && { color: 'rgba(255,255,255,0.75)' }]}>
                    Langkah {s.step}
                  </Text>
                  <Text style={[styles.stepName, s.active && { color: '#fff' }]}>
                    {s.label}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={s.active ? '#fff' : '#ccc'} />
                {s.active && <View style={styles.activeDot} />}
              </View>
            ))}
          </View>

          {/* Therapist image */}
          <View style={styles.therapistCard}>
            <Image
              source={require('../../assets/on-boarding03.jpeg')}
              style={styles.therapistImage}
              resizeMode="cover"
            />
          </View>

          <Text style={[styles.bigTitle, { marginTop: 14 }]}>Pesan Terapis ke Rumah</Text>
          <Text style={styles.bodyText}>
            Pilih waktu, tentukan lokasi, dan terapis berpengalaman kami akan datang ke tempat Anda.
          </Text>
        </View>

        {/* ══ Slide 4: Get Started ══════════════════════════════════════════ */}
        <View style={[styles.page, { justifyContent: 'center', alignItems: 'center' }]}>
          <View style={styles.lastIconRing}>
            <Ionicons name="shield-checkmark" size={60} color={ORANGE} />
          </View>
          <Text style={[styles.bigTitle, { textAlign: 'center', marginTop: 24 }]}>
            Siap Memulai?
          </Text>
          <Text style={[styles.bodyText, { textAlign: 'center', marginBottom: 32 }]}>
            Bergabunglah dengan ribuan pelanggan puas yang sudah menikmati layanan pijat premium
            kami.
          </Text>


        </View>
      </ScrollView>

      {/* ── Footer ── */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        {/* Pagination dots */}
        <View style={styles.dotsRow}>
          {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentPage ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* CTA button */}
        <Button
          onPress={handleNext}
          variant="primary"
          size="lg"
          title={isFirst ? 'Mulai' : isLast ? 'Mulai Sekarang' : 'Lanjut'}
          icon={!isFirst ? <Ionicons name="arrow-forward" size={18} color="#fff" /> : undefined}
          style={{ borderRadius: 16 }}
        />
      </View>
    </View>
  );
}

const CARD_GAP = 12;
const SERVICE_CARD_W = (width - 40 - CARD_GAP) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F0F5',
  },

  // ─ Top bar ────────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    color: '#888',
  },

  // ─ Pages ──────────────────────────────────────────────────────────────────
  page: {
    width,
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  // ─ Slide 1 ────────────────────────────────────────────────────────────────
  heroImageCard: {
    borderRadius: 28,
    overflow: 'hidden',
    height: height * 0.42,
    backgroundColor: '#ddd',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroTextBlock: {
    marginTop: 28,
    alignItems: 'center',
    paddingHorizontal: 8,
  },

  // ─ Shared text ─────────────────────────────────────────────────────────────
  bigTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 24,
    color: '#1a1a2e',
    letterSpacing: -0.3,
    marginBottom: 8,
    marginTop: 20,
    textAlign: "center",
  },
  bodyText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#666',
    lineHeight: 21,
    textAlign: "center",
  },

  // ─ Slide 2 ────────────────────────────────────────────────────────────────
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
    marginBottom: 14,
  },
  serviceCard: {
    width: SERVICE_CARD_W,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 22,
    alignItems: 'center',
    gap: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  serviceIconBg: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#F0F0F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: '#1a1a2e',
    textAlign: 'center',
    lineHeight: 18,
  },

  bigTitleslide2: {
    fontFamily: FONTS.extraBold,
    fontSize: 24,
    color: '#1a1a2e',
    letterSpacing: -0.3,
    marginBottom: 8,
    // marginTop: 10,
    textAlign: "center",
  },
  previewCard: {
    borderRadius: 20,
    overflow: 'hidden',
    height: height * 0.42,
    backgroundColor: '#e0e0e8',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },

  // ─ Slide 3 ────────────────────────────────────────────────────────────────
  stepsBlock: {
    gap: 10,
    marginBottom: 12,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  stepCardActive: {
    backgroundColor: ORANGE,
    elevation: 6,
    shadowColor: ORANGE,
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  stepIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: ORANGE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIconBgActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  stepSmall: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: COLORS.primary[500],
    marginBottom: 1,
  },
  stepName: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: '#1a1a2e',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    position: 'absolute',
    right: 14,
    top: '50%',
    marginTop: -4,
  },
  therapistCard: {
    borderRadius: 20,
    overflow: 'hidden',
    height: height * 0.42,
    backgroundColor: '#ddd',
  },
  therapistImage: {
    width: '100%',
    height: '100%',
  },

  // ─ Slide 4 ────────────────────────────────────────────────────────────────
  lastIconRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: ORANGE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustList: {
    width: '100%',
    gap: 10,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },


  // ─ Footer ─────────────────────────────────────────────────────────────────
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: '#F0F0F5',
    gap: 12,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 28,
    backgroundColor: ORANGE,
  },
  dotInactive: {
    width: 8,
    backgroundColor: '#ccc',
  },
});

