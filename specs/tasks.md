# Tasks — Agentic Upgrade Implementation Plan

## Phase A — Data & Schema (Day 1, ~2h)
- [x] A1: Add `specialization`, `base_rate_pkr`, `on_time_score`, `cancellation_risk`, `recent_sentiment` to all 60 providers in `providers.json`
- [x] A2: Update `db.js` CREATE TABLE to include new columns; drop + re-seed on schema change
- [x] A3: Write `specs/data-model.md` and `specs/research.md`

## Phase B — LLM Intent Parser (Day 1, ~3h)
- [x] B1: Create `backend/agents/LLMIntentParserAgent.js` — LLM call with JSON-only system prompt
- [x] B2: Extract `service_type`, `location`, `time`, `urgency_level` (high/low), `price_sensitivity` (high/low/neutral)
- [x] B3: Graceful fallback to regex-based `IntentParserAgent` if LLM unavailable or JSON parse fails
- [x] B4: Create `.agents/skills/intent-parser.yaml` with YAML frontmatter

## Phase C — LLM Reasoning Ranker (Day 1–2, ~4h)
- [x] C1: Create `backend/agents/LLMRankerAgent.js` — DELETE the hardcoded formula
- [x] C2: Build prompt that passes: provider list (name, distance, rating, specialization, on_time_score, cancellation_risk, recent_sentiment), user budget/urgency constraints
- [x] C3: Parse JSON response: `{ selected_provider_id, reasoning_log, ranked_ids }`
- [x] C4: Fallback to original `ProviderRankerAgent` if LLM call fails
- [x] C5: Create `.agents/skills/provider-ranker.yaml`

## Phase D — Dynamic Pricing Agent (Day 2, ~2h)
- [x] D1: Create `backend/agents/DynamicPricingAgent.js`
- [x] D2: Formula: `quote = base_rate_pkr + (distance_km * 150) * urgency_multiplier`
- [x] D3: `urgency_multiplier`: high=1.5, normal=1.0
- [x] D4: Expose `quote_pkr` + `quote_breakdown` in API response
- [x] D5: Create `.agents/skills/dynamic-pricing.yaml`

## Phase E — Chaos Simulator Agent (Day 2, ~3h)
- [x] E1: Create `backend/agents/ChaosSimulatorAgent.js`
- [x] E2: Accepts a `booking_id` or `provider_id` to simulate cancellation
- [x] E3: Removes cancelled provider, re-runs `LLMRankerAgent` on remaining list
- [x] E4: Returns `{ cancelled_provider, new_provider, reasoning_log }`
- [x] E5: Add `POST /api/chaos/simulate` route
- [x] E6: Create `.agents/skills/chaos-simulator.yaml`

## Phase F — Orchestrator + Routes Integration (Day 2, ~2h)
- [x] F1: Update `AntigravityOrchestrator.js` — replace `IntentParserAgent` with `LLMIntentParserAgent`, `ProviderRankerAgent` with `LLMRankerAgent`; insert `DynamicPricingAgent` after `DecisionMakerAgent`
- [x] F2: Pass `reasoning_log` and `quote_pkr` through to API response in `serviceRoutes.js`
- [x] F3: Wire chaos endpoint

## Phase G — UI Trace Surface (Day 3, ~2h)
- [ ] G1: Update `AgentTraceScreen` to render `reasoning_log` prominently
- [ ] G2: Add "AI Thinking" step label in `LoadingScreen` that shows live LLM reasoning text
- [ ] G3: Show `quote_pkr` and `quote_breakdown` in `ReviewBookingScreen`

## Phase H — Docs & Video (Day 3, ~2h)
- [ ] H1: Update README — Agentic vs SQL baseline comparison section
- [ ] H2: README cost/latency table (Groq ~200ms/call, Gemini ~400ms/call, demo 0ms)
- [ ] H3: Write demo video script featuring the Chaos Simulator stress test
