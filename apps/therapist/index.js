// ─────────────────────────────────────────────────────────────────────────────
// PENTING: File ini HARUS menjadi entry point (main di package.json).
// Notifee onBackgroundEvent() WAJIB didaftarkan di sini, SEBELUM app boot.
// Jika didaftarkan di dalam komponen atau module lain, handler tidak akan
// terpanggil saat app killed/background.
// ─────────────────────────────────────────────────────────────────────────────

import notifee, { EventType } from '@notifee/react-native';

// ── 1. Background Event Handler ──────────────────────────────────────────────
// Dipanggil saat app background/killed dan user tap tombol notifikasi (Terima/Tolak)
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification, pressAction } = detail;

  // ACTION_PRESS: user menekan tombol di notification tray
  if (type === EventType.ACTION_PRESS && pressAction?.id && notification?.data?.orderData) {
    const raw = notification.data.orderData;
    const orderData = typeof raw === 'string' ? JSON.parse(raw) : raw;

    if (pressAction.id === 'default') {
      // Default tap — store for navigation on resume, then cancel notif
      if (orderData?.id) {
        global._pendingOrderNavId = orderData.id;
      }
      await notifee.cancelNotification(notification.id).catch(() => {});
      return;
    }

    const { processOrderActionBackground } = require('./lib/notifeeBackground');

    console.log(`[BGHandler] Action pressed: ${pressAction.id} for order: ${orderData?.id}`);

    // Proses accept/reject via Supabase langsung (tanpa Zustand)
    const result = await processOrderActionBackground(pressAction.id, orderData, notification?.id);
    if (pressAction.id === 'accept' && result === 'success' && orderData?.id) {
      global._pendingOrderNavId = orderData.id;
    }
  }

  // DISMISSED: user swipe dismiss notifikasi
  if (type === EventType.DISMISSED && notification?.id) {
    await notifee.cancelNotification(notification.id).catch(() => {});
  }
});

// ── 2. Foreground Service Handler ─────────────────────────────────────────────
// Menjaga proses Android tetap hidup saat terapis sedang online (agar
// Supabase Realtime tetap terhubung). Mirip seperti Gojek/Grab driver app
// yang menampilkan notif "Menunggu pesanan..." di status bar.
let _fgRegistered = false;
notifee.registerForegroundService((notification) => {
  if (_fgRegistered) {
    console.log('[FGService] Already registered — skip duplicate');
    return new Promise(() => {});
  }
  _fgRegistered = true;
  console.log('[FGService] Handler registered');

  return new Promise(() => {
    // Tidak pernah resolve — service berjalan sampai stopForegroundService()
  });
});

// ── 3. Boot Expo Router ───────────────────────────────────────────────────────
// Gunakan require() bukan import agar berjalan SETELAH handler terdaftar di atas.
require('expo-router/entry');
