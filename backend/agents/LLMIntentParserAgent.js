const BaseAgent = require('./BaseAgent');
const LLMClient = require('../llm/LLMClient');
const IntentParserAgent = require('./IntentParserAgent');
const { findLocationCandidate, normalizeLocation } = require('../utils/locationNormalizer');
const { withRetry } = require('../utils/retryHelper');
const { parseDateTime } = require('../utils/dateTimeParser');

const GEOCODING_ENDPOINT = 'https://maps.googleapis.com/maps/api/geocode/json';

class LLMIntentParserAgent extends BaseAgent {
  constructor() {
    super('parse_intent', 1);
    this.llm = new LLMClient();
    this.fallback = new IntentParserAgent();
    this.apiKey = process.env.MAPS_API_KEY || null;
  }

  async execute(context) {
    const userText = context.user_text || '';
    if (!userText.trim()) {
      return this.fallback.execute(context);
    }

    const system = [
      'You are a multilingual intent parser for a Pakistani home-services booking app.',
      'The user may write in English, Roman Urdu, or Urdu script.',
      'Extract the booking intent and return ONLY a valid JSON object — no markdown, no explanation, no preamble.',
      'JSON schema:',
      '{',
      '  "service_type": string | null,  // canonical: Electrician|Plumber|AC Technician|Carpenter|Painter|Handyman|Maid|Car Mechanic|Cleaning Lady|Hairdresser|Salon',
      '  "location": string | null,       // area or city name as written by user',
      '  "time_preference": string | null, // e.g. "today_morning","tomorrow","tomorrow_afternoon","today_2pm","today_now","weekend". IMPORTANT: If user mentions a specific time like "2pm" or "14:00", include it in the time_preference (e.g., "tomorrow_2pm" not just "tomorrow")',
      '  "urgency_level": "high" | "low",  // high if user uses urgent/abhi/foran/emergency/jaldi',
      '  "price_sensitivity": "high" | "low" | "neutral", // high if user mentions cheap/sasta/budget; low if premium/achha',
      '  "confidence": number,             // 0.0–1.0 how confident you are in the parse',
      '  "language": "english" | "roman_urdu" | "urdu" | "mixed",',
      '  "reasoning": string               // one sentence explaining your parse',
      '}',
      'If a field cannot be determined, set it to null.',
      'Recognize informal Pakistani service phrases natively: maid/masi/kaam wali/bai -> Maid; cleaning lady/safai wali -> Cleaning Lady; mechanic/car mechanic/gaari mechanic -> Car Mechanic; hairdresser/salon/parlour/barber -> Hairdresser or Salon based on wording.',
      'Preserve the frontend-selected city outside this JSON; only put area/city in "location" when the user actually typed it.',
      'Do NOT wrap the JSON in ```json``` or any other delimiters.'
    ].join('\n');

    try {
      // Use the new completeJSON method which handles parsing and retries automatically
      const parsed = await this.llm.completeJSON({
        system,
        user: userText
      });

      const service = parsed.service_type || null;
      const locationResolution = await this._normalizeParsedLocation(parsed.location, context);
      const location = locationResolution.location;
      let time = parsed.time_preference || null;
      
      // Enhanced date/time parsing: try to extract specific time if not already in time_preference
      if (!time || !time.includes('_')) {
        const parsedDateTime = parseDateTime(userText);
        if (parsedDateTime) {
          // Build a more specific time_preference string
          time = _buildTimePreferenceString(userText, parsedDateTime);
        }
      }
      
      const urgency = parsed.urgency_level === 'high' ? 'high' : 'normal';
      const priceSensitivity = parsed.price_sensitivity || 'neutral';
      const confidence = typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.75;
      const language = parsed.language || 'mixed';
      const locationReason = locationResolution.reasoning ? ` ${locationResolution.reasoning}` : '';
      const reasoning = `${parsed.reasoning || `LLM parsed intent from: "${userText.slice(0, 60)}"`}${locationReason}`;

      return {
        input: userText,
        output: { service_type: service, location, time_preference: time, urgency_level: urgency, price_sensitivity: priceSensitivity, confidence, language, reasoning },
        reasoning,
        contextUpdates: {
          service_type: service,
          location,
          time_preference: time,
          confidence,
          language,
          urgency,
          urgency_level: urgency,
          price_sensitivity: priceSensitivity,
          llm_intent_reasoning: reasoning,
          llm_location_cache_source: locationResolution.source,
          llm_location_candidate: locationResolution.candidate || null,
          llm_provider: 'primary_llm'
        }
      };
    } catch (err) {
      console.warn('[LLMIntentParser] LLM parse failed, falling back to regex:', err.message);
      return this.fallback.execute(context);
    }
  }

