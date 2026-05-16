/**
 * Agent 10: ConversationAgent — strictly grounded in retrieved context
 *
 * Hallucination fixes:
 *  1. System prompt explicitly forbids inventing prices, names, or policies.
 *  2. RAG chunks are formatted as numbered, source-labelled blocks so the LLM
 *     can cite them directly and cannot confuse context with internal knowledge.
 *  3. When no context was retrieved the prompt says so explicitly — the model is
 *     instructed to acknowledge this rather than fill the gap with training data.
 *  4. Temperature reduced to 0.20 (from 0.35) to cut creative drift.
 *  5. db.saveChatMessage calls are individually try/caught so a DB write failure
 *     never aborts the entire conversation turn.
 */

'use strict';

const BaseAgent      = require('./BaseAgent');
const LLMClient      = require('../llm/LLMClient');
const db             = require('../db');
const { tokenize }   = require('../utils/textTokenizer');

class ConversationAgent extends BaseAgent {
  constructor() {
    super('provider_conversation', 10);
    this.llm = new LLMClient();
  }

  async execute(context) {
    const bookingId = context.booking_id || 'general';
    const message   = context.chat_message || '';
    const provider  = context.provider     || {};
    const ragChunks = context.rag_chunks   || [];

    // ── Format retrieved context for the LLM ───────────────────────────
    // Each chunk is numbered and source-labelled so the model can reference it.
    const ragBlock = ragChunks.length
      ? ragChunks
          .map((c, i) =>
            `[${i + 1}] source="${c.source || 'knowledge-base'}" relevance=${c.score?.toFixed(3) || '?'}\n${c.content}`
          )
          .join('\n\n')
      : null;

    // ── System prompt — strict grounding ──────────────────────────────
    const systemParts = [
      'You are Asaaniyat, a service-booking coordination assistant for Pakistani home services (Karachi, Lahore, Islamabad).',
      '',
      '════════════ STRICT GROUNDING RULES ════════════',
      '1. ONLY answer using information from the RETRIEVED CONTEXT CHUNKS provided at the end of this prompt.',
      '2. If the retrieved context does not contain sufficient information to answer confidently, say exactly:',
      '   "I don\'t have specific information about that right now — could you clarify?" Do NOT invent an answer.',
      '3. NEVER fabricate: provider names, phone numbers, prices, policies, slot availability, or service coverage.',
      '4. NEVER use information from your training data to fill a gap in the retrieved context.',
      '5. If asked a price, ONLY quote a figure if it appears verbatim in a context chunk.',
      '═════════════════════════════════════════════════',
      '',
      'RESPONSE STYLE:',
      '- Maximum 3 sentences. Be concise, friendly, and practical.',
      '- If a critical detail is missing, ask ONE clear follow-up question.',
      '- Mirror the user\'s language (English / Urdu / Roman-Urdu).',
      '- Never use bullet points in the reply — plain prose only.',
      '',
    ];

    if (provider.name) {
      systemParts.push(`ACTIVE BOOKING: Provider "${provider.name}", service: "${provider.service_type || provider.service || 'home service'}", contact: ${provider.phone || 'not available'}.`);
      systemParts.push('');
    }

    if (ragBlock) {
      systemParts.push('RETRIEVED CONTEXT (your answer MUST come only from here):');
      systemParts.push(ragBlock);
    } else {
      systemParts.push('RETRIEVED CONTEXT: None retrieved for this query.');
      systemParts.push('Acknowledge this limitation in your response and ask the user to clarify their question.');
    }

    const system = systemParts.join('\n');

    // ── Save user message ──────────────────────────────────────────────
    try {
      await db.saveChatMessage({
        booking_id:  bookingId,
        role:        'user',
        content:     message,
        token_count: tokenize(message).tokens.length,
      });
    } catch (dbErr) {
      console.error('[ConversationAgent] DB save (user msg) failed:', dbErr.message);
    }

    // ── Build conversational user prompt ──────────────────────────────
    const userPrompt = [
      context.conversation_summary
        ? `CONVERSATION HISTORY SUMMARY:\n${context.conversation_summary}`
        : 'CONVERSATION HISTORY: This is the start of the conversation.',
      '',
      `USER MESSAGE:\n${message}`,
    ].join('\n');

    // ── LLM call ──────────────────────────────────────────────────────
    let reply       = '';
    let providerTag = 'local_fallback';
    let usage       = null;

    try {
      reply       = await this.llm.complete({
        system,
        user:       userPrompt,
        temperature: 0.20,   // lower temp = less creative drift
        maxTokens:   220,
      });
      providerTag = this.llm.groqKey ? 'groq' : 'gemini';
    } catch (err) {
      console.warn('[ConversationAgent] LLM unavailable — using safe fallback:', err.message);

      // Safe fallback: surface the top RAG chunk rather than hallucinating
      if (ragChunks.length) {
        const snippet = ragChunks[0].content.slice(0, 220).replace(/\s+/g, ' ').trim();
        reply = `Based on available information: ${snippet}. Could you please confirm the specific issue and your preferred time window?`;
      } else {
        reply = 'I can help coordinate this. Could you please confirm the issue, preferred time window, and any access instructions for the provider?';
      }
    }

    // ── Save assistant reply ───────────────────────────────────────────
    try {
      await db.saveChatMessage({
        booking_id:  bookingId,
        role:        'assistant',
        content:     reply,
        token_count: tokenize(reply).tokens.length,
      });
    } catch (dbErr) {
      console.error('[ConversationAgent] DB save (assistant reply) failed:', dbErr.message);
    }

    return {
      input:   { booking_id: bookingId, message: message.slice(0, 120) },
      output:  { reply, provider: providerTag, usage, rag_chunks_used: ragChunks.length },
      reasoning: `Grounded reply via ${providerTag} using ${ragChunks.length} RAG chunk(s). Temperature: 0.20.`,
      contextUpdates: { chat_reply: reply, llm_provider: providerTag, token_usage: usage },
    };
  }
}

module.exports = ConversationAgent;