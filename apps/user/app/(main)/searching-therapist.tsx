import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity, Alert, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

const PURPLE = '#240080';
const BG = '#F8F9FE';

export default function SearchingTherapistScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
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

    // 2. Fetch Initial Data
    fetchOrder();

    // 3. Subscribe to Real-time Changes
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
          router.replace({ pathname: '/(main)/tracking', params: { id } });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

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
          let hasSkill = false;
          // Cek irisan (apakah ada minimal 1 kategori yang cocok)
          if (Array.isArray(requiredSkills)) {
            hasSkill = requiredSkills.some((skill: string) => t.specializations.includes(skill));
          } else {
            hasSkill = t.specializations.includes(requiredSkills);
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

  const handleCancel = () => {
    Alert.alert(
      'Batalkan Pencarian?',
      'Apakah Anda yakin ingin membatalkan pencarian terapis?',
      [
        { text: 'Tidak', style: 'cancel' },
        { 
          text: 'Ya, Batalkan', 
          style: 'destructive',
          onPress: async () => {
            // Atomic update: only if still pending
            const { data, error } = await supabase
              .from('orders')
              .update({ status: 'cancelled' })
              .eq('id', id)
              .eq('status', 'pending')
              .select();
            
            if (data && data.length > 0) {
              // Add log entry
              await supabase.from('order_logs').insert({
                order_id: id,
                status: 'cancelled',
                note: 'Dibatalkan oleh pengguna'
              });
            }

            router.replace('/(main)/home');
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.animationContainer}>
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
          <Text style={styles.infoLabel}>Estimasi Waktu Tunggu</Text>
          <Text style={styles.infoValue}>1 - 5 Menit</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
        <Text style={styles.cancelText}>Batalkan Pesanan</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: 'space-between',
    padding: 30,
    paddingTop: 100,
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
    fontWeight: '800',
    color: PURPLE,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  infoCard: {
    marginTop: 40,
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 18,
    color: PURPLE,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  cancelText: {
    color: '#E74C3C',
    fontSize: 15,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
