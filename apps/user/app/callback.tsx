import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAlert } from '@/context/AlertContext';

export default function CallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { showAlert } = useAlert();

  useEffect(() => {
    async function handleCallback() {
      try {
        console.log('[CallbackScreen] Received params:', params);
        const { code, access_token, refresh_token } = params;

        const checkProfileAndRedirect = async (userId: string) => {
          const { data: profile } = await supabase
            .from('users')
            .select('phone')
            .eq('supabase_uid', userId)
            .maybeSingle();

          if (!profile || !profile.phone) {
            router.replace('/complete-profile');
          } else {
            router.replace('/home');
          }
        };

        if (code) {
          const { error, data } = await supabase.auth.exchangeCodeForSession(code as string);
          if (error) throw error;
          if (data?.user) {
            await checkProfileAndRedirect(data.user.id);
          } else {
            router.replace('/home');
          }
          return;
        }

        if (access_token) {
          const { error, data } = await supabase.auth.setSession({
            access_token: access_token as string,
            refresh_token: (refresh_token as string) || '',
          });
          if (error) throw error;
          if (data?.user) {
            await checkProfileAndRedirect(data.user.id);
          } else {
            router.replace('/home');
          }
          return;
        }

        // Fallback: check if session is already active
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          await checkProfileAndRedirect(data.session.user.id);
        } else {
          router.replace('/login');
        }
      } catch (error: any) {
        console.error('[CallbackScreen] Error handling callback:', error);
        showAlert('Autentikasi Gagal', error.message || 'Gagal memproses login Google.');
        router.replace('/login');
      }
    }

    handleCallback();
  }, [params]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#F97316" />
      <Text style={styles.text}>Menghubungkan akun...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    gap: 16,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Medium',
  },
});
