# Date/Time Parser - Developer Quick Reference

## Quick Start

Import the parser in your agent:
```javascript
const { parseDateTime, parseTimePreference } = require('../utils/dateTimeParser');
```

## Function Reference

### parseDateTime(input[, reference])

Parses a natural language date+time string into a JavaScript Date object.

**Parameters:**
- `input` (string): User input text (e.g., "tomorrow at 2 pm")
- `reference` (Date, optional): Reference date for relative calculations (default: today)

**Returns:** Object with properties:
```javascript
{
  date: Date,                    // The parsed date+time
  dateLabel: string,             // Formatted date (e.g., "Tuesday, 19 May 2026")
  timeLabel: string,             // 12-hour format (e.g., "2:00 PM")
  timeIn24H: string,             // 24-hour format (e.g., "14:00")
  timeIn12H: string,             // 12-hour format (e.g., "2:00 PM")
  confidence: number             // 0.0-1.0 confidence score
}
```

**Returns:** `null` if parsing fails

**Examples:**
```javascript
// Example 1
const result = parseDateTime("tomorrow at 2 pm");
// → date: 2026-05-19T14:00:00Z, confidence: 0.96

// Example 2
const result = parseDateTime("next Monday at 10:30 am");
// → date: 2026-05-25T10:30:00Z, confidence: 0.95

// Example 3 - with reference date
const ref = new Date('2026-05-18');
const result = parseDateTime("day after tomorrow at 3 pm", ref);
// → date: 2026-05-20T15:00:00Z, confidence: 0.98

// Example 4 - fails without time
const result = parseDateTime("tomorrow");
// → null (needs explicit time)
```

### parseTimePreference(timePreference)

Converts a time preference string to hours/minutes.

**Parameters:**
- `timePreference` (string): Time preference from intent parser (e.g., "tomorrow_afternoon")

**Returns:** Object with properties:
```javascript
{
  hours: number,                 // 0-23
  minutes: number,               // 0-59
  label: string,                 // 12-hour format
  slot: string                   // "morning|afternoon|evening|night|now"
}
```

**Returns:** `null` if no match

**Examples:**
```javascript
parseTimePreference('tomorrow_morning');
// → { hours: 9, minutes: 0, label: '9:00 AM', slot: 'morning' }

parseTimePreference('today_evening');
// → { hours: 18, minutes: 0, label: '6:00 PM', slot: 'evening' }

parseTimePreference('tonight');
// → { hours: 20, minutes: 0, label: '8:00 PM', slot: 'night' }
```

## Common Use Cases

### Case 1: Booking Executor - Parse User Appointment
```javascript
const { parseDateTime } = require('../utils/dateTimeParser');

const explicitAppointment = parseDateTime(context.user_text);
if (explicitAppointment && explicitAppointment.confidence > 0.75) {
  // High confidence - use this exact date/time
  booking.scheduled_time = explicitAppointment.date.toISOString();
} else {
  // Fallback to time preference + default date
}
```

### Case 2: Intent Parser - Enhance LLM Results
```javascript
const { parseDateTime } = require('../utils/dateTimeParser');

// After LLM parsing
if (!parsedTime || !parsedTime.includes('_')) {
  const enhanced = parseDateTime(userText);
  if (enhanced) {
    parsedTime = buildDetailedTimePreference(userText, enhanced);
  }
}
```

### Case 3: Validation - Check Booking Is In Future
```javascript
const { parseDateTime } = require('../utils/dateTimeParser');

const parsed = parseDateTime(userInput);
if (parsed && parsed.date < new Date()) {
  // Booking is in the past - reject
  return { error: 'Cannot book appointments in the past' };
}
```

## Confidence Scores

| Score | Meaning | Example |
|-------|---------|---------|
| 0.98 | Explicit keyword match | "tomorrow", "today" |
| 0.96 | Specific date matched | "May 20", "20/05/2026" |
| 0.95 | Day with "next" prefix | "next Monday" |
| 0.92 | "In N days" format | "in 3 days" |
| 0.85 | Day name only | "Monday" (ambiguous) |
| 0.80 | Relative word | "weekend" |
| 0.50 | Inferred from context | Time only, no date |
| 0.0 | Failed to parse | `null` return |

## Supported Formats

### Dates
- `today`, `tonight`, `tomorrow`
- `day after tomorrow`
- `next Monday`, `Monday`, `Friday`
- `in 3 days`, `in 2 weeks`
- `May 20`, `20 May`, `20/05/2026`
- `20-05-2026`, `2026-05-20`
- Weekend patterns

### Times
- `2 pm`, `2:30 PM`, `02:30 PM`
- `10 am`, `10:00 AM`
- `14:00`, `14:30` (24-hour)
- `morning`, `afternoon`, `evening`, `night`
- `ASAP`, `now`

## Combining Both

The parser automatically combines date and time:

```javascript
// Input has both parts
parseDateTime("I need a plumber tomorrow at 2 pm")
// → Returns TOMORROW at 2:00 PM ✓

// Input has only date (fails)
parseDateTime("I need a plumber tomorrow")
// → Returns null (no time) ✓

// Input has only time (uses default date)
parseDateTime("at 2 pm")
// → Uses TODAY (low confidence 0.50) ✓
```

## Error Handling

```javascript
const result = parseDateTime(userInput);

if (!result) {
  // Parsing failed - fall back to time preference only
  const timeOnly = parseTimePreference(context.time_preference);
  // Use time from timeOnly, date will be TODAY with low confidence
}

if (result && result.confidence < 0.70) {
  // Low confidence - show user for confirmation
  console.log(`Parsed: ${result.dateLabel} at ${result.timeIn12H}`);
  console.log(`Confidence: ${(result.confidence * 100).toFixed(0)}%`);
}
```

## Testing

Run the bundled tests:
```bash
# Unit tests for date parser
node test-date-parsing.js

# Integration test showing booking flow
node test-booking-with-dates.js
```

## Notes

- Parser is language-independent (works with English date/time expressions)
- Timezones: Always returns UTC-based Date objects
- Pakistan-aware: Formats use `en-PK` locale
- No external dependencies (pure JavaScript)
- Backward compatible with existing time preferences

## Troubleshooting

**Q: Why does "tomorrow morning" return null?**  
A: It needs an explicit time. Try "tomorrow at 9 am" or use `parseTimePreference('tomorrow_morning')` instead.

**Q: Why is my date off by one?**  
A: JavaScript months are 0-indexed. The parser handles this internally—if you see oddities, check the reference date.

**Q: Can I parse Urdu or Roman Urdu dates?**  
A: Not yet. The parser currently handles English expressions. Urdu parsing is handled by the LLM intent parser first.

**Q: How do I use this with timezones?**  
A: Dates are always UTC. Convert to Pakistan Standard Time (UTC+5) at display time.

---

For more details, see [19_Date_Time_Parsing_Fix.md](./docs/19_Date_Time_Parsing_Fix.md)
