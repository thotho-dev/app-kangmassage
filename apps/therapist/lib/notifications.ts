import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import Constants from 'expo-constants';

export async function registerForPushNotificationsAsync(therapistId: string) {
  try {
    if (!Device.isDevice) {
      console.log('[PushReg] Must use physical device for Push Notifications');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[PushReg] Failed to get push token for push notification!');
      return null;
    }

    const projectId = 
      Constants.expoConfig?.extra?.eas?.projectId ?? 
      Constants.easConfig?.projectId;

    const token = (await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    )).data;

    console.log('[PushReg] Expo Push Token:', token);

    if (therapistId) {
      const { error } = await supabase
        .from('therapists')
        .update({ push_token: token })
        .eq('id', therapistId);
      if (error) console.error('[PushReg] Failed to save push token:', error.message);
      else console.log('[PushReg] Push token saved for therapist:', therapistId);
    }

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return token;
  } catch (error) {
    console.error('[PushReg] Error registering push notifications:', error);
    return null;
  }
}
