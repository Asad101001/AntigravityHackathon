'use strict';

/**
 * Urdu/Roman Urdu aware booking date-time resolver.
 * Dates are interpreted as Pakistan local time and emitted as real UTC Date objects.
 */

const PK_TZ = 'Asia/Karachi';

const RELATIVE_DATE_PATTERNS = [
  { offset: 3, confidence: 0.92, re: /\b(tarso|tarson|tarsoon|tarsoo)\b|تارسو/i },
  { offset: 2, confidence: 0.98, re: /\b(day after tomorrow|parso|parson|parsoon|parsoo)\b|پرسوں/i },
  { offset: 1, confidence: 0.98, re: /\b(tomorrow|kal|kall)\b|کل/i },
  { offset: 0, confidence: 0.98, re: /\b(today|aaj|aj|abhi|tonight|tonite)\b|آج|ابھی/i },
];

const PERIODS = [
  { slot: 'morning', hours: 9, minutes: 0, label: '9:00 AM', confidence: 0.86, re: /\b(morning|subah|subha|sawere|savera|fajr|pehle|pehli)\b|صبح/i },
  { slot: 'afternoon', hours: 14, minutes: 0, label: '2:00 PM', confidence: 0.84, re: /\b(afternoon|dopahar|dopehar|dopehir|dupehar|zohar|zuhr)\b|دوپہر/i },
  { slot: 'evening', hours: 18, minutes: 0, label: '6:00 PM', confidence: 0.84, re: /\b(evening|shaam|sham|maghrib|saam)\b|شام/i },
  { slot: 'night', hours: 20, minutes: 0, label: '8:00 PM', confidence: 0.82, re: /\b(night|raat|rat|late|der raat)\b|رات/i },
];

const IMMEDIATE_PATTERNS = /\b(now|right now|abhi|abhi hi|foran|jaldi|asap|emergency|urgent|immediately)\b|ابھی|فوراً|جلدی/i;

function _getPKTNow() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: PK_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(now).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
  return new Date(Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second || 0), 0
  ));
}

function _pktDateParts(reference = _getPKTNow()) {
  const ref = new Date(reference);
  return {
    year: ref.getUTCFullYear(),
    month: ref.getUTCMonth(),
    day: ref.getUTCDate(),
  };
}

function _getPKTDateTimeParts(reference = _getPKTNow()) {
  const ref = new Date(reference);
  return {
    year: ref.getUTCFullYear(),
    month: ref.getUTCMonth(),
    day: ref.getUTCDate(),
    hours: ref.getUTCHours(),
    minutes: ref.getUTCMinutes(),
  };
}

function _pktWallToUtcDate(year, monthIndex, day, hours = 9, minutes = 0) {
  // PKT is UTC+5 with no DST.
  return new Date(Date.UTC(year, monthIndex, day, hours - 5, minutes, 0, 0));
}

function _addDaysToParts(parts, days) {
  const d = new Date(Date.UTC(parts.year, parts.month, parts.day + days, 0, 0, 0, 0));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth(), day: d.getUTCDate() };
}

