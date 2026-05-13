**GOOGLE ANTIGRAVITY HACKATHON**

**CHALLENGE 2**

**AI Service Orchestrator**

*for the Informal Economy of Pakistan*

ANTIGRAVITY SYSTEM BRIEFING DOCUMENT

*Version 1.0 · Build Target: January 20, 2025*

+----------------+----------------+-----------------+-----------------+
| **DEADLINE**   | **DAYS LEFT**  | **COST**        | **WIN CHANCE**  |
|                |                |                 |                 |
| **Jan 20**     | **\~8 Days**   | **PKR 0**       | **High**        |
+----------------+----------------+-----------------+-----------------+

**1. Project Overview**

**What We\'re Building**

A mobile-first agentic AI application for Pakistan\'s informal service
economy. Users describe their service need in natural language --- Urdu,
Roman Urdu, or English --- and the system autonomously understands the
request, finds nearby providers from a curated dataset, selects the best
match using a multi-factor scoring model, simulates a confirmed booking,
and schedules follow-up reminders. The entire flow is orchestrated by
Google Antigravity as a structured multi-agent pipeline.

**The Problem (Pakistan Context)**

Pakistan\'s informal economy --- plumbers, electricians, AC technicians,
carpenters --- relies entirely on WhatsApp messages and word-of-mouth
referrals. There is no structured matching, no availability checking, no
booking confirmation, and no follow-up. Users waste hours finding a
reliable provider. Providers miss bookings. The system operates at
near-zero efficiency.

**Why This Challenge Is Winnable**

  ------------------ --------------------- -------------------------------
  **Criterion**      **Weight**            **Our Advantage**

  Antigravity Usage  25%                   Core orchestration --- every
                                           agent runs through Antigravity

  Agentic Workflow   20%                   7-agent sequential pipeline
                                           with traceable logs

  Decision Quality   20%                   Multi-factor scoring with
                                           visible reasoning per provider

  Action Simulation  15%                   Firestore booking, FCM
                                           notification, reminder
                                           scheduler

  Implementation     10%                   Clean Node.js + React Native,
                                           proper error handling

  Innovation + UX    10%                   Pakistan-specific (Urdu/Roman
                                           Urdu), realistic scenario
  ------------------ --------------------- -------------------------------

**2. Technology Stack (100% Free)**

  ---------------- ------------------- ----------------- ----------------
  **Layer**        **Technology**      **Purpose**       **Cost**

  Orchestration    Google Antigravity  Multi-agent       **\$0**
                                       workflow, traces  

  Mobile Frontend  React Native + Expo iOS + Android     **\$0**
                                       from one codebase 

  Backend API      Node.js + Express   REST endpoints,   **\$0**
                                       agent execution   

  Database         Firebase Firestore  Users, bookings,  **\$0**
                                       providers         

  Auth             Firebase Auth       User sessions,    **\$0**
                                       anonymous auth    

  NLP / Parsing    Offline regex +     Urdu/Roman        **\$0**
                   keyword map         Urdu/English      
                                       parsing           

  Geolocation      Hardcoded           Area name →       **\$0**
                   coordinate map      lat/lng (cached)  

  Google Maps API  Maps SDK (optional) Used only if area **\$0** (free
                                       not in cache      credit)

  Push             Firebase Cloud      Reminders,        **\$0**
  Notifications    Messaging           booking           
                                       confirmations     

  Hosting          Firebase Cloud      Serverless        **\$0**
  (Backend)        Functions           Node.js           

  Hosting (App)    Expo Go / expo.dev  Deploy APK + iOS  **\$0**
                                       TestFlight        
  ---------------- ------------------- ----------------- ----------------

**Free Tier Safety Check**

The system is designed to stay well within free tier limits. Provider
data is hardcoded (no live API calls per query). Firestore is only
written once per booking. Maps API is only called for unknown locations
not in the local coordinate cache.

  ------------------ ------------------ ------------------ ----------------
  **Service**        **Free Limit**     **Expected Usage** **Status**

  Firestore reads    50K/day            \~600/day          **✓ Safe**

  Firestore writes   20K/day            \~100/day          **✓ Safe**

  Maps Geocoding     \$200/mo credit    \~30 calls/mo      **✓ Safe**

  FCM (push)         Unlimited          \~200/day          **✓ Safe**

  Cloud Functions    125K calls/mo      \~3K/mo            **✓ Safe**
  ------------------ ------------------ ------------------ ----------------

