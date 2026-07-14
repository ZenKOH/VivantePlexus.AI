# VivantePlexus welcome landing

The welcome layer gives the public GitHub Pages build a deliberate entry state before the clinical workspace. It borrows the strongest structural ideas from HandVivante MirrorCoach—clear product framing, a three-part workflow explanation, transparent demo access and local-data reassurance—without copying the product-specific imagery or RMHT workflow.

## Behaviour

- The landing is shown on a new browser session at `#overview`.
- Entering the workspace records a session-only dismissal so normal tab navigation remains efficient.
- `Data & exports → Welcome page` reopens the landing at any time.
- Direct links to `#programmes`, `#sessions`, `#equipment`, `#outcomes` and `#reports` bypass the welcome layer.
- Existing clinical data modules and local storage are not altered.

## Accessibility and interaction

- The page preserves the existing language control and provides landing copy in all six supported languages.
- The consent control prevents accidental entry into the synthetic demonstration.
- Workspace regions become inert and are removed from the accessibility tree while the welcome layer is open.
- Focus moves into the landing on entry and back to the workspace after dismissal.
- Controls maintain a minimum 44-pixel interactive height and the animated connector map honours reduced-motion preferences.

## Safety boundary

The landing states that the public build is a non-clinical prototype using synthetic data. It warns users not to enter directly identifiable patient information and does not represent the platform as a diagnostic or autonomous treatment system.
