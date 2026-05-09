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
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `therapist_id=eq.${profile.id}`,
        },
        async (payload) => {
          console.log('New order received:', payload.new);
          
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

          // Trigger Notifee Local Notification for Background visibility
          await displayOrderNotification(newOrder);

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
