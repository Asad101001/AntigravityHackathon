// API configuration
// ⚠️ IMPORTANT: Update this IP to your PC's WiFi IP if it changes
// Find your IP by running: ipconfig | Select-String "IPv4"
const API_BASE = 'http://192.168.100.24:3000'; // Your PC's WiFi IP

export const API_URL = `${API_BASE}/api`;

export const COLORS = {
  // Primary palette
  bg: '#0A0E17',
  bgCard: '#141B2D',
  bgCardHover: '#1A2340',
  bgGlass: 'rgba(20, 27, 45, 0.85)',
  
  // Pakistan green accent
  primary: '#00C853',
  primaryDim: '#00A844',
  primaryGlow: 'rgba(0, 200, 83, 0.15)',
  
  // Secondary
  accent: '#00E5FF',
  accentDim: '#00B8D4',
  
  // Status
  success: '#00E676',
  warning: '#FFD600',
  danger: '#FF5252',
  
  // Text
  textPrimary: '#E8EDF5',
  textSecondary: '#8B95A8',
  textMuted: '#5A6478',
  
  // Borders
  border: '#1E2A42',
  borderLight: '#2A3A58',
  
  // Scoring colors
  scoreHigh: '#00E676',
  scoreMid: '#FFD600',
  scoreLow: '#FF5252',
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
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  glow: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
};

export const SERVICES = [
  { id: 'electrician', label: 'Electrician', icon: '⚡', urdu: 'بجلی والا' },
  { id: 'plumber', label: 'Plumber', icon: '🔧', urdu: 'پلمبر' },
  { id: 'ac', label: 'AC Repair', icon: '❄️', urdu: 'اے سی' },
  { id: 'carpenter', label: 'Carpenter', icon: '🪚', urdu: 'بڑھئی' },
  { id: 'painter', label: 'Painter', icon: '🎨', urdu: 'پینٹر' },
  { id: 'handyman', label: 'Handyman', icon: '🛠️', urdu: 'مرمت' },
];
