import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { LocationProvider } from '@/context/LocationContext';
import { useAuth } from '@/context/AuthContext';
import { useAlert } from '@/context/AlertContext';

export default function MainLayout() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const { showAlert } = useAlert();
  // Confirm before exit on tab screens (prevent going back to auth)
  useEffect(() => {
    if (!isAuthenticated || loading) return;

    const onBackPress = () => {
      if (!segments.includes('(tabs)')) return false;

      showAlert(
        'Konfirmasi',
        'Yakin ingin keluar dari aplikasi?',
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Keluar', style: 'destructive', onPress: () => BackHandler.exitApp() },
        ],
        'horizontal',
      );

      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [isAuthenticated, loading, segments]);

  return (
    <LocationProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="services" />
        <Stack.Screen name="vouchers" />
        <Stack.Screen name="voucher-detail/[id]" />
        <Stack.Screen name="order" />
        <Stack.Screen name="searching-therapist" />
        <Stack.Screen name="tracking" />
        <Stack.Screen name="maps" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="wallet" />
        <Stack.Screen name="topup" />
        <Stack.Screen name="topup-payment" />
        <Stack.Screen name="withdraw" />
        <Stack.Screen name="payment-details" />
      </Stack>
    </LocationProvider>
  );
}
