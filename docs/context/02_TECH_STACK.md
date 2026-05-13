# Tech Stack & Architecture Specification

---

## 1. TECHNOLOGY CHOICES (Why Each?)

### Frontend: React Native + Expo

**Why?**
- Single codebase for iOS + Android
- Rapid development (Expo handles build complexity)
- Free deployment
- Hot reload for quick iteration
- Good for 8-day timeline

**Alternatives Rejected:**
- ❌ Flutter: Steeper learning curve if unfamiliar
- ❌ Native iOS/Android: Too slow for 8 days, need 2 teams
- ✓ React Native + Expo: Best for timeline

**Setup Cost:** 0 (free open-source)

---

### Backend: Node.js + Express.js

**Why?**
- Fast to build APIs
- JavaScript everywhere (same as frontend)
- Lightweight, perfect for MVP
- Good async/await support for agent calls
- Minimal deployment cost

**Alternatives Rejected:**
- ❌ Python/Django: Over-engineered for this scope
- ❌ Java: Overkill, slow startup
- ✓ Node.js: Perfect fit

**Setup Cost:** 0 (free open-source)

---

### Database: Firebase Firestore

**Why?**
- NoSQL (perfect for flexible document structure)
- Real-time sync for bookings
- Free tier: 50K reads/day (sufficient)
- Built-in authentication
- No server management
- Perfect for MVP

**Free Tier Breakdown:**
```
Reads:        50K/day (free)
Writes:       20K/day (free)
Deletes:      20K/day (free)
Storage:      1 GB (free)
Bandwidth:    10 GB/month (free)
```

**Estimated Usage for Hackathon:**
- 100 bookings/day = ~500 reads (5% of free tier)
- Provider queries cached locally = minimal API calls
- Will NOT exceed free tier

**Setup Cost:** 0 (free, just enable Firebase project)

---

### Intent Parsing: Hugging Face Inference API

**Why?**
- Free Urdu/Roman Urdu language models available
- No training needed (use pre-trained)
- Easy REST API integration
- Caching for cost reduction
- Perfect for low-volume MVP

**Models to Use:**
```
Entity Recognition:
  - Model: "dslim/bert-base-multilingual-cased-ner"
  - Supports: Urdu, English, 100+ languages
  - Task: Extract SERVICE, LOCATION, TIME entities

Language Detection:
  - Model: "franc" (JavaScript library, offline)
  - Detects: Urdu, Roman Urdu, English
  - Cost: 0 (runs locally)

Urdu Normalization:
  - Tool: "urdu-nlp-toolkit" (open-source)
  - Converts: Roman Urdu → Standard Urdu
  - Cost: 0 (local)
```

**Integration:**
```javascript
// Option 1: Hugging Face Inference API (free tier, rate-limited)
const hfAPI = new HuggingFaceAPI({ apiKey: process.env.HF_API_KEY });
const entities = await hfAPI.ner("Mujhe AC technician chahiye");

// Option 2: Offline (faster, no rate limit)
const NLP = require("compromise");
const intent = NLP.extract(text);
```

**Recommended Approach for 8-Day Timeline:**
Use **offline NLP library** + **regex patterns** for entity extraction:
```javascript
// Fast, no API calls, no rate limiting
function parseIntent(text) {
  const serviceKeywords = {
    "AC": ["AC", "Air conditioner", "cooler"],
    "Electrician": ["electrician", "wiring", "electrical"],
    "Plumber": ["plumber", "pipe", "water"]
  };
  
  const timeKeywords = {
    "today": ["aaj", "today"],
    "tomorrow": ["kal", "tomorrow"],
    "morning": ["subah", "morning", "6-12"],
    "evening": ["shaam", "evening", "5-8"]
  };
  
  // Extract using keyword matching
  const service = Object.keys(serviceKeywords).find(key =>
    serviceKeywords[key].some(kw => text.toLowerCase().includes(kw))
  );
  
  const time = Object.keys(timeKeywords).find(key =>
    timeKeywords[key].some(kw => text.toLowerCase().includes(kw))
  );
  
  return { service, time };
}
```

**Setup Cost:** 0 (open-source libraries)

---

### Geolocation: Google Maps API

**Why?**
- Standard for location services
- Free tier: $200/month credit
- Used for: Geocoding, distance calculation, nearby search
- Minimal calls needed for MVP

**Free Tier Limits:**
```
Maps SDK:          $7/1000 requests (billed at $200 free)
Geocoding API:     $5/1000 requests (billed at $200 free)
Distance Matrix:   $5/1000 requests (billed at $200 free)
Nearby Search:     $32.50/1000 requests (billed at $200 free)
```

