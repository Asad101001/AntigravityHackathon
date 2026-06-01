export const DEVANAGARI_RE = /[\u0900-\u097F]/;
export const URDU_RE = /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

export function containsDevanagari(text = '') {
  return DEVANAGARI_RE.test(String(text || ''));
}

export function detectLanguageStyle(text = '') {
  const value = String(text || '');
  if (containsDevanagari(value)) return 'blocked_devanagari';
  if (URDU_RE.test(value)) return 'urdu';
  const romanMatches = [
    /\b(mujhe|mujhay|mjy|mere|meri|mera|main|mein)\b/i,
    /\b(chahiye|chaiye|zaroorat|kal|aaj|parso|subah|shaam|raat|baje|bajay)\b/i,
    /\b(bijli|pani|paani|kaam|karwana|theek|nahi|haan)\b/i,
  ].filter((pattern) => pattern.test(value)).length;
  if (romanMatches >= 2) return 'roman_urdu';
  if (romanMatches === 1) return 'mixed';
  return 'english';
}

export function fallbackReplyForStyle(style, key = 'offline') {
  const roman = {
    offline: 'Backend se connection nahi ho raha, is liye booking status confirm nahi kar sakta.',
    pending: 'Request provider ko bhej di gayi hai. Provider accept karega to booking confirm hogi.',
    noBooking: 'Pehle Home se service request bhej dein, phir main booking mein madad kar sakta hoon.',
  };
  const english = {
    offline: 'I cannot confirm the booking status because the backend is unreachable.',
    pending: 'Your request has been sent to the provider. It will be confirmed after the provider accepts.',
    noBooking: 'Please submit a service request from Home first, then I can help with the booking.',
  };
  return (['roman_urdu', 'urdu', 'mixed'].includes(style) ? roman : english)[key] || english.offline;
}
