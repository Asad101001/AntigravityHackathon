# Data Model — Schema Changes

## Provider Schema (providers.json / SQLite `providers` table)

### Added Fields

| Field | Type | Description |
|---|---|---|
| `specialization` | `string[]` | Specific sub-skills, e.g. `["inverter_ac","split_ac","ducted"]` |
| `base_rate_pkr` | `number` | Minimum call-out fee in Pakistani Rupees |
| `on_time_score` | `number` | 0–100 percentage of on-time arrivals based on historical data |
| `cancellation_risk` | `"high"\|"medium"\|"low"` | Likelihood of last-minute cancellation |
| `recent_sentiment` | `string` | Short natural-language summary of latest 5–10 reviews |

### Rationale
The LLMRankerAgent needs **rich, semantically meaningful data** to reason about trade-offs. A numeric rating alone (4.5★) does not tell the LLM that a provider "tends to cancel on summer days" or "specialises in industrial AC units". The new fields give the LLM the context it needs to produce a coherent `reasoning_log`.

### Migration
`db.js` seeds from `providers.json`. The new fields are added to the JSON file and the SQLite `CREATE TABLE` statement is updated to persist them. Existing rows are dropped and re-seeded on first startup with the new schema.

---

## Orchestration Context — New Keys

| Key | Set by | Consumed by |
|---|---|---|
| `urgency_level` | `LLMIntentParserAgent` | `LLMRankerAgent`, `DynamicPricingAgent` |
| `price_sensitivity` | `LLMIntentParserAgent` | `LLMRankerAgent`, `DynamicPricingAgent` |
| `reasoning_log` | `LLMRankerAgent` | API response, AgentTraceScreen |
| `quote_pkr` | `DynamicPricingAgent` | BookingConfirmScreen |
| `quote_breakdown` | `DynamicPricingAgent` | ReviewBookingScreen |
| `chaos_cancelled_provider` | `ChaosSimulatorAgent` | LLMRankerAgent (re-rank call) |
| `chaos_new_provider` | `ChaosSimulatorAgent` | API response `/api/chaos/simulate` |

---

## API Response Shape Changes

`POST /api/service-request` now includes:
```json
{
  "reasoning_log": "Ali AC was selected because...",
  "quote_pkr": 2800,
  "quote_breakdown": {
    "base_rate": 1500,
    "distance_surcharge": 800,
    "urgency_multiplier": 1.33,
    "total": 2800
  }
}
```

`POST /api/chaos/simulate` (new):
```json
{
  "cancelled_provider": { "id": "AC001", "name": "Cool Tech AC Services" },
  "new_provider": { ... },
  "reasoning_log": "Cool Tech cancelled (high cancellation_risk). Re-ranked remaining 4 providers...",
  "quote_pkr": 3100
}
```
