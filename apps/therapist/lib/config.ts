// API endpoint untuk web backend (Next.js)
// Saat develop lokal:
//   - Android emulator → http://10.0.2.2:3000 (10.0.2.2 = host localhost dari emulator)
//   - iOS simulator   → http://localhost:3000
//   - Device fisik     → http://<IP_LAN_KOMPUTER>:3000 (contoh: http://192.168.1.10:3000)
// Saat production → https://kang-massage.vercel.app

import { Platform } from 'react-native';

// Pakai IP ini kalo testing dari HP fisik via Expo Go
// Ganti dengan IP komputer saat ini. Cek pakai `ipconfig` jika error Network Request Failed.
const LOCAL_IP = 'http://10.39.80.246:3000';

export const WEB_API_URL = LOCAL_IP;
export const API_URL = WEB_API_URL;

// Puter AI - diambil dari app_settings di Supabase
// Gunakan getPuterConfig() untuk mendapatkan nilai terbaru
export const PUTER_API_URL = 'https://api.puter.com';
