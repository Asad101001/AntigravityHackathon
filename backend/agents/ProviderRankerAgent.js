/**
 * Agent 4: ProviderRankerAgent (Local Multi-Factor Formula)
 *
 * This is the LOCAL fallback ranker — used when the LLMRankerAgent is unavailable.
 * It must be production-quality, not a toy.
 *
 * Scoring formula (6 factors):
 *   - Proximity       25%  — closer is always better for on-demand services
 *   - Rating          20%  — star rating normalized to 0-1
 *   - Reliability     20%  — on_time_score + cancellation_risk composite
 *   - Affordability   15%  — lower base_rate_pkr = higher score
 *   - Responsiveness  10%  — response_time_min (faster = better)
 *   - Availability    10%  — number of open slots
 *
 * All factors are normalized, all missing-data cases handled with principled
 * defaults instead of excluding the provider. No provider is ever dropped
 * for missing a field.
 *
 * Urgency modifier: when urgency is "high", proximity and responsiveness
 * weights are boosted and availability penalty is ignored.
 *
 * Price sensitivity modifier: when price_sensitivity is "high", affordability
 * weight is boosted. When "low" (user wants quality), rating/reliability are
 * boosted instead.
 */

const BaseAgent = require('./BaseAgent');

// ── Weight tables by user preference ────────────────────────────────────────
const WEIGHTS = {
  normal: {
    proximity:      0.25,
    rating:         0.20,
    reliability:    0.20,
    affordability:  0.15,
    responsiveness: 0.10,
    availability:   0.10,
  },
  urgent: {
    // User needs someone NOW — proximity and speed dominate
    proximity:      0.35,
    rating:         0.15,
    reliability:    0.15,
    affordability:  0.05,
    responsiveness: 0.20,
    availability:   0.10,
  },
  budget: {
    // User is price-sensitive
    proximity:      0.20,
    rating:         0.15,
    reliability:    0.15,
    affordability:  0.30,
    responsiveness: 0.10,
    availability:   0.10,
  },
  quality: {
    // User wants the best, not the cheapest
    proximity:      0.20,
    rating:         0.25,
    reliability:    0.30,
    affordability:  0.05,
    responsiveness: 0.10,
    availability:   0.10,
  },
};

// Cancellation risk string → numeric score (1.0 = safest)
const CANCELLATION_RISK_SCORE = { low: 1.0, medium: 0.55, high: 0.10 };

class ProviderRankerAgent extends BaseAgent {
  constructor() {
    super('rank_providers', 4);
  }

