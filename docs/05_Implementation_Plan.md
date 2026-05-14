# Implementation Plan — Windows Local Testing Fix

## Goal

Make first-run testing on the same Windows laptop predictable with the exact commands the project expects:

- Backend: `npm start`
- Mobile: `npx expo start`
- Optional browser test: `npx expo start --web`

## Plan

1. Align the backend and mobile default API port to `3001`, matching the backend logs produced during Windows testing.
2. Keep `EXPO_PUBLIC_API_BASE_URL` as the safest override for phone/LAN tests.
3. Add `EXPO_PUBLIC_API_PORT` so contributors can override only the port without rewriting the full API URL.
4. Add Expo web dependencies to `mobile/package.json` so `npx expo start --web` has the required packages after install.
5. Update README with Windows-specific commands, including how to avoid the common nested `cd mobile` mistake and how to force the API URL when testing through Expo Go.

## Expected behavior

If Expo prints `exp://192.168.100.24:8081` and the backend prints `http://192.168.100.24:3001`, the mobile app will derive `http://192.168.100.24:3001/api` automatically in Expo Go.
