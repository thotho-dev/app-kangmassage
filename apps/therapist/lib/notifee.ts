import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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
      });
    }
  } catch (e) {
    console.error('Expo Notifications Init Error:', e);
  }
};

export const displayOrderNotification = async (order: any) => {
  const userName = order.users?.full_name || 'Pelanggan';
  
  try {
    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Pesanan Baru Masuk!',
        body: `Pelanggan ${userName} sedang mencari therapist. Ketuk untuk detail.`,
        data: {
          orderId: order.id,
          orderData: JSON.stringify(order),
        },
        sound: true,
      },
      trigger: null,
    });
    console.log(`[Notif] Local notification sent: ${notifId}`);
  } catch (e) {
    console.error('[Notif] Gagal menampilkan notifikasi:', e);
  }
};
