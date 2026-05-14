import React from 'react';
import { Stack } from 'expo-router';
import { LocationProvider } from '@/context/LocationContext';

export default function MainLayout() {
  return (
    <LocationProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        {/* Main Tab Navigation */}
        <Stack.Screen name="(tabs)" />

        {/* Process Screens */}
        <Stack.Screen name="services" />
        <Stack.Screen name="vouchers" />
        <Stack.Screen name="voucher-detail/[id]" />
        <Stack.Screen name="order" />
        <Stack.Screen name="searching-therapist" />
        <Stack.Screen name="tracking" />
        <Stack.Screen name="maps" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="wallet" />
        <Stack.Screen name="payment-details" />
      </Stack>
    </LocationProvider>
  );
}
