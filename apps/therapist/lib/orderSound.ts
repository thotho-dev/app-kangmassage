import { Vibration, Platform } from 'react-native';

let vibrating = false;

export function playOrderSound() {
  if (vibrating) return;
  vibrating = true;

  // Pola getar panjang + looping sampai dihentikan
  // 500ms getar, 300ms jeda, repeat
  const pattern = Platform.OS === 'android'
    ? [0, 500, 300, 500, 300, 500, 300, 500, 300]
    : [0, 1000];

  Vibration.vibrate(pattern, true);
}

export function stopOrderSound() {
  if (!vibrating) return;
  vibrating = false;
  Vibration.cancel();
}
