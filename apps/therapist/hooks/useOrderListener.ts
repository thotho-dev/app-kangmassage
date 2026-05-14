import { useEffect } from 'react';
import { useTherapistStore } from '../store/therapistStore';
import { supabase } from '../lib/supabase';
import { initializeNotifee, displayOrderNotification } from '../lib/notifee';
import * as Location from 'expo-location';
import { calculateDistance } from '../lib/utils';

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
          filter: 'status=eq.pending',
        },
        async (payload: any) => {
          console.log('===== [DEBUG OrderListener] PAYLOAD MASUK =====');
          console.log('Event Type:', payload.eventType);
          console.log('New Data:', payload.new);
          console.log('Old Data:', payload.old);

          const newOrder = payload.new;
          
          // 1. Basic Status Check
          if (!newOrder || newOrder.status !== 'pending') {
            return;
          }

          // 2. Targeted Check: Is it for us specifically or for everyone?
          const isTargeted = newOrder.therapist_id === profile.id;
          const isBroadcast = !newOrder.therapist_id; // null or empty

          if (!isTargeted && !isBroadcast) {
            console.log('[DEBUG OrderListener] Pesanan ditargetkan untuk terapis lain.');
            return;
          }

          // 3. Broadcast specific filters (Rebutan)
          if (isBroadcast) {
             console.log('[DEBUG OrderListener] Mengecek kelayakan pesanan broadcast...');
             
             // A. Check if Therapist is Busy (Has active orders)
             const { count: activeCount, error: activeError } = await supabase
               .from('orders')
               .select('*', { count: 'exact', head: true })
               .eq('therapist_id', profile.id)
               .in('status', ['accepted', 'on_site', 'in_progress']);

             if (activeCount && activeCount > 0) {
               console.log('[DEBUG OrderListener] GAGAL: Terapis sedang sibuk memiliki pesanan aktif.');
               return;
             }

             // B. Check Balance (Min 15.000)
             if ((profile.wallet_balance || 0) < 15000) {
               console.log('[DEBUG OrderListener] GAGAL: Saldo kurang dari 15.000');
               return;
             }

             // Check Gender Preference
             if (newOrder.therapist_preference && newOrder.therapist_preference !== 'any') {
                if (profile.gender !== newOrder.therapist_preference) {
                  console.log(`[DEBUG OrderListener] GAGAL: Preferensi gender ${newOrder.therapist_preference} tidak sesuai.`);
                  return;
                }
             }
             
             // Check Distance (Radius 3KM)
             try {
                const { status } = await Location.getForegroundPermissionsAsync();
                if (status !== 'granted') return;

                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                const dist = parseFloat(calculateDistance(loc.coords.latitude, loc.coords.longitude, newOrder.latitude, newOrder.longitude));
                
                if (dist > 3) {
                  console.log(`[DEBUG OrderListener] GAGAL: Jarak terlalu jauh (${dist} km)`);
                  return;
                }
                console.log(`[DEBUG OrderListener] Jarak OK: ${dist} km`);
             } catch (e) {
                console.error('[DEBUG OrderListener] Error checking location:', e);
                return;
             }
          }

          // Hindari memproses order yang sama jika event UPDATE beruntun (untuk Targeted)
          if (isTargeted && payload.old && payload.old.therapist_id === newOrder.therapist_id) {
            console.log('[DEBUG OrderListener] GAGAL: therapist_id tidak berubah dari sebelumnya.');
            return;
          }

          console.log('[DEBUG OrderListener] BERHASIL LOLOS FILTER! Menerima pesanan...');
          
          // Fetch full order data with relations for real data in popup
          const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .select('*, users(full_name, avatar_url), services:service_id(name, duration_min)')
            .eq('id', payload.new.id)
            .single();

          if (orderError || !orderData) {
            console.error('Error fetching full order details:', orderError);
            return;
          }

          console.log('[DEBUG OrderListener] Memanggil displayOrderNotification...');
          // Trigger Notifee Local Notification for Background visibility
          await displayOrderNotification(orderData);
          console.log('[DEBUG OrderListener] displayOrderNotification selesai dipanggil.');

          setIncomingOrder(orderData);
        }
      )
      .subscribe();

    return () => {
      console.log('Stopping order listener');
      supabase.removeChannel(subscription);
    };
  }, [profile?.id, isOnline]);
};
