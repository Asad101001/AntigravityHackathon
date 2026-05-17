/**
 * Agent 1: IntentParserAgent
 * Extracts service_type, location, time_preference from raw user text
 * Supports Roman Urdu, Urdu, and English
 */

const BaseAgent = require('./BaseAgent');
const { tokenize } = require('../utils/textTokenizer');
const { findLocationCandidate } = require('../utils/locationNormalizer');
const dataStore = require('../dataStore');

class IntentParserAgent extends BaseAgent {
  constructor() {
    super('parse_intent', 1);
  }

  async execute(context) {
    const text = (context.user_text || '').toLowerCase().trim();
    const tokenized = tokenize(context.user_text || '');
    const keywords = await dataStore.getKeywords();
    
    if (!text) {
      return {
        input: context.user_text,
        output: { service_type: null, location: null, time_preference: null, confidence: 0 },
        reasoning: 'Empty input received.',
        contextUpdates: { service_type: null, location: null, time_preference: null, confidence: 0 }
      };
    }

    // ── Detect Language ──
    const language = this._detectLanguage(text);

    // ── Parse Service Type ──
    const service = this._parseService(text, keywords);

    // ── Parse Location ──
    const locationCandidate = await this._parseLocation(text);
    const location = locationCandidate?.canonical || null;

    // ── Parse Time Preference ──
    const time = this._parseTime(text, keywords);

    // ── Detect Urgency ──
    const urgency = this._detectUrgency(text, keywords);

    // ── Calculate Confidence ──
    let confidence = 0;
    let found = 0;
    if (service) found++;
    if (location) found++;
    if (time) found++;
    
    if (found === 3) confidence = 0.92;
    else if (found === 2) confidence = 0.75;
    else if (found === 1) confidence = 0.50;
    else confidence = 0.20;

    // Boost confidence if urgency detected
    if (urgency === 'high' && service) confidence = Math.min(confidence + 0.05, 0.99);

    const reasoning = this._buildReasoning(service, location, time, language, urgency);

    return {
      input: context.user_text,
      output: { service_type: service, location, location_candidate: locationCandidate, tokens: tokenized.tokens, time_preference: time, confidence, language, urgency },
      reasoning,
      contextUpdates: {
        service_type: service,
        location,
        location_candidate: locationCandidate,
        tokens: tokenized.tokens,
        tokenized_input: tokenized,
        time_preference: time,
        confidence,
        language,
        urgency
      }
    };
  }

  _detectLanguage(text) {
    // Check for Urdu script characters
    if (/[\u0600-\u06FF]/.test(text)) return 'urdu';
    // Check for Roman Urdu indicators
    const romanUrduWords = ['chahiye', 'chahye', 'chaiye', 'zaroorat', 'kal', 'subah', 'shaam', 'abhi', 'mein', 'wala', 'karo', 'bulao'];
    for (const word of romanUrduWords) {
      if (text.includes(word)) return 'roman_urdu';
    }
    return 'english';
  }

  _parseService(text, keywords) {
    for (const [key, serviceData] of Object.entries(keywords.services || {})) {
      for (const kw of serviceData.keywords || []) {
        // Word boundary matching for better accuracy
        const regex = new RegExp(`\\b${this._escapeRegex(kw)}\\b`, 'i');
        if (regex.test(text)) {
          return serviceData.canonical;
        }
      }
    }
    // Fuzzy fallback: check if any keyword is a substring
    for (const [key, serviceData] of Object.entries(keywords.services || {})) {
      for (const kw of serviceData.keywords || []) {
        if (kw.length >= 3 && text.includes(kw)) {
          return serviceData.canonical;
        }
      }
    }
    return null;
  }

  async _parseLocation(text) {
    const fuzzyCandidate = await findLocationCandidate(text, { minConfidence: 0.58 });
    if (fuzzyCandidate) {
      return fuzzyCandidate;
    }

    // Also check for sector patterns like G-11, F-8, I-9
    const sectorMatch = text.match(/\b([gfiGFI][\s-]?\d{1,2})\b/i);
    if (sectorMatch) {
      let sector = sectorMatch[1].toUpperCase().replace(/\s+/, '-');
      if (!sector.includes('-')) {
        sector = sector[0] + '-' + sector.slice(1);
      }
      return (await findLocationCandidate(sector, { minConfidence: 0.5 })) || {
        canonical: sector,
        area: sector,
        city: null,
        confidence: 0.62,
        matched_query: sector
      };
    }

    return null;
  }

  _parseTime(text, keywords) {
    // Check multi-word time expressions first (longer matches first)
    const sortedEntries = Object.entries(keywords.time_expressions || {})
      .sort(([, a], [, b]) => {
        const maxA = Math.max(...a.keywords.map(k => k.length));
        const maxB = Math.max(...b.keywords.map(k => k.length));
        return maxB - maxA;
      });

    for (const [timeKey, timeData] of sortedEntries) {
      for (const kw of timeData.keywords || []) {
        if (text.includes(kw.toLowerCase())) {
          return timeKey;
        }
      }
    }
    return null;
  }

  _detectUrgency(text, keywords) {
    for (const indicator of keywords.urgency_indicators || []) {
      if (text.includes(indicator)) return 'high';
    }
    return 'normal';
  }

  _buildReasoning(service, location, time, language, urgency) {
    const parts = [];
    parts.push(`Language: ${language} detected.`);
    if (service) parts.push(`Matched service keyword: "${service}".`);
    else parts.push('Service type could not be determined.');
    if (location) parts.push(`Area matched after tokenized/fuzzy parsing: "${location}".`);
    else parts.push('Location not specified.');
    if (time) parts.push(`Time preference: ${time.replace(/_/g, ' ')}.`);
    else parts.push('Time not specified, defaulting to earliest available.');
    if (urgency === 'high') parts.push('Urgency: HIGH — user needs immediate service.');
    return parts.join(' ');
  }

  _escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

module.exports = IntentParserAgent;


