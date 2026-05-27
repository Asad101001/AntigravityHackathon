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
  gold: '#F59E0B',
  goldGlow: 'rgba(245, 158, 11, 0.2)',
  red: '#DC2626',
  blue: '#2F80ED',
  teal: '#0D9488',
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
    accentGold: PALETTE.gold,
    accentGoldSoft: PALETTE.goldGlow,
    accentTeal: PALETTE.teal,
    success: '#16A34A',
    warning: PALETTE.amber,
    danger: PALETTE.red,
    info: PALETTE.blue,
    textPrimary: PALETTE.green900,
    textSecondary: '#51645A',
    textMuted: '#8EA095',
    textInverse: PALETTE.white,
    border: 'rgba(14,143,70,0.12)',
    borderStrong: 'rgba(14,143,70,0.22)',
    borderLight: 'rgba(255,255,255,0.92)',
    chip: PALETTE.mint100,
    scoreHigh: PALETTE.green600,
    scoreMid: PALETTE.amber,
    scoreLow: PALETTE.red,
    shadow: 'rgba(14, 143, 70, 0.16)',
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

// Reduced roundedness across the system to be modern, clean and sharp
export const RADII = {
  xs: 6,
  sm: 10,
  md: 12,
  lg: 14,
  xl: 16,
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
  xxxl: 48,
};

// Standardised line-height ratios for all font sizes
export const LINE_HEIGHTS = {
  tight: 1.2,
  normal: 1.45,
  relaxed: 1.65,
};

export const FONTS = {
  regular: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  bold: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  heading: {
    fontSize: 24,
    fontFamily: 'Poppins_800ExtraBold',
    color: COLORS.textPrimary,
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  subheading: {
    fontSize: 17,
    fontFamily: 'Poppins_700Bold',
    color: COLORS.textPrimary,
    lineHeight: 23,
  },
  caption: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  mono: {
    fontSize: 13,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  // Urdu typography preset
  urdu: {
    fontSize: 16,
    fontFamily: 'NotoNastaliqUrdu_400Regular',
    color: COLORS.textSecondary,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 32, // increased line height for nastaliq
  },
  urduLarge: {
    fontSize: 22,
    fontFamily: 'NotoNastaliqUrdu_700Bold',
    color: COLORS.textPrimary,
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 44, // increased line height
  },
  urduDisplay: {
    fontSize: 46,
    fontFamily: 'NotoNastaliqUrdu_700Bold',
    color: PALETTE.emeraldInk,
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 70, // increased line height
  },
};

export const SHADOWS = {
  glass: {
    shadowColor: PALETTE.green600,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  card: {
    shadowColor: PALETTE.green600,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  floating: {
    shadowColor: '#08351D',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    elevation: 12,
  },
  // New: for button pressed state
  pressed: {
    shadowColor: PALETTE.green600,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 2,
  },
  // New: subtle glow behind icons
  iconGlow: {
    shadowColor: PALETTE.green600,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 3,
  },
  // New: elevated elements (modals, overlays)
  elevated: {
    shadowColor: '#08351D',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
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

// Button feedback constants for consistent press animations
export const BUTTON_FEEDBACK = {
  pressScale: 0.96,
  pressSpeed: 50,
  pressBounce: 4,
  releaseSpeed: 30,
  releaseBounce: 8,
};
