export const COLORS = {
  primary: {
    300: '#4D2DB7',
    400: '#3D1CB2',
    500: '#240080',
    600: '#1A0066',
    700: '#12004D',
  },
  dark: {
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },
  light: {
    100: '#F8FAFC',
    200: '#F1F5F9',
    300: '#E2E8F0',
    400: '#CBD5E1',
  },
  gold: {
    400: '#FDE68A',
    500: '#FDB927',
    600: '#D97706',
    700: '#B45309',
  },
  success: '#00A896',
  error: '#E74C3C',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export const FONTS = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semiBold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
};

export const TYPOGRAPHY = {
  h1: {
    fontFamily: FONTS.bold,
    fontSize: 32,
  },
  h2: {
    fontFamily: FONTS.bold,
    fontSize: 24,
  },
  h3: {
    fontFamily: FONTS.semiBold,
    fontSize: 20,
  },
  body: {
    fontFamily: FONTS.regular,
    fontSize: 16,
  },
  bodyMedium: {
    fontFamily: FONTS.medium,
    fontSize: 16,
  },
  caption: {
    fontFamily: FONTS.regular,
    fontSize: 12,
  },
};

export const LIGHT_THEME = {
  background: COLORS.white,
  surface: COLORS.light[100],
  surfaceVariant: COLORS.light[200],
  text: COLORS.dark[900],
  textSecondary: 'rgba(15, 23, 42, 0.6)',
  border: 'rgba(15, 23, 42, 0.1)',
  card: COLORS.white,
  icon: COLORS.dark[800],
};

export const DARK_THEME = {
  background: COLORS.dark[950],
  surface: COLORS.dark[900],
  surfaceVariant: 'rgba(255, 255, 255, 0.05)',
  text: COLORS.white,
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  border: 'rgba(255, 255, 255, 0.1)',
  card: 'rgba(255, 255, 255, 0.04)',
  icon: COLORS.white,
};
