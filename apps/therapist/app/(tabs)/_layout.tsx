import notifee, { EventType } from '../../lib/notifee';
import { useRouter } from 'expo-router';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS } from '../../constants/Theme';
import { useThemeColors } from '../../store/themeStore';
import { useTherapistStore } from '../../store/therapistStore';
import { useLocationTracker } from '../../hooks/useLocationTracker';
import { useOrderListener } from '../../hooks/useOrderListener';
import IncomingOrderModal from '../../components/IncomingOrderModal';
import { useEffect } from 'react';

function TabIcon({ name, label, focused, color, activeBg }: { name: string; label?: string; focused: boolean, color: string, activeBg: string }) {
  return (
    <View style={[styles.iconWrap, focused && { backgroundColor: activeBg }]}>
      <Ionicons
        name={name as any}
        size={20}
        color={color}
      />
      {label && focused && (
        <Text style={[styles.tabBarLabel, { color }]}>{label}</Text>
      )}
    </View>
  );
}

export default function TabLayout() {
  const t = useThemeColors();
  const router = useRouter();
  const { profile, isOnline, fetchProfile, setIncomingOrder } = useTherapistStore();

  useEffect(() => {
    fetchProfile();
    
    // Listen for notification interactions (Foreground)
    let unsubscribe = () => {};
    try {
      unsubscribe = notifee.onForegroundEvent(({ type, detail }: any) => {
        const { notification, pressAction } = detail;

        if (type === EventType.ACTION_PRESS) {
          if (pressAction?.id === 'ACCEPT') {
            if (notification?.data?.orderData) {
              const orderData = JSON.parse(notification.data.orderData as string);
              setIncomingOrder(orderData);
            }
          } else if (pressAction?.id === 'REJECT') {
            setIncomingOrder(null);
          }
        } else if (type === EventType.PRESS) {
          // User tapped the notification body
          if (notification?.data?.orderData) {
            const orderData = JSON.parse(notification.data.orderData as string);
            setIncomingOrder(orderData);
          }
        }
      });
    } catch (e) {
      console.warn('Notifee foreground listener could not be registered');
    }

    return () => unsubscribe();
  }, []);

  // Initialize global location tracking
  useLocationTracker(profile?.id ?? null, isOnline);
  
  // Initialize global order listener
  useOrderListener();

  return (
    <>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.tabBar, { backgroundColor: t.surface, borderTopColor: t.border }],
        tabBarShowLabel: false, // Hidden because we render it inside TabIcon
        tabBarActiveTintColor: t.secondary,
        tabBarInactiveTintColor: t.textMuted,
       
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'grid' : 'grid-outline'} label="Home" focused={focused} color={focused ? t.secondary : t.textMuted} activeBg={t.secondary + '15'} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'bag' : 'bag-outline'} label="Pesanan" focused={focused} color={focused ? t.secondary : t.textMuted} activeBg={t.secondary + '15'} />,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={[styles.centerBtn, { backgroundColor: t.secondary, shadowColor: t.secondary }]}>
              <Ionicons name="cash" size={26} color="#FFFFFF" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'chatbubbles' : 'chatbubbles-outline'} label="Chat" focused={focused} color={focused ? t.secondary : t.textMuted} activeBg={t.secondary + '15'} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'person' : 'person-outline'} label="Profil" focused={focused} color={focused ? t.secondary : t.textMuted} activeBg={t.secondary + '15'} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
        }}
      />
    </Tabs>
    <IncomingOrderModal />
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 96 : 76,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    paddingTop: 8,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  tabBarLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    marginTop: 2,
  },
  iconWrap: {
    width: 65,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    paddingTop: 2,
    marginTop: 15,
  },
  centerBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
