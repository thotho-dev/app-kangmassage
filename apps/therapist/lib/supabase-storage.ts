import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

function createStorage() {
  if (Platform.OS === 'web') {
    const map = new Map<string, string>();
    return {
      getItem: async (key: string) => map.get(key) ?? null,
      setItem: async (key: string, value: string) => { map.set(key, value); },
      removeItem: async (key: string) => { map.delete(key); },
    };
  }

  return {
    getItem: async (key: string) => {
      try {
        return await SecureStore.getItemAsync(key);
      } catch {
        return null;
      }
    },
    setItem: async (key: string, value: string) => {
      try {
        await SecureStore.setItemAsync(key, value);
      } catch (err: any) {
        console.warn('SecureStore setItem failed, falling back to memory:', err.message);
      }
    },
    removeItem: async (key: string) => {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch {
        // ignore
      }
    },
  };
}

export const supabaseStorage = createStorage();
