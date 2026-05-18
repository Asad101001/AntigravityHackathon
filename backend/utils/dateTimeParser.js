/**
 * Comprehensive date and time parser for booking requests
 * Handles relative dates (tomorrow, next week, etc.) and specific times (2 pm, 14:00, etc.)
 */

/**
 * Parse a date and time string into a Date object
 * Supports:
 *   - Relative dates: "today", "tomorrow", "day after tomorrow", "next Monday", etc.
 *   - Specific dates: "May 20", "20/05/2026", "2026-05-20", etc.
 *   - Time expressions: "2 pm", "14:00", "1430", "2:30 AM", etc.
 * 
 * @param {string} input - User input text
 * @param {Date} reference - Reference date (default: now)
 * @returns {object|null} - { date: Date, time: string, confidence: number } or null if no parse
 */
function parseDateTime(input = '', reference = new Date()) {
  if (!input || typeof input !== 'string') return null;

  input = input.toLowerCase().trim();
  const referenceDate = new Date(reference);
  referenceDate.setHours(0, 0, 0, 0);

  // Parse date first
  const dateResult = _parseDate(input, referenceDate);
  if (!dateResult) return null;

  // Parse time from input
  const timeResult = _parseTime(input);
  if (!timeResult) return null;

  // Combine date and time
  const resultDate = new Date(dateResult.date.getTime()); // Create a copy
  resultDate.setHours(timeResult.hours, timeResult.minutes, 0, 0);

  return {
    date: resultDate,
    dateLabel: _formatDateLabel(resultDate),
    timeLabel: timeResult.label,
    timeIn24H: `${String(timeResult.hours).padStart(2, '0')}:${String(timeResult.minutes).padStart(2, '0')}`,
    timeIn12H: _formatTime12H(timeResult.hours, timeResult.minutes),
    confidence: dateResult.confidence * timeResult.confidence
  };
}

/**
 * Parse only the date part (without time)
 * @private
 */
function _parseDate(input, reference) {
  let date = new Date(reference);
  let confidence = 1.0;

  // Check relative dates first (higher confidence if explicit match)
  if (/\btomorrow\b/.test(input)) {
    date.setDate(date.getDate() + 1);
    return { date: new Date(date), confidence: 0.98 };
  }

  if (/\bday after tomorrow\b/.test(input)) {
    date.setDate(date.getDate() + 2);
    return { date: new Date(date), confidence: 0.98 };
  }

  if (/\btoday\b|\btonite\b|\btonight\b/.test(input)) {
    return { date: new Date(date), confidence: 0.98 };
  }

  // Check for "next [day]" pattern (e.g., "next Monday", "next Friday")
  const nextDayMatch = input.match(/\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
  if (nextDayMatch) {
    const targetDay = _getDayOfWeekNumber(nextDayMatch[1]);
    const currentDay = date.getDay();
    let daysToAdd = targetDay - currentDay;
    if (daysToAdd <= 0) daysToAdd += 7;
    date.setDate(date.getDate() + daysToAdd);
    return { date: new Date(date), confidence: 0.95 };
  }

  // Check for "[day]" patterns (e.g., "Monday", "Friday")
  const dayMatch = input.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
  if (dayMatch) {
    const targetDay = _getDayOfWeekNumber(dayMatch[1]);
    const currentDay = date.getDay();
    let daysToAdd = targetDay - currentDay;
    if (daysToAdd < 0) daysToAdd += 7;
    if (daysToAdd === 0) daysToAdd = 7; // If today, they probably mean next week's same day
    date.setDate(date.getDate() + daysToAdd);
    return { date: new Date(date), confidence: 0.85 };
  }

  // Check for "in X days" pattern
  const inDaysMatch = input.match(/\bin\s+(\d{1,2})\s+days?\b/i);
  if (inDaysMatch) {
    const days = parseInt(inDaysMatch[1], 10);
    date.setDate(date.getDate() + days);
    return { date: new Date(date), confidence: 0.92 };
  }

  // Check for "this week/month/weekend" patterns
  if (/\bthis week\b/i.test(input)) {
    // Already in this week
    return { date: new Date(date), confidence: 0.70 };
  }

  if (/\bweekend\b/i.test(input)) {
    // Find next Saturday
    const currentDay = date.getDay();
    let daysToAdd = 6 - currentDay; // Saturday
    if (daysToAdd <= 0) daysToAdd += 7;
    date.setDate(date.getDate() + daysToAdd);
    return { date: new Date(date), confidence: 0.80 };
  }

  // Check for specific date formats
  // Format: "May 20", "20 May", "May 20 2026", etc.
  const monthDate = input.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:\s+(\d{4}))?\b/i);
  if (monthDate) {
    const monthNum = _getMonthNumber(monthDate[1]);
    const day = parseInt(monthDate[2], 10);
    const year = monthDate[3] ? parseInt(monthDate[3], 10) : reference.getFullYear();
    date = new Date(year, monthNum, day, 0, 0, 0, 0);
    return { date: new Date(date), confidence: 0.96 };
  }

  // Format: "20/05", "20/05/2026", "20-05-2026", etc.
  const numDate = input.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}))?\b/);
  if (numDate) {
    const day = parseInt(numDate[1], 10);
    const month = parseInt(numDate[2], 10) - 1; // Month is 0-indexed
    const year = numDate[3] ? parseInt(numDate[3], 10) : reference.getFullYear();
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      date = new Date(year, month, day, 0, 0, 0, 0);
      return { date: new Date(date), confidence: 0.96 };
    }
  }

  // If no date keyword found, assume "as soon as possible" (today or tomorrow)
  // Only return a default if there's a time specified
  if (_parseTime(input)) {
    return { date: new Date(date), confidence: 0.50 }; // Low confidence for default date
  }

  return null;
}

