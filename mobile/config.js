// API configuration
// ⚠️ IMPORTANT: Update this IP to your PC's WiFi IP if it changes
// Find your IP by running: ipconfig | Select-String "IPv4"
const API_BASE = 'http://192.168.100.24:3001'; // Your PC's WiFi IP

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

