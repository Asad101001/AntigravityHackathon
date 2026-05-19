# Phase II-B: UI/UX High-Fidelity Polish & Routing Refinement

## 1. Architectural Objectives
The initial UI migration introduced severe component overlap and layout rigidities. This phase aims to resolve spatial inconsistencies while implementing advanced interaction patterns (auto-hiding navbars, drawer navigation) and reverting to the original Asaaniyat brand color palette enhanced by iOS 26 volumetric blur effects.

## 2. Structural Upgrades
* **Navigation Hierarchy:** Integrate a unified state encompassing a Bottom Tab Navigator and a global Sidebar (Drawer or Custom Overlay).
* **Dynamic Navbar:** Implement Scroll-Aware and Idle-Aware animation hooks via `Animated` or `react-native-reanimated` to auto-hide the bottom tab bar, maximizing screen real estate.
* **Data Separation:** * `BookingsScreen`: Historical ledger (Completed/Processed) + Ongoing overview (Progress Bar).
    * `StatusScreen`: Isolated, high-fidelity live tracking of the *currently active* job with deep actionable options.
* **Trace Integration:** Relocate the AI Agent Trace logs from a floating action button on the Home screen into the formalized User Sidebar.

## 3. Aesthetic Mandate
* Abandon the ultra-dark moody theme in favor of the original Asaaniyat branding (accessible blues, clean whites/lights).
* Force heavy application of `expo-blur` across all primary containers (cards, headers, navbars) to achieve the "Liquid Glass" requirement.