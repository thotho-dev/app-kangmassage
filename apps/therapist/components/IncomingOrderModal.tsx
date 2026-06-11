import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Alert } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTherapistStore } from '../store/therapistStore';
import { useThemeColors } from '../store/themeStore';
import { SPACING, RADIUS, TYPOGRAPHY } from '../constants/Theme';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { calculateDistance, titleCase } from '../lib/utils';
import { CustomAlertTrigger } from '../store/alertStore';
import { API_URL } from '../lib/config';
import { stopOrderSound } from '../lib/orderSound';
import Constants from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === 'storeClient';

const cancelOrderNotification = async () => {
  if (isExpoGo) return;
  try {
    const notifee = await import('@notifee/react-native');
    const displayed = await notifee.default.getDisplayedNotifications();
    for (const n of displayed) {
      if (n?.notification?.data?.orderData) {
        await notifee.default.cancelNotification(n.notification.id!);
      }
    }
  } catch {}
};

export default function IncomingOrderModal() {
  const { incomingOrder, setIncomingOrder, addRejectedOrderId, profile } = useTherapistStore();
  const t = useThemeColors();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [therapistLoc, setTherapistLoc] = useState<{latitude: number, longitude: number} | null>(null);
  const [countdown, setCountdown] = useState(40);
  const [progress, setProgress] = useState(0);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stop sound ketika modal benar-benar ditutup (incomingOrder jadi null),
  // bukan ketika incomingOrder berganti ke order baru.
  useEffect(() => {
    if (!incomingOrder) {
      stopOrderSound();
    }
  }, [incomingOrder]);

  useEffect(() => {
    if (incomingOrder) {
      // Jangan cancel notifikasi di sini — biarkan sound looping
      // sampai therapist accept/reject atau countdown habis.

      setCountdown(40);
      setProgress(0);
      Animated.spring(fadeAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();

      // Start 40s countdown
      const startTime = Date.now();
      const totalDuration = 40000;
      countdownRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 40 - Math.floor(elapsed / 1000));
        const pct = Math.min(1, elapsed / totalDuration);
        setCountdown(remaining);
        setProgress(pct);

        if (remaining <= 0) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          setIncomingOrder(null);
        }
      }, 100);

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
      setCountdown(40);
      setProgress(0);
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    }

    return () => {
      cancelOrderNotification();
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [incomingOrder]);

  if (!incomingOrder) return null;

  const TIMER_SIZE = 56;
  const STROKE_WIDTH = 3;
  const timerRadius = (TIMER_SIZE - STROKE_WIDTH) / 2;
  const timerCircumference = 2 * Math.PI * timerRadius;

  const TimerCircle = () => {
    const offset = timerCircumference - progress * timerCircumference;

    return (
      <View style={{ width: TIMER_SIZE, height: TIMER_SIZE, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={TIMER_SIZE} height={TIMER_SIZE} style={{ position: 'absolute' }}>
          <Circle
            cx={TIMER_SIZE / 2}
            cy={TIMER_SIZE / 2}
            r={timerRadius}
            stroke="rgba(255,255,255,0.25)"
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />
          <Circle
            cx={TIMER_SIZE / 2}
            cy={TIMER_SIZE / 2}
            r={timerRadius}
            stroke="#FFFFFF"
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeDasharray={timerCircumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90, ${TIMER_SIZE / 2}, ${TIMER_SIZE / 2})`}
          />
        </Svg>
        <Text style={{ color: '#FFFFFF', fontSize: 18, fontFamily: 'Inter_700Bold' }}>{countdown}</Text>
      </View>
    );
  };

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
      // Send push notification to user
      fetch(`${API_URL}/api/notifications/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: incomingOrder.user_id,
          title: 'Pesanan Diterima',
          body: `Terapis ${profile?.full_name} telah menerima pesanan Anda dan akan segera menuju lokasi.`,
          type: 'order_accepted',
          data: { order_id: orderId },
        }),
      }).catch((err: any) => console.warn('Push notif error:', err?.message));

      setIncomingOrder(null);
      router.push(`/orders/${orderId}`);
    } catch (error) {
      console.error('Accept Order Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!incomingOrder) return;

    // Jika ini adalah pesanan favorit (ada therapist_id), maka kita harus batalkan di DB
    if (incomingOrder.therapist_id) {
      setLoading(true);
      try {
        // 1. Update status pesanan ke cancelled
        const { error } = await supabase
          .from('orders')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('id', incomingOrder.id)
          .eq('status', 'pending');

        if (error) throw error;

        // 2. Tambahkan log agar user tahu ini ditolak oleh terapis
        await supabase.from('order_logs').insert({
          order_id: incomingOrder.id,
          status: 'cancelled',
          note: 'Ditolak oleh terapis'
        });

        console.log('[DEBUG Reject] Targeted order rejected successfully');
      } catch (err) {
        console.error('[DEBUG Reject] Error rejecting targeted order:', err);
      } finally {
        setLoading(false);
        addRejectedOrderId(incomingOrder.id);
        setIncomingOrder(null);
      }
    } else {
      // Jika pesanan broadcast (rebutan), cukup tutup modal secara lokal saja
      // Biar terapis lain masih bisa ambil
      addRejectedOrderId(incomingOrder.id);
      setIncomingOrder(null);
    }
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
            <View style={[styles.header, { backgroundColor: incomingOrder.scheduled_at ? '#8B5CF6' : t.primary }]}>
            <View style={styles.iconWrap}>
              {incomingOrder.scheduled_at ? (
                <Ionicons name="calendar" size={32} color="#FFFFFF" />
              ) : (
                <TimerCircle />
              )}
            </View>
            <Text style={styles.headerTitle}>
              {incomingOrder.scheduled_at ? 'Booking Terjadwal!' : 'Pesanan Baru Masuk!'}
            </Text>
            <Text style={styles.headerSub}>
              {incomingOrder.scheduled_at ? 'Pesanan untuk waktu mendatang' : 'Seseorang membutuhkan jasa Anda'}
            </Text>
          </View>

          <View style={styles.content}>
            <View style={styles.customerRow}>
              <View style={[styles.avatar, { backgroundColor: (incomingOrder.scheduled_at ? '#8B5CF6' : t.primary) + '20' }]}>
                <Text style={[styles.avatarText, { color: incomingOrder.scheduled_at ? '#8B5CF6' : t.primary }]}>
                  {incomingOrder.users?.full_name?.charAt(0) || 'P'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.customerName, { color: t.text }]}>{titleCase(incomingOrder.users?.full_name) || 'Pelanggan'}</Text>
                <View style={styles.serviceRow}>
                  <Text style={[styles.serviceText, { color: t.textSecondary }]}>{incomingOrder.services?.name || 'Layanan Pijat'}</Text>
                  <Text style={{ color: t.textMuted, fontSize: 10 }}>·</Text>
                  {incomingOrder.services?.price_type === 'treatment' ? (
                    <>
                      <Ionicons name="sparkles" size={12} color="#8B5CF6" style={{ marginTop: 1 }} />
                      <Text style={[styles.durationText, { color: '#8B5CF6' }]}>Treatment</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="time-outline" size={12} color={t.textMuted} style={{ marginTop: 1 }} />
                      <Text style={[styles.durationText, { color: t.textMuted }]}>
                        {incomingOrder.duration || incomingOrder.services?.duration_min || 60} Menit
                      </Text>
                    </>
                  )}
                </View>
              </View>
            </View>

            {incomingOrder.scheduled_at && (
              <View style={[styles.scheduleBox, { backgroundColor: '#F5F3FF', borderColor: '#E9D5FF' }]}>
                <Ionicons name="calendar-outline" size={18} color="#8B5CF6" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 9, color: '#7C3AED', fontFamily: 'Inter_700Bold', letterSpacing: 0.5 }}>WAKTU RESERVASI</Text>
                  <Text style={{ fontSize: 12, color: '#5B21B6', fontFamily: 'Inter_700Bold', marginTop: 1 }}>
                    {new Date(incomingOrder.scheduled_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} · {new Date(incomingOrder.scheduled_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>
                </View>
              </View>
            )}

            <View style={[styles.addressBox, { backgroundColor: t.background }]}>
              <Ionicons name="location-outline" size={18} color={t.textSecondary} />
              <Text style={[styles.addressText, { color: t.textSecondary }]} numberOfLines={2}>
                {incomingOrder.address || 'Alamat tidak tersedia'}
              </Text>
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
                <Text style={[styles.infoValue, { color: t.text }]}>Rp {(incomingOrder.service_price || incomingOrder.total_price || 0).toLocaleString('id-ID')}</Text>
                <Text style={[styles.infoLabel, { color: t.textMuted }]}>Biaya</Text>
              </View>
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
                style={[styles.acceptBtn, { backgroundColor: incomingOrder.scheduled_at ? '#8B5CF6' : t.secondary }]} 
                onPress={handleAccept} 
                disabled={loading}
              >
                <Text style={styles.acceptText}>{loading ? 'Memproses...' : incomingOrder.scheduled_at ? 'Terima Jadwal' : 'Terima Sekarang'}</Text>
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
  scheduleBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1 },
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
