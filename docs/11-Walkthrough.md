# Technical Walkthrough: State & UI Refinement

## The Auto-Hiding Navbar
The Bottom Tab Bar now utilizes an `Animated.Value` tied to the `onScroll` event of the active screen's `ScrollView`. When the user scrolls down, a `translateY` transform smoothly pushes the navbar off-screen. Pausing or scrolling up triggers a spring animation to return it.

## The Global Header & Sidebar
The `Header.js` component has been upgraded. While the center retains the interactive `M A K` horizontal monogram and Asaaniyat branding (acting as a state-reset), the right/left corner now mounts a `UserProfileAvatar`. Pressing this avatar toggles a global sliding overlay or Drawer Navigator containing application-level settings and the AI Agent Trace visualizer, decluttering the primary workflow screens.

## Map & Location Precision
The `MapPanel` now properly ingests the coordinates resolved by the `LocationResolverAgent` and the `ProviderDiscovererAgent`. It renders distinct, polished custom markers for the user and providers, dynamically drawing distance metrics over the map interface using the translucent glass aesthetic.