export const COLORS = {
  // Primary
  primary: '#C77DFF',
  primaryDark: '#9D4EDD',
  primaryLight: '#E0AAFF',

  // Accent
  accentGold: '#D97706',
  accentTeal: '#0D9488',
  accentBlue: '#3B82F6',

  // Background
  background: '#0F172A',
  card: '#1E293B',
  cardHover: '#334155',

  // Text
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',

  // Borders
  border: '#334155',
  borderLight: '#475569',

  // Status
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(255, 255, 255, 0.05)',
};

export const FONTS = {
  h1: { fontSize: 32, fontWeight: '900', lineHeight: 40 },
  h2: { fontSize: 28, fontWeight: '800', lineHeight: 36 },
  h3: { fontSize: 24, fontWeight: '700', lineHeight: 32 },
  h4: { fontSize: 20, fontWeight: '700', lineHeight: 28 },
  h5: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
  subtitle1: { fontSize: 16, fontWeight: '600', lineHeight: 24 },
  subtitle2: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  body1: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  body2: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
  button: { fontSize: 16, fontWeight: '600', lineHeight: 24 },
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
};

export const darkTheme = {
  colors: COLORS,
  fonts: FONTS,
  shadows: SHADOWS,
};
