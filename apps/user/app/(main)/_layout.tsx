import { Tabs } from 'expo-router';
import { Home, ClipboardList, Wallet, User } from 'lucide-react-native';
import { COLORS } from '../../constants/Theme';

export default function MainLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(2, 6, 23, 0.98)',
          borderTopColor: 'rgba(255, 255, 255, 0.08)',
          height: 90,
          paddingTop: 12,
          position: 'absolute',
          borderTopWidth: 1.5,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -10 },
          shadowOpacity: 0.2,
          shadowRadius: 15,
        },
        tabBarActiveTintColor: COLORS.gold[500],
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.25)',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '800',
          marginBottom: 14,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home size={22} color={color} strokeWidth={2.5} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <ClipboardList size={22} color={color} strokeWidth={2.5} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color }) => <Wallet size={22} color={color} strokeWidth={2.5} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User size={22} color={color} strokeWidth={2.5} />,
        }}
      />
      {/* Hide non-tab screens from the tab bar */}
      <Tabs.Screen name="order" options={{ href: null }} />
      <Tabs.Screen name="tracking" options={{ href: null }} />
    </Tabs>
  );
}
