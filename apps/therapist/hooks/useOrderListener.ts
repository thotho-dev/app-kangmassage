import { useEffect } from 'react';
import { useTherapistStore } from '../store/therapistStore';
import { supabase } from '../lib/supabase';
import { initializeNotifee, displayOrderNotification } from '../lib/notifee';

export const useOrderListener = () => {
  const { profile, isOnline, setIncomingOrder } = useTherapistStore();

  useEffect(() => {
    initializeNotifee();
  }, []);

  useEffect(() => {
    if (!profile || !isOnline) return;

    console.log('Starting order listener for therapist:', profile.id);

    const subscription = supabase
      .channel(`orders-listener-${profile.id}-${Math.random().toString(36).substring(7)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `therapist_id=eq.${profile.id}`,
        },
        async (payload: any) => {
          console.log('===== [DEBUG OrderListener] PAYLOAD MASUK =====');
          console.log('Event Type:', payload.eventType);
          console.log('New Data:', payload.new);
          console.log('Old Data:', payload.old);

          // Hanya proses jika ada pesanan baru atau pesanan yang baru di-assign (status pending)
          if (!payload.new || payload.new.status !== 'pending') {
            console.log('[DEBUG OrderListener] GAGAL: Status bukan pending atau data kosong.');
            return;
          }
          
          // Hindari memproses order yang sama jika event UPDATE beruntun
          if (payload.old && payload.old.therapist_id === payload.new.therapist_id) {
            console.log('[DEBUG OrderListener] GAGAL: therapist_id tidak berubah dari sebelumnya.');
            return;
          }

          console.log('[DEBUG OrderListener] BERHASIL LOLOS FILTER! Menerima pesanan...');
          
          // Fetch user data for the new order
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('full_name, avatar_url')
            .eq('id', payload.new.user_id)
            .single();

          if (userError) {
            console.error('Error fetching user for new order:', userError);
          }

          const newOrder = {
            ...(payload.new as any),
            users: userData || { full_name: 'Pelanggan' }
          };

          console.log('[DEBUG OrderListener] Memanggil displayOrderNotification...');
          // Trigger Notifee Local Notification for Background visibility
          await displayOrderNotification(newOrder);
          console.log('[DEBUG OrderListener] displayOrderNotification selesai dipanggil.');

          setIncomingOrder(newOrder);
        }
      )
      .subscribe();

    return () => {
      console.log('Stopping order listener');
      supabase.removeChannel(subscription);
    };
  }, [profile?.id, isOnline]);
};
