# Project PRD: Asaaniyat "Liquid Glass"

## 1. Project Overview
Asaaniyat is a premium, AI-driven on-demand home services platform focused on the Pakistani market (Karachi, Islamabad, Lahore). The application leverages natural language processing to simplify the service discovery and booking journey, replacing complex menus with an "Intelligent Search" interface.

### 1.1 Brand Identity
- **Name:** Asaaniyat
- **Design Philosophy:** "Liquid Glass" – a high-fidelity aesthetic characterized by deep glassmorphism, backdrop blurs, emerald green accents, and generous whitespace.
- **Tone:** Professional, intelligent, effortless, and premium.

## 2. Core User Flow
1. **Intelligent Search (Home):** User describes their need in natural language (English, Urdu, or Roman Urdu).
2. **Intent Parsing (Loading):** AI agent extracts service type, location, and urgency.
3. **Provider Selection:** User reviews AI-recommended service providers via a map-integrated interface.
4. **Structured Chat:** User interacts with an AI agent via pre-written message blocks to finalize details.
5. **Review & Confirm:** A transparent breakdown of the service, provider, and dynamic pricing.
6. **Booking Confirmation:** Final success state with tracking and technician details.

## 3. Screen Specifications

### 3.1 Home - Intelligent Search ({{DATA:SCREEN:SCREEN_22}})
- **Header:** Centered brand name "Asaaniyat". Profile icon on the right acts as a sidebar trigger.
- **Location:** Fetched location with a city dropdown (Karachi, Islamabad, Lahore) placed immediately adjacent.
- **Primary Action:** Centered natural language input field ("Describe your service need...").
- **Services Carousel:** 2-3 rotating spins with pagination dots. Scaled-up icons for "AC Repair", "Electrician", etc.
- **Navigation:** Glass-morphic Bottom Navbar (Home, Bookings, Chat).

### 3.2 Loading & Intent Parsing ({{DATA:SCREEN:SCREEN_30}})
- **Status:** "Understanding your request..."
- **Visuals:** Central pulsing AI brain/head icon with glassmorphic rings.
- **Progress:** A minimal 4-step checklist (Parsing Intent, Resolving Location, Discovering Providers, Ranking & Reasoning).

### 3.3 Available Providers ({{DATA:SCREEN:SCREEN_31}})
- **Map Section:** Glass-encapsulated map preview showing the service location.
- **Provider Cards:** "Recommended Match" highlighted. Displays name, distance, rating, and estimated price (PKR).
- **CTA:** Primary "Select" button in signature emerald green.

### 3.4 Structured AI Chat ({{DATA:SCREEN:SCREEN_5}})
- **Interaction:** Pre-written message blocks for the user (No free-text input to keep the flow directed).
- **Content:** AI clarifies appointment times and specific service requirements.

### 3.5 Review Booking ({{DATA:SCREEN:SCREEN_21}})
- **Summary:** Card-based summary of service type, provider, time, and location.
- **AI Reasoning:** Small block explaining why this specific provider was recommended.
- **Checkout:** Large primary "Continue to Checkout" button.

### 3.6 Booking Confirmed ({{DATA:SCREEN:SCREEN_34}})
- **Success Indicator:** Large animated checkmark.
- **Details:** Technician name, Booking ID (BK_XXXX), and scheduled time.
- **Follow-up:** "Go to Chat" and "View Schedule" actions.

## 4. Technical Constraints & Design Tokens
- **Design System:** Luminous Precision ({{DATA:DESIGN_SYSTEM:DESIGN_SYSTEM_1}})
- **Primary Color:** Emerald Green (#059669)
- **Typography:** Plus Jakarta Sans (Large scale for premium feel)
- **Visual Effects:** `backdrop-blur-xl`, `bg-white/60`, `ring-1 ring-white/20`.
- **Target Device:** Mobile (iOS/Android responsive web).

## 5. Future Considerations
- Full Urdu language localization.
- Provider-side application flow.
- Real-time technician tracking on the map.
