import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  StatusBar,
  Dimensions,
  Animated,
  Modal,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import {
  Bell,
  MapPin,
  Wallet,
  ChevronRight,
  Star,
  X,
  Clock,
  Flame,
  LayoutGrid,
  BookOpen,
  Heart,
  Activity,
  Sun,
  Smile,
  Droplets,
  Search,
} from 'lucide-react-native';
import { useServices } from '@/hooks/useServices';
import { useBanners } from '@/hooks/useBanners';
import { useLocation } from '@/context/LocationContext';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { titleCase } from '@/lib/utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const REC_CARD_WIDTH = 152;
const WHY_CARD_WIDTH = Math.floor((SCREEN_WIDTH - 72) / 2);

const ORANGE = '#FF6B2C';
const ORANGE_SOFT = '#FFF1E8';
const TEXT_DARK = '#1A1A2E';
const TEXT_MUTED = '#6B7280';
const BG = '#F5F5F7';
const CARD_BG = '#FFFFFF';
const BORDER = '#EFEFEF';
const PURPLE = '#240080';
const PURPLE_SOFT = '#F3E8FF';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── (No hardcoded BANNERS — fetched from DB) ───────────────────────────────────

// ─── Service Data ──────────────────────────────────────────────────────────────
const HOME_SERVICES = [
  {
    id: 'pijat-full-body',
    name: 'Pijat Full Body',
    price: 170000,
    description: 'Pijatan menyeluruh dari kepala hingga kaki untuk relaksasi total',
    badge: { label: 'Populer', type: 'popular' as const },
  },
  {
    id: 'bekam',
    name: 'Bekam',
    price: 170000,
    description: 'Terapi pengeluaran racun untuk meningkatkan sistem imun tubuh',
    badge: { label: '% Diskon', type: 'discount' as const },
  },
  {
    id: 'shiatsu-japan',
    name: 'Shiatsu Japan',
    price: 190000,
    description: 'Teknik penekanan titik saraf tanpa minyak ala Jepang',
  },
  {
    id: 'pijat-ibu-hamil',
    name: 'Pijat Ibu Hamil',
    price: 150000,
    description: 'Teknik pijat aman khusus untuk ibu hamil',
  },
];

const formatRupiah = (value: number) =>
  `Rp ${value.toLocaleString('id-ID')}`;

// ─── Category Data ─────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: '1', name: 'Body Massage', icon: 'Heart', color: '#6A0DAD', bg: '#F0E8FF' },
  { id: '2', name: 'Bekam', icon: 'Droplets', color: '#DC2626', bg: '#FFE8E8' },
  { id: '3', name: 'Refleksi', icon: 'Activity', color: '#059669', bg: '#E8FFF0' },
  { id: '4', name: 'Shiatsu', icon: 'Sun', color: '#2563EB', bg: '#E8F0FF' },
  { id: '5', name: 'Ibu Hamil', icon: 'Heart', color: '#D97706', bg: '#FFF8E8' },
  { id: '6', name: 'Anak', icon: 'Smile', color: '#7C3AED', bg: '#F3E8FF' },
];

// ─── How It Works Data ─────────────────────────────────────────────────────────
const HOW_IT_WORKS = [
  { id: '1', title: 'Pilih Layanan', desc: 'Telusuri & pilih layanan pijat yang kamu butuhkan', bg: '#F5F3FF', color: '#7C3AED', icon: 'Search' },
  { id: '2', title: 'Terapis Datang', desc: 'Konfirmasi, lalu terapis kami datang ke lokasi kamu', bg: '#EFF6FF', color: '#3B82F6', icon: 'MapPin' },
  { id: '3', title: 'Nikmati Relaksasi', desc: 'Duduk santai dan nikmati pijatan profesional', bg: '#ECFDF5', color: '#10B981', icon: 'Heart' },
];

// ─── Why Us Data ───────────────────────────────────────────────────────────────
const WHY_US = [
  { id: '1', title: 'Terapis Tersertifikasi', desc: 'Berpengalaman & profesional', icon: 'Star', bg: '#FFFBEB', iconBg: '#F59E0B' },
  { id: '2', title: 'Harga Transparan', desc: 'Tanpa biaya tersembunyi', icon: 'Wallet', bg: '#ECFDF5', iconBg: '#10B981' },
  { id: '3', title: 'Layanan Door-to-Door', desc: 'Datang ke rumah atau hotel', icon: 'MapPin', bg: '#EFF6FF', iconBg: '#3B82F6' },
  { id: '4', title: 'Proses Cepat', desc: 'Pesan dalam hitungan menit', icon: 'Flame', bg: '#FFF7ED', iconBg: '#F97316' },
];

