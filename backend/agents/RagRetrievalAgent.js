/**
 * Agent 8: RagRetrievalAgent — enriched query, error-safe
 *
 * Improvements over v1:
 *  • Query now includes service_type and provider name so BM25 scoring
 *    finds contextually relevant chunks (not just message keyword overlap).
 *  • Retrieval failure is caught and returns an empty chunk list —
 *    ConversationAgent handles no-context gracefully.
 *  • Output includes full score for transparency in trace logs.
 */

'use strict';

const BaseAgent      = require('./BaseAgent');
const { retrieve }   = require('../rag/retriever');

class RagRetrievalAgent extends BaseAgent {
  constructor() {
    super('retrieve_rag_context', 8);
  }

  async execute(context) {
    // Build a semantically richer query by blending the user message with
    // known service/provider context — this lifts BM25 recall significantly.
    const parts = [
      context.chat_message || context.user_text || '',
      context.service_type ? `service: ${context.service_type}` : '',
      context.provider?.name      ? `provider: ${context.provider.name}`      : '',
      context.provider?.service   ? `type: ${context.provider.service}`        : '',
      context.resolved_area       ? `area: ${context.resolved_area}`           : '',
    ].filter(Boolean);

    const query = parts.join(' ').trim();

    if (!query) {
      return {
        input:          { query: '' },
        output:         { chunk_count: 0, chunks: [] },
        reasoning:      'Empty query — skipped retrieval.',
        contextUpdates: { rag_chunks: [] },
      };
    }

    let chunks = [];
    try {
      chunks = await retrieve(query, {
        topK:        4,
        tokenBudget: Number(process.env.RAG_TOKEN_BUDGET || 450),
      });
    } catch (err) {
      console.error('[RagRetrievalAgent] Retrieval error:', err.message);
      // Return empty — ConversationAgent will note missing context in its reply
    }

    return {
      input: { query: query.slice(0, 140) },
      output: {
        chunk_count: chunks.length,
        chunks: chunks.map(c => ({
          id:      c.id,
          source:  c.source,
          score:   typeof c.score === 'number' ? +c.score.toFixed(4) : null,
          content: (c.content || '').slice(0, 200),
        })),
      },
      reasoning:      `Retrieved ${chunks.length} chunk(s) (BM25 + phrase-bonus) for query: "${query.slice(0, 80)}…"`,
      contextUpdates: { rag_chunks: chunks },
    };
  }
}

module.exports = RagRetrievalAgent;