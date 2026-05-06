import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useThemeColors, useThemeStore } from '../store/themeStore';
import notifee, { EventType } from '../lib/notifee';
import { supabase } from '../lib/supabase';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useTopupListener } from '../hooks/useTopupListener';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Register background event handler
try {
  notifee.onBackgroundEvent(async ({ type, detail }: any) => {
    const { notification, pressAction } = detail;

    if (type === EventType.ACTION_PRESS) {
      if (pressAction?.id === 'ACCEPT' && notification?.data?.orderId) {
        console.log('User accepted order in background:', notification.data.orderId);
        
        try {
          // We try to get the current user session
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Find therapist profile
            const { data: therapist } = await supabase
              .from('therapists')
              .select('id')
              .eq('supabase_uid', user.id)
              .single();

            if (therapist) {
              await supabase
                .from('orders')
                .update({ 
                  status: 'accepted', 
                  therapist_id: therapist.id,
                  updated_at: new Date().toISOString()
                })
                .eq('id', notification.data.orderId);
            }
          }
        } catch (err) {
          console.error('Error accepting order in background:', err);
        }
      }
      
      // Remove the notification
      if (notification?.id) {
        await notifee.cancelNotification(notification.id);
      }
    }
  });
} catch (e) {
  console.warn('Notifee background handler could not be registered (likely Expo Go)');
}

SplashScreen.preventAutoHideAsync();

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
      SplashScreen.hideAsync();
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

        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="notifications/settings" />
        <Stack.Screen name="orders/[id]" />
        <Stack.Screen name="profile/topup" />
        <Stack.Screen name="profile/change-password" />
        <Stack.Screen name="profile/change-phone" />
        <Stack.Screen name="profile/address" />
        <Stack.Screen name="profile/payment" />
        <Stack.Screen name="support/help" />
        <Stack.Screen name="support/faq" />
        <Stack.Screen name="support/privacy" />
        <Stack.Screen name="support/terms" />
        <Stack.Screen name="support/about" />
      </Stack>
    </GestureHandlerRootView>
  );
}
