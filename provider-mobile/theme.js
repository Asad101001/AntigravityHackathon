export const PALETTE = {
  mint50: '#F5FBF7',
  mint100: '#EAF8EF',
  green500: '#22C55E',
  green600: '#0E8F46',
  green700: '#087238',
  green900: '#10251A',
  white: '#FFFFFF',
  amber: '#D97706',
  red: '#DC2626',
  blue: '#2F80ED',
  teal: '#0D9488',
};

export const COLORS = {
  // Primary
  primary: PALETTE.green600,
  primaryDark: PALETTE.green700,
  primaryLight: PALETTE.mint300 || '#BDE8CE',

  // Accent
  accentGold: PALETTE.amber,
  accentTeal: PALETTE.teal,
  accentBlue: PALETTE.blue,

  // Background
  background: PALETTE.mint50,
  card: 'rgba(255,255,255,0.74)', // bgCard
  cardHover: PALETTE.white,

  // Text
  textPrimary: PALETTE.green900,
  textSecondary: '#51645A',
  textTertiary: '#8EA095',

  // Borders
  border: 'rgba(14,143,70,0.12)',
  borderLight: 'rgba(255,255,255,0.92)',

  // Status
  success: '#16A34A',
  warning: PALETTE.amber,
  error: PALETTE.red,
  info: PALETTE.blue,

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.4)',
  overlayLight: 'rgba(255, 255, 255, 0.64)', // bgGlass
};

export const FONTS = {
  h1: { fontSize: 32, fontWeight: '900', lineHeight: 40, letterSpacing: -0.5 },
  h2: { fontSize: 28, fontWeight: '800', lineHeight: 36, letterSpacing: -0.5 },
  h3: { fontSize: 24, fontWeight: '700', lineHeight: 32, letterSpacing: -0.3 },
  h4: { fontSize: 20, fontWeight: '700', lineHeight: 28, letterSpacing: -0.3 },
  h5: { fontSize: 18, fontWeight: '600', lineHeight: 24, letterSpacing: -0.2 },
  subtitle1: { fontSize: 16, fontWeight: '700', lineHeight: 24, letterSpacing: -0.2 },
  subtitle2: { fontSize: 14, fontWeight: '700', lineHeight: 20, letterSpacing: -0.1 },
  body1: { fontSize: 16, fontWeight: '500', lineHeight: 24 },
  body2: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '600', lineHeight: 16 },
  button: { fontSize: 16, fontWeight: '700', lineHeight: 24, letterSpacing: 0.2 },
};

export const SHADOWS = {
  sm: {
    shadowColor: 'rgba(14, 143, 70, 0.16)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: 'rgba(14, 143, 70, 0.16)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 4,
  },
  lg: {
    shadowColor: 'rgba(14, 143, 70, 0.16)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 8,
  },
};

export const darkTheme = {
  colors: COLORS,
  fonts: FONTS,
  shadows: SHADOWS,
};
