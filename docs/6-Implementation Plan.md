# Set 6: Refinement Phase - Implementation Plan

## Goal
Optimize standalone Android APK network routing. Enable HTTP cleartext traffic, implement fallback LAN IP auto-detection on port 3000, and refine UI copywriting by removing technical developer metrics.

## Proposed Changes
- **mobile/app.json**: Configure usesCleartextTraffic inside Android build property overrides.
- **mobile/config.js**: Program fallback Metro bundle IP scrapers to auto-discover local development host targets.
- **mobile/screens/**: Streamline tagline copies, hide the agent trace logger button, and clean developer buzzwords from Intent loading indicators.
