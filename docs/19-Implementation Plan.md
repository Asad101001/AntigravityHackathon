# Set 19: Date/Time Parsing Fix - Implementation Plan

## Goal
Resolve relative and absolute date mismatches by developing a custom natural-language date/time parsing engine that maps conversational intents to accurate calendar dates.

## Proposed Changes
- **backend/utils/dateTimeParser.js**: Write regex-based parsing function matching weekday indices and absolute dates.
- **backend/agents/LLMIntentParserAgent.js**: Enrich LLM output instructions to recognize highly precise relative times.
- **backend/agents/BookingExecutorAgent.js**: Integrate custom parser fallback for slot assignment.
