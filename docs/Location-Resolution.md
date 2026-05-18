**Location Resolution & Data Handling**

- **Goal:** Use client-provided current location unless the user explicitly specifies a different area in the prompt. Remove hard-coded fallback behaviors.
- **Priority:**
  1. Explicit location in prompt (if detection confidence >= `LOCATION_CONFIDENCE_THRESHOLD`)
  2. `clientLocation` (lat/lon) from request/session
  3. `session.profileLocation`
  4. `session.cityCenter` or last-resort fallback

- **Config env vars:**
  - `LOCATION_CONFIDENCE_THRESHOLD` (0.0-1.0)
  - `LOCATION_CACHE_TTL` (seconds)

- **Notes for devs:** Implement `backend/services/locationResolver.js` with API `resolve(rawPrompt, clientLocation, session, options)` returning `{name, lat, lon, source, confidence}`.
