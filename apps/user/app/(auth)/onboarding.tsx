import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  Dimensions, 
  FlatList, 
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
  StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, ArrowRight, ShieldCheck, Clock } from 'lucide-react-native';
import Button from '../../components/ui/Button';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/Theme';
import { useTheme } from '../../context/ThemeContext';

const { width, height } = Dimensions.get('window');

const PAGES = [
  {
    id: 1,
    title: 'Relaksasi Premium',
    subtitle: 'Terapis profesional datang langsung ke rumah Anda untuk pengalaman relaksasi terbaik.',
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800',
    icon: <Sparkles size={32} color={COLORS.gold[500]} />,
  },
  {
    id: 2,
    title: 'Terapis Terverifikasi',
    subtitle: 'Semua terapis kami bersertifikat dan telah melalui pemeriksaan latar belakang demi keamanan Anda.',
    image: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=800',
    icon: <ShieldCheck size={32} color={COLORS.gold[500]} />,
  },
  {
    id: 3,
    title: 'Jadwal Fleksibel',
    subtitle: 'Pesan sesi kapan saja dan di mana saja. Kami menghargai waktu dan kenyamanan Anda.',
    image: 'https://images.unsplash.com/photo-1519824145371-296894a0daa9?w=800',
    icon: <Clock size={32} color={COLORS.gold[500]} />,
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
    setActiveIndex(index);
  };

  const handleNext = () => {
    if (activeIndex < PAGES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1 });
    } else {
      router.push('/(auth)/login');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <FlatList
        ref={flatListRef}
        data={PAGES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        renderItem={({ item }) => (
          <View style={styles.page}>
            <Image source={{ uri: item.image }} style={styles.image} />
            <LinearGradient
              colors={['transparent', isDark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(255, 255, 255, 0.5)', theme.background]}
              style={styles.gradient as any}
            />
            <View style={styles.content}>
              <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(253, 185, 39, 0.1)' : 'rgba(253, 185, 39, 0.05)', borderColor: 'rgba(253, 185, 39, 0.2)' }]}>
                {item.icon}
              </View>
              <Text style={[styles.title, { color: theme.text }]}>{item.title}</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{item.subtitle}</Text>
            </View>
          </View>
        )}
        keyExtractor={(item) => item.id.toString()}
      />

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {PAGES.map((_, index) => (
            <View 
              key={index} 
              style={[
                styles.dot, 
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(15, 23, 42, 0.1)' },
                activeIndex === index && { backgroundColor: COLORS.gold[500], width: 24 }
              ]} 
            />
          ))}
        </View>

        <TouchableOpacity 
          style={styles.nextButton}
          onPress={handleNext}
        >
          <LinearGradient
            colors={[COLORS.primary[500], COLORS.primary[700]]}
            style={styles.nextGradient as any}
          >
            <ArrowRight size={24} color="white" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  page: {
    width,
    height,
  },
  image: {
    width,
    height: height * 0.7,
    position: 'absolute',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: height * 0.6,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 32,
    paddingBottom: 160,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
  },
  title: {
    ...TYPOGRAPHY.h1,
    fontSize: 36,
    lineHeight: 44,
    marginBottom: 16,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    lineHeight: 24,
    fontSize: 18,
  },
  footer: {
    position: 'absolute',
    bottom: 48,
    left: 32,
    right: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pagination: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: COLORS.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  nextGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
