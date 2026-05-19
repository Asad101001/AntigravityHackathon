# Set 16: Order-Specific Status Flow - Implementation Plan

## Goal
Replace the generic, single global status tab with contextual, per-order status access. Users can click "View Status" on any booking card in the Bookings tab to navigate to the exact progress of that booking.

## Proposed Changes
- **mobile/App.js**: Remove "Status" tab from bottom tab navigation array.
- **mobile/screens/BookingsScreen.js**: Add "View Status" button on each booking item.
- **mobile/screens/OrderStatusScreen.js**: Modify screen to accept ooking parameters via route and render progress dynamically.
