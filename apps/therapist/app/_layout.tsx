import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useThemeColors, useThemeStore } from '@/store/themeStore';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useEffect } from 'react';
import { useTopupListener } from '@/hooks/useTopupListener';

import CustomAlert from '@/components/CustomAlert';

export default function RootLayout() {
  const t = useThemeColors();
  const isDarkMode = useThemeStore(state => state.isDarkMode);

  // Activate Realtime Payment Listener
  useTopupListener();

  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (loaded || error) {
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

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
    </GestureHandlerRootView>
  );
}
