import { useEffect, useRef } from 'react';
import { useTherapistStore } from '../store/therapistStore';
import { supabase } from '../lib/supabase';
import { initializeNotifee, displayOrderNotification } from '../lib/notifee';
import * as Location from 'expo-location';
import { calculateDistance } from '../lib/utils';
import { getAppSettings, DEFAULT_SETTINGS } from '../lib/appSettings';

export const useOrderListener = () => {
  const { profile, isOnline, setIncomingOrder } = useTherapistStore();
  const settingsRef = useRef(DEFAULT_SETTINGS);

  useEffect(() => {
    initializeNotifee();
  }, []);

  useEffect(() => {
    if (!profile || !isOnline) return;

    // Fetch latest settings
    getAppSettings().then(s => { settingsRef.current = s; });

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
          const newOrder = payload.new;

          if (!newOrder || newOrder.status !== 'pending') return;

          const settings = settingsRef.current;

          // 1. GLOBAL BALANCE CHECK (from settings)
          const currentBalance = Number(profile.wallet_balance) || 0;
          if (currentBalance < settings.min_wallet_balance) {
            console.log(`[DEBUG OrderListener] BLOKIR: Saldo (${currentBalance}) di bawah ${settings.min_wallet_balance}.`);
            return;
          }

          // 2. Targeted Check: Is it for us specifically or for everyone?
          const isTargeted = newOrder.therapist_id === profile.id;
          const isBroadcast = !newOrder.therapist_id;

          if (!isTargeted && !isBroadcast) {
            console.log('[DEBUG OrderListener] Pesanan ditargetkan untuk terapis lain.');
            return;
          }

          // 3. Broadcast specific filters (Rebutan)
          if (isBroadcast) {
             console.log('[DEBUG OrderListener] Mengecek kelayakan pesanan broadcast...');

             // A. RATING CHECK (skip for targeted/favorite orders)
             const currentRating = Number(profile.rating) || 5.0;
             if (currentRating < settings.min_rating) {
               console.log(`[DEBUG OrderListener] BLOKIR: Rating (${currentRating}) di bawah ${settings.min_rating}.`);
               return;
             }

             // B. Check if Therapist is Busy (Has active orders)
             const { count: activeCount, error: activeError } = await supabase
               .from('orders')
               .select('*', { count: 'exact', head: true })
               .eq('therapist_id', profile.id)
               .in('status', ['accepted', 'on_the_way', 'arrived', 'in_progress']);

             if (activeCount && activeCount > 0) {
               console.log('[DEBUG OrderListener] GAGAL: Terapis sedang sibuk memiliki pesanan aktif.');
               return;
             }

             // Check Skills (Keahlian)
             const { data: svcData } = await supabase.from('services').select('name, category_slug').eq('id', newOrder.service_id).single();
             if (svcData) {
               const reqSkill = svcData.category_slug || svcData.name;
               const therapistSkills: string[] = profile.specializations || [];

               const checkSkill = (skill: string) => therapistSkills.some(ts => ts.toLowerCase() === skill.toLowerCase());
               const hasSkill = Array.isArray(reqSkill)
                 ? reqSkill.some(s => checkSkill(s))
                 : checkSkill(reqSkill);

               if (!hasSkill) {
                 console.log(`[DEBUG OrderListener] GAGAL: Tidak memiliki skill untuk layanan ${svcData.name}`);
                 return;
               }
             }

             // Check Gender Preference
             if (newOrder.therapist_preference && newOrder.therapist_preference !== 'any') {
                if (profile.gender !== newOrder.therapist_preference) {
                  console.log(`[DEBUG OrderListener] GAGAL: Preferensi gender ${newOrder.therapist_preference} tidak sesuai.`);
                  return;
                }
             }

             // Check Distance (from settings)
             try {
                const { status } = await Location.getForegroundPermissionsAsync();
                if (status !== 'granted') return;

                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                const dist = parseFloat(calculateDistance(loc.coords.latitude, loc.coords.longitude, newOrder.latitude, newOrder.longitude));

                if (dist > settings.matching_radius_km) {
                  console.log(`[DEBUG OrderListener] GAGAL: Jarak terlalu jauh (${dist} km, max ${settings.matching_radius_km} km)`);
                  return;
                }
                console.log(`[DEBUG OrderListener] Jarak OK: ${dist} km (max ${settings.matching_radius_km} km)`);
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
            .select('*, users(full_name, avatar_url), services:service_id(name, duration_min, price_type)')
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
  }, [profile?.id, profile?.wallet_balance, isOnline]);
};
