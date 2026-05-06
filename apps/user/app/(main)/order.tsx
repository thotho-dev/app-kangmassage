import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, StatusBar } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Clock, MapPin, Shield, Star, Check, Sparkles } from 'lucide-react-native';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/Theme';
import { useTheme } from '../../context/ThemeContext';

import { SERVICES, Service } from '../../constants/Services';
import { useServices } from '../../hooks/useServices';

export default function OrderScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { id, serviceId } = useLocalSearchParams();
  const { data: servicesData } = useServices();
  
  const allServices = servicesData || SERVICES;
  const [selectedService, setSelectedService] = useState<Service>(
    allServices.find(s => s.id === serviceId) || allServices[0]
  );

  // Update selected service if data arrives and it matches serviceId
  React.useEffect(() => {
    if (servicesData && serviceId) {
      const found = servicesData.find(s => s.id === serviceId);
      if (found) setSelectedService(found);
    }
  }, [servicesData, serviceId]);

  const handleOrder = () => {
    router.push({
      pathname: '/(main)/tracking',
      params: { id: `ORD-${Math.floor(Math.random() * 10000)}` }
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
            <ArrowLeft size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Detail Pesanan</Text>
        </View>

        {/* Therapist Info */}
        <View style={styles.therapistSection}>
          <Card style={[styles.therapistCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400' }}
              style={styles.therapistImage}
            />
            <View style={styles.therapistInfo}>
              <Text style={[styles.therapistName, { color: theme.text }]}>Maya Putri</Text>
              <View style={styles.ratingContainer}>
                <Star size={14} color={COLORS.gold[500]} fill={COLORS.gold[500]} />
                <Text style={[styles.ratingText, { color: theme.text }]}>4.9 <Text style={[styles.reviewCount, { color: theme.textSecondary }]}>(124 ulasan)</Text></Text>
              </View>
              <View style={styles.badge}>
                <Shield size={12} color={COLORS.gold[500]} />
                <Text style={styles.badgeText}>Terapis Terverifikasi</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Service Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Pilih Layanan</Text>
            <View style={styles.serviceLimitBadge}>
              <Sparkles size={12} color={COLORS.gold[500]} />
              <Text style={styles.limitText}>Premium</Text>
            </View>
          </View>
          
          {allServices.map((service) => (
            <TouchableOpacity 
              key={service.id} 
              onPress={() => setSelectedService(service)}
              activeOpacity={0.8}
              style={[
                styles.serviceItem,
                { backgroundColor: theme.surfaceVariant, borderColor: theme.border },
                selectedService.id === service.id && { borderColor: COLORS.primary[500], backgroundColor: isDark ? 'rgba(106, 13, 213, 0.05)' : 'rgba(106, 13, 213, 0.03)' }
              ]}
            >
              <View style={styles.serviceInfo}>
                <Text style={[styles.serviceName, { color: theme.text }]}>{service.name}</Text>
                <Text style={[styles.serviceDesc, { color: theme.textSecondary }]}>{service.description}</Text>
                <View style={styles.durationContainer}>
                  <Clock size={14} color={theme.textSecondary} />
                  <Text style={[styles.durationText, { color: theme.textSecondary }]}>{service.duration}</Text>
                </View>
              </View>
              <View style={styles.serviceRight}>
                <Text style={[
                  styles.servicePrice,
                  { color: theme.textSecondary },
                  selectedService.id === service.id && styles.selectedPriceText
                ]}>Rp {service.price.toLocaleString()}</Text>
                <View style={[
                  styles.checkbox,
                  { borderColor: theme.border },
                  selectedService.id === service.id && styles.checkboxActive
                ]}>
                  {selectedService.id === service.id && <Check size={12} color="white" />}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Location Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Lokasi Layanan</Text>
          <Card style={[styles.locationCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.locationIcon}>
              <MapPin size={22} color={COLORS.gold[500]} />
            </View>
            <View style={styles.locationTextContainer}>
              <Text style={[styles.locationLabel, { color: theme.textSecondary }]}>Alamat Anda</Text>
              <Text style={[styles.locationText, { color: theme.text }]}>Grand Indonesia, Jakarta Pusat</Text>
            </View>
            <TouchableOpacity style={[styles.changeButton, { backgroundColor: theme.surfaceVariant }]}>
              <Text style={styles.changeText}>Ubah</Text>
            </TouchableOpacity>
          </Card>
        </View>

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Footer / Summary */}
      <View style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <View style={styles.priceSummary}>
          <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>Total Bayar</Text>
          <Text style={[styles.totalPrice, { color: theme.text }]}>Rp {selectedService.price.toLocaleString()}</Text>
        </View>
        <Button 
          title="Konfirmasi Pesanan" 
          onPress={handleOrder} 
          style={styles.orderButton}
          size="lg"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    fontSize: 24,
  },
  therapistSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  therapistCard: {
    flexDirection: 'row',
    gap: 20,
    padding: 16,
    borderRadius: 28,
  },
  therapistImage: {
    width: 90,
    height: 90,
    borderRadius: 24,
  },
  therapistInfo: {
    justifyContent: 'center',
    flex: 1,
  },
  therapistName: {
    fontWeight: '800',
    fontSize: 20,
    fontFamily: TYPOGRAPHY.h3.fontFamily,
    marginBottom: 6,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  ratingText: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: '700',
  },
  reviewCount: {
    fontWeight: '400',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(253, 185, 39, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: COLORS.gold[500],
    fontSize: 11,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    fontSize: 20,
  },
  serviceLimitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(106, 13, 213, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  limitText: {
    color: COLORS.primary[400],
    fontSize: 10,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1.5,
  },
  serviceInfo: {
    flex: 1,
    paddingRight: 12,
  },
  serviceName: {
    fontWeight: '800',
    fontSize: 17,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    marginBottom: 4,
  },
  serviceDesc: {
    fontSize: 13,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    marginBottom: 10,
    lineHeight: 18,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  durationText: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: '600',
  },
  serviceRight: {
    alignItems: 'flex-end',
    gap: 12,
  },
  servicePrice: {
    fontWeight: '800',
    fontSize: 16,
    fontFamily: TYPOGRAPHY.h3.fontFamily,
  },
  selectedPriceText: {
    color: COLORS.gold[500],
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: COLORS.primary[500],
    borderColor: COLORS.primary[500],
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 24,
  },
  locationIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(253, 185, 39, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(253, 185, 39, 0.15)',
  },
  locationTextContainer: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    textTransform: 'uppercase',
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: '600',
  },
  changeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  changeText: {
    color: COLORS.gold[500],
    fontSize: 13,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    fontWeight: '800',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 44,
    borderTopWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
  },
  priceSummary: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.body.fontFamily,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  totalPrice: {
    fontSize: 24,
    fontFamily: TYPOGRAPHY.h1.fontFamily,
    fontWeight: '900',
  },
  orderButton: {
    flex: 1.3,
  },
});
