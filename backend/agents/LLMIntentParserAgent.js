/**
 * Agent 1: LLMIntentParserAgent
 *
 * Primary intent parser using an LLM for multilingual understanding (English,
 * Roman Urdu, Urdu script, mixed). Falls back to the local regex-based
 * IntentParserAgent if the LLM is unavailable or returns unusable output.
 *
 * Architecture:
 *   - The LLM is asked to parse intent into a clean JSON structure.
 *   - The LLM's raw time_preference string ("kal subah 9 baje") is then passed
 *     to the local dateTimeParser which converts it into a canonical ISO-friendly
 *     timestamp. This way the LLM handles language nuance; the local parser
 *     handles date math. Neither is abandoned.
 *   - Location extracted by the LLM is pre-validated against the local catalog
 *     before being passed to LocationResolverAgent, so the resolver starts with
 *     better data.
 *   - Confidence is calculated from the LLM's own self-assessment, cross-checked
 *     with what we could actually resolve.
 */

const BaseAgent = require('./BaseAgent');
const LLMClient = require('../llm/LLMClient');
const IntentParserAgent = require('./IntentParserAgent');
const db = require('../db');
const { findLocationCandidate, normalizeLocation } = require('../utils/locationNormalizer');
const { withRetry } = require('../utils/retryHelper');
const { resolveBookingDateTime } = require('../utils/dateTimeParser');

const GEOCODING_ENDPOINT = 'https://maps.googleapis.com/maps/api/geocode/json';

