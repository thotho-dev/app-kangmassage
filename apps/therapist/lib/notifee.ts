import * as Notifications from 'expo-notifications';
import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import Constants from 'expo-constants';
import { useTherapistStore } from '@/store/therapistStore';
import { supabase } from '@/lib/supabase';
import { API_URL } from '@/lib/config';
import { titleCase } from '@/lib/utils';

const isExpoGo = Constants.executionEnvironment === 'storeClient';

// ── Guard: prompt hanya sekali per sesi ──
let _fullScreenPrompted = false;
let _batteryPrompted = false;

// ── Dedup guard: skip duplicate order notifications within 60s ──
const recentOrderIds = new Set<string>();

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

// ── Accept/reject logic shared by foreground handler ──
export async function processOrderAction(actionId: string, orderData: any): Promise<string> {
  const profile = useTherapistStore.getState().profile;
  if (!profile?.id) return 'error';

  if (actionId === 'accept') {
    const { data, error } = await supabase
      .from('orders')
      .update({
        status: 'accepted',
        therapist_id: profile.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderData.id)
      .eq('status', 'pending')
      .or(`therapist_id.is.null,therapist_id.eq.${profile.id}`)
      .select();

    if (error) return 'error';
    if (!data || data.length === 0) {
      const { data: check } = await supabase
        .from('orders')
        .select('status, therapist_id')
        .eq('id', orderData.id)
        .single();
      return check?.status === 'accepted' && check?.therapist_id !== profile.id ? 'taken' : 'gone';
    }

    const name = titleCase(profile?.full_name) || 'Kang Massage';
    fetch(`${API_URL}/api/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: orderData.user_id,
        title: 'Pesanan Diterima',
        body: `Terapis ${name} telah menerima pesanan Anda dan akan segera menuju lokasi.`,
        type: 'order_accepted',
        data: { order_id: orderData.id },
      }),
    }).catch(() => {});

    useTherapistStore.getState().setIncomingOrder(null);
    return 'success';
  }

  if (actionId === 'reject') {
    if (orderData.therapist_id) {
      await supabase
        .from('orders')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', orderData.id)
        .eq('status', 'pending');

      await supabase.from('order_logs').insert({
        order_id: orderData.id,
        status: 'cancelled',
        note: 'Ditolak oleh terapis (dari notifikasi)',
      });
    }

    useTherapistStore.getState().addRejectedOrderId(orderData.id);
    useTherapistStore.getState().setIncomingOrder(null);
    return 'rejected';
  }

  return 'error';
}

// ── Show a brief follow-up notification after action ──
export async function showActionResultNotif(orderData: any, result: string) {
  if (result === 'success') {
    const n = await getNotifee();
    if (!n) return;
    try { await n.default.displayNotification({
      title: '✅ Pesanan Diterima',
      body: `Pesanan ${orderData.services?.name || ''} telah diterima.`,
      android: { channelId: NOTIFICATION_CHANNELS.ORDERS, pressAction: { id: 'default' } },
      data: { type: 'order_accepted', order_id: orderData.id },
    }); } catch {}
  } else if (result === 'taken') {
    const n = await getNotifee();
    if (!n) return;
    try { await n.default.displayNotification({
      title: '⚠️ Pesanan Diambil Terapis Lain',
      body: 'Pesanan ini sudah diterima oleh terapis lain.',
      android: { channelId: NOTIFICATION_CHANNELS.ORDERS, pressAction: { id: 'default' } },
    }); } catch {}
  } else if (result === 'gone') {
    const n = await getNotifee();
    if (!n) return;
    try { await n.default.displayNotification({
      title: '❌ Pesanan Tidak Tersedia',
      body: 'Pesanan sudah tidak tersedia.',
      android: { channelId: NOTIFICATION_CHANNELS.ORDERS, pressAction: { id: 'default' } },
    }); } catch {}
  }
}

// ── CATATAN: onBackgroundEvent sudah DIPINDAH ke index.js (entry point) ──
// Notifee mengharuskan background handler didaftarkan di file entry SEBELUM
// app boot, bukan di dalam module/komponen manapun.

// ── Intercept incoming push notifications for order data ──
// Ini menangani FCM push saat app foreground — menampilkan Notifee local notif
// dengan tombol Terima/Tolak di atas push yang datang.
export const NOTIFICATION_CHANNELS = {
  ORDERS: 'orders_high_priority',
  FOREGROUND: 'foreground_service',
};

// ── Expo handler ──
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const getNotifee = async () => {
  try {
    return await import('@notifee/react-native');
  } catch {
    return null;
  }
};

export const initializeNotifee = async () => {
  try {
    // ── Intercept incoming push notifications for order data ──
    if (!isExpoGo) {
      if ((global as any)._notificationSub) {
        (global as any)._notificationSub.remove();
      }
      
      (global as any)._notificationSub = Notifications.addNotificationReceivedListener(notification => {
        const data = notification?.request?.content?.data;
        if (data?.orderData) {
          try {
            const raw = data.orderData;
            const orderData = typeof raw === 'string' ? JSON.parse(raw) : raw;
            const profile = useTherapistStore.getState().profile;
            if (!profile?.id) return;
            const rejected = useTherapistStore.getState().rejectedOrderIds;
            if (rejected.includes(orderData.id)) return;
            // Set incoming order dulu biar modal effect cleanup tidak cancel
            // notifikasi yang baru ditampilkan.
            useTherapistStore.getState().setIncomingOrder(orderData);
            displayOrderNotification(orderData, profile.id);
          } catch (e) {
            console.warn('[Notif] Failed to process received notification:', e);
          }
        }
      });
    }

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
        sound: 'sound_notifee',
      });

      if (!isExpoGo) {
        const notifee = await getNotifee();
        if (notifee) {
          // Channel untuk pesanan (HIGH priority = heads-up + fullscreen)
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

          // Channel untuk foreground service (LOW priority = persistent, tidak mengganggu)
          await notifee.default.createChannel({
            id: NOTIFICATION_CHANNELS.FOREGROUND,
            name: 'Status Terapis',
            importance: notifee.AndroidImportance.LOW,
            lights: false,
            vibration: false,
          });

          // Minta izin full screen intent (Android 12+) — sekali saja per sesi
          if (!_fullScreenPrompted) {
            _fullScreenPrompted = true;
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
              } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
                Alert.alert(
                  'Aktifkan Tampilan Penuh',
                  'Agar notifikasi pesanan baru muncul di layar kunci:\n\n' +
                  'Pengaturan -> Aplikasi -> Kang Massage Mitra -> Notifikasi -> berjalan diatas aplikasi lain -> Izinkan',
                  [
                    { text: 'Tutup', style: 'cancel' },
                    { text: 'Buka Pengaturan', onPress: () => Linking.openSettings() },
                  ]
                );
              }
            } catch (e) {
              console.warn('[Notif] USE_FULL_SCREEN_INTENT request error:', e);
            }
          }
        }
      }

      // Panduan untuk Chinese ROM (MIUI/Oppo/Realme/Vivo) — sekali saja
      if (!_batteryPrompted) {
        _batteryPrompted = true;
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
        } catch (e) {
          console.warn('[Notif] Battery opt prompt error:', e);
        }
      }
    }
  } catch (e) {
    console.error('Expo Notifications Init Error:', e);
  }
};

// ── Guard untuk cegah FG service start/stop ganda ──
let _fgStarting = false;
let _fgActive = false;

// ── Start Foreground Service (saat terapis online) ───────────────────────────
// Menampilkan notifikasi persistent "Menunggu pesanan..." di status bar,
// sekaligus menjaga proses Android tetap hidup seperti Gojek/Grab driver.
export const startOrderForegroundService = async () => {
  if (isExpoGo) return;
  if (_fgActive || _fgStarting) {
    console.log('[FGService] Already active or starting, skipping');
    return;
  }
  _fgStarting = true;

  const notifee = await getNotifee();
  if (!notifee) { _fgStarting = false; return; }

  try {
    await notifee.default.displayNotification({
      id: 'therapist-online-service',
      title: 'Ready to Order',
      body: '🟢 Standby, Menunggu Pesanan Baru!',
      android: {
        channelId: NOTIFICATION_CHANNELS.FOREGROUND,
        asForegroundService: true,
        ongoing: true,
        onlyAlertOnce: true,
        color: '#1E1B4B',
        smallIcon: 'ic_launcher',
        pressAction: { id: 'default' },
        importance: notifee.AndroidImportance.LOW,
      },
    });
    _fgActive = true;
    console.log('[FGService] Started successfully');
  } catch (e: any) {
    console.warn('[FGService] Failed to start:', e?.message);
  } finally {
    _fgStarting = false;
  }
};

// ── Stop Foreground Service (saat terapis offline) ───────────────────────────
export const stopOrderForegroundService = async () => {
  if (isExpoGo) return;
  if (!_fgActive) {
    console.log('[FGService] Not active, skipping stop');
    return;
  }

  const notifee = await getNotifee();
  if (!notifee) return;

  try {
    await notifee.default.stopForegroundService();
    _fgActive = false;
    console.log('[FGService] Stopped successfully');
  } catch (e: any) {
    console.warn('[FGService] Failed to stop:', e?.message);
  }
};

export const displayOrderNotification = async (order: any, therapistId?: string) => {
  // ── Dedup: skip if already processed within 60s ──
  if (recentOrderIds.has(order.id)) {
    console.log('[Notif] Skipping duplicate notification for order:', order.id);
    return;
  }
  recentOrderIds.add(order.id);
  setTimeout(() => recentOrderIds.delete(order.id), 60000);

  const userName = titleCase(order.users?.full_name) || 'Pelanggan';
  const serviceName = order.services?.name || 'Layanan Pijat';
  const dur = order.duration || order.services?.duration_min || 60;
  const isTreatment = order.services?.price_type === 'treatment';
  const price = order.service_price || order.total_price || 0;
  const address = order.address || 'Alamat tidak tersedia';
  const isScheduled = !!order.scheduled_at;
  const avatarUrl = order.users?.avatar_url;

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
        const notifId = `order-${order.id}`;

        await notifee.default.displayNotification({
          id: notifId,
          title: isScheduled ? '📅 Booking Terjadwal!' : '🔔 Pesanan Baru Masuk!',
          body: `${userName} · ${serviceName} · Rp ${price.toLocaleString('id-ID')}`,
          android: {
            channelId: NOTIFICATION_CHANNELS.ORDERS,
            sound: 'sound_notifee',
            loopSound: true,
            lights: ['#F97316', 500, 500],
            vibrationPattern: [300, 500, 300, 500],
            color: '#F97316',
            fullScreenAction: { id: 'default', launchActivity: 'default' },
            category: notifee.AndroidCategory.CALL,
            visibility: notifee.AndroidVisibility.PUBLIC,
            importance: notifee.AndroidImportance.HIGH,
            ongoing: true,
            pressAction: {
              id: 'default',
              launchActivity: 'default',
            },
            style: {
              type: notifee.AndroidStyle.BIGTEXT,
              text: bodyText,
            },
            ...(avatarUrl && { largeIcon: avatarUrl }),
          },
          ios: {
            categoryId: 'order_action',
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
          },
        });

        console.log(`[Notif] Notifee notification sent with fullScreenAction`);
        return;
      }
    }

    // ── Fallback: Expo Notifications (Expo Go / jika Notifee tidak tersedia) ──
    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: isScheduled ? '📅 Booking Terjadwal!' : '🔔 Pesanan Baru Masuk!',
        body: bodyText,
        data: {
          orderId: order.id,
          orderData: JSON.stringify(order),
        },
        sound: 'sound_notifee',
        ...(Platform.OS === 'ios' && {
          categoryIdentifier: 'order_action',
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

export { cancelOrderNotifications };
