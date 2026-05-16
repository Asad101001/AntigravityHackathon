/**
 * retryHelper.js — Exponential backoff with jitter
 *
 * Handles:
 *   - HTTP 429 Too Many Requests (rate limit)
 *   - HTTP 503 / 502 (transient server errors)
 *   - Network errors (fetch failures)
 *
 * Usage:
 *   const data = await withRetry(() => fetch(url).then(r => r.json()), {
 *     maxAttempts: 4,
 *     baseDelayMs: 500,
 *     label: 'Groq',
 *   });
 */

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

/**
 * @param {() => Promise<T>}  fn
 * @param {{ maxAttempts?: number, baseDelayMs?: number, maxDelayMs?: number, label?: string }} opts
 * @returns {Promise<T>}
 */
async function withRetry(fn, opts = {}) {
  const {
    maxAttempts = 4,
    baseDelayMs = 500,
    maxDelayMs  = 16000,
    label       = 'Request',
  } = opts;

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();

      // If the fn returned a Response object, check status before returning
      if (result && typeof result.ok === 'boolean' && !result.ok) {
        if (RETRYABLE_STATUS_CODES.has(result.status)) {
          const retryAfter = _parseRetryAfter(result);
          const delay      = retryAfter ?? _backoffDelay(attempt, baseDelayMs, maxDelayMs);
          console.warn(`[${label}] HTTP ${result.status} on attempt ${attempt}/${maxAttempts}. Retrying in ${delay}ms…`);
          lastError = new Error(`HTTP ${result.status}`);
          if (attempt < maxAttempts) await _sleep(delay);
          continue;
        }
        // Non-retryable HTTP error — throw immediately
        const errText = await result.text().catch(() => '');
        throw new Error(`[${label}] HTTP ${result.status}: ${errText.slice(0, 200)}`);
      }

      return result;
    } catch (err) {
      lastError = err;

      // Already an annotated error from above — re-throw if not retryable
      if (err.message?.startsWith('[') && !_isRetryableError(err)) {
        throw err;
      }

      if (attempt === maxAttempts) break;

      const delay = _backoffDelay(attempt, baseDelayMs, maxDelayMs);
      console.warn(`[${label}] Error on attempt ${attempt}/${maxAttempts}: ${err.message}. Retrying in ${delay}ms…`);
      await _sleep(delay);
    }
  }

  throw lastError ?? new Error(`[${label}] All ${maxAttempts} attempts failed`);
}

/**
 * Wrap a fetch() call so status-code checks happen inside withRetry.
 * Throws a structured error with { status, body } for non-OK responses.
 */
async function fetchWithRetry(url, fetchOptions = {}, retryOptions = {}) {
  return withRetry(async () => {
    const res = await fetch(url, fetchOptions);

    if (!res.ok) {
      if (RETRYABLE_STATUS_CODES.has(res.status)) {
        const retryAfterMs = _parseRetryAfter(res);
        const err          = new Error(`HTTP ${res.status}`);
        err.status         = res.status;
        err.retryAfterMs   = retryAfterMs;
        err.retryable      = true;
        throw err;
      }
      const body = await res.text().catch(() => '');
      const err  = new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
      err.status = res.status;
      throw err;
    }

    return res.json();
  }, {
    ...retryOptions,
    // Override delay with Retry-After header if present
    customDelayFn: (attempt, baseDelayMs, maxDelayMs, err) =>
      err?.retryAfterMs ?? _backoffDelay(attempt, baseDelayMs, maxDelayMs),
  });
}

// ── Internals ─────────────────────────────────────────────────────────────────

function _backoffDelay(attempt, baseDelayMs, maxDelayMs) {
  // Exponential + full jitter: delay = random(0, min(cap, base * 2^attempt))
  const exponential = baseDelayMs * Math.pow(2, attempt - 1);
  const capped      = Math.min(exponential, maxDelayMs);
  return Math.floor(Math.random() * capped);
}

function _parseRetryAfter(response) {
  if (typeof response?.headers?.get !== 'function') return null;
  const header = response.headers.get('Retry-After');
  if (!header) return null;
  const seconds = parseFloat(header);
  if (!isNaN(seconds)) return Math.ceil(seconds * 1000);
  const date = Date.parse(header);
  if (!isNaN(date)) return Math.max(0, date - Date.now());
  return null;
}

function _isRetryableError(err) {
  if (err?.retryable) return true;
  const msg = err?.message || '';
  return /429|503|502|504|ECONNRESET|ETIMEDOUT|ENOTFOUND|network/i.test(msg);
}

function _sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { withRetry, fetchWithRetry };