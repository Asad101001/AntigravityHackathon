# Set 5: AI Service Orchestrator - Implementation Plan

## Goal
Implement the central 3-layer AI service orchestration framework. Design the 7 backend Agent pipeline classes, setup local rate limiting and sanitization middlewares, and deploy the trilingual Urdu-English mock provider indices.

## Proposed Changes
- **backend/agents/**: Create BaseAgent and 7 subclass agents for intent, location, discovery, ranking, decision-making, scheduling, and follow-ups.
- **backend/orchestrator/AntigravityOrchestrator.js**: Code the trace aggregator and sequential contextual state machine.
- **mobile/screens/**: Implement glassmorphism UI pages including the main, loading, confirmation, and trace logs screen.
