import { useState, useRef } from 'react';
import { useThemeColors } from '@/store/themeStore';
import {
  View, Text, StyleSheet, FlatList, Animated,
  TouchableOpacity, useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/constants/Theme';

const slides = [
  {
    id: '1',
    title: 'Terima Pesanan\nKapan Saja',
    subtitle: 'Kelola jadwal Anda sendiri. Aktifkan status online dan mulai menerima pelanggan baru.',
    icon: 'calendar-outline',
    color: '#F97316',
    bg: ['#1E3A8A', '#1E40AF'] as const,
  },
  {
    id: '2',
    title: 'Pantau Pendapatan\nSecara Real-Time',
    subtitle: 'Lihat setiap transaksi, penarikan, dan riwayat penghasilan Anda dalam satu tempat.',
    icon: 'cash-outline',
    color: '#10B981',
    bg: ['#0F172A', '#1E293B'] as const,
  },
  {
    id: '3',
    title: 'Navigasi Mudah\nke Pelanggan',
    subtitle: 'Dapatkan peta lokasi pelanggan langsung di aplikasi. Perjalanan lebih efisien.',
    icon: 'navigate-outline',
    color: '#3B82F6',
    bg: ['#0F172A', '#0F172A'] as const,
  },
];

export default function OnboardingScreen() {
  const t = useThemeColors();
  const styles = getStyles(t);
  const { width } = useWindowDimensions();
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const goNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      router.replace('/(auth)/login');
    }
  };

  const skip = () => router.replace('/(auth)/login');

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor={slides[currentIndex].bg[0]} />
      <Animated.FlatList
        ref={flatListRef}
        data={slides}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: false,
        })}
        onMomentumScrollEnd={(e) => {
          setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
        renderItem={({ item }) => (
          <LinearGradient colors={item.bg} style={[styles.slide, { width }]}>
            <TouchableOpacity style={styles.skipBtn} onPress={skip}>
              <Text style={styles.skipText}>Lewati</Text>
            </TouchableOpacity>

            <View style={[styles.iconWrap, { borderColor: item.color + '40' }]}>
              <LinearGradient
                colors={[item.color, item.color + 'AA']}
                style={styles.iconCircle}
              >
                <Ionicons name={item.icon as any} size={64} color="#FFFFFF" />
              </LinearGradient>
              <View style={[styles.glow, { backgroundColor: item.color + '20', shadowColor: item.color }]} />
            </View>

            <View style={styles.textWrap}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>
          </LinearGradient>
        )}
      />

      <View style={styles.bottom}>
        <View style={styles.dots}>
          {slides.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 28, 8],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.4, 1, 0.4],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  { width: dotWidth, opacity, backgroundColor: '#FFFFFF' },
                ]}
              />
            );
          })}
        </View>

        <TouchableOpacity onPress={goNext} activeOpacity={0.85}>
          <LinearGradient colors={['#F97316', '#EA580C']} style={styles.btn}>
            <Text style={styles.btnText}>
              {currentIndex === slides.length - 1 ? 'Mulai Sekarang' : 'Lanjut'}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getStyles = (t: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xl },
  skipBtn: { position: 'absolute', top: 56, right: SPACING.lg, padding: SPACING.sm },
  skipText: { ...TYPOGRAPHY.body, color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter_400Regular' },
  iconWrap: {
    width: 200, height: 200, borderRadius: 100, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xxl,
  },
  iconCircle: {
    width: 160, height: 160, borderRadius: 80,
    alignItems: 'center', justifyContent: 'center',
  },
  glow: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 40, elevation: 20,
  },
  textWrap: { alignItems: 'center' },
  title: { ...TYPOGRAPHY.h2, color: '#FFFFFF', textAlign: 'center', marginBottom: SPACING.md, fontFamily: 'Inter_700Bold' },
  subtitle: {
    ...TYPOGRAPHY.body, color: 'rgba(255,255,255,0.8)',
    textAlign: 'center', lineHeight: 24, fontFamily: 'Inter_400Regular'
  },
  bottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: SPACING.xl, paddingBottom: 48, paddingTop: SPACING.lg,
    alignItems: 'center', gap: SPACING.lg,
  },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { height: 8, borderRadius: 4 },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 40, paddingVertical: 16, borderRadius: RADIUS.full,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 10,
  },
  btnText: { ...TYPOGRAPHY.h4, color: '#FFFFFF', fontFamily: 'Inter_600SemiBold' },
});
