import { Stack } from 'expo-router';
import { useThemeColors } from '../../store/themeStore';

export default function AuthLayout() {
  const t = useThemeColors();
  
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.background }, animation: 'fade' }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="otp" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
