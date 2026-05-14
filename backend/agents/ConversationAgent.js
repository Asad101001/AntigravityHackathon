const BaseAgent = require('./BaseAgent');
const LLMClient = require('../llm/LLMClient');
const db = require('../db');
const { tokenize } = require('../utils/textTokenizer');

class ConversationAgent extends BaseAgent {
  constructor() {
    super('provider_conversation', 10);
    this.llm = new LLMClient();
  }

  async execute(context) {
    const bookingId = context.booking_id || 'general';
    const message = context.chat_message || '';
    const ragText = (context.rag_chunks || []).map(chunk => `- ${chunk.content}`).join('\n');
    const provider = context.provider || {};
    const system = [
      'You are Asaaniyat, an agentic service-booking assistant coordinating customer and service provider conversations.',
      'Be concise, practical, friendly, and safety-aware. Do not invent prices or policies.',
      'Use RAG context when relevant, and ask one clear follow-up question if details are missing.',
      provider.name ? `Provider: ${provider.name}, service: ${provider.service_type || provider.service || 'service provider'}, phone: ${provider.phone || 'not provided'}.` : '',
      ragText ? `Relevant context:\n${ragText}` : ''
    ].filter(Boolean).join('\n');

    await db.saveChatMessage({ booking_id: bookingId, role: 'user', content: message, token_count: tokenize(message).tokens.length });
    const llmResult = await this.llm.generate({
      system,
      messages: [
        { role: 'user', content: `Conversation summary:\n${context.conversation_summary || ''}` },
        { role: 'user', content: message }
      ]
    });
    const reply = llmResult.text || 'I checked the service context. Please confirm the exact issue and your availability window.';
    await db.saveChatMessage({ booking_id: bookingId, role: 'assistant', content: reply, token_count: tokenize(reply).tokens.length });

    return {
      input: { booking_id: bookingId, message },
      output: { reply, provider: llmResult.provider, usage: llmResult.usage },
      reasoning: `Generated autonomous provider chat response via ${llmResult.provider} with token-aware context.`,
      contextUpdates: { chat_reply: reply, llm_provider: llmResult.provider, token_usage: llmResult.usage }
    };
  }
}

module.exports = ConversationAgent;
