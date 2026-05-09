import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, StatusBar, Animated, PanResponder, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Phone, MessageCircle, MapPin, Clock, Navigation } from 'lucide-react-native';
import MapView, { Marker } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/Theme';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function TrackingScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { id } = useLocalSearchParams();

  // Animations
  const slideAnim = useRef(new Animated.Value(0)).current;
  const lastOffset = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 10,
      onPanResponderGrant: () => {
        slideAnim.setOffset(lastOffset.current);
        slideAnim.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        // Prevent sliding up past the very top (0)
        const newY = gestureState.dy;
        if (lastOffset.current + newY < 0) {
          slideAnim.setValue(-lastOffset.current);
        } else {
          slideAnim.setValue(newY);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        slideAnim.flattenOffset();
        const currentY = lastOffset.current + gestureState.dy;
        
        let toValue = 0;
        // Thresholds for snapping down
        if (gestureState.dy > 50 || gestureState.vy > 0.5) {
          toValue = 350;
        // Thresholds for snapping up
        } else if (gestureState.dy < -50 || gestureState.vy < -0.5) {
          toValue = 0;
        } else {
          // Snap to closest position
          toValue = currentY > 175 ? 350 : 0;
        }

        lastOffset.current = toValue;
        Animated.spring(slideAnim, {
          toValue,
          useNativeDriver: true,
          bounciness: 4,
        }).start();
      },
    })
  ).current;

  // Interpolations
  const headerOpacity = slideAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const therapistCardTranslateY = slideAnim.interpolate({
    inputRange: [0, 200],
    outputRange: [0, -80], // 140 (floatingInfo) - 60 (header) = 80
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      {/* Map Area */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: -6.2020,
            longitude: 106.8250,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          }}
          showsUserLocation={false}
          showsCompass={false}
          showsMyLocationButton={false}
          scrollEnabled={false}
          zoomEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
        >
          {/* User Location Marker */}
          <Marker
            coordinate={{ latitude: -6.1951, longitude: 106.8204 }}
            title="Tujuan"
            description="Grand Indonesia, East Mall"
          >
             <View style={styles.userMarker}>
                <MapPin size={32} color={COLORS.error} fill={COLORS.error} />
             </View>
          </Marker>

          {/* Therapist Location Marker */}
          <Marker
            coordinate={{ latitude: -6.2020, longitude: 106.8250 }}
            title="Terapis"
            description="Maya Putri"
          >
             <View style={styles.therapistMarker}>
               <Image source={{ uri: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400' }} style={styles.markerAvatar} />
               <View style={styles.markerPulse} />
             </View>
          </Marker>
        </MapView>
        <LinearGradient
          colors={isDark ? ['rgba(2, 6, 23, 0.9)', 'rgba(2, 6, 23, 0)'] : ['rgba(255, 255, 255, 0.7)', 'rgba(255, 255, 255, 0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        
        {/* Header Overlay */}
        <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={[styles.orderBadge, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.orderBadgeText, { color: theme.text }]}>{id || 'ORD-9821'}</Text>
          </View>
        </Animated.View>

        {/* Floating Therapist Info */}
        <Animated.View style={[styles.floatingInfo, { transform: [{ translateY: therapistCardTranslateY }] }]}>
          <View style={styles.infoCard}>
            <View style={styles.therapistInfo}>
              <View style={styles.avatarWrapper}>
                <Image 
                  source={{ uri: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400' }}
                  style={styles.avatar}
                />
                <View style={styles.onlineDot} />
              </View>
              <View style={styles.textInfo}>
                <Text style={styles.name}>Maya Putri</Text>
                <View style={styles.statusRow}>
                  <Navigation size={10} color={COLORS.gold[500]} />
                  <Text style={styles.status}>Menuju ke lokasi Anda</Text>
                </View>
              </View>
            </View>
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionBtn}>
                <Phone size={18} color='#6B7280' />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.msgBtn]}>
                <MessageCircle size={18} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Bottom Status Card */}
      <Animated.View 
        style={[
          styles.statusCard, 
          { backgroundColor: theme.surface, borderTopColor: theme.border },
          { transform: [{ translateY: slideAnim }] }
        ]}
      >
         <View 
           style={styles.dragHandleContainer}
           {...panResponder.panHandlers}
         >
           <View style={[styles.dragHandle, { backgroundColor: theme.border }]} />
         </View>
         
         <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            <View style={styles.etaContainer}>
               <View>
                  <Text style={[styles.etaLabel, { color: theme.textSecondary }]}>Perkiraan Tiba</Text>
                  <Text style={[styles.etaTime, { color: theme.text }]}>12 <Text style={styles.etaUnit}>menit</Text></Text>
               </View>
               <View style={styles.etaIconWrapper}>
                  <LinearGradient
                    colors={['#240080', '#12004D']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.etaIcon}
                  >
                     <Clock size={28} color="white" />
                  </LinearGradient>
               </View>
            </View>

            <View style={styles.timeline}>
               <View style={styles.timelineItem}>
                  <View style={styles.timelineDotActive} />
                  <View style={styles.timelineLine} />
                  <Text style={[styles.timelineTextActive, { color: theme.text }]}>Pesanan Dikonfirmasi</Text>
               </View>
               <View style={styles.timelineItem}>
                  <View style={styles.timelineDotActive} />
                  <View style={styles.timelineLine} />
                  <Text style={[styles.timelineTextActive, { color: theme.text }]}>Terapis Ditugaskan</Text>
               </View>
               <View style={styles.timelineItem}>
                  <View style={styles.timelineDotPulse} />
                  <View style={styles.timelineLineInactive} />
                  <Text style={[styles.timelineTextActive, { color: '#FDB927', fontWeight: '800' }]}>Dalam Perjalanan</Text>
               </View>
               <View style={styles.timelineItem}>
                  <View style={[styles.timelineDotInactive, { backgroundColor: theme.border }]} />
                  <Text style={[styles.timelineTextInactive, { color: theme.textSecondary }]}>Tiba & Mulai Sesi</Text>
               </View>
            </View>

            {/* Detail Pesanan Section */}
            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>Detail Pesanan</Text>
              <View style={[styles.detailCard, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                <View style={styles.detailRow}>
                  <View style={styles.detailInfo}>
                    <View style={styles.serviceIconWrapper}>
                      <Clock size={16} color="#240080" />
                    </View>
                    <View>
                      <Text style={styles.detailLabel}>Layanan & Durasi</Text>
                      <Text style={styles.detailValue}>Swedish Massage • 90 Menit</Text>
                    </View>
                  </View>
                </View>
                
                <View style={[styles.detailDivider, { backgroundColor: theme.border }]} />
                
                <View style={styles.detailRow}>
                  <View style={styles.detailInfo}>
                    <View style={styles.serviceIconWrapper}>
                      <MessageCircle size={16} color="#240080" />
                    </View>
                    <View>
                      <Text style={styles.detailLabel}>Pembayaran</Text>
                      <Text style={styles.detailValue}>Tunai (Cash on Delivery)</Text>
                    </View>
                  </View>
                  <Text style={styles.detailPrice}>Rp 165.000</Text>
                </View>
              </View>
            </View>

            <View style={[styles.addressCard, { backgroundColor: theme.surfaceVariant, borderColor: theme.border, marginTop: 20 }]}>
               <View style={styles.addressIconWrapper}>
                  <MapPin size={20} color="#FDB927" />
               </View>
               <View style={styles.addressInfo}>
                  <Text style={[styles.addressLabel, { color: theme.textSecondary }]}>Tujuan</Text>
                  <Text style={[styles.addressText, { color: theme.text }]} numberOfLines={1}>Grand Indonesia, East Mall, Fl 5</Text>
               </View>
            </View>

            <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: isDark ? 'rgba(231, 76, 60, 0.05)' : 'rgba(231, 76, 60, 0.03)', borderColor: 'rgba(231, 76, 60, 0.1)', marginTop: 10 }]} activeOpacity={0.7}>
               <Text style={styles.cancelText}>Batalkan Pesanan</Text>
            </TouchableOpacity>
         </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    position: 'absolute',
    top: 60,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  orderBadge: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  orderBadgeText: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.8,
  },
  floatingInfo: {
    position: 'absolute',
    top: 130,
    left: 10,
    right: 10,
    zIndex: 10,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  therapistInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
  },
  onlineDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.success,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  textInfo: {
    justifyContent: 'center',
  },
  name: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  status: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F7',
    borderWidth: 0,
  },
  msgBtn: {
    backgroundColor: COLORS.primary[600],
    borderColor: COLORS.primary[500],
  },
  statusCard: {
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderTopWidth: 1.5,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Dimensions.get('window').height - 200,
  },
  dragHandleContainer: {
    width: '100%',
    paddingTop: 24,
    paddingBottom: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 28,
  },
  etaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 36,
  },
  etaLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  etaTime: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
  },
  etaUnit: {
    fontSize: 14,
    color: COLORS.gold[500],
    fontFamily: 'Inter-SemiBold',
  },
  etaIconWrapper: {
    shadowColor: COLORS.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  etaIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeline: {
    marginBottom: 36,
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    gap: 18,
  },
  timelineDotActive: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary[500],
    zIndex: 1,
  },
  timelineDotPulse: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.gold[500],
    zIndex: 1,
    borderWidth: 3,
    borderColor: 'rgba(253, 185, 39, 0.3)',
  },
  timelineDotInactive: {
    width: 12,
    height: 12,
    borderRadius: 6,
    zIndex: 1,
  },
  timelineLine: {
    position: 'absolute',
    left: 5.5,
    top: 22,
    width: 1.5,
    height: 34,
    backgroundColor: COLORS.primary[500],
  },
  timelineLineInactive: {
    position: 'absolute',
    left: 5.5,
    top: 22,
    width: 1.5,
    height: 34,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  timelineTextActive: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  timelineTextInactive: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  addressCard: {
    flexDirection: 'row',
    borderRadius: 24,
    padding: 18,
    alignItems: 'center',
    gap: 16,
    marginBottom: 28,
    borderWidth: 1.5,
  },
  addressIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(253, 185, 39, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressInfo: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
  },
  cancelText: {
    color: '#E74C3C',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  detailSection: {
    marginTop: 10,
  },
  detailTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#1A1A2E',
    marginBottom: 12,
  },
  detailCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  serviceIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(36, 0, 128, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#1A1A2E',
  },
  detailPrice: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    color: '#240080',
  },
  detailDivider: {
    height: 1,
    marginVertical: 14,
  },
  userMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  therapistMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    padding: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  markerAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  markerPulse: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.success,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
