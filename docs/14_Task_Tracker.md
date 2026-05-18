# 14 Task Tracker — Phase V Visual Overhaul & Interactive Alignment

| ID | Task | Status | Evidence / Verification Metric |
| :--- | :--- | :--- | :--- |
| **14.1** | Implement root `<SplashGate>` timer wrapper | Pending | Displays logo splash with translucent overlay for exactly 2.5s on cold open. |
| **14.2** | Resolve layout overlaps and standardise header padding | Pending | Insets top padding applies cleanly; zero visual coincide on Chat, Bookings & Confirmation. |
| **14.3** | Implement scroll-driven auto-hiding for header & tabbar | Pending | Navbar/Header fade-out after 3s of inactivity; slide back in immediately upon scroll-up. |
| **14.4** | Enlarge Map Panel layout to 280px on results screen | Pending | Map takes 280px container height, surrounded by translucent borders & green drop-shadow. |
| **14.5** | Swap step emojis for Expo Ionicons vector elements | Pending | Emojis replaced across AgentTraceScreen and LoadingScreen with outline vector graphics. |
| **14.6** | Implement "Warp-Speed" ticking acceleration (120ms) | Pending | standard 900ms speed triggers 120ms ticker ticks the instant `/service-request` completes. |
| **14.7** | Deploy 3x3 Home Service Grid with Urdu subtitles | Pending | Grid renders 9 squares with left titles, middle Urdu script, and right-aligned category icons. |
| **14.8** | Streamline standard TabBar to 3 clean tabs | Pending | Home, Status, and Bookings tab layouts look sleek, clean, and modern. |
| **14.9** | Correct GPS coordinates overriding typed locations | Pending | `LocationResolverAgent` prioritizes `rawLocation` text matches before reversing GPS coordinates. |
| **14.10** | Align scheduled date calculator with time preferences | Pending | Shifting to Saturday for "weekend" or tomorrow for "next morning" calculations. |
| **14.11** | Integrate non-conflicting visual changes from visual-revamp | Pending | Transparent glass buttons, sliding headers, and glass indicators integrated securely. |
| **14.12** | Complete Antigravity sequential artifacts for judges | Done | Created sequential implementation plan, tracker, and walkthrough documents. |

---

## Remaining Watch Items
- Verify that `LocationResolverAgent` neighborhood-first priority doesn't crash on null query fallback.
- Test scroll event triggers on Android versus iOS physical environments to ensure smooth translation values.
- Verify date-parser behaves correctly across timezone boundaries when translating Roman Urdu inputs.
