# 10 — Task Tracker
## Phase I: Production APIs & Pipeline Setup

**Last updated:** Session 2 | **Status:** ✅ Phase I Complete

---

## Task Board

### ✅ Done

| ID | Task | Owner | File(s) Produced | Notes |
|---|---|---|---|---|
| P1-01 | Scaffold `BaseAgent` class & agent runner | Backend | `BaseAgent.js` | Established `execute(context)` contract |
| P1-02 | Implement `LocationResolverAgent` — full 4-step resolution chain | Backend | `LocationResolverAgent.js` | Geocoding + Pakistan bbox + local cache fallback |
| P1-03 | Implement `ProviderDiscovererAgent` — Two-Pass Filter | Backend | `ProviderDiscovererAgent.js` | Haversine sort → Distance Matrix API top 5 |
| P1-04 | Build `MapPanel.js` for React Native | Mobile | `MapPanel.js` | Dark Google Maps style, callout cards, pulsing dot |
| P1-05 | Create `retryHelper.js` — exponential backoff with jitter | Backend | `retryHelper.js` | Parses `Retry-After` header; `withRetry` + `fetchWithRetry` |
| P1-06 | Update `LLMClient.js` with retry + Groq→Gemini fallback | Backend | `LLMClient.js` | `completeJSON()` strips fences; dual-provider |
| P1-07 | Create `build-apk.yml` GitHub Actions pipeline | DevOps | `.github/workflows/build-apk.yml` | Local EAS build, APK artifact upload |
| P1-08 | Write SDD artifacts (Plan, Tracker, Walkthrough) | Docs | `docs/07_*.md` | This document |

---

### 🔲 Phase II Backlog (Not Started)

| ID | Task | Priority | Depends On |
|---|---|---|---|
| P2-01 | Implement `TriageAgent` — LLM-powered severity scoring | High | P1-06 |
| P2-02 | Implement `RecommendationAgent` — ranked provider output | High | P1-03, P2-01 |
| P2-03 | Wire agent orchestrator pipeline end-to-end | High | P2-01, P2-02 |
| P2-04 | `ProviderDetailScreen.js` — full provider info + call CTA | Medium | P1-04 |
| P2-05 | Offline mode — cache last known providers to AsyncStorage | Medium | P1-03 |
| P2-06 | Push notification on provider ETA update | Low | P2-03 |
| P2-07 | Add iOS build profile to `build-apk.yml` (macOS runner) | Low | P1-07 |

---

## Decisions Log

| # | Decision | Rationale | Date |
|---|---|---|---|
| D-01 | Use Google Geocoding over OpenStreetMap Nominatim | Nominatim accuracy poor for Pakistani locality names (Gulshan, DHA, Johar) | Session 1 |
| D-02 | Haversine pre-filter before Distance Matrix | Eliminates N-1 API calls per query; free pass cuts cost by >80% | Session 2 |
| D-03 | Groq primary, Gemini fallback (not load-balanced) | Groq latency ~300ms vs Gemini ~800ms; deterministic routing simpler to debug | Session 2 |
| D-04 | EAS `--local` over Expo cloud | Expo cloud queue unpredictable under hackathon load; GitHub runner is free & deterministic | Session 2 |
| D-05 | `ubuntu-latest` runner (not `macos-latest`) | macOS runners consume 10× GitHub Actions minutes; Android build works on Linux | Session 2 |
| D-06 | Full jitter backoff (not equal/decorrelated) | Prevents thundering-herd on shared free-tier rate limit during demo | Session 2 |

---

## Dependency Graph

```
P1-01 ──► P1-02 ──► P1-03 ──► P2-02 ──► P2-03
                 └──► P1-04            ▲
P1-05 ──► P1-06 ──► P2-01 ────────────┘
P1-07 (independent CI track)
```

---

## Acceptance Criteria — Phase I

- [x] `LocationResolverAgent` resolves Karachi locality names to lat/lng within ±0.005° of Google Maps
- [x] `ProviderDiscovererAgent` makes exactly 1 Distance Matrix call per query (≤5 elements)
- [x] `retryHelper` retries on 429, 502, 503, 504; does not retry on 400, 401, 404
- [x] `LLMClient` falls back to Gemini without throwing on Groq exhaustion
- [x] `MapPanel` renders ≥3 provider markers with callouts on a physical device
- [x] GitHub Actions pipeline produces a downloadable `.apk` artifact on push to `main`