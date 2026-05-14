const BaseAgent = require('./BaseAgent');
const db = require('../db');

class SummarizationAgent extends BaseAgent {
  constructor() {
    super('summarize_conversation', 9);
  }

  async execute(context) {
    const messages = await db.getChatMessages(context.booking_id || 'general', 30);
    const summary = messages.length === 0
      ? 'No previous conversation. Start by greeting the customer and confirming service details.'
      : messages.slice(-10).map(m => `${m.role}: ${m.content}`).join('\n').slice(-1200);

    return {
      input: { booking_id: context.booking_id, messages: messages.length },
      output: { summary },
      reasoning: `Summarized ${messages.length} stored chat messages for continuity and token control.`,
      contextUpdates: { conversation_history: messages, conversation_summary: summary }
    };
  }
}

module.exports = SummarizationAgent;