  async execute(context) {
    const providers = context.providers || [];

    if (providers.length === 0) {
      return {
        input:  { provider_count: 0 },
        output: { ranked_providers: [], top_3: [] },
        reasoning: 'No providers available to rank.',
        contextUpdates: { ranked_providers: [] },
      };
    }

    // ── Determine weight profile based on context ──────────────────────────
    const urgency = (context.urgency_level || context.urgency || '').toLowerCase();
    const priceSensitivity = (context.price_sensitivity || 'neutral').toLowerCase();

    let weightKey = 'normal';
    if (urgency === 'high') weightKey = 'urgent';
    else if (priceSensitivity === 'high') weightKey = 'budget';
    else if (priceSensitivity === 'low') weightKey = 'quality';

    const W = WEIGHTS[weightKey];

    // ── Compute population statistics for normalization ────────────────────
    const stats = this._computeStats(providers);

    // ── Score every provider ───────────────────────────────────────────────
    const scored = providers.map(p => this._scoreProvider(p, stats, W));

    // Sort best-first
    scored.sort((a, b) => b.scores.total - a.scores.total);

    // ── Annotate multi-factor badges ───────────────────────────────────────
    const mostAffordable = [...providers]
      .filter(p => (p.available_slots || []).length > 0)
      .sort((a, b) => (a.base_rate_pkr ?? Infinity) - (b.base_rate_pkr ?? Infinity))[0];

    const closest = [...providers]
      .filter(p => (p.available_slots || []).length > 0)
      .sort((a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity))[0];

    const annotated = scored.map((p, i) => ({
      ...p,
      rank: i + 1,
      multi_factor_badge:
        i === 0 ? 'overall_best'
        : p.id === mostAffordable?.id ? 'most_affordable'
        : p.id === closest?.id ? 'closest_fastest'
        : null,
    }));

    const top3 = annotated.slice(0, 3);
    const reasoning = [
      `Ranked ${annotated.length} providers using ${weightKey} weight profile (urgency=${urgency||'normal'}, price=${priceSensitivity}).`,
      ...top3.map((p, i) =>
        `#${i + 1} ${p.name}: total=${p.scores.total} ` +
        `(proximity=${p.scores.proximity}, rating=${p.scores.rating}, ` +
        `reliability=${p.scores.reliability}, afford=${p.scores.affordability}, ` +
        `resp=${p.scores.responsiveness}, avail=${p.scores.availability})`
      ),
    ].join(' ');

    return {
      input:  { provider_count: providers.length, weight_profile: weightKey },
      output: { ranked_providers: annotated, top_3: top3.map(p => ({ name: p.name, id: p.id, score: p.scores.total })) },
      reasoning,
      contextUpdates: { ranked_providers: annotated },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Score a single provider
  // ─────────────────────────────────────────────────────────────────────────

  _scoreProvider(p, stats, W) {
    // 1. Proximity (25% normal) — lower km = higher score
    const distKm = Number.isFinite(p.distance_km) ? p.distance_km : stats.medianDistance;
    const proximity = stats.maxDistance > 0
      ? 1 - (distKm / stats.maxDistance)
      : 0.5;

    // 2. Rating (20%) — out of 5, default 3.5 if missing
    const rating = Math.min(1, (Number.isFinite(p.rating) ? p.rating : 3.5) / 5.0);

    // 3. Reliability (20%) — on_time_score [0-1] + cancellation_risk
    const onTime = Number.isFinite(p.on_time_score) ? Math.min(1, Math.max(0, p.on_time_score)) : 0.75;
    const riskKey = (typeof p.cancellation_risk === 'string' ? p.cancellation_risk : 'medium').toLowerCase();
    const riskScore = CANCELLATION_RISK_SCORE[riskKey] ?? CANCELLATION_RISK_SCORE.medium;
    const reliability = (onTime * 0.6) + (riskScore * 0.4);

    // 4. Affordability (15%) — lower price = higher score
    const price = Number.isFinite(p.base_rate_pkr) ? p.base_rate_pkr : stats.medianPrice;
    const affordability = stats.maxPrice > 0
      ? 1 - (price / stats.maxPrice)
      : 0.5;

    // 5. Responsiveness (10%) — lower response_time_min = higher score
    const respMin = Number.isFinite(p.response_time_min) ? p.response_time_min : stats.medianResponseTime;
    const responsiveness = stats.maxResponseTime > 0
      ? 1 - (respMin / (stats.maxResponseTime + 1))
      : 0.5;

    // 6. Availability (10%) — more open slots = higher score
    const slots = Array.isArray(p.available_slots) ? p.available_slots.length : 0;
    const availability = stats.maxSlots > 0 ? slots / stats.maxSlots : 0;

    // Verified bonus: a small constant boost for verified providers
    const verifiedBonus = p.verified ? 0.025 : 0;

    // Reviews volume bonus: up to 0.01 for providers with >50 reviews
    const reviewsBonus = Math.min(0.01, ((p.reviews_count || 0) / 5000));

    // Weighted total — clamped to [0, 1]
    const raw =
      (proximity      * W.proximity) +
      (rating         * W.rating) +
      (reliability    * W.reliability) +
      (affordability  * W.affordability) +
      (responsiveness * W.responsiveness) +
      (availability   * W.availability) +
      verifiedBonus +
      reviewsBonus;

    const total = Math.min(1, Math.max(0, isNaN(raw) ? 0.5 : raw));

    return {
      ...p,
      scores: {
        proximity:      _r(proximity),
        rating:         _r(rating),
        reliability:    _r(reliability),
        affordability:  _r(affordability),
        responsiveness: _r(responsiveness),
        availability:   _r(availability),
        total:          _r3(total),
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Population statistics for normalization
  // ─────────────────────────────────────────────────────────────────────────

  _computeStats(providers) {
    const validDist  = providers.map(p => p.distance_km).filter(Number.isFinite);
    const validPrice = providers.map(p => p.base_rate_pkr).filter(Number.isFinite);
    const validResp  = providers.map(p => p.response_time_min).filter(Number.isFinite);
    const validSlots = providers.map(p => (p.available_slots || []).length);

    return {
      maxDistance:      validDist.length  ? Math.max(...validDist,  1) : 30,
      medianDistance:   _median(validDist)  || 10,
      maxPrice:         validPrice.length ? Math.max(...validPrice, 1) : 5000,
      medianPrice:      _median(validPrice) || 1500,
      maxResponseTime:  validResp.length  ? Math.max(...validResp,  1) : 120,
      medianResponseTime: _median(validResp) || 45,
      maxSlots:         Math.max(...validSlots, 1),
    };
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function _r(v)  { return Math.round(v * 100) / 100; }
function _r3(v) { return Math.round(v * 1000) / 1000; }

function _median(arr) {
  if (!arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

module.exports = ProviderRankerAgent;
