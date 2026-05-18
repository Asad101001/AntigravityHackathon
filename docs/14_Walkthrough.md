# 14 Walkthrough — Phase V Visual Overhaul & Interactive Alignment

This walkthrough describes the execution path, user flows, and logic transitions across the Phase V updates.

---

## 1. User Journey & Visual Flow

### Step 1 — Startup Screen and Authentication
1. On application boot, the global `<SplashGate>` mounts at the root of `App.js`.
2. It blocks standard screen renders, showing a premium brand icon centered in a flowing translucent blur frame with HSL sage green gradients.
3. After exactly `2500ms`, the overlay smoothly fades out, exposing the glassmorphism **AuthScreen** (Login) underneath.
4. The login interface renders floating translucent glass panels with input boxes. All backend login triggers remain unchanged.

### Step 2 — Sleek 3x3 Home Service Grid
1. When authenticated, the user lands on the **HomeScreen** dashboard.
2. Large cards are replaced with a sleek **3x3 translucent glass grid** for services:
   - AC Repair (اے سی سروس)
   - Electrician (بجلی والا)
   - Plumber (پلمبر)
   - Maid (ماسی / بائی)
   - Carpenter (بڑھئی)
   - Painter (رنگ ساز)
   - Handyman (کاریگر)
   - Car Mechanic (گاڑی مکینک)
   - Salon (ہیئر ڈریسر)
3. Each block displays title texts on the left and a category-colored circle with a clean `@expo/vector-icons` Ionicons icon (e.g. `flash`, `water`, `snowflake`) on the right.

### Step 3 — Scroll-Driven Auto-Hiding Tab & Header
1. While reading or viewing content static on any page for 3 seconds, both the top `AppHeader` and the bottom `LiquidTabBar` transition out of view (sliding and fading).
2. If the user initiates a scroll-up gesture, the scrolling listener immediately clears the timer and executes a smooth sliding animation to make both bars reappear instantly.

### Step 4 — Warp-Speed Agent Reasoning
1. Clicking a service or entering a request launches the **LoadingScreen** pipeline.
2. Emojis are completely gone; they are replaced with custom-colored outline vectors (`bulb-outline`, `location-outline`, etc.).
3. While the API call is fetching, the tick steps advance normally at `900ms` intervals.
4. As soon as the API response completes (in ~1.6s), the animation triggers **warp speed** (at `120ms` per step), swiftly filling the progress bar and resolving in under 2.5 seconds total.

### Step 5 — Floating Map Confirmation Panel
1. Matches are displayed on the **ProviderResultsScreen**.
2. The map is expanded to a large `280px` floating glass panel.
3. The map container is wrapped with a double-layered glowing glass boundary and green drop-shadow to create a premium floating effect.

---

## 2. Logic Tracing & Rectification Scenarios

### Scenario A — Bahria Town Typed Location Priority (GPS Fix)
1. **User input:** `electrician for bahria town`
2. **Context on HomeScreen:** Background location tracking returns current coordinates for Gulzar-e-Hijri.
3. **Old Behavior:** The location resolver parsed GPS coordinates first and resolved the booking to Gulzar-e-Hijri, overriding the user's typed Bahria Town.
4. **New Behavior:** `LocationResolverAgent` checks the extracted `rawLocation` first. Since it contains "Bahria Town" (a specific catalog match), it skips reverse-geocoding the GPS coordinates, correctly scheduling the provider to Bahria Town.

### Scenario B — Scheduling Date Parsing ("Weekend")
1. **User input:** `AC repair for the weekend`
2. **Context:** The Intent Parser resolves `time_preference: "weekend"`. No hour values like "4 PM" are present.
3. **Old Behavior:** `parseExplicitAppointment` returned `null` due to missing clock hours, making the executor default to today's date.
4. **New Behavior:** `BookingExecutorAgent` explicitly checks if `time_preference === "weekend"` or contains `'weekend'`. It sets the appointment date to the upcoming Saturday, picking the first slot in the provider's slot library automatically.
