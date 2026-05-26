# 📱 Asaaniyat Mobile Application

<p align="left">
  <img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React Native" />
  <img src="https://img.shields.io/badge/Expo_SDK_54-000020?style=for-the-badge&logo=expo&logoColor=white" alt="Expo" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
</p>

The primary user touchpoint of the **Asaaniyat** service orchestration platform. Built using **React Native** and **Expo (SDK 54)**, the application delivers a premium, native-feeling experience optimized for informal service booking across Pakistan.

---

## 🌿 The Design Language: "Light Mint Glassmorphism"

Asaaniyat uses a customized visual system designed to feel airy, clean, and highly professional. Key characteristics include:
* **Background Canvas**: `#F5FBF7` (Soft Mint Green)
* **Glass Cards**: Translucent cards (`rgba(255,255,255,0.74)`) with elevated emerald shadows (`rgba(14,143,70,0.12)`).
* **Modern Geometry**: Reduced corner roundedness (sharp curves up to `16px`) and clear system typography for optimal English and Roman Urdu readability.

---

## 🚀 Quick Start (Local Setup)

### 1. Install Dependencies
Ensure you are in the `/mobile` folder:
```bash
npm install
```

### 2. Run the Development Server
Start the Metro bundler:
```bash
npx expo start
```

### 3. Connect a Mobile Device / Emulator
* **Expo Go App**: Scan the QR code displayed in your terminal using the camera app (iOS) or Expo Go app (Android).
* **Network Resolution**: The application dynamically derives your development machine's local IP address (e.g. `http://192.168.x.x:3001`) to connect to the backend automatically. 
* *Ensure your development machine and mobile device are connected to the exact same Wi-Fi network.*

---

## 🛠️ Key Frontend Components

* **`LoadingOrchestrator.js`**: An active, animated timeline showing "AI at work". Rather than displaying a generic spinner, it renders real-time trace transitions as the backend orchestrates through the 8-Agent pipeline.
* **`ProviderResults.js`**: Beautiful translucent cards showcasing discovered service providers, historical star ratings, and dynamic price quotes in PKR.
* **`theme.js`**: Centralized token store for colors, typography, spacing, border radii, and custom haptic-integrated elevation shadows.

---

## 📦 Production Builds (Expo EAS)

To build a standalone preview APK for Android using Expo Application Services (EAS):

```bash
eas build --platform android --profile preview
```

> [!IMPORTANT]
> **Build Requirements**:
> Standard environment overrides are handled dynamically inside `app.config.js` to ensure production endpoints are resolved correctly during compilation.

---

<div align="center">
  <p>Part of the <b>Asaaniyat Ecosystem</b> for the Google Antigravity Hackathon</p>
</div>
