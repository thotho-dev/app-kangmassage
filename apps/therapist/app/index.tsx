import { useEffect } from 'react';
import { useThemeColors } from '@/store/themeStore';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { TYPOGRAPHY } from '@/constants/Theme';

export default function SplashScreen() {
  const t = useThemeColors();
  const styles = getStyles(t);
  const router = useRouter();
  const logoScale = new Animated.Value(0);
  const logoOpacity = new Animated.Value(0);
  const textOpacity = new Animated.Value(0);
  const ripple = new Animated.Value(0);

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 60,
          friction: 8,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.timing(ripple, {
        toValue: 1,
        duration: 2000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    ).start();

    const timer = setTimeout(() => {
      router.replace('/onboarding');
    }, 2800);
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
        <LinearGradient
          colors={[t.secondary, '#EA580C']}
          style={styles.logoCircle}
        >
          <Ionicons name="hand-left" size={52} color="#FFFFFF" />
        </LinearGradient>
      </Animated.View>

      <Animated.View style={{ opacity: textOpacity, alignItems: 'center', marginTop: 24 }}>
        <Animated.Text style={styles.title}>PijatPro</Animated.Text>
        <Animated.Text style={styles.subtitle}>Mitra Terapis</Animated.Text>
      </Animated.View>

      {/* Bottom badge */}
      <Animated.View style={[styles.badge, { opacity: textOpacity }]}>
        <Ionicons name="shield-checkmark" size={14} color={t.success} />
        <Animated.Text style={styles.badgeText}>Platform Terpercaya #1 Indonesia</Animated.Text>
      </Animated.View>
    </View>
  );
}

const getStyles = (t: any) => StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.background,
  },
  ripple: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: t.secondary + '20',
  },
  logoContainer: { alignItems: 'center' },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: t.secondary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 16,
  },
  title: {
    ...TYPOGRAPHY.h1,
    color: '#FFFFFF',
    fontSize: 36,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: 'rgba(255,255,255,0.7)',
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
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  badgeText: {
    ...TYPOGRAPHY.caption,
    color: '#FFFFFF',
    fontSize: 12,
  },
});
