# AI Service Orchestrator — Implementation Plan

## Overview

Build a mobile-first agentic AI application for Pakistan's informal service economy per the briefing document. Users describe needs in Urdu/Roman Urdu/English → 7-agent pipeline parses, finds, ranks, books providers → Firestore persistence → push notification reminders.

## Architecture

```
┌──────────────────────────────────────────┐
│         React Native + Expo App          │
│  (7 screens, dark glassmorphism UI)      │
└──────────────┬───────────────────────────┘
               │ REST API
┌──────────────▼───────────────────────────┐
│         Node.js + Express Backend        │
│  ┌─────────────────────────────────────┐ │
│  │  Antigravity Orchestrator Engine    │ │
│  │                                     │ │
│  │  Agent 1: IntentParser              │ │
│  │  Agent 2: LocationResolver          │ │
│  │  Agent 3: ProviderDiscoverer        │ │
│  │  Agent 4: ProviderRanker            │ │
│  │  Agent 5: DecisionMaker             │ │
│  │  Agent 6: BookingExecutor           │ │
│  │  Agent 7: FollowUpManager           │ │
│  └─────────────────────────────────────┘ │
└──────────────┬───────────────────────────┘
               │
┌──────────────▼───────────────────────────┐
│     Firebase (Simulated in Demo Mode)    │
│  Firestore: bookings, providers, notifs  │
│  FCM: push notifications                │
└──────────────────────────────────────────┘
```

## Proposed Changes

### Phase 1: Project Foundation

#### Backend Skeleton

- `backend/package.json` — Node.js project with Express, cors, dotenv, express-rate-limit
- `backend/server.js` — Express server with rate limiting, CORS, input sanitization middleware
- `backend/.env.example` — Template for Firebase credentials, port config
- `backend/middleware/sanitize.js` — Input sanitization (trim, 500 char limit, strip HTML/control chars)

---

### Phase 2: Data Layer

#### Mock Provider Dataset

- `backend/data/providers.json` — 60 mock providers across Islamabad (G-6 to G-15, F-6 to F-11, I-8, I-9), Lahore (DHA, Gulberg, Johar Town, Model Town), Karachi (Clifton, Defence, Saddar, PECHS, Gulshan). Services: AC, Electrician, Plumber, Carpenter, Painter, Handyman.

#### Coordinate Cache

- `backend/data/coordinates.json` — Hardcoded lat/lng for all 28 supported areas across 3 cities

#### Keyword Dictionaries

- `backend/data/keywords.json` — Service type keywords (Urdu, Roman Urdu, English), time expressions, location patterns

---

### Phase 3: 7-Agent Pipeline

- `backend/agents/BaseAgent.js` — Abstract base with `execute(context)`, logging, timing, error handling
- `backend/agents/IntentParserAgent.js` — Regex + keyword matching for service, location, time. Trilingual. Confidence scoring.
- `backend/agents/LocationResolverAgent.js` — Local coordinate cache lookup. Pakistan bounding box validation.
- `backend/agents/ProviderDiscovererAgent.js` — Filter providers by service + area within 5km. 10km expansion fallback.
- `backend/agents/ProviderRankerAgent.js` — Weighted scoring: `(dist×0.30) + (rating×0.30) + (avail×0.20) + (resp×0.20)`
- `backend/agents/DecisionMakerAgent.js` — Hard constraint checks. Provider selection with reasoning.
- `backend/agents/BookingExecutorAgent.js` — Firestore write (simulated). Booking ID generation. Retry 3×.
- `backend/agents/FollowUpManagerAgent.js` — 3 notification scheduling (push, SMS, feedback).

---

### Phase 4: Orchestration Engine

- `backend/orchestrator/AntigravityOrchestrator.js` — Central orchestrator managing shared context, sequential agent execution, trace emission, timeouts, retry, graceful fallback.
- `backend/routes/serviceRoutes.js` — 4 API endpoints per briefing spec.

---

### Phase 5: React Native Mobile App

7 Screens:
1. HomeScreen — Text input + quick-select service buttons
2. IntentConfirmScreen — Parsed intent with confidence meter
3. LoadingScreen — Animated 7-step pipeline progress
4. ProviderResultsScreen — Top 3 providers with score breakdowns
5. BookingConfirmScreen — Provider details + confirm/cancel
6. ConfirmationScreen — Success with booking ID + share
7. AgentTraceScreen — Expandable logs + timeline + JSON export

---

### Phase 6: Polish & Submission

- README.md, agent_traces.json, .gitignore

## Build Order

| Step | Component | Estimated Time |
|------|-----------|---------------|
| 1 | Backend skeleton + Express server | 30 min |
| 2 | Mock data (providers, coordinates, keywords) | 45 min |
| 3 | 7 Agent classes | 2 hrs |
| 4 | Orchestrator + API routes | 1 hr |
| 5 | Backend testing end-to-end | 30 min |
| 6 | Expo mobile app init | 20 min |
| 7 | 7 screens with navigation | 3 hrs |
| 8 | UI polish + animations | 1 hr |
| 9 | README + submission artifacts | 30 min |

## Notes

- **Antigravity SDK**: Implemented as a custom orchestrator class matching the API surface from the briefing document (workflow definition, `run()` method, trace emission).
- **Firebase Demo Mode**: In-memory storage by default, real Firebase via .env if configured.
