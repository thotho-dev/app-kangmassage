import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  Image,
  ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { SERVICES } from '@/constants/Services';
import { useServices } from '@/hooks/useServices';
import { COLORS, FONTS } from '@/constants/Theme';
import { Skeleton } from '@/components/ui/Skeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NUM_COLS = 2;
const HORIZONTAL_PAD = 16;
const GAP = 14;
const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PAD * 2 - GAP) / NUM_COLS;

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
      {/* Image */}
      <Image
        source={{
          uri: item.image || 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400',
        }}
        style={styles.cardImage}
      />

      {/* Emoji badge */}
      {item.icon ? (
        <View style={styles.iconBadge}>
          <Text style={styles.iconEmoji}>{item.icon}</Text>
        </View>
      ) : null}

      {/* Info */}
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>
          {item.name}
        </Text>

        <Text style={styles.cardDesc} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Mulai</Text>
          <Text style={styles.priceValue}>
            Rp {item.price.toLocaleString('id-ID')}/Jam
          </Text>
        </View>

        <View style={styles.selectBtn}>
          <Text style={styles.selectBtnText}>Pilih</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function SkeletonCard() {
  return (
    <View style={[styles.card, { overflow: 'hidden' }]}>
      <Skeleton width="100%" height={120} borderRadius={0} />
      <View style={styles.cardBody}>
        <Skeleton width="75%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
        <Skeleton width="100%" height={28} borderRadius={4} style={{ marginBottom: 10 }} />
        <Skeleton width="50%" height={10} borderRadius={2} style={{ marginBottom: 4 }} />
        <Skeleton width="70%" height={16} borderRadius={4} style={{ marginBottom: 12 }} />
        <Skeleton width="100%" height={36} borderRadius={25} />
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function ServicesScreen() {
  const router = useRouter();
  const { therapistId } = useLocalSearchParams();
  const { data: servicesData, isLoading } = useServices();

  const displayServices: Service[] = servicesData || SERVICES;

  const navigateToOrder = useCallback(
    (serviceId: string) => {
      router.push({
        pathname: '/(main)/order',
        params: { serviceId, therapistId, from: 'services' },
      });
    },
    [router, therapistId]
  );

  const renderItem: ListRenderItem<Service> = useCallback(
    ({ item }) => (
      <ServiceCard item={item} onPress={() => navigateToOrder(item.id)} />
    ),
    [navigateToOrder]
  );

  const renderSkeletonItem = useCallback(
    ({ index }: { index: number }) => <SkeletonCard key={index} />,
    []
  );

  const keyExtractor = useCallback((item: Service) => item.id, []);

  const ListHeader = (
    <View style={styles.introSection}>
      <Text style={styles.introTitle}>Pilih Perawatan Terbaik</Text>
      <Text style={styles.introSubtitle}>
        Nikmati berbagai pilihan layanan pijat profesional langsung ke tempat Anda.
      </Text>
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

      {isLoading ? (
        <FlatList
          data={skeletonData}
          keyExtractor={(item) => item.toString()}
          numColumns={NUM_COLS}
          renderItem={renderSkeletonItem}
          ListHeaderComponent={ListHeader}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        />
      ) : (
        <FlatList
          data={displayServices}
          keyExtractor={keyExtractor}
          numColumns={NUM_COLS}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={<View style={{ height: 40 }} />}
          columnWrapperStyle={styles.columnWrapper}
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

  // ─ List ────────────────────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: HORIZONTAL_PAD,
    paddingBottom: 20,
  },
  columnWrapper: {
    gap: GAP,
    marginBottom: GAP,
  },

  // ─ Intro ───────────────────────────────────────────────────────────────────
  introSection: {
    paddingVertical: 20,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  introTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 24,
    color: TEXT_DARK,
    marginBottom: 8,
  },
  introSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: TEXT_MUTED,
    lineHeight: 20,
  },

  // ─ Card ────────────────────────────────────────────────────────────────────
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EFEFEF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#F5F5F7',
  },
  iconBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  iconEmoji: {
    fontSize: 14,
  },
  cardBody: {
    padding: 12,
  },
  cardName: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: TEXT_DARK,
    marginBottom: 4,
  },
  cardDesc: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: TEXT_MUTED,
    lineHeight: 15,
    marginBottom: 10,
    height: 30,
  },
  priceRow: {
    marginBottom: 12,
  },
  priceLabel: {
    fontFamily: FONTS.medium,
    fontSize: 10,
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
    paddingVertical: 10,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectBtnText: {
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    fontSize: 13,
  },
});
