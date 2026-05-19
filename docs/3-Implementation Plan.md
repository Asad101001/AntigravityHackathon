# Asaaniyat App Updates & Refinements Plan

This plan addresses the massive list of feature additions, UI/UX refinements, and architectural changes requested.

## User Review Required

> [!WARNING]
> This plan includes installing new dependencies in both the backend and frontend. It also involves migrating from JSON to a SQLite database. Please review the proposed changes below.

## Proposed Changes

### 1. Database Integration (Backend)
- **Goal:** Replace `providers.json`, `keywords.json`, and `coordinates.json` with a local SQLite database.
- **Implementation:** 
  - Install `sqlite3` and `sqlite` (Promise-based wrapper) in the backend.
  - Create a `db.js` utility to initialize the SQLite database (`asaaniyat.sqlite`).
  - Create a setup/seed script to insert realistic provider data (real names, Pakistani locations) on startup.
  - Update `serviceRoutes.js` and orchestrator logic to fetch data from SQLite instead of JSON.

### 2. Trace Logging & Documentation (Backend)
- **Goal:** Label agent traces with timestamps and store them in `d:\Desktop\hackathonMVP\logs`. Output docs in `docs/`.
- **Implementation:**
  - Create a custom logger utility `traceLogger.js`.
  - When an orchestration/agent action occurs, log the trace as a `.json` or `.md` file with a timestamp in the root `logs/` directory.
  - Create an API endpoint (`GET /api/logs`) to allow the frontend to fetch these traces.
  - Generate a formatted markdown document for the API endpoints and save it in the root `docs/` folder with a timestamp.

### 3. Maps & Location Tracking (Mobile)
- **Goal:** Use current GPS location if none is provided, and visualize providers on a map.
- **Implementation:**
  - Install `expo-location` to request GPS coordinates and send them to the backend when booking.
  - Install `react-native-maps` to display map views.
  - Update `ProviderResultsScreen` and `ConfirmationScreen` to show a map with markers for the providers and the user's location.

### 4. UI/UX Refinement & Theme (Mobile)
- **Goal:** Transition to a clean black/white theme with neon/lime/dark green accents. Add warmth, icons, and smooth animations.
- **Implementation:**
  - Install `@expo/vector-icons` for modern, non-emoji icons.
  - Update `App.js` and all screens to use the new color palette (Black, White, Neon Green `#39FF14`, Dark Green `#006400`).
  - Add an inviting and premium Entrance Loading Screen component with smooth fading/scaling animations when the app starts.
  - Create a "Settings" or "Trace Viewer" screen accessible from the Home Screen header, allowing users to view backend traces.
  - Generate a new, cool app icon (black/neon green theme) using AI generation and set it in `assets/icon.png`.

## Verification Plan

### Automated/Local Tests
- Run `npm install` on both `backend` and `mobile` to verify dependencies.
- Verify the backend server boots and successfully initializes the `asaaniyat.sqlite` database.
- Verify `logs/` and `docs/` directories are populated automatically upon running scenarios.

### Manual Verification
- **App Startup:** Verify the new Entrance Screen displays beautifully before transitioning to Home.
- **Theme:** Verify the black/white/neon green aesthetic is consistently applied across all screens.
- **Location & Map:** Allow location permissions in Expo Go/Emulator and verify the Map shows the correct location.
- **Logs:** Navigate to the new settings/logs page in the app to see real-time agent traces.
