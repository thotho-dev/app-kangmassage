import React from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  StatusBar,
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Clock, Star, ChevronRight, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SERVICES } from '../../constants/Services';
import { useServices } from '../../hooks/useServices';
import { COLORS, TYPOGRAPHY } from '../../constants/Theme';
import { useTheme } from '../../context/ThemeContext';
import Card from '../../components/ui/Card';

const { width } = Dimensions.get('window');

export default function ServicesScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { data: servicesData, isLoading } = useServices();

  const displayServices = servicesData || SERVICES;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={[styles.backButton, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}
        >
          <ArrowLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Layanan Kami</Text>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.introSection}>
          <Text style={[styles.introTitle, { color: theme.text }]}>Pilih Perawatan Terbaik</Text>
          <Text style={[styles.introSubtitle, { color: theme.textSecondary }]}>
            Nikmati berbagai pilihan layanan pijat profesional langsung ke tempat Anda.
          </Text>
        </View>

        <View style={styles.servicesGrid}>
          {isLoading && (
            <Text style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 20 }}>
              Memuat layanan...
            </Text>
          )}
          {displayServices.map((service) => (
            <TouchableOpacity 
              key={service.id}
              activeOpacity={0.9}
              onPress={() => router.push({ pathname: '/(main)/order', params: { serviceId: service.id } })}
              style={styles.serviceWrapper}
            >
              <Card style={[styles.serviceCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <LinearGradient
                  colors={[`${service.color}15`, `${service.color}05`]}
                  style={styles.cardGradient}
                >
                  <View style={[styles.iconContainer, { backgroundColor: `${service.color}20` }]}>
                    <Text style={styles.iconText}>{service.icon}</Text>
                  </View>
                  
                  <View style={styles.contentContainer}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.serviceName, { color: theme.text }]}>{service.name}</Text>
                      {service.id === 'premium-all-in' && (
                        <View style={styles.premiumBadge}>
                          <Sparkles size={10} color={COLORS.gold[500]} />
                          <Text style={styles.premiumText}>VIP</Text>
                        </View>
                      )}
                    </View>
                    
                    <Text style={[styles.serviceDescription, { color: theme.textSecondary }]} numberOfLines={2}>
                      {service.description}
                    </Text>

                    <View style={styles.footer}>
                      <View style={styles.metaRow}>
                        <Clock size={14} color={theme.textSecondary} />
                        <Text style={[styles.metaText, { color: theme.textSecondary }]}>{service.duration}</Text>
                      </View>
                      <Text style={[styles.priceText, { color: COLORS.gold[500] }]}>
                        Rp {service.price.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={[styles.actionButton, { backgroundColor: theme.surfaceVariant }]}>
                    <ChevronRight size={18} color={theme.textSecondary} />
                  </View>
                </LinearGradient>
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    zIndex: 10,
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
    fontSize: 22,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  introSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
    marginTop: 10,
  },
  introTitle: {
    ...TYPOGRAPHY.h1,
    fontSize: 28,
    marginBottom: 8,
  },
  introSubtitle: {
    ...TYPOGRAPHY.body,
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.8,
  },
  servicesGrid: {
    paddingHorizontal: 20,
    gap: 16,
  },
  serviceWrapper: {
    width: '100%',
  },
  serviceCard: {
    borderRadius: 24,
    overflow: 'hidden',
    padding: 0,
    borderWidth: 1,
  },
  cardGradient: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  iconText: {
    fontSize: 30,
  },
  contentContainer: {
    flex: 1,
    paddingRight: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  serviceName: {
    ...TYPOGRAPHY.h3,
    fontSize: 17,
    fontWeight: '800',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(253, 185, 39, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  premiumText: {
    color: COLORS.gold[500],
    fontSize: 10,
    fontWeight: '900',
  },
  serviceDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '900',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
