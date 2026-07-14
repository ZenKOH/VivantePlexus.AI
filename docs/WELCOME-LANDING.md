# VivantePlexus welcome landing

The welcome layer gives the public GitHub Pages build a deliberate entry state before the clinical workspace. It borrows the strongest structural ideas from HandVivante MirrorCoach—clear product framing, a three-part workflow explanation, transparent demo access and local-data reassurance—without copying the product-specific imagery or RMHT workflow.

## Behaviour

- A fresh load of `#overview` opens the landing page consistently.
- Entering the workspace keeps the landing closed during normal in-page navigation.
- `Data & exports → Welcome page` reopens the landing at any time.
- Direct links to `#programmes`, `#sessions`, `#equipment`, `#outcomes` and `#reports` bypass the welcome layer.
- Existing clinical data modules and local storage are not altered.

## Responsive presentation

The landing uses one content hierarchy rather than shrinking the desktop composition proportionally:

- Desktop uses a restrained 1280-pixel content rail, a primary product narrative, one secondary intelligence visual and one clear access panel.
- Laptop-height screens reduce vertical spacing and illustration height so the primary action remains visible.
- Tablet layouts collapse to a single reading column while retaining the intelligence visual.
- Phone layouts remove the decorative network diagram, shorten the three workflow explanations and preserve a three-column dataset summary.
- Primary controls remain at least 48 pixels high, with visible keyboard focus, reduced-motion handling and forced-colour support.

The approach follows the NHS responsive spacing principle, WCAG 2.2 reflow, target-size and focus guidance, and the U.S. Web Design System principles of earning trust, supporting scanning and providing equivalent access across devices.

Reference guidance:

- https://service-manual.nhs.uk/design-system/styles/spacing
- https://www.w3.org/WAI/WCAG22/Understanding/reflow.html
- https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html
- https://designsystem.digital.gov/design-principles/

## Accessibility and interaction

- The page preserves the existing language control and provides landing copy in all six supported languages.
- The consent control prevents accidental entry into the synthetic demonstration.
- Workspace regions become inert and are removed from the accessibility tree while the welcome layer is open.
- Focus moves into the landing on entry and back to the workspace after dismissal.
- The animated connector map honours reduced-motion preferences and is omitted entirely on small phones where it would compete with the core task.

## Safety boundary

The landing states that the public build is a non-clinical prototype using synthetic data. It warns users not to enter directly identifiable patient information and does not represent the platform as a diagnostic or autonomous treatment system.
