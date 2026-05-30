'use strict';

const BaseAgent = require('./BaseAgent');
const LLMClient = require('../llm/LLMClient');
const db = require('../db');
const { tokenize } = require('../utils/textTokenizer');

const NO_CONTEXT_REPLY = "I don't have specific information about that right now. Could you clarify?";

class ConversationAgent extends BaseAgent {
  constructor() {
    super('provider_conversation', 10);
    this.llm = new LLMClient();
  }

  async execute(context) {
    const bookingId = context.booking_id || 'general';
    const message = context.chat_message || '';
    const provider = context.provider || {};
    const ragChunks = Array.isArray(context.rag_chunks) ? context.rag_chunks : [];
    const ragBlock = this._formatRagChunks(ragChunks);

    await this._safeSaveMessage({
      booking_id: bookingId,
      user_id: context.user_id || null,
      role: 'user',
      content: message,
      token_count: tokenize(message).tokens.length,
    });

    const userPrompt = [
      context.conversation_summary
        ? `CONVERSATION HISTORY SUMMARY:\n${context.conversation_summary}`
        : 'CONVERSATION HISTORY: This is the start of the conversation.',
      '',
      `USER MESSAGE:\n${message}`,
    ].join('\n');

    let reply = '';
    let providerTag = 'local_fallback';
    let usage = null;

    if (!ragChunks.length) {
      reply = NO_CONTEXT_REPLY;
    } else {
      try {
        reply = await this.llm.complete({
          system: this._buildSystemPrompt(provider, ragBlock),
          user: userPrompt,
          temperature: 0.05,
          maxTokens: 180,
        });
        providerTag = this.llm.groqKey ? 'groq' : 'gemini';
      } catch (err) {
        console.warn('[ConversationAgent] LLM unavailable; using grounded fallback:', err.message);
        reply = this._groundedFallback(ragChunks);
      }
    }

    reply = this._enforceGrounding(reply, ragChunks);

    await this._safeSaveMessage({
      booking_id: bookingId,
      user_id: context.user_id || null,
      role: 'assistant',
      content: reply,
      token_count: tokenize(reply).tokens.length,
    });

    return {
      input: { booking_id: bookingId, message: message.slice(0, 120) },
      output: { reply, provider: providerTag, usage, rag_chunks_used: ragChunks.length },
      reasoning: `Strictly grounded reply via ${providerTag} using ${ragChunks.length} RAG chunk(s).`,
      contextUpdates: { chat_reply: reply, llm_provider: providerTag, token_usage: usage },
    };
  }

  _buildSystemPrompt(provider, ragBlock) {
    const providerLine = provider.name
      ? `ACTIVE BOOKING: Provider "${provider.name}", service "${provider.service_type || provider.service || 'home service'}".`
      : 'ACTIVE BOOKING: Not specified.';

    return [
      'You are Asaaniyat, a service-booking coordination assistant for Pakistani home services.',
      providerLine,
      '',
      'STRICT GROUNDING RULES:',
      '1. Answer only from the retrieved context chunks below.',
      '2. Do not invent provider names, phone numbers, prices, policies, timings, availability, or service coverage.',
      '3. If the chunks do not contain the answer, reply exactly with: "I don\'t have specific information about that right now. Could you clarify?"',
      '4. Do not use training data or general knowledge to fill missing details.',
      '5. Keep the final answer to at most 3 concise sentences.',
      '6. LANGUAGE MATCHING: If the user writes in Urdu, Roman Urdu (Hinglish), or any mix of Urdu and English, you MUST reply in Roman Urdu (Urdu written in Latin script). Match the user\'s language naturally.',
      '',
      'RETRIEVED CONTEXT CHUNKS:',
      ragBlock,
    ].join('\n');
  }

  _formatRagChunks(chunks) {
    return chunks
      .map((chunk, index) => {
        const score = typeof chunk.score === 'number' ? chunk.score.toFixed(3) : 'unknown';
        return `[${index + 1}] source="${chunk.source || 'knowledge-base'}" relevance="${score}"\n${String(chunk.content || '').trim()}`;
      })
      .join('\n\n');
  }

  _groundedFallback(chunks) {
    const snippet = String(chunks[0]?.content || '').replace(/\s+/g, ' ').trim().slice(0, 220);
    if (!snippet) return NO_CONTEXT_REPLY;
    return `Based on the retrieved service notes: ${snippet}`;
  }

  _enforceGrounding(reply, chunks) {
    const cleanReply = String(reply || '').trim();
    if (!chunks.length) return NO_CONTEXT_REPLY;
    if (!cleanReply) return this._groundedFallback(chunks);

    const chunkText = chunks.map(chunk => String(chunk.content || '').toLowerCase()).join(' ');
    const riskyPatterns = [
      /\b03\d{2}[- ]?\d{7}\b/,
      /\b(rs\.?|pkr)\s?\d+/i,
      /\b\d{1,2}:\d{2}\b/,
    ];
    const containsRiskyUnsupportedClaim = riskyPatterns.some(pattern => pattern.test(cleanReply) && !pattern.test(chunkText));
    return containsRiskyUnsupportedClaim ? NO_CONTEXT_REPLY : cleanReply;
  }

  async _safeSaveMessage(message) {
    try {
      await db.saveChatMessage(message);
    } catch (err) {
      console.error(`[ConversationAgent] DB save failed for ${message.role}:`, err.message);
    }
  }
}

module.exports = ConversationAgent;
