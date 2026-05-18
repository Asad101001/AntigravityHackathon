# Change 14: Back Navigation Logic

## Summary
A targeted navigation improvement was added to make back behavior consistent while handling booking confirmation as a special case.

## What Changed
- Added a top-left back-button handler in the app header.
- Kept normal `goBack()` behavior for regular screens.
- Added a special rule for the confirmation route: pressing back now resets to Home.

## Before
- Back always attempted regular history navigation.
- From confirmation, users could land in intermediate flow screens.

## After
- Regular screens: back returns to previous screen.
- Confirmation screen: back takes user directly to Home.

## Key Files Updated
- `mobile/components/AppHeader.js`

## User Impact
- Cleaner post-booking experience.
- Fewer accidental returns to stale checkout/flow screens.

## Notes
- This is implemented at header level, so behavior remains centralized and easy to maintain.
