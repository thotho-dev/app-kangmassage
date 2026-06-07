import * as Notifications from 'expo-notifications';
import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import Constants from 'expo-constants';
import { useTherapistStore } from '@/store/therapistStore';
import { supabase } from '@/lib/supabase';
import { API_URL } from '@/lib/config';

const isExpoGo = Constants.executionEnvironment === 'storeClient';

// ── Helper: cancel all displayed order notifications ──
const cancelOrderNotifications = async () => {
  if (isExpoGo) return;
  try {
    const notifee = await import('@notifee/react-native');
    const displayed = await notifee.default.getDisplayedNotifications();
    for (const n of displayed) {
      if (n?.notification?.data?.orderData) {
        await notifee.default.cancelNotification(n.notification.id!);
      }
    }
  } catch {}
};

// ── Helper: process accept in background ──
const handleAcceptAction = async (orderData: any, therapistId: string) => {
  try {
    const res = await fetch(`${API_URL}/api/orders/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: orderData.id, therapistId }),
    });

    const json = await res.json();

    if (!res.ok || !json.data) {
      // Order already taken or cancelled
      await cancelOrderNotifications();
      const notifee = await import('@notifee/react-native');
      await notifee.default.displayNotification({
        title: 'Pesanan Sudah Diambil',
        body: 'Maaf, pesanan ini sudah diterima oleh terapis lain atau dibatalkan.',
        android: {
          channelId: 'default',
          pressAction: { id: 'default' },
        },
        data: { type: 'alert' },
      });
      return false;
    }

    // Success — cancel all order notifs
    await cancelOrderNotifications();

    // Show accepted notification that opens order page on tap
    const notifee = await import('@notifee/react-native');
    await notifee.default.displayNotification({
      title: 'Pesanan Diterima!',
      body: 'Pesanan berhasil diterima. Ketuk untuk melihat detail.',
      android: {
        channelId: 'default',
        pressAction: { id: 'default' },
      },
      data: {
        type: 'order_accepted',
        order_id: orderData.id,
      },
    });

    return true;
  } catch (e) {
    console.error('[Notif] Background accept error:', e);
    return false;
  }
};

// ── Helper: process reject in background ──
const handleRejectAction = async (orderData: any) => {
  // If targeted (has therapist_id), cancel in DB
  if (orderData.therapist_id) {
    try {
      await supabase
        .from('orders')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', orderData.id)
        .eq('status', 'pending');

      await supabase.from('order_logs').insert({
        order_id: orderData.id,
        status: 'cancelled',
        note: 'Ditolak oleh terapis via notifikasi',
      });
    } catch {}
  }

  await cancelOrderNotifications();
};

// ── Notifee background event handler (module-level, build only) ──
if (!isExpoGo) {
  import('@notifee/react-native').then(notifee => {
    if (notifee?.default?.onBackgroundEvent) {
      notifee.default.onBackgroundEvent(async ({ type, detail }: any) => {
        // ACTION_PRESS (type = 2)
        if (type === 2 && detail?.pressAction?.id && detail?.notification?.data?.orderData) {
          const actionId = detail.pressAction.id;
          const raw = detail.notification.data.orderData;
          const orderData = typeof raw === 'string' ? JSON.parse(raw) : raw;
          const therapistId = detail.notification.data.therapistId;

          if (actionId === 'accept' && therapistId) {
            await handleAcceptAction(orderData, therapistId);
          } else if (actionId === 'reject') {
            await handleRejectAction(orderData);
          }
          return;
        }

        // DELIVERED (type = 1) — do nothing, notification with actions is the UI
      });
    }
  }).catch(() => {});
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const NOTIFICATION_CHANNELS = {
  ORDERS: 'orders_high_priority',
};

const getNotifee = async () => {
  try {
    return await import('@notifee/react-native');
  } catch {
    return null;
  }
};

export const initializeNotifee = async () => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.warn('Gagal mendapatkan izin notifikasi!');
      return;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      });
      await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.ORDERS, {
        name: 'Pesanan Baru',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'sound_expo',
      });

      if (!isExpoGo) {
        const notifee = await getNotifee();
        if (notifee) {
          await notifee.default.createChannel({
            id: NOTIFICATION_CHANNELS.ORDERS,
            name: 'Pesanan Baru',
            importance: notifee.AndroidImportance.HIGH,
            sound: 'sound_notifee',
            lights: true,
            vibration: true,
            vibrationPattern: [500, 500],
            bypassDnd: true,
          });
        }
      }

      // Minta izin full screen intent
      try {
        const granted = await PermissionsAndroid.request(
          'android.permission.USE_FULL_SCREEN_INTENT' as any,
          {
            title: 'Izin Notifikasi Prioritas',
            message: 'Izinkan Kang Massage menampilkan notifikasi prioritas tinggi untuk pesanan baru.',
            buttonPositive: 'Izinkan',
            buttonNegative: 'Tolak',
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('[Notif] USE_FULL_SCREEN_INTENT granted');
        }
      } catch {}

      // Panduan untuk Chinese ROM (MIUI/Oppo/Realme/Vivo)
      try {
        const manufacturer = (Platform.constants as any)?.Manufacturer?.toLowerCase() || '';
        const isChineseRom = ['xiaomi', 'oppo', 'realme', 'vivo', 'oneplus'].some(m => manufacturer.includes(m));
        if (isChineseRom) {
          const batGranted = await PermissionsAndroid.request(
            'android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS' as any,
          );
          if (batGranted !== PermissionsAndroid.RESULTS.GRANTED) {
            const brand = (Platform.constants as any)?.Manufacturer || 'HP ini';
            setTimeout(() => {
              Alert.alert(
                '🔔 Atur Notifikasi',
                `Agar notifikasi pesanan baru tidak terblokir di ${brand}, aktifkan:\n\n` +
                `1. 📌 Auto-start — izinkan app berjalan di latar\n` +
                `2. 🔋 Optimasi Baterai — pilih "Tidak Dioptimasi"\n` +
                `3. 🪟 Izin Pop-up — aktifkan tampilan mengambang\n\n` +
                `Buka Pengaturan → Aplikasi → Kang Massage Therapist`,
                [
                  { text: 'Tutup', style: 'cancel' },
                  { text: 'Buka Pengaturan', onPress: () => Linking.openSettings() },
                ]
              );
            }, 1000);
          }
        }
      } catch {}
    }
  } catch (e) {
    console.error('Expo Notifications Init Error:', e);
  }
};

export const displayOrderNotification = async (order: any, therapistId?: string) => {
  const userName = order.users?.full_name || 'Pelanggan';
  const serviceName = order.services?.name || 'Layanan Pijat';
  const dur = order.duration || order.services?.duration_min || 60;
  const isTreatment = order.services?.price_type === 'treatment';
  const price = order.service_price || order.total_price || 0;
  const address = order.address || 'Alamat tidak tersedia';
  const isScheduled = !!order.scheduled_at;

  const lines: string[] = [];
  lines.push(`👤 Pelanggan: ${userName}`);
  if (isTreatment) {
    lines.push(`💆 ${serviceName} ✦ Treatment`);
  } else {
    lines.push(`💆 ${serviceName} ✦ ${dur} Menit`);
  }
  lines.push(`📍 ${address}`);
  lines.push(`💰 Rp ${price.toLocaleString('id-ID')}`);

  if (isScheduled) {
    const d = new Date(order.scheduled_at);
    const time = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const date = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    lines.push(`📅 ${time} · ${date}`);
  }

  const bodyText = lines.join('\n');

  try {
    if (!isExpoGo) {
      const notifee = await getNotifee();
      if (notifee) {
        await notifee.default.displayNotification({
          title: 'Pesanan Baru Masuk!',
          body: `${userName} — ${serviceName}`,
          android: {
            channelId: NOTIFICATION_CHANNELS.ORDERS,
            pressAction: { id: 'default' },
            sound: 'sound_notifee',
            loopSound: true,
            ongoing: true,
            autoCancel: true,
            lights: ['#F97316', 500, 500],
            vibrationPattern: [500, 500],
            smallIcon: 'ic_notification',
            color: '#F97316',
            asForegroundService: false,
            category: 'call',
            visibility: notifee.AndroidVisibility.PUBLIC,
            localOnly: false,
            actions: [
              {
                title: 'Terima',
                pressAction: { id: 'accept' },
              },
              {
                title: 'Tolak',
                pressAction: { id: 'reject' },
              },
            ],
            style: {
              type: notifee.AndroidStyle.BIGTEXT,
              text: bodyText,
            },
          },
          ios: {
            categoryIdentifier: 'call',
            sound: 'sound_notifee',
            foregroundPresentationOptions: {
              alert: true,
              badge: true,
              sound: true,
              banner: true,
              list: true,
            },
            critical: true,
            criticalVolume: 1.0,
          },
          data: {
            orderId: order.id,
            orderData: JSON.stringify(order),
            therapistId,
          },
        });
        console.log('[Notif] Notifee notification sent with actions');
        return;
      }
    }

    // Fallback: Expo notification (no action buttons supported)
    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Pesanan Baru Masuk!',
        body: bodyText,
        data: {
          orderId: order.id,
          orderData: JSON.stringify(order),
          therapistId,
        },
        sound: 'sound_expo',
        ...(Platform.OS === 'ios' && {
          categoryIdentifier: 'call',
          interruptionLevel: 'critical',
          shouldPlaySound: true,
        }),
      },
      trigger: null,
    });
    console.log(`[Notif] Expo notification sent: ${notifId}`);
  } catch (e) {
    console.error('[Notif] Gagal menampilkan notifikasi:', e);
  }
};
