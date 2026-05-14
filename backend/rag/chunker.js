const { tokenize } = require('../utils/textTokenizer');

function chunkText(text = '', { maxTokens = 120, overlap = 20 } = {}) {
  const parsed = tokenize(text);
  const words = parsed.normalized.split(' ').filter(Boolean);
  if (words.length === 0) return [];

  const chunks = [];
  let index = 0;
  while (index < words.length) {
    const slice = words.slice(index, index + maxTokens);
    chunks.push({
      content: slice.join(' '),
      tokens: tokenize(slice.join(' ')).uniqueTokens,
      token_count: slice.length
    });
    if (index + maxTokens >= words.length) break;
    index += Math.max(1, maxTokens - overlap);
  }
  return chunks;
}

module.exports = { chunkText };
