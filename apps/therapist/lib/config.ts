// API endpoint untuk web backend (Next.js)
// Saat develop lokal:
//   - Android emulator → http://10.0.2.2:3000 (10.0.2.2 = host localhost dari emulator)
//   - iOS simulator   → http://localhost:3000
//   - Device fisik     → http://<IP_LAN_KOMPUTER>:3000 (contoh: http://192.168.1.10:3000)
// Saat production → https://kang-massage.vercel.app

import { Platform } from 'react-native';

const DEV_URL = Platform.select({
  android: 'http://10.0.2.2:3000',
  ios: 'http://localhost:3000',
  default: 'http://localhost:3000',
});

// Ganti jadi false untuk pakai production
const USE_LOCAL = false;

export const WEB_API_URL = USE_LOCAL ? DEV_URL : 'https://kang-massage.vercel.app';