**3. System Architecture**

**High-Level Component Map**

The architecture has three physical layers: a **React Native mobile
app** (user-facing), a **Node.js backend** (API + agent execution), and
**Firebase** (database + notifications). Google Antigravity sits inside
the backend layer as the orchestration engine that coordinates the 7
agents end-to-end.

**Antigravity Orchestration Layer --- 7-Agent Pipeline**

This is the core of the system. Antigravity manages the task plan,
sequences agent execution, passes context between agents, and emits a
full trace log at the end. Each agent is a distinct Node.js class with a
single async execute() method.

  -------- -------------------- ------------------------ ---------------------------
  **\#**   **Agent**            **Responsibility**       **Input → Output**

  1        IntentParser         Extract service type,    Raw text → { service_type,
                                location, time from raw  location, time, confidence
                                text                     }

  2        LocationResolver     Convert area name to     Location name → { lat, lng,
                                coordinates using cached area_name }
                                map                      

  3        ProviderDiscoverer   Filter mock provider     service + coords → \[
                                dataset by service +     provider objects \]
                                location                 

  4        ProviderRanker       Score each provider      Provider list → ranked list
                                across 4 factors, sort   with scores + breakdowns
                                descending               

  5        DecisionMaker        Apply hard constraints,  Ranked list → { selected,
                                select top provider,     reasoning, confidence,
                                explain why              alternatives }

  6        BookingExecutor      Write booking to         Provider + slot → {
                                Firestore, generate      booking_id,
                                confirmation ID          confirmation_msg }

  7        FollowUpManager      Schedule push reminders  Booking details →
                                and post-service         reminders_scheduled\[\],
                                feedback                 next_actions\[\]
  -------- -------------------- ------------------------ ---------------------------

**Shared Context Object (Antigravity Managed)**

Antigravity maintains a single context object across all 7 agents. Each
agent reads from it and appends its own output to it. No agent calls
another directly --- all communication goes through this context.

> user_text → original input from user
>
> service_type → parsed by Agent 1
>
> location → parsed by Agent 1
>
> time_preference → parsed by Agent 1
>
> confidence → parsed by Agent 1
>
> coordinates → resolved by Agent 2
>
> providers\[\] → discovered by Agent 3
>
> ranked_providers\[\] → scored by Agent 4
>
> selected_provider → decided by Agent 5
>
> reasoning → generated by Agent 5
>
> booking_id → created by Agent 6
>
> reminders\[\] → scheduled by Agent 7
>
> execution_logs\[\] → accumulated by all agents

**4. Complete Data Flow --- End to End**

**Example Request (Pakistani Context)**

**User types:** \"Electrician chahiye G-11 mein kal subah\"

*Translation: I need an electrician in G-11 tomorrow morning*

**Step 1 --- IntentParser**

