# Asaaniyat — Hackathon Compliance Tracker
> Auto-updated per Master Execution Plan. Keep this file in the repo root.

## Phase 1: Core Agentic Engine (45%)

| Requirement | Weight | Current State | Required Action | Status |
|---|---|---|---|---|
| Antigravity Integration | 20% | Monolithic orchestrator → modular `.agents/skills/` with YAML frontmatter | ✅ Refactored; Traces API logs spans per agent run | 🟢 Done |
| Matching & Decision Quality | 25% | Hardcoded math formula | ✅ LLMRankerAgent passes provider list + constraints to LLM; returns `reasoning_log` | 🟢 Done |
| Traceable Reasoning Logs | Req. | Hidden in backend console | ✅ `decision_reasoning` + full `execution_logs` returned in API response; surfaced in AgentTraceScreen | 🟢 Done |

## Phase 2: Robustness & Workflow (45%)

| Requirement | Weight | Current State | Required Action | Status |
|---|---|---|---|---|
| Multilingual Robustness | 15% | Basic regex | ✅ LLMIntentParserAgent handles mixed Urdu/English ambiguity; extracts urgency_level + price_sensitivity | 🟢 Done |
| Pricing & Service Workflow | 15% | No pricing logic | ✅ DynamicPricingAgent: base_rate_pkr + distance surcharge + urgency multiplier | 🟢 Done |
| Dispute Handling / Fallback | 15% | Basic try/catch | ✅ ChaosSimulatorAgent: provider cancellation → re-run LLMRanker → push update; `/api/chaos/simulate` endpoint | 🟢 Done |

## Phase 3: Polish & Deliverables (10%)

| Requirement | Weight | Current State | Required Action | Status |
|---|---|---|---|---|
| Innovation & UX | 10% | Standard booking UI | ✅ AgentTraceScreen surfaces `reasoning_log`; LoadingScreen shows step-by-step AI narration | 🟢 Done |
| Baseline Comparison | Req. | None | ✅ README section: Agentic vs Standard SQL query | 🟡 README update pending |
| Cost & Scalability Note | Req. | Basic free tier list | ✅ README: latency ms + cost per call table | 🟡 README update pending |
| Demo Video Script | Req. | Happy-path only | Stress Test script: cancellation → re-booking recovery flow | 🟡 Script pending |
