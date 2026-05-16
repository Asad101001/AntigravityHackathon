import { Platform } from 'react-native';

export const PALETTE = {
  mint50: '#F5FBF7',
  mint100: '#EAF8EF',
  mint200: '#D8F0E1',
  mint300: '#BDE8CE',
  mint400: '#74D99C',
  green500: '#22C55E',
  green600: '#0E8F46',
  green700: '#087238',
  green900: '#10251A',
  emeraldInk: '#0B2A18',
  white: '#FFFFFF',
  amber: '#D97706',
  red: '#DC2626',
  blue: '#2F80ED',
};

export const lightTheme = {
  mode: 'light',
  colors: {
    bg: PALETTE.mint50,
    bgSoft: PALETTE.mint100,
    bgCard: 'rgba(255,255,255,0.74)',
    bgCardSolid: PALETTE.white,
    bgElevated: 'rgba(255,255,255,0.92)',
    bgGlass: 'rgba(255,255,255,0.64)',
    bgGlassStrong: 'rgba(255,255,255,0.82)',
    primary: PALETTE.green600,
    primaryDim: PALETTE.green700,
    primaryGlow: 'rgba(14,143,70,0.16)',
    accent: PALETTE.green500,
    accentSoft: 'rgba(34,197,94,0.13)',
    success: '#16A34A',
    warning: PALETTE.amber,
    danger: PALETTE.red,
    info: PALETTE.blue,
    textPrimary: PALETTE.green900,
    textSecondary: '#51645A',
    textMuted: '#8EA095',
    textInverse: PALETTE.white,
    border: 'rgba(14,143,70,0.16)',
    borderStrong: 'rgba(14,143,70,0.26)',
    borderLight: 'rgba(255,255,255,0.86)',
    chip: PALETTE.mint100,
    scoreHigh: PALETTE.green600,
    scoreMid: PALETTE.amber,
    scoreLow: PALETTE.red,
    shadow: 'rgba(14, 143, 70, 0.20)',
    glassHighlight: 'rgba(255,255,255,0.95)',
    glassSheen: 'rgba(255,255,255,0.36)',
  },
};

export const darkTheme = {
  mode: 'dark',
  colors: {
    ...lightTheme.colors,
    bg: '#EAF8EF',
    bgSoft: '#DFF4E8',
    bgCard: 'rgba(255,255,255,0.46)',
    bgElevated: 'rgba(255,255,255,0.74)',
    bgGlass: 'rgba(255,255,255,0.42)',
    bgGlassStrong: 'rgba(255,255,255,0.66)',
    textPrimary: '#082314',
    textSecondary: '#385344',
    border: 'rgba(8,114,56,0.22)',
    shadow: 'rgba(8,114,56,0.24)',
  },
};

export const COLORS = lightTheme.colors;

export const RADII = {
  xs: 10,
  sm: 14,
  md: 20,
  lg: 28,
  xl: 34,
  pill: 999,
};

export const SPACING = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 36,
};

export const FONTS = {
  regular: { fontSize: 14, color: COLORS.textPrimary },
  bold: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  heading: { fontSize: 22, fontWeight: '900', color: COLORS.textPrimary },
  subheading: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  caption: { fontSize: 12, color: COLORS.textSecondary },
  mono: { fontSize: 12, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), color: COLORS.textSecondary },
};

export const SHADOWS = {
  glass: {
    shadowColor: PALETTE.green600,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.16,
    shadowRadius: 34,
    elevation: 10,
  },
  card: {
    shadowColor: PALETTE.green600,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  floating: {
    shadowColor: '#08351D',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.20,
    shadowRadius: 28,
    elevation: 16,
  },
};

export const GLASS = {
  tint: 'light',
  intensity: 42,
  fallback: COLORS.bgGlass,
  strongFallback: COLORS.bgGlassStrong,
  border: COLORS.borderLight,
  borderStrong: COLORS.borderStrong,
};
