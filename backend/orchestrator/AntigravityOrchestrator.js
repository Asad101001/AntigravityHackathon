const LLMIntentParserAgent = require('../agents/LLMIntentParserAgent');
const LocationResolverAgent = require('../agents/LocationResolverAgent');
const ProviderDiscovererAgent = require('../agents/ProviderDiscovererAgent');
const LLMRankerAgent = require('../agents/LLMRankerAgent');
const DecisionMakerAgent = require('../agents/DecisionMakerAgent');
const DynamicPricingAgent = require('../agents/DynamicPricingAgent');
const BookingExecutorAgent = require('../agents/BookingExecutorAgent');
const FollowUpManagerAgent = require('../agents/FollowUpManagerAgent');
const RagRetrievalAgent = require('../agents/RagRetrievalAgent');
const SummarizationAgent = require('../agents/SummarizationAgent');
const ConversationAgent = require('../agents/ConversationAgent');
const ChaosSimulatorAgent = require('../agents/ChaosSimulatorAgent');

class AntigravityOrchestrator {
  constructor(options = {}) {
    this.apiKey = options.apiKey || 'demo-key';

    this.workflow = {
      name: 'service_booking_workflow',
      description: 'End-to-end service request to booking — fully agentic with LLM reasoning',
      task_plan: [
        { id: 1, name: 'parse_intent',        agent: new LLMIntentParserAgent() },
        { id: 2, name: 'resolve_location',     agent: new LocationResolverAgent() },
        { id: 3, name: 'discover_providers',   agent: new ProviderDiscovererAgent() },
        { id: 4, name: 'rank_providers',        agent: new LLMRankerAgent() },
        { id: 5, name: 'make_decision',         agent: new DecisionMakerAgent() },
        { id: 6, name: 'dynamic_pricing',       agent: new DynamicPricingAgent() },
        { id: 7, name: 'execute_booking',       agent: new BookingExecutorAgent() },
        { id: 8, name: 'schedule_followup',     agent: new FollowUpManagerAgent() }
      ],
      context_schema: {
        input: ['user_text', 'user_id'],
        output: ['booking_id', 'provider', 'reasoning', 'reasoning_log', 'quote_pkr', 'execution_logs']
      }
    };
  }

  async run({ input, options = {} }) {
    const {
      emit_trace = true,
      timeout_ms = 15000,
      retry_on_failure = true,
      fallback_mode = 'graceful'
    } = options;

    const workflowId = `WF_${Date.now()}`;
    const startTime = Date.now();

    const context = {
      user_text: input.user_text,
      user_id: input.user_id,
      user_location: input.user_location || null,
      location_source: input.location_source || null,
      execution_logs: [],
      workflow_id: workflowId
    };

    console.log(`\n═══════════════════════════════════════════════════════`);
    console.log(`🚀 Antigravity Agentic Workflow: ${workflowId}`);
    console.log(`📝 Input: "${input.user_text}"`);
    console.log(`═══════════════════════════════════════════════════════\n`);

    let lastSuccessfulAgent = 0;

    for (const task of this.workflow.task_plan) {
      const elapsed = Date.now() - startTime;
      if (elapsed > timeout_ms) {
        console.warn(`⏰ Workflow timeout after ${elapsed}ms at agent ${task.id}`);
        context.execution_logs.push({ id: task.id, name: task.name, status: 'timeout', duration_ms: 0, error: `Timeout after ${elapsed}ms` });
        break;
      }

      console.log(`  ▶ Agent ${task.id}: ${task.name}...`);

      try {
        await task.agent.run(context);
        const lastLog = context.execution_logs[context.execution_logs.length - 1];

        if (lastLog.status === 'success') {
          console.log(`  ✅ ${task.name} (${lastLog.duration_ms}ms)`);
          lastSuccessfulAgent = task.id;
        } else if (lastLog.status === 'error') {
          console.log(`  ❌ ${task.name} failed: ${lastLog.error}`);
          if (retry_on_failure) {
            context.execution_logs.pop();
            await task.agent.run(context);
          }
          if (fallback_mode !== 'graceful') break;
        }

        if (task.id === 1 && context.confidence < 0.6) {
          context.needs_clarification = true;
        }
        if (task.id === 3 && (!context.providers || context.providers.length === 0)) {
          context.no_providers = true;
          if (fallback_mode !== 'graceful') break;
        }
      } catch (error) {
        console.error(`  💥 Agent ${task.id} threw:`, error.message);
        context.execution_logs.push({ id: task.id, name: task.name, status: 'error', duration_ms: Date.now() - startTime, error: error.message });
        if (fallback_mode !== 'graceful') break;
      }
    }

    const totalDuration = Date.now() - startTime;

    console.log(`\n═══════════════════════════════════════════════════════`);
    console.log(`🏁 Workflow ${context.booking_id ? 'Completed' : 'Finished'}: ${workflowId}`);
    console.log(`⏱️  Duration: ${totalDuration}ms | Agents: ${lastSuccessfulAgent}/${this.workflow.task_plan.length}`);
    if (context.reasoning_log) console.log(`🤖 LLM Reasoning: ${context.reasoning_log.slice(0, 120)}...`);
    console.log(`═══════════════════════════════════════════════════════\n`);

    const overallStatus = context.booking_id ? 'completed'
      : context.needs_clarification ? 'clarification_needed'
      : context.no_providers ? 'no_providers'
      : 'partial';

    return {
      workflow_id: workflowId,
      status: overallStatus,
      duration_ms: totalDuration,
      output: {
        booking_id: context.booking_id || null,
        provider: context.selected_provider ? this._serializeProvider(context.selected_provider, context.booking?.time_slot || null) : null,
        reasoning: context.decision_reasoning || null,
        reasoning_log: context.reasoning_log || null,
        confirmation_message: context.confirmation_message || null,
        alternatives: (context.alternatives || []).map(a => this._serializeProvider(a, null)),
        reminders_scheduled: context.reminders_count || 0,
        quote_pkr: context.quote_pkr || null,
        quote_breakdown: context.quote_breakdown || null,
        parsed_intent: {
          service_type: context.service_type || null,
          location: context.location || null,
          time_preference: context.time_preference || null,
          confidence: context.confidence || 0,
          location_confidence: context.location_confidence || null,
          location_source: context.location_source || null,
          coordinates: context.coordinates || null,
          tokens: context.tokens || [],
          language: context.language || null,
          urgency: context.urgency || 'normal',
          urgency_level: context.urgency_level || 'normal',
          price_sensitivity: context.price_sensitivity || 'neutral'
        }
      },
      execution_logs: emit_trace ? context.execution_logs : [],
      needs_clarification: context.needs_clarification || false,
      clarification: context.needs_clarification ? {
        parsed: {
          service_type: context.service_type || null,
          location: context.location || null,
          time: context.time_preference || null
        },
        prompt: !context.service_type ? 'What service do you need?' : !context.location ? 'Which area/city are you in?' : 'Could you please clarify your request?',
        suggestions: !context.service_type ? ['Electrician', 'Plumber', 'AC Technician', 'Carpenter', 'Painter'] : []
      } : null
    };
  }

