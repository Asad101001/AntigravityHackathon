# Task Tracker — Agentic Mobile Refinement

## Backend
- [x] Added tokenization utility for normalized tokens and n-grams.
- [x] Added fuzzy location normalizer and similarity scoring.
- [x] Updated `IntentParserAgent` to emit tokens and fuzzy location candidates.
- [x] Updated `LocationResolverAgent` to support typed fuzzy matches and explicit map coordinates.
- [x] Updated `ProviderDiscovererAgent` to compute haversine distance and use radius fallbacks.
- [x] Added SQLite tables and helpers for chat messages and RAG chunks.
- [x] Added local chunking/retrieval modules for token-budgeted RAG.
- [x] Added LLM client with Groq primary, Gemini fallback, and local demo mode.
- [x] Added RAG retrieval, summarization, and conversation agents.
- [x] Added chat and RAG API routes.
- [x] Added `.env.example` for clone-and-run configuration.
- [x] Gated runtime API doc generation behind an environment flag.

## Mobile
- [x] Replaced color tokens with a light mint service-booking palette.
- [x] Rebuilt the home screen around the supplied Stitch-style layout.
- [x] Added map-based location picking.
- [x] Passed selected coordinates into the booking pipeline.
- [x] Rebuilt provider results with map markers and selectable provider cards.
- [x] Added checkout-style booking review screen.
- [x] Added provider chat screen connected to the backend chat agent.
- [x] Updated app navigation for new screens.

## Docs
- [x] Added implementation plan for this run.
- [x] Added task tracker for this run.
- [x] Added walkthrough for this run.
- [x] Updated README setup and feature descriptions.
