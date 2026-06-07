import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useMaintenanceStore } from '../store/maintenanceStore';

const DEFAULT_MESSAGE = 'Aplikasi sedang dalam pemeliharaan. Silakan coba lagi nanti.';

async function getMaintenanceFromDB() {
  const { data, error } = await supabase
    .from('app_settings')
    .select('maintenance_mode, maintenance_message')
    .limit(1)
    .single();

  if (error || !data) {
    return { maintenance_mode: false, maintenance_message: DEFAULT_MESSAGE };
  }
  return {
    maintenance_mode: data.maintenance_mode ?? false,
    maintenance_message: data.maintenance_message ?? DEFAULT_MESSAGE,
  };
}

export const useMaintenanceListener = () => {
  const setMaintenance = useMaintenanceStore(state => state.setMaintenance);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    // 1. Initial fetch — catch current state
    getMaintenanceFromDB().then(res => {
      setMaintenance(res.maintenance_mode, res.maintenance_message);
    });

    // 2. Realtime subscription
    const channel = supabase
      .channel(`maintenance-${Math.random().toString(36).substring(7)}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'app_settings',
        },
        (payload) => {
          const newMode = payload.new as { maintenance_mode: boolean; maintenance_message: string };
          setMaintenance(
            newMode.maintenance_mode ?? false,
            newMode.maintenance_message ?? DEFAULT_MESSAGE,
          );
        },
      )
      .subscribe();

    // 3. Polling fallback — query DB directly every 30s
    intervalRef.current = setInterval(async () => {
      const res = await getMaintenanceFromDB();
      setMaintenance(res.maintenance_mode, res.maintenance_message);
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [setMaintenance]);
};
