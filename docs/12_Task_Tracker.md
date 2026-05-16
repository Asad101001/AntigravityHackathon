# Phase III Task Tracker

| Area | Task | Status |
| --- | --- | --- |
| Backend | Backend-local trace logging | Done |
| Backend | Explicit city ingestion | Done |
| Backend | Dynamic fuzzy location matching | Done |
| Backend | Informal service intent prompt updates | Done |
| Backend | Strict RAG grounding | Done |
| Data | Regenerate providers dataset to 300 records | Done |
| Data | Add informal services | Done |
| Data | Add edge cases and dense famous-area coverage | Done |
| Mobile | Rewrite Home screen layout and city dropdown | Done |
| Mobile | Create session-only Bookings screen | Done |
| Mobile | Create active-session Status screen | Done |
| Mobile | Create safe-area Chat screen with welcome message | Done |
| Mobile | Add Expo local notifications | Done |
| Mobile | Guard notifications for Expo Go Android | Done |
| Mobile | Rebuild native map markers and fit behavior | Done |
| DevOps | Fix GitHub Actions APK build path and Gradle setup | Done |
| DevOps | Add Cloud Run Dockerfile | Done |
| DevOps | Firestore migration guide | Done |
| DevOps | Cloud Run deployment guide | Done |

## Verification Targets

- Backend syntax check passes.
- Mobile dependency install completes.
- `providers.json` parses and contains 300 records.
- No historical mock bookings remain in the tab booking UI.
- RAG chat refuses unsupported answers when chunks are missing.
- Expo Go can load without the `expo-notifications` remote-push runtime crash.
- GitHub Actions builds `build/asaaniyat-preview.apk` from the generated Android project.
