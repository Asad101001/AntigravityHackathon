const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'am', 'in', 'at', 'on', 'for', 'to', 'of', 'and', 'or',
  'mein', 'me', 'main', 'mai', 'ka', 'ki', 'ke', 'ko', 'se', 'please', 'plz', 'need', 'needed',
  'chahiye', 'chahye', 'chaiye', 'wala', 'wali', 'bulao', 'kar', 'do', 'karo'
]);

function normalizeText(value = '') {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’'`]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/[-_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function tokenize(value = '') {
  const normalized = normalizeText(value);
  const tokens = normalized
    .split(' ')
    .map(token => token.trim())
    .filter(token => token.length > 0)
    .filter(token => !STOP_WORDS.has(token));

  const bigrams = [];
  for (let i = 0; i < tokens.length - 1; i += 1) {
    bigrams.push(`${tokens[i]} ${tokens[i + 1]}`);
  }

  const trigrams = [];
  for (let i = 0; i < tokens.length - 2; i += 1) {
    trigrams.push(`${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`);
  }

  return {
    raw: value,
    normalized,
    tokens,
    ngrams: [...trigrams, ...bigrams, ...tokens],
    uniqueTokens: Array.from(new Set(tokens))
  };
}

module.exports = { normalizeText, tokenize, STOP_WORDS };
