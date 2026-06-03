import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { LocationProvider } from '@/context/LocationContext';
import { useAuth } from '@/context/AuthContext';

export default function MainLayout() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const lastSegment = segments[segments.length - 1];
    const isAllowedGuestRoute =
      !lastSegment ||
      lastSegment === '(main)' ||
      lastSegment === '(tabs)' ||
      lastSegment === 'home';

    if (!isAuthenticated && !isAllowedGuestRoute) {
      router.replace('/login');
    }
  }, [isAuthenticated, loading, segments, router]);

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
