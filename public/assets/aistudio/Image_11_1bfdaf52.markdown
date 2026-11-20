---
name: Precision Orchestrator
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
  on-surface-variant: '#434655'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#943700'
  on-tertiary: '#ffffff'
  tertiary-container: '#bc4800'
  on-tertiary-container: '#ffede6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb596'
  on-tertiary-fixed: '#360f00'
  on-tertiary-fixed-variant: '#7d2d00'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-lg: 1.5rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system embodies the ethos of high-leverage developer tooling: calm, disciplined, exceptionally fast, and ruthlessly legible. It is engineered for engineers and workflow architects coordinating distributed AI agents, autonomous pipelines, and complex node graphs.

The design philosophy balances **functional minimalism** with modern enterprise clarity. Cognitive load is reduced not by stripping out operational density, but by orchestrating whitespace, maintaining strict structural rhythm, and employing intentional chromatic hierarchy. Interactions are crisp and immediate, establishing confidence in mission-critical automated pipelines.

## Colors

The palette employs a high-contrast, clinical foundation anchored by crisp white surfaces over an ultra-light cool gray workspace. Chrome panels recede naturally, letting workflow graphs and real-time execution states take precedence.

### Palette Architecture
- **Canvas Base (`#F8FAFC`)**: Applied to root viewports, node canvas backgrounds, and sub-pane gutters.
- **Surface Pure (`#FFFFFF`)**: Strictly reserved for elevated interactive surfaces: primary sidebars, application headers, node cards, inspect drawers, and modal dialogs.
- **Border Default (`#E5E7EB`)**: Structural 1px separation lines across panels, segmented controls, and card perimeters.
- **Text Primary (`#0F172A`)**: Deep slate for high-clarity headlines, node labels, and critical values.
- **Text Muted (`#64748B`)**: Intermediate slate for auxiliary metadata, timestamps, input placeholders, and inactive status indicators.
- **Accent Royal (`#2563EB`)**: Applied deliberately to focus rings, selected nodes, active tabs, primary commit triggers, and system links.

### Semantic Status Tiers
Status badges and execution runs leverage soft pastel fills paired with high-contrast foreground glyphs and labels:
- **Success / Active**: Surface `#DCFCE7` | Text & Icon `#16A34A`
- **Error / Failed**: Surface `#FEE2E2` | Text & Icon `#DC2626`
- **Running / In-Progress**: Surface `#DBEAFE` | Text & Icon `#2563EB`
- **Pending / Warning**: Surface `#FEF3C7` | Text & Icon `#D97706`

## Typography

The typographic hierarchy prioritizes rapid scanning and structural order across deep technical workflows.

- **Primary Typeface (Inter)**: Clean, neutral geometric sans handling structural headings, standard inputs, and operational copy. Headings use semi-bold weights (`600`) with subtle negative tracking for a cohesive, engineered finish.
- **Monospace Typeface (JetBrains Mono)**: Used for all machine outputs, agent tokens, pipeline IDs (`run_01j7...`), JSON inspection payloads, latency metrics, and console streams. Monospace elements maintain consistent optical baseline alignments with companion regular text.
- **Contrast Hygiene**: Maintain primary titles strictly at `#0F172A`. All supplementary metadata, descriptive helper hints, and table headers resolve to `#64748B`.

## Layout & Spacing

The layout is built on a high-density, fluid-first structure optimized for wide desktop developer workstations, scaling down smoothly to responsive viewports.

### Layout Model
- **Workbench Shell**: A pinned 240px primary navigation sidebar on the left, an omni-present 56px utility header on top, and a flexible canvas region spanning the remainder of the viewport.
- **Node & Inspector Split**: When inspecting workflows, a 380px slide-over or dockable right panel provides real-time parameters without occluding graph roots.
- **Spacing Rhythm**: Standard UI spacing increments follow strict multiples of 4px. Compact controls leverage `space-xs` (4px) and `space-sm` (8px) for internal padding, while card groupings and panel margins use `space-lg` (16px) and `space-xl` (24px).
- **Responsive Adaptations**: On tablet and smaller screens, the fixed sidebar collapses to an icon bar or drawer, while secondary metadata panels convert to full-bleed modal sheets.

