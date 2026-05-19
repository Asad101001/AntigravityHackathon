# Change 18: User Authentication and Session Persistence

## Summary
A full authentication flow was added so users must sign in before using the app, with secure session persistence across app restarts.

## What Changed
- Added user registration and login endpoints.
- Added password hashing for secure credential storage.
- Added JWT-based authentication for protected API access.
- Added authenticated user profile retrieval (`/auth/me`).
- Added auth middleware to protect backend routes.
- Added mobile auth gate (login required before app usage).
- Added persistent session storage on device for "remember me" behavior.

## Before
- App access was not fully gated by authentication.
- Session continuity between app launches was limited.

## After
- Users must register/login to access core app flows.
- Authenticated sessions are restored on next app launch.
- Protected endpoints require valid bearer tokens.

## Key Files Updated
- `backend/routes/authRoutes.js`
- `backend/middleware/authMiddleware.js`
- `backend/db.js`
- `mobile/context/AuthContext.js`
- `mobile/screens/AuthScreen.js`
- `mobile/lib/apiClient.js`
- `mobile/lib/authSession.js`
- `mobile/App.js`

## User Impact
- Improved account security and access control.
- Personalized, persistent experience across sessions.
- Reduced friction from repeated login after every restart.
