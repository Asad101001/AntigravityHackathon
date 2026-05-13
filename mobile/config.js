import { NativeModules, Platform } from 'react-native';

// API configuration
// Resolution order:
// 1. EXPO_PUBLIC_API_BASE_URL (best for production/EAS builds)
// 2. Expo dev-server LAN host (keeps physical devices off localhost)
// 3. Platform fallback (Android emulator: 10.0.2.2, otherwise localhost)
const API_PORT = 3000;

const trimTrailingSlash = (value) => value?.replace(/\/+$/, '');

const getConfiguredApiBase = () => {
  const envApiBase = process.env.EXPO_PUBLIC_API_BASE_URL;
  return trimTrailingSlash(envApiBase);
};

const getExpoHost = () => {
  const scriptURL = NativeModules.SourceCode?.scriptURL;
  const urlMatch = scriptURL?.match(/^https?:\/\/([^:/]+)/);

  if (urlMatch?.[1]) return urlMatch[1];

  if (typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname;
  }

  return null;
};

const getApiBase = () => {
  const configuredApiBase = getConfiguredApiBase();
  if (configuredApiBase) return configuredApiBase;

  const expoHost = getExpoHost();
  if (expoHost) return `http://${expoHost}:${API_PORT}`;

  if (Platform.OS === 'android') return `http://10.0.2.2:${API_PORT}`;

  return `http://localhost:${API_PORT}`;
};

export const API_BASE = getApiBase();
export const API_URL = `${API_BASE}/api`;

export const COLORS = {
  // Primary palette (Black/White overall)
  bg: '#050505',
  bgCard: '#111111',
  bgCardHover: '#1A1A1A',
  bgGlass: 'rgba(17, 17, 17, 0.85)',
  
  // Accents (Neon/Lime/Dark Green)
  primary: '#39FF14',
  primaryDim: '#006400',
  primaryGlow: 'rgba(57, 255, 20, 0.15)',
  
  // Secondary
  accent: '#39FF14',
  accentDim: '#006400',
  
  // Status
  success: '#39FF14',
  warning: '#FFEA00',
  danger: '#FF3333',
  
  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textMuted: '#555555',
  
  // Borders
  border: '#222222',
  borderLight: '#333333',
  
  // Scoring colors
  scoreHigh: '#39FF14',
  scoreMid: '#FFEA00',
  scoreLow: '#FF3333',
};

export const FONTS = {
  regular: { fontSize: 14, color: COLORS.textPrimary },
  bold: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  heading: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  subheading: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  caption: { fontSize: 12, color: COLORS.textSecondary },
  mono: { fontSize: 12, fontFamily: 'monospace', color: COLORS.textSecondary },
};

export const SHADOWS = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  glow: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
};

export const SERVICES = [
  { id: 'electrician', label: 'Electrician', icon: 'flash-outline', urdu: 'بجلی والا' },
  { id: 'plumber', label: 'Plumber', icon: 'water-outline', urdu: 'پلمبر' },
  { id: 'ac', label: 'AC Repair', icon: 'snow-outline', urdu: 'اے سی' },
  { id: 'carpenter', label: 'Carpenter', icon: 'hammer-outline', urdu: 'بڑھئی' },
  { id: 'painter', label: 'Painter', icon: 'color-palette-outline', urdu: 'پینٹر' },
  { id: 'handyman', label: 'Handyman', icon: 'construct-outline', urdu: 'مرمت' },
];
