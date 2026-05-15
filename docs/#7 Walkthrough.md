# Walkthrough — Agentic Mobile Refinement

## What changed

This run upgrades Asaaniyat from a deterministic booking demo into a more autonomous, agentic service application.

## Clone-and-run flow

1. Start the backend:
   ```bash
   cd backend
   npm install
   npm start
   ```
2. Start Expo:
   ```bash
   cd mobile
   npm install
   npx expo start
   ```
3. The mobile app derives the backend host from the Expo LAN URL during development. For standalone builds, set:
   ```bash
   EXPO_PUBLIC_API_BASE_URL=http://YOUR_LAN_IP:3000 npx expo start
   ```

## User journey

1. The user opens a light mint home screen and either types a request or picks a map location.
2. The app submits the request with optional coordinates to `/api/service-request`.
3. The Antigravity orchestrator runs the booking pipeline:
   - parse intent with tokenization
   - resolve location through fuzzy matching or explicit coordinates
   - discover nearby providers by computed distance
   - rank providers
   - select and book
   - schedule follow-up reminders
4. The provider results screen shows map markers and all provider cards are selectable.
5. The user reviews service details, confirms checkout, and lands on a booking confirmation page.
6. The user can open provider chat. Chat runs a second agentic orchestration plan:
   - retrieve RAG context
   - summarize conversation history
   - generate a provider/customer coordination response using Groq, Gemini fallback, or local demo mode.

## Tokenization improvement

Tokenizing the input sentence is useful because the app serves mixed English, Urdu, and Roman Urdu requests where exact string matching is too brittle. The new tokenizer normalizes input, removes common filler words, creates n-grams, and lets location matching compare phrases instead of only exact regex hits. This improves cases such as:

- `AC repair in Gulshan-e-Iqbal`
- `ac wala gulshan e iqbal mein`
- `plumber gulshan`
- `electrician G 11 kal subah`

## RAG and model behavior

The backend now works in three modes:

1. Groq mode when `GROQ_API_KEY` is present.
2. Gemini fallback when Groq is unavailable and `GEMINI_API_KEY` is present.
3. Local demo mode when no keys are present, so every contributor can clone and run the app without restrictions.

RAG chunks and chat messages are stored locally in SQLite, avoiding external vector database setup for hackathon/demo use.

## Documentation behavior

Timestamped API docs are no longer generated on every backend start. They are gated by `GENERATE_API_DOCS_ON_START=true`, while stable walkthrough, task, and implementation files remain in `docs/`.
