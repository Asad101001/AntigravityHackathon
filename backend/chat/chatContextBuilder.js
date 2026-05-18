'use strict';

/**
 * Builds a compact structured context object to send as part of LLM prompts.
 * Keeps keys small to limit token usage but preserves essential state.
 */
function buildChatContext({ session = {}, lastIntent = null, userLocation = null, shortlist = [], extra = {} } = {}) {
  return {
    sid: session.id || session.sessionId || null,
    loc: userLocation ? { lat: Number(userLocation.lat || 0), lng: Number(userLocation.lng || 0), label: userLocation.label || userLocation.area_name || null } : null,
    intent: lastIntent ? { name: lastIntent.name || null, slots: lastIntent.slots || null, confidence: lastIntent.confidence || null } : null,
    shortlist: Array.isArray(shortlist) ? shortlist.slice(0, 6).map(p => ({ id: p.id, name: p.name, score: p.score })) : [],
    t: new Date().toISOString(),
    ...extra,
  };
}

module.exports = { buildChatContext };