**Estimated Monthly Cost:**
```
User bookings:     100/day × 30 days = 3,000 bookings
Geocoding calls:   1 per booking = 3,000 calls = $15
Distance calls:    1 per search = 3,000 calls = $15
Nearby search:     1 per search = 3,000 calls = ~$96
Total:             ~$126/month (within $200 free tier)
```

**Optimization for MVP:**
```
1. Cache provider locations (hardcoded)
2. Cache geocoded addresses (Redis or local cache)
3. Only call Maps API for new locations
4. Use mock nearby search (don't call Maps API)
```

**Setup Cost:** 0 (free $200/month credit)

---

### Push Notifications: Firebase Cloud Messaging (FCM)

**Why?**
- Built-in to Firebase
- Free unlimited messages
- Works on iOS + Android
- Simple integration with React Native

**Setup Cost:** 0 (free)

---

### SMS Reminders: Twilio Free Trial

**Why?**
- Best Urdu SMS support in Pakistan
- Free trial: $15 credit (~30 SMS)
- Sufficient for hackathon demo

**Alternative for Zero Cost:**
Skip SMS, use only push notifications (still impressive)

**Setup Cost:** 0 (free trial) or skip entirely

---

### Orchestration: Google Antigravity

**Why?**
- Core requirement of challenge
- Free beta tier during hackathon
- Handles multi-step agent workflows
- Provides trace logs (judges want to see this)

**Setup Cost:** 0 (free beta)

---

### Hosting: Firebase Hosting + Vercel

**Frontend Hosting:**
- React Native app: Deploy via Expo
  - Free: expo.dev
  - Managed: No cost
  
- Demo web version (optional): Vercel
  - Free tier sufficient
  - Cost: 0

**Backend Hosting:**
- Node.js: Firebase Cloud Functions (free tier)
  - 125K invocations/month (free)
  - 40K GB-seconds/month (free)
  
  OR
  
- Node.js: Railway / Render.com (free tier)
  - Free tier: 50 hours/month CPU
  - Sufficient for MVP

**Setup Cost:** 0 (free tier)

---

## 2. COMPLETE ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                 MOBILE FRONTEND (React Native)              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Home Screen                                        │  │
│  │  ├─ Text Input (Urdu/English)                      │  │
│  │  ├─ Voice Input (optional)                         │  │
│  │  └─ Send Button                                    │  │
│  └──────────────────┬──────────────────────────────────┘  │
│                    │ HTTPS POST                            │
└────────────────────┼─────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│           BACKEND API (Node.js + Express)                   │
│           [localhost:5000 or Cloud Functions]               │
│                                                             │
│  POST /api/service-request                                │
│  ├─ Receive: { user_text, user_id }                       │
│  ├─ Call: Antigravity orchestrator                        │
│  └─ Return: { booking_id, provider, confirmation }        │
│                                                             │
│  POST /api/booking/create                                 │
│  ├─ Receive: { provider_id, time_slot }                  │
│  ├─ Validate: Slot availability                          │
│  └─ Write: Firebase Firestore                            │
│                                                             │
│  GET /api/providers (cached)                              │
│  ├─ Return: Mock provider list                           │
│  └─ Cost: 0 (cached)                                     │
│                                                             │
│  POST /api/notification/send                             │
│  ├─ Send: Push notification via FCM                      │
│  └─ Send: SMS via Twilio (optional)                      │
│                                                             │
└────────────────────┬─────────────────────────────────────┘
                     │
        ┌────────────┼────────────┬─────────────┐
        ↓            ↓            ↓             ↓
┌──────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────────┐
│ Antigravity  │ │  Firestore  │ │ Google Maps │ │  Firebase    │
│ Orchestrator │ │  Database   │ │     API     │ │ Messaging    │
│              │ │             │ │             │ │ (FCM)        │
│ Agents:      │ │ Collections:│ │ Functions:  │ │              │
│ 1. Intent    │ │ - users     │ │ - Geocode   │ │ Sends:       │
│ 2. Location  │ │ - bookings  │ │ - Distance  │ │ - Push notif │
│ 3. Provider  │ │ - providers │ │ - Nearby    │ │ - Reminders  │
│ 4. Ranking   │ │             │ │             │ │              │
│ 5. Decision  │ └─────────────┘ └─────────────┘ └──────────────┘
│ 6. Booking   │
│ 7. Follow-up │
└──────────────┘
```

---

## 3. DATA FLOW (End-to-End)

```
[User Input: "Electrician chahiye G-11 mein kal"]
        ↓
[Mobile App: Send to backend]
        ↓ POST /api/service-request
[Backend: Express receives request]
        ↓
