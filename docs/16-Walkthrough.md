# Change 16: Order-Specific Status Flow (Replaced Global Status Section)

## Summary
The generic Status section was removed from the main tab workflow and replaced with per-order status access directly from Bookings.

## What Changed
- Removed Status tab from bottom navigation.
- Added a new `OrderStatus` screen that receives a selected booking.
- Added `View Status` action on each booking card.
- Navigates from booking card to that specific order’s status screen.
- Kept order-level progress rendering and status details on the new screen.

## Before
- Status tab showed a generic/active-booking status view.
- Users could not directly open status for a specific order from list context.

## After
- Status is opened per booking via `View Status`.
- Users see status/details for the exact selected order.
- Booking list remains the central entry point for status checks.

## Key Files Updated
- `mobile/App.js`
- `mobile/screens/BookingsScreen.js`
- `mobile/screens/OrderStatusScreen.js` (new)

## User Impact
- More intuitive tracking for users with multiple orders.
- Removes ambiguity caused by one global status screen.
- Makes order tracking contextual and direct.
