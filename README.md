# VivantePlexus™

**Rehabilitation intelligence by [Robotimize](https://www.robotimize.tech).**

VivantePlexus™ with Plexus AI is a browser-based, clinician-led rehabilitation intelligence prototype. It connects programme context, multidimensional therapy dose, functional outcomes and device-supported practice through transparent signals, structured summaries and local analytics.

The interface uses Robotimize's white, signature red and charcoal visual identity and the official Robotimize logo. It is responsive across desktop, tablet and mobile browsers.

## Live application

Once GitHub Pages is enabled for this repository, the application is available at:

```text
https://zenkoh.github.io/VivantePlexus.AI/
```

## Core capabilities

- Start from a streamlined single-screen Plexus AI command centre, then open Signals, Dose, Device IQ, Outcomes, Cases or Method as focused on-demand layers.
- Load 72 synthetic rehabilitation cases spanning stroke, spinal cord injury, traumatic and acquired brain injury, cerebral palsy across the lifespan, Parkinson's disease, multiple sclerosis, progressive and rare neurological pathways, vestibular and sensory disorders, complex trauma, limb loss, hip fracture, critical illness and cancer rehabilitation.
- Explore a second cohort of 36 alternative, evidence-informed cases with structured referral profile, presentation, participation priority, environment, complexity, multidisciplinary review focus and pathway-specific clinical boundaries.
- Review 216 synthetic therapy sessions and 144 outcome records.
- Track scheduled time, active practice, valid and attempted repetitions, movement quality, fatigue, pain, assistance, task challenge, specificity, rest breaks, home adherence and functional carryover.
- Maintain an editable equipment library and link one or more devices to each therapy session.
- Capture device mode, assistance, active contribution, range of motion, symmetry and calibration/data-quality context.
- Review Device IQ summaries for HandVivante™, GaitVivante™, ElevoVivante™, RevitaVivante™ and custom devices.
- Compare active practice and repetitions with expected dose to date using clinician-configured planned treatment days.
- Link dose, tolerance and equipment use with functional outcome trajectories.
- Generate a ranked top-five review queue with one primary signal per case, grouped secondary signals and visible calculations.
- Ask structured natural-language-style questions through Plexus Query without sending records to an external service.
- Review a source-grounded Plexus Brief and accept, dismiss or defer signals with a local audit trail.
- Open every one of the 72 cases in a dedicated comprehensive report layer covering clinical scenario, programme context, ICF-aligned goals, dose, tolerance, equipment response, outcomes, explainable signals, session chronology, provenance and limitations.
- Search reports by case, pathway or domain, filter by documentation status, print or export an individual report, and save a clinician-authored addendum separately from read-only computed evidence.
- Export CSV datasets, progress notes, FHIR-shaped JSON and complete JSON backups.
- Switch the complete workflow between English, Simplified Chinese, Spanish, French, German and Malay.
- Store data locally in the browser for an offline-first workflow.

## Product architecture

VivantePlexus™ is a static HTML, CSS and JavaScript application with no backend dependency. Plexus Query is a deterministic intent-and-calculation layer over local structured records; Plexus Brief is a templated structured summary; Plexus Signals combines transparent rules with simple within-case trend comparisons. There is no trained prediction model, generative-model endpoint or autonomous treatment recommendation in this release.

Every signal is labelled by method, exposes its inputs and calculation, reports data completeness, and remains subject to clinician review. The local-storage namespace is isolated from the original NeuroRehab Dose Tracker deployment so both applications can run on the same GitHub Pages domain without overwriting one another's browser data.

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

The automated suite verifies JavaScript syntax, all six language options, top-level and intelligence-layer navigation, additive 36-to-72 case migration, the capped and deduplicated AI queue, compact dose prioritisation, structured queries, clinician signal actions, all 72 comprehensive case-report routes, rich scenario fields for Cases 37–72, clinician-addendum persistence, device telemetry, equipment-to-session linkage, FHIR-shaped export relationships and data/export actions.

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

The design follows the principle that healthcare AI should augment professionals and allow independent review of each output's basis. Future predictive or generative capabilities require an intended-use decision, representative data, validation, human-factors testing, lifecycle monitoring and regulatory assessment before clinical claims are made.

## Evidence-informed design

The prototype deliberately keeps scheduled time, active practice, repetitions, quality, fatigue, pain, equipment and carryover as distinct fields. Therapy volume alone is not treated as a complete representation of dose or effectiveness.

Useful reference points include:

- [WHO rehabilitation fact sheet](https://www.who.int/news-room/fact-sheets/detail/rehabilitation)
- [WHO International Classification of Functioning, Disability and Health](https://www.who.int/standards/classifications/international-classification-of-functioning-disability-and-health)
- [NICE NG236: Stroke rehabilitation in adults](https://www.nice.org.uk/guidance/ng236/chapter/Recommendations)
- [WHO: International perspectives on spinal cord injury](https://www.who.int/publications/i/item/international-perspectives-on-spinal-cord-injury)
- [WHO: Wheelchair provision guidelines](https://www.who.int/publications/i/item/9789240074521)
- [NICE NG62: Cerebral palsy in under 25s](https://www.nice.org.uk/guidance/ng62/chapter/Recommendations)
- [NICE NG119: Cerebral palsy in adults](https://www.nice.org.uk/guidance/ng119/chapter/Recommendations)
- [NICE NG220: Multiple sclerosis in adults](https://www.nice.org.uk/guidance/ng220/chapter/Recommendations)
- [NICE NG71: Parkinson's disease in adults](https://www.nice.org.uk/guidance/ng71/chapter/Recommendations)
- [NICE NG42: Motor neurone disease](https://www.nice.org.uk/guidance/ng42/chapter/Recommendations)
- [NICE NG249: Falls assessment and prevention](https://www.nice.org.uk/guidance/ng249/chapter/Recommendations)
- [NICE NG157: Joint replacement](https://www.nice.org.uk/guidance/ng157/chapter/Recommendations)
- [NICE NG211: Rehabilitation after traumatic injury](https://www.nice.org.uk/guidance/ng211/chapter/Recommendations)
- [KITE-UHN: Brain injury rehabilitation guidelines](https://kite-uhn.com/brain-injury/en)
- [NICE CG124: Hip fracture management](https://www.nice.org.uk/guidance/cg124/chapter/Recommendations)
- [NICE CG83: Rehabilitation after critical illness](https://www.nice.org.uk/guidance/cg83/chapter/Recommendations)
- [JNPT: Vestibular rehabilitation for peripheral vestibular hypofunction](https://pmc.ncbi.nlm.nih.gov/articles/PMC8920012/)
- [JNNP: Physiotherapy for functional motor disorders](https://pmc.ncbi.nlm.nih.gov/articles/PMC4602268/)
- [HL7 FHIR Device](https://hl7.org/fhir/device.html)
- [HL7 FHIR R4 Composition](https://hl7.org/fhir/R4/composition.html)
- [HL7 FHIR R4 Procedure](https://hl7.org/fhir/R4/procedure.html)
- [Singapore HSA digital health and AI guidance](https://www.hsa.gov.sg/medical-devices/digital-health/)
- [FDA Clinical Decision Support Software guidance (January 2026)](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/clinical-decision-support-software)
- [IMDRF Good Machine Learning Practice principles](https://www.imdrf.org/documents/good-machine-learning-practice-medical-device-development-guiding-principles)

## Company

VivantePlexus™ is part of the Robotimize rehabilitation technology portfolio.

**ROBOTIMIZE PTE. LTD. (202237458N)**<br>
Global HQ: THE MILL, 5 Jalan Kilang, Singapore 159405<br>
[robotimize.tech](https://www.robotimize.tech) · [info@robotimize.tech](mailto:info@robotimize.tech)

## Licence

MIT
