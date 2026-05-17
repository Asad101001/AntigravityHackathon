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
        input:  { provider_count: 0 },
        output: { ranked_providers: [], reasoning_log: 'No providers available to rank.' },
        reasoning: 'No providers to rank.',
        contextUpdates: {
          ranked_providers: [],
          reasoning_log:    'No providers available.',
          multi_factor:     null,
        },
      };
    }

    const urgency         = context.urgency_level || context.urgency || 'normal';
    const priceSensitivity = context.price_sensitivity || 'neutral';
    const serviceType     = context.service_type || 'service';
    const location        = context.location || context.resolved_area || 'the requested area';

    // Build a compact provider summary for the LLM prompt
    const providerSummaries = providers.slice(0, 10).map((p, i) => ({
      index:                i,
      id:                   p.id,
      name:                 p.name,
      distance_km:          p.distance_km,
      rating:               p.rating,
      reviews_count:        p.reviews_count,
      response_time_min:    p.response_time_min,
      available_slots_count: (p.available_slots || []).length,
      specialization:       p.specialization || [],
      base_rate_pkr:        p.base_rate_pkr || null,
      on_time_score:        p.on_time_score  || null,
      cancellation_risk:    p.cancellation_risk || 'medium',
      recent_sentiment:     p.recent_sentiment || 'No recent reviews.',
    }));

    // ── System prompt (multi-factor edition) ─────────────────────────────
    const system = [
      'You are an expert multi-factor service-provider ranking agent for a Pakistani home-services app.',
      'You will receive a list of candidate providers and user constraints.',
      '',
      'Perform THREE independent analyses and return ALL results in one JSON object:',
      '  1. OVERALL BEST — best weighted trade-off of distance, rating, availability, on_time_score, cancellation_risk.',
      '  2. MOST AFFORDABLE — lowest base_rate_pkr that is still verified and has available_slots > 0.',
      '  3. CLOSEST / FASTEST — smallest distance_km with available_slots > 0.',
      '',
      'Return ONLY valid JSON with exactly this shape — no markdown, no explanation outside the JSON:',
      '{',
      '  "selected_provider_id": string,          // overall best — used for the primary booking',
      '  "ranked_ids": string[],                  // all provider ids, best → worst overall',
      '  "reasoning_log": string,                 // 3–5 sentence natural-language explanation of the overall decision',
      '  "multi_factor": {',
      '    "overall_best_id":      string,        // same as selected_provider_id',
      '    "most_affordable_id":   string,        // id of cheapest qualified provider',
      '    "closest_fastest_id":   string,        // id of closest/fastest qualified provider',
      '    "analysis": string                     // 1–2 sentences explaining each category choice',
      '  }',
      '}',
      'Do NOT include any text before or after the JSON object.',
    ].join('\n');

    const userMessage = [
      `Service needed: ${serviceType} in ${location}`,
      `Urgency: ${urgency === 'high' ? 'HIGH — user needs someone ASAP' : 'Normal — flexible timing'}`,
      `Price sensitivity: ${priceSensitivity} (high = cheapest, low = quality over cost, neutral = balanced)`,
      '',
      'Candidate providers:',
      JSON.stringify(providerSummaries, null, 2),
    ].join('\n');

    try {
      const parsed = await this.llm.completeJSON({ system, user: userMessage });

      // ── Extract & validate fields ─────────────────────────────────────
      const selectedId    = parsed.selected_provider_id;
      const rankedIds     = Array.isArray(parsed.ranked_ids) ? parsed.ranked_ids : [];
      const reasoningLog  = parsed.reasoning_log || 'Provider selected by multi-factor LLM analysis.';
      const multiFactor   = parsed.multi_factor && typeof parsed.multi_factor === 'object'
        ? {
            overall_best_id:    parsed.multi_factor.overall_best_id    || selectedId,
            most_affordable_id: parsed.multi_factor.most_affordable_id || selectedId,
            closest_fastest_id: parsed.multi_factor.closest_fastest_id || selectedId,
            analysis:           parsed.multi_factor.analysis           || '',
          }
        : null;

      // ── Build ordered ranked list ─────────────────────────────────────
      const selectedProvider = providers.find(p => p.id === selectedId) || providers[0];

      const rankedProviders = rankedIds
        .map(id => providers.find(p => p.id === id))
        .filter(Boolean);

      const remaining = providers.filter(p => !rankedIds.includes(p.id));
      const fullRanked = [...rankedProviders, ...remaining].map((p, i) => ({
        ...p,
        scores: {
          total:         Math.max(0, parseFloat((1 - i * 0.1).toFixed(3))),
          distance:      p.scores?.distance      || 0,
          rating:        p.scores?.rating        || (p.rating / 5),
          availability:  p.scores?.availability  || 0,
          response_time: p.scores?.response_time || 0,
        },
        // Annotate multi-factor badges so the frontend can read them directly
        multi_factor_badge: !multiFactor ? null
          : p.id === multiFactor.overall_best_id    ? 'overall_best'
          : p.id === multiFactor.most_affordable_id  ? 'most_affordable'
          : p.id === multiFactor.closest_fastest_id  ? 'closest_fastest'
          : null,
      }));

      return {
        input:  { provider_count: providers.length, urgency, price_sensitivity: priceSensitivity },
        output: {
          selected_provider_id: selectedId,
          ranked_ids:           rankedIds,
          reasoning_log:        reasoningLog,
          multi_factor:         multiFactor,
        },
        reasoning: reasoningLog,
        contextUpdates: {
          ranked_providers:    fullRanked,
          reasoning_log:       reasoningLog,
          multi_factor:        multiFactor,
          llm_ranker_provider: 'primary_llm',
        },
      };

    } catch (err) {
      console.warn('[LLMRankerAgent] LLM ranking failed, falling back to formula:', err.message);
      const fallbackResult = await this.fallback.execute(context);

      const top = fallbackResult.contextUpdates?.ranked_providers?.[0];
      const cheapest = fallbackResult.contextUpdates?.ranked_providers
        ?.slice()
        .sort((a, b) => (a.base_rate_pkr || 9999) - (b.base_rate_pkr || 9999))[0];
      const closest = fallbackResult.contextUpdates?.ranked_providers
        ?.slice()
        .sort((a, b) => (a.distance_km || 99) - (b.distance_km || 99))[0];

      const reasoningLog = `Formula-based fallback used (LLM unavailable). Top provider: ${top?.name || 'N/A'}.`;

      // Attach multi_factor derived from formula ranking
      const multiFactor = top ? {
        overall_best_id:    top?.id     || null,
        most_affordable_id: cheapest?.id || top?.id || null,
        closest_fastest_id: closest?.id  || top?.id || null,
        analysis:           'Multi-factor derived from weighted formula ranking (LLM fallback).',
      } : null;

      // Annotate badges on ranked providers
      if (fallbackResult.contextUpdates?.ranked_providers && multiFactor) {
        fallbackResult.contextUpdates.ranked_providers =
          fallbackResult.contextUpdates.ranked_providers.map(p => ({
            ...p,
            multi_factor_badge:
              p.id === multiFactor.overall_best_id    ? 'overall_best'
              : p.id === multiFactor.most_affordable_id ? 'most_affordable'
              : p.id === multiFactor.closest_fastest_id  ? 'closest_fastest'
              : null,
          }));
      }

      if (fallbackResult.contextUpdates) {
        fallbackResult.contextUpdates.reasoning_log  = reasoningLog;
        fallbackResult.contextUpdates.multi_factor   = multiFactor;
      }

      return fallbackResult;
    }
  }
}

module.exports = LLMRankerAgent;