# Set 14: Back Navigation Logic - Implementation Plan

## Goal
Implement consistent back-button behavior throughout the mobile app, with a specific override for the booking confirmation screen to return users directly to the home screen.

## Proposed Changes
- **mobile/components/AppHeader.js**: Add route parameter checking inside the header navigation handler to detect if the user is on the Confirmation route and redirect to Home.
