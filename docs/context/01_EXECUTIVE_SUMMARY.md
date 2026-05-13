# Challenge 2: AI Service Orchestrator - Executive Summary

**Submission Deadline:** January 20, 2025  
**Time Available:** 8 days  
**Team Capacity:** 1-2 developers  
**Scope:** MVP (Minimum Viable Product)

---

## QUICK FACTS

| Factor | Status | Notes |
|---|---|---|
| **Cost** | ✓ 100% Free | Firebase free tier, Google Maps free tier, no paid services |
| **Complexity** | ✓ Achievable | 7-8 days with focused scope |
| **Winning Chance** | 🟢 High | Strong agentic workflow, Pakistan-focused, clear demo |
| **Reliability** | ✓ 95%+ | Proper fallbacks, error handling, validation |
| **Security** | ✓ Protected | Firebase auth, environment variables, input validation |

---

## WHAT YOU'RE BUILDING

A mobile app that:
1. Takes voice/text input in **Urdu, Roman Urdu, or English**
2. Understands the service request (AC technician, electrician, plumber, etc.)
3. Finds nearby providers using **mock data** (realistic simulation)
4. Ranks them by distance, rating, availability
5. Books a time slot (simulated)
6. Schedules reminders

**Core Workflow:** Intent → Location → Providers → Rank → Decide → Book → Reminders

---

## TECH STACK (ALL FREE)

```
Frontend:     React Native (Expo) / Flutter
Backend:      Node.js + Express
Database:     Firebase Firestore (free tier)
Maps:         Google Maps API (free $200/month credit)
NLP:          Hugging Face Inference API (free)
Notifications: Firebase Cloud Messaging (free)
Orchestration: Google Antigravity (free beta)
Hosting:      Firebase Hosting (free)
```

---

## BUILD TIMELINE (8 Days)

```
Day 1-2:  Setup + Basic Architecture (React Native project, Express backend, Firebase)
Day 3-4:  Core Agentic Workflow (Intent parser, provider discovery, ranking logic)
Day 5:    Booking & Notifications (Mock booking system, reminder scheduling)
Day 6-7:  Polish + Testing (UI refinement, error handling, demo video)
Day 8:    Final submission (Documentation, agent traces, deployment)
```

---

## REALISTIC SCOPE (What to Build, What to Skip)

### BUILD ✓
- Mobile app with clean UI
- Voice + text input (Urdu/English support)
- Intent parsing (extract service, location, time)
- Provider discovery (mock dataset of 50-100 providers)
- Provider ranking (distance + rating + availability)
- Booking confirmation (simulated database write)
- Push notifications + SMS reminders (Firebase)
- Agent trace logs (Antigravity workflow)
- Demo video (3-5 min) showing end-to-end flow

### SKIP ✗
- Multiplayer features
- Payment integration
- Real-time provider location tracking
- Advanced ML model training
- Complex NLP (use API, not custom model)
- Web admin dashboard (not required)

---

## FREE TIER CONSTRAINTS & SOLUTIONS

| Constraint | Limit | Solution |
|---|---|---|
| Firebase Firestore | 50K reads/day | Sufficient for hackathon; mock data cached |
| Google Maps API | $200/month free | Sufficient; ~10 API calls per booking |
| Hugging Face | Free tier | Limited calls; cache responses |
| Firebase Hosting | 10 GB/month | Sufficient for demo |
| FCM | Unlimited | Free for dev; unlimited messages |

**Workaround:** Use **mock provider dataset** (hardcoded JSON) instead of real API calls to minimize API usage.

---

## WINNING STRATEGY

### What Judges Care About (Weighted)

1. **Antigravity Usage (25%)** ✓ Core orchestration
2. **Agentic Workflow (20%)** ✓ Multi-step reasoning visible in logs
3. **Decision Quality (20%)** ✓ Smart ranking, clear reasoning
4. **Action Simulation (15%)** ✓ Realistic booking + notifications
5. **Implementation (10%)** ✓ Clean code, handles errors
6. **Innovation (10%)** ✓ Pakistan-focused, Urdu support

### How to Win

- **Clear Demo:** Show the complete flow in 3 minutes
- **Visible Reasoning:** Print agent trace logs in UI
- **Real Scenario:** Use actual Lahore/Karachi locations (G-13, DHA, Gulberg)
- **Smooth UX:** No crashes, fast response, professional UI
- **Documentation:** Clear README explaining Antigravity workflow

---

## DIFFICULTY RATING

**Overall:** 🟡 **Medium** (Achievable by 1-2 developers in 8 days)

**Breakdown:**
- Intent parsing: 🟢 Easy (use existing NLP API)
- Provider discovery: 🟢 Easy (mock data)
- Ranking algorithm: 🟡 Medium (multi-factor scoring)
- Antigravity integration: 🟡 Medium (learning curve, but well-documented)
- UI/UX: 🟡 Medium (clean, not complex)
- Error handling: 🟡 Medium (proper fallbacks)

---

## EXPECTED OUTCOME

**Submission Includes:**
1. ✓ Working mobile app (iOS/Android via Expo)
2. ✓ Demo video (3-5 min) showing full flow
3. ✓ Antigravity agent traces (JSON logs)
4. ✓ Clean README with architecture
5. ✓ GitHub repo with code
6. ✓ Brief technical writeup

**Demo Flow (3 minutes):**
```
0:00 - Open app, show home screen
0:15 - Input: "Electrician chahiye G-11 mein kal shaam"
0:30 - System parses intent, finds location
0:45 - Shows 5 ranked providers with reasoning
1:15 - Select provider, confirm booking
1:30 - Booking confirmed, reminders shown
2:00 - Show agent trace logs
2:30 - Show notification sent
3:00 - End
```

---

## RISK MITIGATION

| Risk | Impact | Mitigation |
|---|---|---|
| Antigravity API quota | High | Use free tier; cache responses |
| NLP parsing errors | Medium | Add fallback to manual selection |
| Provider mock data outdated | Low | Update before demo |
| Notification delivery fails | Low | Fallback to UI confirmation |
| Time running out | High | Focus on MVP; cut extras |

---

## SUCCESS CRITERIA

| Criterion | Status | Notes |
|---|---|---|
| ✓ App runs without crashes | Required | Test on iOS + Android |
| ✓ Intent parsing works 80%+ | Required | Handle common cases, fallback on edge cases |
| ✓ Booking flow completes | Required | Show confirmation + logs |
| ✓ Antigravity integrated | Required | Must show in code + traces |
| ✓ Demo is smooth | Required | Practice beforehand |
| ✓ Code is clean | Nice-to-have | Comments minimal, follows conventions |
| ✓ Handles errors gracefully | Nice-to-have | No crashes, user-friendly messages |

---

## FINAL RECOMMENDATION

**BUILD THE MVP. DO NOT OVER-ENGINEER.**

Focus on:
1. One clean, working flow (no complex features)
2. Clear Antigravity orchestration (visible in logs)
3. Smooth demo (practice 5+ times before submission)
4. Realistic Pakistan scenario (DHA, G-13, Lahore locations)
5. Professional documentation

**Estimated Effort:** 40-50 hours for 1 developer, 30-40 hours for 2 developers.

**Winning Mindset:** Judge quality, not quantity. A polished MVP beats a buggy full-featured app.

---

**Next Steps:** See `02_TECH_STACK.md` for detailed implementation guide.
