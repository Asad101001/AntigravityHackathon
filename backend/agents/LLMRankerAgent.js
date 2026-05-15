const BaseAgent = require('./BaseAgent');
const LLMClient = require('../llm/LLMClient');
const ProviderRankerAgent = require('./ProviderRankerAgent');

class LLMRankerAgent extends BaseAgent {
  constructor() {
    super('rank_providers', 4);
    this.llm = new LLMClient();
    this.fallback = new ProviderRankerAgent();
  }

  async execute(context) {
    const providers = context.providers || [];
    if (providers.length === 0) {
      return {
        input: { provider_count: 0 },
        output: { ranked_providers: [], reasoning_log: 'No providers available to rank.' },
        reasoning: 'No providers to rank.',
        contextUpdates: { ranked_providers: [], reasoning_log: 'No providers available.' }
      };
    }

    const urgency = context.urgency_level || context.urgency || 'normal';
    const priceSensitivity = context.price_sensitivity || 'neutral';
    const serviceType = context.service_type || 'service';
    const location = context.location || context.resolved_area || 'the requested area';

    const providerSummaries = providers.slice(0, 10).map((p, i) => ({
      index: i,
      id: p.id,
      name: p.name,
      distance_km: p.distance_km,
      rating: p.rating,
      reviews_count: p.reviews_count,
      response_time_min: p.response_time_min,
      available_slots_count: (p.available_slots || []).length,
      specialization: p.specialization || [],
      base_rate_pkr: p.base_rate_pkr || null,
      on_time_score: p.on_time_score || null,
      cancellation_risk: p.cancellation_risk || 'medium',
      recent_sentiment: p.recent_sentiment || 'No recent reviews available.'
    }));

    const system = [
      'You are an expert service-provider ranking agent for a Pakistani home-services app.',
      'You will receive a list of candidate providers and user constraints.',
      'Reason about the trade-offs (e.g. cheap vs close, fast vs reliable) and select the BEST provider.',
      'Return ONLY valid JSON — no markdown, no explanation outside the JSON.',
      'JSON schema:',
      '{',
      '  "selected_provider_id": string,   // the id field of the chosen provider',
      '  "ranked_ids": string[],            // all provider ids ordered best-to-worst',
      '  "reasoning_log": string            // 2-4 sentence natural-language explanation of your decision',
      '}',
      'Do NOT include any text before or after the JSON object.'
    ].join('\n');

    const userMessage = [
      `Service needed: ${serviceType} in ${location}`,
      `Urgency: ${urgency === 'high' ? 'HIGH — user needs someone ASAP' : 'Normal — flexible timing'}`,
      `Price sensitivity: ${priceSensitivity} (high = wants cheapest, low = willing to pay more for quality, neutral = balanced)`,
      '',
      'Candidate providers:',
      JSON.stringify(providerSummaries, null, 2)
    ].join('\n');

    try {
      const llmResult = await this.llm.generate({
        system,
        messages: [{ role: 'user', content: userMessage }]
      });

      const raw = (llmResult.text || '').trim().replace(/^```json|```$/g, '').trim();
      const parsed = JSON.parse(raw);

      const selectedId = parsed.selected_provider_id;
      const rankedIds = Array.isArray(parsed.ranked_ids) ? parsed.ranked_ids : [];
      const reasoningLog = parsed.reasoning_log || 'Provider selected by LLM based on trade-off analysis.';

      const selectedProvider = providers.find(p => p.id === selectedId) || providers[0];

      const rankedProviders = rankedIds
        .map(id => providers.find(p => p.id === id))
        .filter(Boolean);

      const remaining = providers.filter(p => !rankedIds.includes(p.id));
      const fullRanked = [...rankedProviders, ...remaining].map((p, i) => ({
        ...p,
        scores: {
          total: Math.max(0, 1 - i * 0.1),
          distance: p.scores?.distance || 0,
          rating: p.scores?.rating || (p.rating / 5),
          availability: p.scores?.availability || 0,
          response_time: p.scores?.response_time || 0
        }
      }));

      return {
        input: { provider_count: providers.length, urgency, price_sensitivity: priceSensitivity },
        output: { selected_provider_id: selectedId, ranked_ids: rankedIds, reasoning_log: reasoningLog },
        reasoning: reasoningLog,
        contextUpdates: {
          ranked_providers: fullRanked,
          reasoning_log: reasoningLog,
          llm_ranker_provider: llmResult.provider
        }
      };
    } catch (err) {
      console.warn('[LLMRankerAgent] LLM ranking failed, falling back to formula:', err.message);
      const fallbackResult = await this.fallback.execute(context);
      const reasoningLog = `Formula-based fallback used (LLM unavailable). Top provider: ${(fallbackResult.contextUpdates?.ranked_providers?.[0]?.name) || 'N/A'}.`;
      if (fallbackResult.contextUpdates) {
        fallbackResult.contextUpdates.reasoning_log = reasoningLog;
      }
      return fallbackResult;
    }
  }
}

module.exports = LLMRankerAgent;
