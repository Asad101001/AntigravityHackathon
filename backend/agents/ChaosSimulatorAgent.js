const BaseAgent = require('./BaseAgent');
const LLMRankerAgent = require('./LLMRankerAgent');
const DynamicPricingAgent = require('./DynamicPricingAgent');

class ChaosSimulatorAgent extends BaseAgent {
  constructor() {
    super('chaos_simulator', 99);
    this.ranker = new LLMRankerAgent();
    this.pricer = new DynamicPricingAgent();
  }

  async execute(context) {
    const startTime = Date.now();
    const providers = context.providers || context.ranked_providers || [];
    const cancelledId = context.chaos_cancel_provider_id || (providers[0]?.id);

    if (!cancelledId || providers.length < 2) {
      return {
        input: { provider_count: providers.length },
        output: { error: 'Need at least 2 providers to simulate cancellation fallback.' },
        reasoning: 'Chaos simulation requires at least 2 providers.',
        contextUpdates: { chaos_error: 'insufficient_providers' }
      };
    }

    const cancelledProvider = providers.find(p => p.id === cancelledId) || providers[0];
    const remainingProviders = providers.filter(p => p.id !== cancelledProvider.id);

    const reRankContext = {
      ...context,
      providers: remainingProviders,
      chaos_mode: true
    };

    let rankerResult;
    try {
      rankerResult = await this.ranker.execute(reRankContext);
    } catch (err) {
      rankerResult = {
        contextUpdates: {
          ranked_providers: remainingProviders,
          reasoning_log: `Fallback: formula-ranked after ${cancelledProvider.name} cancelled.`
        }
      };
    }

    const newRanked = rankerResult.contextUpdates?.ranked_providers || remainingProviders;
    const newProvider = newRanked[0] || remainingProviders[0];
    const newReasoningLog = rankerResult.contextUpdates?.reasoning_log || 'Re-ranked after cancellation.';

    const priceContext = {
      ...context,
      selected_provider: newProvider
    };
    const priceResult = await this.pricer.execute(priceContext);

    const recoveryMs = Date.now() - startTime;
    const fullReasoning = `CHAOS EVENT: ${cancelledProvider.name} (id: ${cancelledProvider.id}) cancelled — cancellation_risk: ${cancelledProvider.cancellation_risk || 'unknown'}. Re-ranked ${remainingProviders.length} remaining providers. Recovery: ${newProvider.name} selected in ${recoveryMs}ms. ${newReasoningLog}`;

    return {
      input: { cancelled_provider_id: cancelledProvider.id, remaining_count: remainingProviders.length },
      output: {
        cancelled_provider: { id: cancelledProvider.id, name: cancelledProvider.name, cancellation_risk: cancelledProvider.cancellation_risk },
        new_provider: newProvider,
        reasoning_log: fullReasoning,
        new_quote_pkr: priceResult.contextUpdates?.quote_pkr || null,
        new_quote_breakdown: priceResult.contextUpdates?.quote_breakdown || null,
        recovery_time_ms: recoveryMs
      },
      reasoning: fullReasoning,
      contextUpdates: {
        selected_provider: newProvider,
        ranked_providers: newRanked,
        reasoning_log: fullReasoning,
        chaos_cancelled_provider: cancelledProvider,
        chaos_new_provider: newProvider,
        quote_pkr: priceResult.contextUpdates?.quote_pkr,
        quote_breakdown: priceResult.contextUpdates?.quote_breakdown
      }
    };
  }
}

module.exports = ChaosSimulatorAgent;
