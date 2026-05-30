import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface TherapistProfile {
  id: string;
  full_name: string;
  avatar_url?: string;
  phone?: string;
  email?: string;
  gender?: 'male' | 'female';
  nik?: string;
  created_at: string;
  is_online: boolean;
  status: 'online' | 'offline'; // Added status
  balance: number;
  wallet_balance: number; // Added wallet_balance
  today_earnings: number; // Added today_earnings
  today_orders: number;   // Added today_orders
  total_orders: number;   // Added total_orders
  total_reviews: number;
  rating: number;         // Added rating
  total_hours: number;    // Added total_hours
  tier: string;           // Added tier
  is_verified: boolean;   // Added is_verified
  bio?: string;           // Added bio
  specializations?: string[]; // Added specializations
  push_token?: string;
  address?: string;
  province?: string;
  city?: string;
  district?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
  commission_rate?: number;
}

interface TherapistState {
  profile: TherapistProfile | null;
  isOnline: boolean;
  loading: boolean;
  incomingOrder: any | null;
  welcomeMessage: string | null;
  _deactivationUnsub: (() => void) | null;
  setProfile: (profile: any) => void;
  setIsOnline: (isOnline: boolean) => void;
  setIncomingOrder: (order: any | null) => void;
  setWelcomeMessage: (msg: string | null) => void;
  fetchProfile: () => Promise<void>;
  toggleOnline: () => Promise<void>;
  setOffline: () => Promise<void>;
  updatePushToken: (token: string) => Promise<void>;
  updateProfile: (updates: Partial<TherapistProfile>) => Promise<void>;
  subscribeToDeactivation: (onDeactivated: () => void) => void;
  unsubscribeDeactivation: () => void;
}

export const useTherapistStore = create<TherapistState>((set, get) => ({
  _deactivationUnsub: null as (() => void) | null,

  subscribeToDeactivation: (onDeactivated: () => void) => {
    const { profile, _deactivationUnsub } = get();
    _deactivationUnsub?.();
    if (!profile?.id) return;

    const sub = supabase
      .channel('therapist-deactivation')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'therapists', filter: `id=eq.${profile.id}` },
        (payload) => {
          const newRecord = payload.new as any;
          if (newRecord.is_active === false) {
            get()._deactivationUnsub?.();
            onDeactivated();
          }
        }
      )
      .subscribe();

    set({ _deactivationUnsub: () => sub.unsubscribe() });
  },

  unsubscribeDeactivation: () => {
    const { _deactivationUnsub } = get();
    _deactivationUnsub?.();
    set({ _deactivationUnsub: null });
  },
  profile: null,
  isOnline: false,
  loading: false,
  incomingOrder: null,
  welcomeMessage: null,
  _deactivationUnsub: null,
  setProfile: (profile) => set({ profile, isOnline: profile?.status === 'online' }),
  setIsOnline: (isOnline) => set({ isOnline }),
  setIncomingOrder: (incomingOrder) => set({ incomingOrder }),
  setWelcomeMessage: (welcomeMessage) => set({ welcomeMessage }),
  
  fetchProfile: async () => {
    set({ loading: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('therapists')
        .select('*')
        .eq('supabase_uid', user.id)
        .single();

      if (error) throw error;

      // Auto logout if account is deactivated
      if (data.is_active === false) {
        await supabase.from('therapists').update({ status: 'offline' }).eq('id', data.id);
        await supabase.auth.signOut();
        set({ profile: null, isOnline: false });
        return;
      }

      // Unverified therapists always offline
      if (data.is_verified === false && data.status === 'online') {
        await supabase.from('therapists').update({ status: 'offline' }).eq('id', data.id);
        set({ profile: { ...data, status: 'offline' }, isOnline: false });
      } else {
        set({ profile: data, isOnline: data.status === 'online' });
      }
    } catch (error) {
      console.error('Error fetching therapist profile:', error);
    } finally {
      set({ loading: false });
    }
  },

  updatePushToken: async (token: string) => {
    const { profile } = get();
    if (!profile || profile.push_token === token) return;

    try {
      const { error } = await supabase
        .from('therapists')
        .update({ push_token: token })
        .eq('id', profile.id);

      if (error) throw error;
      set({ profile: { ...profile, push_token: token } });
    } catch (error) {
      console.error('Error updating push token:', error);
    }
  },

  toggleOnline: async () => {
    const { profile, isOnline } = get();
    if (!profile) return;

    // Unverified therapists tidak bisa online
    if (!profile.is_verified) {
      set({ isOnline: false, profile: { ...profile, status: 'offline' } });
      throw new Error('Akun belum diverifikasi oleh admin');
    }

    const newStatus = isOnline ? 'offline' : 'online';
    
    try {
      const { error } = await supabase
        .from('therapists')
        .update({ status: newStatus })
        .eq('id', profile.id);

      if (error) throw error;
      
      set({ 
        isOnline: !isOnline, 
        profile: { ...profile, status: newStatus } 
      });
    } catch (error) {
      console.error('Error toggling therapist status:', error);
      throw error;
    }
  },

  setOffline: async () => {
    const { profile } = get();
    if (!profile) return;

    const { error } = await supabase
      .from('therapists')
      .update({ status: 'offline' })
      .eq('id', profile.id);

    if (error) {
      console.error('Error setting therapist offline:', error);
      return;
    }

    set({ isOnline: false, profile: { ...profile, status: 'offline' } });
  },

  updateProfile: async (updates) => {
    const { profile } = get();
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('therapists')
        .update(updates)
        .eq('id', profile.id);

      if (error) throw error;
      
      set({ 
        profile: { ...profile, ...updates } 
      });
    } catch (error) {
      console.error('Error updating therapist profile:', error);
      throw error;
    }
  },
}));
