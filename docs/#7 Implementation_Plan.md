# Implementation Plan — Agentic Mobile Refinement

## Goal

Refine Asaaniyat into a clone-and-run Expo + Node application with a Stitch-inspired mobile UI, dynamic backend connectivity, tokenized/fuzzy parsing, coordinate-aware provider assignment, and an agentic RAG/chat layer for conversations with service providers.

## Backend Plan

### 1. Tokenized natural language parsing
- Add reusable tokenization for English, Urdu, and Roman Urdu input.
- Preserve normalized tokens in the orchestration context and API response.
- Use token windows and n-grams so location/service matching is broader than exact regex matching.

### 2. Fuzzy location resolver
- Normalize punctuation, hyphens, and common area words.
- Resolve hard names such as `Gulshan-e-Iqbal`, `gulshan e iqbal`, and `gulshan` through reusable similarity scoring rather than one-off aliases.
- Continue validating coordinates against the Pakistan bounding box.

### 3. Dynamic distance-based provider matching
- Accept optional `user_location` coordinates from map/current location.
- Prefer explicit map coordinates, then typed fuzzy location, then fallback text matching.
- Compute provider distance using haversine distance and rank by computed distance, rating, availability, and response time.

### 4. Agentic RAG/chat system
- Add local SQLite-backed RAG chunks with token-budget retrieval.
- Add `RagRetrievalAgent`, `SummarizationAgent`, and `ConversationAgent` orchestrated by the existing Antigravity class.
- Add Groq primary and Gemini fallback support through environment variables, with a no-key demo response so the app works from a fresh clone.

### 5. API routes
- Keep `POST /api/service-request` as the booking pipeline.
- Add `POST /api/chat/message`, `GET /api/chat/:booking_id`, `POST /api/rag/ingest`, and `POST /api/rag/query`.

## Mobile Plan

### 1. Light mint booking UI
- Replace dark neon visuals with a soft white/mint green visual system inspired by the supplied screenshots.
- Build a new home screen with location pill, prompt/search card, quick chips, featured card, express card, and bottom tabs.

### 2. Map/location picking
- Add a `LocationPickerScreen` using `react-native-maps` and `expo-location`.
- Pass selected coordinates into the service request so backend ranking uses actual distance.

### 3. Booking and chat flow
- Allow all listed providers to be booked, not only the recommended provider.
- Add checkout-style `ReviewBookingScreen`.
- Add `ProviderChatScreen` connected to the RAG/chat backend.

## Documentation Plan

- Update README with current run commands and optional AI-key setup.
- Add this implementation plan, a walkthrough, and a task tracker for this successful code-change run.
- Gate timestamped runtime API docs behind `GENERATE_API_DOCS_ON_START=true` to prevent noisy docs on normal startup.
