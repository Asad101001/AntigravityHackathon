# Visual Overhaul — Agent Reasoning & Narration UI

This walkthrough documents the visual specifications and timing mechanisms that deliver premium AI transparency to the user.

## Figma Specs & Styling
* **Theme**: Deep cognitive-reasoning dashboards.
* **Palette**: 
  * `parse_intent`: Intent Parser (`🧠` • `#7C3AED`)
  * `resolve_location`: Location Resolver (`📍` • `#0EA5E9`)
  * `discover_providers`: Provider Discoverer (`🔍` • `#10B981`)
  * `rank_providers`: Provider Ranker (`📊` • `#F59E0B`)
  * `make_decision`: Decision Maker (`🎯` • `#EF4444`)
  * `dynamic_pricing`: Dynamic Pricing (`💰` • `#14B8A6`)
  * `execute_booking`: Booking Executor (`📋` • `#6366F1`)
  * `schedule_followup`: Follow-Up Manager (`🔔` • `#EC4899`)

## Animation & Timing Metrics

### 1. Narration Tick Ticker
* **Tick Speed**: `200ms` per active message step tick (`NARRATION_TICK_MS = 200`).
* **Active Scaling**: `scaleAnim` pulses the active agent's icon to `1.08` scale over an `800ms` loop.
* **Bouncing dots**: `bounceAnim` loops sequentially over `400ms` steps.

### 2. Collapsible Traces Dashboard
* Renders a primary, slide-up floating **Reasoning Hero Card** driven by `heroFade` (500ms opacity) and `heroSlide` (-12 to 0 sliding offset).
* Expandable accordion items let users view full JSON schemas and raw execution latency scores.
