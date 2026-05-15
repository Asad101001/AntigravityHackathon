const BaseAgent = require('./BaseAgent');
const LLMClient = require('../llm/LLMClient');
const IntentParserAgent = require('./IntentParserAgent');

class LLMIntentParserAgent extends BaseAgent {
  constructor() {
    super('parse_intent', 1);
    this.llm = new LLMClient();
    this.fallback = new IntentParserAgent();
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
      '  "service_type": string | null,  // canonical: Electrician|Plumber|AC Technician|Carpenter|Painter|Handyman',
      '  "location": string | null,       // area or city name as written by user',
      '  "time_preference": string | null, // e.g. "today_morning","tomorrow","today_now","weekend"',
      '  "urgency_level": "high" | "low",  // high if user uses urgent/abhi/foran/emergency/jaldi',
      '  "price_sensitivity": "high" | "low" | "neutral", // high if user mentions cheap/sasta/budget; low if premium/achha',
      '  "confidence": number,             // 0.0–1.0 how confident you are in the parse',
      '  "language": "english" | "roman_urdu" | "urdu" | "mixed",',
      '  "reasoning": string               // one sentence explaining your parse',
      '}',
      'If a field cannot be determined, set it to null.',
      'Do NOT wrap the JSON in ```json``` or any other delimiters.'
    ].join('\n');

    let llmResult;
    try {
      llmResult = await this.llm.generate({
        system,
        messages: [{ role: 'user', content: userText }]
      });

      const raw = (llmResult.text || '').trim().replace(/^```json|```$/g, '').trim();
      const parsed = JSON.parse(raw);

      const service = parsed.service_type || null;
      const location = parsed.location || null;
      const time = parsed.time_preference || null;
      const urgency = parsed.urgency_level === 'high' ? 'high' : 'normal';
      const priceSensitivity = parsed.price_sensitivity || 'neutral';
      const confidence = typeof parsed.confidence === 'number' ? Math.min(1, Math.max(0, parsed.confidence)) : 0.75;
      const language = parsed.language || 'mixed';
      const reasoning = parsed.reasoning || `LLM parsed intent from: "${userText.slice(0, 60)}"`;

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
          llm_provider: llmResult.provider
        }
      };
    } catch (err) {
      console.warn('[LLMIntentParser] LLM parse failed, falling back to regex:', err.message);
      return this.fallback.execute(context);
    }
  }
}

module.exports = LLMIntentParserAgent;
