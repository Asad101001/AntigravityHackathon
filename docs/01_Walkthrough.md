# Walkthrough — AI Service Orchestrator

## What Was Built

A complete **3-layer application** implementing the Antigravity Briefing Document specification:

### Backend (Node.js + Express)
- Express server with rate limiting (100 req/15min), CORS, input sanitization
- **7 agent classes** extending a shared `BaseAgent` with timing/logging/error-handling
- **AntigravityOrchestrator** — central engine managing shared context, sequential execution, trace emission
- **4 REST API endpoints**: service-request, booking/confirm, booking/:id, booking/:id/feedback
- **60 mock providers** across Islamabad (20), Lahore (20), Karachi (20)
- **28 area coordinate cache** covering all supported neighborhoods
- **Trilingual keyword dictionary** with Roman Urdu, Urdu, and English support

### Mobile App (React Native + Expo)
- **7 screens** with dark glassmorphism theme, Pakistan green accent
- Home → Loading (animated pipeline) → Intent Confirm → Provider Results → Booking Confirm → Confirmation → Agent Trace
- Expandable agent trace logs with timeline visualization and JSON export

### Submission Artifacts
- `README.md` — comprehensive documentation
- `agent_traces.json` — exported execution trace from demo run
- `.gitignore` — no secrets committed
- `docs/` — implementation plan, task tracker, walkthrough

## Verification Results

### API Tests Passed

| Test Scenario | City | Result | Provider Selected | Duration |
|---|---|---|---|---|
| "Electrician chahiye G-11 mein kal subah" | Islamabad | ✅ Success | Ali Electrician Services (score: 0.805) | 107ms |
| "Plumber chahiye DHA Lahore mein abhi" | Lahore | ✅ Success | Defence Pipe Works (score: 0.703) | 46ms |
| "AC repair needed in Clifton Karachi tomorrow morning" | Karachi | ✅ Success | Karachi Cool Air (score: 0.810) | 3ms |
| "help me please" (no service/location) | — | ✅ Low confidence | Clarification prompt + suggestions | 4ms |

### Key Metrics
- All 7 agents execute in **<100ms** total pipeline time
- Low-confidence inputs correctly route to clarification
- Correct providers selected across all 3 cities
- Score breakdowns show distance, rating, availability, response_time
- 3 reminders scheduled per booking (push, SMS, feedback)

## Files Created

| Path | Description |
|---|---|
| `backend/server.js` | Express server (binds 0.0.0.0 for device access) |
| `backend/agents/BaseAgent.js` | Agent base class |
| `backend/agents/IntentParserAgent.js` | Agent 1: Trilingual intent parser |
| `backend/agents/LocationResolverAgent.js` | Agent 2: Coordinate resolver |
| `backend/agents/ProviderDiscovererAgent.js` | Agent 3: Provider search |
| `backend/agents/ProviderRankerAgent.js` | Agent 4: Multi-factor scoring |
| `backend/agents/DecisionMakerAgent.js` | Agent 5: Selection + reasoning |
| `backend/agents/BookingExecutorAgent.js` | Agent 6: Booking creation |
| `backend/agents/FollowUpManagerAgent.js` | Agent 7: Reminder scheduling |
| `backend/orchestrator/AntigravityOrchestrator.js` | Central 7-agent orchestrator |
| `backend/routes/serviceRoutes.js` | 4 API endpoints |
| `backend/data/providers.json` | 60 mock providers (3 cities) |
| `backend/data/coordinates.json` | 28 area coordinates |
| `backend/data/keywords.json` | Trilingual keyword dictionary |
| `backend/middleware/sanitize.js` | Input sanitization |
| `mobile/App.js` | 7-screen navigation |
| `mobile/config.js` | API URL, colors, constants |
| `mobile/screens/HomeScreen.js` | Screen 1: Home |
| `mobile/screens/IntentConfirmScreen.js` | Screen 2: Intent Confirm |
| `mobile/screens/LoadingScreen.js` | Screen 3: Loading Pipeline |
| `mobile/screens/ProviderResultsScreen.js` | Screen 4: Provider Results |
| `mobile/screens/BookingConfirmScreen.js` | Screen 5: Booking Confirm |
| `mobile/screens/ConfirmationScreen.js` | Screen 6: Success |
| `mobile/screens/AgentTraceScreen.js` | Screen 7: Agent Trace Logs |
| `README.md` | Project documentation |
| `agent_traces.json` | Demo execution trace |
| `docs/01_Implementation_Plan.md` | Architecture & build plan |
| `docs/02_Task_Tracker.md` | Completed task checklist |
| `docs/03_Walkthrough.md` | This walkthrough |

## Network Setup (Physical Device)

To use the APK on a physical phone connected to the same WiFi:

1. Start backend: `cd backend && npm start`
2. Backend must bind to `0.0.0.0` (already configured)
3. Phone and PC must be on the same WiFi network
4. Expo development builds auto-detect the Metro LAN host; standalone/EAS builds should set `EXPO_PUBLIC_API_BASE_URL` to the backend `Phone/LAN access` URL printed by `npm start`
5. Windows Firewall must allow inbound connections on port 3000
