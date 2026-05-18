**Backend Logging & Terminal UX**

- **Goal:** Provide concise, human-friendly terminal output for workflows while preserving full JSON traces in `logs/`.
- **Key env vars:**
  - `LOG_HUMAN_FMT` (true/false) — enable human formatting
  - `TERMINAL_CHARTS` (true/false) — enable small ASCII charts after `rank_providers`

- **Terminal format:**
  - Workflow header: id, input snippet, duration
  - Per agent: `▶ Agent N: <name> — <summary> — <time>ms`
  - After `rank_providers`: small ASCII bar chart of top 5 providers
  - End summary: chosen provider (name/id/ETA), total duration, trace path

- **Implementation notes:** add `backend/utils/terminalRenderer.js` which reads structured events and formats output. Keep trace JSON writes intact.

- **Acceptance:** When `TERMINAL_CHARTS=true` start shows enriched lines and a providers chart. Full traces remain untouched in `logs/`.
