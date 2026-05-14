import { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Droplet, Layers } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Network from 'expo-network';
import * as Location from 'expo-location';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/constants/Theme';
import { supabase } from '@/lib/supabase';
import { useThemeStore, useThemeColors } from '@/store/themeStore';
import { useTherapistStore } from '@/store/therapistStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { calculateDistance } from '@/lib/utils';

const STATUS_COLOR: Record<string, string> = {
  pending: '#F97316',
  accepted: '#10B981',
  on_the_way: '#3B82F6',
  arrived: '#8B5CF6',
  in_progress: '#06B6D4',
  completed: '#10B981',
  cancelled: '#EF4444',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Menunggu',
  accepted: 'Diterima',
  on_the_way: 'Menuju Lokasi',
  arrived: 'Tiba',
  in_progress: 'Proses',
  completed: 'Selesai',
  cancelled: 'Batal',
};

export default function DashboardScreen() {
  const router = useRouter();
  const { profile, loading: profileLoading } = useTherapistStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);
  const [networkType, setNetworkType] = useState<string>('Unknown');
  const [currentAddress, setCurrentAddress] = useState('Mencari lokasi...');
  const [therapistLoc, setTherapistLoc] = useState<{latitude: number, longitude: number} | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({
    todayEarnings: 0,
    todayOrders: 0,
    rating: 5.0,
    totalHours: 0
  });
  const { fetchProfile } = useTherapistStore();
  
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const t = useThemeColors();

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
      fetchDashboardData();
    }, [])
  );

  useEffect(() => {
    fetchDashboardData();
    checkNetwork();
    updateLocation();
    
    // Check network every 10 seconds
    const interval = setInterval(checkNetwork, 10000);
    return () => clearInterval(interval);
  }, [profile]);

  const updateLocation = async () => {
    if (isLocating) return;
    setIsLocating(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setCurrentAddress('Izin lokasi ditolak');
        setIsLocating(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({ 
        accuracy: Location.Accuracy.Balanced 
      });
      
      setTherapistLoc({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      
      const reverse = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (reverse && reverse.length > 0) {
        const addr = reverse[0];
        const street = addr.street || addr.name || '';
        const district = addr.district || addr.subregion || '';
        const city = addr.city || addr.region || '';
        
        const fullAddress = [street, district, city]
          .filter(Boolean)
          .join(', ');
          
        setCurrentAddress(fullAddress || 'Lokasi tidak dikenal');
      }
    } catch (e) {
      setCurrentAddress('Gagal memuat alamat');
    } finally {
      setIsLocating(false);
    }
  };

  const checkNetwork = async () => {
    try {
      const state = await Network.getNetworkStateAsync();
      
      if (!state.isConnected) {
        setNetworkType('Offline');
        return;
      }

      let type = 'Stabil'; // Default jika terhubung tapi tipe tidak spesifik
      if (state.type === 'WIFI') type = 'WiFi';
      else if (state.type === 'CELLULAR') type = 'Cellular';
      
      setNetworkType(type);
    } catch (e) {
      setNetworkType('Stabil');
    }
  };

  const fetchDashboardData = async () => {
    if (!profile) return;
    try {
      // 1. Hitung Statistik Hari Ini
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { data: todayData, error: todayError } = await supabase
        .from('orders')
        .select('total_price, status, created_at, duration')
        .eq('therapist_id', profile.id)
        .gte('created_at', startOfDay.toISOString());

      if (todayError) throw todayError;

      const completedToday = todayData ? todayData.filter(o => o.status === 'completed') : [];
      
      // Calculate NET earnings (80% share for therapist by default)
      const earnings = completedToday.reduce((sum, o) => {
        const rate = profile.commission_rate || 80;
        const share = ((o.total_price || 0) * rate) / 100;
        return sum + share;
      }, 0);

      // Calculate Total Hours Today from duration column
      const totalHoursToday = completedToday.reduce((sum, o) => sum + (Number(o.duration) || 0), 0) / 60;

      // 2. Ambil Pesanan Terbaru Hari Ini (Limit 3)
      const { data: recentOrders, error: oError } = await supabase
        .from('orders')
        .select('*, users(full_name, avatar_url), services(name, duration_min)')
        .eq('therapist_id', profile.id)
        .gte('created_at', startOfDay.toISOString())
        .order('created_at', { ascending: false })
        .limit(3);

      if (oError) throw oError;

      setOrders(recentOrders || []);
      setDashboardStats({
        todayEarnings: earnings,
        todayOrders: completedToday.length, // Only count completed orders for the stat
        rating: Number(profile.rating) || 5.0,
        totalHours: totalHoursToday // Display hours from today's completed orders
      });
    } catch (error) {
      console.error('Dashboard Fetch Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchProfile(),
      fetchDashboardData(),
      updateLocation()
    ]);
    setRefreshing(false);
  };

  const styles = getStyles(t);

  const stats = [
    { label: 'Pendapatan', value: `Rp ${dashboardStats.todayEarnings.toLocaleString('id-ID')}`, icon: 'cash-outline', color: '#10B981' },
    { label: 'Pesanan', value: dashboardStats.todayOrders.toString(), icon: 'bag-outline', color: t.secondary },
    { label: 'Rating', value: dashboardStats.rating.toFixed(1), icon: 'star-outline', color: '#F59E0B' },
    { label: 'Total Jam', value: `${dashboardStats.totalHours} jam`, icon: 'time-outline', color: '#06B6D4' },
  ];

  if (loading && profileLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={t.primary} />
      </View>
    );
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'Selamat Pagi';
    if (hour >= 11 && hour < 15) return 'Selamat Siang';
    if (hour >= 15 && hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={require('../../assets/logo-kang-massage.png')} style={styles.logo} />
          <Text style={styles.companyName}>Kang Massage</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={toggleTheme} style={styles.iconBtn}>
            <Ionicons name={isDarkMode ? "sunny-outline" : "moon-outline"} size={22} color={t.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(tabs)/notifications')} style={styles.iconBtn}>
            <Ionicons name="notifications-outline" size={22} color={t.text} />
            <View style={[styles.notifDot, { backgroundColor: t.secondary }]} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={t.secondary}
            colors={[t.secondary]}
          />
        }
      >
        
        {/* Current Location */}
        <View style={styles.locationContainer}>
          <Ionicons name="location" size={24} color={t.secondary} style={{ marginBottom: 10 }}/>
          <View style={styles.locationInfo}>
            <Text style={styles.locationLabel}>Lokasi Terkini</Text>
            <Text style={styles.locationText} numberOfLines={1}>
              {currentAddress}
            </Text>
          </View>
        </View>

        {/* Balance Card - Solid Blue */}
        <View style={[styles.balanceCard, { backgroundColor: t.brandBlue, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }]}>
          {/* Silhouette Icon - Towels & Oil */}
          <View style={styles.silhouetteContainer}>
            <Layers color="#FFFFFF" size={140} strokeWidth={1} style={styles.silhouetteTowels} />
            <Droplet color="#FFFFFF" size={80} strokeWidth={1.5} style={styles.silhouetteOil} />
          </View>
          
          <View style={styles.greetingRow}>
            <View style={styles.greetingContainer}>
              <Text style={styles.greetingText}>{getGreeting()},</Text>
              <Text style={styles.nameText}>{profile?.full_name?.split(' ')[0] || 'Mitra'} 👋</Text>
            </View>

            <View style={styles.networkBadge}>
              <View style={[styles.signalDot, { backgroundColor: networkType === 'Offline' ? t.danger : (networkType === 'No Signal' ? t.warning : '#10B981') }]} />
              <Ionicons 
                name={networkType === 'WiFi' ? 'wifi' : 'stats-chart'} 
                size={14} 
                color="#FFFFFF" 
                style={{ opacity: 0.8 }}
              />
              <Text style={styles.networkText}>{networkType}</Text>
            </View>
          </View>
          
          <View style={styles.balanceContainer}>
            <View>
              <View style={styles.balanceHeader}>
                <Text style={styles.balanceLabel}>Saldo Dompet Saat Ini</Text>
                <TouchableOpacity onPress={() => setShowBalance(!showBalance)}>
                  <Ionicons name={showBalance ? "eye-outline" : "eye-off-outline"} size={16} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
              </View>
              <Text style={styles.balanceValue}>
                {showBalance ? `Rp ${(profile?.wallet_balance || 0).toLocaleString('id-ID')}` : 'Rp *******'}
              </Text>
            </View>
            
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: t.secondary }]} onPress={() => router.push('/profile/topup')}>
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          {stats.map((s) => (
            <View key={s.label} style={[styles.statCard, { borderWidth: 1, borderColor: t.border }]}>
              <View style={[styles.statIcon, { backgroundColor: s.color + '25' }]}>
                <Ionicons name={s.icon as any} size={22} color={s.color} />
              </View>
              <View style={styles.statInfo}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Recent Orders */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pesanan Terbaru</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/orders')}>
            <Text style={styles.seeAll}>Lihat Semua</Text>
          </TouchableOpacity>
        </View>

        {orders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={40} color={t.textMuted} />
            <Text style={styles.emptyText}>Belum ada pesanan hari ini</Text>
          </View>
        ) : (
          orders.map((order) => (
            <TouchableOpacity
              key={order.id}
              style={styles.orderCard}
              onPress={() => router.push(`/orders/${order.id}`)}
              activeOpacity={0.85}
            >
              <View style={styles.orderTop}>
                <View style={[styles.orderAvatar, { backgroundColor: t.primary + '10' }]}>
                  <Text style={[styles.orderAvatarText, { color: t.primary }]}>{(order.users?.full_name || '?')[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderName}>{order.users?.full_name || 'Pelanggan'}</Text>
                  <Text style={styles.orderService}>{order.services?.name || 'Pijat Relaksasi'} · {order.duration || 60} menit</Text>
                </View>
                <View style={[styles.orderBadge, { backgroundColor: (STATUS_COLOR[order.status] || t.textMuted) + '15' }]}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: STATUS_COLOR[order.status] || t.textMuted, marginRight: 5 }} />
                  <Text style={[styles.orderBadgeText, { color: STATUS_COLOR[order.status] || t.textMuted }]}>
                    {STATUS_LABEL[order.status] || order.status}
                  </Text>
                </View>
              </View>


              <View style={styles.orderMeta}>
                <View style={styles.orderMetaItem}>
                  <Ionicons name="location-outline" size={14} color={t.textMuted} />
                  <Text style={styles.orderMetaText} numberOfLines={1}>{order.address || 'Alamat tidak tersedia'}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
                  <View style={styles.orderMetaItem}>
                    <Ionicons name="navigate-outline" size={14} color={t.textMuted} />
                    <Text style={styles.orderMetaText}>
                      {therapistLoc 
                        ? `${calculateDistance(therapistLoc.latitude, therapistLoc.longitude, order.latitude, order.longitude)} km`
                        : (order.distance || '1.2 km')}
                    </Text>
                  </View>
                  <View style={styles.orderMetaItem}>
                    <Ionicons name="time-outline" size={14} color={t.textMuted} />
                    <Text style={styles.orderMetaText}>{new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                  <Text style={[styles.orderPrice, { color: t.text }]}>
                    Rp {(order.total_price || 0).toLocaleString('id-ID')}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (t: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.background },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    paddingHorizontal: SPACING.lg, paddingTop: 15, paddingBottom: SPACING.md,
    backgroundColor: t.background
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  logo: { width: 32, height: 32, resizeMode: 'contain' },
  companyName: { ...TYPOGRAPHY.h1, color: t.text, fontFamily: 'Inter_700Bold' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.border },
  notifDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, borderWidth: 2, borderColor: t.surface },
  
  scroll: { padding: SPACING.lg, paddingBottom: 100 },
  
  locationContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 4,
    marginBottom: SPACING.sm,
  },
  locationInfo: { flex: 1, marginLeft: 8 },
  locationLabel: { fontSize: 10, color: t.textMuted, fontFamily: 'Inter_400Regular', marginBottom: 0 },
  locationText: { ...TYPOGRAPHY.caption, color: t.textSecondary, fontFamily: 'Inter_500Medium', marginBottom: SPACING.md },
  refreshBtn: { padding: 4 },
  
  balanceCard: { borderRadius: RADIUS.xl, padding: SPACING.lg, marginBottom: SPACING.lg, gap: SPACING.md, overflow: 'hidden', shadowColor: t.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
  silhouetteContainer: { position: 'absolute', right: -30, bottom: -40, opacity: 0.1, zIndex: 0, flexDirection: 'row', alignItems: 'flex-end' },
  silhouetteTowels: { marginRight: -20 },
  silhouetteOil: { marginBottom: 20 },
  greetingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 },
  greetingContainer: { marginBottom: SPACING.sm },
  greetingText: { ...TYPOGRAPHY.bodySmall, color: 'rgba(255,255,255,0.8)' },
  nameText: { ...TYPOGRAPHY.h2, color: '#FFFFFF' },
  networkBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    backgroundColor: 'rgba(255,255,255,0.15)', 
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  signalDot: { width: 6, height: 6, borderRadius: 3 },
  networkText: { ...TYPOGRAPHY.caption, color: '#FFFFFF', fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  
  balanceContainer: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: SPACING.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', zIndex: 1 },
  balanceHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 4 },
  balanceLabel: { ...TYPOGRAPHY.caption, color: 'rgba(255,255,255,0.7)' },
  balanceValue: { ...TYPOGRAPHY.h1, color: '#FFFFFF' },
  
  addBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', shadowColor: t.secondary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, marginBottom: SPACING.xl },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: t.surface, borderRadius: RADIUS.xl, padding: SPACING.md, borderWidth: 1, borderColor: t.border, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  statIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statInfo: { gap: 2 },
  statValue: { ...TYPOGRAPHY.h4, color: t.text, fontFamily: 'Inter_700Bold' },
  statLabel: { ...TYPOGRAPHY.caption, color: t.textSecondary },
  
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  sectionTitle: { ...TYPOGRAPHY.h4, color: t.text },
  seeAll: { ...TYPOGRAPHY.caption, color: t.primary, fontFamily: 'Inter_700Bold' },
  
  orderCard: { backgroundColor: t.surface, borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: t.border, gap: SPACING.sm },
  orderTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  orderAvatar: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  orderAvatarText: { ...TYPOGRAPHY.h4, fontFamily: 'Inter_700Bold' },
  orderName: { ...TYPOGRAPHY.bodySmall, color: t.text, fontFamily: 'Inter_700Bold' },
  orderService: { ...TYPOGRAPHY.caption, color: t.textSecondary }, // More visible
  orderBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  orderBadgeText: { ...TYPOGRAPHY.caption, fontFamily: 'Inter_700Bold' },
 
  orderMeta: { gap: 6, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: t.border },
  orderMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  orderMetaText: { ...TYPOGRAPHY.caption, color: t.textSecondary, flex: 1 },
  orderPrice: { ...TYPOGRAPHY.bodySmall, fontFamily: 'Inter_700Bold', marginLeft: 'auto' },
  
  emptyCard: { backgroundColor: t.surface, borderRadius: RADIUS.xl, padding: SPACING.xl, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, borderWidth: 1, borderColor: t.border, borderStyle: 'dashed' },
  emptyText: { ...TYPOGRAPHY.bodySmall, color: t.textMuted },
});
