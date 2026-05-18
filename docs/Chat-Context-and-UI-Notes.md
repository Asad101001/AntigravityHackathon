**Chat Context, UI & Styling Notes**

- **Chat context:** include structured metadata on each LLM call: `sessionId`, `location`, `lastIntent`, `recentProviders`, and a one-line `lastTurnSummary`.
- **chatContextBuilder:** `backend/chat/chatContextBuilder.js` produces a compact object to be embedded as system message or JSON block.

- **UI styling:**
  - Implement a `liquid-glass` style using translucent background + blur + subtle border and soft shadow. Use CSS variables for colors, radii and spacing.
  - Responsive grid: mobile 2-3 cols, tablet 4 cols, laptop center column + left nav.
  - Fonts: recommend Inter for UI with fallback stack.

- **Provider view:** sketch a simple two-column provider panel (nav + job list) for later implementation.
