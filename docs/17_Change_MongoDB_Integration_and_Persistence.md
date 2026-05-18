# Change 17: MongoDB Integration and Persistence

## Summary
The project was connected to MongoDB to replace temporary/session-only behavior with persistent backend storage for users and bookings.

## What Changed
- Integrated MongoDB in backend data layer.
- Added database-backed user storage for authentication.
- Added database-backed booking storage and retrieval.
- Enabled order lifecycle updates (confirmed, Operating, Completed, canceled).
- Added duplicate-booking validation based on active bookings.
- Connected mobile booking views to backend MongoDB data.

## Before
- Data behavior was partially transient/session-based.
- Booking visibility and continuity across sessions was inconsistent.

## After
- Users and bookings persist in MongoDB.
- Bookings are fetched from database on app usage and refresh.
- Booking status and cancellation updates are saved and reflected reliably.

## Key Files Updated
- `backend/db.js`
- `backend/routes/authRoutes.js`
- `backend/routes/serviceRoutes.js`
- `mobile/screens/BookingsScreen.js`
- `mobile/screens/ConfirmationScreen.js`

## User Impact
- Reliable persistence across app restarts.
- Stable booking history and status tracking.
- Better consistency between backend state and mobile UI.

## Notes
- Duplicate booking prevention applies to active bookings; canceled bookings do not block rebooking for the same slot.
