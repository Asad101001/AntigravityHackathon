# 13 Walkthrough — Reverse-Geocoding, Notifications, and AI Reasoning

## Demo Scenario
A user in Karachi opens Asaaniyat from Scheme 33 and types a city-level request such as:

> `Mujhe electrician chahiye Karachi mein abhi`

The frontend sends both the text and exact GPS coordinates:

```json
{
  "user_text": "Mujhe electrician chahiye Karachi mein abhi",
  "city": "Karachi",
  "user_location": { "lat": 24.9538, "lng": 67.1629 },
  "location_source": "current_location"
}
```

## Step 1 — LLM Intent Parser
1. The LLM extracts service type, urgency, price sensitivity, language, and any typed location.
2. Parsed location text is checked against `coordinates.json` as a fast local cache.
3. City-only matches are preserved as city context, not as final neighborhood truth.
4. If an area is not in the local cache and `MAPS_API_KEY` exists, Google Maps Geocoding normalizes the area text.

## Step 2 — Location Resolver
1. The resolver sees exact GPS and processes it before city-level fallback.
2. It validates the point is inside Pakistan.
3. It compares the GPS point with cached neighborhood coordinates using distance math.
4. For the Scheme 33 example, the local cache resolves the point to `Scheme 33 Karachi`.
5. Exact lat/lng remain in `coordinates`, while `resolved_area` becomes the neighborhood label used downstream.
6. If no cached area is nearby, the resolver calls Google reverse geocoding and stores the returned area.

## Step 3 — Provider Discovery and Multi-Factor AI Reasoning
The provider pipeline receives a more precise location context and ranks providers using the existing multi-factor reasoning stack:

- distance from exact user coordinates,
- provider rating and review confidence,
- availability and response time,
- urgency and price sensitivity,
- cancellation or reliability signals,
- LLM-generated explanation for the final recommendation.

This means a provider near Scheme 33 is favored over a broadly central Karachi provider even when the user text only says `Karachi`.

## Step 4 — Booking Confirmation Notification
1. The mobile app requests notification permission during startup.
2. When the confirmation screen creates a session booking, it sets that booking as the global `activeJob`.
3. The app context watches for `activeJob.status === "confirmed"`.
4. The context triggers a local notification:

```text
Booking Confirmed - Provider En Route
<Provider> is assigned for <Service> in <Area>.
```

## Step 5 — Safe-Area Behavior
The target Liquid Glass screens use `useSafeAreaInsets` so headers, cards, and bottom controls respect device cutouts and gesture bars without relying on deprecated `SafeAreaView` imports from `react-native`.

## Judge-Facing Outcome
- The system demonstrates exact GPS awareness instead of city-only search.
- The resolver is fast when local cache data exists and resilient when Google fallback is required.
- Notifications provide a native mobile proof point after successful AI booking.
- The AI reasoning chain remains explainable from parse → location → provider ranking → booking.
