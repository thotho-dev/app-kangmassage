import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, StatusBar, Animated, PanResponder, ScrollView, TextInput, ActivityIndicator, Modal, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PURPLE = '#240080';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Phone, MessageCircle, MapPin, Clock, Navigation, Star, Send, CheckCircle2, X, Calendar, ClipboardList } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '@/constants/Theme';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { API_URL } from '@/lib/config';
import LottieWebView from '@/components/LottieWebView';
import animSearch from '@/assets/lottie/anim-search.json';
import animCycle from '@/assets/lottie/anim-cycle.json';
import animOnTheWay from '@/assets/lottie/on-the-way.json';
import animTiba from '@/assets/lottie/tiba-dilokasi.json';
import animConfirm from '@/assets/lottie/confrim-order.json';

const { width } = Dimensions.get('window');

const getTrackingLeafletHTML = (
  userLat: number, userLng: number,
  therapistLat: number, therapistLng: number,
  therapistAvatar: string, therapistName: string,
  userAddress: string,
  routeCoords: {latitude: number, longitude: number}[]
) => {
  const routeJSON = JSON.stringify(routeCoords.map(c => [c.latitude, c.longitude]));
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body, html, #map { width: 100%; height: 100%; }
    .leaflet-control-zoom { display: none; }
    .leaflet-control-attribution { display: none !important; }
    .user-marker {
      width: 36px; height: 36px; border-radius: 18px;
      background: #E74C3C; border: 3px solid #fff;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .user-marker svg { width: 18px; height: 18px; fill: #fff; }
    .therapist-marker {
      width: 44px; height: 44px; border-radius: 22px;
      background: #fff; padding: 3px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .therapist-marker img {
      width: 100%; height: 100%; border-radius: 20px; object-fit: cover;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false, attributionControl: false })
      .setView([${userLat}, ${userLng}], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

    var userIcon = L.divIcon({
      className: 'user-marker',
      html: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    var therapistIcon = L.divIcon({
      className: 'therapist-marker',
      html: '<img src="${therapistAvatar}" alt="${therapistName}" />',
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });

    var userMarker = L.marker([${userLat}, ${userLng}], { icon: userIcon }).addTo(map);
    var therapistMarker = L.marker([${therapistLat}, ${therapistLng}], { icon: therapistIcon }).addTo(map);

    var routeLine = null;
    ${routeCoords.length > 0 ? `
    var routeCoords = ${routeJSON};
    routeLine = L.polyline(routeCoords, { color: '#00B14F', weight: 5, opacity: 1 }).addTo(map);
    L.polyline(routeCoords, { color: 'rgba(0,177,79,0.25)', weight: 10, opacity: 1 }).addTo(map);
    ` : ''}

    map.fitBounds([[${userLat}, ${userLng}], [${therapistLat}, ${therapistLng}]], { padding: [120, 60, 420, 60] });

    window.updateTracking = function(data) {
      if (data.userLat && data.userLng) {
        userMarker.setLatLng([data.userLat, data.userLng]);
      }
      if (data.therapistLat && data.therapistLng) {
        therapistMarker.setLatLng([data.therapistLat, data.therapistLng]);
      }
      if (data.routeCoords && data.routeCoords.length > 0) {
        if (routeLine) map.removeLayer(routeLine);
        routeLine = L.polyline(data.routeCoords, { color: '#00B14F', weight: 5, opacity: 1 }).addTo(map);
        L.polyline(data.routeCoords, { color: 'rgba(0,177,79,0.25)', weight: 10, opacity: 1 }).addTo(map);
      }
      if (data.fitBounds) {
        var bounds = L.latLngBounds([
          [data.userLat || ${userLat}, data.userLng || ${userLng}],
          [data.therapistLat || ${therapistLat}, data.therapistLng || ${therapistLng}]
        ]);
        map.fitBounds(bounds, { padding: [120, 60, 420, 60], animate: true });
      }
    };
  </script>
</body>
</html>`;
};

const STATUS_STEPS = [
  { key: 'pending',     label: 'Menunggu Konfirmasi', icon: 'time'             },
  { key: 'accepted',    label: 'Pesanan Diterima',   icon: 'checkmark-circle' },
  { key: 'on_the_way',  label: 'Menuju Lokasi',       icon: 'navigate'         },
  { key: 'arrived',     label: 'Tiba di Lokasi',      icon: 'location'         },
  { key: 'in_progress', label: 'Sedang Berlangsung',  icon: 'time'             },
  { key: 'completed',   label: 'Selesai',             icon: 'star'             },
];

export default function TrackingScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { profile, refreshProfile } = useAuth();
  const { id } = useLocalSearchParams();

  const [order, setOrder] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [serviceRemaining, setServiceRemaining] = useState('');
  const [loading, setLoading] = useState(true);
  const [routeCoords, setRouteCoords] = useState<{latitude: number, longitude: number}[]>([]);
  
  // Rating State
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [tips, setTips] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [showAllStatuses, setShowAllStatuses] = useState(false);

  const fallbackAvatarUri = Image.resolveAssetSource(require('@/assets/icon-km.png')).uri;
  const mapHiddenRef = useRef(false);

  useEffect(() => {
    mapHiddenRef.current = !!(order?.status && ['arrived', 'in_progress', 'completed', 'cancelled'].includes(order.status));
  }, [order?.status]);

  const QUICK_MESSAGES = [
    "Terapis ramah & sopan",
    "Pijatan sangat enak",
    "Tepat waktu",
    "Tekanan pijat pas",
    "Sangat profesional"
  ];

  const QUICK_TIPS = [5000, 10000, 15000, 20000, 50000];

  const userBalance = profile?.wallet_balance || 0;
  const isBalanceZero = userBalance <= 0;
  
  // Map View Reference and Bounds Auto-fit
  const webViewRef = useRef<WebView>(null);

  // Status Lottie Animations
  const STATUS_LOTTIE: Record<string, { source: any; label: string }> = {
    pending:     { source: animSearch,    label: 'Mencari Mitra Terdekat' },
    accepted:    { source: animConfirm,   label: 'Terapis Menuju Anda' },
    on_the_way:  { source: animOnTheWay,  label: 'Terapis Dalam Perjalanan' },
    arrived:     { source: animTiba,      label: 'Terapis Sudah Tiba' },
    in_progress: { source: animCycle,     label: 'Layanan Sedang Berlangsung' },
  };

  // Custom Alert Modal State
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons: { text: string; style?: 'cancel' | 'destructive' | 'default'; onPress?: () => void }[];
  }>({
    visible: false,
    title: '',
    message: '',
    buttons: []
  });

  const showAlert = (
    title: string,
    message: string,
    buttons?: { text: string; style?: 'cancel' | 'destructive' | 'default'; onPress?: () => void }[]
  ) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      buttons: buttons || [{ text: 'OK', style: 'default' }]
    });
  };

  useEffect(() => {
    if (order?.latitude && order?.longitude && webViewRef.current) {
      const userLat = order.latitude;
      const userLng = order.longitude;
      const therapistLat = order.therapist?.latitude || (order.latitude + 0.005);
      const therapistLng = order.therapist?.longitude || (order.longitude + 0.005);

      webViewRef.current.postMessage(JSON.stringify({
        type: 'fitBounds',
        userLat, userLng, therapistLat, therapistLng
      }));
    }
  }, [order?.latitude, order?.longitude, order?.therapist?.latitude, order?.therapist?.longitude]);

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
        console.log('[DEBUG Tracking User] Order Updated:', payload.new.status, 'Old:', payload.old?.status);
        
        // Jika therapist cancel setelah accept → redirect ke searching-therapist
        if (payload.new.status === 'cancelled' && payload.old?.status === 'accepted') {
          router.replace({ pathname: '/searching-therapist', params: { id } });
          return;
        }
        
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

  // Send updates to Leaflet WebView when data changes
  useEffect(() => {
    if (webViewRef.current && order) {
      const msg = {
        type: 'updateTracking',
        userLat: order.latitude,
        userLng: order.longitude,
        therapistLat: order.therapist?.latitude || (order.latitude ? order.latitude + 0.005 : null),
        therapistLng: order.therapist?.longitude || (order.longitude ? order.longitude + 0.005 : null),
        routeCoords: routeCoords.map(c => [c.latitude, c.longitude]),
        fitBounds: true
      };
      webViewRef.current.postMessage(JSON.stringify(msg));
    }
  }, [order?.latitude, order?.longitude, order?.therapist?.latitude, order?.therapist?.longitude, routeCoords]);

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

  // Timer for in_progress duration countdown
  useEffect(() => {
    if (!logs || !order || order.status !== 'in_progress') {
      setServiceRemaining('');
      return;
    }
    if (order.service?.price_type && order.service.price_type !== 'duration') {
      setServiceRemaining('');
      return;
    }
    const inProgressLog = logs.find((l: any) => l.status === 'in_progress');
    if (!inProgressLog) {
      setServiceRemaining('');
      return;
    }
    const startTime = new Date(inProgressLog.created_at).getTime();
    
    // Hitung total durasi: Layanan Utama + Layanan Tambahan (jika durasi)
    let totalDuration = order.service?.duration_min || order.duration || 60;
    if (order.additional_services && Array.isArray(order.additional_services)) {
      const addonDuration = order.additional_services.reduce((sum: number, addon: any) => {
        if (addon.price_type === 'duration') {
          return sum + (Number(addon.duration) || 0);
        }
        return sum;
      }, 0);
      totalDuration += addonDuration;
    }

    const endTime = startTime + totalDuration * 60 * 1000;
    const update = () => {
      const now = Date.now();
      const diff = Math.max(0, endTime - now);
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setServiceRemaining(`${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [order?.status, logs, order?.service?.price_type]);

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
      
      // Fetch initial therapist location from therapist_locations table
      if (data && data.therapist_id) {
        const { data: locData } = await supabase
          .from('therapist_locations')
          .select('latitude, longitude')
          .eq('therapist_id', data.therapist_id)
          .single();
        
        if (locData && data.therapist) {
          data.therapist.latitude = locData.latitude;
          data.therapist.longitude = locData.longitude;
        }
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
      showAlert('Peringatan', 'Silakan pilih bintang terlebih dahulu.');
      return;
    }

    setIsSubmittingRating(true);
    try {
      const tipAmount = Number(tips) || 0;

      if (tipAmount > userBalance) {
        showAlert('Saldo Kurang', 'Saldo Anda tidak cukup untuk memberikan tips sebesar ini.');
        setIsSubmittingRating(false);
        return;
      }

      // 1. Update order rating
      const { error } = await supabase
        .from('orders')
        .update({ 
          rating, 
          review,
          tips: tipAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      // 1.1 Handle Tips (Deduct from user balance and create transaction)
      if (tipAmount > 0) {
        // Potong saldo user
        const { error: balanceErr } = await supabase
          .from('users')
          .update({ wallet_balance: userBalance - tipAmount })
          .eq('id', profile.id);
        
        if (!balanceErr) {
          // Catat transaksi
          await supabase.from('transactions').insert({
            user_id: profile.id,
            order_id: id,
            type: 'tips',
            amount: -tipAmount,
            balance_before: userBalance,
            balance_after: userBalance - tipAmount,
            description: `Tips untuk terapis ${order?.therapist?.full_name || ''} dari pesanan ${order?.order_number || ''}`,
          });

          // Update profile local state
          refreshProfile();
        }
      }
      
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
          .not('rating', 'is', null)
          .order('created_at', { ascending: false })
          .limit(49); // Menggunakan sistem 50 Penilaian Terakhir (49 riwayat + 1 baru)
        
        if (fetchErr) {
          console.error('[DEBUG Rating] Error fetching other ratings:', fetchErr);
        }

        // Combine other ratings with the CURRENT rating
        const otherRatings = allRatings || [];
        
        // Modal Bumper Sistem (Perlindungan Terapis Baru)
        const BUMPER_VOTES = 10;
        const BUMPER_TOTAL_STARS = BUMPER_VOTES * 5; // Asumsi 10 penilaian fiktif bintang 5
        
        const realTotalStars = otherRatings.reduce((sum, r) => sum + (r.rating || 0), 0) + rating;
        const realCount = otherRatings.length + 1;
        
        // Hitung rata-rata dengan memasukkan Bumper
        const totalStarsWithBumper = realTotalStars + BUMPER_TOTAL_STARS;
        const totalCountWithBumper = realCount + BUMPER_VOTES;
        const avg = totalStarsWithBumper / totalCountWithBumper;
        
        console.log('[DEBUG Rating] New Calculation -> RealTotal:', realTotalStars, 'RealCount:', realCount, 'AvgWithBumper:', avg);

        const { error: updateErr } = await supabase
          .from('therapists')
          .update({ 
            rating: avg,
            total_reviews: realCount // Tetap simpan jumlah ulasan riil ke profil
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
      showAlert('Terima Kasih', 'Rating dan ulasan Anda telah kami terima.');
    } catch (err) {
      console.error('Error submitting rating:', err);
      showAlert('Gagal', 'Gagal mengirim rating. Silakan coba lagi.');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const handleCancel = () => {
    // Disable jika sudah jalan ke lokasi
    if (order?.status === 'on_the_way' || order?.status === 'arrived' || order?.status === 'in_progress') {
      showAlert('Gagal', 'Pesanan tidak bisa dibatalkan karena terapis sudah menuju lokasi atau sedang melayani.');
      return;
    }

    showAlert(
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
                const orderData = data[0];
                
                // Refund Logic
                const gatewayMethods = ['gopay', 'qris', 'dana', 'shopeepay', 'ovo', 'linkaja',
                  'bca_va', 'bni_va', 'bri_va', 'bsi_va', 'cimb_va', 'mandiri_va', 'permata_va'];

                if (gatewayMethods.includes(orderData.payment_method)) {
                  try {
                    await fetch(`${API_URL}/api/refund/create`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ order_id: id }),
                    });
                  } catch (e) {
                    console.warn('Refund API error:', e);
                  }
                } else if (orderData.payment_method === 'saldo') {
                  // Atomic refund via RPC (SELECT FOR UPDATE — mencegah double refund)
                  const { data: rpcResult, error: rpcError } = await supabase
                    .rpc('refund_order_saldo', { p_order_id: id });

                  if (rpcError || !rpcResult?.success) {
                    console.warn('Refund RPC error:', rpcError || rpcResult?.message);
                  }
                }

                // Send push notification to therapist
                if (orderData.therapist_id) {
                  fetch(`${API_URL}/api/notifications/send`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      therapist_id: orderData.therapist_id,
                      title: 'Pesanan Dibatalkan',
                      body: 'Pelanggan telah membatalkan pesanan ini.',
                      type: 'order_cancelled',
                      data: { order_id: id },
                    }),
                  }).catch((err: any) => console.warn('Push notif error:', err?.message));
                }

                // Add log entry
                await supabase.from('order_logs').insert({
                  order_id: id,
                  status: 'cancelled',
                  note: 'Dibatalkan oleh anda'
                });
                showAlert('Berhasil', 'Pesanan Anda telah dibatalkan.');
              }

              router.replace('/home');
            } catch (err) {
              console.error('Cancel order error:', err);
              showAlert('Error', 'Gagal membatalkan pesanan.');
            }
          }
        }
      ]
    );
  };

  const handleCall = () => {
    if (order?.status === 'completed' || order?.status === 'cancelled') {
      showAlert('Selesai', 'Anda tidak dapat menghubungi terapis untuk pesanan yang sudah selesai atau dibatalkan.');
      return;
    }
    if (order?.therapist?.phone) {
      Linking.openURL(`tel:${order.therapist.phone}`);
    } else {
      showAlert('Info', 'Nomor telepon terapis tidak tersedia.');
    }
  };

  const handleChat = async () => {
    if (order?.status === 'completed' || order?.status === 'cancelled') {
      showAlert('Selesai', 'Fitur chat dinonaktifkan untuk pesanan yang sudah selesai atau dibatalkan.');
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
      showAlert('Error', 'Gagal membuka percakapan.');
    } finally {
      setLoading(false);
    }
  };

  // Animations
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastOffset = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (mapHiddenRef.current) return false;
        return Math.abs(gestureState.dy) > 10;
      },
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
      {/* Map Area - Hidden when arrived, in_progress, completed */}
      {order?.status !== 'arrived' && order?.status !== 'in_progress' && order?.status !== 'completed' && order?.status !== 'cancelled' && (
        <View style={styles.mapContainer}>
          <WebView
            ref={webViewRef}
            source={{ html: getTrackingLeafletHTML(
              order?.latitude || -6.2020,
              order?.longitude || 106.8250,
              order?.therapist?.latitude || (order?.latitude ? order.latitude + 0.005 : -6.1970),
              order?.therapist?.longitude || (order?.longitude ? order.longitude + 0.005 : 106.8300),
              order?.therapist?.avatar_url || fallbackAvatarUri,
              order?.therapist?.full_name || 'Terapis',
              order?.address || '',
              routeCoords
            )}}
            style={styles.map}
            onMessage={(event) => {}}
            javaScriptEnabled={true}
            domStorageEnabled={true}
          />
          <LinearGradient
            colors={isDark ? ['rgba(2, 6, 23, 0.9)', 'rgba(2, 6, 23, 0)'] : ['rgba(255, 255, 255, 0.7)', 'rgba(255, 255, 255, 0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        </View>
      )}
      
      {/* Header Overlay - hidden when completed / cancelled */}
      {order?.status !== 'completed' && order?.status !== 'cancelled' && (
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={[styles.orderBadge, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.orderBadgeText, { color: theme.text }]}>{order?.order_number || 'ORD-...'}</Text>
        </View>
      </Animated.View>
      )}

      {/* Floating Therapist Info - hidden when completed / cancelled */}
      {order?.status !== 'completed' && order?.status !== 'cancelled' && (
      <Animated.View style={[styles.floatingInfo, { transform: [{ translateY: therapistCardTranslateY }] }]}>
        <View style={styles.infoCard}>
          <View style={styles.therapistInfo}>
            <View style={styles.avatarWrapper}>
              <Image 
                source={order?.therapist?.avatar_url ? { uri: order?.therapist?.avatar_url } : require('@/assets/icon-km.png')}
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
      )}

      {/* Completed / Cancelled Header */}
      {(order?.status === 'completed' || order?.status === 'cancelled') && (
        <View style={[styles.completedHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.replace('/home')} style={styles.backBtnCompleted}>
            <ChevronLeft size={22} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.completedHeaderCenter}>
            <Text style={[styles.completedHeaderTitle, { color: theme.text }]}>
              {order?.status === 'cancelled' ? 'Pesanan Dibatalkan' : 'Ringkasan Pesanan'}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      )}

      {/* Bottom Status Card */}
      <Animated.View 
        style={[
          order?.status === 'completed' || order?.status === 'cancelled' ? styles.statusCardCompleted : styles.statusCard,
           { backgroundColor: theme.surface, borderTopColor: theme.border },
          order?.status !== 'completed' && order?.status !== 'cancelled' && { transform: [{ translateY: slideAnim }] }
        ]}
        >

          {order?.status !== 'cancelled' && (
          <LinearGradient
            colors={['#FFFFFF', 'transparent']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          )}
          {order?.status !== 'completed' && order?.status !== 'cancelled' && (
            <View 
              style={styles.dragHandleContainer}
              {...panResponder.panHandlers}
            >
              <View style={[styles.dragHandle, { backgroundColor: theme.border }]} />
            </View>
          )}
          
          <Animated.ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={order?.status === 'completed' || order?.status === 'cancelled' ? { paddingBottom: 32 } : { paddingBottom: 20 }}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
          >
              {/* Status Animation Section */}
              {order?.status !== 'cancelled' && order?.status !== 'in_progress' && order?.status !== 'completed' && (
                  <Animated.View style={[styles.statusAnimContainer, { transform: [{ translateY: scrollY.interpolate({ inputRange: [0, 300], outputRange: [-30, 120], extrapolate: 'clamp' }) }] }]}>
                   <LottieWebView
                   source={STATUS_LOTTIE[order?.status]?.source || animSearch}
                   width={420}
                   height={300}
                  />
                </Animated.View>
              )}

             {/* Completed Banner */}
             {order?.status === 'completed' && (
               <View style={styles.completedBanner}>
                 <View style={styles.completedBannerIcon}>
                   <CheckCircle2 size={40} color="#FFFFFF" />
                 </View>
                 <Text style={styles.completedBannerTitle}>Pesanan Selesai</Text>
                 <Text style={styles.completedBannerSub}>
                   Terima kasih telah menggunakan layanan kami
                 </Text>
                 {order?.therapist && (
                   <View style={styles.completedTherapistRow}>
                     <Image 
                     source={order.therapist.avatar_url ? { uri: order.therapist.avatar_url } : require('@/assets/icon-km.png')}
                        style={styles.completedTherapistAvatar}
                     />
                     <View>
                       <Text style={styles.completedTherapistName}>{order.therapist.full_name}</Text>
                       <Text style={styles.completedTherapistLabel}>Terapis Anda</Text>
                     </View>
                   </View>
                 )}
               </View>
             )}

              {order?.status === 'cancelled' && (
               <View style={styles.cancelledBanner}>
                 <View style={styles.cancelledBannerIcon}>
                   <Ionicons name="alert-circle" size={32} color="#FFFFFF" />
                 </View>
                 <Text style={styles.cancelledBannerTitle}>
                   {logs.find((l: any) => l.status === 'cancelled')?.note?.includes('Ditolak') 
                     ? 'Pesanan Ditolak Terapis' 
                     : 'Pesanan Dibatalkan'}
                 </Text>
                 <Text style={styles.cancelledBannerSub}>
                   {logs.find((l: any) => l.status === 'cancelled')?.note || 'Pesanan ini telah dibatalkan.'}
                 </Text>
               </View>
             )}

            <View style={(order?.status === 'in_progress' || order?.status === 'completed' || order?.status === 'cancelled') ? {} : { transform: [{ translateY: -100 }] }}>
              {/* In Progress Timer Card */}
              {order?.status === 'in_progress' && (
                <View style={[styles.timerCard, { backgroundColor: theme.surface, borderColor: '#10B981' + '40' }]}>
                  <View style={styles.timerHeader}>
                    <Ionicons name="time-outline" size={20} color="#10B981" />
                    <Text style={[styles.timerTitle, { color: '#10B981' }]}>
                      {order.service?.price_type === 'duration' ? 'Sisa Waktu Pelayanan' : 'Status Pelayanan'}
                    </Text>
                  </View>
                  {order.service?.price_type === 'duration' ? (
                    <>
                      <Text style={[styles.timerDisplay, { color: theme.text }]}>{serviceRemaining || '00:00:00'}</Text>
                      <Text style={[styles.timerSub, { color: theme.textSecondary }]}>
                        Durasi: {order.service?.duration_min || order.duration || 60} Menit
                      </Text>
                    </>
                  ) : (
                    <View style={styles.treatmentStatusContainer}>
                      <Ionicons name="sparkles" size={32} color="#10B981" />
                      <Text style={[styles.treatmentStatusText, { color: theme.text }]}>Sedang Perawatan</Text>
                      <Text style={[styles.timerSub, { color: theme.textSecondary }]}>
                        Layanan sedang berlangsung
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <View style={styles.combinedCardBg}>

              {order?.status !== 'cancelled' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Status Pesanan</Text>
                <View style={styles.stepsCard}>
                   {(showAllStatuses ? STATUS_STEPS : STATUS_STEPS.filter((_, i) => currentStepIndex >= 0 && i === currentStepIndex)).map((step, i, arr) => {
                     const realIndex = STATUS_STEPS.findIndex((s) => s.key === step.key);
                     const isDone = realIndex >= 0 && realIndex < currentStepIndex;
                     const isCurrent = realIndex === currentStepIndex;
                     
                      const timeText = formatTime(step.key) || '';
                      return (
                        <View key={step.key} style={styles.step}>
                          <View style={styles.stepRow}>
                            <View style={styles.stepLeft}>
                              <View style={[styles.stepIcon, isDone ? styles.stepDone : isCurrent ? styles.stepCurrent : styles.stepPending]}>
                                <Ionicons
                                  name={isDone && !isCurrent ? 'checkmark' : step.icon as any}
                                  size={16}
                                  color={isDone ? '#FFFFFF' : isCurrent ? '#F97316' : '#94A3B8'}
                                />
                              </View>
                              {i < arr.length - 1 && (
                                <View style={[styles.stepLine, isDone && !isCurrent && styles.stepLineDone]} />
                              )}
                            </View>
                            {showAllStatuses ? (
                              <View>
                                <Text style={[styles.stepLabel, isDone && styles.stepLabelDone, isCurrent && styles.stepLabelCurrent]}>
                                  {step.label}
                                </Text>
                                <Text style={styles.stepTime}>{timeText}</Text>
                              </View>
                            ) : (
                              <Text style={[styles.stepLabel, isDone && styles.stepLabelDone, isCurrent && styles.stepLabelCurrent]}>
                                {step.label}
                              </Text>
                            )}
                          </View>
                          {!showAllStatuses && timeText ? (
                            <Text style={styles.stepTimeRight}>{timeText}</Text>
                          ) : null}
                        </View>
                      );
                   })}
                   {currentStepIndex >= 0 && (
                     <TouchableOpacity
                       style={styles.showAllBtn}
                       onPress={() => setShowAllStatuses(!showAllStatuses)}
                       activeOpacity={0.7}
                     >
                       <Ionicons
                         name={showAllStatuses ? 'chevron-up' : 'chevron-down'}
                         size={18}
                         color="#94A3B8"
                       />
                     </TouchableOpacity>
                   )}
                 </View>
               </View>
              )}

            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>Detail Pesanan</Text>
              <View style={styles.detailCard}>
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

                <View style={[styles.detailDivider, { backgroundColor: theme.border, marginVertical: 12 }]} />
                <View style={styles.detailRow}>
                  <View style={styles.detailInfo}>
                    <View style={[styles.serviceIconWrapper, { backgroundColor: 'rgba(107,114,128,0.1)' }]}>
                      <Clock size={16} color="#6B7280" />
                    </View>
                    <View>
                      <Text style={styles.detailLabel}>Jam Order</Text>
                      <Text style={styles.detailValue}>
                        {order?.created_at ? new Date(order.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Completed Info: No. Order & Jam Selesai */}
                {order?.status === 'completed' && (
                  <>
                    <View style={[styles.detailDivider, { backgroundColor: theme.border, marginVertical: 12 }]} />
                    <View style={styles.detailRow}>
                      <View style={styles.detailInfo}>
                        <View style={[styles.serviceIconWrapper, { backgroundColor: 'rgba(59,130,246,0.1)' }]}>
                          <ClipboardList size={16} color="#3B82F6" />
                        </View>
                        <View>
                          <Text style={styles.detailLabel}>No. Order</Text>
                          <Text style={styles.detailValue}>{order?.order_number || '-'}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={[styles.detailDivider, { backgroundColor: theme.border, marginVertical: 12 }]} />
                    <View style={styles.detailRow}>
                      <View style={styles.detailInfo}>
                        <View style={[styles.serviceIconWrapper, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
                          <Clock size={16} color="#10B981" />
                        </View>
                        <View>
                          <Text style={styles.detailLabel}>Jam Selesai</Text>
                          <Text style={styles.detailValue}>{formatTime('completed') ? `${formatTime('completed')} WIB` : '-'}</Text>
                        </View>
                      </View>
                    </View>
                  </>
                )}

                {/* Additional Services */}
                {order?.additional_services && order.additional_services.length > 0 && (
                  <>
                    <View style={[styles.detailDivider, { backgroundColor: theme.border, marginVertical: 12 }]} />
                    {order.additional_services.map((addon: any, index: number) => (
                      <View key={index} style={[styles.detailRow, { marginBottom: index < order.additional_services.length - 1 ? 12 : 0 }]}>
                        <View style={styles.detailInfo}>
                          <View style={[styles.serviceIconWrapper, { backgroundColor: 'rgba(245,158,11,0.1)' }]}>
                            <Ionicons name="add-circle-outline" size={16} color="#F59E0B" />
                          </View>
                          <View>
                            {index === 0 && <Text style={styles.detailLabel}>Layanan Tambahan</Text>}
                            <Text style={styles.detailValue}>{addon.name}</Text>
                            <Text style={[styles.detailValueSmall, { color: PURPLE }]}>
                              {addon.price_type === 'treatment' ? '1 Treatment' : `${addon.duration} Menit`}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </>
                )}

                {order?.scheduled_at && (
                  <>
                    <View style={[styles.detailDivider, { backgroundColor: theme.border, marginVertical: 12 }]} />
                    <View style={styles.detailRow}>
                      <View style={styles.detailInfo}>
                        <View style={[styles.serviceIconWrapper, { backgroundColor: 'rgba(6,182,212,0.1)' }]}>
                          <Calendar size={16} color="#06B6D4" />
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
                        <View style={[styles.serviceIconWrapper, { backgroundColor: 'rgba(139,92,246,0.1)' }]}>
                          <ClipboardList size={16} color="#8B5CF6" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.detailLabel}>Catatan</Text>
                          <Text style={styles.detailValue} numberOfLines={2}>{order.user_notes}</Text>
                        </View>
                      </View>
                    </View>
                  </>
                )}

                {/* Alamat */}
                <View style={[styles.detailDivider, { backgroundColor: theme.border, marginVertical: 12 }]} />
                <View style={styles.detailRow}>
                  <View style={styles.detailInfo}>
                    <View style={styles.serviceIconWrapper}>
                      <MapPin size={16} color="#FDB927" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailLabel}>Tujuan</Text>
                      <Text style={styles.detailValue} numberOfLines={2}>{order?.address || 'Alamat tidak ditemukan'}</Text>
                    </View>
                  </View>
                </View>
                
                <View style={[styles.detailDivider, { backgroundColor: theme.border, marginVertical: 16, height: 1.5 }]} />
                
                {/* Price Breakdown */}
                <View style={styles.priceBreakdown}>
                   <View style={styles.priceRow}>
                      <Text style={[styles.priceLabelSmall, { color: theme.textSecondary }]}>Harga Layanan</Text>
                      <Text style={[styles.priceValueSmall, { color: theme.text }]}>Rp {(order?.service_price || 0).toLocaleString('id-ID')}</Text>
                   </View>
                    <View style={styles.priceRow}>
                       <Text style={[styles.priceLabelSmall, { color: theme.textSecondary }]}>Biaya Layanan</Text>
                       <Text style={[styles.priceValueSmall, { color: theme.text }]}>Rp {(order?.service_fee || 0).toLocaleString('id-ID')}</Text>
                    </View>

                   {/* Detail Layanan Tambahan */}
                   {order?.additional_services && order.additional_services.length > 0 && order.additional_services.map((addon: any, idx: number) => (
                     <View key={idx} style={styles.priceRow}>
                        <Text style={[styles.priceLabelSmall, { color: theme.textSecondary }]}>+ {addon.name}</Text>
                        <Text style={[styles.priceValueSmall, { color: theme.text }]}>Rp {(addon.price || 0).toLocaleString('id-ID')}</Text>
                     </View>
                   ))}

                   {order?.discount_amount > 0 && (
                     <View style={styles.priceRow}>
                        <Text style={[styles.priceLabelSmall, { color: theme.textSecondary }]}>Diskon Voucher</Text>
                        <Text style={[styles.priceValueSmall, { color: COLORS.success }]}>-Rp {(order?.discount_amount || 0).toLocaleString('id-ID')}</Text>
                     </View>
                   )}

                   {order?.tips > 0 && (
                     <View style={styles.priceRow}>
                        <Text style={[styles.priceLabelSmall, { color: COLORS.success }]}>Tips untuk Terapis</Text>
                        <Text style={[styles.priceValueSmall, { color: COLORS.success }]}>Rp {(Number(order.tips) || 0).toLocaleString('id-ID')}</Text>
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

                {order?.status === 'completed' && (order?.rating || hasRated) && (
                  <View style={[styles.ratingDisplaySection, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', marginTop: 16 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View>
                        <Text style={[styles.detailLabel, { marginBottom: 6 }]}>Rating & Ulasan Anda</Text>
                        <View style={styles.ratingDisplayHeader}>
                          <View style={styles.displayStars}>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Ionicons 
                                key={s} 
                                name={s <= (order?.rating || rating || 0) ? "star" : "star-outline"} 
                                size={14} 
                                color={s <= (order?.rating || rating || 0) ? "#F59E0B" : theme.textSecondary} 
                              />
                            ))}
                          </View>
                          <Text style={[styles.ratingDisplayText, { color: theme.textSecondary }]}>
                            {order?.rating || rating ? `${order?.rating || rating}.0` : 'Belum ada rating'}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity 
                        style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(253, 185, 39, 0.15)', borderRadius: 12 }}
                        onPress={() => {
                          setRating(order?.rating || rating || 0);
                          setReview(order?.review || review || '');
                          setShowRatingModal(true);
                        }}
                      >
                        <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#FDB927' }}>Edit Ulasan</Text>
                      </TouchableOpacity>
                    </View>
                    
                    {(order?.review || review) ? (
                      <Text style={[styles.reviewDisplayText, { color: theme.text, marginTop: 8 }]} numberOfLines={3}>
                        "{order?.review || review}"
                      </Text>
                    ) : (
                      <Text style={[styles.reviewDisplayText, { color: theme.textSecondary, fontStyle: 'italic', marginTop: 8 }]}>
                        Tidak ada ulasan tertulis.
                      </Text>
                    )}
                  </View>
                )}
               </View>
            </View>

              </View>

            {order?.status === 'completed' && !order?.rating && !hasRated && (
              <TouchableOpacity 
                style={styles.openRatingBtn}
                onPress={() => setShowRatingModal(true)}
                activeOpacity={0.85}
              >
                <Star size={18} color="#FFFFFF" fill="#FFFFFF" />
                <Text style={styles.openRatingText}>Beri Rating & Ulasan</Text>
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
            </View>
          </Animated.ScrollView>
       </Animated.View>

      {/* Rating Bottom Sheet Modal */}
      <Modal
        visible={showRatingModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRatingModal(false)}
      >
        <Pressable 
          style={[styles.modalOverlay, { backgroundColor: 'transparent' }]} 
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
                  source={order?.therapist?.avatar_url ? { uri: order?.therapist?.avatar_url } : require('@/assets/icon-km.png')}
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

              <View style={styles.quickMessagesContainer}>
                {QUICK_MESSAGES.map((msg, index) => {
                  const isActive = review.includes(msg);
                  return (
                    <TouchableOpacity 
                      key={index}
                      style={[
                        styles.quickMessageItem, 
                        isActive && { backgroundColor: PURPLE + '10', borderColor: PURPLE },
                        { borderColor: theme.border }
                      ]}
                      onPress={() => {
                        if (isActive) {
                          setReview(prev => prev.replace(msg, "").replace(/,\s*,/g, ",").replace(/^,|,$/g, "").trim());
                        } else {
                          setReview(prev => prev ? `${prev}, ${msg}` : msg);
                        }
                      }}
                    >
                      <Text style={[styles.quickMessageText, { color: theme.textSecondary }, isActive && { color: PURPLE, fontFamily: 'PlusJakartaSans-Bold' }]}>
                        {msg}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
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

              <View style={[styles.tipsSection, isBalanceZero && { opacity: 0.5 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Text style={[styles.tipsLabel, { color: theme.textSecondary, marginBottom: 0 }]}>Tips untuk Terapis (Opsional)</Text>
                  <Text style={{ fontSize: 10, color: isBalanceZero ? '#EF4444' : '#10B981', fontFamily: 'PlusJakartaSans-Bold' }}>
                    Saldo: Rp {userBalance.toLocaleString('id-ID')}
                  </Text>
                </View>

                {/* Quick Tips */}
                {!isBalanceZero && (
                  <View style={[styles.quickTipsContainer, { marginBottom: 12 }]}>
                    {QUICK_TIPS.map((amount) => (
                      <TouchableOpacity
                        key={amount}
                        style={[
                          styles.quickTipItem,
                          tips === String(amount) && { backgroundColor: PURPLE, borderColor: PURPLE },
                          { borderColor: theme.border }
                        ]}
                        onPress={() => setTips(String(amount))}
                        disabled={amount > userBalance}
                      >
                        <Text style={[
                          styles.quickTipText, 
                          { color: amount > userBalance ? theme.textSecondary + '50' : theme.textSecondary },
                          tips === String(amount) && { color: '#FFFFFF' }
                        ]}>
                          {amount / 1000}k
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={[
                        styles.quickTipItem,
                        tips === '' && { backgroundColor: theme.surfaceVariant, borderColor: theme.border },
                        { borderColor: theme.border }
                      ]}
                      onPress={() => setTips('')}
                    >
                      <Text style={[styles.quickTipText, { color: theme.textSecondary }]}>Reset</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={[styles.tipsInputWrapper, { borderColor: theme.border, backgroundColor: isBalanceZero ? '#F1F5F9' : theme.surfaceVariant }]}>
                  <Text style={[styles.tipsCurrency, { color: theme.textSecondary }]}>Rp</Text>
                  <TextInput
                    style={[styles.tipsInput, { color: theme.text }]}
                    placeholder={isBalanceZero ? "Saldo Tidak Cukup" : "Contoh: 10.000"}
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="numeric"
                    value={tips}
                    onChangeText={(val) => {
                      const num = parseInt(val.replace(/[^0-9]/g, '')) || 0;
                      if (num <= userBalance) {
                        setTips(val.replace(/[^0-9]/g, ''));
                      } else {
                        setTips(String(userBalance));
                      }
                    }}
                    editable={!isBalanceZero}
                  />
                </View>
                {isBalanceZero && (
                  <Text style={{ fontSize: 10, color: '#EF4444', marginTop: 4, fontStyle: 'italic' }}>
                    *Saldo Anda 0 atau tidak cukup untuk memberi tips.
                  </Text>
                )}
              </View>

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
                    <Text style={styles.submitRatingText}>Kirim Ulasan</Text>
                    <Send size={18} color="white" />
                  </>
                )}
              </TouchableOpacity>
              
              <View style={{ height: 40 }} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Premium Custom Alert Modal */}
      <Modal
        visible={alertConfig.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.modalOverlay}>
          <Pressable 
            style={StyleSheet.absoluteFill} 
            onPress={() => {
              if (alertConfig.buttons.length <= 1) {
                setAlertConfig(prev => ({ ...prev, visible: false }));
              }
            }} 
          />
          <Animated.View style={[styles.alertContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[
              styles.alertAccent, 
              { 
                backgroundColor: alertConfig.title.toLowerCase().includes('gagal') || alertConfig.title.toLowerCase().includes('error') 
                  ? COLORS.error 
                  : alertConfig.title.toLowerCase().includes('berhasil') || alertConfig.title.toLowerCase().includes('terima') 
                    ? COLORS.success 
                    : PURPLE 
              }
            ]} />
            
            <View style={styles.alertContent}>
              <Text style={[styles.alertTitle, { color: theme.text }]}>{alertConfig.title}</Text>
              <Text style={[styles.alertMessage, { color: theme.textSecondary }]}>{alertConfig.message}</Text>
            </View>

            <View style={styles.alertButtonsRow}>
              {alertConfig.buttons.map((btn, idx) => {
                const isDestructive = btn.style === 'destructive';
                const isCancel = btn.style === 'cancel';
                
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.alertBtn,
                      isDestructive ? styles.btnDestructive : isCancel ? [styles.btnCancel, { borderColor: theme.border }] : styles.btnPrimary,
                      alertConfig.buttons.length > 1 && { flex: 1 }
                    ]}
                    onPress={() => {
                      setAlertConfig(prev => ({ ...prev, visible: false }));
                      if (btn.onPress) {
                        setTimeout(() => btn.onPress?.(), 100);
                      }
                    }}
                  >
                    <Text style={[
                      styles.alertBtnText,
                      isDestructive ? styles.txtDestructive : isCancel ? { color: theme.textSecondary } : styles.txtPrimary
                    ]}>
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        </View>
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
    top: 50,
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
    fontFamily: 'PlusJakartaSans-Bold',
    letterSpacing: 0.8,
  },
  floatingInfo: {
    position: 'absolute',
    top: 130,
    left: 24,
    right: 24,
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
    fontFamily: 'PlusJakartaSans-Bold',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  status: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
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
    paddingBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 21,
  },
  statusAnimContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    paddingVertical: 10,
  },
  timerCard: {
    marginHorizontal: 4,
    marginBottom: 16,
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  timerInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 8,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  timerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  timerTitleInline: { fontSize: 13, fontFamily: 'PlusJakartaSans-Bold' },
  timerDisplayInline: { fontSize: 20, fontFamily: 'PlusJakartaSans-Bold', letterSpacing: 2 },
  timerTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans-Bold' },
  timerDisplay: { fontSize: 32, fontFamily: 'PlusJakartaSans-Bold', letterSpacing: 2, marginBottom: 4 },
  timerSub: { fontSize: 12, fontFamily: 'PlusJakartaSans-Medium' },
  treatmentStatusContainer: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  treatmentStatusText: { fontSize: 20, fontFamily: 'PlusJakartaSans-Bold', marginTop: 4 },
  combinedCardBg: { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#F0F0F0', padding: 16, marginTop: 10, marginBottom: 20 },
  section: { paddingHorizontal: 4 },
  sectionTitle: { fontSize: 14, fontFamily: 'PlusJakartaSans-Bold', color: '#1A1A2E', marginBottom: 12 },
   stepsCard: { borderRadius: 20, paddingVertical: 16, paddingHorizontal: 4 },
  step: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 },
  stepLeft: { alignItems: 'center', width: 32 },
  stepTime: { fontSize: 11, fontFamily: 'PlusJakartaSans-Medium', color: '#94A3B8', paddingTop: 6 },
  stepTimeRight: { fontSize: 11, fontFamily: 'PlusJakartaSans-Medium', color: '#94A3B8', paddingTop: 6 },
  stepIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepDone: { backgroundColor: '#10B981' },
  stepCurrent: { backgroundColor: 'rgba(249, 115, 22, 0.1)', borderWidth: 2, borderColor: '#F97316' },
  stepPending: { backgroundColor: '#F0F0F0' },
  stepLine: { width: 2, height: 24, backgroundColor: '#F0F0F0', marginVertical: 2 },
  stepLineDone: { backgroundColor: '#10B981' },
  stepLabel: { fontSize: 13, fontFamily: 'PlusJakartaSans-Medium', color: '#94A3B8', paddingTop: 6 },
  stepLabelDone: { color: '#10B981' },
  stepLabelCurrent: { fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold', color: '#F97316' },
  showAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: '#F5F5F7',
  },
  showAllBtnText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: COLORS.primary[500],
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
    fontFamily: 'PlusJakartaSans-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
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
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  detailSection: {
    marginTop: 8,
  },
  detailTitle: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#1A1A2E',
    marginBottom: 12,
  },
  detailCard: {
    borderRadius: 20,
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
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#6B7280',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-SemiBold',
    color: '#1A1A2E',
  },
  detailValueSmall: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Bold',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailPrice: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold',
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
  cancelledBanner: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  cancelledBannerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    elevation: 4,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cancelledBannerTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#EF4444',
    marginBottom: 4,
    textAlign: 'center',
  },
  cancelledBannerSub: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
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
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 4,
  },
  ratingSubtitle: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    justifyContent: 'center',
  },
  quickTipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickTipItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 50,
    alignItems: 'center',
  },
  quickTipText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  reviewInput: {
    width: '100%',
    minHeight: 80,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 12,
    fontFamily: 'PlusJakartaSans-Medium',
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
    fontFamily: 'PlusJakartaSans-Bold',
  },
  quickMessagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  quickMessageItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickMessageText: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  tipsSection: {
    marginBottom: 24,
  },
  tipsLabel: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-SemiBold',
    marginBottom: 10,
  },
  tipsInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    height: 56,
  },
  tipsCurrency: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    marginRight: 8,
  },
  tipsInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
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
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 2,
  },
  ratingSuccessSub: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  completedHeader: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  completedHeaderCenter: {
    alignItems: 'center',
  },
  completedHeaderTitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  completedHeaderSub: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Medium',
    marginTop: 2,
  },
  backBtnCompleted: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  statusCardCompleted: {
    flex: 1,
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    paddingHorizontal: 20,
    paddingBottom: 20,
    elevation: 0,
    shadowOpacity: 0,
  },
  completedBanner: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  completedBannerIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    elevation: 4,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  completedBannerTitle: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  completedBannerSub: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#6B7280',
    marginBottom: 16,
  },
  completedTherapistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginTop: 4,
    width: '100%',
  },
  completedTherapistAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
  },
  completedTherapistName: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#1A1A2E',
  },
  completedTherapistLabel: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#6B7280',
    marginTop: 1,
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
    fontFamily: 'PlusJakartaSans-Medium',
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
    fontFamily: 'PlusJakartaSans-Medium',
  },
  priceValueSmall: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
  totalLabel: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  paymentMethod: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans-Medium',
  },
  openRatingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#F97316',
    marginHorizontal: 4,
    marginTop: 16,
    marginBottom: 8,
  },
  openRatingText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#FFFFFF',
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
    height: 4,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 12,
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
    marginBottom: 12,
  },
  sheetAvatar: {
    width: 56,
    height: 56,
    borderRadius: 20,
    marginBottom: 8,
    borderWidth: 2,
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
    fontFamily: 'PlusJakartaSans-Bold' 
  },
  reviewDisplayText: { 
    fontSize: 14, 
    fontFamily: 'PlusJakartaSans-Medium', 
    fontStyle: 'italic', 
    lineHeight: 20 
  },
  alertContainer: {
    width: width - 48,
    borderRadius: 24,
    overflow: 'hidden',
    padding: 24,
    alignSelf: 'center',
    marginBottom: 'auto',
    marginTop: 'auto',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  alertAccent: {
    height: 6,
    width: '120%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  alertContent: {
    marginTop: 8,
    marginBottom: 24,
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Medium',
    lineHeight: 20,
    textAlign: 'center',
  },
  alertButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    width: '100%',
  },
  alertBtn: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: '#240080',
    paddingHorizontal: 28,
  },
  btnCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  btnDestructive: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 24,
  },
  alertBtnText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  txtPrimary: {
    color: '#FFFFFF',
  },
  txtDestructive: {
    color: '#FFFFFF',
  },
});