## Elevation & Depth

Visual separation relies primarily on sharp structural containment and planar layering rather than heavy shadows.

- **Base Layer**: The canvas (`#F8FAFC`) acts as ground zero.
- **Structural Elevation**: Elevated containers (`#FFFFFF`) do not rely on high-blur drop shadows. Instead, surfaces are framed by a 1px border (`#E5E7EB`) coupled with a razor-thin ambient shadow: `box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05)`.
- **Floating Overlays**: Contextual dropdowns, hover tooltips, and flyout menus utilize a crisp dual-layer shadow: `box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)`, bounded by the standard `#E5E7EB` stroke.
- **Focus & Selection**: Interactive focus states omit blurry halos, applying a crisp 2px solid ring (`#2563EB`) with a 1px white offset.

## Shapes

The design system employs a two-tier curvature scale designed to reinforce component hierarchy and tactile clarity.

- **Panels & Cards (`rounded-lg` / 12px)**: Large modular surfaces, agent node containers, modal dialogs, and workspace panels strictly utilize a 12px border radius. This softens the technical tool without losing structural grid alignment.
- **Controls & Micro-elements (`rounded` / 8px)**: Buttons, text inputs, status chips, dropdown items, and search triggers use an 8px radius.
- **Inner-to-Outer Alignment**: When controls (8px) sit nested with 8px internal padding inside a card (12px), geometric harmony is preserved without awkward corner pinch.

## Components

### Buttons
- **Primary**: Solid background `#2563EB`, text `#FFFFFF`, 8px radius, height 36px (compact) or 40px (default). On hover: `#1D4ED8`. Focus: 2px ring `#2563EB` with 2px offset.
- **Secondary**: Surface `#FFFFFF`, border 1px `#E5E7EB`, text `#0F172A`, 8px radius. On hover: background `#F8FAFC` and border `#D1D5DB`.
- **Ghost / Icon**: Transparent fill, text `#64748B`, 8px radius. On hover: background `#F1F5F9`, text `#0F172A`.

### Status Badges & Pills
- Compact, non-editable chips with 8px radius and 4px 8px padding.
- Typography: `code-sm` or `label-sm`.
- Status configurations follow semantic tokens:
  - *Active / Success*: `#DCFCE7` background, `#16A34A` text.
  - *Running*: `#DBEAFE` background, `#2563EB` text; accompanied by an animated 6px pulse dot.
  - *Failed*: `#FEE2E2` background, `#DC2626` text.
  - *Pending*: `#FEF3C7` background, `#D97706` text.

### Workflow Cards & Canvas Nodes
- White background (`#FFFFFF`), 12px radius, 1px continuous border (`#E5E7EB`), soft ambient shadow.
- Node headers feature a 40px structured zone separating the agent label, status badge, and contextual menu trigger.
- Selected state: border color transitions to `#2563EB` with an active 1px accent outline.

### Input Fields
- Height 38px, background `#FFFFFF`, border 1px `#E5E7EB`, 8px radius, font `body-md` (`#0F172A`).
- Placeholder text in `#94A3B8`.
- Focus state: border `#2563EB`, outer ring 2px `#DBEAFE`.

### Checkboxes & Radio Buttons
- 16px geometric containers with 4px radius (checkbox) or circular (radio).
- Inactive: 1px border `#D1D5DB`, background `#FFFFFF`.
- Active: Background `#2563EB`, border `#2563EB`, white checkmark or center pip.

### Log Streams & Code Panels
- Dark/Light hybrid code blocks or pure light viewports using `#F8FAFC` background framed in `#E5E7EB`.
- Text styled using `code-md` in `#0F172A` with line numbers anchored in `#94A3B8`.