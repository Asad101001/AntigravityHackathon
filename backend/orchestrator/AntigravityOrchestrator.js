/**
 * AntigravityOrchestrator
 * Central orchestration engine that manages the 7-agent pipeline
 * Maintains shared context, sequences execution, emits traces
 * 
 * Mimics the Google Antigravity SDK surface:
 * - Workflow definition with task plan
 * - run() method with options
 * - Full execution trace output
 */

const IntentParserAgent = require('../agents/IntentParserAgent');
const LocationResolverAgent = require('../agents/LocationResolverAgent');
const ProviderDiscovererAgent = require('../agents/ProviderDiscovererAgent');
const ProviderRankerAgent = require('../agents/ProviderRankerAgent');
const DecisionMakerAgent = require('../agents/DecisionMakerAgent');
const BookingExecutorAgent = require('../agents/BookingExecutorAgent');
const FollowUpManagerAgent = require('../agents/FollowUpManagerAgent');

class AntigravityOrchestrator {
  constructor(options = {}) {
    this.apiKey = options.apiKey || 'demo-key';
    
    // Define the workflow per Antigravity spec
    this.workflow = {
      name: 'service_booking_workflow',
      description: 'End-to-end service request to booking',
      task_plan: [
        { id: 1, name: 'parse_intent', agent: new IntentParserAgent() },
        { id: 2, name: 'resolve_location', agent: new LocationResolverAgent() },
        { id: 3, name: 'discover_providers', agent: new ProviderDiscovererAgent() },
        { id: 4, name: 'rank_providers', agent: new ProviderRankerAgent() },
        { id: 5, name: 'make_decision', agent: new DecisionMakerAgent() },
        { id: 6, name: 'execute_booking', agent: new BookingExecutorAgent() },
        { id: 7, name: 'schedule_followup', agent: new FollowUpManagerAgent() }
      ],
      context_schema: {
        input: ['user_text', 'user_id'],
        output: ['booking_id', 'provider', 'reasoning', 'execution_logs']
      }
    };
  }

  /**
   * Run the full orchestration pipeline
   * @param {Object} params
   * @param {Object} params.input - { user_text, user_id }
   * @param {Object} params.options - { emit_trace, timeout_ms, retry_on_failure, fallback_mode }
   * @returns {Object} Full result with output, trace, and metadata
   */
  async run({ input, options = {} }) {
    const {
      emit_trace = true,
      timeout_ms = 10000,
      retry_on_failure = true,
      fallback_mode = 'graceful'
    } = options;

    const workflowId = `WF_${Date.now()}`;
    const startTime = Date.now();

    // ── Initialize Shared Context ──
    const context = {
      user_text: input.user_text,
      user_id: input.user_id,
      execution_logs: [],
      workflow_id: workflowId
    };

    console.log(`\n═══════════════════════════════════════════════════════`);
    console.log(`🚀 Antigravity Workflow Started: ${workflowId}`);
    console.log(`📝 Input: "${input.user_text}"`);
    console.log(`═══════════════════════════════════════════════════════\n`);

    // ── Execute Agents Sequentially ──
    let lastSuccessfulAgent = 0;
    let earlyExit = false;

    for (const task of this.workflow.task_plan) {
      const elapsed = Date.now() - startTime;
      
      // Timeout check
      if (elapsed > timeout_ms) {
        console.warn(`⏰ Workflow timeout after ${elapsed}ms at agent ${task.id}`);
        context.execution_logs.push({
          id: task.id,
          name: task.name,
          status: 'timeout',
          duration_ms: 0,
          error: `Workflow timeout after ${elapsed}ms`
        });
        break;
      }

      console.log(`  ▶ Agent ${task.id}: ${task.name}...`);
      
      try {
        await task.agent.run(context);
        const lastLog = context.execution_logs[context.execution_logs.length - 1];
        
        if (lastLog.status === 'success') {
          console.log(`  ✅ Agent ${task.id}: ${task.name} completed (${lastLog.duration_ms}ms)`);
          lastSuccessfulAgent = task.id;
        } else if (lastLog.status === 'error') {
          console.log(`  ❌ Agent ${task.id}: ${task.name} failed: ${lastLog.error}`);
          
          if (retry_on_failure) {
            console.log(`  🔄 Retrying agent ${task.id}...`);
            // Remove failed log entry
            context.execution_logs.pop();
            await task.agent.run(context);
          }
          
          if (fallback_mode !== 'graceful') {
            earlyExit = true;
            break;
          }
        }

        // ── Early Exit Checks ──
        // After Agent 1: if confidence too low, might need clarification
        if (task.id === 1 && context.confidence < 0.6) {
          console.log(`  ⚠️  Low confidence (${context.confidence}). Needs clarification.`);
          // Continue but flag it
          context.needs_clarification = true;
        }

        // After Agent 3: if no providers found
        if (task.id === 3 && (!context.providers || context.providers.length === 0)) {
          console.log(`  ⚠️  No providers found. Suggesting alternative.`);
          context.no_providers = true;
          if (fallback_mode !== 'graceful') {
            earlyExit = true;
            break;
          }
        }

      } catch (error) {
        console.error(`  💥 Agent ${task.id} threw:`, error.message);
        context.execution_logs.push({
          id: task.id,
          name: task.name,
          status: 'error',
          duration_ms: Date.now() - startTime,
          error: error.message
        });
        
        if (fallback_mode !== 'graceful') break;
      }
    }

    const totalDuration = Date.now() - startTime;

    console.log(`\n═══════════════════════════════════════════════════════`);
    console.log(`🏁 Workflow ${context.booking_id ? 'Completed' : 'Finished'}: ${workflowId}`);
    console.log(`⏱️  Duration: ${totalDuration}ms | Agents: ${lastSuccessfulAgent}/7`);
    if (context.booking_id) {
      console.log(`📋 Booking: ${context.booking_id}`);
    }
    console.log(`═══════════════════════════════════════════════════════\n`);

    // ── Build Result ──
    const overallStatus = context.booking_id ? 'completed' : 
                          context.needs_clarification ? 'clarification_needed' :
                          context.no_providers ? 'no_providers' : 'partial';

    const result = {
      workflow_id: workflowId,
      status: overallStatus,
      duration_ms: totalDuration,
      output: {
        booking_id: context.booking_id || null,
        provider: context.selected_provider ? {
          name: context.selected_provider.name,
          phone: context.selected_provider.phone,
          distance_km: context.selected_provider.distance_km,
          rating: context.selected_provider.rating,
          reviews_count: context.selected_provider.reviews_count,
          confirmed_slot: context.booking?.time_slot || null,
          scores: context.selected_provider.scores || null
        } : null,
        reasoning: context.decision_reasoning || null,
        confirmation_message: context.confirmation_message || null,
        alternatives: (context.alternatives || []).map(a => ({
          name: a.name,
          score: a.scores?.total,
          distance_km: a.distance_km,
          rating: a.rating,
          phone: a.phone
        })),
        reminders_scheduled: context.reminders_count || 0,
        parsed_intent: {
          service_type: context.service_type || null,
          location: context.location || null,
          time_preference: context.time_preference || null,
          confidence: context.confidence || 0,
          language: context.language || null,
          urgency: context.urgency || 'normal'
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
        prompt: !context.service_type ? 'What service do you need?' :
                !context.location ? 'Which area/city are you in?' :
                'Could you please clarify your request?',
        suggestions: !context.service_type ? ['Electrician', 'Plumber', 'AC Technician', 'Carpenter', 'Painter'] : []
      } : null
    };

    return result;
  }
}

module.exports = AntigravityOrchestrator;


