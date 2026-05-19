# 10 — Technical Walkthrough
## Phase I: Production APIs & Pipeline Setup

---

## Walkthrough 1 — `ProviderDiscovererAgent`: The Two-Pass Filter

### Problem
Calling the Google Maps Distance Matrix API for every provider in `providers.json` (potentially 200+) would cost ~$1.00 per user query and exhaust the free credit in hours.

### Solution Architecture

**Pass 1 — Haversine Pre-Filter (Zero Cost)**

The Haversine formula computes the great-circle distance between two lat/lng points using spherical trigonometry:

```
a = sin²(Δlat/2) + cos(lat1) · cos(lat2) · sin²(Δlng/2)
distance = 2R · atan2(√a, √(1−a))
```

We apply this to every provider in-memory (no network call), sort ascending, and take the top 5. This collapses the candidate set from N → 5 in O(N log N).

**Pass 2 — Distance Matrix (5 Elements Max)**

A single Distance Matrix request with origin=user and destinations=top5 returns actual driving times and road distances for all 5 in one HTTP call. At $0.005 per element, worst case is $0.025/query — well within the $200/month free credit.

```
GET /distancematrix/json?origins=24.8607,67.0011
  &destinations=24.87,67.01|24.91,67.02|...  (5 max)
  &mode=driving&units=metric&region=PK
```

**Enrichment Schema**

Each provider exits Pass 2 with:

| Field | Source | Type |
|---|---|---|
| `distance_km` | Distance Matrix `distance.value / 1000` | float |
| `response_time_min` | Distance Matrix `duration.value / 60` | int |
| `distance_text` | Distance Matrix (e.g. "3.2 km") | string |
| `duration_text` | Distance Matrix (e.g. "11 mins") | string |
| `distance_source` | `'distance_matrix_api'` or `'haversine_fallback'` | string |

**Fallback Behavior**

If the Distance Matrix call fails (network error, quota exhausted, API key missing), we fall back to:
```
response_time_min ≈ haversine_km × 2.5
```
This approximates Karachi urban driving at ~24 km/h average — intentionally conservative for an emergency service context.

---

## Walkthrough 2 — `retryHelper.js`: Exponential Backoff with Full Jitter

### Why Jitter Matters

A naive exponential backoff (`delay = base × 2^attempt`) causes retry storms: if 50 concurrent requests all hit a rate limit simultaneously, they will all retry at the same intervals, repeatedly hammering the endpoint in waves.

**Full Jitter** resolves this:
```
delay = random(0, min(cap, base × 2^attempt))
```

This spreads retries uniformly across the interval, reducing the peak retry load on the server by ~50%.

### Retry-After Header Handling

Both Groq and Gemini may return a `Retry-After` header on 429 responses. The helper parses it in two formats:

```
Retry-After: 60           → sleep 60,000 ms
Retry-After: Wed, 21 Oct 2025 07:28:00 GMT  → sleep until that timestamp
```

When present, the header value overrides the calculated backoff — this is the polite behavior per RFC 7231 and avoids burning retry budget on a pre-committed wait.

### Attempt Sequence (defaults)

| Attempt | Max Delay | Typical Delay (jitter) |
|---|---|---|
| 1 | 500 ms | 0 – 500 ms |
| 2 | 1,000 ms | 0 – 1,000 ms |
| 3 | 2,000 ms | 0 – 2,000 ms |
| 4 (final) | — | throws |

---

## Walkthrough 3 — `LLMClient.js`: Dual-Provider Failover

### Provider Selection Rationale

| | Groq (llama3-8b) | Gemini 1.5 Flash |
|---|---|---|
| Free RPM | 30 | 15 |
| Free RPD | 14,400 | 1,500 |
| P50 latency | ~300 ms | ~800 ms |
| JSON reliability | High (OpenAI-compat) | High (native) |

Groq is always attempted first. Only after all 4 retry attempts are exhausted does the client fall back to Gemini. This is fail-fast failover, not load balancing — simpler to debug, and Gemini's lower RPD means we preserve its quota for genuine Groq outages.

### JSON Mode Implementation

The `completeJSON()` method appends a strict system instruction:

```
You MUST respond with a single valid JSON object only.
No explanation, no markdown fences, no preamble.
```

Post-response, it strips any residual ` ```json ` fences before `JSON.parse()`, and as a last resort attempts to extract the first `{...}` block from surrounding prose. This handles models that prefix with "Here is the JSON:" despite instructions.

---

## Walkthrough 4 — `build-apk.yml`: Local EAS on GitHub Actions

### Why `--local`?

EAS Cloud builds are queued: during hackathon submission windows, queue times can exceed 45 minutes. `eas build --local` runs Gradle directly on the GitHub-provided runner, which has:

- **Android SDK** at `$ANDROID_SDK_ROOT` (pre-installed)
- **8 vCPUs / 16 GB RAM** — sufficient for a React Native Gradle build
- **Free for public repositories** (2,000 min/month for private)

### Key Pipeline Design Choices

**`concurrency: cancel-in-progress: true`**
Prevents queuing multiple builds when multiple commits land in quick succession. The most recent commit always wins.

**`actions/setup-java@v4` with Temurin JDK 17**
Gradle 8 (used by React Native 0.73+) requires JDK 17. The `cache: gradle` option caches the Gradle wrapper and dependencies between runs, cutting subsequent build times by 30–50%.

**`sdkmanager --licenses` (non-interactive)**
`yes |` pipes "y" to all license prompts — required because the runner has no TTY. The `|| true` prevents the step from failing if all licenses were already accepted on a warm runner cache.

**Secret Injection**
Environment secrets (`MAPS_API_KEY`, `GROQ_API_KEY`, etc.) are written to `.env` immediately before the build step and deleted in an `if: always()` cleanup step — ensuring secrets don't persist on the runner even if the build fails mid-way.

**Artifact Naming**
```
antigravity-apk-preview-{sha}
```
The commit SHA in the artifact name creates an immutable link between the APK and the exact source state that produced it — critical for hackathon judging reproducibility.

---

## Walkthrough 5 — `MapPanel.js`: Dark-Themed Provider Map

### Provider Type Color System

Emergency service types carry semantic urgency. We encode this in marker color:

| Type | Color | Rationale |
|---|---|---|
| Hospital | `#EF4444` red | Highest urgency, maximum visibility |
| Ambulance | `#3B82F6` blue | Standard emergency blue globally recognized |
| Clinic | `#F97316` orange | Intermediate urgency |
| Pharmacy | `#22C55E` green | Non-emergency, calm |
| Blood Bank | `#DC2626` dark red | Critical but specialized |

### `fitToCoordinates` Auto-Zoom

On mount, the map calls `fitToCoordinates` with the user's position and all provider coordinates plus `edgePadding: { bottom: 200 }`. The extra bottom padding reserves space for a provider list panel that Phase II will render below the map — preventing markers from hiding behind UI chrome before that panel exists.

### Performance: Pulsing Dot Animation

The user location dot uses a `useRef`-based `Animated.Value` with `Animated.loop` + `useNativeDriver: true`. Native driver offloads the transform/opacity animation entirely to the UI thread, ensuring 60fps regardless of JS thread load during LLM calls.