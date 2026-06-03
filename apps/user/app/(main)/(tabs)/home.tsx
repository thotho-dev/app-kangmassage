import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  StatusBar,
  FlatList,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import {
  Bell,
  MapPin,
  Ticket,
  Wallet,
  ChevronRight,
  Star,
  Scissors,
  X,
  Clock,
} from 'lucide-react-native';
import { useServices } from '@/hooks/useServices';
import { useLocation } from '@/context/LocationContext';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ORANGE = '#FF6B2C';
const ORANGE_SOFT = '#FFF1E8';
const TEXT_DARK = '#1A1A2E';
const TEXT_MUTED = '#6B7280';
const BG = '#F5F5F7';
const CARD_BG = '#FFFFFF';
const BORDER = '#EFEFEF';
const PURPLE = '#240080';
const PURPLE_SOFT = '#F3E8FF';

// ─── Banner Data ───────────────────────────────────────────────────────────────
const BANNERS = [
  {
    id: '1',
    image: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=800&q=80',
    title: 'Relaksasi Total',
    subtitle: 'Rasakan pijatan terbaik di rumahmu',
    badge: 'HOT PROMO',
  },
  {
    id: '2',
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80',
    title: 'Body Massage Premium',
    subtitle: 'Terapis berpengalaman siap datang',
    badge: 'NEW',
  },
  {
    id: '3',
    image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800&q=80',
    title: 'Bekam & Refleksi',
    subtitle: 'Sehat dari dalam, bugar setiap hari',
    badge: 'POPULER',
  },
];

// ─── Service Data ──────────────────────────────────────────────────────────────
const HOME_SERVICES = [
  {
    id: 'pijat-full-body',
    name: 'Pijat Full Body',
    price: 170000,
    description: 'Pijatan menyeluruh dari kepala hingga kaki untuk relaksasi total',
    badge: { label: 'Populer', type: 'popular' as const },
    image: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=300&q=80',
  },
  {
    id: 'bekam',
    name: 'Bekam',
    price: 170000,
    description: 'Terapi pengeluaran racun untuk meningkatkan sistem imun tubuh',
    badge: { label: '% Diskon', type: 'discount' as const },
    image: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=300&q=80',
  },
  {
    id: 'shiatsu-japan',
    name: 'Shiatsu Japan',
    price: 190000,
    description: 'Teknik penekanan titik saraf tanpa minyak ala Jepang',
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=300&q=80',
  },
  {
    id: 'pijat-ibu-hamil',
    name: 'Pijat Ibu Hamil',
    price: 150000,
    description: 'Teknik pijat aman khusus untuk ibu hamil',
    image: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=300&q=80',
  },
];

const formatRupiah = (value: number) =>
  `Rp ${value.toLocaleString('id-ID')}`;

