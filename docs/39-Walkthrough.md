# Visual Overhaul — Chat & Quick Reply Interaction UI

This walkthrough documents the visual specifications, interactive bubble states, and dynamic gesture triggers implemented to deliver a frictionless conversational booking interface.

## Figma Specs & Design Hierarchy
* **Theme**: Forest-green conversation bubbles.
* **Layout**: Keyboard-avoiding safe containers with horizontal quick reply action lists.
* **Visual States**: 
  * User messages: High-density forest green bubbles with white text.
  * System messages: Light glassmorphic card overlays with dark slate text.

## Interactive Specifications

### 1. Zero-Input Quick Replies
* Replaced standard open text input blocks with a curated horizontal row of action replies (`QUICK_REPLIES`):
  1. `"How quickly can you arrive?"` (`time-outline` icon)
  2. `"Show technician profile"` (`person-outline` icon)
  3. `"Confirm Request"` (`checkmark-circle-outline` icon)
* Clicking a quick reply block immediately generates a styled user chat bubble and pushes a contextual response from the matching engine.

### 2. Scroll-to-Reveal Tab Gestures
* Integrated native drag gesture handlers (`onTouchStart`, `onScrollBeginDrag`) on the `<ScrollView>` to automatically trigger the bottom Tab Bar visibility toggle.
* Prevents users from getting stuck in empty chat spaces, enabling them to reveal navigation controls with a simple scrolling swipe.
