# 10 — Implementation Plan
## Phase I: Production APIs & Pipeline Setup
**Challenge 2: AI Service Orchestrator**
**Team:** [Team Name] | **Track:** Google Antigravity Hackathon 2025

---

## 1. Objective

Transition the AI Service Orchestrator from a prototype (mock data, no retry safety) to a production-viable submission with:

- Real geolocation resolution via **Google Maps Geocoding & Distance Matrix APIs**
- Resilient LLM calls to **Groq (primary) and Gemini (fallback)** with rate-limit protection
- A **CI/CD pipeline** producing a signed Android APK on every push to `main`

---

## 2. Scope of Phase I

| Area | In Scope | Out of Scope |
|---|---|---|
| Geolocation | Geocoding + Distance Matrix (Pakistan-biased) | Routing / turn-by-turn |
| LLM | Groq + Gemini retry wrapper | Fine-tuning, streaming responses |
| Maps UI | Provider markers, callouts, pulsing user dot | Street-view, traffic overlay |
| CI/CD | Local EAS APK on GitHub Actions | TestFlight / Play Store upload |
| Auth | API key injection via GitHub Secrets | OAuth, user accounts |

---

## 3. Architecture Overview

```
User Input (text / map pin)
        │
        ▼
┌───────────────────────┐
│  LocationResolverAgent │  ← Geocoding API + local cache fallback
└───────────┬───────────┘
            │ { lat, lng, city, confidence }
            ▼
┌───────────────────────┐
│ ProviderDiscovererAgent│  ← Pass 1: Haversine (free)
│                        │    Pass 2: Distance Matrix API (top 5 only)
└───────────┬───────────┘
            │ providers[] enriched with driving_time, distance_km
            ▼
┌───────────────────────┐
│      LLMClient         │  ← Groq primary / Gemini fallback
│   (withRetry wrapper)  │    JSON-mode for structured triage output
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│      MapPanel.js       │  ← react-native-maps, dark theme, callouts
└───────────────────────┘
```

---

## 4. Implementation Steps

### Step 1 — LocationResolverAgent (Complete)
- Priority chain: map pin → Geocoding API → local fuzzy cache → null
- Pakistan bounding-box validation on all resolved coordinates
- `withRetry` on fetch (3 attempts)

### Step 2 — ProviderDiscovererAgent (Two-Pass Filter)
- **Pass 1:** Haversine sort over full `providers.json` → top 5 candidates. Zero API cost.
- **Pass 2:** Single Distance Matrix call for those 5 → real driving times. Cost: $0.025/query max.
- Graceful degrade to haversine estimates if Distance Matrix fails.

### Step 3 — MapPanel.js
- `react-native-maps` with `PROVIDER_GOOGLE` for parity on both platforms.
- Custom dark `customMapStyle` matching app's neon-emerald terminal theme.
- `fitToCoordinates` auto-zooms to show user + all providers on mount.
- Callout cards surface `distance_km`, `response_time_min`, `rating`.

### Step 4 — retryHelper.js
- `withRetry(fn, opts)`: exponential backoff + full jitter.
- Parses `Retry-After` header when present (both seconds and date formats).
- `fetchWithRetry` convenience wrapper for raw fetch calls.

### Step 5 — LLMClient.js
- Groq (llama3-8b-8192) primary: fast, 30 RPM free.
- Gemini 1.5 Flash fallback: activated only if Groq exhausts all retry attempts.
- `completeJSON()` method: forces JSON-only output and strips markdown fences.

### Step 6 — GitHub Actions APK Pipeline
- `ubuntu-latest` runner with pre-installed Android SDK.
- Installs `expo-cli` + `eas-cli` globally.
- `eas build --local --non-interactive` bypasses Expo cloud build queue entirely.
- APK uploaded as named artifact with 14-day retention.

---

## 5. API Cost Projection (Free Tier Compliance)

| API | Free Allowance | Our Usage Pattern | Status |
|---|---|---|---|
| Google Geocoding | 40,000 req/month | 1 req per unique location string | ✅ Safe |
| Google Distance Matrix | $200 credit/month (~40,000 elements) | 5 elements per query | ✅ Safe |
| Groq | 14,400 req/day | ~50 req/demo session | ✅ Safe |
| Gemini Flash | 1,500 req/day | Fallback only | ✅ Safe |

---

## 6. Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Geocoding misidentifies Pakistan locality | Medium | `components=country:PK` filter + bbox validation |
| Groq 429 during live demo | Medium | Exponential backoff → Gemini fallback |
| Distance Matrix returns ZERO_RESULTS | Low | Falls back to haversine estimate |
| EAS local build OOM on runner | Low | `timeout-minutes: 60`, `cancel-in-progress: true` |
| Android SDK version mismatch | Low | Explicit `build-tools;34.0.0` install step |