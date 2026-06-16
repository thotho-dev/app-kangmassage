import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  badge: string;
  link: string;
  sort_order: number;
}

export function useBanners() {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const id = Date.now().toString();
    const channel = supabase
      .channel(`banners_realtime_${id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'banners',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['banners'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['banners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banners')
        .select('id, title, subtitle, image_url, badge, link, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return (data || []) as Banner[];
    },
  });
}
