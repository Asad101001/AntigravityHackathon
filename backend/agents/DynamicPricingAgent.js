const BaseAgent = require('./BaseAgent');

const DISTANCE_RATE_PKR = 150;
const URGENCY_MULTIPLIERS = { high: 1.5, normal: 1.0, low: 1.0 };

class DynamicPricingAgent extends BaseAgent {
  constructor() {
    super('dynamic_pricing', 5);
  }

  async execute(context) {
    const provider = context.selected_provider;
    const urgency = context.urgency_level || context.urgency || 'normal';

    if (!provider) {
      return {
        input: { provider: null },
        output: { quote_pkr: null, quote_breakdown: null },
        reasoning: 'No selected provider — cannot generate quote.',
        contextUpdates: { quote_pkr: null, quote_breakdown: null }
      };
    }

    const baseRate = provider.base_rate_pkr || 1500;
    const distanceKm = provider.distance_km || 0;
    const distanceSurcharge = Math.round(distanceKm * DISTANCE_RATE_PKR);
    const urgencyMultiplier = URGENCY_MULTIPLIERS[urgency] || 1.0;
    const subtotal = baseRate + distanceSurcharge;
    const totalPkr = Math.round(subtotal * urgencyMultiplier);

    const breakdown = {
      base_rate: baseRate,
      distance_surcharge: distanceSurcharge,
      urgency_multiplier: urgencyMultiplier,
      subtotal,
      total: totalPkr
    };

    const urgencyNote = urgencyMultiplier > 1 ? ` (${Math.round((urgencyMultiplier - 1) * 100)}% urgency surcharge applied)` : '';
    const reasoning = `Quote for ${provider.name}: PKR ${baseRate} base + PKR ${distanceSurcharge} distance surcharge (${distanceKm}km × PKR ${DISTANCE_RATE_PKR})${urgencyNote} = PKR ${totalPkr}.`;

    return {
      input: { provider_id: provider.id, distance_km: distanceKm, urgency },
      output: { quote_pkr: totalPkr, quote_breakdown: breakdown },
      reasoning,
      contextUpdates: { quote_pkr: totalPkr, quote_breakdown: breakdown }
    };
  }
}

module.exports = DynamicPricingAgent;
