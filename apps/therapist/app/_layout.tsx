import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, Text, StyleSheet, Animated, Easing, Image } from 'react-native';
import LottieView from 'lottie-react-native';
import { useThemeColors, useThemeStore } from '@/store/themeStore';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTopupListener } from '@/hooks/useTopupListener';
import { useMaintenanceListener } from '@/hooks/useMaintenanceListener';
import { useMaintenanceStore } from '@/store/maintenanceStore';
import { TYPOGRAPHY } from '@/constants/Theme';

import CustomAlert from '@/components/CustomAlert';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const t = useThemeColors();
  const isDarkMode = useThemeStore(state => state.isDarkMode);

  useTopupListener();
  useMaintenanceListener();

  const maintenanceMode = useMaintenanceStore(s => s.enabled);
  const maintenanceMessage = useMaintenanceStore(s => s.message);

  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const ripple = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (maintenanceMode) {
      logoScale.setValue(0);
      logoOpacity.setValue(0);
      contentOpacity.setValue(0);
      ripple.setValue(0);

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
        Animated.timing(contentOpacity, {
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
        }),
      ).start();
    }
  }, [maintenanceMode]);

  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  const rippleScale = ripple.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] });
  const rippleOpacity = ripple.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] });

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: t.background }}>
      <StatusBar style={isDarkMode ? "light" : "dark"} translucent />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: t.background },
          animation: 'slide_from_right',
          animationDuration: 200,

        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <CustomAlert />
      {maintenanceMode && (
        <View style={[styles.maintenanceOverlay, { backgroundColor: t.background }]}>
          <Animated.View
            style={[
              styles.ripple,
              { borderColor: t.warning + '30' },
              { transform: [{ scale: rippleScale }], opacity: rippleOpacity },
            ]}
          />
          <LottieView
            source={require('../assets/animasi/20d7737c-118a-11ee-823e-077777312ecc.json')}
            style={styles.maintenanceLottie}
            autoPlay
            loop
          />
          <Animated.View
            style={[
              styles.logoTopLeft,
              { transform: [{ scale: logoScale }], opacity: logoOpacity },
            ]}
          >
            <Image
              source={require('../assets/logo-kang-massage.png')}
              style={styles.logoSmall}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.maintenanceCard,
              { backgroundColor: t.card, borderColor: t.border, opacity: contentOpacity },
            ]}
          >
            <Ionicons name="construct" size={48} color={t.warning} />
            <Text style={[styles.maintenanceTitle, { color: t.text }]}>Pemeliharaan Sistem</Text>
            <Text style={[styles.maintenanceMessage, { color: t.textSecondary }]}>{maintenanceMessage}</Text>
            <Text style={[styles.maintenanceNote, { color: t.textMuted }]}>Silakan coba lagi nanti. Terima kasih atas pengertiannya.</Text>
          </Animated.View>
        </View>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  maintenanceOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    zIndex: 9999,
  },
  ripple: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
  },
  maintenanceLottie: {
    width: 200,
    height: 200,
    marginBottom: 16,
  },
  logoTopLeft: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10000,
  },
  logoSmall: {
    width: 56,
    height: 56,
    resizeMode: 'contain',
  },
  maintenanceCard: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    width: '100%',
    maxWidth: 340,
  },
  logoImage: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
  },
  maintenanceTitle: {
    ...TYPOGRAPHY.h2,
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  maintenanceMessage: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
    marginBottom: 8,
  },
  maintenanceNote: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
  },
});
