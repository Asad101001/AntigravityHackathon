# Phase III Walkthrough

## Demo Flow

1. Open the mobile app and land on Home.
2. Select a city from the Liquid Glass dropdown: Karachi, Lahore, or Islamabad.
3. Enter a natural-language request such as `Masi needed in Gulshan tomorrow morning` or `Car mechanic in DHA today`.
4. The backend parses intent, resolves location with city context, discovers providers, ranks them, prices the booking, and returns a match.
5. Provider Results displays accurate user/provider map markers and auto-fits the visible region.
6. Confirm the booking through checkout.
7. In an APK or development build, a local notification confirms the booking. In Expo Go, notification calls safely no-op so the demo can still run.
8. Status shows the active booking progress. The update action triggers a local service-juncture notification.
9. Chat opens with an automatic Asaaniyat AI welcome message.

## Backend Reasoning Guardrails

Conversation answers are strictly grounded in retrieved RAG chunks. If no chunk supports the requested detail, the assistant asks for clarification instead of inventing prices, phone numbers, provider coverage, or availability.

## Dataset Highlights

The new provider set contains 300 records across Karachi, Lahore, and Islamabad. It includes electricians, plumbers, AC technicians, carpenters, painters, handymen, maids, cleaning ladies, car mechanics, hairdressers, and salons. Dense areas include DHA, Gulshan, and F-8, with realistic low-quality and high-risk edge cases for ranking demos.

## Deployment Story

The backend can be containerized with `backend/Dockerfile` and deployed to Google Cloud Run. Provider data can later move from JSON to Firestore using the migration guide while keeping a JSON fallback for local demos.

## APK Build Story

The GitHub Action builds from the `mobile/` project directory. It installs mobile dependencies, runs `npx expo prebuild --platform android --clean`, builds `:app:assembleDebug` with Gradle, and uploads `build/asaaniyat-preview.apk` as the workflow artifact.