[Antigravity Orchestrator Starts]
        ├─ Task 1: Intent Parser Agent
        │  └─ Parse: SERVICE=Electrician, LOCATION=G-11, TIME=Tomorrow
        │     Input: Text (Urdu)
        │     Processing: Offline NLP + regex patterns
        │     Output: { service_type, location, time_preference }
        │
        ├─ Task 2: Location Resolver Agent
        │  └─ Resolve: G-11 → Coordinates
        │     Input: "G-11 Islamabad"
        │     Processing: Cached location lookup (no API call)
        │     Output: { latitude, longitude }
        │
        ├─ Task 3: Provider Discoverer Agent
        │  └─ Find: All electricians within 5 km
        │     Input: service_type, coordinates, radius
        │     Processing: Filter mock provider dataset
        │     Output: [provider1, provider2, ...]
        │
        ├─ Task 4: Provider Ranker Agent
        │  └─ Score: Distance (0.3) + Rating (0.3) + Availability (0.2) + Response (0.2)
        │     Input: Provider list
        │     Processing: Multi-factor scoring algorithm
        │     Output: Ranked providers with scores
        │
        ├─ Task 5: Decision Maker Agent
        │  └─ Select: Top-ranked provider
        │     Input: Ranked providers, hard/soft constraints
        │     Processing: Constraint satisfaction
        │     Output: Selected provider + reasoning
        │
        ├─ Task 6: Booking Executor Agent
        │  └─ Create: Booking in Firestore
        │     Input: Provider, time slot, user_id
        │     Processing: Find available slot, write to DB
        │     Output: Booking ID, confirmation
        │
        └─ Task 7: Follow-Up Manager Agent
           └─ Schedule: Reminders
              Input: Booking details
              Processing: Calculate reminder times
              Output: Reminders scheduled
        ↓
[Antigravity returns: Execution trace + results]
        ↓
[Backend: Format response]
        ↓ { booking_id, provider, confirmation, trace }
[Mobile App: Display confirmation]
        ↓
[Firebase Messaging: Send push notification]
        ↓
[User: Sees booking confirmation + upcoming reminder]
```

---

## 4. PROVIDER MOCK DATASET

Instead of calling Maps API repeatedly, use hardcoded mock data:

```javascript
// providers.json (cached locally)
const MOCK_PROVIDERS = {
  "G-11": [
    {
      id: "E001",
      name: "Ali Electrician",
      service: "Electrician",
      distance_km: 1.2,
      rating: 4.8,
      reviews: 127,
      available_slots: ["09:00", "10:00", "14:00", "15:00"],
      phone: "03001234567",
      response_time_min: 20
    },
    {
      id: "E002",
      name: "Malik Electric Services",
      service: "Electrician",
      distance_km: 2.5,
      rating: 4.5,
      reviews: 89,
      available_slots: ["11:00", "16:00", "17:00"],
      phone: "03009876543",
      response_time_min: 35
    },
    // ... more providers
  ],
  "G-13": [
    {
      id: "AC001",
      name: "Cool Tech AC",
      service: "AC Technician",
      distance_km: 1.8,
      rating: 4.9,
      reviews: 203,
      available_slots: ["08:00", "09:00", "10:00"],
      phone: "03114455667",
      response_time_min: 25
    },
    // ... more
  ]
};

// In code: Load once at startup, cache in memory
const providers = MOCK_PROVIDERS[location];
```

**Cost Impact:** Reduces API calls from ~100/day to 0. Saves $80+ per month.

---

## 5. API QUOTAS & USAGE TRACKING

### Firebase Firestore

```
Expected Usage:
- 100 bookings/day = 100 writes (free tier: 20K/day) ✓
- 500 user queries = 500 reads (free tier: 50K/day) ✓
- 10 provider reads = 10 reads ✓

Total: ~610 reads, 100 writes per day
Percentage of free tier: 1.2% reads, 0.5% writes ✓ SAFE
```

### Google Maps API

```
Optimized Usage (with caching):
- Geocoding: 1 call per new location (cache afterwards)
- Distance: Not called (mock data includes distance)
- Nearby: Not called (use mock dataset)

Estimated: 30 API calls/month
Cost: $0 (within $200 free tier) ✓
```

### Firebase Cloud Messaging

```
Push Notifications: Unlimited free ✓
Expected: 1 reminder per booking = 100/day
Cost: $0
```

### Hugging Face Inference API

```
Option A: Offline NLP (recommended)
- Cost: $0
- Speed: Fast (local computation)

