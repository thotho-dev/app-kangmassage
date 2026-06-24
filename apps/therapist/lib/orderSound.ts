import { Vibration, Platform } from 'react-native';
import { Audio } from 'expo-av';

let active = false;
let soundObject: Audio.Sound | null = null;

export async function playOrderSound() {
  if (active) return;
  active = true;

  Vibration.vibrate([0, 500, 300, 500, 300, 500, 300, 500, 300], true);

  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, shouldDuckAndroid: true });
    const { sound } = await Audio.Sound.createAsync(
      require('@/assets/raw/sound_notifee.mp3'),
      { shouldPlay: true, isLooping: true, volume: 1.0 }
    );
    soundObject = sound;
  } catch (e) {
    console.warn('[orderSound] Audio playback failed:', e);
  }
}

export async function stopOrderSound() {
  if (!active) return;
  active = false;

  Vibration.cancel();

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
