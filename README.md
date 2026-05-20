<div align="center">
  <h1>🛠️ Asaaniyat (عسانیت)</h1>
  <p><b>AI Service Orchestrator for Pakistan's Informal Economy</b></p>
  <p><i>Google Antigravity Hackathon · Challenge 2</i></p>

  <p>
    <img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React Native" />
    <img src="https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white" alt="Expo" />
    <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/Express.js-404D59?style=for-the-badge" alt="Express.js" />
    <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  </p>
</div>

<br />

## 🌟 Overview

**Asaaniyat** is a mobile-first, agentic AI platform designed to bridge the gap between users and informal service providers (electricians, plumbers, AC technicians, carpenters, painters, and handymen) across Pakistan. 

By leveraging an advanced **8-Agent AI Pipeline**, users can simply describe their needs in **Urdu, Roman Urdu, or English**. The system autonomously parses the intent, discovers local providers, ranks them, calculates a dynamic price, and securely books the service—all within seconds.

---

## ✨ Key Features

- **Multilingual Intent Parsing**: Supports English, Urdu, and Roman Urdu natural language inputs.
- **Agentic Orchestration**: An 8-stage AI pipeline manages the entire booking lifecycle transparently without user intervention.
- **Geospatial Provider Discovery**: Matches users with service providers based on real-time distance and area caching.
- **Intelligent RAG Chat**: Built-in Provider-Chat system powered by Retrieval-Augmented Generation (Groq/Gemini fallbacks) to handle user queries dynamically.
- **Dark Glassmorphism UI**: A highly polished, native-feeling mobile interface with fluid animations and real-time agent trace visualization.

---

## 🤖 The 8-Agent Pipeline

The core intelligence of Asaaniyat is driven by an Antigravity orchestrator managing 8 decoupled agents. They share a unified context, ensuring deterministic and traceable execution.

| Step | Agent | Responsibility | Input → Output |
| :---: | :--- | :--- | :--- |
| **1** | `IntentParser` | Extracts the core service, location, and preferred time from raw multilingual text. | *Raw Text* → `Parsed Intent` |
| **2** | `LocationResolver` | Converts neighborhood strings (e.g., "G-11/2") into precise geographic coordinates. | *Area String* → `Lat/Lng` |
| **3** | `ProviderDiscoverer` | Filters the database of providers using geospatial queries within an adaptive radius. | *Service + Location* → `Provider List` |
| **4** | `ProviderRanker` | Multi-factor scoring based on distance, historical rating, availability, and sentiment. | *Provider List* → `Ranked List` |
| **5** | `DecisionMaker` | Applies hard business constraints (verified status, slot availability) to select the absolute best match. | *Ranked List* → `Selected Provider` |
| **6** | `DynamicPricing` | Generates a transparent cost estimation adjusted for distance and urgency. | *Provider + Context* → `PKR Quote` |
| **7** | `BookingExecutor` | Finalizes the transaction, simulates payment logic, and commits to the database. | *Quote + Provider* → `Booking ID` |
| **8** | `FollowUpManager` | Schedules future feedback prompts and automated reminders via simulated FCM. | *Booking ID* → `Scheduled Events` |

---

## 🚀 Quick Start (Local Development)

To run the entire stack locally, you will need two separate terminal windows.

### 1. Backend API Server (Node.js)

The backend houses the Antigravity orchestrator, MongoDB database, and REST API.

```bash
cd backend
npm install
npm run dev
```

> **Note on LLM Integration:** The backend functions perfectly in "Demo Mode" without any API keys. If you wish to enable the live RAG chat and dynamic reasoning, copy `backend/.env.example` to `backend/.env` and insert your `GROQ_API_KEY` or `GEMINI_API_KEY`.

### 2. Mobile Application (React Native / Expo)

The frontend is built with Expo SDK 54 and automatically attempts to connect to your local backend.

```bash
cd mobile
npm install
npx expo start
```

> **Network Requirement:** Ensure your mobile device (running the Expo Go app) and your development machine are connected to the same Wi-Fi network. The app will auto-resolve the LAN IP address to connect to the Node.js server.

### 3. Admin Dashboard (Vite / React)

A separate web interface for managing providers and viewing system analytics.

```bash
cd "admin dashboard"
npm install
npm run dev
```

---

## 📡 Core API Reference

The backend exposes a clean REST interface. By default, it runs on `http://localhost:3001`.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/service-request` | Executes the main 8-Agent pipeline to fulfill a user request. |
| `POST` | `/api/chat/message` | Sends a message to the RAG pipeline for grounded provider chat. |
| `POST` | `/api/chaos/simulate` | Simulates a provider cancellation, triggering the re-routing agents. |
| `GET` | `/api/booking/:id` | Retrieves detailed information for a specific booking. |
| `GET` | `/api/logs` | Fetches the raw JSON trace logs of the agent pipeline execution. |
| `GET` | `/health` | Returns the server status, active version, and uptime. |

---

## 📁 Repository Structure

```text
Asaaniyat/
├── backend/                  # Express server & Antigravity 8-Agent Orchestrator
│   ├── agents/               # Individual Agent logic classes
│   ├── orchestrator/         # Pipeline control flow
│   ├── data/                 # Mock databases (Providers, Coordinates)
│   └── routes/               # API Endpoints
├── mobile/                   # React Native (Expo SDK 54) Application
│   ├── assets/               # Image resources
│   └── screens/              # UI Views (Home, Loading, Provider Results, etc.)
├── admin dashboard/          # React/Vite Admin Single Page Application
├── docs/                     # Additional architectural diagrams and assets
└── tests/                    # Unit and integration test suites
```

---

## 📖 Deep Dive Documentation

For a more granular look at how the system is built, tested, and deployed, please refer to the dedicated documentation files:

- 🏗️ **[System Architecture (ARCHITECTURE.md)](./ARCHITECTURE.md)** — Core backend structure, 8-Agent pipeline logic, and database schemas.
- 🎨 **[UI/UX Design & Theming (DESIGN.md)](./DESIGN.md)** — "Dark Glassmorphism" aesthetic, color tokens, and frontend component design.
- 🧪 **[Quality Assurance (QA.md)](./QA.md)** — Test cases, pipeline verification, and security checklists.
- ☁️ **[Deployment Guide (DEPLOYMENT.md)](./DEPLOYMENT.md)** — Step-by-step instructions for Google Cloud Run and Expo EAS.
- 📊 **[Admin Dashboard Guide](./admin%20dashboard/ADMIN_DASHBOARD_README.md)** — Operations and setup for the admin panel.

---

<div align="center">
  <p>Built with ❤️ for the <b>Google Antigravity Hackathon</b></p>
</div>
