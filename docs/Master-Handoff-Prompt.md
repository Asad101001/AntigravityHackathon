Master Handoff Prompt

Context:
- Repo root: D:/Desktop/hackathonMVP (backend focus: backend/)
- Key files: server.js, db.js, traceLogger.js, routes/, utils/
- Current runtime behavior: terminal shows trace file references; location resolution defaults to city center when prompt omits location; chat context is weak.

Objectives (in order):
1. Implement human-friendly terminal renderer with optional ASCII charts behind `TERMINAL_CHARTS` and `LOG_HUMAN_FMT` toggles.
2. Implement `locationResolver` prioritizing explicit prompt location (high-confidence), then clientLocation, then profile, then city center.
3. Implement `chatContextBuilder` to assemble structured state for LLM prompts.
4. Add a starter CSS partial for `liquid-glass` and responsive grid notes in docs (no frontend refactor required).
5. Add unit tests for `locationResolver` and terminal formatter; document how to run tests.

Constraints:
- Keep existing trace JSON writes and logs intact.
- Expose behavior via env vars.
- Avoid hard-coded city/area mappings.
- Keep changes backward compatible and small incremental commits.

Acceptance criteria:
- `npm start` with `TERMINAL_CHARTS=true` shows enriched agent lines and provider chart.
- Location resolution uses `clientLocation` when prompt lacks explicit location.
- Unit tests runnable via `npm test` under `backend/`.

Checklist for implementer:
- Inspect `server.js` logging hooks and agent emitters.
- Add `backend/utils/terminalRenderer.js` and wire in optional formatting.
- Add `backend/services/locationResolver.js` and unit tests.
- Add `backend/chat/chatContextBuilder.js`.
- Document changes in `docs/` and update `backend/package.json` test script.

If blocked, stop and ask for missing secrets or external API keys.
