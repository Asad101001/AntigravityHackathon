// Build a compact, structured context object for LLM/chat usage.

function summarizeLastTurn(turns){
  if(!turns || turns.length === 0) return null;
  const last = turns[turns.length -1];
  return `${last.role||'user'}: ${String(last.text||last.message||'').slice(0,120)}`;
}

function buildContext({messages = [], clientLocation = null, lastIntent = null, recentProviders = [], sessionId = null}){
  return {
    sessionId,
    location: clientLocation ? { name: clientLocation.name, lat: clientLocation.lat, lon: clientLocation.lon } : null,
    lastIntent,
    recentProviders: (recentProviders||[]).slice(0,5).map(p => ({ id: p.id, name: p.name, score: p.score })),
    lastTurnSummary: summarizeLastTurn(messages)
  };
}

module.exports = { buildContext };
