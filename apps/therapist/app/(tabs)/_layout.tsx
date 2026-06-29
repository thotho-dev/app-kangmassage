import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS } from '@/constants/Theme';
import { useThemeColors } from '@/store/themeStore';
import { useTherapistStore } from '@/store/therapistStore';
import { useLocationTracker } from '@/hooks/useLocationTracker';
import { useOrderListener } from '@/hooks/useOrderListener';
import IncomingOrderModal from '@/components/IncomingOrderModal';
import { useAlert } from '@/components/CustomAlert';
import { useEffect, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import Constants from 'expo-constants';

let verifyChannel: any = null;
import { CustomAlertTrigger } from '@/store/alertStore';
import { useMaintenanceStore } from '@/store/maintenanceStore';

const isExpoGo = Constants.executionEnvironment === 'storeClient';

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

  const checkPendingOrders = useCallback(async (therapistId: string) => {
    const rejected = useTherapistStore.getState().rejectedOrderIds;
    const currentIncoming = useTherapistStore.getState().incomingOrder;

    const isRejected = (id: string) => rejected.includes(id);

    // Cek notifikasi yang masih tampil
    if (!isExpoGo) {
      try {
        const notifee = await import('@notifee/react-native');
        const displayed = await notifee.default.getDisplayedNotifications();
        for (const n of displayed) {
          if (n?.notification?.data?.orderData) {
            const raw = n.notification.data.orderData;
            const orderData = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (isRejected(orderData.id) || orderData.id === currentIncoming?.id) continue;
            setIncomingOrder(orderData);
            return;
          }
        }
      } catch {}
    }

    // Lewati query jika sudah ada incoming order (cegah reset timer)
    if (currentIncoming) return;

    const { data } = await supabase
      .from('orders')
      .select('*, users(full_name, avatar_url), services:service_id(name, duration_min, price_type)')
      .eq('status', 'pending')
      .or(`therapist_id.eq.${therapistId},therapist_id.is.null`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data && !isRejected(data.id)) {
      const current = useTherapistStore.getState().incomingOrder;
      if (data.id !== current?.id) {
        setIncomingOrder(data);
      }
    }
  }, []);

  const handleNotifNav = useCallback((type: string, data: any) => {
    if (type.startsWith('order_')) {
      const id = data?.order_id || data?.orderId;
      if (id) { router.push(`/orders/${id}`); }
    } else if (type.startsWith('topup_')) {
      const id = data?.topup_id || data?.topupId;
      if (id) { router.push(`/profile/topup-detail?id=${id}`); }
    } else if (type.startsWith('withdrawal_')) {
      const id = data?.withdrawal_id || data?.withdrawalId;
      if (id) { router.push(`/profile/withdraw-detail?id=${id}`); }
    } else if (type === 'support_chat' || type === 'chat') {
      router.push('/support/chat');
    } else if (type === 'chat_message') {
      const id = data?.conversation_id || data?.conversationId;
      if (id) { router.push(`/chats/${id}`); }
    } else if (type === 'account_verified' || type === 'revision_request' || type === 'profile_update') {
      router.push('/profile');
    }
  }, [router]);

  useEffect(() => {
    if (welcomeMessage) {
      showAlert('success', 'Selamat Datang!', welcomeMessage, [
        { text: 'Siap!' },
      ]);
      setWelcomeMessage(null);
    }
  }, [welcomeMessage]);

  useEffect(() => {
    fetchProfile().then(async () => {
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
      if (verifyChannel) {
        supabase.removeChannel(verifyChannel);
        verifyChannel = null;
      }
      verifyChannel = supabase
        .channel(`therapist-verify-${p.id}-${Date.now()}`)
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'therapists', filter: `id=eq.${p.id}` },
          (payload) => {
            const updated = payload.new as any;
            const old = payload.old as any;
            if (updated.is_verified === true && old?.is_verified === false) {
              supabase.from('app_settings').select('registration_payment_required, therapist_registration_fee').limit(1).single().then(({ data: settings }) => {
                if (settings?.registration_payment_required && Number(settings.therapist_registration_fee) > 0 && !updated.registration_fee_paid) {
                  router.replace('/(main)/registration-payment');
                  return;
                }
                CustomAlertTrigger.show({
                  type: 'success',
                  title: 'Akun Terverifikasi! 🎉',
                  message: 'Selamat! Akun Anda telah diverifikasi oleh admin. Sekarang Anda dapat menerima pesanan.',
                });
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
    setTimeout(async () => {
      try {
        let notifData: any = null;
        if (!isExpoGo) {
          const notifee = await import('@notifee/react-native').catch(() => null);
          if (notifee) {
            const initial = await notifee.default.getInitialNotification();
            if (initial?.notification?.data) notifData = initial.notification.data;
          }
        }
        if (!notifData) {
          const response = await Notifications.getLastNotificationResponseAsync();
          if (response?.notification?.request?.content?.data) {
            notifData = response.notification.request.content.data;
          }
        }
        if (notifData) {
          if (notifData.orderData) {
            const raw = notifData.orderData;
            const orderData = typeof raw === 'string' ? JSON.parse(raw) : raw;
            const rejected = useTherapistStore.getState().rejectedOrderIds;
            const current = useTherapistStore.getState().incomingOrder;
            if (!rejected.includes(orderData.id) && orderData.id !== current?.id) {
              setIncomingOrder(orderData);
            }
          } else if (notifData.type) {
            handleNotifNav(notifData.type, notifData);
          }
        }
      } catch (e) {
        console.warn('Failed to process cold-start notification', e);
      }

      // Check for pending navigation from background notification tap
      const pendingId = (global as any)._pendingOrderNavId;
      if (pendingId) {
        (global as any)._pendingOrderNavId = null;
        router.push(`/orders/${pendingId}`);
      }
    }, 400);

    // Listen for notification interactions (Foreground)
    let notifeeUnsub: (() => void) | null = null;
    if (!isExpoGo) {
      import('@notifee/react-native').then(notifee => {
        if (notifee) {
          notifeeUnsub = notifee.default.onForegroundEvent(({ type, detail }: any) => {
            const notifData = detail?.notification?.data;

            if (type === 1 && notifData) {
              // DELIVERED — nav for non-order notifications (Realtime handles orders)
              if (notifData.type) {
                handleNotifNav(notifData.type, notifData);
              }
            } else if (type === 2 && detail?.pressAction?.id && notifData?.orderData) {
              // ACTION_PRESS — user tap notification
              const raw = notifData.orderData;
              const orderData = typeof raw === 'string' ? JSON.parse(raw) : raw;

              if (detail.pressAction.id === 'default') {
                // Tap default → navigate to order page
                if (orderData?.id) {
                  router.push(`/orders/${orderData.id}`);
                }
                if (detail.notification?.id) {
                  notifee.default.cancelNotification(detail.notification.id);
                }
                return;
              }

              // Legacy: masih ada action accept/reject dari notif lama
              const actionId = detail.pressAction.id;

              import('@/lib/notifee').then(({ processOrderAction, showActionResultNotif }) => {
                processOrderAction(actionId, orderData).then(result => {
                  if (actionId === 'accept' && (result === 'success' || result === 'taken' || result === 'gone')) {
                    showActionResultNotif(orderData, result);
                    if (result === 'success' && orderData?.id) {
                      router.push(`/orders/${orderData.id}`);
                    }
                  }
                });
              });

              if (detail.notification?.id) {
                notifee.default.cancelNotification(detail.notification.id);
              }
            }
          });
        }
      }).catch(() => {});
    }

    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const notification = response.notification;
      if (notification?.request?.content?.data) {
        const data = notification.request.content.data;
        try {
          if (data.type) {
            handleNotifNav(data.type, data);
          }
        } catch (e) {
          console.warn('Failed to parse notification', e);
        }
      }
    });

    // Detect app returning to foreground → check missed orders (debounced)
    let appStateTimer: ReturnType<typeof setTimeout> | null = null;
    const appStateSub = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'active') {
        if (appStateTimer) clearTimeout(appStateTimer);
        appStateTimer = setTimeout(async () => {
          const p = useTherapistStore.getState().profile;
          if (!p?.id) return;
          if (useMaintenanceStore.getState().enabled) {
            console.log('[AppState] Maintenance mode active — skip pending order check');
            return;
          }
          await checkPendingOrders(p.id);

          // Navigate to order page if triggered by background notification tap
          const pendingId = (global as any)._pendingOrderNavId;
          if (pendingId) {
            (global as any)._pendingOrderNavId = null;
            router.push(`/orders/${pendingId}`);
          }
        }, 800);
      }
    });

    return () => {
      subscription.remove();
      if (notifeeUnsub) notifeeUnsub();
      appStateSub.remove();
      if (appStateTimer) clearTimeout(appStateTimer);
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
