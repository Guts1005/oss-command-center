---
name: OSS Command Center
description: Local-first telemetry workstation and triage HUD for open-source contributors
colors:
  primary: "#749DD0"
  secondary: "#92AAD1"
  neutral-bg: "#17181C"
  surface: "#1E1F25"
  surface-card: "#24252C"
  surface-elevated: "#2B2D35"
  border-subtle: "#3B4568"
  border-bold: "#5c6a99"
  text-primary: "#F2F6FB"
  text-muted: "#AAA59F"
  status-merged: "#4ade80"
  status-action: "#ef4444"
  status-in-review: "#749DD0"
  status-amber: "#fbbf24"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, -apple-system, sans-serif"
    fontSize: "3.5rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Plus Jakarta Sans, -apple-system, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  body:
    fontFamily: "IBM Plex Sans, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  telemetry:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.75rem"
    fontWeight: 600
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
---

## Overview
OSS Command Center uses a high-contrast Sapphire Stream Whisper archetype paired with technical typography (Plus Jakarta Sans for commanding titles, IBM Plex Sans for legible descriptive body, JetBrains Mono for telemetry and hashes).

## Colors
- **Primary Accent (`#749DD0`)**: Sapphire blue used for active focus boundaries, key action links, and in-review signals.
- **Secondary Accent (`#92AAD1`)**: Glacial cyan used for supporting metrics and secondary telemetry.
- **Substrates**: Void obsidian base (`#17181C`), HUD surface (`#1E1F25`), and card container (`#24252C`).
- **Semantic Signals**:
  - Merged / Shipped: Emerald green (`#4ade80`)
  - Action Required / Reply Needed: Crimson red (`#ef4444`) / Signal amber (`#fbbf24`)
  - In Review: Sapphire blue (`#749DD0`)

## Typography
- **Headings**: Plus Jakarta Sans, heavy weights (700-800), tracking strictly between -0.02em and -0.03em. Zero gradient text; solid high-contrast white (`#F2F6FB`).
- **Body**: IBM Plex Sans, 14px to 16px, line height 1.5 to 1.6. Measure maintained at 65-75ch.
- **Telemetry**: JetBrains Mono, 11px to 13px, used exclusively for tabular numbers, hashes, commit IDs, and keyboard navigation indicators.

## Layout
- High-density telemetry grid with responsive container wrapping.
- Horizontal gutters at 16px (mobile) to 32px (desktop) preventing body text from ever touching viewport edges.
- Keyboard navigation affordances (`j`/`k` rows, `Enter` detail drawer) clearly labeled.

## Elevation & Depth
- Layered shadow system with soft blur and gentle negative Y offset.
- Single elevation declaration per component: either crisp 1px border or tonal elevation, avoiding stacked zero-offset colored halos.

## Shapes
- Card radius: 12px to 16px (`rounded-xl` or `rounded-2xl`).
- Controls & badges: 6px to 8px (`rounded-md` or `rounded-lg`).
- Pill buttons reserved exclusively for interactive filter tags and status chips.

## Components
- **Top Navigation HUD**: Fixed-height operational header with live sync status, active view switcher, and quick PR search.
- **Contribution Row**: Scannable row with platform badge, repository slug, author handle, time-ago indicator, urgency status, and inspect CTA.
- **SlideOver Drawer**: Right-anchored inspection panel with review events timeline and SLA latency breakdown.
- **Hero Cockpit**: Concise, high-contrast banner explaining purpose and quick actions (Explore Demo, Connect Accounts, View Spec).

## Do's and Don'ts
- **DO** maintain WCAG AA contrast (≥4.5:1 for body text, ≥3:1 for large text).
- **DO** use solid colors for emphasis, weight, and hierarchy.
- **DON'T** use gradient text on headings.
- **DON'T** use thick 2px+ side-tab accent borders on cards or alerts.
- **DON'T** let body text run flush to the viewport margin without at least 16px padding.
- **DON'T** use monospace as a decorative costume for ordinary English paragraphs.
