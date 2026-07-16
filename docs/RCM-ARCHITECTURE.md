# Plexus RCM — provider-service architecture and evidence

## Product decision

Plexus RCM is positioned as a **technology-enabled revenue cycle management provider for rehabilitation service organisations**, not as a generic billing widget. The prototype connects clinical-operational context to a separated synthetic financial workflow so executives, access teams, billers, denial teams, patient-account teams and clinical-documentation reviewers can work from one explainable operating picture.

The current GitHub Pages application is deliberately a safe demonstration boundary. It creates no claim, eligibility, authorisation, status, remittance or patient-collection transaction. The visible product architecture is designed to make the future service model testable without implying that a static browser application is production RCM infrastructure.

## Research synthesis

Three findings shaped the build:

1. Revenue cycle work begins before a claim. CMS identifies adopted electronic transactions for eligibility, claim status, authorisation/referrals, claims and payment/remittance. The service therefore begins with access and authorisation, rather than only displaying submitted claims.
2. Rehabilitation claim readiness depends on clinical documentation context. CMS outpatient rehabilitation guidance identifies plan-of-care and progress/documentation requirements that support medical necessity. Plexus RCM exposes evidence-presence prompts but leaves clinical necessity, coding and billability to qualified people.
3. A provider service needs operational ownership. Official rehabilitation RCM products from WebPT and Raintree describe end-to-end billing/RCM operations, while Waystar describes denial prevention and recovery tooling. The prototype therefore combines work queues, assignment, follow-up, root-cause views and organisation-level performance instead of presenting analytics alone.

This synthesis does not adopt vendor performance claims or proprietary workflows. It uses the official vendor pages only to benchmark the breadth and vocabulary of the category.

## Service stack

| Service layer | User outcome | Prototype capability | Production integration target |
|---|---|---|---|
| Access and authorisation | Reduce avoidable front-end rework | Eligibility/auth exceptions, visit utilisation, human watchlist | 270/271; 278; payer portals/APIs; benefit and auth audit |
| Revenue integrity | Find documentation and workflow gaps before release | Six-point explainable readiness checklist | EHR documentation, contract rules, coding edits, attachments |
| Claims and status | Give teams one lifecycle queue | Filterable synthetic episodes and review detail | 837P; acknowledgements; 276/277; clearinghouse edit responses |
| Denial prevention and recovery | Prioritise recoverable work and root causes | Denial mix, balance queue, filing-age signal, local follow-up | 835/claim responses, appeal workflow, payer correspondence |
| Payments and A/R | Make balances and ageing visible | Synthetic payer/patient payments and four ageing bands | 835 posting, lockbox/payments, adjustments, reconciliation |
| Patient financial experience | Make responsibility and estimates understandable | Patient-responsibility context and explicit prototype boundary | Good-faith estimates where applicable, statements, payment plans, consent |
| Performance intelligence | Manage financial performance at each operating level | Payer, site and PT/OT/SLP comparisons with formulas | Contract-normalised measures, finance reconciliation, governed semantic layer |

## Information architecture

The top-level `Plexus RCM` destination opens one command screen. Seven supporting layers remain behind explicit buttons:

- **Command:** six KPIs, a seven-item priority queue and six service-entry cards.
- **Coverage:** eligibility/authorisation watchlist and remaining-visit context.
- **Claims:** searchable and filterable full queue.
- **Denials:** root-cause distribution, balance exposure and recovery queue.
- **Payments & A/R:** ageing and payer performance.
- **Performance:** site and discipline comparisons.
- **Safeguards:** scope, transaction map, rehabilitation controls and official evidence.
- **Claim detail:** financial summary, readiness evidence, authorisation use, traceability and local assignment.

This progressive-disclosure model keeps each screen task-focused while preserving access to the full workflow.

## Synthetic data and calculations

One synthetic RCM episode is deterministically derived for each of the 72 bundled cases. It links only to local case/session IDs and contains no real payer response, fee schedule or patient data. The financial values are demonstration inputs, not reimbursement predictions.

The primary measures are transparent:

- **First-pass acceptance** = submitted episodes without a recorded synthetic denial ÷ submitted episodes.
- **Denial rate** = denied episodes ÷ adjudicated episodes.
- **Weighted A/R age** = Σ(outstanding balance × age in days) ÷ total outstanding balance.
- **Outstanding A/R** = allowed amount − payer payment − patient payment, floored at zero.
- **Priority score** = a deterministic combination of balance, age, workflow state, missing readiness evidence and filing-age signal; locally marking an item reviewed reduces, but does not remove, its priority.

Metric labels deliberately avoid ambiguous claims such as net collection rate because the prototype has no governed contract-adjustment, bad-debt or denominator policy.

