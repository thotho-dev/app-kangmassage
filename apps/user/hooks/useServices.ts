import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Service } from '../constants/Services';

export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      // Map DB fields to the UI Service interface
      return data.map((item: any) => ({
        id: item.id,
        name: item.name,
        price: item.base_price,
        duration: item.duration_min > 0 ? `${item.duration_min} Menit` : '1x Treatment',
        description: item.description,
        icon: item.icon,
        color: item.color,
      })) as Service[];
    },
  });
}