/**
 * Parse only the time part (without date)
 * @private
 */
function _parseTime(input) {
  // Standard time format: "2 pm", "2:30 PM", "14:00", "1430", etc.
  // This regex covers: 1-2 digits, optional colon + 2 digits, optional spaces, am/pm
  const timeRegex = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)\b/i;
  const match = input.match(timeRegex);
  
  if (!match) {
    // Try 24-hour format without am/pm: "14:00", "1400", "14" (standalone won't work without context)
    const time24Regex = /\b([01]?\d):([0-5]\d)\b/;
    const match24 = input.match(time24Regex);
    if (match24) {
      const hours = parseInt(match24[1], 10);
      const minutes = parseInt(match24[2], 10);
      if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
        return {
          hours,
          minutes,
          label: _formatTime12H(hours, minutes),
          confidence: 0.95
        };
      }
    }
    return null;
  }

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2] || '0', 10);
  const period = (match[3] || '').toUpperCase().replace(/\./g, '');

  // Convert to 24-hour format
  if (period === 'PM' || period === 'P.M') {
    if (hours !== 12) hours += 12;
  } else if (period === 'AM' || period === 'A.M') {
    if (hours === 12) hours = 0;
  }

  if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
    return {
      hours,
      minutes,
      label: _formatTime12H(hours, minutes),
      confidence: 0.98
    };
  }

  return null;
}

/**
 * Helper: Get day of week number (0 = Sunday)
 * @private
 */
function _getDayOfWeekNumber(dayName) {
  const days = {
    sunday: 0, sunday: 0,
    monday: 1, mon: 1, monday: 1,
    tuesday: 2, tue: 2, tuesday: 2,
    wednesday: 3, wed: 3, wednesday: 3,
    thursday: 4, thu: 4, thursday: 4,
    friday: 5, fri: 5, friday: 5,
    saturday: 6, sat: 6, saturday: 6
  };
  return days[dayName.toLowerCase()] || 0;
}

/**
 * Helper: Get month number (0-11)
 * @private
 */
function _getMonthNumber(monthName) {
  const months = {
    january: 0, jan: 0,
    february: 1, feb: 1,
    march: 2, mar: 2,
    april: 3, apr: 3,
    may: 4, may: 4,
    june: 5, jun: 5,
    july: 6, jul: 6,
    august: 7, aug: 7,
    september: 8, sep: 8, sept: 8,
    october: 9, oct: 9,
    november: 10, nov: 10,
    december: 11, dec: 11
  };
  return months[monthName.toLowerCase()] || 0;
}

/**
 * Helper: Format time in 12-hour format
 * @private
 */
function _formatTime12H(hours24, minutes) {
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
}

/**
 * Helper: Format date label
 * @private
 */
function _formatDateLabel(date) {
  return date.toLocaleDateString('en-PK', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Parse time preference string from intent parser and convert to time of day
 * Examples: "morning" -> "09:00", "afternoon" -> "14:00", "evening" -> "18:00"
 * @param {string} timePreference - e.g., "tomorrow_morning", "today_afternoon", "evening"
 * @returns {object|null} - { hours, minutes, label } or null
 */
function parseTimePreference(timePreference = '') {
  if (!timePreference || typeof timePreference !== 'string') return null;

  const lower = timePreference.toLowerCase();

  // Morning: 7 AM - 12 PM
  if (/morning|subah|pehle|early/.test(lower)) {
    return { hours: 9, minutes: 0, label: '9:00 AM', slot: 'morning' };
  }

  // Afternoon: 12 PM - 5 PM
  if (/afternoon|dopehir|dohr/.test(lower)) {
    return { hours: 14, minutes: 0, label: '2:00 PM', slot: 'afternoon' };
  }

  // Evening: 5 PM - 8 PM
  if (/evening|shaam|sham|night|night|raat|later/.test(lower)) {
    return { hours: 18, minutes: 0, label: '6:00 PM', slot: 'evening' };
  }

  // Night: 8 PM - 11 PM
  if (/night|raat|late/.test(lower)) {
    return { hours: 20, minutes: 0, label: '8:00 PM', slot: 'night' };
  }

  // ASAP: Now or very soon
  if (/now|asap|urgent|foran|jaldi|abhi/.test(lower)) {
    return { hours: new Date().getHours(), minutes: new Date().getMinutes(), label: 'ASAP', slot: 'now' };
  }

  return null;
}

module.exports = {
  parseDateTime,
  parseTimePreference,
  _parseDate, // Exported for testing
  _parseTime, // Exported for testing
};
