# 🧪 Quality Assurance (QA) Guide

<p align="center">
  <img src="https://img.shields.io/badge/Testing-Jest-C21325?style=for-the-badge&logo=jest&logoColor=white" alt="Testing" />
  <img src="https://img.shields.io/badge/E2E-Detox-24292E?style=for-the-badge" alt="E2E" />
  <img src="https://img.shields.io/badge/Security-OWASP-000000?style=for-the-badge" alt="Security" />
</p>

This document outlines the testing strategy, verification steps, and known issues for the **Asaaniyat** platform.

---

## 🎯 1. Testing Strategy

Asaaniyat relies on a combination of manual testing, automated unit tests, and end-to-end (E2E) pipeline verification to ensure the 8-agent AI orchestrator and mobile frontend work seamlessly.

### ⚙️ Backend Verification
- 🩺 **Health Check**: Endpoint `/health` must return `200 OK` with service status.
- 🚀 **Pipeline Execution**: The `/api/service-request` endpoint must successfully orchestrate all 8 agents (Intent Parser to Follow-up Manager) within **5 seconds** for a standard query.
- 📝 **Agent Trace Logs**: Ensure `/api/logs` returns structured JSON traces for debugging agent decisions.
- 🛡️ **Rate Limiting**: Verify that exceeding 100 requests/15 minutes triggers a `429 Too Many Requests` response. Auth endpoints must trigger at 15 requests/15 minutes.

### 📱 Mobile App Verification
- 🏗️ **Build Success**: Verify EAS builds (`preview` and `production`) complete successfully without Gradle or dependency errors.
- 🎨 **UI/UX Consistency**: Ensure the "Light Mint Glassmorphism" UI renders correctly across different Android screen sizes.
- 🌐 **API Connectivity**: Verify the mobile app successfully connects to the backend (via `EXPO_PUBLIC_API_BASE_URL`).
- 🔄 **State Management**: Ensure the Loading Screen accurately reflects the real-time progress of the 8-agent backend pipeline.

---

## 📋 2. Manual Test Cases

### TC-01: Natural Language Intent Parsing
- 🗣️ **Input**: "Kal subah 10 baje G-11/2 mein AC theek karwana hai."
- 🎯 **Expected Output**: 
  - **Service**: AC Technician
  - **Location**: G-11/2
  - **Time**: Tomorrow, 10:00 AM
  - **Confidence**: `> 0.85`

### TC-02: Provider Ranking
- 📍 **Input**: Valid parsed intent for a Plumber in DHA Phase 5.
- 🏆 **Expected Output**: The `DecisionMaker` agent selects the highest-ranked provider based on distance (`<5km`), rating (`>4.0`), and availability, returning a clear reasoning string.

### TC-03: RAG Chat Fallback
- 💬 **Input**: Send a message to a booked provider.
- 🧠 **Expected Output**: The local RAG pipeline (using <img src="https://img.shields.io/badge/Groq-F55036?style=flat-square&logo=groq&logoColor=white"/> or <img src="https://img.shields.io/badge/Google%20Gemini-8E75B2?style=flat-square&logo=google&logoColor=white"/> fallback) returns a context-aware response based on the provider's profile and booking details. If no API keys are present, it must return a deterministic demo response.

---

## ⚠️ 3. Known Issues & Limitations

1. 🎭 **Mock Data**: Provider data is currently hardcoded (`providers.json`). Dynamic provider onboarding is out of scope for the MVP.
2. 🗺️ **React Native Maps**: `react-native-maps@1.27.2` might exhibit rendering glitches on Android with `newArchEnabled: true`. If map rendering fails, disable the new architecture in `app.json`.
3. 🖼️ **Image Asset Strictness**: Android's AAPT2 strictly validates image bytes. Ensure all `.png` files in `assets/` are true PNGs, not renamed JPEGs.

---

## 🔐 4. Security Checks

- 🧼 **Input Sanitization**: All user inputs must pass through the `sanitizeInput` middleware to prevent XSS and NoSQL injection.
- 🔑 **JWT Secrets**: The backend logs a warning on startup if `JWT_SECRET` is missing or set to the default `demo-secret`.
