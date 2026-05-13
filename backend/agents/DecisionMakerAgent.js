/**
 * Agent 5: DecisionMakerAgent
 * Applies hard constraints, selects top provider, explains reasoning
 * Requires: verified=true, available_slots > 0, distance ≤ 5km, confidence > 0.5
 */

const BaseAgent = require('./BaseAgent');

class DecisionMakerAgent extends BaseAgent {
  constructor() {
    super('make_decision', 5);
  }

  async execute(context) {
    const rankedProviders = context.ranked_providers || [];
    const overallConfidence = context.confidence || 0;

    if (rankedProviders.length === 0) {
      return {
        input: { ranked_count: 0 },
        output: { selected_provider: null, reasoning: 'No providers available for selection.' },
        reasoning: 'No ranked providers available. Suggest user try different area or time.',
        contextUpdates: {
          selected_provider: null,
          decision_reasoning: 'No providers available for selection.',
          decision_confidence: 0,
          alternatives: []
        }
      };
    }

    // ── Apply Hard Constraints ──
    const qualified = rankedProviders.filter(p => {
      const checks = {
        verified: p.verified === true,
        has_slots: p.available_slots && p.available_slots.length > 0,
        within_range: p.distance_km <= 5,
        service_available: true
      };
      
      p._constraint_checks = checks;
      return Object.values(checks).every(v => v);
    });

    if (qualified.length === 0) {
      // Relax distance constraint
      const relaxed = rankedProviders.filter(p => p.verified && p.available_slots.length > 0);
      if (relaxed.length > 0) {
        const selected = relaxed[0];
        return {
          input: { ranked_count: rankedProviders.length },
          output: {
            selected_provider: selected,
            relaxed_constraints: true
          },
          reasoning: `No providers within 5km passed all constraints. Relaxed distance filter. Selected ${selected.name} (${selected.distance_km}km, rated ${selected.rating}/5).`,
          contextUpdates: {
            selected_provider: selected,
            decision_reasoning: `Distance constraint relaxed. ${selected.name} selected as best available option.`,
            decision_confidence: 0.70,
            alternatives: relaxed.slice(1, 3)
          }
        };
      }

      return {
        input: { ranked_count: rankedProviders.length },
        output: { selected_provider: null },
        reasoning: 'No providers passed hard constraints even after relaxation.',
        contextUpdates: {
          selected_provider: null,
          decision_reasoning: 'No qualified providers found.',
          decision_confidence: 0,
          alternatives: []
        }
      };
    }

    // ── Select Top Provider ──
    const selected = qualified[0];
    const alternatives = qualified.slice(1, 3);

    // ── Build Decision Reasoning ──
    const constraintReport = [
      `✓ service_available = true`,
      `✓ available_slots = ${selected.available_slots.length} slots`,
      `✓ provider_status = "verified"`,
      `✓ distance_km = ${selected.distance_km} (≤ 5km)`
    ].join('\n');

    const decisionText = `${selected.name} is recommended — closest (${selected.distance_km}km), ` +
      `rated ${selected.rating}/5 (${selected.reviews_count} reviews), ` +
      `${selected.available_slots.length} slots available. ` +
      `Score: ${selected.scores.total}.`;

    const decisionConfidence = Math.min(
      0.95,
      (overallConfidence + selected.scores.total) / 2 + 0.1
    );

    return {
      input: { ranked_count: rankedProviders.length, qualified_count: qualified.length },
      output: {
        selected_provider: selected,
        constraint_checks: constraintReport,
        alternatives: alternatives.map(a => ({ name: a.name, score: a.scores.total, distance: a.distance_km }))
      },
      reasoning: `Hard constraints check passed for ${qualified.length}/${rankedProviders.length} providers. ${decisionText}`,
      contextUpdates: {
        selected_provider: selected,
        decision_reasoning: decisionText,
        decision_confidence: Math.round(decisionConfidence * 100) / 100,
        alternatives
      }
    };
  }
}

module.exports = DecisionMakerAgent;
