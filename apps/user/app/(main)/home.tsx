import React from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  StyleSheet,
  Dimensions,
  StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  Search, 
  Bell, 
  MapPin, 
  Star, 
  Clock, 
  ChevronRight,
  Sparkles,
  Zap,
  Heart,
  TrendingUp
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SERVICES } from '../../constants/Services';
import { useServices } from '../../hooks/useServices';
import Card from '../../components/ui/Card';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/Theme';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

const CATEGORIES = SERVICES.slice(0, 8); // Showing more categories

const FEATURED_THERAPISTS = [
  {
    id: 1,
    name: 'Maya Putri',
    rating: 4.9,
    reviews: 124,
    price: 'Rp 165k',
    distance: '1.2 km',
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400'
  },
  {
    id: 2,
    name: 'Budi Santoso',
    rating: 4.8,
    reviews: 89,
    price: 'Rp 150k',
    distance: '2.5 km',
    image: 'https://images.unsplash.com/photo-1519824145371-296894a0daa9?w=400'
  }
];

export default function HomeScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { data: servicesData, isLoading } = useServices();

  const displayServices = servicesData || SERVICES.slice(0, 8);
  const categories = displayServices.slice(0, 8);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={[styles.greeting, { color: theme.text }]}>Halo, Alex</Text>
              <View style={styles.locationContainer}>
                <MapPin size={14} color={COLORS.gold[500]} />
                <Text style={[styles.locationText, { color: theme.textSecondary }]}>Grand Indonesia, Jakarta</Text>
              </View>
            </View>
            <TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
              <Bell size={24} color={theme.icon} />
              <View style={styles.badge} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <TouchableOpacity style={[styles.searchBar, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
            <Search size={20} color={theme.textSecondary} />
            <Text style={[styles.searchText, { color: theme.textSecondary }]}>Cari layanan atau terapis...</Text>
          </TouchableOpacity>
        </View>

        {/* Promo Banner */}
        <View style={styles.promoContainer}>
          <LinearGradient
            colors={[COLORS.primary[500], COLORS.primary[700]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.promoCard as any}
          >
            <View style={styles.promoTextContainer}>
              <View style={styles.promoBadge}>
                <Sparkles size={12} color={COLORS.gold[500]} />
                <Text style={styles.promoBadgeText}>Penawaran Eksklusif</Text>
              </View>
              <Text style={styles.promoTitle}>DISKON 30%</Text>
              <Text style={styles.promoSubtitle}>Sesi mewah pertama Anda</Text>
              <TouchableOpacity style={styles.promoButton}>
                <Text style={styles.promoButtonText}>Klaim Sekarang</Text>
              </TouchableOpacity>
            </View>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=400' }}
              style={styles.promoImage}
            />
          </LinearGradient>
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Layanan Kami</Text>
            <TouchableOpacity onPress={() => router.push('/(main)/services')}>
              <Text style={styles.seeAllText}>Lihat Semua</Text>
            </TouchableOpacity>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.categoryScroll}
          >
            {categories.map((service) => (
              <TouchableOpacity 
                key={service.id} 
                style={styles.categoryItem}
                onPress={() => router.push({ pathname: '/(main)/order', params: { serviceId: service.id } })}
              >
                <View style={[styles.categoryIconContainer, { backgroundColor: `${service.color}20`, borderColor: `${service.color}40` }]}>
                  <Text style={styles.categoryIconText}>{service.icon}</Text>
                </View>
                <Text style={[styles.categoryName, { color: theme.textSecondary }]} numberOfLines={1}>{service.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Popular Services Quick Actions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Pesan Cepat</Text>
          </View>
          <View style={styles.quickGrid}>
            <TouchableOpacity style={styles.quickCard}>
              <LinearGradient
                colors={isDark ? ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)'] : ['rgba(15, 23, 42, 0.05)', 'rgba(15, 23, 42, 0.02)']}
                style={styles.quickGradient as any}
              >
                <Zap size={20} color={COLORS.gold[500]} />
                <Text style={[styles.quickText, { color: theme.text }]}>Instan</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickCard}>
              <LinearGradient
                colors={isDark ? ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)'] : ['rgba(15, 23, 42, 0.05)', 'rgba(15, 23, 42, 0.02)']}
                style={styles.quickGradient as any}
              >
                <TrendingUp size={20} color={COLORS.primary[400]} />
                <Text style={[styles.quickText, { color: theme.text }]}>Populer</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickCard}>
              <LinearGradient
                colors={isDark ? ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)'] : ['rgba(15, 23, 42, 0.05)', 'rgba(15, 23, 42, 0.02)']}
                style={styles.quickGradient as any}
              >
                <Heart size={20} color={COLORS.error} />
                <Text style={[styles.quickText, { color: theme.text }]}>Favorit</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Featured Therapists */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Terapis Unggulan</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>Lihat Semua</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.therapistList}>
            {FEATURED_THERAPISTS.map((therapist) => (
              <TouchableOpacity 
                key={therapist.id} 
                onPress={() => router.push({ pathname: '/(main)/order', params: { id: therapist.id } })}
                activeOpacity={0.9}
              >
                <Card style={[styles.therapistCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Image source={{ uri: therapist.image }} style={styles.therapistImage} />
                  <View style={styles.therapistInfo}>
                    <View style={styles.therapistHeader}>
                      <Text style={[styles.therapistName, { color: theme.text }]}>{therapist.name}</Text>
                      <View style={styles.ratingContainer}>
                        <Star size={12} color={COLORS.gold[500]} fill={COLORS.gold[500]} />
                        <Text style={[styles.ratingText, { color: theme.text }]}>{therapist.rating}</Text>
                      </View>
                    </View>
                    <Text style={[styles.therapistSub, { color: theme.textSecondary }]}>Spesialis Luxury Spa</Text>
                    <View style={styles.therapistFooter}>
                      <View style={styles.metaContainer}>
                        <Clock size={12} color={theme.textSecondary} />
                        <Text style={[styles.metaText, { color: theme.textSecondary }]}>{therapist.distance}</Text>
                      </View>
                      <Text style={styles.priceText}>{therapist.price}<Text style={[styles.priceUnit, { color: theme.textSecondary }]}>/jam</Text></Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dark[950],
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    ...TYPOGRAPHY.h2,
    color: COLORS.white,
    fontSize: 28,
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    ...TYPOGRAPHY.caption,
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 14,
  },
  iconButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.gold[500],
    borderWidth: 2,
    borderColor: COLORS.dark[950],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    paddingHorizontal: 20,
    height: 60,
    gap: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchText: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 15,
    fontWeight: '500',
  },
  promoContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  promoCard: {
    borderRadius: 28,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: COLORS.primary[500],
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  promoTextContainer: {
    flex: 1,
    zIndex: 1,
  },
  promoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  promoBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  promoTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: 'white',
    marginBottom: 4,
  },
  promoSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginBottom: 24,
    fontWeight: '500',
  },
  promoButton: {
    backgroundColor: COLORS.gold[500],
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  promoButtonText: {
    color: COLORS.primary[700],
    fontWeight: '800',
    fontSize: 13,
  },
  promoImage: {
    width: 160,
    height: 160,
    position: 'absolute',
    right: -20,
    bottom: -20,
    opacity: 0.9,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.white,
    fontSize: 22,
  },
  seeAllText: {
    color: COLORS.gold[500],
    fontSize: 14,
    fontWeight: '700',
  },
  categoryScroll: {
    paddingHorizontal: 24,
    gap: 20,
  },
  categoryItem: {
    alignItems: 'center',
    width: 85,
  },
  categoryIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginBottom: 12,
  },
  categoryIconText: {
    fontSize: 32,
  },
  categoryName: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
  quickGrid: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
  },
  quickCard: {
    flex: 1,
    height: 60,
    borderRadius: 16,
    overflow: 'hidden',
  },
  quickGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  quickText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  therapistList: {
    paddingHorizontal: 24,
    gap: 16,
  },
  therapistCard: {
    flexDirection: 'row',
    gap: 16,
    padding: 12,
    borderRadius: 24,
  },
  therapistImage: {
    width: 90,
    height: 90,
    borderRadius: 20,
  },
  therapistInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  therapistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  therapistName: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 17,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  therapistSub: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 13,
    marginBottom: 14,
  },
  therapistFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    fontWeight: '500',
  },
  priceText: {
    color: COLORS.gold[500],
    fontWeight: '800',
    fontSize: 18,
  },
  priceUnit: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    fontWeight: 'normal',
  },
});
