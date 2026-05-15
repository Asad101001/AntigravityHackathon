/**
 * config.js — Asaaniyat Mobile Configuration
 *
 * API URL resolution order (first match wins):
 *   1. EXPO_PUBLIC_API_BASE_URL env var  ← set this for EAS/standalone builds
 *   2. Constants.expoConfig.hostUri     ← Expo Go on physical device (most reliable)
 *   3. NativeModules.SourceCode.scriptURL ← fallback
 *   4. window.location.hostname          ← Expo web
 *   5. 10.0.2.2 (Android emulator) / localhost (iOS sim)
 *
 * For teammates: just run `npx expo start` and scan the QR code.
 * If the phone can't reach the backend, set the env var:
 *   $env:EXPO_PUBLIC_API_BASE_URL="http://<YOUR_LAN_IP>:3001"
 *   npx expo start
 */

import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

// ── Port configuration ──────────────────────────────────────────────────────
const API_PORT = Number(process.env.EXPO_PUBLIC_API_PORT || 3001);

// ── Helper: strip trailing slashes ─────────────────────────────────────────
const trim = (v) => v?.replace(/\/+$/, '');

// ── Step 1: explicit env override ─────────────────────────────────────────
const getEnvBase = () => {
  const v = process.env.EXPO_PUBLIC_API_BASE_URL;
  return v ? trim(v) : null;
};

// ── Step 2: expo-constants hostUri ─────────────────────────────────────────
// In Expo Go on a real device, hostUri is "192.168.x.x:8081".
// We strip the Metro port and substitute the backend port.
const getConstantsHost = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ??        // SDK 49+
    Constants.manifest2?.extra?.expoClient?.hostUri ?? // Expo Go older
    Constants.manifest?.debuggerHost;        // legacy

  if (!hostUri) return null;
  const ip = hostUri.split(':')[0];
  // Reject loopback / emulator addresses
  if (!ip || ip === 'localhost' || ip === '10.0.2.2' || ip === '127.0.0.1') return null;
  return `http://${ip}:${API_PORT}`;
};

// ── Step 3: NativeModules.SourceCode (bundle URL) ─────────────────────────
const getScriptUrlHost = () => {
  const scriptURL = NativeModules?.SourceCode?.scriptURL;
  if (!scriptURL) return null;
  const match = scriptURL.match(/^https?:\/\/([^:/]+)/);
  const ip = match?.[1];
  if (!ip || ip === 'localhost' || ip === '10.0.2.2' || ip === '127.0.0.1') return null;
  return `http://${ip}:${API_PORT}`;
};

// ── Step 4: browser (Expo Web) ─────────────────────────────────────────────
const getBrowserHost = () => {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:${API_PORT}`;
  }
  return null;
};

// ── Step 5: simulator / emulator fallback ─────────────────────────────────
const getFallback = () => {
  if (Platform.OS === 'android') return `http://10.0.2.2:${API_PORT}`; // emulator only
  return `http://localhost:${API_PORT}`;
};

// ── Compose ────────────────────────────────────────────────────────────────
const API_BASE =
  getEnvBase() ??
  getConstantsHost() ??
  getScriptUrlHost() ??
  getBrowserHost() ??
  getFallback();

export const API_URL = `${API_BASE}/api`;

// ── Development logging (remove for production) ───────────────────────────
if (__DEV__) {
  console.log('[Config] API_BASE resolved to:', API_BASE);
}

// ── Color system ───────────────────────────────────────────────────────────
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

export const SERVICES = [
  { id: 'electrician', label: 'Electrician',  icon: 'flash-outline',         urdu: 'بجلی والا' },
  { id: 'plumber',     label: 'Plumber',       icon: 'water-outline',         urdu: 'پلمبر'     },
  { id: 'ac',          label: 'AC Repair',     icon: 'snow-outline',          urdu: 'اے سی'     },
  { id: 'carpenter',   label: 'Carpenter',     icon: 'hammer-outline',        urdu: 'بڑھئی'     },
  { id: 'painter',     label: 'Painter',       icon: 'color-palette-outline', urdu: 'پینٹر'     },
  { id: 'handyman',    label: 'Handyman',      icon: 'construct-outline',     urdu: 'مرمت'      },
];