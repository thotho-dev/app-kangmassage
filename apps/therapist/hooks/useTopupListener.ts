import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useTherapistStore } from '../store/therapistStore';
import { useAlert } from '../components/CustomAlert';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from '../lib/notifications';

export const useTopupListener = () => {
  const { profile, fetchProfile } = useTherapistStore();
  const { showAlert } = useAlert();

  useEffect(() => {
    if (profile?.id) {
      registerForPushNotificationsAsync(profile.id);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (!profile) return;

    console.log('Starting Realtime Listener for Therapist:', profile.id);

    // 1. Listen to Topup Status Changes
    const topupChannel = supabase
      .channel(`topup-status-${profile.id}-${Math.random().toString(36).substring(7)}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'therapist_topups',
          filter: `therapist_id=eq.${profile.id}`,
        },
        async (payload) => {
          console.log('Topup Update Detected:', payload.new.status);
          
          if (payload.new.status === 'paid' && payload.old.status === 'pending') {
            // Trigger Success Notification
            showAlert(
              'success',
              'Top Up Berhasil!',
              `Saldo sebesar Rp ${payload.new.amount.toLocaleString('id-ID')} telah ditambahkan ke dompet Anda.`
            );

            // Update local profile/wallet balance
            fetchProfile();

            // Local Notification (Optional, for extra feedback)
            await Notifications.scheduleNotificationAsync({
              content: {
                title: "Top Up Berhasil! 🎉",
                body: `Saldo Rp ${payload.new.amount.toLocaleString('id-ID')} sudah masuk.`,
                data: { type: 'topup_success' },
              },
              trigger: null,
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Stopping Realtime Listener');
      supabase.removeChannel(topupChannel);
    };
  }, [profile]);
};
