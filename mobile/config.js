/**
 * config.js — Asaaniyat Mobile Configuration
 * (Updated for Phase V: 9-service grid with circle colour metadata)
 */

import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

const API_PORT = Number(process.env.EXPO_PUBLIC_API_PORT || 3001);
const trim = (v) => v?.replace(/\/+$/, '');

const getEnvBase = () => {
  const v = process.env.EXPO_PUBLIC_API_BASE_URL;
  return v ? trim(v) : null;
};

const getConstantsHost = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.manifest2?.extra?.expoClient?.hostUri ??
    Constants.manifest?.debuggerHost;
  if (!hostUri) return null;
  const ip = hostUri.split(':')[0];
  if (!ip || ip === 'localhost' || ip === '10.0.2.2' || ip === '127.0.0.1') return null;
  return `http://${ip}:${API_PORT}`;
};

const getScriptUrlHost = () => {
  const scriptURL = NativeModules?.SourceCode?.scriptURL;
  if (!scriptURL) return null;
  const match = scriptURL.match(/^https?:\/\/([^:/]+)/);
  const ip = match?.[1];
  if (!ip || ip === 'localhost' || ip === '10.0.2.2' || ip === '127.0.0.1') return null;
  return `http://${ip}:${API_PORT}`;
};

const getBrowserHost = () => {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:${API_PORT}`;
  }
  return null;
};

const getFallback = () => {
  if (Platform.OS === 'android') return `http://10.0.2.2:${API_PORT}`;
  return `http://localhost:${API_PORT}`;
};

const API_BASE =
  getEnvBase() ??
  getConstantsHost() ??
  getScriptUrlHost() ??
  getBrowserHost() ??
  getFallback();

export const API_URL = `${API_BASE}/api`;

if (__DEV__) {
  console.log('[Config] API_BASE resolved to:', API_BASE);
}

export const COLORS = {
  bg:            '#F5FBF7',
  bgCard:        '#FFFFFF',
  bgCardHover:   '#ECF8F1',
  bgGlass:       'rgba(255, 255, 255, 0.88)',
  primary:       '#0E8F46',
  primaryDim:    '#075E2C',
  primaryGlow:   'rgba(14, 143, 70, 0.12)',
  accent:        '#22C55E',
  accentDim:     '#0B6B35',
  success:       '#16A34A',
  warning:       '#D97706',
  danger:        '#DC2626',
  textPrimary:   '#10251A',
  textSecondary: '#51645A',
  textMuted:     '#8EA095',
  border:        '#DDEBE3',
  borderLight:   '#EEF6F1',
  chip:          '#E9F8EF',
  scoreHigh:     '#0E8F46',
  scoreMid:      '#D97706',
  scoreLow:      '#DC2626',
};

export const FONTS = {
  regular:    { fontSize: 14, color: COLORS.textPrimary },
  bold:       { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  heading:    { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  subheading: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  caption:    { fontSize: 12, color: COLORS.textSecondary },
  mono:       { fontSize: 12, fontFamily: 'monospace', color: COLORS.textSecondary },
};

export const SHADOWS = {
  card: {
    shadowColor: '#0E8F46',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 5,
  },
};

// ── 14.9: Full 9-service grid — each entry includes circle styling ────────────
export const SERVICES = [
  {
    id: 'electrician',
    label: 'Electrician',
    icon: 'flash-outline',
    urdu: 'بجلی والا',
    circleColor: '#FFF7ED',   // warm orange tint
    iconColor: '#EA580C',
  },
  {
    id: 'plumber',
    label: 'Plumber',
    icon: 'water-outline',
    urdu: 'پلمبر',
    circleColor: '#F0FDF4',   // mint blue tint
    iconColor: '#0284C7',
  },
  {
    id: 'ac',
    label: 'AC Repair',
    icon: 'snow-outline',
    urdu: 'اے سی',
    circleColor: '#ECFEFF',   // icy cyan
    iconColor: '#0891B2',
  },
  {
    id: 'carpenter',
    label: 'Carpenter',
    icon: 'hammer-outline',
    urdu: 'بڑھئی',
    circleColor: '#FEF3C7',   // amber gold
    iconColor: '#B45309',
  },
  {
    id: 'painter',
    label: 'Painter',
    icon: 'color-palette-outline',
    urdu: 'پینٹر',
    circleColor: '#FDF2F8',   // rose lavender
    iconColor: '#DB2777',
  },
  {
    id: 'maid',
    label: 'Maid/Clean',
    icon: 'sparkles-outline',
    urdu: 'صفائی والی',
    circleColor: '#F0FDF4',   // clean green
    iconColor: '#16A34A',
  },
  {
    id: 'salon',
    label: 'Salon',
    icon: 'cut-outline',
    urdu: 'حجام',
    circleColor: '#FAF5FF',   // soft purple
    iconColor: '#9333EA',
  },
  {
    id: 'mechanic',
    label: 'Car Mechanic',
    icon: 'car-outline',
    urdu: 'مکینک',
    circleColor: '#F1F5F9',   // steel slate
    iconColor: '#475569',
  },
  {
    id: 'handyman',
    label: 'Handyman',
    icon: 'build-outline',
    urdu: 'مستری',
    circleColor: '#FEF2F2',   // warm coral
    iconColor: '#DC2626',
  },
];