  _serializeProvider(provider, confirmedSlot = null) {
    return {
      id: provider.id,
      name: provider.name,
      service: provider.service,
      service_type: provider.service,
      phone: provider.phone,
      city: provider.city,
      area: provider.area,
      lat: provider.lat,
      lng: provider.lng,
      distance_km: provider.distance_km,
      rating: provider.rating,
      reviews_count: provider.reviews_count,
      verified: provider.verified,
      response_time_min: provider.response_time_min,
      available_slots: provider.available_slots || [],
      confirmed_slot: confirmedSlot,
      scores: provider.scores || null,
      score: provider.scores?.total || provider.score || null,
      base_rate_pkr: provider.base_rate_pkr || null,
      on_time_score: provider.on_time_score || null,
      cancellation_risk: provider.cancellation_risk || null,
      specialization: provider.specialization || [],
      recent_sentiment: provider.recent_sentiment || null
    };
  }

  async runConversation({ input, options = {} }) {
    const workflowId = `CHAT_${Date.now()}`;
    const context = {
      booking_id: input.booking_id || 'general',
      chat_message: input.message,
      user_id: input.user_id || 'anonymous',
      provider: input.provider || {},
      execution_logs: [],
      workflow_id: workflowId
    };

    const chatPlan = [new RagRetrievalAgent(), new SummarizationAgent(), new ConversationAgent()];
    for (const agent of chatPlan) {
      await agent.run(context);
    }

    return {
      workflow_id: workflowId,
      reply: context.chat_reply,
      provider: context.llm_provider,
      token_usage: context.token_usage,
      execution_logs: options.emit_trace === false ? [] : context.execution_logs
    };
  }

  async runChaosSimulation({ input, options = {} }) {
    const workflowId = `CHAOS_${Date.now()}`;
    const context = {
      ...input,
      execution_logs: [],
      workflow_id: workflowId
    };

    const chaosAgent = new ChaosSimulatorAgent();
    await chaosAgent.run(context);

    const log = context.execution_logs[context.execution_logs.length - 1];
    return {
      workflow_id: workflowId,
      duration_ms: log?.duration_ms || 0,
      cancelled_provider: context.chaos_cancelled_provider,
      new_provider: context.chaos_new_provider ? this._serializeProvider(context.chaos_new_provider, null) : null,
      reasoning_log: context.reasoning_log,
      new_quote_pkr: context.quote_pkr,
      new_quote_breakdown: context.quote_breakdown,
      execution_logs: options.emit_trace === false ? [] : context.execution_logs
    };
  }
}

module.exports = AntigravityOrchestrator;
