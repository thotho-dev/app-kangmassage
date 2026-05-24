import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';

/**
 * Hook to track therapist location and update it in Supabase
 * @param therapistId The UUID of the therapist (from therapists table)
 * @param isOnline Whether the therapist is currently online and should be tracked
 */
export function useLocationTracker(therapistId: string | null, isOnline: boolean) {
  const watchSubscription = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    let isMounted = true;

    const stopTracking = () => {
      if (watchSubscription.current) {
        watchSubscription.current.remove();
        watchSubscription.current = null;
      }
    };

    const startTracking = async () => {
      if (!therapistId || !isOnline) {
        stopTracking();
        return;
      }

      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Location permission denied. Cannot track therapist location.');
        return;
      }

      try {
        // Ensure any existing subscription is cleared
        stopTracking();

        // Start watching position
        watchSubscription.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 60000, // Update every 1 minute to save battery
            distanceInterval: 20, // Or every 20 meters
          },
          async (location) => {
            if (!isMounted) return;
            
            const { latitude, longitude } = location.coords;
            
            // Geocode coordinates to readable address
            let live_address = '';
            try {
              const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
              if (geocode && geocode.length > 0) {
                const addressObj = geocode[0];
                const street = addressObj.street || addressObj.name || '';
                const streetNumber = addressObj.streetNumber || '';
                const streetInfo = streetNumber ? `${street} No. ${streetNumber}` : street;
                const district = addressObj.district || addressObj.subregion || '';
                const city = addressObj.city || '';
                const region = addressObj.region || '';
                
                const parts = [
                  streetInfo,
                  district,
                  city,
                  region !== city ? region : null
                ].filter(p => p && p.trim().length > 0);
                live_address = parts.join(', ');
              }
            } catch (geocodeErr) {
              console.warn('Failed to reverse geocode live location:', geocodeErr);
            }
            
            // Update Supabase therapist_locations table
            // We use upsert because the therapist_id has a UNIQUE constraint
            const { error } = await supabase
              .from('therapist_locations')
              .upsert({
                therapist_id: therapistId,
                latitude,
                longitude,
                live_address: live_address || null,
                last_updated: new Date().toISOString(),
              }, { onConflict: 'therapist_id' });

            if (error) {
              console.error('Failed to update therapist location in database:', error.message);
            } else {
              console.log(`Location updated: ${latitude}, ${longitude} (${live_address || 'No address'})`);
            }
          }
        );
      } catch (err) {
        console.error('Error initializing location tracking:', err);
      }
    };

    startTracking();

    return () => {
      isMounted = false;
      stopTracking();
    };
  }, [therapistId, isOnline]);
}
