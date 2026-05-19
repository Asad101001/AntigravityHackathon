# Visual Overhaul — Provider Matches & Location UI

This walkthrough documents the visual specifications for the provider matching list and map picker subpages, ensuring high visual density and clarity.

## Figma Specs & Design Hierarchy
* **Theme**: Forest-green highlight matchmaking screens.
* **Containers**: High-fidelity `LiquidGlass` components (`radius={24}`) with subtle borders and shadows.
* **Avatars**: Circular letter icons based on provider name initials (`provider.name?.charAt(0)`).

## Visual Specifications

### 1. Recommended Match Badging
* Recommended match items feature a distinct neon green overlay badge (`styles.recommendedBadge`) containing the text `"RECOMMENDED MATCH"`.
* Employs harmonious drop shadows to pop the card out from standard listing items.

### 2. Provider Metrics Row
* Displays a compact row of verified metric indicators:
  * Rating: `star` icon + rating score.
  * Distance: `location-outline` icon + dynamic `km` value.
  * Time: `time-outline` icon + ETA in minutes.
* Currency details are dynamically formatted in PKR using standard Pakistani thousand-separators (`toLocaleString('en-PK')`).

### 3. Glassmorphic Headers
* Headers incorporate floating back actions backed by semi-transparent white discs (`rgba(255,255,255,0.72)`) to remain high-contrast above colorful maps.
