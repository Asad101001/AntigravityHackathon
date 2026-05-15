# Research — Why We Are Doing This

## Problem Statement
The original Asaaniyat MVP used deterministic, hard-coded logic throughout its critical decision paths:
- **IntentParser** relied on regex keyword matching — brittle for mixed Urdu/English and completely unable to infer price sensitivity or urgency nuance.
- **ProviderRanker** applied a static weighted formula `(distance×0.30 + rating×0.30 + availability×0.20 + response_time×0.20)` — this is a query engine, not an agent. It cannot trade off "cheap and far" vs "expensive and close" based on user context.
- **No pricing logic existed** — the system produced a booking with no cost estimate, which breaks real-world trust.
- **No resilience** — a provider cancellation crashed the flow entirely.

## Why LLM-Based Agentic Reasoning
Judges for Google Antigravity Challenge 2 explicitly require **Agentic Reasoning**, defined as:
> *"Systems that observe context, reason about trade-offs, and take autonomous actions — not systems that execute deterministic pipelines."*

LLM-backed agents satisfy this because:
1. They can **explain** why they chose provider A over B (natural-language `reasoning_log`).
2. They handle **ambiguous or underspecified** user input without crashing.
3. They can **re-plan** when circumstances change (chaos / cancellation flow).

## Why Modular `.agents/skills/` Architecture
The Antigravity SDK expects agents to be independently describable units with a clear contract (input schema, output schema, skill description). Keeping all logic in a single `orchestrator.js` violates the single-responsibility principle and makes traces impossible to attribute to individual agents.

Each skill YAML file provides:
- Human-readable description for Antigravity's trace UI
- Canonical input/output schema
- Fallback policy

## References
- Google Antigravity Hackathon Briefing — Challenge 2
- Anthropic Claude API (via `LLMClient` wrapper — Groq primary, Gemini fallback, local demo)
- Pakistan Informal Economy stats: ~70% of home services are booked via word-of-mouth; zero digital pricing transparency.
