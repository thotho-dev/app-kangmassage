import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTherapistStore } from '../store/therapistStore';
import { useThemeColors } from '../store/themeStore';
import { SPACING, RADIUS, TYPOGRAPHY } from '../constants/Theme';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { calculateDistance } from '../lib/utils';
import { CustomAlertTrigger } from '../store/alertStore';

export default function IncomingOrderModal() {
  const { incomingOrder, setIncomingOrder, profile } = useTherapistStore();
  const t = useThemeColors();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [therapistLoc, setTherapistLoc] = useState<{latitude: number, longitude: number} | null>(null);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (incomingOrder) {
      Animated.spring(fadeAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();

      // Fetch current location to calculate real distance
      (async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            setTherapistLoc({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
          }
        } catch (e) {
          console.warn('IncomingOrderModal location error:', e);
        }
      })();
    } else {
      fadeAnim.setValue(0);
      setTherapistLoc(null);
    }
  }, [incomingOrder]);

  if (!incomingOrder) return null;

  const handleAccept = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      // Atomic update: only if status is still pending AND (therapist_id is NULL or is us)
      const { data, error } = await supabase
        .from('orders')
        .update({ 
          status: 'accepted', 
          therapist_id: profile.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', incomingOrder.id)
        .eq('status', 'pending')
        .or(`therapist_id.is.null,therapist_id.eq.${profile.id}`)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        // Someone else got it or it was cancelled
        const { data: check } = await supabase
          .from('orders')
          .select('status, therapist_id')
          .eq('id', incomingOrder.id)
          .single();
          
        if (check?.status === 'accepted' && check?.therapist_id !== profile.id) {
           CustomAlertTrigger.show({
             title: 'Pesanan Diambil',
             message: 'Maaf, pesanan ini baru saja diterima oleh terapis lain.',
             type: 'warning'
           });
        } else if (check?.status === 'cancelled') {
           CustomAlertTrigger.show({
             title: 'Pesanan Batal',
             message: 'Maaf, pesanan ini sudah dibatalkan oleh Customer.',
             type: 'error'
           });
        } else {
           CustomAlertTrigger.show({
             title: 'Gagal',
             message: 'Pesanan sudah tidak tersedia.',
             type: 'error'
           });
        }
        setIncomingOrder(null);
        return;
      }
      
      const orderId = incomingOrder.id;
      setIncomingOrder(null);
      router.push(`/orders/${orderId}`);
    } catch (error) {
      console.error('Accept Order Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = () => {
    // Tutup modal secara lokal saja tanpa mengubah status di database (Broadcast Mode)
    setIncomingOrder(null);
  };

  return (
    <Modal transparent visible={!!incomingOrder} animationType="none">
      <View style={styles.overlay}>
        <Animated.View style={[
          styles.modal, 
          { 
            backgroundColor: t.surface,
            opacity: fadeAnim, 
            transform: [{ 
              scale: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1]
              }) 
            }] 
          }
        ]}>
          <View style={[styles.header, { backgroundColor: t.primary }]}>
            <View style={styles.iconWrap}>
              <Ionicons name="notifications" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.headerTitle}>Pesanan Baru Masuk!</Text>
            <Text style={styles.headerSub}>Seseorang membutuhkan jasa Anda</Text>
          </View>

          <View style={styles.content}>
            <View style={styles.customerRow}>
              <View style={[styles.avatar, { backgroundColor: t.primary + '20' }]}>
                <Text style={[styles.avatarText, { color: t.primary }]}>
                  {incomingOrder.users?.full_name?.charAt(0) || 'P'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.customerName, { color: t.text }]}>{incomingOrder.users?.full_name || 'Pelanggan'}</Text>
                <View style={styles.serviceRow}>
                  <Text style={[styles.serviceText, { color: t.textSecondary }]}>{incomingOrder.services?.name || 'Layanan Pijat'}</Text>
                  <Text style={{ color: t.textMuted, fontSize: 10 }}>·</Text>
                  <Ionicons name="time-outline" size={12} color={t.textMuted} style={{ marginTop: 1 }} />
                  <Text style={[styles.durationText, { color: t.textMuted }]}>
                    {incomingOrder.services?.price_type === 'treatment' ? '1 Treatment' : `${incomingOrder.duration || incomingOrder.services?.duration_min || 60} Menit`}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.infoGrid}>
              <View style={[styles.infoBox, { backgroundColor: t.background, borderColor: t.border }]}>
                <Ionicons name="navigate-outline" size={20} color={t.secondary} />
                <Text style={[styles.infoValue, { color: t.text }]}>
                  {therapistLoc 
                    ? `${calculateDistance(therapistLoc.latitude, therapistLoc.longitude, incomingOrder.latitude, incomingOrder.longitude)} km` 
                    : (incomingOrder.distance || '1.2 km')}
                </Text>
                <Text style={[styles.infoLabel, { color: t.textMuted }]}>Jarak</Text>
              </View>
              <View style={[styles.infoBox, { backgroundColor: t.background, borderColor: t.border }]}>
                <Ionicons name="wallet-outline" size={20} color={t.success} />
                <Text style={[styles.infoValue, { color: t.text }]}>Rp {(incomingOrder.total_price || 0).toLocaleString('id-ID')}</Text>
                <Text style={[styles.infoLabel, { color: t.textMuted }]}>Biaya</Text>
              </View>
            </View>

            <View style={[styles.addressBox, { backgroundColor: t.background }]}>
              <Ionicons name="location-outline" size={18} color={t.textSecondary} />
              <Text style={[styles.addressText, { color: t.textSecondary }]} numberOfLines={2}>
                {incomingOrder.address || 'Alamat tidak tersedia'}
              </Text>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity 
                style={[styles.rejectBtn, { borderColor: t.danger + '40', backgroundColor: t.danger + '10' }]} 
                onPress={handleReject} 
                disabled={loading}
              >
                <Text style={[styles.rejectText, { color: t.danger }]}>Tolak</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.acceptBtn, { backgroundColor: t.secondary }]} 
                onPress={handleAccept} 
                disabled={loading}
              >
                <Text style={styles.acceptText}>{loading ? 'Memproses...' : 'Terima Sekarang'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.8)', 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 32 
  },
  modal: { 
    width: '100%',
    maxWidth: 360,
    borderRadius: 28, 
    overflow: 'hidden', 
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  header: { padding: 20, alignItems: 'center', gap: 6 },
  iconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  headerTitle: { ...TYPOGRAPHY.h3, color: '#FFFFFF', fontSize: 20 },
  headerSub: { ...TYPOGRAPHY.caption, color: 'rgba(255,255,255,0.8)' },
  content: { padding: 20, gap: 16 },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...TYPOGRAPHY.h4, fontFamily: 'Inter_700Bold' },
  customerName: { ...TYPOGRAPHY.bodySmall, fontFamily: 'Inter_700Bold' },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  serviceText: { ...TYPOGRAPHY.caption, fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  durationText: { ...TYPOGRAPHY.caption, fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  infoGrid: { flexDirection: 'row', gap: 10 },
  infoBox: { flex: 1, borderRadius: 16, padding: 10, alignItems: 'center', gap: 2, borderWidth: 1 },
  infoValue: { ...TYPOGRAPHY.bodySmall, fontSize: 13, fontFamily: 'Inter_700Bold' },
  infoLabel: { ...TYPOGRAPHY.caption, fontSize: 10 },
  addressBox: { flexDirection: 'row', gap: 8, borderRadius: 14, padding: 10 },
  addressText: { ...TYPOGRAPHY.caption, flex: 1, lineHeight: 16, fontSize: 11 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  rejectBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1.5 },
  rejectText: { ...TYPOGRAPHY.bodySmall, fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  acceptBtn: { flex: 2, borderRadius: 14, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  acceptText: { ...TYPOGRAPHY.bodySmall, color: '#FFFFFF', fontSize: 13, fontFamily: 'Inter_700Bold' },
});
