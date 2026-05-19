---
name: Liquid Clarity
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#3d4a42'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#6d7a72'
  outline-variant: '#bccac0'
  surface-tint: '#006c4a'
  primary: '#006948'
  on-primary: '#ffffff'
  primary-container: '#00855d'
  on-primary-container: '#f5fff7'
  inverse-primary: '#68dba9'
  secondary: '#006a61'
  on-secondary: '#ffffff'
  secondary-container: '#86f2e4'
  on-secondary-container: '#006f66'
  tertiary: '#535f58'
  on-tertiary: '#ffffff'
  tertiary-container: '#6b7770'
  on-tertiary-container: '#f5fff7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#85f8c4'
  primary-fixed-dim: '#68dba9'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#005137'
  secondary-fixed: '#89f5e7'
  secondary-fixed-dim: '#6bd8cb'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#d9e6dd'
  tertiary-fixed-dim: '#bdcac1'
  on-tertiary-fixed: '#131e19'
  on-tertiary-fixed-variant: '#3e4943'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-padding: 24px
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: 64px
  stack-sm: 12px
  stack-md: 24px
  stack-lg: 48px
---

## Brand & Style
The brand personality centers on effortless efficiency, transparency, and high-end service reliability. This design system employs a **Liquid Glass** aesthetic—a sophisticated evolution of Glassmorphism that prioritizes legibility and spatial depth. 

The visual narrative is defined by:
- **Luminosity:** Interfaces feel light-filled, utilizing semi-transparent "glass" panes that allow background colors to bleed through subtly.
- **Precision:** High-quality SVG iconography and razor-sharp typography replace casual emojis to maintain a professional, premium tone.
- **Flow:** Layouts avoid rigid boxes in favor of "liquid" containers with generous inner padding and organic, rounded corners.
- **Spatial Hierarchy:** A strict "layer-first" approach where depth is communicated through backdrop blurs and multi-layered shadows rather than heavy borders or dark colors.

## Colors
The palette is rooted in a spectrum of vibrant, professional greens and teals, symbolizing growth and trust.

- **Primary (Emerald):** Used for high-priority actions, active states, and success indicators.
- **Secondary (Teal):** Used for secondary interactive elements and service category differentiation.
- **Tertiary (Mint Wash):** A very light, desaturated green used as the base background color to provide a "tinted lens" effect for glass layers.
- **Neutral (Slate):** Used exclusively for high-contrast text and critical iconography to ensure accessibility.

**Glass Specification:**
Surfaces should use a white base at 60–80% opacity with a `20px` to `40px` backdrop blur. Every glass container must feature a `1px` translucent white top-border to simulate light catching the edge of a physical pane.

## Typography
This design system utilizes **Plus Jakarta Sans** for its geometric clarity and modern, welcoming apertures. The typography is optimized for bilingual support (English and Urdu).

- **Headlines:** Use heavy weights (700-800) with slight negative letter spacing to create a grounded, "premium" feel.
- **Body Text:** Standardizes on a 16px base for maximum readability in service descriptions. 
- **Urdu Handling:** Ensure line-height for Urdu text is increased by 20% compared to English to accommodate the verticality of the Nastaliq script without clipping.
- **Alignment:** Primary headers and profile triggers are strictly left-aligned to establish a consistent scanning anchor.

## Layout & Spacing
The spacing philosophy relies on **expansive whitespace** to prevent the glass layers from appearing cluttered or visually heavy.

- **Grid:** A 12-column fluid grid for desktop and a 4-column grid for mobile.
- **The "Safe Zone":** Elements never overlap. Each "Liquid Glass" card is separated by a minimum of `stack-md` (24px) to allow the background gradients to remain visible between layers.
- **Sidebar/Profile:** The profile trigger is anchored to the top-left with a fixed margin of 20px, providing a consistent global navigation entry point.
- **Content Reflow:** On mobile, all cards span the full width of the margins. On tablet and desktop, cards utilize a masonry-style or multi-column grid to maintain manageable line lengths.

## Elevation & Depth
Depth in the design system is achieved through "Tonal Stacking" rather than traditional heavy shadows.

- **Level 0 (Base):** The tertiary mint background, often featuring soft, organic blobs of teal and emerald in the far distance.
- **Level 1 (Surface):** Standard frosted glass panes (60% opacity) with a `40px` backdrop blur and a soft, diffused `0px 10px 30px rgba(0,0,0,0.04)` shadow.
- **Level 2 (Active/Floating):** Higher opacity glass (85%) with a more pronounced multi-layered shadow: a sharp `2px` shadow for contact and a broad `40px` shadow for lift.
- **Liquid Effect:** Apply an inner glow (white, 10% opacity) to the top-left of containers and a subtle inner shadow (primary color, 5% opacity) to the bottom-right to create the "liquid" surface tension.

## Shapes
The shape language is consistently soft and organic to mirror the "liquid" theme.

- **Standard Containers:** Use a `1rem` (16px) radius to ensure cards look friendly yet structured.
- **Interactive Elements:** Buttons and search inputs use "Pill" shapes (999px radius) to differentiate them from static content containers.
- **Icon Backdrops:** SVG icons should be housed in small circular or highly rounded "droplet" containers (0.75rem) to maintain the fluid aesthetic.
- **Borders:** Use thin, low-contrast strokes (`1px` at 10% opacity) to define edges without breaking the glass illusion.

## Components

### Buttons
- **Primary:** Solid Emerald-to-Teal gradient with a white label. Large `rounded-xl` shape.
- **Glass Action:** A semi-transparent glass button with a primary-colored border and text. Used for secondary actions like "Edit Request."

### Cards & Service Tiles
- Service tiles must use high-quality photography with a glass overlay at the bottom for the label.
- Avoid sharp image edges; apply the system `roundedness` to the image itself.

### Navigation
- **Floating Dock:** The bottom navigation should be a floating glass "pill" separated from the screen edges. 
- **Active State:** The active tab is indicated by a solid primary-colored capsule behind the icon, creating a high-contrast focal point.

### Input Fields
- Natural language inputs should be large, glass-filled containers with `label-caps` floating above them.
- Use primary-colored "Send" or "Confirm" FABs (Floating Action Buttons) integrated into the right side of the input field.

### Service Indicators
- Use custom SVG icons (e.g., a lightning bolt for Electrician, a drop for Plumber). 
- Icons should be monochromatic (Primary Color) and placed on a white glass circle to ensure they pop against photographic backgrounds.