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

    const prompt = [
      `Conversation summary:\n${context.conversation_summary || 'No prior summary.'}`,
      '',
      `Latest customer message:\n${message}`
    ].join('\n');

    let reply;
    let providerName = 'local_fallback';
    let usage = null;
    try {
      reply = await this.llm.complete({ system, user: prompt, temperature: 0.35, maxTokens: 220 });
      providerName = this.llm.groqKey ? 'groq' : 'gemini';
    } catch (error) {
      console.warn('[ConversationAgent] LLM chat unavailable, using safe fallback:', error.message);
      reply = 'I can help coordinate this. Please confirm the exact issue, preferred time window, and any access instructions for the provider.';
    }

    await db.saveChatMessage({ booking_id: bookingId, role: 'assistant', content: reply, token_count: tokenize(reply).tokens.length });

    return {
      input: { booking_id: bookingId, message },
      output: { reply, provider: providerName, usage },
      reasoning: `Generated provider chat response via ${providerName} with token-aware context.`,
      contextUpdates: { chat_reply: reply, llm_provider: providerName, token_usage: usage }
    };
  }
}

module.exports = ConversationAgent;
