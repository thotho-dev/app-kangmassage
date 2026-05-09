import { create } from 'zustand';

interface ThemeState {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDarkMode: false, // Light by default based on the prompt "Mode terang Warna utama Biru dongker..."
  toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
}));

export const darkColors = {
  primary: '#1E3A8A', // Keep brand blue for accents/icons
  primaryLight: '#3B82F6',
  primaryDark: '#1E40AF',
  secondary: '#F97316',
  secondaryLight: '#FB923C',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  background: '#020617', // Slate 950
  surface: '#0F172A',    // Slate 900
  surfaceLight: '#1E293B', // Slate 800
  headerBg: '#0F172A',
  brandBlue: '#1E3A8A',
  card: '#0F172A',
  border: '#1E293B',
  text: '#F8FAFC',
  textSecondary: '#CBD5E1', // Dibuat lebih terang
  textMuted: '#94A3B8',      // Dibuat lebih terang agar terbaca
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const lightColors = {
  primary: '#1E3A8A', 
  primaryLight: '#3B82F6',
  primaryDark: '#1E40AF',
  secondary: '#F97316',
  secondaryLight: '#FB923C',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#06B6D4',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceLight: '#F1F5F9',
  headerBg: '#FFFFFF',
  brandBlue: '#1E3A8A',
  card: '#FFFFFF',
  border: '#E2E8F0',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const useThemeColors = () => {
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  return isDarkMode ? darkColors : lightColors;
};
