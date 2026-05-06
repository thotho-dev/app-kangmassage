export const COLORS = {
  primary: '#1E1B4B',
  primaryLight: '#312E81',
  primaryDark: '#0F0D2E',
  secondary: '#F97316',
  secondaryLight: '#FB923C',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#06B6D4',
  background: '#0F172A',
  surface: '#1E293B',
  surfaceLight: '#334155',
  card: '#1E293B',
  border: '#334155',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',

  // Gradient arrays
  gradientPrimary: ['#1E1B4B', '#312E81'] as const,
  gradientSecondary: ['#F97316', '#EA580C'] as const,
  gradientSuccess: ['#10B981', '#059669'] as const,
  gradientDark: ['#0F172A', '#1E293B'] as const,
};

export const SPACING = {
  xs: 2,
  sm: 6,
  md: 12,
  lg: 18,
  xl: 24,
  xxl: 36,
};

export const RADIUS = {
  sm: 8,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  full: 9999,
};

export const TYPOGRAPHY = {
  h1: { fontFamily: 'Inter_700Bold', fontSize: 26, letterSpacing: -0.5 },
  h2: { fontFamily: 'Inter_700Bold', fontSize: 22, letterSpacing: -0.3 },
  h3: { fontFamily: 'Inter_600SemiBold', fontSize: 18 },
  h4: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  body: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  bodySmall: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  caption: { fontFamily: 'Inter_500Medium', fontSize: 10 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 0.5 },
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  lg: {
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  glow: {
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
};
