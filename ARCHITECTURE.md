# 🏗️ System Architecture

<p align="center">
    <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/Express.js-404D59?style=for-the-badge" alt="Express.js" />
    <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
</p>

This document outlines the architectural decisions, design patterns, and system components of **Asaaniyat**, an AI-driven service orchestrator for Pakistan's informal economy.

---

## 🗺️ 1. High-Level Architecture

Asaaniyat follows a decoupled client-server architecture consisting of a React Native mobile application and a Node.js/Express backend that houses the Antigravity Orchestrator Engine.

### 🌊 Core Architecture Flow

| Component | Technology | Responsibility |
| :--- | :--- | :--- |
| **📱 Client** | ![](https://img.shields.io/badge/React_Native-20232A?style=flat-square&logo=react&logoColor=61DAFB) | Provides the mobile interface (Expo) and sends requests via REST API. |
| **🚪 API Gateway** | ![](https://img.shields.io/badge/Express.js-404D59?style=flat-square) | Handles Auth, Rate Limiting, and routes incoming HTTP requests. |
| **🧠 Orchestrator** | ![](https://img.shields.io/badge/Node.js-43853D?style=flat-square&logo=node.js&logoColor=white) | The **Antigravity Orchestrator Engine** manages the 8-Agent pipeline. |
| **🤖 Agents 1-8** | Custom Logic / LLMs | NLP parsing, Geocoding, Discovery, Ranking, Pricing, and Booking execution. |
| **💾 Database** | ![](https://img.shields.io/badge/MongoDB-4EA94B?style=flat-square&logo=mongodb&logoColor=white) | MongoDB for scalable NoSQL document persistence and fast reads. |

---

## ⚙️ 2. The 8-Agent Pipeline

The core backend intelligence is driven by an 8-stage agentic pipeline. These agents are strictly decoupled; they do not call each other directly. Instead, they share a unified **Context Object** managed by the `AntigravityOrchestrator`.

| Step | Agent | Responsibility |
| :---: | :--- | :--- |
| **1** | 📝 `IntentParser` | NLP parsing of Roman Urdu, Urdu, and English queries. |
| **2** | 📍 `LocationResolver` | Geocoding specific neighborhood strings (e.g., "G-11/2") to Latitude/Longitude. |
| **3** | 🔍 `ProviderDiscoverer` | Geospatial querying to find providers within an adaptive radius. |
| **4** | ⭐ `ProviderRanker` | Multi-factor scoring (distance, rating, availability, sentiment). |
| **5** | ⚖️ `DecisionMaker` | Final provider selection applying hard constraints and business logic. |
| **6** | 💰 `DynamicPricing` | Generates transparent cost estimations based on distance and urgency. |
| **7** | ✅ `BookingExecutor` | Finalizes the transaction and persists to the database. |
| **8** | 🗓️ `FollowUpManager` | Schedules future check-ins and feedback prompts. |

---

## 🧩 3. Design Patterns Used

- 🎯 **Orchestrator Pattern**: Centralizes control flow for the AI agents, ensuring deterministic execution order and easy debugging/tracing.
- 💉 **Dependency Injection**: Agents are injected into the orchestrator, allowing for easy mocking and testing.
- 🛡️ **Fallback Strategy**: The RAG (Retrieval-Augmented Generation) pipeline uses <img src="https://img.shields.io/badge/Groq-F55036?style=flat-square&logo=groq&logoColor=white"/> as the primary LLM, with <img src="https://img.shields.io/badge/Google%20Gemini-8E75B2?style=flat-square&logo=google&logoColor=white"/> as a fallback, and a local deterministic mock as a final safety net.
- 🔌 **Circuit Breaker**: Used around LLM calls to prevent system cascading failures if external APIs go down.

---

## 🔒 4. Backend Structure & Security

- **Framework**: Node.js with Express.
- **Database**: MongoDB (via `mongodb` package) for NoSQL document persistence.
- **Security Mechanisms**:
  - 🔑 JWT authentication.
  - 🛑 `express-rate-limit` to prevent brute-force attacks.
  - 🧹 Custom input sanitization middleware to prevent NoSQL injection / XSS.

---

## 🚀 5. Future Architectural Considerations

- 🐍 **Microservices**: Extracting the Agent Pipeline into an independent <img src="https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white"/> (FastAPI) microservice for better ML library support.
- 🐘 **Real Database**: Migrating from local MongoDB to a managed **MongoDB Atlas** cluster with geo-spatial indexing for native location queries.
- 📡 **WebSockets**: Implementing `Socket.io` for real-time bidirectional agent trace streaming to the mobile client, replacing the current HTTP polling mechanism.
