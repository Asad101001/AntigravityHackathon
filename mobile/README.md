# 📱 Asaaniyat Mobile App

<p>
  <img src="https://img.shields.io/badge/React_Native-20232A?style=flat-square&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/Expo-000020?style=flat-square&logo=expo&logoColor=white" />
</p>

This is the front-end application for the Asaaniyat platform, built with React Native and Expo (SDK 54). It features a dark glassmorphism UI designed for intuitive, natural language interaction with the 8-agent backend orchestrator.

## 🚀 Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the Metro bundler:
   ```bash
   npx expo start
   ```

3. **Connecting to the Backend:**
   The app automatically derives the backend URL from your local network IP (e.g., `http://192.168.x.x:3001`). Ensure your backend is running and your mobile device/emulator is on the same network.

## 📦 Building (EAS)

To create an Android APK using Expo Application Services (EAS):

```bash
eas build --platform android --profile preview
```

For more detailed deployment instructions, see the master [DEPLOYMENT.md](../DEPLOYMENT.md).
