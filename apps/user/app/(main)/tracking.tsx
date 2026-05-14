import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, StatusBar, Animated, PanResponder, ScrollView, Alert, TextInput, ActivityIndicator, Modal, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PURPLE = '#240080';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Phone, MessageCircle, MapPin, Clock, Navigation, Star, Send, CheckCircle2, X, Calendar, ClipboardList } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '@/constants/Theme';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';

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
  
  // Rating State
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);

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
        console.log('[DEBUG Tracking User] Order Updated:', payload.new.status);
        // Re-fetch full order to get nested data (therapist, service)
        fetchOrder();
        fetchLogs();
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
        setLogs((prev: any) => [payload.new, ...prev]);
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
            
            // Extract duration from OSRM (seconds to minutes)
            const durationInSeconds = data.routes[0].duration;
            setEtaMinutes(Math.ceil(durationInSeconds / 60));
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
    const log = logs.find((l: any) => l.status === status);
    if (!log) return null;
    const date = new Date(log.created_at);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const fetchOrder = async () => {
    if (!id || typeof id !== 'string') {
      console.warn('[DEBUG Tracking User] Invalid ID:', id);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, service:services(*), therapist:therapists(*)')
        .eq('id', id)
        .single();

      if (error) {
        console.error('[DEBUG Tracking User] Supabase Fetch Error:', error);
        throw error;
      }
      
      console.log('[DEBUG Tracking User] Order Fetched:', data?.status);
      setOrder(data);
      
      // Auto show rating modal if completed and not rated
      if (data && data.status === 'completed' && !data.rating) {
        setTimeout(() => setShowRatingModal(true), 1500);
      }
    } catch (error) {
      console.error('[DEBUG Tracking User] Catch Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitRating = async () => {
    if (rating === 0) {
      Alert.alert('Peringatan', 'Silakan pilih bintang terlebih dahulu.');
      return;
    }

    setIsSubmittingRating(true);
    try {
      // 1. Update order rating
      const { error } = await supabase
        .from('orders')
        .update({ 
          rating, 
          review,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      
      // 2. Sync Therapist Rating
      const therapistId = order?.therapist?.id || order?.therapist_id;
      console.log('[DEBUG Rating] Target Therapist ID:', therapistId);
      
      if (therapistId) {
        // Fetch ALL ratings for this therapist to calculate average
        const { data: allRatings, error: fetchErr } = await supabase
          .from('orders')
          .select('id, rating')
          .eq('therapist_id', therapistId)
          .not('id', 'eq', id) // Get OTHER ratings
          .not('rating', 'is', null);
        
        if (fetchErr) {
          console.error('[DEBUG Rating] Error fetching other ratings:', fetchErr);
        }

        // Combine other ratings with the CURRENT rating
        const otherRatings = allRatings || [];
        const total = otherRatings.reduce((sum, r) => sum + (r.rating || 0), 0) + rating;
        const count = otherRatings.length + 1;
        const avg = total / count;
        
        console.log('[DEBUG Rating] New Calculation -> Total:', total, 'Count:', count, 'Avg:', avg);

        const { error: updateErr } = await supabase
          .from('therapists')
          .update({ 
            rating: avg,
            total_reviews: count 
          })
          .eq('id', therapistId);
          
        if (updateErr) {
          console.error('[DEBUG Rating] Error updating therapist profile:', updateErr);
        } else {
          console.log('[DEBUG Rating] Therapist profile updated successfully with avg:', avg);
        }
      } else {
        console.warn('[DEBUG Rating] No therapist ID found to sync rating');
      }
      
      setHasRated(true);
      Alert.alert('Terima Kasih', 'Rating dan ulasan Anda telah kami terima.');
    } catch (err) {
      console.error('Error submitting rating:', err);
      Alert.alert('Gagal', 'Gagal mengirim rating. Silakan coba lagi.');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const handleCancel = () => {
    // Disable jika sudah jalan ke lokasi
    if (order?.status === 'on_the_way' || order?.status === 'arrived' || order?.status === 'in_progress') {
      Alert.alert('Gagal', 'Pesanan tidak bisa dibatalkan karena terapis sudah menuju lokasi atau sedang melayani.');
      return;
    }

    Alert.alert(
      'Batalkan Pesanan?',
      'Apakah Anda yakin ingin membatalkan pesanan ini?',
      [
        { text: 'Tidak', style: 'cancel' },
        { 
          text: 'Ya, Batalkan', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Atomic check: only cancel if still pending or matching
              const { data, error } = await supabase
                .from('orders')
                .update({ status: 'cancelled' })
                .eq('id', id)
                .in('status', ['pending', 'accepted'])
                .select();

              if (error) throw error;

              if (data && data.length > 0) {
                // Add log entry
                await supabase.from('order_logs').insert({
                  order_id: id,
                  status: 'cancelled',
                  note: 'Dibatalkan oleh anda'
                });
                Alert.alert('Berhasil', 'Pesanan Anda telah dibatalkan.');
              }

              router.replace('/(main)/home');
            } catch (err) {
              console.error('Cancel order error:', err);
              Alert.alert('Error', 'Gagal membatalkan pesanan.');
            }
          }
        }
      ]
    );
  };

  const handleCall = () => {
    if (order?.status === 'completed' || order?.status === 'cancelled') {
      Alert.alert('Selesai', 'Anda tidak dapat menghubungi terapis untuk pesanan yang sudah selesai atau dibatalkan.');
      return;
    }
    if (order?.therapist?.phone) {
      Linking.openURL(`tel:${order.therapist.phone}`);
    } else {
      Alert.alert('Info', 'Nomor telepon terapis tidak tersedia.');
    }
  };

  const handleChat = async () => {
    if (order?.status === 'completed' || order?.status === 'cancelled') {
      Alert.alert('Selesai', 'Fitur chat dinonaktifkan untuk pesanan yang sudah selesai atau dibatalkan.');
      return;
    }
    if (!order?.therapist_id || !order?.user_id) return;
    
    setLoading(true);
    try {
      // 1. Cek apakah percakapan sudah ada
      const { data: existingChat, error: fetchError } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', order.user_id)
        .eq('therapist_id', order.therapist_id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingChat) {
        router.push(`/chats/${existingChat.id}`);
      } else {
        // 2. Jika belum ada, buat percakapan baru
        const { data: newChat, error: createError } = await supabase
          .from('conversations')
          .insert({
            user_id: order.user_id,
            therapist_id: order.therapist_id,
            last_message: 'Halo, saya pelanggan untuk pesanan ' + order.order_number,
            last_message_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) throw createError;
        router.push(`/chats/${newChat.id}`);
      }
    } catch (err) {
      console.error('Handle chat error:', err);
      Alert.alert('Error', 'Gagal membuka percakapan.');
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      {/* Map Area - Hidden when completed */}
      {order?.status !== 'completed' && (
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
                       order?.status === 'completed' ? 'Layanan selesai' :
                       order?.status === 'cancelled' ? 'Pesanan ini telah dibatalkan' : 'Memproses...'}
                    </Text>
                  </View>
                </View>
              </View>
              {order?.therapist && (
                <View style={[styles.actionButtons, (order?.status === 'completed' || order?.status === 'cancelled') && { opacity: 0.5 }]}>
                  <TouchableOpacity 
                    style={styles.actionBtn} 
                    onPress={handleCall}
                    disabled={order?.status === 'completed' || order?.status === 'cancelled'}
                  >
                    <Phone size={18} color='#6B7280' />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.msgBtn]} 
                    onPress={handleChat}
                    disabled={order?.status === 'completed' || order?.status === 'cancelled'}
                  >
                    <MessageCircle size={18} color="white" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </Animated.View>
        </View>
      )}

      {/* Completed Header - Show only when completed */}
      {order?.status === 'completed' && (
        <View style={[styles.completedHeader, { backgroundColor: theme.surface }]}>
           <TouchableOpacity onPress={() => router.replace('/(main)/home')} style={[styles.backButton, { backgroundColor: theme.surfaceVariant }]}>
              <ChevronLeft size={24} color={theme.text} />
           </TouchableOpacity>
           <Text style={[styles.headerTitleCompleted, { color: theme.text }]}>Ringkasan Pesanan</Text>
           <View style={{ width: 40 }} />
        </View>
      )}

      {/* Bottom Status Card */}
      <Animated.View 
        style={[
          styles.statusCard, 
          { backgroundColor: theme.surface, borderTopColor: theme.border },
          order?.status === 'completed' ? { position: 'relative', flex: 1, borderTopWidth: 0, height: 'auto', borderTopLeftRadius: 0, borderTopRightRadius: 0, shadowOpacity: 0, elevation: 0 } : { transform: [{ translateY: slideAnim }] }
        ]}
      >
         {order?.status !== 'completed' && (
           <View 
             style={styles.dragHandleContainer}
             {...panResponder.panHandlers}
           >
             <View style={[styles.dragHandle, { backgroundColor: theme.border }]} />
           </View>
         )}
         
         <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            {/* ETA Section - Only show if therapist is on the way or pending */}
            {(order?.status === 'pending' || order?.status === 'accepted' || order?.status === 'on_the_way') && (
              <View style={styles.etaContainer}>
                 <View>
                    <Text style={[styles.etaLabel, { color: theme.textSecondary }]}>Perkiraan Tiba</Text>
                    <Text style={[styles.etaTime, { color: theme.text }]}>
                      {etaMinutes || '--'} <Text style={styles.etaUnit}>menit</Text>
                    </Text>
                 </View>
                 <View style={styles.etaIconWrapper}>
                    <LinearGradient
                      colors={[PURPLE, '#12004D']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.etaIcon}
                    >
                       <Clock size={28} color="white" />
                    </LinearGradient>
                 </View>
              </View>
            )}

            {order?.status === 'cancelled' && (
              <View style={[styles.cancelledBanner, { backgroundColor: COLORS.error + '10', borderColor: COLORS.error + '30' }]}>
                <Ionicons name="alert-circle" size={24} color={COLORS.error} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cancelledTitle, { color: COLORS.error }]}>
                    {logs.find((l: any) => l.status === 'cancelled')?.note === 'Dibatalkan oleh terapis' 
                      ? 'Dibatalkan oleh Terapis' 
                      : 'Pesanan Dibatalkan'}
                  </Text>
                  <Text style={[styles.cancelledSub, { color: theme.textSecondary }]}>
                    {logs.find((l: any) => l.status === 'cancelled')?.note || 'Maaf, pesanan ini telah dibatalkan. Silakan hubungi admin jika ada kendala.'}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={[styles.homeBtn, { backgroundColor: COLORS.error }]}
                  onPress={() => router.replace('/(main)/home')}
                >
                  <Text style={styles.homeBtnText}>Home</Text>
                </TouchableOpacity>
              </View>
            )}

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
                {/* Service & Time */}
                <View style={styles.detailRow}>
                  <View style={styles.detailInfo}>
                    <View style={styles.serviceIconWrapper}>
                      <Clock size={16} color="#240080" />
                    </View>
                    <View>
                      <Text style={styles.detailLabel}>Layanan & Durasi</Text>
                      <Text style={styles.detailValue}>
                        {order?.service?.name}
                      </Text>
                      <Text style={[styles.detailValueSmall, { color: PURPLE }]}>
                        {order?.service?.price_type === 'treatment' ? '1 Treatment' : `${order?.duration || 0} Menit`}
                      </Text>
                    </View>
                  </View>
                </View>

                {order?.scheduled_at && (
                  <>
                    <View style={[styles.detailDivider, { backgroundColor: theme.border, marginVertical: 12 }]} />
                    <View style={styles.detailRow}>
                      <View style={styles.detailInfo}>
                        <View style={styles.serviceIconWrapper}>
                          <Calendar size={16} color="#240080" />
                        </View>
                        <View>
                          <Text style={styles.detailLabel}>Waktu Kedatangan</Text>
                          <Text style={styles.detailValue}>{new Date(order.scheduled_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</Text>
                        </View>
                      </View>
                    </View>
                  </>
                )}

                {order?.user_notes && (
                  <>
                    <View style={[styles.detailDivider, { backgroundColor: theme.border, marginVertical: 12 }]} />
                    <View style={styles.detailRow}>
                      <View style={styles.detailInfo}>
                        <View style={styles.serviceIconWrapper}>
                          <ClipboardList size={16} color="#240080" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.detailLabel}>Catatan</Text>
                          <Text style={styles.detailValue} numberOfLines={2}>{order.user_notes}</Text>
                        </View>
                      </View>
                    </View>
                  </>
                )}
                
                <View style={[styles.detailDivider, { backgroundColor: theme.border, marginVertical: 16, height: 1.5 }]} />
                
                {/* Price Breakdown */}
                <View style={styles.priceBreakdown}>
                   <View style={styles.priceRow}>
                      <Text style={[styles.priceLabelSmall, { color: theme.textSecondary }]}>Harga Layanan</Text>
                      <Text style={[styles.priceValueSmall, { color: theme.text }]}>Rp {(order?.service_price || 0).toLocaleString('id-ID')}</Text>
                   </View>
                   {order?.discount_amount > 0 && (
                     <View style={styles.priceRow}>
                        <Text style={[styles.priceLabelSmall, { color: theme.textSecondary }]}>Diskon Voucher</Text>
                        <Text style={[styles.priceValueSmall, { color: COLORS.success }]}>-Rp {(order?.discount_amount || 0).toLocaleString('id-ID')}</Text>
                     </View>
                   )}
                  <View style={[styles.priceRow, { marginTop: 8 }]}>
                      <View>
                        <Text style={[styles.totalLabel, { color: theme.text }]}>Total Bayar</Text>
                        <Text style={[styles.paymentMethod, { color: theme.textSecondary }]}>Metode: {order?.payment_method?.toUpperCase()} ({order?.payment_status === 'paid' ? 'Lunas' : 'Belum Bayar'})</Text>
                      </View>
                      <Text style={styles.detailPrice}>Rp {(order?.total_price || 0).toLocaleString('id-ID')}</Text>
                   </View>
                </View>

                {order?.status === 'completed' && (order?.rating || order?.review) && (
                  <View style={[styles.ratingDisplaySection, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }]}>
                    <View style={styles.ratingDisplayHeader}>
                      <View style={styles.displayStars}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Ionicons 
                            key={s} 
                            name={s <= (order.rating || 0) ? "star" : "star-outline"} 
                            size={14} 
                            color={s <= (order.rating || 0) ? "#F59E0B" : theme.textSecondary} 
                          />
                        ))}
                      </View>
                      <Text style={[styles.ratingDisplayText, { color: theme.textSecondary }]}>
                        {order.rating ? `${order.rating}.0` : 'No rating'}
                      </Text>
                    </View>
                    {order.review && (
                      <Text style={[styles.reviewDisplayText, { color: theme.text }]} numberOfLines={2}>
                        "{order.review}"
                      </Text>
                    )}
                  </View>
                )}

                {/* Rating History Display */}
                {(order?.rating || hasRated) && !order?.review && !order?.rating && (
                  <>
                    <View style={[styles.detailDivider, { backgroundColor: theme.border, marginVertical: 16, height: 1.5 }]} />
                    <View style={styles.ratingHistory}>
                       <View style={styles.ratingHistoryHeader}>
                          <Text style={[styles.detailLabel, { marginBottom: 4 }]}>Rating & Ulasan Anda</Text>
                          <View style={styles.starsRowSmall}>
                             {[1, 2, 3, 4, 5].map((s) => (
                               <Star 
                                 key={s} 
                                 size={14} 
                                 color={s <= (order?.rating || rating) ? '#FDB927' : '#E2E8F0'} 
                                 fill={s <= (order?.rating || rating) ? '#FDB927' : 'transparent'} 
                               />
                             ))}
                          </View>
                       </View>
                       {(order?.review || review) ? (
                         <Text style={[styles.ratingHistoryText, { color: theme.text }]}>"{order?.review || review}"</Text>
                       ) : (
                         <Text style={[styles.ratingHistoryText, { color: theme.textSecondary, fontStyle: 'italic' }]}>Tidak ada ulasan tertulis.</Text>
                       )}
                    </View>
                  </>
                )}
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



            {order?.status === 'completed' && !order?.rating && !hasRated && (
              <TouchableOpacity 
                style={[styles.openRatingBtn, { borderColor: COLORS.gold[500] }]}
                onPress={() => setShowRatingModal(true)}
              >
                <Star size={20} color={COLORS.gold[500]} fill={COLORS.gold[500]} />
                <Text style={[styles.openRatingText, { color: COLORS.gold[600] }]}>Beri Rating & Ulasan</Text>
              </TouchableOpacity>
            )}

            {order?.status !== 'cancelled' && order?.status !== 'completed' && (
              <TouchableOpacity 
                style={[
                  styles.cancelBtn, 
                  { backgroundColor: isDark ? 'rgba(231, 76, 60, 0.05)' : 'rgba(231, 76, 60, 0.03)', borderColor: 'rgba(231, 76, 60, 0.1)', marginTop: 10 },
                  (order?.status === 'on_the_way' || order?.status === 'arrived' || order?.status === 'in_progress') && { opacity: 0.3 }
                ]} 
                activeOpacity={0.7}
                onPress={handleCancel}
                disabled={order?.status === 'on_the_way' || order?.status === 'arrived' || order?.status === 'in_progress'}
              >
                 <Text style={styles.cancelText}>Batalkan Pesanan</Text>
              </TouchableOpacity>
            )}
         </ScrollView>
      </Animated.View>

      {/* Rating Bottom Sheet Modal */}
      <Modal
        visible={showRatingModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRatingModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowRatingModal(false)}
        >
          <Pressable style={[styles.ratingBottomSheet, { backgroundColor: theme.surface }]}>
            <View style={[styles.sheetHandle, { backgroundColor: theme.border }]} />
            <TouchableOpacity 
              style={styles.closeModalBtn}
              onPress={() => setShowRatingModal(false)}
            >
              <X size={20} color={theme.textSecondary} />
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.sheetHeader}>
                <Image 
                  source={{ uri: order?.therapist?.avatar_url || 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400' }}
                  style={styles.sheetAvatar}
                />
                <Text style={[styles.ratingTitle, { color: theme.text }]}>Beri Rating Layanan</Text>
                <Text style={[styles.ratingSubtitle, { color: theme.textSecondary }]}>
                  Bagaimana pelayanan dari {order?.therapist?.full_name || 'Terapis'}? Ulasan Anda sangat berharga bagi kami.
                </Text>
              </View>
              
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity 
                    key={star} 
                    onPress={() => setRating(star)}
                    activeOpacity={0.7}
                  >
                    <Star 
                      size={42} 
                      color={star <= rating ? '#FDB927' : '#E2E8F0'} 
                      fill={star <= rating ? '#FDB927' : 'transparent'} 
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={[styles.reviewInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}
                placeholder="Ceritakan pengalaman Anda... (opsional)"
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={4}
                value={review}
                onChangeText={setReview}
              />

              <TouchableOpacity 
                style={[styles.submitRatingBtn, { opacity: rating === 0 || isSubmittingRating ? 0.6 : 1 }]}
                onPress={async () => {
                  await submitRating();
                  setShowRatingModal(false);
                }}
                disabled={rating === 0 || isSubmittingRating}
              >
                {isSubmittingRating ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Text style={styles.submitRatingText}>Kirim Feedback</Text>
                    <Send size={18} color="white" />
                  </>
                )}
              </TouchableOpacity>
              
              <View style={{ height: 40 }} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
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
    top: 20,
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
    top: 90,
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
  detailValueSmall: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  homeBtnText: {
    color: 'white',
    fontFamily: 'Inter-Bold',
    fontSize: 12,
  },
  cancelledBanner: {
    margin: 20,
    marginTop: 0,
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
  },
  cancelledTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    marginBottom: 2,
  },
  cancelledSub: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    lineHeight: 15,
  },
  homeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  ratingSection: {
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  ratingTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  ratingSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  reviewInput: {
    width: '100%',
    minHeight: 80,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 12,
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  submitRatingBtn: {
    width: '100%',
    height: 52,
    backgroundColor: PURPLE,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#240080',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitRatingText: {
    color: 'white',
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
  ratingSuccess: {
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ratingSuccessTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 2,
  },
  ratingSuccessSub: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  completedHeader: {
    height: 100,
    paddingTop: 50,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleCompleted: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  ratingHistory: {
    paddingBottom: 4,
  },
  ratingHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  starsRowSmall: {
    flexDirection: 'row',
    gap: 4,
  },
  ratingHistoryText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    lineHeight: 18,
  },
  priceBreakdown: {
    gap: 4,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabelSmall: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  priceValueSmall: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  totalLabel: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
  paymentMethod: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
  },
  openRatingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    margin: 20,
    marginTop: 0,
  },
  openRatingText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  ratingBottomSheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: '80%',
  },
  sheetHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  closeModalBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  sheetHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  sheetAvatar: {
    width: 80,
    height: 80,
    borderRadius: 30,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  ratingDisplaySection: { 
    marginTop: 16, 
    padding: 16, 
    borderRadius: 20, 
    gap: 8 
  },
  ratingDisplayHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12 
  },
  displayStars: { 
    flexDirection: 'row', 
    gap: 4 
  },
  ratingDisplayText: { 
    fontSize: 14, 
    fontFamily: 'Inter-Bold' 
  },
  reviewDisplayText: { 
    fontSize: 14, 
    fontFamily: 'Inter-Medium', 
    fontStyle: 'italic', 
    lineHeight: 20 
  },
});
