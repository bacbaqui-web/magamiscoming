# WorkMusic Lab Design QA

## Evidence

- Source visual truth: `docs/qa/workmusic-source-viewport.png`
- Implementation: `docs/qa/workmusic-lab-final-viewport.png`
- Combined comparison: `docs/qa/workmusic-design-comparison-final.png`
- Viewport: 1280 x 720 CSS px, devicePixelRatio 1
- Captured pixels: source 1270 x 720, implementation 1270 x 720
- State: empty YouTube list, dark desktop layout
- Density normalization: same browser, viewport, DPR and screenshot mode; no resampling

## Full-view comparison

The Lab now follows the main WorkMusic screen's narrow centered dark panel, dashed YouTube input,
five-card cover flow, centered current-song label, compact progress row, circular playback controls,
and dark analysis/list panels. The Lab-only local-storage status remains a small secondary badge.

## Focused comparison

The central cover flow and playback row were inspected at their original 1280 x 720 captures. A
separate crop was not required because both regions remain readable at 1:1 in the individual
evidence images.

## Comparison history

### First pass: blocked

- P1: the Lab used a full-width dashboard header and red primary action instead of the product's
  compact charcoal WorkMusic panel.
- P1: a two-column list/player split and oversized black iframe region replaced the main screen's
  centered cover flow.
- P2: text playback buttons and wider spacing did not match the compact circular controls.

### Fixes

- Replaced the dashboard composition with an 800px centered WorkMusic panel.
- Restored the dashed URL area, five-layer cover flow and centered song metadata.
- Moved the YouTube iframe offstage while preserving playback behavior.
- Replaced previous/play/next text controls with the existing WorkMusic icon language.
- Matched the original grayscale palette, borders, radii, density and typography hierarchy.

### Final pass

- Fonts and typography: system font, compact weights and hierarchy match the existing app.
- Spacing and layout rhythm: centered panel, cover proportions and vertical rhythm are aligned.
- Colors and tokens: black page, charcoal surface, gray borders and muted labels match.
- Image quality: the current YouTube thumbnail uses the original image URL and `object-fit: cover`;
  empty cover cards match the source state.
- Copy and content: Lab-only copy is limited to `기능 확인용` and local-save status; core WorkMusic
  labels remain consistent.
- Intentional differences: global app tabs and the persistent remote are omitted because this is an
  isolated feature Lab; the analysis panel remains directly accessible for the test workflow.
- Console errors: 0.

## Findings

No actionable P0, P1 or P2 visual differences remain for the isolated Lab scope.

## Follow-up polish

- P3: replace remaining Lab range-control labels with the exact popover interaction if the Lab is
  later promoted into the main app.

final result: passed
