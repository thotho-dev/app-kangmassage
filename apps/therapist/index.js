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
    const { processOrderActionBackground } = require('./lib/notifeeBackground');
    const raw = notification.data.orderData;
    const orderData = typeof raw === 'string' ? JSON.parse(raw) : raw;

    console.log(`[BGHandler] Action pressed: ${pressAction.id} for order: ${orderData?.id}`);

    // Proses accept/reject via Supabase langsung (tanpa Zustand)
    await processOrderActionBackground(pressAction.id, orderData, notification?.id);
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
notifee.registerForegroundService((_notification) => {
  // Kembalikan Promise yang tidak pernah resolve = service tetap berjalan.
  // Service akan dihentikan via notifee.stopForegroundService() saat offline.
  return new Promise(() => {
    console.log('[FGService] Foreground service started');
  });
});

// ── 3. Boot Expo Router ───────────────────────────────────────────────────────
// Gunakan require() bukan import agar berjalan SETELAH handler terdaftar di atas.
require('expo-router/entry');
