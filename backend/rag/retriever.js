/**
 * retriever.js — BM25-inspired RAG retrieval
 *
 * Fixes over original:
 *  1. BM25-style term frequency scoring replaces simple Dice overlap.
 *     Long chunks are no longer unfairly rewarded just for containing more tokens.
 *  2. Phrase-level bonus: contiguous bigrams/trigrams from the query that appear
 *     verbatim in a chunk receive an additional score boost, promoting contextually
 *     tight matches over loose token overlap.
 *  3. All DB reads are wrapped in try/catch — retrieval never throws to the caller.
 *  4. Edge cases (empty query, zero chunks, no budget) are handled gracefully.
 */

'use strict';

const db           = require('../db');
const { tokenize } = require('../utils/textTokenizer');
const { chunkText } = require('./chunker');

// ── BM25 hyper-parameters ─────────────────────────────────────────────────────
// k1: term-frequency saturation (1.2–2.0 are common; 1.2 for short home-service texts)
// b:  length normalisation (0.75 standard)
const BM25_K1 = 1.2;
const BM25_B  = 0.75;

/**
 * BM25-inspired score for a single chunk against the query.
 *
 * @param {string[]} queryTokens  - Unique tokens from the query
 * @param {string[]} chunkTokens  - Tokens stored with this chunk
 * @param {number}   avgLen       - Average token count across the corpus
 * @returns {number}
 */
function scoreBM25(queryTokens, chunkTokens, avgLen) {
  if (!queryTokens.length || !chunkTokens.length) return 0;

  const chunkLen   = chunkTokens.length;
  const normFactor = 1 - BM25_B + BM25_B * (chunkLen / Math.max(avgLen, 1));

  // Build term-frequency map
  const tf = Object.create(null);
  for (const tok of chunkTokens) {
    tf[tok] = (tf[tok] || 0) + 1;
  }

  let score = 0;
  for (const tok of queryTokens) {
    const freq = tf[tok] || 0;
    if (freq > 0) {
      score += (freq * (BM25_K1 + 1)) / (freq + BM25_K1 * normFactor);
    }
  }

  // Normalise by query length so long queries don't dominate short chunks
  return score / Math.max(queryTokens.length, 1);
}

/**
 * Phrase-level bonus: reward chunks where contiguous n-grams from the query
 * appear verbatim.  Trigrams earn more than bigrams.
 *
 * @param {string[]} queryNgrams - All n-grams generated from the query
 * @param {string}   content     - Raw chunk text
 * @returns {number} bonus ∈ [0, ~1]
 */
function phraseBonus(queryNgrams, content) {
  if (!queryNgrams.length || !content) return 0;
  const lc = content.toLowerCase();
  let bonus = 0;
  for (const ngram of queryNgrams) {
    if (!ngram.includes(' ')) continue; // skip unigrams — already in BM25
    if (lc.includes(ngram)) {
      // More words in the phrase → bigger bonus (max 0.5 per phrase)
      bonus += Math.min(ngram.split(' ').length * 0.12, 0.5);
    }
  }
  return Math.min(bonus, 1.5); // cap total phrase bonus
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ingest a plain-text document into the RAG store.
 * Chunks are created by chunker.js and stored in SQLite via db.saveRagChunk.
 *
 * @param {{ source: string, content: string, metadata?: object }} opts
 * @returns {Promise<object[]>} saved chunk records
 */
async function ingestText({ source, content, metadata = {} }) {
  if (!content?.trim()) return [];

  const chunks = chunkText(content);
  const saved  = [];

  for (const chunk of chunks) {
    try {
      const record = await db.saveRagChunk({
        source,
        content:  chunk.content,
        tokens:   chunk.tokens,
        metadata,
      });
      saved.push(record);
    } catch (err) {
      console.error('[RAG ingest] Failed to save chunk:', err.message);
    }
  }

  return saved;
}

/**
 * Retrieve the most relevant RAG chunks for a query.
 *
 * @param {string}  query
 * @param {{ topK?: number, tokenBudget?: number }} opts
 * @returns {Promise<object[]>} ranked chunks with a `.score` field attached
 */
async function retrieve(query, { topK = 4, tokenBudget = 450 } = {}) {
  if (!query?.trim()) return [];

  const parsed      = tokenize(query);
  const queryTokens = parsed.uniqueTokens;
  const queryNgrams = parsed.ngrams || [];

  // ── Load corpus ────────────────────────────────────────────────────────
  let corpus = [];
  try {
    corpus = await db.getRagChunks(400);
  } catch (err) {
    console.error('[RAG retrieve] DB read failed:', err.message);
    return [];
  }

  if (!corpus.length) return [];

  // ── Pre-compute average chunk length for BM25 normalisation ───────────
  const avgLen = corpus.reduce((sum, c) => sum + (c.tokens?.length || 0), 0) / corpus.length;

  // ── Score every chunk ──────────────────────────────────────────────────
  const ranked = corpus
    .map(chunk => {
      const tokens  = Array.isArray(chunk.tokens) ? chunk.tokens : [];
      const base    = scoreBM25(queryTokens, tokens, avgLen);
      const bonus   = phraseBonus(queryNgrams, chunk.content || '');
      return { ...chunk, score: base + bonus };
    })
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score);

  // ── Select top-K within token budget ───────────────────────────────────
  const selected  = [];
  let usedTokens  = 0;

  for (const chunk of ranked) {
    const count = tokenize(chunk.content || '').tokens.length;
    if (usedTokens + count > tokenBudget) continue;
    selected.push(chunk);
    usedTokens += count;
    if (selected.length >= topK) break;
  }

  return selected;
}

module.exports = { ingestText, retrieve };