> Input: \"Electrician chahiye G-11 mein kal subah\"
>
> Language: Roman Urdu detected
>
> Keyword match: \"electrician\" → service_type = \"Electrician\"
>
> Area match: \"G-11\" → location = \"G-11\"
>
> Time match: \"kal subah\" → time_preference = \"tomorrow_morning\"
>
> Confidence: 0.92 (all 3 entities found)
>
> Output: { service_type: \"Electrician\", location: \"G-11\",
>
> time_preference: \"tomorrow_morning\", confidence: 0.92 }

**Step 2 --- LocationResolver**

> Input: \"G-11\"
>
> Lookup: LOCAL_COORDS\[\"G-11\"\] → found
>
> Output: { lat: 33.7209, lng: 73.1795, area_name: \"G-11 Islamabad\" }
>
> Fallback: If not found → Google Maps Geocoding API (cached on first
> call)

**Step 3 --- ProviderDiscoverer**

> Input: service=\"Electrician\", location=\"G-11\"
>
> Filter: MOCK_PROVIDERS\[\"G-11\"\].filter(p =\> p.service ===
> \"Electrician\")
>
> Found: 4 providers within 5km
>
> Output: \[ {id: E001, name: \"Ali Electrician\", dist: 1.2km, rating:
> 4.8},
>
> {id: E002, name: \"Malik Electric\", dist: 2.5km, rating: 4.5},
>
> {id: E003, name: \"Farhan Wiring\", dist: 3.1km, rating: 4.3},
>
> {id: E004, name: \"Zahid Electric\", dist: 4.2km, rating: 4.6} \]

**Step 4 --- ProviderRanker (Scoring Algorithm)**

Formula: score = (distance × 0.30) + (rating × 0.30) + (availability ×
0.20) + (response_time × 0.20)

  -------------- -------------- ------------ ------------------ -------------- -------------
  **Provider**   **Distance**   **Rating**   **Availability**   **Response**   **SCORE**

  Ali            0.76           0.96         1.00               0.83           **0.896**
  Electrician                                                                  

  Zahid Electric 0.58           0.92         1.00               0.75           **0.823**

  Malik Electric 0.66           0.90         0.67               0.70           **0.751**

  Farhan Wiring  0.62           0.86         0.67               0.65           **0.706**
  -------------- -------------- ------------ ------------------ -------------- -------------

**Step 5 --- DecisionMaker**

> Selected: Ali Electrician (score: 0.896, rank: 1)
>
> Hard constraints check:
>
> ✓ service_available = true
>
> ✓ available_slots_in_window \> 0
>
> ✓ provider_status = \"verified\"
>
> ✓ distance_km \<= 5
>
> Reasoning: \"Ali Electrician is recommended --- closest (1.2km),
>
> highest rated (4.8/5, 127 reviews), 4 slots tomorrow morning.\"
>
> Confidence: 0.95
>
> Alternatives shown: \[Zahid Electric #2, Malik Electric #3\]

**Step 6 --- BookingExecutor**

> Available slots (tomorrow morning): \[\"09:00\", \"10:00\",
> \"14:00\"\]
>
> Selected slot: \"09:00\" (first in window)
>
> Firestore write:
>
> Collection: bookings
>
> Document: BK_1705987200000
>
> Fields: { booking_id, user_id, provider_id, service_type,
>
> location, scheduled_time, status: \"confirmed\" }
>
> Confirmation: \"Booking confirmed! Ali Electrician arrives tomorrow at
> 09:00.\"
>
> \"Contact: 0300-1234567. Booking ID: BK_1705987200000\"

**Step 7 --- FollowUpManager**

> Reminder 1 (1hr before): Push notification --- \"Electrician in 1
> hour\"
>
> Reminder 2 (30min before): SMS --- \"Ali Electrician arriving soon,
> contact: 0300-1234567\"
>
> Feedback (next day): Push --- \"Rate your service experience\"
>
> All 3 reminders written to Firestore scheduled_notifications
> collection

**5. Pakistan-Specific Design Decisions**

**Language Support --- Urdu, Roman Urdu, English**

Pakistan\'s informal economy communicates primarily in Roman Urdu (Urdu
written in Latin script, no standard spelling). The parsing engine
handles all three input styles with a keyword dictionary covering common
variants.

  ---------------------- ---------------------- -------------------------
  **Roman Urdu**         **Meaning**            **Parsed Output**

  Electrician chahiye    I need an electrician  service = Electrician

  kal subah              tomorrow morning       time = tomorrow_morning

  aaj shaam              this evening           time = today_evening

  abhi chahiye           need right now         urgency = high, time =
                                                today_now

  DHA mein               in DHA (Defence        location = DHA
                         Housing)               

  G-11 sector            G-11 area, Islamabad   location = G-11

  Gulberg                Gulberg, Lahore        location = Gulberg_Lahore
  ---------------------- ---------------------- -------------------------

**Supported Pakistani Cities & Areas**

The coordinate cache covers major urban areas across Karachi, Lahore,
and Islamabad --- the three largest cities in Pakistan and the most
likely demo environments.

  ---------------- --------------------------- ---------------------------
  **City**         **Areas Supported**         **Provider Categories
                                               Available**

  Islamabad        G-6 through G-15, F-6       AC, Electrician, Plumber,
                   through F-11, I-8, I-9      Carpenter, Painter

  Lahore           DHA, Defence, Gulberg,      AC, Electrician, Plumber,
                   Johar Town, Model Town      Carpenter, Painter

  Karachi          Clifton, Defence, Saddar,   AC, Electrician, Plumber,
                   PECHS, Gulshan              Painter, Handyman
  ---------------- --------------------------- ---------------------------

**Mock Provider Dataset**

All provider data is **hardcoded in a JSON file**. This eliminates API
costs, removes network dependencies during demo, and allows full control
of the demo scenario. 60 mock providers are pre-seeded across all
cities.

  ------------------- ------------------ ----------------------------------
  **Field**           **Type**           **Example**

  id                  string             \"E001\"

  name                string             \"Ali Electrician Services\"

  service             string             \"Electrician\"

  city                string             \"Islamabad\"

  area                string             \"G-11\"

  distance_km         float              1.2

  rating              float              4.8 (out of 5.0)

  reviews_count       integer            127

  available_slots     string\[\]         \[\"09:00\", \"10:00\", \"14:00\",
                                         \"15:00\"\]

  phone               string             \"0300-1234567\"

  response_time_min   integer            20 (average response time in
                                         minutes)

  verified            boolean            true
  ------------------- ------------------ ----------------------------------

**6. Error Handling, Fallbacks & Protections**

**Fallback Chain Strategy**

Every potential failure point has a two-level fallback. The system never
crashes --- it degrades gracefully and either recovers autonomously or
prompts the user for clarification. No uncaught exceptions reach the
user.

  --------------- ----------------- ------------------- ------------------
  **Failure       **Primary         **Fallback 1**      **Fallback 2**
  Point**         Attempt**                             

  Service not     Keyword           Fuzzy string match  Show picker:
  found           dictionary match  (Levenshtein)       \'What service?\'

  Location not    Local coordinate  Google Maps         Ask: \'Which
  found           cache             Geocoding API       city/area?\'

  No providers    Search within 5km Expand to 10km      Suggest different
  found                                                 time/area

  Slot            Confirm requested Offer next          Offer 2nd-ranked
  unavailable     slot              available slot      provider

  Firestore write Retry 3× with     Save to             Sync on reconnect
  fails           backoff           AsyncStorage        

  Push            FCM send          Show in-app         Log for manual
  notification                      reminder            follow-up
  fails                                                 

  Confidence \<   Show parsed       Ask user to confirm Offer manual
  0.6             intent                                selection
  --------------- ----------------- ------------------- ------------------

**Hallucination & Wrong Inference Protection**

Since parsing relies on keyword matching rather than an LLM, the system
does not hallucinate. All outputs are validated against whitelist
dictionaries before passing to the next agent.

**Validation Layer (Applied After Each Agent)**

> AGENT 1 → service_type must be in VALID_SERVICES\[\]
>
> location must match regex /\^\[A-Za-z0-9\\-\\s\]+\$/
>
> time must be in VALID_TIME_SLOTS\[\]
>
> confidence \< 0.6 → route to clarification screen
>
> AGENT 2 → coordinates must be in Pakistan bounding box
>
> lat: 23.0--37.5 lng: 60.0--77.5
>
> any value outside → reject + fallback
>
> AGENT 4 → all scores must be 0.0--1.0
>
> total_score must equal weighted sum ±0.001
>
> any NaN → exclude provider from ranking
>
> AGENT 5 → selected provider must have verified=true
>
> must have at least 1 available slot
>
> confidence must be \> 0.5 to proceed

**Input Sanitization (Security)**

> // All user text sanitized before processing
>
> text = text.trim().slice(0, 500) // Length limit
>
> text = text.replace(/\<\[\^\>\]\*\>/g, \"\") // Strip HTML tags
>
> text = text.replace(/\[\\x00-\\x1F\]/g, \"\") // Strip control chars
>
> // Express.js rate limiting
>
> rateLimit: 100 requests per 15 minutes per IP
>
> // Firestore security rules
>
> bookings: read/write only if request.auth.uid == resource.data.user_id
>
> providers: read only (public), write never (admin SDK only)

**7. 8-Day Build Plan**

**Timeline Overview**

  --------- ------------- ---------------------------------- --------------
  **Day**   **Date**      **Milestone**                      **Risk**

  1         Jan 12        Expo project init · Firebase setup **Low**
                          · GitHub repo · Backend skeleton   

  2         Jan 13        Home screen UI · Text input · POST **Low**
                          /api/service-request wired         

  3         Jan 14        Intent Parser · Location Resolver  **Medium**
                          · Provider Discoverer agents       

  4         Jan 15        Provider Ranker · Decision Maker · **Medium**
                          Antigravity orchestrator wired     

  5         Jan 16        Booking Executor (Firestore) ·     **Medium**
                          FollowUp Manager · FCM             
                          notifications                      

  6         Jan 17        Full flow tested · UI polish ·     **Low**
                          Confirmation + agent trace screens 

  7         Jan 18        Error handling complete · Edge     **Low**
                          case testing · Demo video recorded 

  8         Jan 19-20     README finalized · Final           **Low**
                          submission packaged · Buffer for   
                          fixes                              
  --------- ------------- ---------------------------------- --------------

**Scope: What to Build vs. Skip**

  --- ------------------------------- --- ------------------------------------
      **BUILD (Required for Demo)**       **SKIP (Out of Scope)**

  ✓   React Native home +             ✗   Payment gateway integration
      confirmation + results screens      

  ✓   Text input with Urdu/Roman      ✗   Real-time provider GPS tracking
      Urdu/English parsing                

  ✓   7-agent Antigravity             ✗   Custom LLM training or fine-tuning
      orchestration pipeline              

  ✓   Multi-factor provider ranking   ✗   Web admin dashboard
      with visible scores                 

  ✓   Booking confirmed and written   ✗   Provider-side app (separate app)
      to Firestore                        

  ✓   Push notification reminders     ✗   Multi-city real-time Maps API
      scheduled                           integration

  ✓   Agent trace log screen visible  ✗   Rating/review system (post-booking)
      in app                              

  ✓   Confidence-based clarification  ✗   Voice input (optional, add only if
      prompts                             time allows)
  --- ------------------------------- --- ------------------------------------

**Difficulty Assessment**

  --------------------- ------------------------ -------------------------
  **Component**         **Difficulty**           **Reason**

  Expo project setup    **Easy --- 2 hours**     Standard Expo init, no
                                                 custom native code

  Offline NLP / parsing **Easy --- 3 hours**     Keyword map + regex, no
                                                 API training needed

  Provider ranking      **Medium --- 4 hours**   Multi-factor math is
  algorithm                                      straightforward, needs
                                                 testing

  Antigravity           **Medium --- 6 hours**   SDK learning curve,
  integration                                    documentation needed

  Firestore booking     **Easy --- 3 hours**     Simple document write +
  system                                         read

  FCM push              **Medium --- 4 hours**   Device token management,
  notifications                                  Expo permissions

  UI polish + screens   **Medium --- 6 hours**   Multiple screens,
                                                 navigation, error states

  Error handling +      **Easy --- 4 hours**     Try/catch patterns are
  fallbacks                                      consistent

  Demo video + README   **Easy --- 4 hours**     Screen record + scripted
                                                 walkthrough

  TOTAL                 **\~36 hours (solo)** or Achievable within 8 days
                        **\~24 hours             
                        (2-person)**             
  --------------------- ------------------------ -------------------------

**8. Google Antigravity Integration Specification**

**How Antigravity Must Be Used**

Antigravity must be the central orchestrator --- not a wrapper around
one API call. It must manage the full task plan, dispatch each agent in
sequence, maintain the shared context object, and emit execution traces.
This is what 25% of the judging criteria evaluates.

**Antigravity Workflow Definition**

> const workflow = {
>
> name: \"service_booking_workflow\",
>
> description: \"End-to-end service request to booking\",
>
> task_plan: \[
>
> { id: 1, name: \"parse_intent\", agent: IntentParserAgent },
>
> { id: 2, name: \"resolve_location\", agent: LocationResolverAgent },
>
> { id: 3, name: \"discover_providers\", agent: ProviderDiscovererAgent
> },
>
> { id: 4, name: \"rank_providers\", agent: ProviderRankerAgent },
>
> { id: 5, name: \"make_decision\", agent: DecisionMakerAgent },
>
> { id: 6, name: \"execute_booking\", agent: BookingExecutorAgent },
>
> { id: 7, name: \"schedule_followup\", agent: FollowUpManagerAgent },
>
> \],
>
> context_schema: {
>
> input: \[\"user_text\", \"user_id\"\],
>
> output: \[\"booking_id\", \"provider\", \"reasoning\",
> \"execution_logs\"\]
>
> }
>
> };

**Antigravity Execution Call**

> const antigravity = new GoogleAntigravity({ apiKey:
> process.env.ANTIGRAVITY_KEY });
>
> const result = await antigravity.run({
>
> workflow,
>
> input: { user_text, user_id },
>
> options: {
>
> emit_trace: true, // Required for demo
>
> timeout_ms: 10000, // 10 second max
>
> retry_on_failure: true, // Auto-retry failed agents
>
> fallback_mode: \"graceful\" // Continue with partial results
>
> }
>
> });
>
> const { booking_id, provider, reasoning, execution_logs } =
> result.output;

**Expected Agent Trace Output (for Demo)**

> {
>
> \"workflow_id\": \"WF_1705987200000\",
>
> \"status\": \"completed\",
>
> \"duration_ms\": 1240,
>
> \"tasks\": \[
>
> { \"id\": 1, \"name\": \"parse_intent\",
>
> \"status\": \"success\", \"duration_ms\": 180,
>
> \"input\": \"Electrician chahiye G-11 mein kal\",
>
> \"output\": { \"service_type\": \"Electrician\", \"location\":
> \"G-11\",
>
> \"time_preference\": \"tomorrow_morning\", \"confidence\": 0.92 },
>
> \"reasoning\": \"Matched keyword: electrician. Area: G-11. Time:
> kal=tomorrow, subah=morning.\" },
>
> { \"id\": 2, \"name\": \"resolve_location\", \"status\": \"success\",
> \... },
>
> { \"id\": 3, \"name\": \"discover_providers\", \"status\":
> \"success\", \... },
>
> { \"id\": 4, \"name\": \"rank_providers\", \"status\": \"success\",
> \... },
>
> { \"id\": 5, \"name\": \"make_decision\", \"status\": \"success\",
> \... },
>
> { \"id\": 6, \"name\": \"execute_booking\", \"status\": \"success\",
> \... },
>
> { \"id\": 7, \"name\": \"schedule_followup\", \"status\": \"success\",
> \... }
>
> \]
>
> }

**Tools Used by Each Agent**

  -------------------- ------------------------- ----------------------------
  **Agent**            **Tool / Resource**       **Notes**

  IntentParser         Local keyword map (JSON)  No API call. Instant, no
                                                 rate limit.

  LocationResolver     Local coordinate cache    Google Maps only if cache
                                                 miss (rare)

  ProviderDiscoverer   MOCK_PROVIDERS JSON       No API call. Pre-seeded 60
                       (in-memory)               providers.

  ProviderRanker       Pure calculation (no      Math only. Deterministic, no
                       external tool)            errors.

  DecisionMaker        Pure logic + constraint   Selects from ranked list
                       check                     only.

  BookingExecutor      Firebase Admin SDK        One write per booking. Retry
                       (Firestore)               on fail.

  FollowUpManager      Firebase Admin SDK (FCM + Schedules 3 notifications
                       Firestore)                per booking.
  -------------------- ------------------------- ----------------------------

**9. API Contracts**

**POST /api/service-request**

**Request body:** { \"user_text\": string, \"user_id\": string }

**Response (success):**

> {
>
> \"success\": true,
>
> \"booking_id\": \"BK_1705987200000\",
>
> \"provider\": {
>
> \"name\": \"Ali Electrician\",
>
> \"phone\": \"0300-1234567\",
>
> \"distance_km\": 1.2,
>
> \"rating\": 4.8,
>
> \"confirmed_slot\": \"09:00\"
>
> },
>
> \"reasoning\": \"Ali Electrician is recommended --- closest\...\",
>
> \"alternatives\": \[ { \"name\": \"Zahid Electric\", \"score\": 0.823
> }, \... \],
>
> \"execution_logs\": \[ { agent, status, duration_ms, output }, \... \]
>
> }

**Response (clarification needed):**

> {
>
> \"success\": false,
>
> \"error_type\": \"low_confidence\",
>
> \"parsed\": { \"service_type\": null, \"location\": \"G-11\",
> \"time\": \"tomorrow\" },
>
> \"prompt\": \"What service do you need?\",
>
> \"suggestions\": \[\"Electrician\", \"Plumber\", \"AC Technician\",
> \"Carpenter\"\]
>
> }

**POST /api/booking/confirm**

**Request:** { \"booking_id\": string, \"user_confirmed\": true }

**Response:** { \"success\": true, \"status\": \"confirmed\",
\"reminders_scheduled\": 3 }

**GET /api/booking/:booking_id**

**Response:**

> {
>
> \"booking_id\": \"BK_1705987200000\",
>
> \"provider_name\": \"Ali Electrician\",
>
> \"provider_phone\": \"0300-1234567\",
>
> \"service_type\": \"Electrician\",
>
> \"location\": \"G-11, Islamabad\",
>
> \"scheduled_time\": \"2025-01-13T09:00:00Z\",
>
> \"status\": \"confirmed\",
>
> \"reminders\": \[ { \"time\": \"08:00\", \"type\": \"push\" }, \... \]
>
> }

**POST /api/booking/:booking_id/feedback**

**Request:** { \"rating\": 1-5, \"comment\": string (optional) }

**Response:** { \"success\": true, \"feedback_id\": \"FB_xxx\" }

**10. Mobile App Screen Flow**

**7-Screen Navigation Map**

  -------- ------------------ ----------------------------------------------
  **\#**   **Screen**         **Content & Actions**

  1        Home               Large text input + optional service
                              quick-buttons (AC / Electric / Plumber /
                              Carpenter). Send button triggers workflow.

  2        Intent Confirm     Shows parsed intent: Service · Location · Time
                              · Confidence %. If confidence \< 0.7, shows
                              warning + Edit option. Confirm proceeds to
                              search.

  3        Loading            Animated steps: Searching → Ranking → Deciding
                              → Done. Real progress, not fake spinner.

  4        Provider Results   Top 3 providers shown with scores, distance,
                              rating, availability. #1 has \'Recommended\'
                              badge. Tap to select.

  5        Booking Confirm    Selected provider details, time slot,
                              estimated cost. Large Confirm button. Cancel
                              returns to results.

  6        Confirmation       Success screen: booking ID, provider contact,
                              arrival time. Shows reminders scheduled. View
                              Agent Trace button.

  7        Agent Trace Logs   Scrollable list of all 7 agents with timing,
                              input, output, and reasoning text per step.
                              Export as JSON.
  -------- ------------------ ----------------------------------------------

**Demo Video Script (3 Minutes)**

  --------------- -------------------------------------------------------------
  **Timestamp**   **Action & Script**

  0:00--0:15      Open app. Show clean home screen. Say: \'This is an AI
                  service orchestrator for Pakistan. I need an electrician in
                  G-11.\'

  0:15--0:30      Type: \'Electrician chahiye G-11 mein kal subah\'. Tap Send.
                  Show intent confirm screen: Service ✓, Location ✓, Time ✓,
                  Confidence 92%.

  0:30--1:00      Tap Confirm. Show loading steps animating. Explain:
                  \'Antigravity is running 7 agents in sequence right now.\'

  1:00--1:30      Results screen. Show 3 ranked providers with scores. Say:
                  \'Ali Electrician is recommended --- closest, highest rated,
                  available in the morning.\'

  1:30--2:00      Tap Ali Electrician. Show booking confirm screen. Tap
                  Confirm. Show success screen with booking ID and reminder
                  confirmation.

  2:00--2:45      Tap \'View Agent Trace\'. Scroll through logs showing each
                  agent, its reasoning, timing, and output. Highlight Decision
                  Maker reasoning text.

  2:45--3:00      Close app. Say: \'Full flow: intent → ranking → booking →
                  reminder, in under 2 seconds, fully autonomous, zero cost.\'
  --------------- -------------------------------------------------------------

**11. Firebase / Firestore Schema**

**Collections**

**bookings**

> bookings/{booking_id}
>
> booking_id: string // \"BK_1705987200000\"
>
> user_id: string // Firebase Auth UID
>
> provider_id: string // \"E001\"
>
> provider_name: string // \"Ali Electrician\"
>
> provider_phone: string // \"0300-1234567\"
>
> service_type: string // \"Electrician\"
>
> location: string // \"G-11, Islamabad\"
>
> scheduled_time: string // \"2025-01-13T09:00:00Z\"
>
> time_slot: string // \"09:00\"
>
> status: string // \"confirmed\" \| \"cancelled\" \| \"completed\"
>
> created_at: timestamp
>
> reasoning: string // Agent 5 decision text
>
> agent_trace: object // Full execution log

**providers (read-only, seeded at init)**

> providers/{provider_id}
>
> id: string // \"E001\"
>
> name: string // \"Ali Electrician\"
>
> service: string // \"Electrician\"
>
> city: string // \"Islamabad\"
>
> area: string // \"G-11\"
>
> distance_km: number // 1.2
>
> rating: number // 4.8
>
> reviews_count: number // 127
>
> available_slots: string\[\] // \[\"09:00\", \"10:00\", \"14:00\"\]
>
> phone: string
>
> response_time_min: number
>
> verified: boolean

**notifications**

> notifications/{notification_id}
>
> booking_id: string
>
> user_id: string
>
> type: string // \"push\" \| \"sms\"
>
> message: string
>
> scheduled_time: timestamp
>
> status: string // \"scheduled\" \| \"sent\" \| \"failed\"

**Firestore Security Rules**

> rules_version = \"2\";
>
> service cloud.firestore {
>
> match /databases/{db}/documents {
>
> match /bookings/{id} {
>
> allow read: if request.auth.uid == resource.data.user_id;
>
> allow create: if request.auth.uid != null;
>
> allow update: if request.auth.uid == resource.data.user_id;
>
> allow delete: if false;
>
> }
>
> match /providers/{id} {
>
> allow read: if true;
>
> allow write: if false;
>
> }
>
> match /notifications/{id} {
>
> allow read: if request.auth.uid == resource.data.user_id;
>
> allow write: if false;
>
> }
>
> }
>
> }

**12. Submission Checklist & Winning Strategy**

**Mandatory Deliverables**

  --- ------------------------------- -----------------------------------
      **Deliverable**                 **Notes**

  ☐   Working Mobile App (APK / Expo  Test on Android + iOS simulator
      QR)                             before submitting

  ☐   Demo Video (3--5 minutes)       Follow script in Section 10.
                                      Practice 5+ times. Good audio.

  ☐   Antigravity Agent Trace Logs    Export from app + include as
      (JSON)                          agent_traces.json in repo

  ☐   README Documentation            Architecture overview, Antigravity
                                      usage, how to run, assumptions

  ☐   GitHub Repository (clean)       No hardcoded secrets, proper
                                      .gitignore, all files present
  --- ------------------------------- -----------------------------------

**What Judges Want to See**

-   Antigravity is the orchestrator, not just an API wrapper. Every
    agent flows through it.

-   Reasoning is visible. The \'why\' behind the provider selection is
    shown to the user.

-   The demo is smooth. No crashes, fast response, clean UI. Practice
    the walkthrough.

-   Pakistan context is real. Use G-11, DHA, Gulberg, Urdu input --- not
    generic examples.

-   Action simulation is complete. Booking exists in Firestore.
    Notification is scheduled.

-   Edge cases are handled. Low confidence shows clarification. No
    providers shows fallback message.

**Final Winning Tips**

1.  Start with Day 1 setup immediately --- don\'t lose time on planning

2.  Use the mock provider dataset from day one --- no Maps API calls
    needed

3.  Get a working end-to-end flow by Day 4, even if ugly --- polish
    comes Day 6

4.  Record demo video on Day 7 with a real Pakistani scenario (G-11
    electrician)

5.  Make agent trace logs visible in the app --- judges love seeing the
    reasoning

6.  Submit Day 8 morning, keep Day 8 afternoon for last-minute fixes

**END OF BRIEFING DOCUMENT**

*Google Antigravity Hackathon --- Challenge 2 --- January 2025*
