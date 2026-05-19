# 13 Implementation Plan — Phase IV Antigravity Completion

## Objective
Finish the Phase IV reliability pass by tightening the exact-location pipeline, restoring native service notifications, and documenting the multi-factor AI reasoning path for judges and maintainers.

## Scope
- **Backend location intelligence:** Prefer exact user GPS when available, reverse-resolve it to a neighborhood, then apply the selected city as context rather than replacing GPS precision with a broad city centroid.
- **Intent parsing cache discipline:** Treat local JSON area coordinates as the first-pass high-speed cache and only call Google Maps Geocoding when the cache cannot identify a specific area.
- **Mobile notifications:** Request notification permission on app startup and emit a local booking update when the confirmed active job state changes.
- **Safe-area cleanup:** Verify Phase IV Liquid Glass screens use `react-native-safe-area-context` inset APIs instead of deprecated `react-native` `SafeAreaView` in the target navigation surfaces.

## Backend Plan: Reverse-Geocoding First
1. Detect `user_location.lat` and `user_location.lng` before resolving typed city-only text.
2. Validate coordinates against the Pakistan bounding box.
3. Reverse-resolve the GPS point against `backend/data/coordinates.json` using distance math.
4. Accept the local cache hit only when the nearest known area is inside a practical city radius.
5. Fall back to Google Maps reverse geocoding if no local area is close enough.
6. Preserve exact user coordinates in workflow context while storing the resolved neighborhood as `resolved_area` and `location`.

## Backend Plan: Intent Parser Cache Discipline
1. Let the LLM parse human text as before.
2. Post-process the parsed location through the local coordinate catalog.
3. Normalize area names when a cache hit is found.
4. Preserve city-only hits as city context and allow the resolver to prefer GPS neighborhood precision.
5. Fall back to Google Maps Geocoding for uncached area names when `MAPS_API_KEY` is present.

## Frontend Plan: Native Notifications
1. Configure `expo-notifications` at app startup.
2. Create a global app context with `activeJob` and `setActiveJob`.
3. Trigger `Booking Confirmed - Provider En Route` when `activeJob.status` becomes `confirmed`.
4. De-duplicate notifications by booking id so a re-render does not spam the user.
5. Use the session booking created on the confirmation screen as the active job source.

## Safe-Area Plan
1. Re-check the requested files for deprecated `SafeAreaView` imports.
2. Keep the Liquid Glass header/tab surfaces aligned with `useSafeAreaInsets`.
3. Replace any nearby deprecated confirmation-surface usage with inset padding while preserving visual hierarchy.

## Acceptance Criteria
- A Karachi request with exact Scheme 33 GPS resolves to `Scheme 33 Karachi` or the closest local neighborhood before provider discovery.
- City-only text no longer overrides exact frontend coordinates.
- Local JSON is attempted before Google geocoding in both intent parsing and location resolution.
- A confirmed booking updates `activeJob` and schedules a local push notification.
- Targeted safe-area files have no deprecated `SafeAreaView` imports from `react-native`.