function normalizeText(input = '') {
  return String(input || '')
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\b([ap])\s*\.\s*m\s*\.?\b/g, '$1m')
    .replace(/\b([ap])\s*m\s*\.?\b/g, '$1m')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveBookingDateTime({ text = '', timePreference = '', reference = _getPKTNow(), defaultFuture = true } = {}) {
  const source = [timePreference, text].filter(Boolean).join(' ').trim();
  if (!source) {
    return _buildClarification('date_time', 'Aap kis din aur kis waqt service chahte hain?');
  }

  const normalized = normalizeText(source);
  const dateResult = _parseDate(normalized, reference);
  const timeResult = _parseTime(normalized) || _detectSlot(normalized);
  const periodResult = _detectPeriod(normalized);

  let finalDate = dateResult;
  let dateInferred = false;
  if (!finalDate) {
    const refParts = _pktDateParts(reference);
    finalDate = { parts: _addDaysToParts(refParts, defaultFuture ? 1 : 0), confidence: defaultFuture ? 0.45 : 0.35, label: defaultFuture ? 'tomorrow (inferred)' : 'today (inferred)' };
    dateInferred = true;
  }

  let finalTime = timeResult || periodResult;
  let timeInferred = false;
  if (!finalTime) {
    if (dateResult?.label === 'immediate') {
      finalTime = _currentImmediateTime(reference);
    } else {
      finalTime = { hours: 9, minutes: 0, label: '9:00 AM', confidence: 0.40, slot: 'default' };
    }
    timeInferred = true;
  }

  const date = _pktWallToUtcDate(finalDate.parts.year, finalDate.parts.month, finalDate.parts.day, finalTime.hours, finalTime.minutes);
  const confidence = Number((finalDate.confidence * finalTime.confidence).toFixed(3));
  const needsClarification = confidence < 0.45 || (dateInferred && timeInferred);

  return {
    ok: !needsClarification,
    date,
    scheduled_start_iso: date.toISOString(),
    dateLabel: _formatDateLabel(date),
    timeLabel: finalTime.label,
    timeIn24H: `${String(finalTime.hours).padStart(2, '0')}:${String(finalTime.minutes).padStart(2, '0')}`,
    timeIn12H: _formatTime12H(finalTime.hours, finalTime.minutes),
    timezone: PK_TZ,
    confidence,
    dateConfidence: finalDate.confidence,
    timeConfidence: finalTime.confidence,
    dateInferred,
    timeInferred,
    needs_clarification: needsClarification,
    clarification_prompt: needsClarification ? 'Aap kis din aur kis waqt service chahte hain?' : null,
    source_text: source,
    date_source: finalDate.label,
    time_source: finalTime.slot || finalTime.label,
  };
}

function parseDateTime(input = '', reference = _getPKTNow()) {
  if (!input || typeof input !== 'string') return null;
  const resolved = resolveBookingDateTime({ text: input, reference, defaultFuture: false });
  if (!resolved || (resolved.dateInferred && resolved.timeInferred)) return null;
  return {
    date: resolved.date,
    dateLabel: resolved.dateLabel,
    timeLabel: resolved.timeLabel,
    timeIn24H: resolved.timeIn24H,
    timeIn12H: resolved.timeIn12H,
    confidence: resolved.confidence,
    timezone: resolved.timezone,
    needs_clarification: resolved.needs_clarification,
  };
}

function _buildClarification(field, prompt) {
  return { ok: false, needs_clarification: true, ambiguity: { field }, clarification_prompt: prompt, confidence: 0 };
}

