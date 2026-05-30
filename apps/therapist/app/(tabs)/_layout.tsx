import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS } from '@/constants/Theme';
import { useThemeColors } from '@/store/themeStore';
import { useTherapistStore } from '@/store/therapistStore';
import { useLocationTracker } from '@/hooks/useLocationTracker';
import { useOrderListener } from '@/hooks/useOrderListener';
import IncomingOrderModal from '@/components/IncomingOrderModal';
import { useAlert } from '@/components/CustomAlert';
import { useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';

let verifyChannel: any = null;
import { CustomAlertTrigger } from '@/store/alertStore';

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
  const insets = useSafeAreaInsets();
  const { profile, isOnline, fetchProfile, setIncomingOrder, welcomeMessage, setWelcomeMessage, subscribeToDeactivation, unsubscribeDeactivation } = useTherapistStore();
  const { showAlert, AlertComponent } = useAlert();

  useEffect(() => {
    if (welcomeMessage) {
      showAlert('success', 'Selamat Datang!', welcomeMessage, [
        { text: 'Siap!' },
      ]);
      setWelcomeMessage(null);
    }
  }, [welcomeMessage]);

  useEffect(() => {
    fetchProfile().then(() => {
      const p = useTherapistStore.getState().profile;
      if (!p?.id) return;

      subscribeToDeactivation(async () => {
        unsubscribeDeactivation();
        if (p?.id) {
          await supabase.from('therapists').update({ status: 'offline' }).eq('id', p.id);
        }
        await supabase.auth.signOut();
        CustomAlertTrigger.show({
          type: 'error',
          title: 'Akun Dinonaktifkan',
          message: 'Akun Anda telah dinonaktifkan oleh admin. Silakan hubungi admin untuk informasi lebih lanjut.',
          buttons: [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }],
        });
      });

      // Subscribe realtime untuk verifikasi / revisi
      verifyChannel = supabase
        .channel('therapist-verify')
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'therapists', filter: `id=eq.${p.id}` },
          (payload) => {
            const updated = payload.new as any;
            const old = payload.old as any;
            if (updated.is_verified === true && old?.is_verified === false) {
              CustomAlertTrigger.show({
                type: 'success',
                title: 'Akun Terverifikasi! 🎉',
                message: 'Selamat! Akun Anda telah diverifikasi oleh admin. Sekarang Anda dapat menerima pesanan.',
              });
            } else if (updated.revision_note && updated.revision_note !== old?.revision_note) {
              CustomAlertTrigger.show({
                type: 'warning',
                title: 'Perbaikan Data Diperlukan',
                message: 'Admin meminta perbaikan pada data pendaftaran Anda. Silakan periksa dan kirim ulang.',
                buttons: [{ text: 'Lihat', onPress: () => router.replace('/(auth)/register?continue=1') }],
              });
            }
          }
        )
        .subscribe();

    });
    
    // Handle notification tap that opened the app (cold start)
    (async () => {
      try {
        const response = await Notifications.getLastNotificationResponseAsync();
        if (response?.notification?.request?.content?.data?.orderData) {
          const raw = response.notification.request.content.data.orderData;
          const orderData = typeof raw === 'string' ? JSON.parse(raw) : raw;
          setIncomingOrder(orderData);
        }
      } catch (e) {
        console.warn('Failed to process cold-start notification', e);
      }
    })();

    // Listen for notification interactions (Foreground)
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const notification = response.notification;
      if (notification?.request?.content?.data?.orderData) {
        try {
          const orderData = typeof notification.request.content.data.orderData === 'string'
            ? JSON.parse(notification.request.content.data.orderData)
            : notification.request.content.data.orderData;
          setIncomingOrder(orderData);
        } catch (e) {
          console.warn('Failed to parse orderData from notification', e);
        }
      }
    });

    return () => {
      subscription.remove();
      unsubscribeDeactivation();
      if (verifyChannel) supabase.removeChannel(verifyChannel);
    };
  }, []);

  // Initialize global location tracking
  useLocationTracker(profile?.id ?? null, isOnline);
  
  // Initialize global order listener
  useOrderListener();

  return (
    <><Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar, 
          { 
            backgroundColor: t.surface, 
            borderTopColor: t.border,
            height: 55 + insets.bottom + 10,
            paddingBottom: insets.bottom + 10
          }
        ],
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
    {AlertComponent}
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
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
