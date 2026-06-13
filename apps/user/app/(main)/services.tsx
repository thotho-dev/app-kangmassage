import React, { useCallback, useState, useMemo } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Search } from 'lucide-react-native';
import { SERVICES } from '@/constants/Services';
import { useServices } from '@/hooks/useServices';
import { COLORS, FONTS } from '@/constants/Theme';
import { Skeleton } from '@/components/ui/Skeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PAD = 16;
const GAP = 14;
const CARD_WIDTH = SCREEN_WIDTH - HORIZONTAL_PAD * 2;

const TEXT_DARK = '#1A1A2E';
const TEXT_MUTED = '#6B7280';
const BG = '#F5F5F7';

// ── Types ────────────────────────────────────────────────────────────────────
type Service = {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  icon?: string;
};

// ── Sub-components ────────────────────────────────────────────────────────────
function ServiceCard({ item, onPress }: { item: Service; onPress: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.imageWrap}>
        <Image
          source={{
            uri: item.image || 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400',
          }}
          style={styles.cardImage}
        />
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.cardDesc} numberOfLines={2}>
            {item.description}
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.priceLabel}>Mulai</Text>
            <Text style={styles.priceValue}>
              Rp {item.price.toLocaleString('id-ID')}
            </Text>
          </View>
          <TouchableOpacity style={styles.selectBtn} activeOpacity={0.8} onPress={onPress}>
            <Text style={styles.selectBtnText}>Pilih</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function SkeletonCard() {
  return (
    <View style={[styles.card, { overflow: 'hidden' }]}>
      <View style={styles.imageWrap}>
        <Skeleton width="100%" height="100%" borderRadius={0} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Skeleton width="75%" height={15} borderRadius={4} />
          <Skeleton width="100%" height={30} borderRadius={4} />
        </View>
        <View style={styles.cardFooter}>
          <View>
            <Skeleton width={50} height={10} borderRadius={2} />
            <Skeleton width={80} height={16} borderRadius={4} />
          </View>
          <Skeleton width={60} height={32} borderRadius={20} />
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

  const displayServices: Service[] = servicesData || SERVICES;

  const filteredServices = useMemo(() => {
    return [...displayServices]
      .sort((a, b) => a.price - b.price)
      .filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.description.toLowerCase().includes(search.toLowerCase())
      );
  }, [displayServices, search]);

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

  const ListHeader = (
    <View>
      <View style={styles.decoSection}>
        <View style={styles.decoCircle1} />
        <View style={styles.decoCircle2} />
      </View>
      <View style={styles.introSection}>
        <Text style={styles.introTitle}>Pilih Perawatan Terbaik</Text>
        <Text style={styles.introSubtitle}>
          Nikmati berbagai pilihan layanan pijat profesional langsung ke tempat Anda.
        </Text>
      </View>
    </View>
  );

  const skeletonData = Array.from({ length: 6 }, (_, i) => i);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Layanan Kami</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Sticky Search Bar */}
      <View style={styles.searchWrap}>
        <Search size={16} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari layanan..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
      </View>

      {isLoading ? (
        <FlatList
          data={skeletonData}
          keyExtractor={(item) => item.toString()}
          renderItem={renderSkeletonItem}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        />
      ) : (
        <FlatList
          data={filteredServices}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ServiceCard item={item} onPress={() => navigateToOrder(item.id)} />
          )}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={<View style={{ height: 40 }} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={5}
        />
      )}
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
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: TEXT_DARK,
  },

  // ─ Decorative ──────────────────────────────────────────────────────────────
  decoSection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    overflow: 'hidden',
  },
  decoCircle1: {
    position: 'absolute',
    top: -50,
    right: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(234,88,12,0.04)',
  },
  decoCircle2: {
    position: 'absolute',
    top: 20,
    left: -40,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(91,42,134,0.03)',
  },

  // ─ Search ───────────────────────────────────────────────────────────────────
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 42,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
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
    paddingBottom: 4,
    paddingHorizontal: 4,
    marginBottom: 15,
  },
  introTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 18,
    color: TEXT_DARK,
    marginBottom: 6,
  },
  introSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: TEXT_MUTED,
    lineHeight: 20,
  },

  // ─ Card ────────────────────────────────────────────────────────────────────
  card: {
    width: CARD_WIDTH,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  imageWrap: {
    width: 120,
    height: 120,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F5F7',
  },
  cardBody: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  cardHeader: {
    gap: 4,
  },
  cardName: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    color: TEXT_DARK,
  },
  cardDesc: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: TEXT_MUTED,
    lineHeight: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  priceLabel: {
    fontFamily: FONTS.medium,
    fontSize: 9,
    color: TEXT_MUTED,
    marginBottom: 2,
  },
  priceValue: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.primary[500],
  },
  selectBtn: {
    backgroundColor: COLORS.primary[500],
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },
  selectBtnText: {
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    fontSize: 11,
  },
});
