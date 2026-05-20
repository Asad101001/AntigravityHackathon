# 🎨 UI/UX Design & Theming

<p align="center">
    <img src="https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white" alt="Expo" />
    <img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React Native" />
</p>

This document covers the UI/UX decisions, visual identity, and component structure of the Asaaniyat mobile application.

---

## 💎 1. Design Language: "Light Mint Glassmorphism"

Asaaniyat uses a modern, premium **Light Mint Glassmorphism** design language. The goal is to provide a clean, trustworthy, and airy interface using subtle translucent layers over soft mint gradients.

### 📐 Core Principles
- 🧼 **Clean & Sharp Elements**: Reduced corner roundedness (Radii up to `16px`) to keep the UI looking modern and professional.
- 🪟 **Glass Transparency**: Using translucent whites (`rgba(255,255,255,0.74)`) for cards to let the soft mint background (`#F5FBF7`) breathe through.
- 🌿 **Depth via Shadow**: Elevated glass cards use an Emerald shadow (`rgba(14,143,70,0.12)`) instead of standard black/gray, maintaining color harmony.

---

## 🎨 2. Color Palette & Theming

The application relies on a strictly defined set of tokens located in `mobile/theme.js` and `mobile/config.js`.

| Token | Preview | Hex | Usage |
| :--- | :---: | :--- | :--- |
| **Mint Background** | ![](https://img.shields.io/badge/-F5FBF7?style=flat-square) | `#F5FBF7` | The base background color providing a soft canvas. |
| **Primary Emerald** | ![](https://img.shields.io/badge/-0E8F46?style=flat-square) | `#0E8F46` | Primary action buttons, success states, and branding. |
| **Accent Green** | ![](https://img.shields.io/badge/-22C55E?style=flat-square) | `#22C55E` | Secondary actions, badges, and highlights. |
| **Text Primary** | ![](https://img.shields.io/badge/-10251A?style=flat-square) | `#10251A` | Deep forest green/almost black for readability. |
| **Text Secondary** | ![](https://img.shields.io/badge/-51645A?style=flat-square) | `#51645A` | Subtitles, input placeholders, and captions. |

---

## 📝 3. Typography & Icons

- 🔠 **Headings**: Large, bold sans-serif (system default, weighted at `800` or `900`) to create strong visual hierarchy.
- 🔡 **Body**: Highly readable sans-serif, optimized for both English and Roman Urdu.
- 🛠️ **Service Icons**: Utilizes `@expo/vector-icons` (`Ionicons`) for clear service representation:
  - ⚡ `flash-outline` (Electrician)
  - 💧 `water-outline` (Plumber)
  - ❄️ `snow-outline` (AC Repair)
  - 🔨 `hammer-outline` (Carpenter)
  - 🎨 `color-palette-outline` (Painter)

---

## 🧱 4. Key Component Anatomy

### 🪞 Glass Card
Used for Provider Results and Booking Confirmations.
- **Background**: `rgba(255, 255, 255, 0.74)`
- **Border**: 1px solid `rgba(255, 255, 255, 0.92)`
- **Border Radius**: `16px` (sharp, modern curve)
- **Shadow**: `elevation: 8` with a custom Emerald tint.

### ⏱️ The "Loading Orchestrator" Screen
Instead of a standard spinner, the UI provides a real-time, animated timeline.
- As the backend transitions from `IntentParser` to `BookingExecutor`, the UI reflects this state via active/inactive node highlighting.
- **UX Goal**: Reduce perceived latency by showing the user the "AI at work".

---

## 👆 5. Interaction Model

- 📳 **Haptic Feedback**: Integrated via `expo-haptics` for meaningful actions (e.g., successful booking, errors).
- 🧭 **Navigation**: Modals are used for context-switching (like editing an intent), while standard stack pushes are used for sequential booking flows.
