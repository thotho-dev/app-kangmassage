import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, StatusBar, Animated, PanResponder, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Phone, MessageCircle, MapPin, Clock, Navigation } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/Theme';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

const STATUS_STEPS = [
  { key: 'accepted',    label: 'Pesanan Diterima',   icon: 'checkmark-circle' },
  { key: 'on_the_way',  label: 'Menuju Lokasi',       icon: 'navigate'         },
  { key: 'arrived',     label: 'Tiba di Lokasi',      icon: 'location'         },
  { key: 'in_progress', label: 'Sedang Berlangsung',  icon: 'time'             },
  { key: 'completed',   label: 'Selesai',             icon: 'star'             },
];

export default function TrackingScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { id } = useLocalSearchParams();

  const [order, setOrder] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [routeCoords, setRouteCoords] = useState<{latitude: number, longitude: number}[]>([]);

  useEffect(() => {
    fetchOrder();
    fetchLogs();
    
    // Subscribe to order changes
    const orderChannel = supabase
      .channel(`order_tracking_${id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'orders',
        filter: `id=eq.${id}`
      }, (payload) => {
        setOrder((prev: any) => ({ ...prev, ...payload.new }));
      })
      .subscribe();

    // Subscribe to log changes
    const logsChannel = supabase
      .channel(`order_logs_${id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'order_logs',
        filter: `order_id=eq.${id}`
      }, (payload) => {
        setLogs((prev) => [payload.new, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
      supabase.removeChannel(logsChannel);
    };
  }, [id]);

  // Real-time listener khusus untuk pergerakan Lokasi Terapis
  useEffect(() => {
    if (!order?.therapist?.id) return;

    const locationChannel = supabase
      .channel(`therapist_loc_${order.therapist.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'therapist_locations',
        filter: `therapist_id=eq.${order.therapist.id}`
      }, (payload: any) => {
        if (payload.new && payload.new.latitude && payload.new.longitude) {
           console.log('[DEBUG Tracking User] Posisi Terapis Berubah Real-time:', payload.new.latitude, payload.new.longitude);
           setOrder((prev: any) => {
             if (!prev || !prev.therapist) return prev;
             return {
               ...prev,
               therapist: {
                 ...prev.therapist,
                 latitude: payload.new.latitude,
                 longitude: payload.new.longitude,
               }
             };
           });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(locationChannel);
    };
  }, [order?.therapist?.id]);

  // Fetch rute jalan raya (OSRM) setiap kali kordinat terapis berubah
  useEffect(() => {
    if (order?.latitude && order?.therapist) {
      const fetchRoute = async () => {
        try {
          const lat1 = order.therapist.latitude || (order.latitude + 0.005);
          const lon1 = order.therapist.longitude || (order.longitude + 0.005);
          const lat2 = order.latitude;
          const lon2 = order.longitude;

          const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson`);
          const data = await response.json();
          
          if (data.routes && data.routes.length > 0) {
            const coords = data.routes[0].geometry.coordinates.map((point: any) => ({
              latitude: point[1],
              longitude: point[0]
            }));
            setRouteCoords(coords);
          }
        } catch (error) {
          console.error("Gagal mengambil rute dari OSRM:", error);
        }
      };
      fetchRoute();
    }
  }, [order?.latitude, order?.therapist?.latitude, order?.therapist?.longitude]);

  const fetchLogs = async () => {
    const { data } = await supabase
      .from('order_logs')
      .select('*')
      .eq('order_id', id)
      .order('created_at', { ascending: false });
    if (data) setLogs(data);
  };

  const formatTime = (status: string) => {
    const log = logs.find(l => l.status === status);
    if (!log) return null;
    const date = new Date(log.created_at);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, service:services(*), therapist:therapists(*)')
        .eq('id', id)
        .single();

      if (error) throw error;
      setOrder(data);
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const currentStepIndex = order ? STATUS_STEPS.findIndex(s => s.key === order.status) : -1;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      {/* Map Area */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          region={{
            latitude: order?.latitude || -6.2020,
            longitude: order?.longitude || 106.8250,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          }}
          showsUserLocation={true}
        >
          {/* User Location Marker */}
          {order?.latitude && (
            <Marker
              coordinate={{ latitude: order.latitude, longitude: order.longitude }}
              title="Lokasi Anda"
              description={order.address}
            >
               <View style={styles.userMarker}>
                  <MapPin size={32} color={COLORS.error} fill={COLORS.error} />
               </View>
            </Marker>
          )}

          {/* Therapist Location Marker - Only show if assigned */}
          {order?.therapist && (
            <Marker
              coordinate={{ 
                latitude: order.therapist.latitude || (order.latitude + 0.005), 
                longitude: order.therapist.longitude || (order.longitude + 0.005) 
              }}
              title="Terapis"
              description={order.therapist.full_name}
            >
               <View style={styles.therapistMarker}>
                 <Image 
                  source={{ uri: order?.therapist?.avatar_url || 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400' }} 
                   style={styles.markerAvatar} 
                 />
                 <View style={styles.markerPulse} />
               </View>
            </Marker>
          )}

          {/* Rute Mengikuti Jalan (OSRM) */}
          {routeCoords.length > 0 ? (
            <Polyline
              coordinates={routeCoords}
              strokeColor={COLORS.primary[500] || '#240080'}
              strokeWidth={4}
            />
          ) : order?.latitude && order?.therapist && (
            <Polyline
              coordinates={[
                { latitude: order.latitude, longitude: order.longitude },
                { 
                  latitude: order.therapist.latitude || (order.latitude + 0.005), 
                  longitude: order.therapist.longitude || (order.longitude + 0.005) 
                }
              ]}
              strokeColor={COLORS.primary[500] || '#240080'}
              strokeWidth={3}
              lineDashPattern={[6, 6]}
            />
          )}
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
            <Text style={[styles.orderBadgeText, { color: theme.text }]}>{order?.order_number || 'ORD-...'}</Text>
          </View>
        </Animated.View>

        {/* Floating Therapist Info */}
        <Animated.View style={[styles.floatingInfo, { transform: [{ translateY: therapistCardTranslateY }] }]}>
          <View style={styles.infoCard}>
            <View style={styles.therapistInfo}>
              <View style={styles.avatarWrapper}>
                <Image 
                  source={{ uri: order?.therapist?.avatar_url || 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400' }}
                  style={styles.avatar}
                />
                <View style={[styles.onlineDot, { backgroundColor: order?.therapist ? COLORS.success : '#CBD5E1' }]} />
              </View>
              <View style={styles.textInfo}>
                <Text style={styles.name}>{order?.therapist?.full_name || 'Mencari Terapis...'}</Text>
                <View style={styles.statusRow}>
                  <Navigation size={10} color={COLORS.gold[500]} />
                  <Text style={styles.status}>
                    {order?.status === 'pending' ? 'Menunggu konfirmasi' : 
                     order?.status === 'on_the_way' ? 'Menuju lokasi Anda' :
                     order?.status === 'arrived' ? 'Sudah tiba di lokasi' :
                     order?.status === 'in_progress' ? 'Sedang melakukan layanan' :
                     order?.status === 'completed' ? 'Layanan selesai' : 'Memproses...'}
                  </Text>
                </View>
              </View>
            </View>
            {order?.therapist && (
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.actionBtn}>
                  <Phone size={18} color='#6B7280' />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.msgBtn]}>
                  <MessageCircle size={18} color="white" />
                </TouchableOpacity>
              </View>
            )}
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

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Status Pesanan</Text>
              <View style={styles.stepsCard}>
                {STATUS_STEPS.map((step, i) => {
                  // Jika status saat ini 'pending' (belum accepted), semua steps belum jalan
                  // Jika order belum dapet therapist (pending), index = -1
                  const isDone = currentStepIndex >= 0 && i <= currentStepIndex;
                  const isCurrent = currentStepIndex >= 0 && i === currentStepIndex;
                  
                  return (
                    <View key={step.key} style={styles.step}>
                      <View style={styles.stepLeft}>
                        <View style={[styles.stepIcon, isDone ? styles.stepDone : isCurrent ? styles.stepCurrent : styles.stepPending]}>
                          <Ionicons
                            name={isDone && !isCurrent ? 'checkmark' : step.icon as any}
                            size={16}
                            color={isDone ? '#FFFFFF' : isCurrent ? COLORS.primary[600] : '#94A3B8'}
                          />
                        </View>
                        {i < STATUS_STEPS.length - 1 && (
                          <View style={[styles.stepLine, isDone && !isCurrent && styles.stepLineDone]} />
                        )}
                      </View>
                      <Text style={[styles.stepLabel, isDone && styles.stepLabelDone, isCurrent && styles.stepLabelCurrent]}>
                        {step.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>Detail Pesanan</Text>
              <View style={[styles.detailCard, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                <View style={styles.detailRow}>
                  <View style={styles.detailInfo}>
                    <View style={styles.serviceIconWrapper}>
                      <Clock size={16} color="#240080" />
                    </View>
                    <View>
                      <Text style={styles.detailLabel}>Layanan & Unit</Text>
                      <Text style={styles.detailValue}>
                        {order?.service?.name} • {order?.service?.price_type === 'treatment' ? '1 Treatment' : `${order?.duration} Menit`}
                      </Text>
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
                      <Text style={styles.detailLabel}>Pembayaran ({order?.payment_method?.toUpperCase()})</Text>
                      <Text style={styles.detailValue}>{order?.payment_status === 'paid' ? 'Lunas (Dibayar)' : 'Menunggu Pembayaran'}</Text>
                    </View>
                  </View>
                  <Text style={styles.detailPrice}>Rp {(order?.total_price || 0).toLocaleString('id-ID')}</Text>
                </View>
              </View>
            </View>

            <View style={[styles.addressCard, { backgroundColor: theme.surfaceVariant, borderColor: theme.border, marginTop: 20 }]}>
               <View style={styles.addressIconWrapper}>
                  <MapPin size={20} color="#FDB927" />
               </View>
               <View style={styles.addressInfo}>
                  <Text style={[styles.addressLabel, { color: theme.textSecondary }]}>Tujuan</Text>
                  <Text style={[styles.addressText, { color: theme.text }]}>{order?.address || 'Alamat tidak ditemukan'}</Text>
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
  section: { paddingHorizontal: 4, marginTop: 10, marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontFamily: 'Inter-Bold', color: '#1A1A2E', marginBottom: 12 },
  stepsCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#F0F0F0' },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 4 },
  stepLeft: { alignItems: 'center', width: 32 },
  stepIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepDone: { backgroundColor: '#10B981' },
  stepCurrent: { backgroundColor: 'rgba(36, 0, 128, 0.1)', borderWidth: 2, borderColor: COLORS.primary[600] },
  stepPending: { backgroundColor: '#F0F0F0' },
  stepLine: { width: 2, height: 24, backgroundColor: '#F0F0F0', marginVertical: 2 },
  stepLineDone: { backgroundColor: '#10B981' },
  stepLabel: { fontSize: 13, fontFamily: 'Inter-Medium', color: '#94A3B8', paddingTop: 6 },
  stepLabelDone: { color: '#10B981' },
  stepLabelCurrent: { fontSize: 13, fontFamily: 'Inter-SemiBold', color: COLORS.primary[600] },
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