Option B: API calls
- Free tier: Rate-limited, sufficient for MVP
- Cost: $0 (free tier)
```

---

## 6. FALLBACK CHAINS (Error Handling)

### Intent Parsing Fails

```
Try 1: Offline NLP + regex pattern matching
  └─ Success? → Return intent
  └─ Fail → Try 2

Try 2: Keyword matching (hardcoded dictionary)
  └─ Success? → Return intent
  └─ Fail → Try 3

Try 3: Ask user for clarification
  └─ Show options: "What service do you need?"
  └─ User selects → Return intent
```

### Location Not Found

```
Try 1: Database lookup (hardcoded locations)
  └─ Success? → Return coordinates
  └─ Fail → Try 2

Try 2: Fuzzy matching (similar location names)
  └─ Success? → Return approximate coordinates
  └─ Fail → Try 3

Try 3: Google Maps Geocoding API (paid, but cached)
  └─ Success? → Return coordinates, cache
  └─ Fail → Try 4

Try 4: Ask user: "Which area? G-11 or G-12?"
  └─ User selects → Return coordinates
```

### No Providers Found

```
Try 1: Search within 5 km radius
  └─ Found > 0? → Return providers
  └─ Found 0 → Try 2

Try 2: Expand radius to 10 km
  └─ Found > 0? → Return providers
  └─ Found 0 → Try 3

Try 3: Show message: "No providers available, try different time"
  └─ User adjusts time → Retry search
```

### Booking Slot Unavailable

```
Try 1: Confirm requested slot
  └─ Available? → Book
  └─ Booked → Try 2

Try 2: Suggest next available slot (same day)
  └─ Available? → Show to user
  └─ User accepts → Book
  └─ User rejects → Try 3

Try 3: Suggest alternative provider
  └─ Available? → Show to user
  └─ User accepts → Book
```

### Firebase Write Fails

```
Try 1: Write to Firestore
  └─ Success? → Return booking_id
  └─ Fail → Try 2

Try 2: Retry with exponential backoff (100ms, 200ms, 400ms)
  └─ Success? → Return booking_id
  └─ Fail → Try 3

Try 3: Write to local cache (localStorage)
  └─ Sync to Firestore when online
  └─ Return provisional booking_id
```

---

## 7. HALLUCINATION & INFERENCE PROTECTION

### Problem: LLM might generate invalid service types

**Protection 1: Keyword Validation**
```javascript
const VALID_SERVICES = [
  "AC Technician",
  "Electrician",
  "Plumber",
  "Painter",
  "Carpenter",
  "Handyman"
];

function validateService(service) {
  if (VALID_SERVICES.includes(service)) {
    return true; // Valid
  }
  
  // Try fuzzy matching
  const match = findClosestMatch(service, VALID_SERVICES);
  if (match.confidence > 0.8) {
    return match.service; // Corrected
  }
  
  return null; // Invalid, ask user
}
```

### Protection 2: Confidence Scoring

```javascript
function parseIntent(text) {
  const intent = extractIntent(text);
  const confidence = calculateConfidence(intent, text);
  
  if (confidence < 0.6) {
    // Low confidence, ask user to confirm/clarify
    return { intent, confidence, requires_confirmation: true };
  }
  
  return { intent, confidence, requires_confirmation: false };
}

// In mobile app:
if (parsedIntent.requires_confirmation) {
  // Show: "Did you mean [service]? Yes / No / Edit"
  // Wait for user input
} else {
  // Proceed with booking
}
```

### Protection 3: Location Validation

```javascript
const VALID_AREAS = [
  "G-11", "G-12", "G-13", "G-14", // Islamabad
  "DHA", "Defence", "Clifton", // Karachi
  "Gulberg", "Defence", "Johar Town" // Lahore
];

function validateLocation(location) {
  if (VALID_AREAS.includes(location)) {
    return location; // Valid
  }
  
  // Fuzzy match
  const match = findClosestMatch(location, VALID_AREAS);
  if (match.confidence > 0.7) {
    return match.area; // Corrected
  }
  
  // Ask user
  return null;
}
```

### Protection 4: Provider Sanity Check

```javascript
function rankProviders(providers) {
  const ranked = providers
    .filter(p => p.rating >= 3.0) // Minimum quality
    .filter(p => p.available_slots.length > 0) // Must be available
    .filter(p => p.distance_km <= 15) // Maximum distance
    .sort((a, b) => b.score - a.score);
  
  if (ranked.length === 0) {
    return null; // No valid providers
  }
  
  return ranked;
}
```

---

## 8. SECURITY CONSIDERATIONS

### Data Protection

**Encrypted Fields:**
```javascript
// Use Firebase rules to encrypt sensitive data
Booking {
  booking_id: "BK_001",
  user_id: "encrypted",          // Hash user ID
  provider_phone: "encrypted",   // Encrypt phone
  user_phone: "encrypted",       // Encrypt phone
  booking_time: "plaintext",     // OK to expose
  status: "plaintext"
}
```

**Firebase Security Rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /bookings/{booking_id} {
      allow read: if request.auth.uid == resource.data.user_id;
      allow create: if request.auth.uid != null;
      allow update: if request.auth.uid == resource.data.user_id;
      allow delete: if request.auth.uid == resource.data.user_id;
    }
    
    match /providers/{provider_id} {
      allow read: if true; // Public data
      allow write: if false; // Admin only
    }
  }
}
```

