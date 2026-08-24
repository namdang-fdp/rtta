---
name: Aurelius Workspace
colors:
  surface: '#fff8f5'
  surface-dim: '#e1d8d4'
  surface-bright: '#fff8f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fbf2ed'
  surface-container: '#f5ece7'
  surface-container-high: '#efe6e2'
  surface-container-highest: '#e9e1dc'
  on-surface: '#1e1b18'
  on-surface-variant: '#524345'
  inverse-surface: '#34302c'
  inverse-on-surface: '#f8efea'
  outline: '#857374'
  outline-variant: '#d7c1c3'
  surface-tint: '#8c4b55'
  primary: '#8a4853'
  on-primary: '#ffffff'
  primary-container: '#a6606b'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb2bc'
  secondary: '#625d5c'
  on-secondary: '#ffffff'
  secondary-container: '#e6dedc'
  on-secondary-container: '#666160'
  tertiary: '#785253'
  on-tertiary: '#ffffff'
  tertiary-container: '#936a6a'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffd9dd'
  primary-fixed-dim: '#ffb2bc'
  on-primary-fixed: '#3a0915'
  on-primary-fixed-variant: '#70343e'
  secondary-fixed: '#e8e1df'
  secondary-fixed-dim: '#ccc5c3'
  on-secondary-fixed: '#1e1b1a'
  on-secondary-fixed-variant: '#4a4645'
  tertiary-fixed: '#ffdad9'
  tertiary-fixed-dim: '#ecbbba'
  on-tertiary-fixed: '#2f1314'
  on-tertiary-fixed-variant: '#603d3e'
  background: '#fff8f5'
  on-background: '#1e1b18'
  surface-variant: '#e9e1dc'
typography:
  display-lg:
    fontFamily: Merriweather
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Merriweather
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.3'
  headline-lg-mobile:
    fontFamily: Merriweather
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Merriweather
    fontSize: 24px
    fontWeight: '400'
    lineHeight: '1.4'
  body-reading:
    fontFamily: Merriweather
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.8'
    letterSpacing: 0.01em
  body-ui:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.02em
  code:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-max-width: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
  stack-gap: 16px
  section-gap: 48px
---

## Brand & Style

The design system is engineered for **Aurelius Workspace**, a high-focus environment for Real-Time Research Translation. It bridges the gap between scientific rigor and humanistic warmth. The design style is a hybrid of **Minimalism** and **Modern Corporate**, utilizing a restrained "Linear-style" polish with subtle skeuomorphic cues to create a sense of tangible quality.

The interface prioritizes cognitive ease, employing a "calm-tech" philosophy where the UI recedes to highlight the research and translation content. It evokes a feeling of being in a well-lit, quiet library—organized, premium, and deeply intellectual.

## Colors

The palette is anchored in organic, warm tones that reduce eye strain during prolonged research sessions.

### Light Mode
The canvas uses a **Warm Ivory** (#FDFAF8) to provide a softer contrast than pure white. The **Dusty Rose** (#B76E79) serves as the primary action color, offering a sophisticated alternative to standard blue or purple.

### Dark Mode
Transitions to a **Warm Charcoal** (#1A1817) base. Surfaces use **Plum-Gray** (#2A2726) to maintain depth without losing the organic warmth. Accents are shifted toward more desaturated, luminous versions of the rose palette to ensure accessibility and "glow" without harshness.

## Typography

This system uses a dual-type strategy to balance utility and readability.

- **Merriweather** (Serif) is reserved for content-heavy areas, translations, and editorial headlines. It provides the "scientific" and "authoritative" feel necessary for research.
- **Inter** (Sans-serif) handles all functional UI elements, navigation, and data entry. Its neutral, systematic nature ensures the interface remains efficient and modern.

**Reading Experience:** For long-form translation text, use `body-reading` with a maximum line width of 65 characters to optimize focus.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a hard max-width for content readability.

1. **Hierarchy:** Use generous white space between sections (`section-gap`) to signify changes in context.
2. **The Workspace:** The primary interface utilizes a split-pane layout (Translation/Source) with a fixed-width sidebar for navigation.
3. **Margins:** On desktop, use a wide `40px` margin to create a "letterbox" feel that focuses the eye toward the center.
4. **Rhythm:** All spacing must be a multiple of the `4px` base unit.

## Elevation & Depth

In line with the premium productivity aesthetic, the design system avoids heavy shadows. Instead, it uses **Tonal Layering** and **Subtle Bordering**.

- **Surfaces:** Use the secondary color (#F9F1EF) for cards and container backgrounds to differentiate them from the ivory canvas.
- **Borders:** Implement `1px` borders in a slightly darker shade of the surface color (3-5% darker) rather than shadows for a "flat but layered" look.
- **Active State Depth:** Only the most critical interactive elements (like the primary "Translate" button) should use a subtle, 2px soft ambient shadow to indicate "pressability."
- **Glassmorphism:** Use only for floating navigation bars or overlays, with a `blur: 12px` and `opacity: 80%` to maintain context of the underlying research.

## Shapes

The shape language is "Soft" (`0.25rem` base). This provides a precise, professional feel that avoids the "juvenile" look of high-roundedness while remaining warmer than sharp corners.

- **Buttons & Inputs:** Use the standard `rounded` (4px).
- **Cards & Panes:** Use `rounded-lg` (8px) to define major workspace areas.
- **Status Indicators:** Small chips use `rounded-full` (pill-shape) for immediate visual distinction from content cards.

## Components

### Buttons
- **Primary:** Background Dusty Rose (#B76E79), text White. Subtle inset shadow on hover.
- **Secondary:** Ghost style with Muted Rose text and a light ivory background on hover.

### Inputs
- **Text Fields:** Minimalist design with only a bottom border that transitions to a full border on focus. No heavy background fills.
- **Search:** Rounded-lg with a subtle background tint (#F1ECE9) to distinguish from the primary ivory background.

### Cards & Workspace Panes
- Panels should be "flat" against the background, separated by a 1px `border-neutral/10`. Use `Merriweather` for the title of the panel to emphasize the content within.

### Lists & Data
- Use "Zebra striping" with the Secondary color (#F9F1EF) for high-density data tables.
- Rows should have a generous `12px` vertical padding to ensure the text "breathes."

### Progress Indicators
- For real-time translation, use a thin, non-distracting linear progress bar in Success Sage (#94A390) positioned at the top of the active pane.