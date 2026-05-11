import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Konfigurasi handler notifikasi agar selalu muncul di foreground
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
      await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.ORDERS, {
        name: 'Pesanan Baru',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
  } catch (e) {
    console.error('Expo Notifications Init Error:', e);
  }
};

export const displayOrderNotification = async (order: any) => {
  const userName = order.users?.full_name || 'Pelanggan';
  
  console.log(`[DEBUG Notif] Mencoba menampilkan notif untuk pesanan ${order.id} dari ${userName}`);
  try {
    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔔 Pesanan Baru Masuk!',
        body: `Pelanggan ${userName} sedang mencari therapist. Ketuk untuk detail.`,
        data: {
          orderId: order.id,
          orderData: JSON.stringify(order),
        },
        sound: true,
      },
      trigger: null, // Munculkan secara langsung (immediate local notification)
    });
    console.log(`[DEBUG Notif] Berhasil! ID Notifikasi: ${notifId}`);
  } catch (e) {
    console.error('[DEBUG Notif] Gagal menampilkan notifikasi:', e);
  }
};

// Dummy exports untuk menghindari error di file yang mengimpor Notifee EventType
export const EventType = { ACTION_PRESS: 1, PRESS: 1 };
export default {
  onForegroundEvent: (callback?: any) => { return () => {}; },
  onBackgroundEvent: (callback?: any) => {},
  cancelNotification: async (id: string) => {}
};
