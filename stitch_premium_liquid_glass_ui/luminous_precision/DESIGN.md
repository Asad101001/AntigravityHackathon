---
name: Luminous Precision
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#3d4a42'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#6d7a72'
  outline-variant: '#bccac0'
  surface-tint: '#006c4a'
  primary: '#006948'
  on-primary: '#ffffff'
  primary-container: '#00855d'
  on-primary-container: '#f5fff7'
  inverse-primary: '#68dba9'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#006949'
  on-tertiary: '#ffffff'
  tertiary-container: '#00855d'
  on-tertiary-container: '#f5fff7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#85f8c4'
  primary-fixed-dim: '#68dba9'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#005137'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#68fcbf'
  tertiary-fixed-dim: '#45dfa4'
  on-tertiary-fixed: '#002114'
  on-tertiary-fixed-variant: '#005137'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-padding-mobile: 1.25rem
  container-padding-desktop: 2.5rem
  gutter: 1.5rem
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 2rem
---

## Brand & Style
This design system is built for a premium, high-end service environment where transparency and trust are paramount. The aesthetic identity is centered on **High-Fidelity Glassmorphism**, prioritizing visual depth, clarity, and structural order.

The experience should evoke a sense of professional calm and meticulous organization. By utilizing translucent layers, frosted textures, and precision-engineered vector iconography, the UI moves away from flat conventions toward a tactile, multi-dimensional space. The brand avoids all casual or playful elements (such as emojis), opting instead for a sophisticated architectural approach that reflects the high value of the services provided.

## Colors
The palette is anchored by a refined **Emerald Green (#059669)**, chosen for its associations with vitality, precision, and premium quality. 

- **Primary:** The core brand emerald, used for high-importance actions and brand-defining accents.
- **Glass Surfaces:** Semi-transparent white layers with varying degrees of opacity (70% for primary containers, 40% for secondary accents).
- **Backgrounds:** Soft, neutral-tinted gradients that provide the necessary "under-glow" for glass components to refract.
- **Typography:** Deep Slate (#0F172A) provides high-contrast legibility against translucent backgrounds.

## Typography
**Plus Jakarta Sans** is the sole typeface for this design system. It is utilized for its modern, geometric balance and high-end editorial feel. 

Headlines use tighter tracking and heavier weights to command attention, while body text maintains generous line height to ensure readability against glass-textured backgrounds. Labels are set in a slightly smaller, tracked-out uppercase format to provide clear metadata without cluttering the visual hierarchy.

## Layout & Spacing
This design system employs a **strict 8px baseline grid**. To prevent element overlap and maintain the "clarity" of the glass metaphor, all components must respect defined boundary zones.

- **Fixed Grid (Desktop):** A 12-column grid with a maximum content width of 1280px.
- **Fluid Grid (Mobile):** A 4-column fluid layout with a minimum 20px margin.
- **Rules of Collision:** No two glass surfaces should touch without a minimum of `stack-md` (16px) spacing, ensuring the subtle edge highlights are always visible and distinct.

## Elevation & Depth
Depth in this design system is achieved through a three-layer strategy:

1.  **Backdrop Blurs:** Every glass component uses a `backdrop-filter: blur(20px)` to diffuse elements behind it, creating a sense of physical thickness.
2.  **Inner Borders (The Highlight):** A 1px semi-transparent white border (top and left) mimics a light source catching the edge of a glass pane.
3.  **Multi-Layered Shadows:** Instead of a single dark shadow, use two:
    -   A broad, low-opacity ambient shadow for general elevation.
    -   A tighter, more saturated "contact" shadow to ground the element.

## Shapes
Surfaces use a **Rounded** (0.5rem / 8px) base radius. This softening of geometric edges balances the technical nature of glassmorphism with the approachable premium feel required for a home services app. High-level containers and primary cards use `rounded-xl` (1.5rem) to signify importance and containment.

## Components

### Glass Cards
Primary content containers featuring a 70% white opacity fill, 20px backdrop blur, and a 1px `rgba(255, 255, 255, 0.4)` border. These should never be placed directly on a pure white background; they require a tinted or gradient background to be visible.

### Rotating Service Tiles
Interactive squares or rectangles that use a subtle 3D hover effect. These tiles should flip or rotate along the Y-axis to reveal secondary information, maintaining the same glass properties on both "sides" of the component.

### Structured Chat Bubbles
- **Provider Bubbles:** Light Emerald glass with left-aligned 8px rounding (0px on bottom-left).
- **User Bubbles:** Neutral slate (non-glass) with right-aligned 8px rounding (0px on bottom-right) to provide clear visual contrast in conversations.

### Vector Iconography
Replace all emojis with thin-stroke (1.5pt) vector icons. Use a consistent set where all corners are slightly rounded to match the system's shape language.

---

## Developer Implementation: Glass Effects
To achieve the high-fidelity glass look, developers should utilize the following CSS structure for all primary containers:

```css
.glass-container {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: 
    0 4px 30px rgba(0, 0, 0, 0.1),
    inset 0 1px 1px rgba(255, 255, 255, 0.3);
}
```
For stacking, use z-index in increments of 10. Avoid placing glass on glass unless the blur values are varied (e.g., Background: 10px, Foreground: 30px) to maintain legibility.