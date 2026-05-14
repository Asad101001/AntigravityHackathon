const BaseAgent = require('./BaseAgent');
const { retrieve } = require('../rag/retriever');

class RagRetrievalAgent extends BaseAgent {
  constructor() {
    super('retrieve_rag_context', 8);
  }

  async execute(context) {
    const query = context.chat_message || context.user_text || '';
    const chunks = await retrieve(query, { topK: 4, tokenBudget: Number(process.env.RAG_TOKEN_BUDGET || 450) });
    return {
      input: { query },
      output: { chunks: chunks.map(c => ({ id: c.id, source: c.source, score: c.score, content: c.content.slice(0, 180) })) },
      reasoning: `Retrieved ${chunks.length} RAG chunks within token budget for provider conversation context.`,
      contextUpdates: { rag_chunks: chunks }
    };
  }
}

module.exports = RagRetrievalAgent;