### Input Validation

```javascript
// Express.js middleware
const { body, validationResult } = require("express-validator");

app.post("/api/service-request", [
  body("user_text")
    .trim()
    .isLength({ min: 5, max: 500 })
    .escape(), // Prevent XSS
  
  body("user_id")
    .isUUID(), // Validate UUID format
  
  body("location")
    .trim()
    .isLength({ min: 2, max: 50 })
    .matches(/^[a-zA-Z0-9\-\s]+$/) // Alphanumeric only
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  // Process request
});
```

### Rate Limiting

```javascript
const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests, please try again later"
});

app.use("/api/", limiter);
```

### API Key Management

```javascript
// .env file (NEVER commit this)
GOOGLE_MAPS_API_KEY=xxx
ANTIGRAVITY_API_KEY=xxx
FIREBASE_API_KEY=xxx

// In code
const apiKey = process.env.GOOGLE_MAPS_API_KEY;
```

---

## 9. OFFLINE CAPABILITIES

**Why Important:** Users in Pakistan might have spotty internet.

```javascript
// React Native: Cache provider data locally
import AsyncStorage from '@react-native-async-storage/async-storage';

async function cacheProviders() {
  const response = await fetch('/api/providers');
  const data = await response.json();
  
  await AsyncStorage.setItem('providers_cache', JSON.stringify(data));
  await AsyncStorage.setItem('providers_cache_time', Date.now().toString());
}

async function getProviders() {
  try {
    // Try network first
    const response = await fetch('/api/providers');
    return response.json();
  } catch (error) {
    // Fall back to cached data
    const cached = await AsyncStorage.getItem('providers_cache');
    const cacheTime = parseInt(
      await AsyncStorage.getItem('providers_cache_time')
    );
    
    const ageMinutes = (Date.now() - cacheTime) / 60000;
    if (cached && ageMinutes < 1440) { // Less than 24 hours old
      return JSON.parse(cached);
    }
    
    throw new Error("No data available");
  }
}
```

---

## 10. DEPLOYMENT CHECKLIST

```
BEFORE SUBMISSION:

Frontend (React Native)
☐ Test on iOS simulator
☐ Test on Android emulator
☐ Test with real device (if possible)
☐ All screens responsive
☐ No console errors/warnings
☐ No crashes on navigation
☐ Proper error messages for users

Backend (Node.js)
☐ Test all API endpoints
☐ Test error cases (no providers, invalid input)
☐ Test with Antigravity integration
☐ Proper logging for debugging
☐ Rate limiting configured
☐ Input validation on all endpoints

Database (Firestore)
☐ Test write/read operations
☐ Test security rules
☐ Verify free tier won't be exceeded
☐ Backup setup (Firebase auto-backup)

Documentation
☐ README with architecture
☐ Setup instructions
☐ How to run locally
☐ API documentation
☐ Antigravity workflow explanation

Demo Video
☐ Show home screen
☐ Input service request
☐ Show parsing result
☐ Show ranking reasoning
☐ Show booking confirmation
☐ Show notification
☐ Show agent trace logs
☐ Total: 3-5 minutes
☐ Spoken explanation (clear, good audio)
☐ Screen recording (high quality)

Code Quality
☐ No hardcoded secrets
☐ Environment variables configured
☐ Clean code, consistent naming
☐ Error handling on all endpoints
☐ No unnecessary console.logs
```

---

**Cost Summary:**
```
Frontend:        $0 (React Native, Expo free)
Backend:         $0 (Node.js, Firebase Cloud Functions free tier)
Database:        $0 (Firestore free tier)
Maps API:        $0 (Google $200/month credit)
Notifications:   $0 (FCM free)
SMS:             $0 (Twilio free trial, or skip)
Hosting:         $0 (Firebase + Vercel free tier)
NLP:             $0 (Offline NLP + Hugging Face free tier)
Total:           $0 per month ✓
```

---

**Next Steps:** See `03_BUILD_PLAN.md` for step-by-step build guide.