## Standards boundary

For the US outpatient rehabilitation demonstration, the workflow map uses the transaction families listed by CMS:

- X12 270/271 — eligibility and benefit inquiry/response
- X12 278 — prior authorisation and referral
- X12 837P — professional claim
- X12 276/277 — claim status inquiry/response
- X12 835 — payment and remittance advice

HL7 FHIR financial resources are a separate API-planning concern. `CoverageEligibilityRequest/Response`, `Claim/ClaimResponse`, `ExplanationOfBenefit` and `Task` can support interoperability architecture, but this design does not present FHIR as a replacement for adopted transactions, payer companion guides, implementation testing or trading-partner agreements.

The CMS Interoperability and Prior Authorization final rule adds relevant API and process requirements for impacted payers. Any implementation must evaluate applicability, dates, payer scope and current guidance rather than inferring compliance from this prototype.

## Human and operational safeguards

- No automated CPT or diagnosis-code selection.
- No autonomous medical-necessity, coverage, billability or appeal decision.
- No live eligibility, authorisation or claim-status response.
- No claim or appeal submission, remittance posting, patient statement or collection action.
- No real patient, subscriber, claim or financial information in the public prototype.
- Every work item is synthetic, every readiness exception is explainable, and every follow-up stays local.
- Production actions require role-based access, approval authority, immutable audit events, reconciliation and exception handling.

## Production architecture roadmap

### 1. Governed foundation

- Define jurisdiction, entity roles, covered workflows and service-level ownership.
- Establish HIPAA/privacy and security architecture where applicable, data retention, minimum-necessary access, encryption, key management, logging and incident response.
- Separate tenant data, production/test environments and clinical/financial permissions.
- Create a governed metric dictionary with finance and compliance sign-off.

### 2. Integration and workflow

- Add EHR/practice-management adapters and a clearinghouse/trading-partner boundary.
- Implement idempotent transaction ingestion, acknowledgements, correlation IDs, retries, dead-letter handling and reconciliation.
- Represent authorisation, claim, denial and payment as auditable state machines rather than UI labels.
- Retain source payload provenance without exposing sensitive content in general work queues.

### 3. Provider-service operations

- Configure role queues, escalation rules, quality sampling and payer-specific playbooks.
- Add work capacity, ageing, turnaround and resolution controls.
- Separate patient communications from payer/claim operations with appropriate consent, language and accessibility controls.
- Validate calculations against the accounting and practice-management systems of record.

### 4. Intelligence

- Begin with governed rules and descriptive analytics.
- If predictive prioritisation is introduced, document intended use, training data, protected-class and payer bias review, calibration, drift, human factors and override/audit behavior.
- Never infer medical necessity, coverage or coding from a model without an authorised human decision and appropriate validation.

## Primary and official sources

- [CMS — Adopted Standards and Operating Rules](https://www.cms.gov/priorities/key-initiatives/burden-reduction/administrative-simplification/hipaa/adopted-standards-operating-rules)
- [CMS — Health Care Transactions Basics](https://www.cms.gov/priorities/key-initiatives/burden-reduction/administrative-simplification/transactions)
- [CMS — Medicare Benefit Policy Manual, Chapter 15](https://www.cms.gov/regulations-and-guidance/guidance/manuals/downloads/bp102c15.pdf)
- [CMS — Medicare Claims Processing Manual, Chapter 5](https://www.cms.gov/regulations-and-guidance/guidance/manuals/downloads/clm104c05.pdf)
- [CMS — Outpatient Rehabilitation Therapy Documentation Requirements](https://www.cms.gov/files/document/mln905365-complying-outpatient-rehabilitation-therapy-documentation-requirements.pdf)
- [CMS — Interoperability and Prior Authorization Final Rule](https://www.cms.gov/newsroom/fact-sheets/cms-interoperability-prior-authorization-final-rule-cms-0057-f)
- [CMS — Good Faith Estimate guide](https://www.cms.gov/medical-bill-rights/help/guides/good-faith-estimate)
- [HL7 FHIR R4 — Financial Module](https://hl7.org/fhir/R4/financial-module.html)
- [CAQH — 2023 Index Report](https://www.caqh.org/hubfs/43908627/drupal/2024-01/2023_CAQH_Index_Report.pdf)

## Official category benchmarks

- [WebPT — RCM Service](https://www.webpt.com/products/rcm-service)
- [Raintree — RCM and Billing](https://www.raintreeinc.com/rcm-and-billing/)
- [Waystar — Denial and Appeal Management](https://www.waystar.com/our-platform/denial-prevention-recovery/denial-appeal-management/)
