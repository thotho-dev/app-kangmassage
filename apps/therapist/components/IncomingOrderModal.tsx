import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTherapistStore } from '../store/therapistStore';
import { useThemeColors } from '../store/themeStore';
import { SPACING, RADIUS, TYPOGRAPHY } from '../constants/Theme';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';

export default function IncomingOrderModal() {
  const { incomingOrder, setIncomingOrder, profile } = useTherapistStore();
  const t = useThemeColors();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (incomingOrder) {
      Animated.spring(fadeAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [incomingOrder]);

  if (!incomingOrder) return null;

  const handleAccept = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'accepted', 
          therapist_id: profile.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', incomingOrder.id);

      if (error) throw error;
      
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
          <LinearGradient colors={[t.primaryDark, t.headerBg]} style={styles.header}>
            <View style={styles.iconWrap}>
              <Ionicons name="notifications" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.headerTitle}>Pesanan Baru Masuk!</Text>
            <Text style={styles.headerSub}>Seseorang membutuhkan jasa Anda</Text>
          </LinearGradient>

          <View style={styles.content}>
            <View style={styles.customerRow}>
              <View style={[styles.avatar, { backgroundColor: t.primary + '20' }]}>
                <Text style={[styles.avatarText, { color: t.primary }]}>
                  {incomingOrder.users?.full_name?.charAt(0) || 'P'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.customerName, { color: t.text }]}>{incomingOrder.users?.full_name || 'Pelanggan'}</Text>
                <Text style={[styles.serviceText, { color: t.textSecondary }]}>{incomingOrder.service_name || 'Pijat Tradisional'}</Text>
              </View>
            </View>

            <View style={styles.infoGrid}>
              <View style={[styles.infoBox, { backgroundColor: t.background, borderColor: t.border }]}>
                <Ionicons name="navigate-outline" size={20} color={t.secondary} />
                <Text style={[styles.infoValue, { color: t.text }]}>{incomingOrder.distance || '1.2'} km</Text>
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
              <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept} disabled={loading}>
                <LinearGradient colors={[t.secondary, '#EA580C']} style={styles.gradientBtn}>
                  <Text style={styles.acceptText}>{loading ? 'Memproses...' : 'Terima Sekarang'}</Text>
                </LinearGradient>
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
  serviceText: { ...TYPOGRAPHY.caption },
  infoGrid: { flexDirection: 'row', gap: 10 },
  infoBox: { flex: 1, borderRadius: 16, padding: 10, alignItems: 'center', gap: 2, borderWidth: 1 },
  infoValue: { ...TYPOGRAPHY.bodySmall, fontSize: 13, fontFamily: 'Inter_700Bold' },
  infoLabel: { ...TYPOGRAPHY.caption, fontSize: 10 },
  addressBox: { flexDirection: 'row', gap: 8, borderRadius: 14, padding: 10 },
  addressText: { ...TYPOGRAPHY.caption, flex: 1, lineHeight: 16, fontSize: 11 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  rejectBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1.5 },
  rejectText: { ...TYPOGRAPHY.bodySmall, fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  acceptBtn: { flex: 2, borderRadius: 14, overflow: 'hidden' },
  gradientBtn: { paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  acceptText: { ...TYPOGRAPHY.bodySmall, color: '#FFFFFF', fontSize: 13, fontFamily: 'Inter_700Bold' },
});
