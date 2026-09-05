# Plexus Operations architecture and metric boundaries

Plexus Operations is a browser-local operational-intelligence module for VivantePlexus™. It answers a narrower question than the clinical AI workspace: **is rehabilitation technology being used, is capacity available, and is the underlying record complete enough to support credible operational reporting?**

## Why this module exists

The core application already records scheduled and active therapy time, repetitions, outcomes, equipment linkage and device context. Those records are clinically useful, but a rehabilitation provider also needs an operational layer that can turn them into transparent utilisation and reporting-readiness measures.

The module intentionally does **not** infer a utilisation denominator. A device cannot be called “30% utilised” merely because it was used for a certain number of sessions. Available capacity depends on staffing, opening hours, maintenance, room access, treatment duration and local workflow. Plexus Operations therefore asks the user to configure realistic weekly patient-facing capacity minutes for each device.

## Data flow

1. Read the existing browser-local `vivantePlexus.v1` clinical dataset.
2. Read separate operational configuration from `vivantePlexus.operations.v1`.
3. Select sessions in the current Monday–Sunday window.
4. Aggregate scheduled and active minutes by equipment.
5. Calculate utilisation only where capacity has been explicitly configured.
6. Calculate descriptive completeness measures from existing session, telemetry and outcome records.
7. Keep any reporting-time estimate as a user-entered scenario, not a measured productivity claim.

No data leaves the browser and no external model or API is called.

## Metric definitions

### Equipment utilisation

`scheduled device-linked therapy minutes / configured weekly patient-facing capacity minutes`

The result is not capped at 100%. A value above 100% is surfaced as an over-capacity signal because it may indicate that the denominator is stale, the device is double-booked, or the configured capacity assumption is wrong.

### Active-practice conversion

`active therapy minutes / scheduled therapy minutes`

This describes recorded session structure. It is not an effectiveness metric.

### Equipment linkage completeness

`weekly sessions with at least one equipment link / all weekly sessions`

### Session-documentation completeness

Share of expected descriptive session fields that contain a recorded value. Numeric zero is treated as a valid recorded value.

### Device-telemetry completeness

Share of selected device-context fields recorded across equipment-linked sessions.

### Outcome coverage

`cases with at least one outcome record / all cases`

This is a presence measure, not a statement about the appropriateness, timing or psychometric quality of the outcome instrument.

### Reporting-burden scenario

The user may enter a baseline number of minutes per report, a current number of minutes per report and reports per month. The module calculates the arithmetic difference. These fields are explicitly labelled as a scenario and must not be represented as validated time savings without prospective measurement.

## Product boundary

Plexus Operations does not estimate staffing need, return on investment, reimbursement, clinical effectiveness, purchasing need or medical necessity. Those questions require additional inputs and validation.

## Next production steps

A production implementation should replace browser-local configuration with organisation-level capacity calendars, add role-based access and audit history, measure reporting time prospectively, distinguish planned downtime from unused capacity, support site/service-line filters, and validate operational definitions with participating rehabilitation providers before any economic claims are made.
