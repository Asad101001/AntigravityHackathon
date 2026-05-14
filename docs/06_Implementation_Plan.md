# Implementation Plan — Web Bundling and Backend Visibility Fix

## Goal

Make local browser testing less confusing and stop Expo Web from failing on native-only map imports.

## Plan

1. Add a cross-platform `MapPanel` component with separate native and web implementations.
2. Keep `react-native-maps` isolated in `MapPanel.native.js` so Metro Web never imports native-only internals.
3. Use `MapPanel.web.js` as a graceful map preview for browser testing while preserving real maps in Expo Go/Android/iOS.
4. Add a friendly backend root route at `/` so opening `http://localhost:3001/` shows a status page with correct links.
5. Document that `http://0.0.0.0:3001` is not a valid browser URL and that users should open `localhost` or the LAN IP instead.
