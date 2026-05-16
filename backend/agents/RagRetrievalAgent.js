'use strict';

const BaseAgent = require('./BaseAgent');
const { retrieve } = require('../rag/retriever');

class RagRetrievalAgent extends BaseAgent {
  constructor() {
    super('retrieve_rag_context', 8);
  }

  async execute(context) {
    const parts = [
      context.chat_message || context.user_text || '',
      context.service_type ? `service: ${context.service_type}` : '',
      context.provider?.name ? `provider: ${context.provider.name}` : '',
      context.provider?.service ? `type: ${context.provider.service}` : '',
      context.resolved_area ? `area: ${context.resolved_area}` : '',
    ].filter(Boolean);

    const query = parts.join(' ').trim();
    if (!query) {
      return {
        input: { query: '' },
        output: { chunk_count: 0, chunks: [] },
        reasoning: 'Empty query; skipped retrieval.',
        contextUpdates: { rag_chunks: [], rag_grounding_required: true },
      };
    }

    let chunks = [];
    try {
      chunks = await retrieve(query, {
        topK: Number(process.env.RAG_TOP_K || 4),
        tokenBudget: Number(process.env.RAG_TOKEN_BUDGET || 450),
      });
      chunks = chunks
        .filter(chunk => String(chunk.content || '').trim())
        .filter(chunk => typeof chunk.score !== 'number' || chunk.score >= Number(process.env.RAG_MIN_SCORE || 0));
    } catch (err) {
      console.error('[RagRetrievalAgent] Retrieval error:', err.message);
    }

    return {
      input: { query: query.slice(0, 140) },
      output: {
        chunk_count: chunks.length,
        chunks: chunks.map(chunk => ({
          id: chunk.id,
          source: chunk.source,
          score: typeof chunk.score === 'number' ? Number(chunk.score.toFixed(4)) : null,
          content: String(chunk.content || '').slice(0, 200),
        })),
      },
      reasoning: `Retrieved ${chunks.length} grounded chunk(s) for query: "${query.slice(0, 80)}". ConversationAgent may only answer from these chunks.`,
      contextUpdates: { rag_chunks: chunks, rag_grounding_required: true },
    };
  }
}

module.exports = RagRetrievalAgent;
