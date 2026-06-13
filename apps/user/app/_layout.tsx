import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';

const PlusJakartaSans_400Regular = require('@expo-google-fonts/plus-jakarta-sans/400Regular/PlusJakartaSans_400Regular.ttf');
const PlusJakartaSans_500Medium = require('@expo-google-fonts/plus-jakarta-sans/500Medium/PlusJakartaSans_500Medium.ttf');
const PlusJakartaSans_600SemiBold = require('@expo-google-fonts/plus-jakarta-sans/600SemiBold/PlusJakartaSans_600SemiBold.ttf');
const PlusJakartaSans_700Bold = require('@expo-google-fonts/plus-jakarta-sans/700Bold/PlusJakartaSans_700Bold.ttf');
const PlusJakartaSans_800ExtraBold = require('@expo-google-fonts/plus-jakarta-sans/800ExtraBold/PlusJakartaSans_800ExtraBold.ttf');

import { Platform, View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';
import { AlertProvider } from '../context/AlertContext';

if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
    sound: 'default',
  });
}

const queryClient = new QueryClient();

SplashScreen.preventAutoHideAsync();

function NotificationInit() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const response = await Notifications.getLastNotificationResponseAsync();
        if (response?.notification?.request?.content?.data) {
          handleNotifNav(response.notification.request.content.data, router);
        }
      } catch (e) {
        console.warn('Failed to process cold-start notification', e);
      }
    })();

    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response?.notification?.request?.content?.data;
      if (data) {
        handleNotifNav(data, router);
      }
    });

    return () => subscription.remove();
  }, []);

  return null;
}

function handleNotifNav(data: any, router: ReturnType<typeof useRouter>) {
  const type = data?.type;
  if (type === 'chat_message') {
    const id = data?.conversation_id || data?.conversationId;
    if (id) router.push(`/chats/${id}`);
  } else if (type?.startsWith('order_')) {
    const id = data?.order_id || data?.orderId;
    if (id) router.push(`/order/${id}`);
  } else if (type?.startsWith('topup_')) {
    const id = data?.topup_id || data?.topupId;
    if (id) router.push(`/topup-detail?id=${id}`);
  } else if (type === 'support_chat') {
    router.push('/support');
  }
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    'PlusJakartaSans-Regular': PlusJakartaSans_400Regular,
    'PlusJakartaSans-Medium': PlusJakartaSans_500Medium,
    'PlusJakartaSans-SemiBold': PlusJakartaSans_600SemiBold,
    'PlusJakartaSans-Bold': PlusJakartaSans_700Bold,
    'PlusJakartaSans-ExtraBold': PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  if (!loaded && !error) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AlertProvider>
            <AuthProvider>
              <NotificationInit />
              <Stack screenOptions={{ 
                headerShown: false,
                animation: 'slide_from_right'
              }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(main)" />
                <Stack.Screen name="complete-profile" />
              </Stack>
              <StatusBar style="auto" />
            </AuthProvider>
          </AlertProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
