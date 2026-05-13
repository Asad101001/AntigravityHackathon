/**
 * Agent 4: ProviderRankerAgent
 * Scores each provider using multi-factor weighted algorithm
 * Formula: score = (distance × 0.30) + (rating × 0.30) + (availability × 0.20) + (response_time × 0.20)
 */

const BaseAgent = require('./BaseAgent');

class ProviderRankerAgent extends BaseAgent {
  constructor() {
    super('rank_providers', 4);
  }

  async execute(context) {
    const providers = context.providers || [];

    if (providers.length === 0) {
      return {
        input: { provider_count: 0 },
        output: { ranked_providers: [] },
        reasoning: 'No providers to rank.',
        contextUpdates: { ranked_providers: [] }
      };
    }

    // ── Normalize factors ──
    const maxDistance = Math.max(...providers.map(p => p.distance_km), 1);
    const maxResponseTime = Math.max(...providers.map(p => p.response_time_min), 1);
    const maxSlots = Math.max(...providers.map(p => p.available_slots.length), 1);

    // ── Score each provider ──
    const scored = providers.map(p => {
      // Distance: closer = higher score (inverted)
      const distScore = 1 - (p.distance_km / maxDistance);
      
      // Rating: direct normalize to 0-1 (out of 5)
      const ratingScore = p.rating / 5.0;
      
      // Availability: more slots = higher score
      const availScore = p.available_slots.length / maxSlots;
      
      // Response time: faster = higher score (inverted)
      const responseScore = 1 - (p.response_time_min / (maxResponseTime + 1));

      // Weighted sum
      const totalScore = (distScore * 0.30) + (ratingScore * 0.30) + (availScore * 0.20) + (responseScore * 0.20);

      // Validate: all scores must be 0.0–1.0, no NaN
      const scores = { distScore, ratingScore, availScore, responseScore, totalScore };
      for (const [key, val] of Object.entries(scores)) {
        if (isNaN(val) || val < 0 || val > 1.001) {
          console.warn(`[ProviderRanker] Invalid score for ${p.name}: ${key}=${val}`);
          return null; // Exclude this provider
        }
      }

      return {
        ...p,
        scores: {
          distance: Math.round(distScore * 100) / 100,
          rating: Math.round(ratingScore * 100) / 100,
          availability: Math.round(availScore * 100) / 100,
          response_time: Math.round(responseScore * 100) / 100,
          total: Math.round(totalScore * 1000) / 1000
        }
      };
    }).filter(Boolean); // Remove any null (invalid) providers

    // Sort descending by total score
    scored.sort((a, b) => b.scores.total - a.scores.total);

    // Build reasoning
    const reasoning = scored.slice(0, 3).map((p, i) => 
      `#${i + 1} ${p.name}: score ${p.scores.total} (dist: ${p.scores.distance}, rating: ${p.scores.rating}, avail: ${p.scores.availability}, resp: ${p.scores.response_time})`
    ).join('. ');

    return {
      input: { provider_count: providers.length },
      output: { ranked_providers: scored, top_3: scored.slice(0, 3).map(p => ({ name: p.name, score: p.scores.total })) },
      reasoning: `Ranked ${scored.length} providers using weighted scoring. ${reasoning}.`,
      contextUpdates: { ranked_providers: scored }
    };
  }
}

module.exports = ProviderRankerAgent;


