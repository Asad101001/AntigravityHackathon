# Asaaniyat — AI Service Orchestrator for Pakistan's Informal Economy

> **Google Antigravity Hackathon · Challenge 2**

A mobile-first agentic AI application that connects users with informal service providers (electricians, plumbers, AC technicians, carpenters, painters) across Pakistan. Users describe their needs in **Urdu, Roman Urdu, or English**, and an 8-agent pipeline autonomously finds, ranks, prices, books, and follows up with the best provider.

---

## 🏗 Architecture

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
│  │  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐    │ │
│  │  │ 1 │→│ 2 │→│ 3 │→│ 4 │→│ 5 │→   │ │
│  │  └───┘ └───┘ └───┘ └───┘ └───┘    │ │
│  │  IntPrs LocRes PrvDsc PrvRnk DecMkr│ │
│  │  ┌───┐ ┌───┐                       │ │
│  │  │ 6 │→│ 7 │→│ 8 │ → Complete      │ │
│  │  └───┘ └───┘ └───┘                 │ │
│  │  Price BkExec FlwMgr               │ │
│  └─────────────────────────────────────┘ │
└──────────────┬───────────────────────────┘
               │
┌──────────────▼───────────────────────────┐
│     Firebase (Simulated in Demo Mode)    │
│  Firestore: bookings, providers, notifs  │
│  FCM: push notifications                │
└──────────────────────────────────────────┘
```

## 🤖 8-Agent Pipeline (Antigravity Orchestrated)

| # | Agent | Responsibility | I/O |
|---|-------|---------------|-----|
| 1 | **IntentParser** | Extract service, location, time from raw text (Urdu/Roman Urdu/English) | Text → parsed intent |
| 2 | **LocationResolver** | Convert area name to lat/lng from cached coordinate map | Area → coordinates |
| 3 | **ProviderDiscoverer** | Filter 300 mock providers by service + location within the search radius | Service + location → provider list |
| 4 | **ProviderRanker** | Score providers across distance, rating, availability, response time, risk, and sentiment | List → ranked list |
| 5 | **DecisionMaker** | Apply hard constraints (verified, slots, distance), select best, explain why | Ranked → selected + reasoning |
| 6 | **DynamicPricing** | Generate a PKR quote with distance and urgency adjustments | Provider + context → quote |
| 7 | **BookingExecutor** | Write booking to the demo store, generate confirmation ID | Provider + slot → booking |
| 8 | **FollowUpManager** | Schedule reminders and feedback follow-up | Booking → reminders |

All agents share a single context object managed by the Antigravity orchestrator. Each agent reads from context and writes its output back. No agent calls another directly.

## 📱 Mobile App Screens

1. **Home** — Text input + quick-select service buttons (with Urdu labels)
2. **Intent Confirm** — Parsed intent display with confidence meter & edit option
3. **Loading** — Animated 8-step pipeline progress with real API progress
4. **Provider Results** — Top 3 providers with scores, breakdowns, recommended badge
5. **Booking Confirm** — Provider details, time slot, reminder preview
6. **Confirmation** — Success with booking ID, contact, share option
7. **Agent Trace** — Expandable logs for all 8 agents with timeline visualization

## 🌍 Pakistan Coverage

- **Islamabad**: G-6 to G-15, F-6 to F-11, I-8, I-9
- **Lahore**: DHA, Defence, Gulberg, Johar Town, Model Town
- **Karachi**: Clifton, Defence, Saddar, PECHS, Gulshan
- **300 pre-seeded mock providers** across all cities
- **6 service types**: Electrician, Plumber, AC Technician, Carpenter, Painter, Handyman

## 2026 Agentic Refinement Update

- Light mint React Native Expo UI inspired by the supplied Stitch-style booking screens.
- Tokenized intent parsing with fuzzy location resolution for variants such as `Gulshan-e-Iqbal`, `gulshan e iqbal`, and `gulshan`.
- Optional map-picked coordinates are sent to the backend and used for haversine distance provider discovery.
- Agentic provider chat is available through a local RAG pipeline with Groq primary, Gemini fallback, and no-key demo mode.
- Runtime API-doc generation is disabled by default; set `GENERATE_API_DOCS_ON_START=true` only when you intentionally want timestamped API docs.

### Optional AI keys

Copy `backend/.env.example` to `backend/.env` and add keys only if you want live model responses:

```bash
GROQ_API_KEY=your_groq_key
GEMINI_API_KEY=your_gemini_key
```

If no keys are provided, the RAG/chat endpoints still work with deterministic local demo replies, so a fresh clone remains runnable.

## 🚀 Quick Start

### Backend
```bash
cd backend
npm install
npm start
# Server runs on http://localhost:3001
```

### Mobile App
```bash
cd mobile
npm install
npx expo start
# Scan QR code with Expo Go app
```

The mobile app now derives the backend URL automatically from Expo's LAN host during development and uses port `3001`, matching the Express backend. For EAS/standalone builds where Expo does not provide a dev host, set `EXPO_PUBLIC_API_BASE_URL` before starting/building, for example:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.25:3001 npx expo start
```


### Windows local testing checklist

Your backend log should show the same LAN IP as Expo, but on API port `3001`. For example, if Expo prints `exp://192.168.100.24:8081`, the backend should print `http://192.168.100.24:3001`, and the app will call `http://192.168.100.24:3001/api`.

