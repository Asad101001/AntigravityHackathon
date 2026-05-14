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
  bg: '#F5FBF7',
  bgCard: '#FFFFFF',
  bgCardHover: '#ECF8F1',
  bgGlass: 'rgba(255, 255, 255, 0.88)',
  primary: '#0E8F46',
  primaryDim: '#075E2C',
  primaryGlow: 'rgba(14, 143, 70, 0.12)',
  accent: '#22C55E',
  accentDim: '#0B6B35',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  textPrimary: '#10251A',
  textSecondary: '#51645A',
  textMuted: '#8EA095',
  border: '#DDEBE3',
  borderLight: '#EEF6F1',
  chip: '#E9F8EF',
  scoreHigh: '#0E8F46',
  scoreMid: '#D97706',
  scoreLow: '#DC2626',
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
    shadowColor: '#0E8F46',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
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
