# Set 18: User Authentication and Session Persistence - Implementation Plan

## Goal
Introduce JWT-based authenticated access across all service endpoints, gate core mobile layouts with a login screen, and persist session tokens securely to allow remember-me behavior.

## Proposed Changes
- **backend/middleware/authMiddleware.js**: Validate bearer JWT tokens inside inbound requests.
- **mobile/context/AuthContext.js**: Handle registration, token verification, and state distribution.
- **mobile/screens/AuthScreen.js**: Build forms for email/password registration and login.
