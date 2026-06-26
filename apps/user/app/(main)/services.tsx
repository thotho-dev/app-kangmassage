import React, { useCallback, useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  Image,
  TextInput,
  Animated,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Search, Tag, X, Droplets, Shirt, BedDouble, Package } from 'lucide-react-native';
import { useServices } from '@/hooks/useServices';
import { COLORS, FONTS } from '@/constants/Theme';
import { Skeleton } from '@/components/ui/Skeleton';
import { supabase } from '../../lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PAD = 16;
const CARD_WIDTH = SCREEN_WIDTH - HORIZONTAL_PAD * 2;

const TEXT_DARK = '#1A1A2E';
const TEXT_MUTED = '#6B7280';
const BG = '#F5F5F7';

const EQUIPMENT = [
  { icon: Droplets, label: 'Minyak Pijat' },
  { icon: Shirt, label: 'Handuk Bersih' },
  { icon: BedDouble, label: 'Matras Lipat' },
  { icon: Package, label: 'Peralatan Lengkap' },
];

// ── Types ────────────────────────────────────────────────────────────────────
type Service = {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  icon?: string;
  badge?: string;
};

// ── Sub-components ────────────────────────────────────────────────────────────
function ServiceCard({
  item,
  onPress,
}: {
  item: Service;
  onPress: () => void;
}) {
  const badgeColors: Record<string, string> = {
    Rekomendasi: '#059669',
    Populer: '#3B82F6',
    Promo: '#DC2626',
  };

  return (
    <View style={styles.cardWrapper}>
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={onPress}
        style={styles.card}
      >
        <View style={styles.cardImageWrap}>
          <Image
            source={item.image ? { uri: item.image } : require('@/assets/icon-km.png')}
            style={styles.cardImage}
          />
          {item.badge && (
            <View style={[styles.cardBadge, { backgroundColor: badgeColors[item.badge] }]}>
              {item.badge === 'Promo' && <Tag size={8} color="#FFFFFF" style={{ marginRight: 3 }} />}
              <Text style={styles.cardBadgeText}>{item.badge}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.cardDesc} numberOfLines={2}>
            {item.description}
          </Text>

          <View style={styles.cardFooter}>
            <Text style={styles.cardPrice}>
              Rp {item.price.toLocaleString('id-ID')}
            </Text>
            <TouchableOpacity style={styles.selectBtn} activeOpacity={0.8} onPress={onPress}>
              <Text style={styles.selectBtnText}>Pilih</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}


function SkeletonCard() {
  return (
    <View style={[styles.card, { overflow: 'hidden' }]}>
      <View style={styles.cardImageWrap}>
        <Skeleton width="100%" height="100%" borderRadius={16} />
      </View>
      <View style={styles.cardBody}>
        <Skeleton width="75%" height={15} borderRadius={4} style={{ marginBottom: 4 }} />
        <Skeleton width="100%" height={14} borderRadius={4} style={{ marginBottom: 8 }} />
        <View style={styles.cardFooter}>
          <Skeleton width={80} height={16} borderRadius={4} />
          <Skeleton width={60} height={32} borderRadius={16} />
        </View>
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function ServicesScreen() {
  const router = useRouter();
  const { therapistId } = useLocalSearchParams();
  const { data: servicesData, isLoading } = useServices();
  const [search, setSearch] = useState('');
  const [promoServiceIds, setPromoServiceIds] = useState<Set<string>>(new Set());
  const [popularIds, setPopularIds] = useState<Set<string>>(new Set());
  const [recommendedIds, setRecommendedIds] = useState<Set<string>>(new Set());
  const [showSearch, setShowSearch] = useState(false);
  const searchAnim = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    Animated.timing(searchAnim, {
      toValue: showSearch ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [showSearch]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [voucherRes, popularRes, ratingRes] = await Promise.all([
        supabase
          .from('vouchers')
          .select('service_id')
          .not('service_id', 'is', null)
          .eq('is_active', true)
          .gte('valid_until', new Date().toISOString()),
        supabase
          .from('orders')
          .select('service_id')
          .eq('status', 'completed'),
        supabase
          .from('orders')
          .select('service_id, rating')
          .not('rating', 'is', null)
          .eq('status', 'completed'),
      ]);
      if (!mounted) return;

      // Promo
      if (voucherRes.data) {
        setPromoServiceIds(new Set(voucherRes.data.map((v) => v.service_id)));
      }

      // Populer — top 2 most ordered
      if (popularRes.data) {
        const countMap = new Map<string, number>();
        popularRes.data.forEach((o) => {
          countMap.set(o.service_id, (countMap.get(o.service_id) || 0) + 1);
        });
        const top2 = [...countMap.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(([id]) => id);
        setPopularIds(new Set(top2));
      }

      // Rekomendasi — top 2 most expensive
      if (servicesData && servicesData.length > 0) {
        const list: any[] = servicesData;
        const top2 = [...list]
          .sort((a, b) => (b.price || 0) - (a.price || 0))
          .slice(0, 2)
          .map((s) => s.id);
        setRecommendedIds(new Set(top2));
      }
    })();
    return () => { mounted = false; };
  }, []);

  const displayServices: Service[] = servicesData ?? [];

  const filteredServices = useMemo(() => {
    const badgeRank: Record<string, number> = { Rekomendasi: 1, Populer: 2, Promo: 3 };

    return [...displayServices]
      .filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.description.toLowerCase().includes(search.toLowerCase())
      )
      .map((s) => ({
        ...s,
        badge: promoServiceIds.has(s.id) ? 'Promo' : recommendedIds.has(s.id) ? 'Rekomendasi' : popularIds.has(s.id) ? 'Populer' : undefined,
      }))
      .sort((a, b) => {
        const rankA = a.badge ? badgeRank[a.badge] ?? 99 : 99;
        const rankB = b.badge ? badgeRank[b.badge] ?? 99 : 99;
        if (rankA !== rankB) return rankA - rankB;
        return a.price - b.price;
      });
  }, [displayServices, search, promoServiceIds, recommendedIds, popularIds]);

  const navigateToOrder = useCallback(
    (serviceId: string) => {
      router.push({
        pathname: '/order',
        params: { serviceId, therapistId, from: 'services' },
      });
    },
    [router, therapistId]
  );

  const renderSkeletonItem = useCallback(
    ({ index }: { index: number }) => <SkeletonCard key={index} />,
    []
  );

  const renderHeader = useCallback(
    () => (
      <View>
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>Pilih Perawatan Terbaik</Text>
          <Text style={styles.introSubtitle}>
            Nikmati berbagai pilihan layanan pijat profesional langsung ke tempat Anda.
          </Text>
        </View>

        {/* Equipment Section */}
        <View style={styles.equipSection}>
          <View style={styles.equipCard}>
            <Text style={styles.equipTitle}>Perlengkapan yang Dibawa Terapis</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.equipContent}>
              {EQUIPMENT.map((eq, i) => {
                const Icon = eq.icon;
                return (
                  <View key={i} style={styles.equipItem}>
                    <View style={styles.equipIconBox}>
                      <Icon size={20} color="#240080" />
                    </View>
                    <Text style={styles.equipLabel}>{eq.label}</Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </View>
    ),
    []
  );

  const skeletonData = Array.from({ length: 6 }, (_, i) => i);

  const renderItem = useCallback(
    ({ item }: { item: Service }) => (
      <ServiceCard
        item={item}
        onPress={() => navigateToOrder(item.id)}
      />
    ),
    [navigateToOrder]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Decorative circles */}
      <View style={styles.decoSection} pointerEvents="none">
        <View style={styles.decoCircle1} />
        <View style={styles.decoCircle2} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Layanan Kami</Text>
        <TouchableOpacity onPress={() => { if (showSearch) { setShowSearch(false); setSearch(''); } else { setShowSearch(true); setTimeout(() => searchInputRef.current?.focus(), 300); } }} style={styles.iconBtn}>
          {showSearch ? <X size={20} color={TEXT_DARK} /> : <Search size={20} color={TEXT_DARK} />}
        </TouchableOpacity>
      </View>

      <Animated.View style={{ transform: [{ translateY: searchAnim.interpolate({ inputRange: [0, 1], outputRange: [-65, 5] }) }], zIndex: 0 }} pointerEvents={showSearch ? 'auto' : 'none'}>
        <View style={styles.searchWrap}>
          <Search size={16} color="#9CA3AF" />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Cari layanan..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={{ padding: 4 }}>
              <X size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      <Animated.View style={{ flex: 1, transform: [{ translateY: searchAnim.interpolate({ inputRange: [0, 1], outputRange: [-42, 12] }) }] }}>
        {isLoading ? (
          <FlatList
            data={skeletonData}
            keyExtractor={(item) => item.toString()}
            renderItem={renderSkeletonItem}
            ListHeaderComponent={renderHeader}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
          />
        ) : (
          <FlatList
            data={filteredServices}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListHeaderComponent={renderHeader}
            ListFooterComponent={<View style={{ height: 40 }} />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            windowSize={5}
          />
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  // ─ Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
    zIndex: 2,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: TEXT_DARK,
  },

  // ─ Decorative ──────────────────────────────────────────────────────────────
  decoSection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    pointerEvents: 'none',
  },
  decoCircle1: {
    position: 'absolute',
    top: 60,
    right: -30,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(234,88,12,0.06)',
  },
  decoCircle2: {
    position: 'absolute',
    top: 140,
    left: -50,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(91,42,134,0.05)',
  },

  // ─ Search ───────────────────────────────────────────────────────────────────
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 42,
    marginHorizontal: HORIZONTAL_PAD,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: TEXT_DARK,
    paddingVertical: 0,
  },

  // ─ List ────────────────────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: HORIZONTAL_PAD,
    paddingBottom: 20,
  },

  // ─ Intro ───────────────────────────────────────────────────────────────────
  introSection: {
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 4,
  },
  introTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 16,
    color: TEXT_DARK,
    marginBottom: 6,
  },
  introSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: TEXT_MUTED,
    lineHeight: 20,
  },

  // ─ Equipment ────────────────────────────────────────────────────────────────
  equipSection: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  equipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    paddingVertical: 14,
    paddingLeft: 14,
  },
  equipTitle: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: '#1A1A2E',
    marginBottom: 12,
  },
  equipContent: {
    gap: 12,
    paddingRight: 14,
  },
  equipItem: {
    alignItems: 'center',
    gap: 6,
    minWidth: 80,
  },
  equipIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: 'rgba(36, 0, 128, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  equipLabel: {
    fontSize: 10,
    fontFamily: FONTS.semiBold,
    color: '#1A1A2E',
    textAlign: 'center',
  },

  // ─ Card ────────────────────────────────────────────────────────────────────
  // Outer wrapper holds shadow and margin.
  // Must NOT have overflow:hidden so shadow renders correctly on Android.
  cardWrapper: {
    width: CARD_WIDTH,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 5,
  },
  card: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardImageWrap: {
    width: 90,
    height: 90,
    position: 'relative',
    margin: 10,
    borderRadius: 14,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    backgroundColor: '#F5F5F7',
  },
  cardBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  cardBadgeText: {
    color: '#FFFFFF',
    fontSize: 7,
    fontFamily: FONTS.bold,
  },
  cardBody: {
    flex: 1,
    paddingVertical: 14,
    paddingRight: 14,
    justifyContent: 'space-between',
  },
  cardName: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: '#1A1A2E',
  },
  cardDesc: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: '#6B7280',
    lineHeight: 14,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  cardPrice: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    color: COLORS.primary[500],
  },
  selectBtn: {
    backgroundColor: COLORS.primary[500],
    borderRadius: 16,
    paddingHorizontal: 30,
    paddingVertical: 7,
  },
  selectBtnText: {
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    fontSize: 11,
  },
});
