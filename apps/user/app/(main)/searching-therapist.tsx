import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAlert } from '@/context/AlertContext';

const PURPLE = '#240080';
const BG = '#F8F9FE';

export default function SearchingTherapistScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { showAlert } = useAlert();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const [order, setOrder] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(45);
  const [isTimeout, setIsTimeout] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = () => {
    stopTimer();
    setTimeLeft(45);
    setIsTimeout(false);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        console.log('[DEBUG Timer] Tick:', prev - 1);
        if (prev <= 1) {
          stopTimer();
          setIsTimeout(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (!id) return;

    // 1. Start Pulse Animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.5,
          duration: 1500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 1b. Start Floating Ornaments Animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 1c. Start Spin Animation
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 20000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // 2. Fetch Initial Data
    fetchOrder();

    // 3. Start Timer
    console.log('[DEBUG Timer] Starting countdown...');
    startTimer();

    // 4. Subscribe to Real-time Changes
    const channel = supabase
      .channel(`searching_order_${id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'orders',
        filter: `id=eq.${id}`
      }, (payload) => {
        console.log('Order Updated:', payload.new);
        if (payload.new.status === 'accepted') {
          stopTimer();
          router.replace({ pathname: '/(main)/tracking', params: { id } });
        }
      })
      .subscribe();

    return () => {
      stopTimer();
      supabase.removeChannel(channel);
    };
  }, [id]);

  const handleRetry = async () => {
    if (retryCount >= 2) {
      // Jika sudah klik 3x (0, 1, 2), maka batalkan otomatis
      showAlert(
        'Batas Pencarian Tercapai',
        'Maaf, sepertinya belum ada terapis yang tersedia saat ini. Silakan coba lagi beberapa saat lagi.',
        [{ text: 'OK', onPress: handleCancelAction }]
      );
      return;
    }

    setIsTimeout(false);
    setRetryCount(prev => prev + 1);
    
    // Update updated_at agar muncul lagi di broadcast terapis sebagai pesanan baru
    await supabase
      .from('orders')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id);
    
    startTimer();
  };

  const fetchOrder = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, service:services(name, category_slug)')
      .eq('id', id)
      .single();

    if (data) {
      setOrder(data);
      // Jika ternyata sudah di-accept
      if (data.status === 'accepted') {
        stopTimer();
        router.replace({ pathname: '/(main)/tracking', params: { id } });
      } else if (data.scheduled_at) {
        // Jika pesanan terjadwal, arahkan langsung ke pelacakan (jangan tunggu countdown)
        stopTimer();
        router.replace({ pathname: '/(main)/tracking', params: { id } });
      } else {
        // Broadcast mode: Pesanan akan muncul di semua HP terapis terdekat secara otomatis
        console.log('[DEBUG Broadcast] Pesanan sedang menunggu untuk diambil oleh terapis terdekat...');
      }
    }
  };

  const findMatchingTherapist = async (orderData: any) => {
    try {
      // [DEBUG] Cek apakah User bisa membaca tabel therapists sama sekali (Cek RLS)
      const { data: testAll, error: testErr } = await supabase.from('therapists').select('id, status');
      console.log('[DEBUG Matchmaking] Total SEMUA terapis di database yang bisa dibaca User:', testAll?.length, 'Error:', testErr?.message);
      if (testAll && testAll.length > 0) {
         console.log('[DEBUG Matchmaking] Status terapis yang ada:', testAll.map(t => t.status).join(', '));
      }

      // 1. Ambil data semua terapis yang sedang Online
      let query = supabase
        .from('therapists')
        .select(`
          id,
          gender,
          specializations,
          is_verified,
          rating,
          wallet_balance,
          therapist_locations (
            latitude,
            longitude
          )
        `)
        .eq('status', 'online');

      const { data: allOnline, error } = await query;
      
      console.log('[DEBUG Matchmaking] Hasil Query Terapis Online:', allOnline?.length, 'terapis. Error:', error?.message);

      if (error || !allOnline || allOnline.length === 0) {
        console.log('[DEBUG Matchmaking] GAGAL: Tidak ada satupun terapis yang sedang ONLINE di database.');
        return null;
      }

      // Filter manual kriteria awal agar bisa di-log
      const candidates = allOnline.filter((t: any) => {
        if (!t.is_verified) {
          console.log(`[DEBUG Matchmaking] Terapis ${t.id} digugurkan: is_verified = false (Belum verifikasi)`);
          return false;
        }
        if (t.rating < 4.5) {
          console.log(`[DEBUG Matchmaking] Terapis ${t.id} digugurkan: Rating (${t.rating}) di bawah 4.5`);
          return false;
        }
        
        // Cek Saldo: Harus cukup untuk bagi hasil (platform fee)
        // Estimasi fee adalah 20% dari total harga
        const estimatedFee = (orderData.total_price || 0) * 0.2;
        const minBalance = Math.max(15000, estimatedFee); // Minimal 15rb ATAU sebesar fee

        if (t.wallet_balance < minBalance) {
          console.log(`[DEBUG Matchmaking] Terapis ${t.id} digugurkan: Saldo ${t.wallet_balance} kurang untuk fee Rp ${estimatedFee}`);
          return false;
        }

        if (orderData.therapist_preference && orderData.therapist_preference !== 'any') {
          if (t.gender !== orderData.therapist_preference) {
             console.log(`[DEBUG Matchmaking] Terapis ${t.id} digugurkan: Gender ${t.gender} tidak sesuai preferensi ${orderData.therapist_preference}`);
             return false;
          }
        }

        return true;
      });

      console.log(`[DEBUG Matchmaking] Terapis yang lolos syarat awal (Aktif, Verified, Rating > 4.5, Saldo >= 15000): ${candidates.length}`);

      if (candidates.length === 0) return null;

      const EARTH_RADIUS = 6371; // km
      const lat1 = orderData.latitude;
      const lon1 = orderData.longitude;
      
      console.log(`[DEBUG Matchmaking] Lokasi Order: Lat ${lat1}, Lon ${lon1}, Service ID: ${orderData.service_id}`);

      // 2. Cek Terapis Favorit
      const { data: favs, error: favError } = await supabase
        .from('user_favorites')
        .select('therapist_id')
        .eq('user_id', orderData.user_id);
        
      const favoriteIds = favs && !favError ? favs.map((f: any) => f.therapist_id) : [];

      // 3. Filter Jarak (< 3KM) dan Skil Terapis
      const validTherapists = candidates.filter((t: any) => {
        // Skil Terapis: kita cocokkan array `category_slug` dari services dengan array `specializations` terapis
        // Jika category_slug tidak ada, fallback ke `name`
        const requiredSkills = orderData.service?.category_slug || [orderData.service?.name];
        
        if (t.specializations && Array.isArray(t.specializations)) {
          const therapistSkills: string[] = t.specializations;
          const checkSkill = (skill: string) => therapistSkills.some(ts => ts.toLowerCase() === skill.toLowerCase());
          
          let hasSkill = false;
          // Cek irisan (apakah ada minimal 1 kategori yang cocok)
          if (Array.isArray(requiredSkills)) {
            hasSkill = requiredSkills.some((skill: string) => checkSkill(skill));
          } else if (requiredSkills) {
            hasSkill = checkSkill(requiredSkills);
          }

          if (!hasSkill) {
            console.log(`[DEBUG Matchmaking] Terapis ${t.id} digugurkan: Tidak match. Skil dibutuhkan: ${JSON.stringify(requiredSkills)}, Dimiliki terapis: ${JSON.stringify(t.specializations)}`);
            return false;
          }
        } else {
           console.log(`[DEBUG Matchmaking] Terapis ${t.id} digugurkan: Kolom specializations kosong/invalid`);
           return false;
        }

        // Hitung Jarak dengan lokasi order
        const loc = Array.isArray(t.therapist_locations) ? t.therapist_locations[0] : t.therapist_locations;
        if (!loc || !loc.latitude || !loc.longitude || !lat1 || !lon1) {
           console.log(`[DEBUG Matchmaking] Terapis ${t.id} digugurkan: Data lokasi tidak valid`);
           return false;
        }

        const lat2 = loc.latitude;
        const lon2 = loc.longitude;

        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = EARTH_RADIUS * c;

        t.distance = distance;
        
        if (distance > 3) {
           console.log(`[DEBUG Matchmaking] Terapis ${t.id} digugurkan: Jarak terlalu jauh (${distance.toFixed(2)} KM)`);
           return false;
        }
        
        console.log(`[DEBUG Matchmaking] Terapis ${t.id} LOLOS! Jarak: ${distance.toFixed(2)} KM`);
        return true; // Radius di bawah 3 KM
      });

      console.log('[DEBUG Matchmaking] Jumlah terapis yang valid setelah filter lokal:', validTherapists.length);

      if (validTherapists.length > 0) {
        // Jika ada terapis favorit yang sedang online dan memenuhi kriteria, prioritaskan dia
        const favoriteOnline = validTherapists.find((t: any) => favoriteIds.includes(t.id));
        if (favoriteOnline) {
          console.log("Favorite therapist selected:", favoriteOnline.id);
          return favoriteOnline.id;
        }

        // Sortir jarak paling dekat (opsional, untuk memastikan yang terdekat yang dapat)
        validTherapists.sort((a: any, b: any) => a.distance - b.distance);
        return validTherapists[0].id;
      }

      return null;
    } catch (e) {
      console.error("Matchmaking error:", e);
      return null;
    }
  };

  const handleCancelAction = async () => {
    setIsTimeout(false);
    // Atomic update: only if still pending
    const { data: cancelledOrders, error: updateError } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('status', 'pending')
      .select();
    
    if (cancelledOrders && cancelledOrders.length > 0) {
      const orderData = cancelledOrders[0];
      
      // Refund Logic
      if (orderData.payment_method === 'saldo') {
        const { data: userProfile } = await supabase
          .from('users')
          .select('wallet_balance, cashback_balance')
          .eq('id', orderData.user_id)
          .single();

        if (userProfile) {
          const usedCashback = Number(orderData.used_cashback) || 0;
          const earnedCashback = Number(orderData.earned_cashback) || 0;
          const paidAmount = Number(orderData.total_price) || 0;
          
          if (usedCashback > 0 || earnedCashback > 0) {
            await supabase
              .from('users')
              .update({ 
                cashback_balance: (userProfile.cashback_balance || 0) + usedCashback - earnedCashback 
              })
              .eq('id', orderData.user_id);
          }
        }
      }

      // Add log entry
      await supabase.from('order_logs').insert({
        order_id: id,
        status: 'cancelled',
        note: 'Dibatalkan oleh pengguna (Timeout)'
      });
    }

    router.replace('/(main)/home');
  };

  const handleCancel = () => {
    showAlert(
      'Batalkan Pencarian?',
      'Apakah Anda yakin ingin membatalkan pencarian terapis?',
      [
        { text: 'Tidak', style: 'cancel' },
        { 
          text: 'Ya, Batalkan', 
          style: 'destructive',
          onPress: handleCancelAction
        }
      ]
    );
  };

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const floatY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20]
  });

  const floatYReverse = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20]
  });

  const ORNAMENTS = [
    { id: 1, icon: 'leaf-outline', size: 36, top: -30, left: -10, color: '#10B981', rotation: '15deg', reverse: false },
    { id: 2, icon: 'flower-outline', size: 42, top: -10, right: -30, color: '#EC4899', rotation: '-20deg', reverse: true },
    { id: 3, icon: 'water-outline', size: 32, bottom: -10, left: -30, color: '#3B82F6', rotation: '45deg', reverse: true },
    { id: 4, icon: 'sparkles-outline', size: 34, bottom: -40, right: 0, color: '#F59E0B', rotation: '0deg', reverse: false },
    { id: 5, icon: 'moon-outline', size: 28, top: 70, left: -50, color: '#8B5CF6', rotation: '-15deg', reverse: false },
    { id: 6, icon: 'body-outline', size: 32, top: 90, right: -50, color: '#F97316', rotation: '10deg', reverse: true },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.animationContainer}>
          {/* Massage Ornaments */}
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: spin }] }]}>
            {ORNAMENTS.map((ornament) => (
              <Animated.View 
                key={ornament.id}
                style={{
                  position: 'absolute',
                  top: ornament.top,
                  bottom: ornament.bottom,
                  left: ornament.left,
                  right: ornament.right,
                  transform: [
                    { rotate: ornament.rotation },
                    { translateY: ornament.reverse ? floatYReverse : floatY }
                  ],
                  opacity: 0.6
                }}
              >
                {/* @ts-ignore */}
                <Ionicons name={ornament.icon} size={ornament.size} color={ornament.color} />
              </Animated.View>
            ))}
          </Animated.View>

          {/* @ts-ignore */}
          <Animated.View style={[styles.pulse, { transform: [{ scale: pulseAnim }], opacity: 0.3 }]} />
          {/* @ts-ignore */}
          <Animated.View style={[styles.pulse, { transform: [{ scale: Animated.multiply(pulseAnim, 0.7) }], opacity: 0.5 }]} />
          
          <View style={styles.iconCircle}>
            <Image
              source={require('../../assets/logo-kang-massage.png')}
              style={styles.logoImage}
            />
          </View>
        </View>

        <Text style={styles.title}>Mencari Terapis...</Text>
        <Text style={styles.subtitle}>
          Kami sedang mencarikan terapis terbaik untuk layanan {order?.service?.name || 'Anda'}
        </Text>

        <View style={styles.infoCard}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Mencari Mitra Terdekat</Text>
            <Text style={styles.infoValue}>{timeLeft}s</Text>
          </View>
          <View style={styles.retryBadge}>
            <Text style={styles.retryBadgeText}>Percobaan {retryCount + 1}/3</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
          <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
          <Text style={styles.cancelText}>Batalkan Pesanan</Text>
        </TouchableOpacity>
      </View>

      {/* Timeout Popup Modal */}
      {isTimeout && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.warningIcon}>
                <Ionicons name="time" size={32} color="#F59E0B" />
              </View>
              <Text style={styles.modalTitle}>Waktu Habis</Text>
              <Text style={styles.modalSub}>
                Maaf, belum ada terapis yang tersedia di area Anda saat ini.
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.retryBtn]} 
                onPress={handleRetry}
              >
                <Text style={styles.retryBtnText}>Cari Ulang</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalCancelBtn]} 
                onPress={handleCancelAction}
              >
                <Text style={styles.modalCancelText}>Batalkan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    paddingVertical: 16,
  },
  content: {
    alignItems: 'center',
  },
  animationContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  pulse: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: PURPLE,
  },
  iconCircle: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: 70,
    height: 70,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: PURPLE,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
    fontFamily: 'Inter-Medium',
  },
  infoCard: {
    marginTop: 40,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '90%',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  infoItem: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  dividerVertical: {
    width: 1,
    height: 30,
    backgroundColor: '#E2E8F0',
  },
  infoLabel: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 36,
    color: '#EF4444',
    fontWeight: 'bold',
  },
  retryBadge: {
    marginTop: 15,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  retryBadgeText: {
    fontSize: 10,
    color: '#64748B',
    fontFamily: 'Inter-Bold',
  },
  footer: {
    paddingBottom: 20,
    alignItems: 'center',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  cancelText: {
    color: '#EF4444',
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 100,
  },
  modalContent: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  warningIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFBEB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    marginBottom: 8,
  },
  modalSub: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'Inter-Medium',
  },
  modalActions: {
    width: '100%',
    gap: 12,
  },
  modalBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtn: {
    backgroundColor: PURPLE,
  },
  retryBtnText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  modalCancelBtn: {
    backgroundColor: '#F1F5F9',
  },
  modalCancelText: {
    color: '#64748B',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});
