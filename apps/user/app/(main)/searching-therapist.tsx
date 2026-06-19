import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAlert } from '@/context/AlertContext';
import { getAppSettings, DEFAULT_SETTINGS } from '@/lib/appSettings';
import { API_URL } from '@/lib/config';

const PURPLE = '#240080';
const BG = '#F8F9FE';

export default function SearchingTherapistScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { showAlert } = useAlert();
  const searchScale = useRef(new Animated.Value(1)).current;
  const searchRotate = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.4)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const sparkle1 = useRef(new Animated.Value(0)).current;
  const sparkle2 = useRef(new Animated.Value(0)).current;
  const [order, setOrder] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(45);
  const [isTimeout, setIsTimeout] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [appSettings, setAppSettings] = useState(DEFAULT_SETTINGS);
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

    Animated.loop(
      Animated.sequence([
        Animated.timing(searchScale, {
          toValue: 0.85,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(searchScale, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ringScale, {
            toValue: 1.8,
            duration: 2000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0,
            duration: 2000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(ringScale, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0.4,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(searchRotate, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(searchRotate, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

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

    Animated.loop(
      Animated.sequence([
        Animated.delay(0),
        Animated.timing(sparkle1, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(sparkle1, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.delay(800),
        Animated.timing(sparkle2, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(sparkle2, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();

    fetchOrder();
    startTimer();

    const channel = supabase
      .channel(`searching_order_${id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'orders',
        filter: `id=eq.${id}`
      }, (payload) => {
        if (payload.new.status === 'accepted') {
          stopTimer();
          router.replace({ pathname: '/tracking', params: { id } });
        } else if (payload.new.status === 'cancelled') {
          stopTimer();
          setIsTimeout(true);
        }
      })
      .subscribe();

    return () => {
      stopTimer();
      supabase.removeChannel(channel);
    };
  }, [id]);

  useEffect(() => {
    getAppSettings().then(setAppSettings);
  }, []);

  const handleRetry = async () => {
    if (retryCount >= 2) {
      showAlert(
        'Batas Pencarian Tercapai',
        'Maaf, sepertinya belum ada terapis yang tersedia saat ini. Silakan coba lagi beberapa saat lagi.',
        [{ text: 'OK', onPress: handleCancelAction }]
      );
      return;
    }

    setIsTimeout(false);
    setRetryCount(prev => prev + 1);
    
    await supabase
      .from('orders')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id);
    
    startTimer();
  };

  const fetchOrder = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, service:services(name, category_slug)')
      .eq('id', id)
      .single();

    if (data) {
      setOrder(data);
      if (data.status === 'accepted') {
        stopTimer();
        router.replace({ pathname: '/tracking', params: { id } });
      } else if (data.scheduled_at) {
        stopTimer();
        router.replace({ pathname: '/tracking', params: { id } });
      }
    }
  };

  const handleCancelAction = async () => {
    setIsTimeout(false);
    try {
      const { data: cancelledOrders } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .in('status', ['pending', 'accepted'])
        .select();
      
      if (cancelledOrders && cancelledOrders.length > 0) {
        const orderData = cancelledOrders[0];
        
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
          const { data: userProfile } = await supabase
            .from('users')
            .select('wallet_balance, cashback_balance')
            .eq('id', orderData.user_id)
            .single();

          if (userProfile) {
            const usedCashback = Number(orderData.used_cashback) || 0;
            const earnedCashback = Number(orderData.earned_cashback) || 0;
            const paidAmount = Number(orderData.total_price) || 0;
            
            await supabase
              .from('users')
              .update({ 
                wallet_balance: (userProfile.wallet_balance || 0) + paidAmount,
                cashback_balance: (userProfile.cashback_balance || 0) + usedCashback - earnedCashback 
              })
              .eq('id', orderData.user_id);

            await supabase.from('transactions').insert({
              user_id: orderData.user_id,
              order_id: id,
              type: 'refund',
              amount: paidAmount,
              balance_before: userProfile.wallet_balance || 0,
              balance_after: (userProfile.wallet_balance || 0) + paidAmount,
              description: `Refund pembatalan pesanan ${orderData.order_number} ke saldo`,
            });
          }
        }

        await supabase.from('order_logs').insert({
          order_id: id,
          status: 'cancelled',
          note: 'Dibatalkan oleh pengguna (Timeout)'
        });
      }
    } catch (err) {
      console.error('Cancel error:', err);
    }

    router.replace('/home');
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

  const searchRotation = searchRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-15deg', '15deg'],
  });

  const floatY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  const floatYReverse = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });

  const ORNAMENTS = [
    { id: 1, icon: 'leaf-outline', size: 36, top: -30, left: -10, color: '#10B981', reverse: false },
    { id: 2, icon: 'flower-outline', size: 42, top: -10, right: -30, color: '#EC4899', reverse: true },
    { id: 3, icon: 'water-outline', size: 32, bottom: -10, left: -30, color: '#3B82F6', reverse: true },
    { id: 4, icon: 'sparkles-outline', size: 34, bottom: -40, right: 0, color: '#F59E0B', reverse: false },
    { id: 5, icon: 'moon-outline', size: 28, top: 70, left: -50, color: '#8B5CF6', reverse: false },
    { id: 6, icon: 'body-outline', size: 32, top: 90, right: -50, color: '#F97316', reverse: true },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.animationContainer}>
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
                  { translateY: ornament.reverse ? floatYReverse : floatY }
                ],
                opacity: 0.5,
              }}
            >
              <Ionicons name={ornament.icon as any} size={ornament.size} color={ornament.color} />
            </Animated.View>
          ))}

          <Animated.View
            style={[
              styles.ring,
              {
                transform: [{ scale: ringScale }],
                opacity: ringOpacity,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.ring,
              {
                width: 90,
                height: 90,
                borderRadius: 45,
                transform: [
                  {
                    scale: ringScale.interpolate({
                      inputRange: [1, 1.8],
                      outputRange: [0.6, 1.2],
                    }),
                  },
                ],
                opacity: ringOpacity.interpolate({
                  inputRange: [0, 0.4],
                  outputRange: [0, 0.3],
                }),
              },
            ]}
          />

          <Animated.View style={[styles.sparkle, styles.sparkle1, { opacity: sparkle1 }]}>
            <Ionicons name="sparkles" size={18} color="#F59E0B" />
          </Animated.View>
          <Animated.View style={[styles.sparkle, styles.sparkle2, { opacity: sparkle2 }]}>
            <Ionicons name="sparkles" size={14} color="#8B5CF6" />
          </Animated.View>

          <Animated.View
            style={[
              styles.searchIconContainer,
              {
                transform: [
                  { scale: searchScale },
                  { rotate: searchRotation },
                ],
              },
            ]}
          >
            <View style={styles.searchIconBg}>
              <Ionicons name="search" size={44} color={PURPLE} />
            </View>
          </Animated.View>
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
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  ring: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: PURPLE,
  },
  searchIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchIconBg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  sparkle: {
    position: 'absolute',
  },
  sparkle1: {
    top: 10,
    right: 15,
  },
  sparkle2: {
    bottom: 20,
    left: 10,
  },
  title: {
    fontSize: 24,
    fontFamily: 'PlusJakartaSans-Bold',
    color: PURPLE,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
    fontFamily: 'PlusJakartaSans-Medium',
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
  infoItem: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
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
    fontFamily: 'PlusJakartaSans-Bold',
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
    fontFamily: 'PlusJakartaSans-Bold',
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
    zIndex: 9999,
    elevation: 10,
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
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#0F172A',
    marginBottom: 8,
  },
  modalSub: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'PlusJakartaSans-Medium',
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
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Bold',
  },
  modalCancelBtn: {
    backgroundColor: '#F1F5F9',
  },
  modalCancelText: {
    color: '#64748B',
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-SemiBold',
  },
});
