import { Platform } from 'react-native';

// Helper to safely get notifee only on native platforms with the module installed
const getNotifee = () => {
  try {
    return require('@notifee/react-native').default;
  } catch (e) {
    console.warn('Notifee native module not found. Notifications will not work.');
    return null;
  }
};

const getNotifeeConstants = () => {
  try {
    return require('@notifee/react-native');
  } catch (e) {
    return {
      AndroidImportance: { HIGH: 4 },
      AndroidVisibility: { PUBLIC: 1 },
      EventType: { ACTION_PRESS: 1, PRESS: 1 },
      AndroidCategory: { CALL: 'call' },
    };
  }
};

const notifee = getNotifee();
const { AndroidImportance, AndroidVisibility, EventType, AndroidCategory } = getNotifeeConstants();

export { EventType };

export const NOTIFICATION_CHANNELS = {
  ORDERS: 'orders_high_priority',
};

export const initializeNotifee = async () => {
  if (!notifee) return;
  try {
    await notifee.requestPermission();
    if (Platform.OS === 'android') {
      await notifee.createChannel({
        id: NOTIFICATION_CHANNELS.ORDERS,
        name: 'Pesanan Baru',
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        sound: 'default',
        vibration: true,
        vibrationPattern: [300, 500, 300, 500, 300, 500],
      });
    }
  } catch (e) {
    console.error('Notifee Init Error:', e);
  }
};

export const displayOrderNotification = async (order: any) => {
  if (!notifee) return;
  const userName = order.users?.full_name || 'Pelanggan';
  
  try {
    await notifee.displayNotification({
      title: '🔔 Pesanan Baru Masuk!',
      body: `Pelanggan ${userName} sedang mencari therapist. Ketuk untuk detail.`,
      data: {
        orderId: order.id,
        orderData: JSON.stringify(order),
      },
      android: {
        channelId: NOTIFICATION_CHANNELS.ORDERS,
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        category: AndroidCategory.CALL,
        fullScreenAction: { id: 'default' },
        pressAction: { id: 'default' },
        actions: [
          { title: '✅ Terima', pressAction: { id: 'ACCEPT', launchActivity: 'default' } },
          { title: '❌ Tolak', pressAction: { id: 'REJECT' } },
        ],
      },
      ios: {
        critical: true,
        foregroundPresentationOptions: { alert: true, badge: true, sound: true },
      },
    });
  } catch (e) {
    console.error('Display Notif Error:', e);
  }
};

export default notifee;
