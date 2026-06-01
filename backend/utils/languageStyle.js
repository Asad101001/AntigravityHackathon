'use strict';

const DEVANAGARI_RE = /[\u0900-\u097F]/;
const URDU_RE = /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const ROMAN_URDU_PATTERNS = [
  /\b(mujhe|mujhay|mjy|muje|mere|meri|mera|meray|hamara|hum|main|mein|mai)\b/i,
  /\b(chahiye|chaiye|chahye|chaahiye|zaroorat|zroorat|need)\b/i,
  /\b(kal|aaj|parso|parson|tarso|subah|subha|sawera|sawere|dopahar|dopehar|shaam|sham|raat|baje|bajay|abhi|foran|jaldi)\b/i,
  /\b(plumber|electrician|bijli|pani|paani|nal|pipe|motor|fan|ac|safai|kaam|karwana|theek|thik|repair|fix|install|mount|wiring)\b/i,
  /\b(haan|han|nahi|nahin|kar do|bhej do|kitna|kab|kidhar|kahan|waqt|waqt par)\b/i,
];

const DEVANAGARI_MAP = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n', 'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm', 'य': 'y', 'र': 'r',
  'ल': 'l', 'व': 'v', 'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h', 'ळ': 'l',
  'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ं': 'n', 'ँ': 'n', 'ः': 'h',
  '्': '', '।': '.', '०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
};

function containsDevanagari(text = '') {
  return DEVANAGARI_RE.test(String(text || ''));
}

function containsUrduScript(text = '') {
  return URDU_RE.test(String(text || ''));
}

function detectLanguageStyle(text = '') {
  const value = String(text || '');
  if (!value.trim()) return 'english';
  if (containsDevanagari(value)) return 'blocked_devanagari';
  if (containsUrduScript(value)) return 'urdu';
  const romanScore = ROMAN_URDU_PATTERNS.filter((pattern) => pattern.test(value)).length;
  const englishScore = /\b(the|is|are|please|need|today|tomorrow|book|booking|service|provider|when|where|how)\b/i.test(value);
  if (romanScore >= 3) return englishScore ? 'mixed' : 'roman_urdu';
  if (romanScore >= 2) return englishScore ? 'mixed' : 'roman_urdu';
  if (romanScore === 1 && /\b(plumber|electrician|ac|booking|provider|service|when|where)\b/i.test(value)) return 'mixed';
  return 'english';
}

function transliterateDevanagariBasic(text = '') {
  return String(text || '')
    .split('')
    .map((char) => DEVANAGARI_MAP[char] ?? char)
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

function enforceNoDevanagari(text = '') {
  const value = String(text || '');
  return containsDevanagari(value) ? transliterateDevanagariBasic(value) : value;
}

function fallbackReplyForStyle(style, key = 'clarify') {
  const normalized = style === 'urdu' ? 'roman_urdu' : style;
  const roman = {
    clarify: 'Mujhe is waqt is bare mein specific maloomat nahi hain. Kya aap thora clarify kar sakte hain?',
    noBooking: 'Main tab madad kar sakta hoon jab booking active ho. Pehle Home se service request bhej dein.',
    pending: 'Request provider ko bhej di gayi hai. Provider accept karega to booking confirm hogi.',
    offline: 'Backend se connection nahi ho raha, is liye booking status confirm nahi kar sakta.',
  };
  const english = {
    clarify: "I don't have specific information about that right now. Could you clarify?",
    noBooking: 'I can help once a booking is active. Please submit a service request from Home first.',
    pending: 'Your request has been sent to the provider. It will be confirmed after the provider accepts.',
    offline: 'I cannot confirm the booking status because the backend is unreachable.',
  };
  return (normalized === 'roman_urdu' || normalized === 'mixed' ? roman : english)[key] || english.clarify;
}

module.exports = {
  containsDevanagari,
  containsUrduScript,
  detectLanguageStyle,
  transliterateDevanagariBasic,
  enforceNoDevanagari,
  fallbackReplyForStyle,
};
