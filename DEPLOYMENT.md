# 🚀 Deployment Guide

<p align="center">
  <img src="https://img.shields.io/badge/Google_Cloud_Run-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white" alt="GCP" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/Expo_EAS-000020?style=for-the-badge&logo=expo&logoColor=white" alt="EAS" />
  <img src="https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white" alt="GitHub Actions" />
  <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
</p>

This document explains how to deploy the Asaaniyat platform to production environments, specifically focusing on **Google Cloud Run** for the backend and **Expo EAS** for the mobile application.

---

## ☁️ 1. Backend Deployment (Google Cloud Run)

The backend is containerized and designed for stateless execution, making it perfect for <img src="https://img.shields.io/badge/Google_Cloud-4285F4?style=flat-square&logo=google-cloud&logoColor=white"/> Run.

### 📋 Prerequisites
- Google Cloud SDK (`gcloud`) installed and authenticated.
- A Google Cloud Project with Billing enabled.
- <img src="https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white"/> installed locally (optional, for local testing).

### 🛠️ Deployment Steps

1. **Set Environment Variables**: Ensure your `.env` variables are ready.
   - `PORT`: (Provided by Cloud Run, usually `8080`)
   - `JWT_SECRET`: Generate a strong, secure random string.
   - `GROQ_API_KEY` / `GEMINI_API_KEY`: Required for active LLM generation.

2. **Deploy via `gcloud` CLI**:
   Navigate to the `backend/` directory and run:
   ```bash
   gcloud run deploy asaaniyat-backend \
     --source . \
     --region asia-south1 \
     --allow-unauthenticated \
     --set-env-vars="JWT_SECRET=your_production_secret,GROQ_API_KEY=your_key"
   ```

3. **Verify Deployment**:
   Once deployed, Cloud Run will output a URL (e.g., `https://asaaniyat-backend-xxxx.run.app`). 
   Verify the health endpoint: 
   ```bash
   curl https://asaaniyat-backend-xxxx.run.app/health
   ```

---

## 📱 2. Mobile App Deployment (Expo EAS)

The mobile app is built and distributed using <img src="https://img.shields.io/badge/Expo_EAS-000020?style=flat-square&logo=expo&logoColor=white"/>.

### 📋 Prerequisites
- Expo account and EAS CLI installed (`npm install -g eas-cli`).
- Authenticated with EAS (`eas login`).
- Backend URL from Step 1.

### 🤖 Continuous Integration (GitHub Actions)
A <img src="https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat-square&logo=github-actions&logoColor=white"/> workflow (`.github/workflows/build-apk.yml`) is configured to automatically build an Android Preview APK upon pushing to `main` or `develop`.
- **Note**: Requires `EXPO_TOKEN` set in GitHub Secrets.

### 🏗️ Manual EAS Build Steps

1. **Configure API URL**:
   Ensure `eas.json` has the correct `EXPO_PUBLIC_API_BASE_URL` mapped for your environments, or set it dynamically in the console.

2. **Run Android Build**:
   Navigate to the `mobile/` directory and run:
   ```bash
   eas build --platform android --profile preview
   ```

3. **Install APK**:
   After the build completes, download the generated `.apk` from the Expo dashboard and install it on your Android device.

---

## 💻 3. Admin Dashboard Deployment

The Admin Dashboard is a Vite + React SPA. It can be hosted on any static site provider like <img src="https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white"/>, Netlify, or Firebase Hosting.

### 🚀 Steps (Example using Vercel):
1. Navigate to `admin dashboard/`.
2. Run `npm run build` to generate the `dist/` folder.
3. Deploy the `dist/` folder using the Vercel CLI (`vercel --prod`) or connect the repo to Vercel via Git integration, setting the root directory to `admin dashboard`.
