# Asaaniyat — AI Service Orchestrator for Pakistan's Informal Economy

> **Google Antigravity Hackathon · Challenge 2**

A mobile-first agentic AI application that connects users with informal service providers (electricians, plumbers, AC technicians, carpenters, painters) across Pakistan. Users describe their needs in **Urdu, Roman Urdu, or English**, and a 7-agent pipeline autonomously finds, ranks, and books the best provider.

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
│  │  │ 6 │→│ 7 │ → Complete            │ │
│  │  └───┘ └───┘                       │ │
│  │  BkExec FlwMgr                     │ │
│  └─────────────────────────────────────┘ │
└──────────────┬───────────────────────────┘
               │
┌──────────────▼───────────────────────────┐
│     Firebase (Simulated in Demo Mode)    │
│  Firestore: bookings, providers, notifs  │
│  FCM: push notifications                │
└──────────────────────────────────────────┘
```

## 🤖 7-Agent Pipeline (Antigravity Orchestrated)

| # | Agent | Responsibility | I/O |
|---|-------|---------------|-----|
| 1 | **IntentParser** | Extract service, location, time from raw text (Urdu/Roman Urdu/English) | Text → parsed intent |
| 2 | **LocationResolver** | Convert area name to lat/lng from cached coordinate map | Area → coordinates |
| 3 | **ProviderDiscoverer** | Filter 60 mock providers by service + location within 5km | Service + location → provider list |
| 4 | **ProviderRanker** | Score providers: `(distance×0.30) + (rating×0.30) + (availability×0.20) + (response_time×0.20)` | List → ranked list |
| 5 | **DecisionMaker** | Apply hard constraints (verified, slots, distance), select best, explain why | Ranked → selected + reasoning |
| 6 | **BookingExecutor** | Write booking to Firestore, generate confirmation ID | Provider + slot → booking |
| 7 | **FollowUpManager** | Schedule 3 reminders (1hr push, 30min SMS, next-day feedback) | Booking → reminders |

All agents share a single context object managed by the Antigravity orchestrator. Each agent reads from context and writes its output back. No agent calls another directly.

## 📱 Mobile App Screens

1. **Home** — Text input + quick-select service buttons (with Urdu labels)
2. **Intent Confirm** — Parsed intent display with confidence meter & edit option
3. **Loading** — Animated 7-step pipeline progress with real API progress
4. **Provider Results** — Top 3 providers with scores, breakdowns, recommended badge
5. **Booking Confirm** — Provider details, time slot, reminder preview
6. **Confirmation** — Success with booking ID, contact, share option
7. **Agent Trace** — Expandable logs for all 7 agents with timeline visualization

## 🌍 Pakistan Coverage

- **Islamabad**: G-6 to G-15, F-6 to F-11, I-8, I-9
- **Lahore**: DHA, Defence, Gulberg, Johar Town, Model Town
- **Karachi**: Clifton, Defence, Saddar, PECHS, Gulshan
- **60 pre-seeded mock providers** across all cities
- **6 service types**: Electrician, Plumber, AC Technician, Carpenter, Painter, Handyman

## 🚀 Quick Start

### Backend
```bash
cd backend
npm install
npm start
# Server runs on http://localhost:3000
```

### Mobile App
```bash
cd mobile
npm install
npx expo start
# Scan QR code with Expo Go app
```

### Test the API
```bash
# PowerShell
Invoke-RestMethod -Uri "http://localhost:3000/api/service-request" -Method POST -ContentType "application/json" -Body '{"user_text": "Electrician chahiye G-11 mein kal subah", "user_id": "test_user"}'
```

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/service-request` | Main pipeline — runs all 7 agents |
| `POST` | `/api/booking/confirm` | Confirm/cancel a booking |
| `GET`  | `/api/booking/:id` | Get booking details |
| `POST` | `/api/booking/:id/feedback` | Submit rating (1-5) |

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
│   │   ├── DecisionMakerAgent.js
│   │   ├── BookingExecutorAgent.js
│   │   └── FollowUpManagerAgent.js
│   ├── orchestrator/
│   │   └── AntigravityOrchestrator.js  # Central 7-agent coordinator
│   ├── routes/
│   │   └── serviceRoutes.js     # 4 API endpoints
│   ├── data/
│   │   ├── providers.json       # 60 mock providers
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
| Antigravity Usage | 25% | Central orchestrator managing all 7 agents with trace emission |
| Agentic Workflow | 20% | 7-agent sequential pipeline with shared context |
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
