import { Stack } from 'expo-router';
import { useThemeColors } from '@/store/themeStore';

export default function MainLayout() {
  const t = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: t.background },
        animation: 'slide_from_right',
        animationDuration: 200,
      }}
    >
      <Stack.Screen name="notifications/settings" />
      <Stack.Screen name="orders/[id]" />
      <Stack.Screen name="chats/[id]" />
      <Stack.Screen name="profile/topup" />
      <Stack.Screen name="profile/change-password" />
      <Stack.Screen name="profile/change-phone" />
      <Stack.Screen name="profile/address" />
      <Stack.Screen name="profile/payment" />
      <Stack.Screen name="profile/withdraw" />
      <Stack.Screen name="profile/withdraw-history" />
      <Stack.Screen name="support/help" />
      <Stack.Screen name="support/faq" />
      <Stack.Screen name="support/privacy" />
      <Stack.Screen name="support/terms" />
      <Stack.Screen name="support/about" />
    </Stack>
  );
}
