import React from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  StatusBar,
  Dimensions,
  Image
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Clock, Star, MapPin } from 'lucide-react-native';
import { SERVICES } from '@/constants/Services';
import { useServices } from '@/hooks/useServices';
import { COLORS, TYPOGRAPHY } from '@/constants/Theme';
import { useTheme } from '@/context/ThemeContext';
import { Skeleton } from '@/components/ui/Skeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

const TEXT_DARK = '#1A1A2E';
const TEXT_MUTED = '#6B7280';
const PURPLE = '#240080';
const BG = '#F5F5F7';
const CARD_BG = '#FFFFFF';
const BORDER = '#EFEFEF';

export default function ServicesScreen() {
  const router = useRouter();
  const { therapistId } = useLocalSearchParams();
  const { theme, isDark } = useTheme();
  const { data: servicesData, isLoading } = useServices();

  const displayServices = servicesData || SERVICES;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
        >
          <ChevronLeft size={24} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Layanan Kami</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.introSection}>
          <Text style={styles.introTitle}>Pilih Perawatan Terbaik</Text>
          <Text style={styles.introSubtitle}>
            Nikmati berbagai pilihan layanan pijat profesional langsung ke tempat Anda.
          </Text>
        </View>

        <View style={styles.grid}>
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={styles.serviceCard}>
                <Skeleton width="100%" height={120} borderRadius={0} />
                <View style={styles.serviceInfo}>
                  <Skeleton width="80%" height={16} borderRadius={4} style={{ marginBottom: 8 }} />
                  <Skeleton width="100%" height={32} borderRadius={4} style={{ marginBottom: 12 }} />
                  <Skeleton width="40%" height={10} borderRadius={2} style={{ marginBottom: 4 }} />
                  <Skeleton width="90%" height={16} borderRadius={4} />
                </View>
              </View>
            ))
          ) : (
            displayServices.map((service: any) => (
              <TouchableOpacity 
                key={service.id}
                activeOpacity={0.9}
                onPress={() => router.push({ pathname: '/(main)/order', params: { serviceId: service.id, therapistId, from: 'services' } })}
                style={styles.serviceCard}
              >
                {/* Image */}
                <Image
                  source={{ uri: service.image || 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400' }}
                  style={styles.serviceImage}
                />
                
                {/* Icon Overlay */}
                <View style={styles.iconOverlay}>
                  <Text style={styles.iconEmoji}>{service.icon}</Text>
                </View>
  
                {/* Info */}
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName} numberOfLines={1}>
                    {service.name}
                  </Text>
                  
                  <Text style={styles.serviceDescription} numberOfLines={2}>
                    {service.description}
                  </Text>
  
                  <View style={styles.priceContainer}>
                    <Text style={styles.priceLabel}>Mulai</Text>
                    <Text style={styles.priceText}>
                      Rp {service.price.toLocaleString('id-ID')} /Jam
                    </Text>
                  </View>
  
                  <TouchableOpacity 
                    style={styles.selectBtn}
                    onPress={() => router.push({ pathname: '/(main)/order', params: { serviceId: service.id, therapistId, from: 'services' } })}
                  >
                    <Text style={styles.selectBtnText}>Pilih</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: TEXT_DARK,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  introSection: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  introTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: TEXT_DARK,
    marginBottom: 8,
  },
  introSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: TEXT_MUTED,
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 16,
  },
  serviceCard: {
    width: CARD_WIDTH,
    backgroundColor: CARD_BG,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  serviceImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#F5F5F7',
  },
  iconOverlay: {
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
    fontSize: 16,
  },
  serviceInfo: {
    padding: 12,
  },
  serviceName: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: TEXT_DARK,
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: TEXT_MUTED,
    lineHeight: 15,
    marginBottom: 10,
    height: 30, // Keep cards uniform
  },
  priceContainer: {
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: TEXT_MUTED,
    marginBottom: 2,
  },
  priceText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: PURPLE,
  },
  selectBtn: {
    backgroundColor: PURPLE,
    paddingVertical: 10,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Inter-Bold',
  },
});
