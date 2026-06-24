import { Vibration, Platform } from 'react-native';
import { Audio } from 'expo-av';

let active = false;
let soundObject: Audio.Sound | null = null;
let loopTimer: ReturnType<typeof setTimeout> | null = null;

async function replaySound() {
  if (!active || !soundObject) return;
  try {
    await soundObject.setPositionAsync(0);
    await soundObject.playAsync();
    const dur = ((await soundObject.getStatusAsync()) as any)?.durationMillis ?? 3000;
    loopTimer = setTimeout(replaySound, Math.max(dur - 200, 1000));
  } catch (e) {
    console.warn('[orderSound] Replay failed:', e);
  }
}

export async function playOrderSound() {
  if (active) return;
  active = true;

  Vibration.vibrate([0, 500, 300, 500, 300, 500, 300, 500, 300], true);

  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, shouldDuckAndroid: true });
    const { sound } = await Audio.Sound.createAsync(
      require('@/assets/raw/sound_notifee.mp3'),
      { shouldPlay: true, isLooping: false, volume: 1.0 }
    );
    soundObject = sound;

    const status = await sound.getStatusAsync();
    const dur = (status as any)?.durationMillis ?? 3000;
    loopTimer = setTimeout(replaySound, Math.max(dur - 200, 1000));
  } catch (e) {
    console.warn('[orderSound] Audio playback failed:', e);
  }
}

export async function stopOrderSound() {
  if (!active) return;
  active = false;

  Vibration.cancel();

  if (loopTimer) {
    clearTimeout(loopTimer);
    loopTimer = null;
  }

  if (soundObject) {
    try {
      await soundObject.stopAsync();
      await soundObject.unloadAsync();
    } catch (e) {
      console.warn('[orderSound] Stop audio failed:', e);
    }
    soundObject = null;
  }
}