  async _normalizeParsedLocation(location, context) {
    const text = String(location || '').trim();
    if (!text) return { location: null, source: 'none', reasoning: '' };

    const selectedCity = context.city || context.explicit_city || context.selected_city || null;
    const local = (await findLocationCandidate(text, {
      minConfidence: 0.52,
      city: selectedCity,
    })) || (await findLocationCandidate(text, { minConfidence: 0.58 }));

    if (local && !local.cityOnly) {
      return {
        location: local.coords.area_name || text,
        source: 'local_json_cache',
        candidate: { city: local.city, area: local.area, confidence: local.confidence },
        reasoning: `Location cache normalized "${text}" to "${local.coords.area_name}" before resolver execution.`,
      };
    }

    if (local?.cityOnly) {
      return {
        location: local.city,
        source: 'local_json_city_cache',
        candidate: { city: local.city, confidence: local.confidence },
        reasoning: `Location cache recognized "${text}" as city-level only; resolver will prefer GPS for neighborhood precision when available.`,
      };
    }

    if (this.apiKey) {
      const geocoded = await this._geocodeAreaName(text, selectedCity);
      if (geocoded) {
        return {
          location: geocoded.area_name,
          source: 'geocoding_api',
          candidate: geocoded,
          reasoning: `Google Geocoding normalized "${text}" because the local cache had no area match.`,
        };
      }
    }

    return {
      location: text,
      source: 'llm_raw_location',
      reasoning: `No local cache match${this.apiKey ? ' or geocoding match' : ''} was found for "${text}"; preserving the LLM text for LocationResolverAgent fallback.`,
    };
  }

  async _geocodeAreaName(locationString, city) {
    const query = [locationString, city, 'Pakistan'].filter(Boolean).join(', ');
    const url = `${GEOCODING_ENDPOINT}?address=${encodeURIComponent(query)}&components=country:PK&key=${this.apiKey}&language=en`;

    let data;
    try {
      data = await withRetry(async () => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Intent geocoding HTTP ${res.status}`);
        return res.json();
      }, { maxAttempts: 2, label: 'IntentGeocoding' });
    } catch (err) {
      console.warn('[LLMIntentParser] Location geocoding failed:', err.message);
      return null;
    }

    if (data?.status !== 'OK' || !data.results?.length) return null;
    const best = data.results[0];
    const areaName = this._extractComponent(best.address_components, [
      'neighborhood',
      'sublocality_level_1',
      'sublocality',
      'route',
    ]) || best.formatted_address;
    const resolvedCity = this._extractComponent(best.address_components, ['locality', 'administrative_area_level_2'])
      || this._extractComponent(best.address_components, ['administrative_area_level_1'])
      || city
      || null;

    return {
      area_name: areaName,
      city: resolvedCity,
      place_id: best.place_id,
      normalized_query: normalizeLocation(locationString),
    };
  }

  _extractComponent(components = [], types = []) {
    for (const type of types) {
      const found = components.find(component => component.types?.includes(type));
      if (found) return found.long_name;
    }
    return null;
  }

}

/**
 * Build a detailed time preference string from parsed date/time info
 * @private
 */
function _buildTimePreferenceString(userText, parsedDateTime) {
  if (!parsedDateTime) return null;

  let prefix = '';
  userText = userText.toLowerCase();

  // Determine date prefix
  if (/\btomorrow\b/.test(userText)) {
    prefix = 'tomorrow';
  } else if (/\b(today|tonight|tonite)\b/.test(userText)) {
    prefix = 'today';
  } else if (/day after tomorrow/.test(userText)) {
    prefix = 'day_after_tomorrow';
  } else {
    // Fallback based on date
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (parsedDateTime.date.toDateString() === now.toDateString()) {
      prefix = 'today';
    } else if (parsedDateTime.date.toDateString() === tomorrow.toDateString()) {
      prefix = 'tomorrow';
    } else {
      // Just return the parsed time with time only
      return `specific_time_${parsedDateTime.timeIn24H.replace(':', '')}`;
    }
  }

  // Determine time slot suffix
  const hours = parsedDateTime.date.getHours();
  let suffix = '';

  if (hours >= 5 && hours < 12) {
    suffix = '_morning';
  } else if (hours >= 12 && hours < 17) {
    suffix = '_afternoon';
  } else if (hours >= 17 && hours < 21) {
    suffix = '_evening';
  } else if (hours >= 21 || hours < 5) {
    suffix = '_night';
  }

  // Include specific time if it's precise
  if (parsedDateTime.timeIn24H !== '09:00') {
    suffix = `_${parsedDateTime.timeIn24H.replace(':', '')}`;
  }

  return prefix + suffix;
}

module.exports = LLMIntentParserAgent;