// ─── Banner Slideshow ──────────────────────────────────────────────────────────
function BannerSlideshow({ banners }: { banners: any[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<Animated.ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const SLIDE_HEIGHT = 150;

  useEffect(() => {
    if (!banners.length) return;
    const interval = setInterval(() => {
      const nextIndex = (activeIndex + 1) % banners.length;
      scrollRef.current?.scrollTo({ y: nextIndex * (SLIDE_HEIGHT + 10), animated: true });
      setActiveIndex(nextIndex);
    }, 3500);
    return () => clearInterval(interval);
  }, [activeIndex, banners.length]);

  const onMomentumScrollEnd = (e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.y / (SLIDE_HEIGHT + 10));
    setActiveIndex(index);
  };

  return (
    <View style={bannerStyles.wrapper}>
      <Animated.ScrollView
        ref={scrollRef as any}
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={SLIDE_HEIGHT + 10}
        snapToAlignment="start"
        style={{ height: SLIDE_HEIGHT + 10 }}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      >
        {banners.map((item) => (
          <View key={item.id} style={[bannerStyles.slide, { height: SLIDE_HEIGHT, marginBottom: 10 }]}>
            <Image source={{ uri: item.image_url }} style={bannerStyles.image} />
            <View style={bannerStyles.overlay} />
            {item.badge ? (
              <View style={bannerStyles.badgePill}>
                <Text style={bannerStyles.badgeText}>{item.badge}</Text>
              </View>
            ) : null}
            <View style={bannerStyles.textBlock}>
              <Text style={bannerStyles.slideTitle}>{item.title}</Text>
              {item.subtitle ? (
                <Text style={bannerStyles.slideSubtitle}>{item.subtitle}</Text>
              ) : null}
            </View>
          </View>
        ))}
      </Animated.ScrollView>
      {banners.length > 1 && (
        <View style={bannerStyles.dots}>
          {banners.map((_, i) => (
            <View
              key={i}
              style={[
                bannerStyles.dot,
                i === activeIndex ? bannerStyles.dotActive : null,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Home Screen ───────────────────────────────────────────────────────────────
import { useAuth } from '@/context/AuthContext';

export default function HomeScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { isAuthenticated, user, profile, refreshProfile } = useAuth();
  const { data: services, isLoading } = useServices();
  const { data: banners, isLoading: bannersLoading } = useBanners();
  const { address, isLoading: isLocLoading, refreshLocation } = useLocation();

  const [floatingOrder, setFloatingOrder] = useState<any>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [walletExpanded, setWalletExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const walletAnim = useRef(new Animated.Value(0)).current;
  const walletIconScale = walletAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1.56, 1],
  });
  const walletTextOpacity = walletAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const stepScrollRef = useRef<ScrollView>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refreshProfile(),
      refreshLocation(),
      fetchFloatingOrder(),
    ]);
    setRefreshing(false);
  }, [profile?.id]);

  const handleWalletPress = () => {
    if (walletExpanded) {
      handleProtectedAction('/wallet');
    } else {
      Animated.timing(walletAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setWalletExpanded(true);
    }
  };

  useEffect(() => {
    if (!walletExpanded) return;
    const timer = setTimeout(() => {
      Animated.timing(walletAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setWalletExpanded(false);
      });
    }, 5000);
    return () => clearTimeout(timer);
  }, [walletExpanded]);
  const [activeStep, setActiveStep] = useState(0);
  const [popularIds, setPopularIds] = useState<Set<string>>(new Set());
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [modalName, setModalName] = useState('');
  const [modalGender, setModalGender] = useState<'L' | 'P' | ''>('');
  const [modalSaving, setModalSaving] = useState(false);
  const profileModalShownRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (profile && !profile.gender && !profileModalShownRef.current) {
        profileModalShownRef.current = true;
        setModalName(profile.full_name || '');
        setShowProfileModal(true);
      }
    }, [profile])
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from('orders')
        .select('service_id')
        .eq('status', 'completed');
      if (!mounted || !data) return;
      const countMap = new Map<string, number>();
      data.forEach((o) => {
        countMap.set(o.service_id, (countMap.get(o.service_id) || 0) + 1);
      });
      const top4 = [...countMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([id]) => id);
      setPopularIds(new Set(top4));
    })();
    return () => { mounted = false; };
  }, []);

  const displayPopular = useMemo(() => {
    if (!services) return [];
    const popular = services.filter((s) => popularIds.has(s.id));
    if (popular.length === 0) return services.slice(4, 8);
    const rest = services.filter((s) => !popularIds.has(s.id));
    return [...popular, ...rest].slice(0, 4);
  }, [services, popularIds]);

  const fetchFloatingOrder = async () => {
    if (!profile?.id) {
      setFloatingOrder(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          service:services(*),
          therapist:therapists(*)
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      const found = data?.find((order: any) => {
        const isOngoing = order.status !== 'completed' && order.status !== 'cancelled';
        const isUnrated = order.status === 'completed' && !order.rating;
        return isOngoing || isUnrated;
      });
      
      setFloatingOrder((prev: any) => {
        if (prev?.id !== found?.id || prev?.status !== found?.status) {
          setIsDismissed(false);
        }
        return found || null;
      });
    } catch (e) {
      console.error('Error fetching floating order:', e);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      refreshProfile();
      refreshLocation();
      if (profile?.id) {
        fetchFloatingOrder();
      }
    }, [profile?.id])
  );

  useEffect(() => {
    if (!profile?.id) {
      setFloatingOrder(null);
      return;
    }
    
    fetchFloatingOrder();

    const uniqueChannelId = `user_orders_home_${profile.id}_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(uniqueChannelId)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `user_id=eq.${profile.id}`
      }, () => {
        console.log('[DEBUG Home] Order changed, refetching floating order...');
        fetchFloatingOrder();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  // Auto-slide Cara Pesan
  const stepWidth = SCREEN_WIDTH - 60;
  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex = (activeStep + 1) % HOW_IT_WORKS.length;
      stepScrollRef.current?.scrollTo({ x: nextIndex * stepWidth, animated: true });
      setActiveStep(nextIndex);
    }, 3000);
    return () => clearInterval(interval);
  }, [activeStep]);

  const getFloatingStatusInfo = (ord: any) => {
    if (ord.status === 'completed' && !ord.rating) {
      return {
        title: 'Pesanan Selesai!',
        subtitle: 'Bagaimana pijatan terapis? Berikan rating & ulasan Anda.',
        actionText: 'Beri Nilai',
        color: '#00A896',
        isUnrated: true,
      };
    }
    
    let title = 'Pesanan Aktif';
    let subtitle = 'Ketuk untuk detail pelacakan.';
    let color = '#240080';
    
    switch (ord.status) {
      case 'pending':
        if (ord.scheduled_at) {
          const dateObj = new Date(ord.scheduled_at);
          const timeString = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          const dateString = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
          title = 'Pijat Terjadwal';
          subtitle = `Jadwal untuk ${dateString} pukul ${timeString}`;
          color = '#8B5CF6';
        } else if (ord.payment_status !== 'paid' && ord.payment_method !== 'tunai' && ord.payment_data) {
          title = 'Menunggu Pembayaran';
          subtitle = 'Selesaikan pembayaran untuk memproses pesanan Anda.';
          color = '#FDB927';
        } else {
          title = 'Mencari Terapis';
          subtitle = 'Sedang mencarikan terapis terbaik untuk Anda.';
          color = '#FDB927';
        }
        break;
      case 'accepted':
        title = 'Pesanan Diterima';
        subtitle = ord.therapist?.full_name ? `Terapis: ${ord.therapist.full_name}` : 'Terapis telah ditugaskan.';
        color = '#240080';
        break;
      case 'on_the_way':
      case 'on_way':
        title = 'Terapis Menuju Lokasi';
        subtitle = ord.therapist?.full_name ? `${ord.therapist.full_name} sedang dalam perjalanan.` : 'Terapis sedang menuju ke lokasi Anda.';
        color = '#240080';
        break;
      case 'arrived':
        title = 'Terapis Tiba';
        subtitle = ord.therapist?.full_name ? `${ord.therapist.full_name} sudah sampai di lokasi.` : 'Terapis telah sampai di lokasi Anda.';
        color = '#00A896';
        break;
      case 'in_progress':
      case 'processing':
        title = 'Sedang Terapi';
        subtitle = 'Sesi pijat sedang berlangsung. Nikmati relaksasi Anda.';
        color = '#00A896';
        break;
    }
    
    return {
      title,
      subtitle,
      actionText: 'Lacak',
      color,
      isUnrated: false,
    };
  };

  const handleFloatingCardPress = (ord: any) => {
    if (ord.status === 'completed' && !ord.rating) {
      router.push({ pathname: '/tracking', params: { id: ord.id } });
      return;
    }
    
    if (ord.status === 'pending') {
      if (ord.scheduled_at) {
        router.push({ pathname: '/tracking', params: { id: ord.id } });
      } else if (ord.payment_status !== 'paid' && ord.payment_method !== 'tunai' && ord.payment_data) {
        router.push({
          pathname: '/payment-details',
          params: { data: JSON.stringify(ord.payment_data), order_id: ord.id }
        });
      } else {
        router.push({ pathname: '/searching-therapist', params: { id: ord.id } });
      }
    } else {
      router.push({ pathname: '/tracking', params: { id: ord.id } });
    }
  };

  const handleProtectedAction = (pathname: string, params?: any) => {
    if (!isAuthenticated) {
      router.push('/login');
    } else {
      router.push({ pathname: pathname as any, params });
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'Selamat Pagi';
    if (hour >= 11 && hour < 15) return 'Selamat Siang';
    if (hour >= 15 && hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const saveProfileModal = async () => {
    if (!modalName.trim()) return;
    if (!modalGender) return;
    setModalSaving(true);
    try {
      await supabase.from('users').update({
        full_name: modalName.trim(),
        gender: modalGender,
      }).eq('id', profile?.id);
      setShowProfileModal(false);
      await refreshProfile();
    } catch {}
    setModalSaving(false);
  };

  return (
    <>
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        stickyHeaderIndices={[1]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[PURPLE]}
            tintColor={PURPLE}
          />
        }
      >
        {/* ── Header brand ── */}
        <View style={styles.brandRow}>
          <View style={styles.brandLeft}>
            <View style={styles.logoMark}>
              <Image
                source={require('../../../assets/logo-kang-massage.png')}
                style={styles.logoImage}
              />
            </View>
            <Text style={styles.brandName}>Kang Massage</Text>
          </View>
            <TouchableOpacity 
              style={[styles.bellButton, { backgroundColor: '#F3E8FF' }]} 
              activeOpacity={0.85}
              onPress={() => handleProtectedAction('/notifications')}
            >
              <Bell size={18} color={PURPLE} />
            </TouchableOpacity>
        </View>

        {/* ── Sticky User Header ── */}
        <View style={styles.stickyHeader}>
          <View style={styles.userRow}>
            <View style={styles.userCard}>
              <View style={[styles.avatar, !isAuthenticated && { backgroundColor: TEXT_MUTED }, { overflow: 'hidden' }]}>
                {isAuthenticated && profile?.avatar_url ? (
                  <Image
                    source={{ uri: profile.avatar_url }}
                    style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                  />
                ) : (
                  <Text style={styles.avatarText}>
                    {isAuthenticated ? getInitials(profile?.full_name || user?.email || 'User') : 'G'}
                  </Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.greetingSmall}>{getGreeting()} 👋</Text>
                <Text style={styles.greetingName}>
                  {isAuthenticated ? (profile?.full_name || 'User') : 'Tamu'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={walletExpanded ? styles.walletBtn : styles.circleAction}
              activeOpacity={0.85}
              onPress={handleWalletPress}
            >
              <Animated.View style={{ transform: [{ scale: walletIconScale }] }}>
                <Wallet size={16} color="#FFFFFF" />
              </Animated.View>
              {walletExpanded && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Animated.View style={{ opacity: walletTextOpacity }}>
                    <Text style={styles.walletBtnLabel}>Saldo</Text>
                    <Text style={styles.walletBtnText}>
                      {isAuthenticated && profile?.wallet_balance != null
                        ? `Rp ${Number(profile.wallet_balance).toLocaleString('id-ID')}`
                        : 'Rp 0'}
                    </Text>
                  </Animated.View>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Location ── */}
        <TouchableOpacity 
          activeOpacity={0.75}
          onPress={() => handleProtectedAction('/maps', { from: 'home' })}
          style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 16 }}
        >
          <MapPin size={16} color={PURPLE} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.locationLabel}>Lokasi saat ini</Text>
            <Text style={styles.locationText} numberOfLines={1}>
              {isLocLoading ? 'Mencari lokasi...' : address}
            </Text>
          </View>
          <ChevronRight size={14} color={TEXT_MUTED} />
        </TouchableOpacity>

        {/* ── Banner Slideshow ── */}
        {bannersLoading ? (
          <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
            <Skeleton width="100%" height={140} borderRadius={20} />
          </View>
        ) : (
          <BannerSlideshow banners={banners || []} />
        )}

        {/* ── Cara Pesan ── */}
        <View style={styles.stepsSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionIconBox, { backgroundColor: '#7C3AED' }]}>
                <BookOpen size={14} color="#FFFFFF" />
              </View>
              <Text style={styles.sectionTitle}>Cara Pesan</Text>
              <View style={[styles.sectionBadge, { backgroundColor: '#7C3AED' }]}>
                <Text style={styles.sectionBadgeText}>3 Langkah</Text>
              </View>
            </View>
          </View>
          <ScrollView
            ref={stepScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stepsScroll}
            snapToInterval={stepWidth}
            decelerationRate="fast"
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / stepWidth);
              setActiveStep(idx);
            }}
          >
            {HOW_IT_WORKS.map((step) => {
              const StepIcon = step.icon === 'Search' ? Search : step.icon === 'MapPin' ? MapPin : Heart;
              return (
                <View key={step.id} style={[styles.stepCard, { backgroundColor: step.bg, overflow: 'hidden' }]}>
                  <View style={[styles.stepOrb, { backgroundColor: step.color + '15' }]} />
                  <View style={[styles.stepOrbSmall, { backgroundColor: step.color + '20', top: 20, right: 20 }]} />
                  <View style={[styles.stepOrbSmall, { backgroundColor: step.color + '15', bottom: 30, left: 10, width: 20, height: 20 }]} />
                  <View style={[styles.stepNum, { backgroundColor: step.color }]}>
                    <StepIcon size={22} color="#FFFFFF" />
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>{step.title}</Text>
                    <Text style={styles.stepDesc}>{step.desc}</Text>
                  </View>
                  <View style={[styles.stepBadge, { backgroundColor: step.color + '20' }]}>
                    <Text style={[styles.stepBadgeText, { color: step.color }]}>{step.id}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Kategori Layanan ── */}
        <View style={styles.catSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionIconBox, { backgroundColor: '#3B82F6' }]}>
                <LayoutGrid size={14} color="#FFFFFF" />
              </View>
              <Text style={styles.sectionTitle}>Kategori Layanan</Text>
              <View style={[styles.sectionBadge, { backgroundColor: '#2563EB' }]}>
                <Text style={styles.sectionBadgeText}>Jelajahi</Text>
              </View>
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catScroll}
          >
            {CATEGORIES.map((cat) => {
              const IconComp = cat.icon === 'Heart' ? Heart : cat.icon === 'Droplets' ? Droplets : cat.icon === 'Activity' ? Activity : cat.icon === 'Sun' ? Sun : Smile;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.catItem}
                  activeOpacity={0.75}
                  onPress={() => handleProtectedAction('/services')}
                >
                  <View style={[styles.catCircle, { backgroundColor: cat.bg }]}>
                    <IconComp size={22} color={cat.color} />
                  </View>
                  <Text style={styles.catLabel}>{cat.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Rekomendasi section ── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionIconBox, { backgroundColor: '#240080' }]}>
              <Star size={14} color="#FFFFFF" fill="#FFFFFF" />
            </View>
            <Text style={styles.sectionTitle}>Rekomendasi</Text>
              <View style={[styles.sectionBadge, { backgroundColor: '#10B981' }]}>
                <Text style={styles.sectionBadgeText}>Rekomendasi</Text>
              </View>
            </View>
          <TouchableOpacity onPress={() => handleProtectedAction('/services')}>
            <Text style={styles.seeAll}>Lihat Semua</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recScroll}
        >
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <View key={i} style={[styles.recCard, { width: REC_CARD_WIDTH }]}>
                <Skeleton width="100%" height={110} borderRadius={0} />
                <View style={styles.gridCardBody}>
                  <Skeleton width="85%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
                  <Skeleton width="50%" height={12} borderRadius={4} style={{ marginBottom: 4 }} />
                  <Skeleton width="100%" height={10} borderRadius={4} style={{ marginBottom: 8 }} />
                  <Skeleton width="50%" height={26} borderRadius={13} />
                </View>
              </View>
            ))
          ) : (
              [...(services || [])].sort((a, b) => {
                const pa = a.duration_options?.[0]?.price || a.price || 0;
                const pb = b.duration_options?.[0]?.price || b.price || 0;
                return pb - pa;
              }).slice(0, 7).map((service) => (
                <TouchableOpacity
                  key={service.id}
                  style={[styles.recCard, { width: REC_CARD_WIDTH }]}
                  activeOpacity={0.85}
                  onPress={() =>
                    handleProtectedAction('/order', { serviceId: service.id, from: 'home' })
                  }
                >
                  <Image
                    source={service.image ? { uri: service.image } : require('@/assets/icon-km.png')}
                    style={styles.gridCardImage}
                  />
                  <View style={styles.gridCardBody}>
                    <Text style={[styles.gridCardName, { color: '#1E1B4B' }]}>
                      {service.name}
                    </Text>
                    <Text style={[styles.gridCardPrice, { color: '#240080' }]}>
                      Mulai {formatRupiah(service.duration_options?.[0]?.price || service.price)}
                    </Text>
                    <Text style={[styles.gridCardDesc, { color: '#6B7280' }]} numberOfLines={2}>
                      {service.description}
                    </Text>
                    <View style={styles.recCardBtn}>
                      <Text style={styles.recCardBtnText}>Pilih</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )))
          }
        </ScrollView>

        {/* ── Banyak Dipesan section ── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionIconBox, { backgroundColor: '#240080' }]}>
              <Flame size={14} color="#FFFFFF" fill="#FFFFFF" />
            </View>
            <Text style={styles.sectionTitle}>Banyak Dipesan</Text>
              <View style={[styles.sectionBadge, { backgroundColor: '#F97316' }]}>
                <Text style={styles.sectionBadgeText}>Populer</Text>
              </View>
            </View>
          <TouchableOpacity onPress={() => handleProtectedAction('/services')}>
            <Text style={styles.seeAll}>Lihat Semua</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <View key={i} style={styles.gridCardWrapper}>
                <View style={styles.gridCard}>
                  <Skeleton width="100%" height={110} borderRadius={0} />
                  <View style={styles.gridCardBody}>
                    <Skeleton width="85%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
                    <Skeleton width="50%" height={12} borderRadius={4} style={{ marginBottom: 4 }} />
                    <Skeleton width="100%" height={10} borderRadius={4} style={{ marginBottom: 8 }} />
                    <Skeleton width="50%" height={26} borderRadius={13} />
                  </View>
                </View>
              </View>
            ))
          ) : (
              displayPopular.map((service) => (
                <View key={service.id} style={styles.gridCardWrapper}>
                  <TouchableOpacity
                    style={styles.gridCard}
                    activeOpacity={0.85}
                    onPress={() =>
                      handleProtectedAction('/order', { serviceId: service.id, from: 'home' })
                    }
                  >
                    <Image
                      source={service.image ? { uri: service.image } : require('@/assets/icon-km.png')}
                      style={styles.gridCardImage}
                    />
                    <View style={styles.gridCardBody}>
                      <Text style={styles.gridCardName}>
                        {service.name}
                      </Text>
                      <Text style={styles.gridCardPrice}>
                        Mulai {formatRupiah(service.duration_options?.[0]?.price || service.price)}
                      </Text>
                      <Text style={styles.gridCardDesc} numberOfLines={2}>
                        {service.description}
                      </Text>
                      <View style={styles.recCardBtn}>
                        <Text style={styles.recCardBtnText}>Pilih</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              )))
          }
        </View>

        {/* ── Mengapa Pilih Kami ── */}
        <View style={styles.whySection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionIconBox, { backgroundColor: '#10B981' }]}>
                <Star size={14} color="#FFFFFF" fill="#FFFFFF" />
              </View>
              <Text style={styles.sectionTitle}>Mengapa Pilih Kami</Text>
              <View style={[styles.sectionBadge, { backgroundColor: '#059669' }]}>
                <Text style={styles.sectionBadgeText}>Terpercaya</Text>
              </View>
            </View>
          </View>
          <View style={styles.whyGrid}>
            {WHY_US.map((item) => {
              const IconComp = item.icon === 'Star' ? Star : item.icon === 'Wallet' ? Wallet : item.icon === 'MapPin' ? MapPin : Flame;
              return (
                <View key={item.id} style={[styles.whyCard, { backgroundColor: item.bg }]}>
                  <View style={[styles.whyIconBox, { backgroundColor: item.iconBg + '20' }]}>
                    <IconComp size={18} color={item.iconBg} />
                  </View>
                  <Text style={styles.whyTitle}>{item.title}</Text>
                  <Text style={styles.whyDesc}>{item.desc}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Floating Order / Review Card */}
      {floatingOrder && !isDismissed && (
        <View style={[styles.floatingCard, isDark && styles.floatingCardDark]}>
          <TouchableOpacity 
            style={[styles.floatingCloseBtn, isDark && { backgroundColor: '#1E293B', borderColor: 'rgba(255,255,255,0.08)' }]} 
            onPress={() => setIsDismissed(true)}
            activeOpacity={0.8}
          >
            <X size={14} color={isDark ? '#FFFFFF' : '#6B7280'} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
            onPress={() => handleFloatingCardPress(floatingOrder)}
            activeOpacity={0.9}
          >
            <View style={[styles.floatingLeft, { backgroundColor: getFloatingStatusInfo(floatingOrder).color + '15' }]}>
              {getFloatingStatusInfo(floatingOrder).isUnrated ? (
                <Star size={24} color={getFloatingStatusInfo(floatingOrder).color} fill={getFloatingStatusInfo(floatingOrder).color} />
              ) : (
                <Clock size={24} color={getFloatingStatusInfo(floatingOrder).color} />
              )}
            </View>
            
            <View style={styles.floatingCenter}>
              <Text style={[styles.floatingTitle, isDark && { color: '#FFFFFF' }]} numberOfLines={1}>
                {getFloatingStatusInfo(floatingOrder).title}
              </Text>
              <Text style={[styles.floatingSubtitle, isDark && { color: 'rgba(255,255,255,0.6)' }]} numberOfLines={2}>
                {getFloatingStatusInfo(floatingOrder).subtitle}
              </Text>
            </View>
            
            <View style={styles.floatingRight}>
              <View style={[styles.floatingBtn, { backgroundColor: getFloatingStatusInfo(floatingOrder).color }]}>
                <Text style={styles.floatingBtnText}>
                  {getFloatingStatusInfo(floatingOrder).actionText}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>

      {/* ── Profile completion modal ── */}
      <Modal visible={showProfileModal} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Lengkapi Profil</Text>
            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>Isi nama dan jenis kelamin untuk melanjutkan</Text>

            <Text style={[styles.modalLabel, { color: theme.text }]}>Nama Lengkap</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.surfaceVariant, color: theme.text, borderColor: theme.border }]}
              value={modalName}
              onChangeText={setModalName}
              placeholder="Nama lengkap"
              placeholderTextColor={theme.textSecondary}
            />

            <Text style={[styles.modalLabel, { color: theme.text }]}>Jenis Kelamin</Text>
            <View style={styles.modalGenderRow}>
              <TouchableOpacity
                style={[styles.modalGenderBtn, { borderColor: theme.border }, modalGender === 'L' && styles.modalGenderActive]}
                onPress={() => setModalGender('L')}
              >
                <Text style={[styles.modalGenderText, { color: theme.text }, modalGender === 'L' && styles.modalGenderTextActive]}>Laki-laki</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalGenderBtn, { borderColor: theme.border }, modalGender === 'P' && styles.modalGenderActive]}
                onPress={() => setModalGender('P')}
              >
                <Text style={[styles.modalGenderText, { color: theme.text }, modalGender === 'P' && styles.modalGenderTextActive]}>Perempuan</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, { opacity: (!modalName.trim() || !modalGender) ? 0.5 : 1 }]}
              onPress={saveProfileModal}
              disabled={!modalName.trim() || !modalGender || modalSaving}
            >
              <Text style={styles.modalSubmitText}>{modalSaving ? 'Menyimpan...' : 'Simpan'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </>
  );
}

// ─── Banner Styles ─────────────────────────────────────────────────────────────
const bannerStyles = StyleSheet.create({
  wrapper: {
    marginBottom: 20,
  },
  slide: {
    width: SCREEN_WIDTH - 32,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(36,0,128,0.35)',
  },
  badgePill: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: ORANGE,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: 1,
  },
  textBlock: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  slideTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 2,
  },
  slideSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Regular',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
  },
  dotActive: {
    width: 22,
    height: 6,
    borderRadius: 3,
    backgroundColor: PURPLE,
  },
});

// ─── Main Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  scrollContent: {
    paddingTop: 5,
    paddingHorizontal: 16,
  },

  // Brand
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  brandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoMark: {
    width: 32,
    height: 32,
  },
  logoImage: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  brandName: {
    fontSize: 25,
    fontFamily: 'PlusJakartaSans-Bold',
    color: PURPLE,
  },
  bellButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },

  // Sticky Header Wrapper
  stickyHeader: {
    backgroundColor: BG,
    paddingVertical: 10,
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 32,
    padding: 6,
    paddingRight: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarText: {
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 14,
  },
  greetingSmall: {
    fontSize: 11,
    color: TEXT_MUTED,
    fontFamily: 'PlusJakartaSans-Regular',
    marginBottom: 1,
  },
  greetingName: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    color: TEXT_DARK,
  },
  circleAction: {
    width: 55,
    height: 55,
    borderRadius: 360,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  walletBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PURPLE,
    paddingHorizontal: 16,
    height: 54,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    minWidth: '35%',
  },
  walletBtnLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 9,
    fontFamily: 'PlusJakartaSans-Regular',
    lineHeight: 11,
  },
  walletBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    lineHeight: 14,
  },

  // Location
  locationBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BG,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  locationLabel: {
    fontSize: 10,
    color: TEXT_MUTED,
    fontFamily: 'PlusJakartaSans-Regular',
    marginBottom: 1,
  },
  locationText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: TEXT_DARK,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    color: TEXT_DARK,
  },
  seeAll: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: PURPLE,
  },
  sectionBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 2,
  },
  sectionBadgeText: {
    fontSize: 9,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // Kategori Layanan
  catSection: {
    marginBottom: 20,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  catScroll: {
    gap: 16,
    paddingRight: 20,
  },
  catItem: {
    alignItems: 'center',
    gap: 6,
  },
  catCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catLabel: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: TEXT_DARK,
  },

  // Cara Pesan
  stepsSection: {
    marginBottom: 20,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  stepsScroll: {
    gap: 10,
    paddingRight: 10,
  },
  stepCard: {
    width: SCREEN_WIDTH - 70,
    borderRadius: 24,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNum: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    position: 'relative',
    zIndex: 1,
  },
  stepContent: {
    flex: 1,
    zIndex: 1,
  },
  stepBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  stepBadgeText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  stepOrb: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    top: -30,
    left: -20,
  },
  stepOrbSmall: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  stepTitle: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    color: TEXT_DARK,
    marginBottom: 3,
    textAlign: 'left',
    zIndex: 1,
  },
  stepDesc: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Regular',
    color: TEXT_MUTED,
    textAlign: 'left',
    lineHeight: 15,
    zIndex: 1,
  },
  stepDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
  },
  stepDotActive: {
    width: 18,
    backgroundColor: '#7C3AED',
    borderRadius: 3,
  },

  // Mengapa Pilih Kami
  whySection: {
    marginBottom: 20,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  whyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  whyCard: {
    width: WHY_CARD_WIDTH,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  whyIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PURPLE_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  whyTitle: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    color: TEXT_DARK,
    marginBottom: 4,
    textAlign: 'center',
  },
  whyDesc: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Regular',
    color: TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 14,
  },

  // Grid Cards
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 20,
  },
  gridCardWrapper: {
    width: '50%',
    padding: 6,
  },
  gridCard: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
  },
  gridCardImage: {
    width: '100%',
    height: 110,
    resizeMode: 'cover',
    backgroundColor: '#F0F0F0',
  },
  gridCardBody: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 10,
    gap: 4,
  },
  gridCardName: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    color: TEXT_DARK,
  },
  gridCardPrice: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
    color: PURPLE,
  },
  gridCardDesc: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Regular',
    color: TEXT_MUTED,
    lineHeight: 13,
  },
  gridCardBtn: {
    marginTop: 6,
    backgroundColor: PURPLE_SOFT,
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  gridCardBtnText: {
    color: PURPLE,
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Bold',
  },

  // Banyak Dipesan — container card
  popularCardOuter: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: '#F5F0FF',
    borderWidth: 1,
    borderColor: '#D4D0EB',
    shadowColor: '#240080',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  popularCardAccent: {
    height: 3,
    width: '100%',
    backgroundColor: '#240080',
  },
  popularCard: {
    padding: 14,
  },

  // Banyak Dipesan — service cards
  popularServiceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0DCF0',
  },
  popularServiceImageWrapper: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
  },
  popularServiceImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    resizeMode: 'cover',
    backgroundColor: '#F0F0F0',
  },
  popularServiceBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F97316',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  popularServiceBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  popularServiceBtn: {
    marginTop: 6,
    backgroundColor: '#240080',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignItems: 'center',
    shadowColor: '#240080',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  popularServiceBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Bold',
  },

  // Rekomendasi — blue cards
  recCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D4D0EB',
  },
  recCardBtn: {
    marginTop: 6,
    backgroundColor: '#240080',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  recCardBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Bold',
  },

  // Rekomendasi horizontal scroll
  recScroll: {
    gap: 12,
    paddingRight: 20,
    marginBottom: 20,
  },

  // All services
  allServicesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PURPLE_SOFT,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: PURPLE,
    paddingVertical: 13,
    gap: 6,
    marginTop: 16,
  },
  allServicesText: {
    color: PURPLE,
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 13,
  },

  // Floating Order Card
  floatingCard: {
    position: 'absolute',
    bottom: 150,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    zIndex: 999,
  },
  floatingCardDark: {
    backgroundColor: '#1E293B',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  floatingLeft: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(36, 0, 128, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  floatingCenter: {
    flex: 1,
    marginRight: 10,
  },
  floatingTitle: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#1A1A2E',
    marginBottom: 2,
  },
  floatingSubtitle: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#6B7280',
  },
  floatingRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#240080',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  floatingCloseBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-Bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Regular',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalLabel: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    marginBottom: 8,
  },
  modalInput: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Regular',
    borderWidth: 1,
    marginBottom: 16,
  },
  modalGenderRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  modalGenderBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalGenderActive: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  modalGenderText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  modalGenderTextActive: {
    color: '#FFFFFF',
  },
  modalSubmitBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#240080',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold',
  },
});