function _parseDate(input, reference = _getPKTNow()) {
  const refParts = _pktDateParts(reference);

  if (IMMEDIATE_PATTERNS.test(input)) {
    return { parts: refParts, confidence: 0.99, label: 'immediate' };
  }

  for (const item of RELATIVE_DATE_PATTERNS) {
    if (item.re.test(input)) {
      return { parts: _addDaysToParts(refParts, item.offset), confidence: item.confidence, label: `relative+${item.offset}` };
    }
  }

  const inDays = input.match(/\b(?:in|after)\s+(\d{1,2})\s+days?\b/i) || input.match(/\b(\d{1,2})\s+din\s+(?:baad|bad)\b/i);
  if (inDays) {
    return { parts: _addDaysToParts(refParts, Number(inDays[1])), confidence: 0.9, label: `in ${inDays[1]} days` };
  }

  if (/\b(next week|agla hafta|aglay haftay|aglay hafte)\b/i.test(input)) {
    return { parts: _addDaysToParts(refParts, 7), confidence: 0.86, label: 'next week' };
  }

  if (/\b(weekend|haftay ke end|haftay kay end)\b/i.test(input)) {
    const day = new Date(Date.UTC(refParts.year, refParts.month, refParts.day)).getUTCDay();
    let add = 6 - day;
    if (add <= 0) add += 7;
    return { parts: _addDaysToParts(refParts, add), confidence: 0.82, label: 'weekend' };
  }

  const nextWeekday = input.match(/\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
  const weekday = nextWeekday || input.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
  if (weekday) {
    const target = _getDayOfWeekNumber(weekday[1]);
    const current = new Date(Date.UTC(refParts.year, refParts.month, refParts.day)).getUTCDay();
    let add = target - current;
    if (add <= 0 || nextWeekday) add += 7;
    return { parts: _addDaysToParts(refParts, add), confidence: nextWeekday ? 0.93 : 0.84, label: weekday[1] };
  }

  const monthDate = input.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:\s+(\d{4}))?\b/i);
  if (monthDate) {
    const month = _getMonthNumber(monthDate[1]);
    const day = Number(monthDate[2]);
    let year = monthDate[3] ? Number(monthDate[3]) : refParts.year;
    let parts = { year, month, day };
    const candidate = _pktWallToUtcDate(parts.year, parts.month, parts.day, 0, 0);
    const ref = _pktWallToUtcDate(refParts.year, refParts.month, refParts.day, 0, 0);
    if (!monthDate[3] && candidate < ref) parts = { ...parts, year: year + 1 };
    return { parts, confidence: 0.94, label: 'specific date' };
  }

  const numDate = input.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}))?\b/);
  if (numDate) {
    const day = Number(numDate[1]);
    const month = Number(numDate[2]) - 1;
    let year = numDate[3] ? Number(numDate[3]) : refParts.year;
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      let parts = { year, month, day };
      const candidate = _pktWallToUtcDate(parts.year, parts.month, parts.day, 0, 0);
      const ref = _pktWallToUtcDate(refParts.year, refParts.month, refParts.day, 0, 0);
      if (!numDate[3] && candidate < ref) parts = { ...parts, year: year + 1 };
      return { parts, confidence: 0.92, label: 'numeric date' };
    }
  }

  if (_parseTime(input) || _detectPeriod(input)) {
    return { parts: refParts, confidence: 0.48, label: 'today inferred from time-only' };
  }

  return null;
}

function _parseTime(input) {
  const lower = normalizeText(input);
  const standard = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.?m\.?|p\.?m\.?)\b/i);
  if (standard) {
    return _buildClock(Number(standard[1]), Number(standard[2] || '0'), standard[3], 0.98, 'explicit_ampm');
  }

  // Spoken Urdu/Roman Urdu hours often arrive as words without "baje"
  // e.g. "paanch", "aik", "teen".
  const wordHour = lower.match(/\b(aik|ek|one|do|two|teen|three|chaar|char|four|paanch|panch|five|che|six|saat|sat|seven|aath|ath|eight|nau|no|nine|das|ten|gyaarah|gyarah|eleven|baarah|barah|twelve)\b/i);
  if (wordHour) {
    const hour = _wordHourToNumber(wordHour[1]);
    if (hour !== null) {
      return _inferAmbiguousHour(hour, 0, lower, 0.79, 'word_hour');
    }
  }

  const time24 = lower.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (time24) {
    const hours = Number(time24[1]);
    const minutes = Number(time24[2]);
    return { hours, minutes, label: _formatTime12H(hours, minutes), confidence: 0.94, slot: '24h' };
  }

  const halfPast = lower.match(/\b(saarhay|saare|sarhay|saray)\s+(\d{1,2})\b/i);
  if (halfPast) {
    return _inferAmbiguousHour(Number(halfPast[2]), 30, lower, 0.84, 'half_past');
  }

  const quarterTo = lower.match(/\b(paunay|pounay|poney|paune)\s+(\d{1,2})\b/i);
  if (quarterTo) {
    let hour = Number(quarterTo[2]) - 1;
    if (hour <= 0) hour = 12;
    return _inferAmbiguousHour(hour, 45, lower, 0.82, 'quarter_to');
  }

  const quarterPast = lower.match(/\b(sawa|savaa)\s+(\d{1,2})\b/i);
  if (quarterPast) {
    return _inferAmbiguousHour(Number(quarterPast[2]), 15, lower, 0.82, 'quarter_past');
  }

  const baje = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(?:baje|bajay|bajah|bjay|بجے)\b/i);
  if (baje) {
    return _inferAmbiguousHour(Number(baje[1]), Number(baje[2] || '0'), lower, 0.88, 'roman_urdu_clock');
  }

  return null;
}

