/**
 * notifeeBackground.ts
 *
 * Fungsi-fungsi untuk memproses pesanan di background/headless mode.
 * TIDAK menggunakan Zustand (store tidak tersedia saat app killed).
 * Semua operasi langsung via Supabase dan fetch.
 */

import notifee from '@notifee/react-native';
import { supabase } from './supabase';
import { API_URL } from './config';
import { NOTIFICATION_CHANNELS } from './notifee';

/**
 * Proses aksi Terima/Tolak dari notification tray saat app background/killed.
 * Tidak bergantung pada React context atau Zustand store.
 */
export async function processOrderActionBackground(
  actionId: 'accept' | 'reject' | string,
  orderData: any,
  notificationId?: string
): Promise<string> {
  try {
    // ── Ambil sesi user dari Supabase (tersimpan di AsyncStorage) ──
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.warn('[BGHandler] No authenticated user in background');
      return 'error';
    }

    // ── Ambil profil terapis ──
    const { data: therapist, error: therapistError } = await supabase
      .from('therapists')
      .select('id, full_name, wallet_balance')
      .eq('supabase_uid', user.id)
      .single();

    if (therapistError || !therapist) {
      console.warn('[BGHandler] Therapist profile not found in background');
      return 'error';
    }

    // ── Cancel notifikasi order ──
    if (notificationId) {
      await notifee.cancelNotification(notificationId).catch(() => {});
    }

    // ── Proses TERIMA ──────────────────────────────────────────────
    if (actionId === 'accept') {
      const { data, error } = await supabase
        .from('orders')
        .update({
          status: 'accepted',
          therapist_id: therapist.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderData.id)
        .eq('status', 'pending')
        .or(`therapist_id.is.null,therapist_id.eq.${therapist.id}`)
        .select();

      if (error) {
        console.error('[BGHandler] Accept error:', error.message);
        await showResultNotif('error', 'Gagal memproses pesanan');
        return 'error';
      }

      if (!data || data.length === 0) {
        // Cek apakah diambil orang lain atau sudah hilang
        const { data: check } = await supabase
          .from('orders')
          .select('status, therapist_id')
          .eq('id', orderData.id)
          .single();

        if (check?.status === 'accepted' && check?.therapist_id !== therapist.id) {
          await showResultNotif('taken');
          return 'taken';
        } else {
          await showResultNotif('gone');
          return 'gone';
        }
      }

      // ── Sukses: notif ke pelanggan ──
      const therapistName = therapist.full_name || 'Kang Massage';
      fetch(`${API_URL}/api/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: orderData.user_id,
          title: 'Pesanan Diterima ✅',
          body: `Terapis ${therapistName} telah menerima pesanan Anda dan akan segera menuju lokasi.`,
          type: 'order_accepted',
          data: { order_id: orderData.id },
        }),
      }).catch(() => {});

      await showResultNotif('success', orderData.services?.name || 'Layanan Pijat');
      console.log('[BGHandler] Order accepted:', orderData.id);
      return 'success';
    }

    // ── Proses TOLAK ───────────────────────────────────────────────
    if (actionId === 'reject') {
      // Untuk pesanan targeted (ada therapist_id), batalkan di DB
      if (orderData.therapist_id && orderData.therapist_id === therapist.id) {
        await supabase
          .from('orders')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('id', orderData.id)
          .eq('status', 'pending');

        await supabase.from('order_logs').insert({
          order_id: orderData.id,
          status: 'cancelled',
          note: 'Ditolak oleh terapis (dari notifikasi)',
        });
      }
      // Untuk pesanan broadcast → cukup dismiss (terapis lain masih bisa ambil)
      console.log('[BGHandler] Order rejected:', orderData.id);
      return 'rejected';
    }

  } catch (err: any) {
    console.error('[BGHandler] processOrderActionBackground error:', err?.message);
    return 'error';
  }
}

// ── Helper: tampilkan notif hasil aksi ────────────────────────────────────────
async function showResultNotif(
  result: 'success' | 'taken' | 'gone' | 'error',
  serviceName?: string
): Promise<void> {
  try {
    const configs = {
      success: {
        title: '✅ Pesanan Diterima!',
        body: `Pesanan${serviceName ? ` ${serviceName}` : ''} berhasil diterima. Segera berangkat!`,
      },
      taken: {
        title: '⚠️ Pesanan Diambil Terapis Lain',
        body: 'Sayang sekali, pesanan ini baru saja diterima oleh terapis lain.',
      },
      gone: {
        title: '❌ Pesanan Tidak Tersedia',
        body: 'Pesanan sudah tidak tersedia atau telah dibatalkan.',
      },
      error: {
        title: '❌ Gagal',
        body: serviceName || 'Gagal memproses pesanan. Silakan coba lagi.',
      },
    };

    const cfg = configs[result];
    await notifee.displayNotification({
      title: cfg.title,
      body: cfg.body,
      android: {
        channelId: NOTIFICATION_CHANNELS.ORDERS,
        pressAction: { id: 'default' },
        smallIcon: 'ic_launcher',
      },
    });
  } catch {}
}
