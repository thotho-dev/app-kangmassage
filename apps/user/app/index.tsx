import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { TYPOGRAPHY, COLORS } from '../constants/Theme';
import { getAppSettings } from '../lib/appSettings';

export default function SplashScreen() {
  const styles = getStyles();
  const router = useRouter();
  const [platformName, setPlatformName] = useState('Kang Massage');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
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

    const timer = setTimeout(async () => {
      const done = await SecureStore.getItemAsync('onboarding_completed');
      router.replace(done ? '/(main)/home' : '/(auth)/onboarding');
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const rippleScale = ripple.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] });
  const rippleOpacity = ripple.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] });

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
        <Animated.Text style={styles.subtitle}>Layanan Pijat Modern</Animated.Text>
      </Animated.View>

      {/* Bottom badge */}
      <Animated.View style={[styles.badge, { opacity: textOpacity }]}>
        <Ionicons name="shield-checkmark" size={14} color={COLORS.primary[500]} />
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
  ripple: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: COLORS.primary[500] + '15',
  },
  logoContainer: { alignItems: 'center' },
  logoImage: {
    width: 120, height: 120, resizeMode: 'contain',
  },
  title: {
    ...TYPOGRAPHY.h1,
    color: COLORS.dark[900],
    fontSize: 36,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: 'rgba(15,23,42,0.6)',
    marginTop: 6,
    letterSpacing: 2,
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
    backgroundColor: COLORS.primary[500] + '10',
    borderColor: COLORS.primary[500] + '20',
  },
  badgeText: {
    ...TYPOGRAPHY.caption,
    color: 'rgba(15,23,42,0.5)',
    fontSize: 12,
  },
});
