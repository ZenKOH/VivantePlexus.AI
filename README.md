# VivantePlexus™

**Rehabilitation intelligence by [Robotimize](https://www.robotimize.tech).**

VivantePlexus™ is a browser-based clinical workflow prototype for rehabilitation programme planning, multidimensional therapy-dose tracking, equipment utilisation, functional outcomes and clinician-readable review support.

The interface uses Robotimize's white, signature red and charcoal visual identity and the official Robotimize logo. It is responsive across desktop, tablet and mobile browsers.

## Live application

Once GitHub Pages is enabled for this repository, the application is available at:

```text
https://zenkoh.github.io/VivantePlexus.AI/
```

## Core capabilities

- Load 36 synthetic rehabilitation cases spanning stroke, spinal cord injury, traumatic brain injury, cerebral palsy, Parkinson's disease, multiple sclerosis, frailty, vestibular, peripheral neurological, progressive neurological, musculoskeletal, orthopaedic and amputee pathways.
- Review 108 synthetic therapy sessions and 72 outcome records.
- Track scheduled time, active practice, repetitions, movement quality, fatigue, pain, assistance, task challenge, specificity, rest breaks, home adherence and functional carryover.
- Maintain an editable equipment library and link one or more devices to each therapy session.
- Review utilisation for HandVivante™, GaitVivante™, ElevoVivante™, RevitaVivante™ and custom devices.
- Compare active practice and repetitions against clinician-configured weekly targets.
- Link dose, tolerance and equipment use with functional outcome trajectories.
- Generate explainable, rule-based clinical review prompts while preserving clinician responsibility.
- Export CSV datasets, progress notes, FHIR-shaped JSON and complete JSON backups.
- Switch the complete workflow between English, Simplified Chinese, Spanish, French, German and Malay.
- Store data locally in the browser for an offline-first workflow.

## Product architecture

VivantePlexus™ is a static HTML, CSS and JavaScript application with no backend dependency. Its local-storage namespace is isolated from the original NeuroRehab Dose Tracker deployment so both applications can run on the same GitHub Pages domain without overwriting one another's browser data.

The FHIR-shaped export demonstrates relationships between pseudonymous `Patient`, `CarePlan`, `Device`, `Procedure`, `Goal` and `Observation` resources. It is an interoperability planning artefact, not a validated clinical integration.

## Run locally

```bash
git clone https://github.com/ZenKOH/VivantePlexus.AI.git
cd VivantePlexus.AI
npm ci
python3 -m http.server 8000
```

Open `http://localhost:8000`.

## Validation

```bash
npm run check
npm test
```

The automated suite verifies JavaScript syntax, all six language options, navigation, storage, equipment-to-session linkage, FHIR-shaped export relationships and header actions.

## GitHub Pages

The application is ready to publish directly from the repository root:

1. Open **Settings → Pages** in this repository.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select the `main` branch and `/ (root)` folder.
4. Save and wait for the deployment to complete.

The included `.nojekyll` file tells GitHub Pages to serve the static assets directly.

## Privacy and clinical scope

This public prototype stores records in the user's browser. Do not enter directly identifiable patient information. Use synthetic or locally approved pseudonymous case labels.

VivantePlexus™ is currently intended for tracking, education, workflow exploration, documentation support and pilot evidence generation. It is not medical advice, a diagnostic system, an autonomous treatment recommender, a regulated medical device or a substitute for licensed clinical judgement.

## Evidence-informed design

The prototype deliberately keeps scheduled time, active practice, repetitions, quality, fatigue, pain, equipment and carryover as distinct fields. Therapy volume alone is not treated as a complete representation of dose or effectiveness.

Useful reference points include:

- [WHO rehabilitation fact sheet](https://www.who.int/news-room/fact-sheets/detail/rehabilitation)
- [NICE NG236: Stroke rehabilitation in adults](https://www.nice.org.uk/guidance/ng236/chapter/Recommendations)
- [NICE NG62: Cerebral palsy in under 25s](https://www.nice.org.uk/guidance/ng62/chapter/Recommendations)
- [NICE NG220: Multiple sclerosis in adults](https://www.nice.org.uk/guidance/ng220/chapter/Recommendations)
- [NICE NG71: Parkinson's disease in adults](https://www.nice.org.uk/guidance/ng71/chapter/Recommendations)
- [HL7 FHIR Device](https://hl7.org/fhir/device.html)
- [HL7 FHIR R4 Procedure](https://hl7.org/fhir/R4/procedure.html)

## Company

VivantePlexus™ is part of the Robotimize rehabilitation technology portfolio.

**ROBOTIMIZE PTE. LTD. (202237458N)**<br>
Global HQ: THE MILL, 5 Jalan Kilang, Singapore 159405<br>
[robotimize.tech](https://www.robotimize.tech) · [info@robotimize.tech](mailto:info@robotimize.tech)

## Licence

MIT
