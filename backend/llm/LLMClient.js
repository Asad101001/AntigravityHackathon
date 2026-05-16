/**
 * LLMClient.js — Unified LLM gateway (Groq + Gemini)
 *
 * Both free-tier providers enforce rate limits:
 *   Groq   — 30 req/min, 14,400 req/day  (as of 2025)
 *   Gemini — 15 req/min, 1,500 req/day   (flash free tier)
 *
 * Strategy:
 *   1. Primary: Groq (faster, higher free RPM)
 *   2. Fallback: Gemini (if Groq returns 429 after all retries)
 *   3. All calls wrapped in withRetry (exponential backoff + jitter)
 */

const { withRetry } = require('../utils/retryHelper');

const GROQ_ENDPOINT   = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

const DEFAULT_GROQ_MODEL   = 'llama3-8b-8192';
const DEFAULT_GEMINI_MODEL = 'gemini-1.5-flash-latest';

const RETRY_OPTS = {
  maxAttempts: 4,
  baseDelayMs: 600,
  maxDelayMs:  12000,
};

class LLMClient {
  constructor() {
    this.groqKey   = process.env.GROQ_API_KEY;
    this.geminiKey = process.env.GEMINI_API_KEY;

    if (!this.groqKey)   console.warn('[LLMClient] GROQ_API_KEY not set');
    if (!this.geminiKey) console.warn('[LLMClient] GEMINI_API_KEY not set');
  }

  /**
   * Main entry point.
   * @param {{ system?: string, user: string, temperature?: number, maxTokens?: number }} params
   * @returns {Promise<string>} — model's text response
   */
  async complete({ system = '', user, temperature = 0.4, maxTokens = 1024 }) {
    if (!user?.trim()) throw new Error('[LLMClient] user prompt is required');

    // Try Groq first
    if (this.groqKey) {
      try {
        return await this._groqComplete({ system, user, temperature, maxTokens });
      } catch (err) {
        console.warn('[LLMClient] Groq failed after retries, falling back to Gemini:', err.message);
      }
    }

    // Gemini fallback
    if (this.geminiKey) {
      return await this._geminiComplete({ system, user, temperature, maxTokens });
    }

    throw new Error('[LLMClient] No LLM provider available — set GROQ_API_KEY or GEMINI_API_KEY');
  }

  /**
   * JSON mode: prompts the model to return only a JSON object.
   * Strips markdown code fences before parsing.
   */
  async completeJSON({ system = '', user, temperature = 0.2, maxTokens = 1024 }) {
    const jsonSystem = [
      system,
      'You MUST respond with a single valid JSON object only. No explanation, no markdown fences, no preamble.',
    ].filter(Boolean).join('\n\n');

    const raw = await this.complete({ system: jsonSystem, user, temperature, maxTokens });
    return this._parseJSON(raw);
  }

  // ── Groq ────────────────────────────────────────────────────────────────────

  async _groqComplete({ system, user, temperature, maxTokens }) {
    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: user });

    const payload = {
      model:       DEFAULT_GROQ_MODEL,
      messages,
      temperature,
      max_tokens:  maxTokens,
      stream:      false,
    };

    const data = await withRetry(async () => {
      const res = await fetch(GROQ_ENDPOINT, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${this.groqKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('retry-after') || '0', 10) * 1000;
        const err        = new Error(`HTTP 429`);
        err.status       = 429;
        err.retryable    = true;
        err.retryAfterMs = retryAfter || undefined;
        throw err;
      }

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Groq HTTP ${res.status}: ${body.slice(0, 200)}`);
      }

      return res.json();
    }, { ...RETRY_OPTS, label: 'Groq' });

    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error('[LLMClient] Groq returned empty content');
    return text.trim();
  }

  // ── Gemini ──────────────────────────────────────────────────────────────────

  async _geminiComplete({ system, user, temperature, maxTokens }) {
    const url = `${GEMINI_ENDPOINT}/${DEFAULT_GEMINI_MODEL}:generateContent?key=${this.geminiKey}`;

    // Gemini uses systemInstruction + contents format
    const body = {
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        candidateCount: 1,
      },
    };

    const data = await withRetry(async () => {
      const res = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });

      if (res.status === 429) {
        const err     = new Error('HTTP 429');
        err.status    = 429;
        err.retryable = true;
        throw err;
      }

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(`Gemini HTTP ${res.status}: ${errBody?.error?.message || 'unknown'}`);
      }

      return res.json();
    }, { ...RETRY_OPTS, label: 'Gemini' });

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      const reason = data?.candidates?.[0]?.finishReason;
      throw new Error(`[LLMClient] Gemini returned no content (finishReason: ${reason})`);
    }
    return text.trim();
  }

  // ── Utilities ───────────────────────────────────────────────────────────────

  _parseJSON(raw) {
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      // Attempt to extract first JSON object from surrounding prose
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
      throw new Error(`[LLMClient] Failed to parse LLM JSON output: ${cleaned.slice(0, 200)}`);
    }
  }
}

module.exports = new LLMClient();