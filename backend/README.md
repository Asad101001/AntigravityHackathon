# ⚙️ Asaaniyat Backend Engine

<p>
  <img src="https://img.shields.io/badge/Node.js-43853D?style=flat-square&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Express.js-404D59?style=flat-square" />
  <img src="https://img.shields.io/badge/SQLite-07405E?style=flat-square&logo=sqlite&logoColor=white" />
</p>

This is the core intelligence server for the Asaaniyat platform. It houses the **Antigravity Orchestrator Engine**, which manages an 8-agent AI pipeline to parse natural language service requests, discover local providers, calculate dynamic pricing, and execute bookings.

## 🚀 Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. (Optional) Configure AI Keys:
   Copy `.env.example` to `.env` and add your `GROQ_API_KEY` or `GEMINI_API_KEY` if you want live RAG chat functionality. Otherwise, the system gracefully falls back to deterministic demo responses.

3. Start the server:
   ```bash
   npm run dev
   ```
   *The server will start on `http://localhost:3001`.*

## 🧠 The Orchestrator

The logic is split across decoupled agents found in the `agents/` directory. They do not call each other directly; instead, the central `AntigravityOrchestrator` runs them sequentially, passing a shared `Context` object through the pipeline.

For a detailed breakdown of the 8 agents, refer to the master [DESIGN.md](../DESIGN.md).
