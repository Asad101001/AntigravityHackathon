# Phase III Implementation Plan

## Objective

Finalize Asaaniyat Antigravity across backend logic, mobile polish, richer provider data, and deployment readiness.

## Backend

- Keep trace logs inside `backend/logs` using a backend-local path.
- Pass frontend-selected `city` through `/api/service-request` into the orchestrator context.
- Resolve locations through explicit city context, fuzzy catalog matching, and Google Geocoding when configured.
- Expand LLM intent recognition for informal Pakistani services including maid/masi, cleaning lady, car mechanic, hairdresser, and salon.
- Enforce strict RAG grounding in provider conversation replies.

## Data

- Replace `backend/data/providers.json` with 300 realistic providers.
- Cover Karachi, Lahore, and Islamabad.
- Include standard and informal service categories.
- Densely populate high-demand areas including DHA, Gulshan, and F-8.
- Include edge cases: unverified providers, 2.5-star records, and high cancellation risk.

## Mobile

- Split embedded tab screens into `HomeScreen`, `BookingsScreen`, `StatusScreen`, and `ChatScreen`.
- Use safe-area insets and flex layouts to prevent overlap.
- Add city selection before service request submission.
- Show only current-session bookings.
- Add local Expo notifications for match, confirmation, and status updates.
- Guard notification loading in Expo Go so Android SDK 53+ does not crash on removed remote-push paths; notifications activate in development builds and APKs.
- Initialize chat with an AI welcome message.
- Rebuild native maps around provider/user lat/lng and fit-to-coordinate behavior.

## DevOps

- Add a backend Dockerfile for Cloud Run.
- Replace the APK GitHub Action with a managed Expo prebuild plus Gradle `assembleDebug` flow that runs from `mobile/` and uploads a deterministic APK artifact.
- Document Firestore migration from JSON provider data.
- Document Cloud Run deployment and runtime environment variables.