Use two terminals:

```powershell
# Terminal 1
cd D:\Desktop\hackathonMVP\backend
npm install
npm start
```

```powershell
# Terminal 2
cd D:\Desktop\hackathonMVP\mobile
npm install
npx expo start
```

If you want to test in the browser, install the web packages once, then run web:

```powershell
cd D:\Desktop\hackathonMVP\mobile
npx expo install react-dom react-native-web
npx expo start --web
```

If your phone cannot connect to the backend, force the API URL before starting Expo:

```powershell
cd D:\Desktop\hackathonMVP\mobile
$env:EXPO_PUBLIC_API_BASE_URL="http://192.168.100.24:3001"
npx expo start
```

You can also override only the API port if needed:

```powershell
$env:EXPO_PUBLIC_API_PORT="3001"
npx expo start
```


### Browser URLs that matter

- Do **not** open `http://0.0.0.0:3001` in Chrome. `0.0.0.0` is a bind address for the server, not a browser destination.
- Open the backend status page at `http://localhost:3001/` or health JSON at `http://localhost:3001/health`.
- Open the frontend through Expo at the URL Expo prints, for example `http://localhost:8082` if Metro switches from `8081` to `8082`.
- If web bundling fails, stop Expo with `Ctrl+C`, run `npm install`, then restart with `npx expo start --web`.

### Test the API
```bash
# PowerShell
Invoke-RestMethod -Uri "http://localhost:3001/api/service-request" -Method POST -ContentType "application/json" -Body '{"user_text": "Electrician chahiye G-11 mein kal subah", "user_id": "test_user"}'
```

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/service-request` | Main pipeline — runs all 8 agents |
| `POST` | `/api/chaos/simulate` | Simulate provider cancellation and re-route to a replacement |
| `POST` | `/api/chat/message` | Run grounded provider-chat response generation |
| `GET`  | `/api/chat/:booking_id` | Get stored chat history |
| `POST` | `/api/rag/ingest` | Add local RAG context chunks |
| `POST` | `/api/rag/query` | Query local RAG context chunks |
| `POST` | `/api/booking/confirm` | Confirm/cancel a booking |
| `GET`  | `/api/booking/:id` | Get booking details |
| `POST` | `/api/booking/:id/feedback` | Submit rating (1-5) |
| `GET`  | `/api/logs` | Return persisted agent trace logs |

## 🛡 Error Handling

- **Low confidence (<0.6)**: Shows clarification prompt with suggestions
- **Location unknown**: Asks user to specify city/area
- **No providers**: Expands search radius (5km → 10km) or suggests alternatives
- **Booking write failure**: Retries 3× with exponential backoff
- **Input sanitization**: 500 char limit, HTML/control char stripping, rate limiting (100 req/15min)

## 📁 Project Structure
```
hackathonMVP/
├── backend/
│   ├── server.js              # Express server
│   ├── agents/
│   │   ├── BaseAgent.js       # Abstract base class
│   │   ├── IntentParserAgent.js
│   │   ├── LocationResolverAgent.js
│   │   ├── ProviderDiscovererAgent.js
│   │   ├── ProviderRankerAgent.js
│   │   ├── LLMRankerAgent.js
│   │   ├── DecisionMakerAgent.js
│   │   ├── DynamicPricingAgent.js
│   │   ├── BookingExecutorAgent.js
│   │   └── FollowUpManagerAgent.js
│   ├── orchestrator/
│   │   └── AntigravityOrchestrator.js  # Central 8-agent coordinator
│   ├── routes/
│   │   └── serviceRoutes.js     # API endpoints
│   ├── data/
│   │   ├── providers.json       # 300 mock providers
│   │   ├── coordinates.json     # Area → lat/lng cache
│   │   └── keywords.json        # Trilingual keyword dictionary
│   └── middleware/
│       └── sanitize.js          # Input sanitization
├── mobile/
│   ├── App.js                   # Navigation + 7 screens
│   ├── config.js                # Colors, API URL, constants
│   └── screens/
│       ├── HomeScreen.js
│       ├── IntentConfirmScreen.js
│       ├── LoadingScreen.js
│       ├── ProviderResultsScreen.js
│       ├── BookingConfirmScreen.js
│       ├── ConfirmationScreen.js
│       └── AgentTraceScreen.js
└── README.md
```

## 🏆 Hackathon Criteria Coverage

| Criterion | Weight | Coverage |
|-----------|--------|----------|
| Antigravity Usage | 25% | Central orchestrator managing all 8 agents with trace emission |
| Agentic Workflow | 20% | 8-agent sequential pipeline with shared context |
| Decision Quality | 20% | Multi-factor scoring with visible reasoning per provider |
| Action Simulation | 15% | Firestore booking + FCM notification scheduling |
| Implementation | 10% | Clean Node.js + React Native, proper error handling |
| Innovation + UX | 10% | Pakistan-specific (Urdu/Roman Urdu), realistic scenario |

## 📋 Assumptions

- Provider data is hardcoded (no live API calls per query)
- Firebase runs in demo mode (in-memory storage) without credentials
- Coordinates are cached for all supported areas
- The app is designed for demo/hackathon evaluation, not production deployment

---

*Built for the Google Antigravity Hackathon — Challenge 2 — AI Service Orchestrator for Pakistan's Informal Economy*