class LLMIntentParserAgent extends BaseAgent {
  constructor() {
    super('parse_intent', 1);
    this.llm = new LLMClient();
    this.fallback = new IntentParserAgent();
    this.apiKey = process.env.MAPS_API_KEY || null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Entry point
  // ─────────────────────────────────────────────────────────────────────────

  async execute(context) {
    const userText = String(context.user_text || '').trim();

    if (!userText) {
      console.warn('[LLMIntentParser] Empty user_text — delegating to fallback');
      return this.fallback.execute(context);
    }

    // Load service types from DB (dynamic, not hardcoded)
    let serviceTypes = [];
    try {
      const keywords = await db.getKeywordsCatalog();
      if (keywords?.services) {
        serviceTypes = Object.values(keywords.services)
          .map(s => s.canonical)
          .filter(Boolean);
      }
    } catch (dbErr) {
      console.warn('[LLMIntentParser] DB catalog unavailable, using empty list:', dbErr.message);
    }

    // Inject current PKT time so the LLM can resolve relative date references
    // ("kal", "parso") to concrete values without us needing regex for every Urdu variant.
    const pktNow = _getPKTNow();
    const pktDateString = pktNow.toLocaleDateString('en-PK', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    const pktTimeString = pktNow.toLocaleTimeString('en-PK', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    });

    const serviceList = serviceTypes.length
      ? serviceTypes.join(', ')
      : 'Electrician, Plumber, AC Technician, Carpenter, Painter, Handyman, Maid, Car Mechanic, Cleaning Lady, Hairdresser, Salon';

    const system = [
      'You are an intent parser for a Pakistani home-services booking app.',
      'Users write in English, Roman Urdu, Urdu script, or any mix.',
      `Current Pakistan time: ${pktDateString}, ${pktTimeString} (PKT = UTC+5).`,
      '',
      'Extract the booking intent and return ONLY a valid JSON object. No markdown. No explanation.',
      '',
      'Schema:',
      '{',
      `  "service_type": string | null,  // Must exactly match one of: ${serviceList}`,
      '  "location": string | null,       // Area or neighbourhood as the user wrote it. null if not mentioned.',
      '  "time_preference": string | null, // Natural language, e.g. "tomorrow morning", "kal 3 baje", "next Saturday 10am". Preserve the user\'s own words.',
      '  "urgency_level": "high" | "low",  // high = abhi/foran/emergency/jaldi/asap',
      '  "price_sensitivity": "high" | "low" | "neutral",',
      '  "confidence": number,             // 0.0–1.0',
      '  "language": "english" | "roman_urdu" | "urdu" | "mixed",',
      '  "reasoning": string',
      '}',
    ].join('\n');

    try {
      const parsed = await this.llm.completeJSON({ system, user: userText });

      const service = parsed.service_type || null;
      const urgency = parsed.urgency_level === 'high' ? 'high' : 'normal';
      const priceSensitivity = parsed.price_sensitivity || 'neutral';
      const language = parsed.language || 'mixed';
      const llmConfidence = typeof parsed.confidence === 'number'
        ? Math.min(1, Math.max(0, parsed.confidence))
        : 0.75;

      // ── Time: LLM gives natural language → local parser converts to canonical ──
      // The LLM's time_preference is a natural language string like "kal subah 9 baje".
      // We pass it (and the original user text) to the local dateTimeParser which
      // handles the actual date math, PKT anchoring, and ISO formatting.
      // The LLM handles language; the parser handles math. Best of both worlds.
      let timePreference = parsed.time_preference || null;
      let requestedDateTime = null;
      if (timePreference || userText) {
        const parsedDT = resolveBookingDateTime({ text: userText, timePreference: timePreference || '' });
        if (parsedDT && parsedDT.scheduled_start_iso) {
          requestedDateTime = parsedDT;
          timePreference = _buildTimePreference(parsedDT, timePreference || userText);
        }
      }

      // ── Location: pre-validate against local catalog ───────────────────────
      const locationResolution = await this._normalizeParsedLocation(parsed.location, context);
      const location = locationResolution.location;

      // ── Confidence cross-check ─────────────────────────────────────────────
      // If LLM is confident but couldn't extract service, penalize.
      let confidence = llmConfidence;
      if (!service) confidence = Math.min(confidence, 0.55);
      if (confidence < 0.6) {
        console.warn(`[LLMIntentParser] Low confidence (${confidence}) for: "${userText.slice(0, 80)}"`);
      }

      const locationReason = locationResolution.reasoning ? ` ${locationResolution.reasoning}` : '';
      const reasoning = `${parsed.reasoning || `LLM parsed: "${userText.slice(0, 60)}"`}${locationReason}`;

      return {
        input: userText,
        output: { service_type: service, location, time_preference: timePreference, urgency_level: urgency, price_sensitivity: priceSensitivity, confidence, language, reasoning },
        reasoning,
        contextUpdates: {
          service_type:               service,
          location,
          time_preference:            timePreference,
          requested_datetime:         requestedDateTime,
          requested_datetime_text:    timePreference || userText,
          user_text:                  userText,
          confidence,
          language,
          urgency,
          urgency_level:              urgency,
          price_sensitivity:          priceSensitivity,
          llm_intent_reasoning:       reasoning,
          llm_location_cache_source:  locationResolution.source,
          llm_location_candidate:     locationResolution.candidate || null,
          llm_provider:               'primary_llm',
        },
      };

    } catch (err) {
      console.warn('[LLMIntentParser] LLM parse failed — falling back to local parser:', err.message);
      return this.fallback.execute(context);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Pre-validate the LLM-extracted location string against the local catalog.
  // This enriches the context before LocationResolverAgent runs, so resolver
  // starts with better data rather than just the raw string.
  // ─────────────────────────────────────────────────────────────────────────

  async _normalizeParsedLocation(location, context) {
    const text = String(location || '').trim();
    if (!text) return { location: null, source: 'none', reasoning: '' };

    const selectedCity = context.city || context.explicit_city || context.selected_city || null;

    // Try city-scoped lookup first, then global
    let local = await findLocationCandidate(text, { minConfidence: 0.52, city: selectedCity });
    if (!local) {
      local = await findLocationCandidate(text, { minConfidence: 0.52 });
    }

    if (local && !local.cityOnly) {
      return {
        location: local.coords.area_name || text,
        source: 'local_json_cache',
        candidate: { city: local.city, area: local.area, confidence: local.confidence },
        reasoning: `Pre-validated "${text}" → "${local.coords.area_name}" via local catalog.`,
      };
    }

    if (local?.cityOnly) {
      return {
        location: local.city,
        source: 'local_json_city_cache',
        candidate: { city: local.city, confidence: local.confidence },
        reasoning: `"${text}" recognized as city "${local.city}"; LocationResolverAgent will use GPS for neighbourhood precision.`,
      };
    }

    // Try geocoding as a last resort at this stage
    if (this.apiKey) {
      const geocoded = await this._geocodeAreaName(text, selectedCity);
      if (geocoded) {
        return {
          location: geocoded.area_name,
          source: 'geocoding_api',
          candidate: geocoded,
          reasoning: `Geocoded "${text}" → "${geocoded.area_name}" (no local catalog match).`,
        };
      }
    }

    // Cannot resolve — pass raw string forward; LocationResolverAgent will handle it
    return {
      location: text,
      source: 'llm_raw_location',
      reasoning: `"${text}" not found in local catalog${this.apiKey ? ' or geocoding' : ''}; forwarding raw to LocationResolverAgent.`,
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
      'neighborhood', 'sublocality_level_1', 'sublocality', 'route',
    ]) || best.formatted_address;

    const resolvedCity =
      this._extractComponent(best.address_components, ['locality', 'administrative_area_level_2']) ||
      this._extractComponent(best.address_components, ['administrative_area_level_1']) ||
      city || null;

    return { area_name: areaName, city: resolvedCity, place_id: best.place_id, normalized_query: normalizeLocation(locationString) };
  }

  _extractComponent(components = [], types = []) {
    for (const type of types) {
      const found = components.find(c => c.types?.includes(type));
      if (found) return found.long_name;
    }
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function _getPKTNow() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  return new Date(utc + 5 * 60 * 60 * 1000); // UTC+5
}

/**
 * Convert a parsed date/time object from dateTimeParser into a canonical
 * time_preference string that downstream agents can understand.
 *
 * Format: "<date_prefix>_<HHMM>"  e.g. "tomorrow_0900", "today_1430"
 * For dates beyond tomorrow: "specific_date_<YYYYMMDD>_<HHMM>"
 */
function _buildTimePreference(parsedDateTime, rawText) {
  if (!parsedDateTime) return rawText || null;
  const iso = parsedDateTime.scheduled_start_iso || parsedDateTime.date?.toISOString?.();
  const time = parsedDateTime.timeIn24H || parsedDateTime.timeLabel || '';
  const source = String(rawText || '').trim();
  return [source, iso ? `scheduled:${iso}` : '', time ? `time:${time}` : '']
    .filter(Boolean)
    .join(' | ');
}

module.exports = LLMIntentParserAgent;
