import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing, Image, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { TYPOGRAPHY, COLORS } from '@/constants/Theme';
import { getAppSettings, checkMaintenanceMode } from '@/lib/appSettings';
import { supabase } from '@/lib/supabase';
import { useTherapistStore } from '@/store/therapistStore';
import Constants from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === 'storeClient';

export default function SplashScreen() {
  const styles = getStyles();
  const router = useRouter();
  const [platformName, setPlatformName] = useState('Kang Massage');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('Aplikasi sedang dalam pemeliharaan. Silakan coba lagi nanti.');
  const navigated = useRef(false);
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const ripple = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getAppSettings().then(s => {
      setPlatformName(s.platform_name);
      setLogoUrl(s.logo_url);
    });
  }, []);

  const checkPendingOrders = async (therapistId: string) => {
    const rejected = useTherapistStore.getState().rejectedOrderIds;
    const isRejected = (id: string) => rejected.includes(id);

    if (!isExpoGo) {
      try {
        const notifee = await import('@notifee/react-native');
        const displayed = await notifee.default.getDisplayedNotifications();
        for (const n of displayed) {
          if (n?.notification?.data?.orderData) {
            const raw = n.notification.data.orderData;
            const orderData = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (isRejected(orderData.id)) continue;
            const current = useTherapistStore.getState().incomingOrder;
            if (orderData.id !== current?.id) {
              useTherapistStore.getState().setIncomingOrder(orderData);
              return;
            }
          }
        }
      } catch {}
    }

    const { data } = await supabase
      .from('orders')
      .select('*, users(full_name, avatar_url), services:service_id(name, duration_min, price_type)')
      .eq('status', 'pending')
      .or(`therapist_id.eq.${therapistId},therapist_id.is.null`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data && !isRejected(data.id)) {
      const current = useTherapistStore.getState().incomingOrder;
      if (data.id !== current?.id) {
        useTherapistStore.getState().setIncomingOrder(data);
      }
    }
  };

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.timing(ripple, {
        toValue: 1,
        duration: 2500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    ).start();

    const performSetup = async () => {
      // Minimum splash display time (1.5 detik — animasi logo sempat jalan)
      await new Promise(r => setTimeout(r, 1500));

      // Check maintenance mode
      const maintenance = await checkMaintenanceMode();
      if (maintenance.maintenance_mode) {
        setMaintenanceMode(true);
        setMaintenanceMessage(maintenance.maintenance_message);
        return;
      }

      if (navigated.current) return;
      const go = (route: string) => {
        navigated.current = true;
        setTimeout(() => router.replace(route as any), 0);
      };

      const done = await SecureStore.getItemAsync('onboarding_completed');
      if (!done) { go('/onboarding'); return; }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: therapist } = await supabase
          .from('therapists')
          .select('id, registration_step, is_active, is_verified, registration_fee_paid')
          .eq('supabase_uid', session.user.id)
          .single();
        if (therapist && therapist.is_active !== false) {
          const step = therapist.registration_step;
          if (step === 'pending' || step === 'otp_sent') {
            go('/(auth)/register-otp');
          } else if (step === 'otp_verified') {
            go('/(auth)/register?continue=1');
          } else {
            // Cek pending order duluan sebelum navigasi ke tabs
            checkPendingOrders(therapist.id);
            go('/(tabs)');
          }
          return;
        }
      }
      go('/(auth)/login');
    };

    performSetup();
  }, []);

  const rippleScale = ripple.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] });
  const rippleOpacity = ripple.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] });

  if (maintenanceMode) {
    return (
      <View style={styles.maintenanceContainer}>
        <View style={styles.maintenanceCard}>
          <Ionicons name="construct" size={64} color={COLORS.warning} />
          <Text style={styles.maintenanceTitle}>Pemeliharaan Sistem</Text>
          <Text style={styles.maintenanceMessage}>{maintenanceMessage}</Text>
          <Text style={styles.maintenanceNote}>Silakan coba lagi nanti. Terima kasih atas pengertiannya.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Ripple effect */}
      <Animated.View
        style={[
          styles.ripple,
          { transform: [{ scale: rippleScale }], opacity: rippleOpacity },
        ]}
      />

      {/* Logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          { transform: [{ scale: logoScale }], opacity: logoOpacity },
        ]}
      >
        <Image
          source={logoUrl ? { uri: logoUrl } : require('../assets/logo-kang-massage.png')}
          style={styles.logoImage}
        />
      </Animated.View>

      <Animated.View style={{ opacity: textOpacity, alignItems: 'center', marginTop: 24 }}>
        <Animated.Text style={styles.title}>{platformName}</Animated.Text>
        <Animated.Text style={styles.subtitle}>Mitra Terapis</Animated.Text>
      </Animated.View>

      {/* Bottom badge */}
      <Animated.View style={[styles.badge, { opacity: textOpacity }]}>
        <Ionicons name="shield-checkmark" size={14} color={COLORS.primary} />
        <Animated.Text style={styles.badgeText}>Platform Terpercaya #1 Indonesia</Animated.Text>
      </Animated.View>
    </View>
  );
}

const getStyles = () => StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  maintenanceContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 32,
  },
  maintenanceCard: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  maintenanceTitle: {
    ...TYPOGRAPHY.h2,
    color: '#0F172A',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  maintenanceMessage: {
    ...TYPOGRAPHY.body,
    color: 'rgba(15,23,42,0.6)',
    textAlign: 'center',
    marginBottom: 8,
  },
  maintenanceNote: {
    ...TYPOGRAPHY.caption,
    color: 'rgba(15,23,42,0.5)',
    textAlign: 'center',
  },
  ripple: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: COLORS.primary + '20',
  },
  logoContainer: { alignItems: 'center' },
  logoImage: {
    width: 120, height: 120, resizeMode: 'contain',
  },
  title: {
    ...TYPOGRAPHY.h1,
    color: '#0F172A',
    fontSize: 36,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: 'rgba(15,23,42,0.6)',
    marginTop: 6,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontSize: 13,
  },
  badge: {
    position: 'absolute',
    bottom: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary + '30',
  },
  badgeText: {
    ...TYPOGRAPHY.caption,
    color: 'rgba(15,23,42,0.5)',
    fontSize: 12,
  },
});
