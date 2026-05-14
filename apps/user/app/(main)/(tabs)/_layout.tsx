import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Home, Clock, MessageCircle, User } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';

const PURPLE = '#5B2A86';
const PURPLE_SOFT = '#F3E8FF';
const INACTIVE_ICON = '#9CA3AF';
const BAR_BG = '#FFFFFF';

const TAB_META: Record<string, { label: string; Icon: any }> = {
  home:    { label: 'Home',    Icon: Home },
  history: { label: 'Riwayat', Icon: Clock },
  chat:    { label: 'Chat',    Icon: MessageCircle },
  profile: { label: 'Profil',  Icon: User },
};

// ─── Animated Tab Item ─────────────────────────────────────────────────────────
function AnimatedTabItem({
  focused,
  label,
  Icon,
  onPress,
}: {
  focused: boolean;
  label: string;
  Icon: any;
  onPress: () => void;
}) {
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(focused ? 1 : 0, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [focused]);

  // Background layer — opacity only, completely invisible at 0
  const bgStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  // Content wrapper — padding expands when active
  const contentStyle = useAnimatedStyle(() => ({
    paddingHorizontal: interpolate(progress.value, [0, 1], [0, 12]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.95, 1]) }],
  }));

  // Label slide-in
  const labelStyle = useAnimatedStyle(() => ({
    width: interpolate(progress.value, [0, 1], [0, 46]),
    opacity: progress.value,
    marginLeft: interpolate(progress.value, [0, 1], [0, 4]),
  }));

  return (
    <Pressable
      onPress={onPress}
      style={styles.tabItem}
      android_ripple={{ color: 'transparent' }}
    >
      <Animated.View style={[styles.pill, contentStyle]}>
        <Animated.View style={[styles.pillBg, bgStyle]} />
        <Icon
          size={22}
          color={focused ? PURPLE : INACTIVE_ICON}
          strokeWidth={focused ? 2.5 : 1.8}
        />
        <Animated.View style={[styles.labelWrap, labelStyle]}>
          <Text style={styles.activeLabel} numberOfLines={1}>
            {label}
          </Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

// ─── Custom Tab Bar ────────────────────────────────────────────────────────────
function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  // Filter only valid tab routes
  const visibleRoutes = state.routes.filter((r) => TAB_META[r.name]);

  return (
    <View pointerEvents="box-none" style={styles.barContainer}>
      <View style={styles.bar}>
        {visibleRoutes.map((route) => {
          const meta = TAB_META[route.name];
          const realIndex = state.routes.findIndex((r) => r.key === route.key);
          const focused = state.index === realIndex;

          const onPress = () => {
            // Guard: Allow only Home for non-authenticated users
            if (route.name !== 'home' && !isAuthenticated) {
              router.push('/(auth)/login');
              return;
            }

            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name as never);
            }
          };

          return (
            <AnimatedTabItem
              key={route.key}
              focused={focused}
              label={meta.label}
              Icon={meta.Icon}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
}

// ─── Tabs Layout ───────────────────────────────────────────────────────────────
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        animation: 'shift',
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  barContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Platform.OS === 'ios' ? 26 : 16,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: BAR_BG,
    borderRadius: 36,
    paddingVertical: 8,
    paddingHorizontal: 17,
    width: '100%',
    maxWidth: 480,
    // Shadow
    shadowColor: '#1A1A2E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 18,
    elevation: 14,
    // Subtle border
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 24,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  pillBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: PURPLE_SOFT,
    borderRadius: 24,
  },
  labelWrap: {
    overflow: 'hidden',
    justifyContent: 'center',
  },
  activeLabel: {
    color: PURPLE,
    fontFamily: 'Inter-Bold',
    fontSize: 12,
    letterSpacing: 0.2,
  },
});