// ─── Banner Slideshow ──────────────────────────────────────────────────────────
function BannerSlideshow({ onBookNow }: { onBookNow: () => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex = (activeIndex + 1) % BANNERS.length;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setActiveIndex(nextIndex);
    }, 3500);
    return () => clearInterval(interval);
  }, [activeIndex]);

  const onMomentumScrollEnd = (e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 32));
    setActiveIndex(index);
  };

  return (
    <View style={bannerStyles.wrapper}>
      <Animated.FlatList
        ref={flatListRef}
        data={BANNERS}
        horizontal
        pagingEnabled
        snapToInterval={SCREEN_WIDTH - 32}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        renderItem={({ item }) => (
          <View style={bannerStyles.slide}>
            <Image source={{ uri: item.image }} style={bannerStyles.image} />
            {/* Gradient overlay */}
            <View style={bannerStyles.overlay} />
            {/* Badge */}
            <View style={bannerStyles.badgePill}>
              <Text style={bannerStyles.badgeText}>{item.badge}</Text>
            </View>
            {/* Text */}
            <View style={bannerStyles.textBlock}>
              <Text style={bannerStyles.slideTitle}>{item.title}</Text>
              <Text style={bannerStyles.slideSubtitle}>{item.subtitle}</Text>
            </View>
            {/* Book Now */}
            <TouchableOpacity
              style={bannerStyles.bookBtn}
              activeOpacity={0.85}
              onPress={onBookNow}
            >
              <Text style={bannerStyles.bookBtnText}>BOOK NOW</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      {/* Dot Indicator */}
      <View style={bannerStyles.dots}>
        {BANNERS.map((_, i) => (
          <View
            key={i}
            style={[
              bannerStyles.dot,
              i === activeIndex ? bannerStyles.dotActive : null,
            ]}
          />
        ))}
      </View>
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
  const { address, isLoading: isLocLoading, refreshLocation } = useLocation();

  const [floatingOrder, setFloatingOrder] = useState<any>(null);
  const [isDismissed, setIsDismissed] = useState(false);

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        stickyHeaderIndices={[1]}
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
            style={styles.bellButton} 
            activeOpacity={0.85}
            onPress={() => handleProtectedAction('/notifications')}
          >
            <Bell size={18} color="#FFFFFF" fill="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* ── Sticky User Header ── */}
        <View style={styles.stickyHeader}>
          <View style={styles.userRow}>
            <View style={styles.userCard}>
              <View style={[styles.avatar, !isAuthenticated && { backgroundColor: TEXT_MUTED }]}>
                <Text style={styles.avatarText}>
                  {isAuthenticated ? getInitials(profile?.full_name || user?.email || 'User') : 'G'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.greetingSmall}>{getGreeting()} 👋</Text>
                <Text style={styles.greetingName}>
                  {isAuthenticated ? (profile?.full_name || 'User') : 'Tamu'}
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.circleAction} 
              activeOpacity={0.85}
              onPress={() => handleProtectedAction('/vouchers')}
            >
              <Ticket size={25} color={PURPLE} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.circleAction} 
              activeOpacity={0.85}
              onPress={() => handleProtectedAction('/wallet')}
            >
              <Wallet size={25} color={PURPLE} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Location ── */}
        <TouchableOpacity 
          style={styles.locationBlock} 
          activeOpacity={0.75}
          onPress={() => handleProtectedAction('/maps', { from: 'home' })}
        >
          <MapPin size={14} color={PURPLE} fill={PURPLE} />
          <View style={{ flex: 1, marginLeft: 6 }}>
            <Text style={styles.locationLabel}>Lokasi saat ini</Text>
            <Text style={styles.locationText} numberOfLines={1}>
              {isLocLoading ? 'Mencari lokasi...' : address}
            </Text>
          </View>
          <ChevronRight size={14} color={TEXT_MUTED} />
        </TouchableOpacity>

        {/* ── Banner Slideshow ── */}
        <BannerSlideshow
          onBookNow={() => handleProtectedAction('/services')}
        />

        {/* ── Layanan section ── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionIconBox}>
              <Scissors size={14} color="#FFFFFF" />
            </View>
            <Text style={styles.sectionTitle}>Layanan Kami</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/services')}>
            <Text style={styles.seeAll}>Lihat Semua</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <View key={i} style={styles.serviceCard}>
                <Skeleton width="100%" height={120} borderRadius={0} />
                <View style={styles.serviceInfo}>
                  <Skeleton width="80%" height={16} borderRadius={4} style={{ marginBottom: 8 }} />
                  <Skeleton width="40%" height={12} borderRadius={4} style={{ marginBottom: 8 }} />
                  <Skeleton width="100%" height={24} borderRadius={4} style={{ marginBottom: 12 }} />
                  <Skeleton width="100%" height={36} borderRadius={10} />
                </View>
              </View>
            ))
          ) : (
            services?.slice(0, 4).map((service) => (
              <View key={service.id} style={styles.serviceCard}>
                <Image
                  source={{ uri: service.image || 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=300&q=80' }}
                  style={styles.serviceImage}
                />
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName} numberOfLines={1}>
                    {service.name}
                  </Text>
                  <Text style={styles.servicePrice}>
                    Mulai {formatRupiah(service.duration_options?.[0]?.price || service.price)}
                  </Text>
                  <Text style={styles.serviceDesc} numberOfLines={2}>
                    {service.description}
                  </Text>
                  <TouchableOpacity
                    style={styles.pickButton}
                    activeOpacity={0.9}
                    onPress={() =>
                      handleProtectedAction('/order', { serviceId: service.id, from: 'home' })
                    }
                  >
                    <Text style={styles.pickButtonText}>Pilih Layanan</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* ── All Services button ── */}
        <TouchableOpacity
          style={styles.allServicesBtn}
          activeOpacity={0.9}
          onPress={() => router.push('/services')}
        >
          <Text style={styles.allServicesText}>Semua Layanan</Text>
          <ChevronRight size={16} color={PURPLE} />
        </TouchableOpacity>

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
  );
}

// ─── Banner Styles ─────────────────────────────────────────────────────────────
const bannerStyles = StyleSheet.create({
  wrapper: {
    marginBottom: 20,
  },
  slide: {
    width: SCREEN_WIDTH - 32,
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginRight: 0,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  badgePill: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: ORANGE,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: 0.8,
  },
  textBlock: {
    position: 'absolute',
    bottom: 48,
    left: 16,
    right: 80,
  },
  slideTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  slideSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Regular',
  },
  bookBtn: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: '#E0B65C',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  bookBtnText: {
    color: '#FFE6B0',
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: 1,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
  },
  dotActive: {
    width: 20,
    height: 6,
    borderRadius: 3,
    backgroundColor: ORANGE,
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
    zIndex: 10,
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
    backgroundColor: CARD_BG,
    borderRadius: 32,
    padding: 6,
    paddingRight: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: CARD_BG,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    fontSize: 13,
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
    backgroundColor: PURPLE,
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

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  serviceCard: {
    width: '48.5%',
    backgroundColor: CARD_BG,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  serviceImage: {
    width: '100%',
    height: 90,
    resizeMode: 'cover',
  },
  serviceBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
  },
  serviceBadgePopular: {
    backgroundColor: '#DCFCE7',
  },
  serviceBadgeDiscount: {
    backgroundColor: PURPLE_SOFT,
  },
  serviceBadgeText: {
    fontSize: 9,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#15803D',
  },
  serviceBadgeTextDiscount: {
    color: PURPLE,
  },
  serviceInfo: {
    padding: 10,
  },
  serviceName: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
    color: TEXT_DARK,
    marginBottom: 2,
  },
  servicePrice: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
    color: PURPLE,
    marginBottom: 4,
  },
  serviceDesc: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans-Regular',
    color: TEXT_MUTED,
    lineHeight: 14,
    marginBottom: 10,
  },
  pickButton: {
    backgroundColor: PURPLE,
    borderRadius: 20,
    paddingVertical: 8,
    alignItems: 'center',
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  pickButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
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
});
