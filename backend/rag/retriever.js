const db = require('../db');
const { tokenize } = require('../utils/textTokenizer');
const { chunkText } = require('./chunker');

function scoreChunk(queryTokens, chunkTokens) {
  if (!queryTokens.length || !chunkTokens.length) return 0;
  const chunkSet = new Set(chunkTokens);
  const overlap = queryTokens.filter(token => chunkSet.has(token)).length;
  return overlap / Math.sqrt(queryTokens.length * chunkTokens.length);
}

async function ingestText({ source, content, metadata = {} }) {
  const chunks = chunkText(content);
  const saved = [];
  for (const chunk of chunks) {
    saved.push(await db.saveRagChunk({ source, content: chunk.content, tokens: chunk.tokens, metadata }));
  }
  return saved;
}

async function retrieve(query, { topK = 4, tokenBudget = 450 } = {}) {
  const queryTokens = tokenize(query).uniqueTokens;
  const chunks = await db.getRagChunks(300);
  const ranked = chunks
    .map(chunk => ({ ...chunk, score: scoreChunk(queryTokens, chunk.tokens || []) }))
    .filter(chunk => chunk.score > 0)
    .sort((a, b) => b.score - a.score);

  const selected = [];
  let used = 0;
  for (const chunk of ranked) {
    const count = tokenize(chunk.content).tokens.length;
    if (used + count > tokenBudget) continue;
    selected.push(chunk);
    used += count;
    if (selected.length >= topK) break;
  }
  return selected;
}

module.exports = { ingestText, retrieve };