function _buildClock(hours, minutes, period, confidence, slot) {
  let h = hours;
  const normalizedPeriod = String(period || '').toUpperCase().replace(/\./g, '');
  if (normalizedPeriod === 'PM' && h < 12) h += 12;
  if (normalizedPeriod === 'AM' && h === 12) h = 0;
  if (h >= 0 && h < 24 && minutes >= 0 && minutes < 60) {
    return { hours: h, minutes, label: _formatTime12H(h, minutes), confidence, slot };
  }
  return null;
}

function _inferAmbiguousHour(hour, minutes, input, confidence, slot) {
  if (!Number.isFinite(hour) || hour < 0 || hour > 24 || minutes < 0 || minutes >= 60) return null;
  let h = hour;
  if (h > 12) return { hours: h, minutes, label: _formatTime12H(h, minutes), confidence, slot };
  if (_periodName(input) === 'pm' && h !== 12) h += 12;
  if (_periodName(input) === 'am' && h === 12) h = 0;
  if (!_periodName(input)) {
    if (h >= 1 && h <= 7) h += 12;
    if (h === 12 && /raat|night/i.test(input)) h = 0;
  }
  return { hours: h, minutes, label: _formatTime12H(h, minutes), confidence, slot };
}

function _periodName(input) {
  if (/\b(subah|subha|morning|fajr|sawere)\b|صبح/i.test(input)) return 'am';
  if (/\b(dopahar|dopehar|afternoon|zohar|shaam|sham|evening|raat|night|maghrib)\b|دوپہر|شام|رات/i.test(input)) return 'pm';
  return null;
}

function _detectPeriod(input) {
  return PERIODS.find((period) => period.re.test(input)) || null;
}

function _detectSlot(input) {
  return _detectPeriod(input);
}

function _getDayOfWeekNumber(dayName) {
  const days = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
  return days[String(dayName || '').toLowerCase()] ?? 0;
}

function _getMonthNumber(monthName) {
  const months = { january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2, april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6, august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9, november: 10, nov: 10, december: 11, dec: 11 };
  return months[String(monthName || '').toLowerCase()] ?? 0;
}

function _wordHourToNumber(word) {
  const map = {
    aik: 1, ek: 1, one: 1,
    do: 2, two: 2,
    teen: 3, three: 3,
    chaar: 4, char: 4, four: 4,
    paanch: 5, panch: 5, five: 5,
    che: 6, six: 6,
    saat: 7, sat: 7, seven: 7,
    aath: 8, ath: 8, eight: 8,
    nau: 9, no: 9, nine: 9,
    das: 10, ten: 10,
    gyaarah: 11, gyarah: 11, eleven: 11,
    baarah: 12, barah: 12, twelve: 12,
  };
  const normalized = String(word || '').toLowerCase();
  return map[normalized] ?? null;
}

function _formatTime12H(hours24, minutes) {
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
}

function _formatDateLabel(date) {
  return new Intl.DateTimeFormat('en-PK', {
    timeZone: PK_TZ,
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  }).format(date);
}

function _currentImmediateTime(reference = _getPKTNow()) {
  const parts = _getPKTDateTimeParts(reference);
  const roundedMinutes = Math.ceil(parts.minutes / 15) * 15;
  let hours = parts.hours;
  let minutes = roundedMinutes;
  if (minutes >= 60) {
    hours = (hours + 1) % 24;
    minutes = 0;
  }
  const label = _formatTime12H(hours, minutes);
  return { hours, minutes, label, confidence: 0.92, slot: 'immediate' };
}

function parseTimePreference(timePreference = '') {
  if (!timePreference || typeof timePreference !== 'string') return null;
  return _parseTime(timePreference) || _detectPeriod(normalizeText(timePreference));
}

module.exports = {
  parseDateTime,
  parseTimePreference,
  resolveBookingDateTime,
  normalizeText,
  _getPKTNow,
  _parseDate,
  _parseTime,
  _detectSlot,
};
