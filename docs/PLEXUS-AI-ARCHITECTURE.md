# Plexus AI: meaningful intelligence architecture

## Product position

Plexus AI is an explainable rehabilitation-intelligence workbench for licensed-team review. Its first useful job is not to imitate a clinician. It is to reduce the effort required to find, understand and evaluate relevant longitudinal records while keeping the source evidence, uncertainty and human decision visible.

This build is a technical demonstration over 72 synthetic cases, 216 synthetic sessions and 144 synthetic outcome records. It has no external model endpoint and makes no claim of clinical validity, patient benefit, diagnosis, prognosis or treatment effectiveness.

## Why these capabilities were selected

The repository already contained strong structured inputs: programme targets, session exposure, repetitions, quality, fatigue, discomfort, task context, carryover, equipment telemetry, outcomes and clinician signal actions. The highest-value next step was therefore to make those records easier to compare and evaluate—not to add an ungrounded conversational model.

| User job | Implemented intelligence | Immediate value | Boundary |
| --- | --- | --- | --- |
| Understand short records | Within-case trajectory estimates | Compress repeated indicators into a reviewable direction, range, sample size and fit | Describes the next record under a simple local fit; does not predict recovery |
| Find relevant context | Explainable comparable-case retrieval | Locates synthetic records with similar pathway, domain, phase, targets and recent indicators | Similarity is not treatment-effect evidence or prognosis |
| Explore operational assumptions | Bounded exposure scenario | Makes scheduling, delivery and active-practice assumptions explicit | Calculates exposure only; does not recommend dose or predict benefit |
| Prove workflow value | Value register and pilot measures | Separates measurable workflow indicators from untested benefit hypotheses | Queue compression is not time saved; usefulness is not clinical accuracy |
| Govern deployment | Model/system card and production gates | Keeps intended use, exclusions, methods, validation status and sources beside the output | Prototype remains synthetic and not clinically validated |

## Implemented methods

### 1. Short-window trajectory review

For each selected case, the browser fits separate ordinary least-squares lines over the available active minutes, valid repetitions, movement-quality and fatigue observations. Each card exposes:

- the number of observations;
- the next-record point estimate;
- an illustrative variability range derived from residual and observed spread;
- the coefficient of determination (R²); and
- the underlying indicator trace.

The calculation is intentionally simple and inspectable. The range is not a calibrated prediction interval, and the estimate must not be interpreted as a recovery forecast.

### 2. Mixed-data comparable-case retrieval

The retrieval layer uses a Gower-style weighted similarity over categorical and numeric inputs:

- pathway: 24%;
- rehabilitation domain: 20%;
- care phase: 10%;
- weekly active-minute target: 10%;
- weekly repetition target: 10%;
- recent movement quality: 10%;
- recent fatigue: 8%; and
- active-practice conversion: 8%.

The five highest-scoring synthetic neighbours are returned with the strongest contributing similarities. The selected case is excluded, scores are bounded from 0–100, and no causal or outcome recommendation is produced.

### 3. Therapy-exposure scenario

The scenario layer uses one transparent equation:

```text
sessions × scheduled minutes × delivery percentage × active-practice conversion percentage
= projected active minutes
```

Illustrative valid repetitions preserve the selected case's recent repetitions-per-active-minute ratio. All controls are bounded. This is a planning arithmetic tool, not a treatment planner.

### 4. Workflow value instrumentation

The build measures linked source-record volume, top-five review-set compression, longitudinal data readiness, explainability coverage and locally stored usefulness feedback. It also identifies the prospective measures needed to substantiate operational claims: review time, completion, overrides, exception resolution, subgroup coverage and calibrated trust.

No cost saving, staff-hour saving, clinical-effectiveness or return-on-investment value is invented from the synthetic dataset.

### 5. Assurance and evaluation

The Assurance mode publishes the current system card in the interface:

- intended users and tasks;
- explicitly excluded decisions;
- methods and data health;
- prototype validation status;
- six production gates; and
- direct links to governance and evaluation references.

An evaluation packet can be exported as JSON. Human usefulness feedback is stored under `vivantePlexus.aiLab.v1`, separate from the clinical demonstration namespace.

## Safety and regulatory design

The product boundary reflects the FDA's distinction between decision support that lets a health professional independently review its basis and software functions that may be regulated as devices. Every analytical output therefore exposes its inputs or method and retains a human-review statement. Regulatory status still depends on final intended use, claims, users and jurisdiction; the prototype does not determine its own classification.

The lifecycle model combines:

- WHO principles for autonomy, safety, transparency, accountability, equity and sustainability;
- NIST AI RMF functions: Govern, Map, Measure and Manage;
- TRIPOD+AI reporting expectations for prediction-model studies;
- PROBAST+AI risk-of-bias and applicability assessment; and
- DECIDE-AI early-stage clinical evaluation and human-factors evidence.

These references do not validate the implemented algorithms. They define work that a production programme must complete.

## Production gates

1. **Intended use and regulatory assessment:** define users, workflow decisions, claims, jurisdictions and software classification.
2. **Representative data and reference standard:** document sites, population, outcomes, timing, missingness and label quality.
3. **External and subgroup validation:** evaluate calibration, error, utility and failure modes across settings and relevant subgroups.
4. **Human-factors evaluation:** test comprehension, automation bias, source review, overrides, workload and hand-offs.
5. **Prospective clinical and operational evaluation:** pre-register endpoints and stop criteria; measure safety and value before scaling claims.
6. **Lifecycle monitoring:** govern drift, incidents, version changes, rollback, security, privacy and decommissioning.

## Recommended next increments

The next production work should be sequenced by evidence readiness rather than novelty:

1. Instrument review time, override reason, source-open rate and false-reassurance events in a synthetic/usability pilot.
2. Define data contracts and validation rules for EHR, device and outcome-measure integrations.
3. Establish a clinician-led annotation protocol and a representative multi-site evaluation dataset.
4. Pre-specify subgroup, missing-data, calibration and utility analyses before fitting any endpoint model.
5. Add role-based access, audit logging, consent, retention, encryption, incident handling and change control.
6. Only after the intended-use and validation gates, consider a versioned model service or retrieval-augmented language layer with source citations, constrained outputs, abstention and monitored human override.

## Research basis

- [FDA Clinical Decision Support Software guidance, updated January 2026](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/clinical-decision-support-software)
- [WHO Ethics and governance of artificial intelligence for health](https://www.who.int/publications/i/item/9789240029200)
- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)
- [TRIPOD+AI reporting guideline, BMJ 2024](https://www.bmj.com/content/385/bmj-2023-078378)
- [PROBAST+AI risk-of-bias tool, BMJ 2025](https://www.bmj.com/content/388/bmj-2024-082505)
- [DECIDE-AI reporting guideline, Nature Medicine](https://www.nature.com/articles/s41591-022-01772-9)
- [PREP algorithm development](https://pubmed.ncbi.nlm.nih.gov/22689909/)
- [PREP2 external validation](https://pubmed.ncbi.nlm.nih.gov/33218284/)
- [PREP2 implementation study](https://pubmed.ncbi.nlm.nih.gov/33827826/)

PREP/PREP2 is included as an example of the development, external-validation and implementation evidence expected of a real rehabilitation prediction tool. Plexus AI's local trajectory demonstration is not PREP/PREP2 and must not be presented as equivalent.
