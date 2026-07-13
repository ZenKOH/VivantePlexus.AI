(function () {
  "use strict";

  let activeReportCaseId = null;
  let reportLayer = "index";
  let reportQuery = "";
  let reportStatus = "all";

  const latestFirst = (a, b) => String(b.date || "").localeCompare(String(a.date || ""));
  const mean = (values) => {
    const clean = values.map(Number).filter(Number.isFinite);
    return clean.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : 0;
  };
  const total = (values) => values.reduce((sum, value) => sum + n(value), 0);
  const round = (value, digits = 1) => Number(value || 0).toFixed(digits);
  const safeId = (value) => String(value || "case").replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  const reportDraft = (caseId) => state.reportDrafts?.[caseId] || null;
  const reportState = (caseId) => reportDraft(caseId)?.status || "Not started";

  const REPORT_SOURCES = {
    icf: {
      label: "WHO ICF",
      href: "https://www.who.int/standards/classifications/international-classification-of-functioning-disability-and-health",
    },
    fhir: {
      label: "HL7 FHIR Composition",
      href: "https://hl7.org/fhir/R4/composition.html",
    },
    Stroke: {
      label: "NICE NG236 · Stroke rehabilitation",
      href: "https://www.nice.org.uk/guidance/ng236/chapter/Recommendations",
    },
    "Spinal cord injury": {
      label: "WHO · International perspectives on spinal cord injury",
      href: "https://www.who.int/publications/i/item/international-perspectives-on-spinal-cord-injury",
    },
    "Cerebral palsy": {
      label: "NICE NG62 · Cerebral palsy",
      href: "https://www.nice.org.uk/guidance/ng62/chapter/Recommendations",
    },
    "Multiple sclerosis": {
      label: "NICE NG220 · Multiple sclerosis",
      href: "https://www.nice.org.uk/guidance/ng220/chapter/Recommendations",
    },
    "Parkinson's disease": {
      label: "NICE NG71 · Parkinson’s disease",
      href: "https://www.nice.org.uk/guidance/ng71/chapter/Recommendations",
    },
    "Frailty / falls risk": {
      label: "NICE NG249 · Falls assessment and prevention",
      href: "https://www.nice.org.uk/guidance/ng249/chapter/Recommendations",
    },
    "Post-surgical rehabilitation": {
      label: "NICE NG157 · Joint replacement",
      href: "https://www.nice.org.uk/guidance/ng157/chapter/Recommendations",
    },
    wheelchair: {
      label: "WHO · Wheelchair provision guidelines",
      href: "https://www.who.int/publications/i/item/9789240074521",
    },
    jointReplacement: {
      label: "NICE NG157 · Joint replacement",
      href: "https://www.nice.org.uk/guidance/ng157/chapter/Recommendations",
    },
    ALS: {
      label: "NICE NG42 · Motor neurone disease",
      href: "https://www.nice.org.uk/guidance/ng42/chapter/Recommendations",
    },
    rehabilitation: {
      label: "WHO · Rehabilitation in health systems",
      href: "https://www.who.int/news-room/fact-sheets/detail/rehabilitation",
    },
    "adult-cp": {
      label: "NICE NG119 · Cerebral palsy in adults",
      href: "https://www.nice.org.uk/guidance/ng119/chapter/Recommendations",
    },
    tbi: {
      label: "KITE-UHN · Brain injury rehabilitation guidelines",
      href: "https://kite-uhn.com/brain-injury/en",
    },
    mnd: {
      label: "NICE NG42 · Motor neurone disease",
      href: "https://www.nice.org.uk/guidance/ng42/chapter/Recommendations",
    },
    vestibular: {
      label: "JNPT 2022 · Vestibular rehabilitation clinical practice guideline",
      href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8920012/",
    },
    pppd: {
      label: "Bárány Society · PPPD consensus criteria",
      href: "https://doi.org/10.3233/VES-170622",
    },
    fnd: {
      label: "JNNP · Functional motor disorder physiotherapy consensus",
      href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4602268/",
    },
    ataxia: {
      label: "Friedreich ataxia clinical management guidelines",
      href: "https://frdaguidelines.org/",
    },
    "traumatic-injury": {
      label: "NICE NG211 · Rehabilitation after traumatic injury",
      href: "https://www.nice.org.uk/guidance/ng211/chapter/Recommendations",
    },
    "limb-loss": {
      label: "NICE NG211 · Rehabilitation after limb loss",
      href: "https://www.nice.org.uk/guidance/ng211/chapter/Recommendations",
    },
    "nerve-injury": {
      label: "NICE NG211 · Rehabilitation after nerve injury",
      href: "https://www.nice.org.uk/guidance/ng211/chapter/Recommendations",
    },
    "hip-fracture": {
      label: "NICE CG124 · Hip fracture management",
      href: "https://www.nice.org.uk/guidance/cg124/chapter/Recommendations",
    },
    "critical-illness": {
      label: "NICE CG83 · Rehabilitation after critical illness",
      href: "https://www.nice.org.uk/guidance/cg83/chapter/Recommendations",
    },
  };
  Object.assign(REPORT_SOURCES, {
    stroke: REPORT_SOURCES.Stroke,
    sci: REPORT_SOURCES["Spinal cord injury"],
    parkinson: REPORT_SOURCES["Parkinson's disease"],
    ms: REPORT_SOURCES["Multiple sclerosis"],
    neuromuscular: REPORT_SOURCES.rehabilitation,
    huntington: REPORT_SOURCES.rehabilitation,
    hsp: REPORT_SOURCES.rehabilitation,
    "peripheral-neuropathy": REPORT_SOURCES["Frailty / falls risk"],
    "transverse-myelitis": REPORT_SOURCES["Spinal cord injury"],
    "spina-bifida": REPORT_SOURCES.wheelchair,
    "cancer-rehab": REPORT_SOURCES.rehabilitation,
  });

  function reportSources(c) {
    const pathway = c.evidenceKey
      ? REPORT_SOURCES[c.evidenceKey] || REPORT_SOURCES.rehabilitation
      : /ALS/i.test(c.label)
        ? REPORT_SOURCES.ALS
        : REPORT_SOURCES[c.diagnosis];
    const context = [
      /Wheelchair|Spina Bifida|Technology Access/i.test(c.label)
        ? REPORT_SOURCES.wheelchair
        : null,
      /TKA|Post-op Hip/i.test(c.label) && c.diagnosis !== "Post-surgical rehabilitation"
        ? REPORT_SOURCES.jointReplacement
        : null,
    ];
    return [
      ...new Map(
        [REPORT_SOURCES.icf, pathway, ...context, REPORT_SOURCES.fhir]
          .filter(Boolean)
          .map((source) => [source.href, source]),
      ).values(),
    ];
  }

  function pathwayLens(c) {
    const pathway = {
      Stroke: [
        "Relate impairment findings to activity and participation, not diagnosis alone.",
        "Review meaningful short- and long-term goals, multidisciplinary progress and transfer across settings.",
        "Keep communication, cognition, emotion, environment and support needs visible where relevant.",
      ],
      "Spinal cord injury": [
        "Review mobility or self-care performance together with assistance, equipment and environmental context.",
        "Separate task completion from independence, efficiency, tolerance and participation.",
        "Track whether device-supported gains transfer to the intended home or community task.",
      ],
      "Traumatic brain injury": [
        "Review physical performance alongside cognition, pacing, error awareness and environmental complexity.",
        "Compare structured practice with real-world participation and the level of cueing required.",
        "Interpret short trends cautiously when task or setting changed between sessions.",
      ],
      "Cerebral palsy": [
        "Keep functional abilities, participation priorities and the person or family’s goals central.",
        "Review performance across home, education and community environments, including equipment context.",
        "Distinguish capacity in a session from usual performance and supported carryover.",
      ],
      "Parkinson's disease": [
        "Review motor performance, daily activity and participation in the context of timing, cueing and setting.",
        "Use domain-relevant review across mobility, balance, daily activity or communication.",
        "Record fluctuations and assistance explicitly before interpreting a change as trajectory.",
      ],
      "Multiple sclerosis": [
        "Interpret function together with fatigue, heat or stress context and day-to-day variability.",
        "Review goal priorities, activity tolerance and the sustainability of participation outside sessions.",
        "Avoid attributing every change to the pathway without checking other recorded context.",
      ],
      "Frailty / falls risk": [
        "Link strength or balance observations to transfers, walking confidence and everyday participation.",
        "Review assistance, environmental demands and carryover rather than dose in isolation.",
        "Interpret tolerance and quality together when challenge or setting changes.",
      ],
      "Post-surgical rehabilitation": [
        "Frame progress around the recorded functional goal, phase, precautions and task quality.",
        "Review exposure, tolerance and movement performance as separate dimensions.",
        "Keep outcome conditions and assistive-device context visible when comparing values.",
      ],
      "Orthopaedic / MSK rehabilitation": [
        "Relate movement control and tolerance to the case-specific daily or community task.",
        "Track symmetry, assistance and device context alongside volume.",
        "Use recorded milestones and outcomes without inferring readiness from one metric alone.",
      ],
      "Other neurological condition": [
        "Use a person-centred function and participation frame while preserving pathway-specific clinical context.",
        "Review task quality, tolerance, assistance, equipment and carryover as distinct observations.",
        "Treat short-window patterns as prompts for source-record review, not predictions.",
      ],
      "Motor neurone disease": [
        "Treat maintenance, timely adaptation, comfort, communication and supported participation as valid outcomes.",
        "Review changing assistance, equipment, caregiver sustainability and time-of-day context together.",
        "Coordinate interpretation with the specialist multidisciplinary record rather than extrapolating a short trend.",
      ],
      "Neuromuscular condition": [
        "Review sustainable function, posture, equipment and participation across the whole day.",
        "Separate capacity in an early session from later-day access, fatigue and supported performance.",
        "Keep specialist respiratory, cardiac, seating and skin-management context visible where applicable.",
      ],
      "Huntington's disease": [
        "Review mobility together with cognition, communication, cueing and the predictability of meaningful routines.",
        "Record support and environmental complexity before interpreting a stable speed as stable participation.",
        "Use short-window trends as review prompts in the context of a progressive, variable pathway.",
      ],
      "Friedreich ataxia": [
        "Frame progress around safe strategy, maintenance, fatigue, assistance and personally meaningful participation.",
        "Retain surface, support and equipment context when comparing coordination or transfer performance.",
        "Coordinate conclusions with the specialist record and relevant multisystem monitoring.",
      ],
      "Hereditary spastic paraplegia": [
        "Review walking purpose, aid or orthotic context, foot clearance, fatigue and recovery together.",
        "Treat mobility choice and participation as outcomes, not walking speed alone.",
        "Avoid attributing change without checking task distance, surface and measurement conditions.",
      ],
      "Vestibular hypofunction": [
        "Retain diagnostic scope, head-movement condition, visual complexity, balance and recovery context.",
        "Interpret exposure dose alongside symptom response and meaningful community participation.",
        "Do not generalise a peripheral vestibular protocol to a different vestibular or neurological condition.",
      ],
      "Persistent postural-perceptual dizziness": [
        "Review visual and postural exposure, confidence, avoidance, symptom response and recovery in context.",
        "Keep the specialist formulation and interdisciplinary plan visible when interpreting variability.",
        "Separate meaningful participation gain from symptom score change alone.",
      ],
      "Peripheral neuropathy": [
        "Retain lighting, surface, footwear, sensation, skin and aid context in every mobility comparison.",
        "Link balance findings to essential home or community tasks and near-fall history.",
        "Review compensatory environmental strategies alongside impairment-focused practice.",
      ],
      "Functional neurological disorder": [
        "Use the agreed specialist diagnosis and shared explanatory model consistently across the team.",
        "Treat variability as clinically informative while avoiding assumptions about effort or intent.",
        "Review automatic movement, attention, confidence, function and carryover in meaningful tasks.",
      ],
      "Transverse myelitis": [
        "Review mobility together with sensory, autonomic, skin, fatigue and equipment context.",
        "Keep walking, transfers and wheeled mobility aligned to the person's essential participation goals.",
        "Interpret recovery cautiously and escalate new or sustained neurological change to the specialist team.",
      ],
      "Spina bifida": [
        "Prioritise self-direction, accessible environments, equipment and participation across life transitions.",
        "Review task completion together with skin, transfer, wheelchair and support-plan context.",
        "Distinguish physical independence from effective direction of appropriate assistance.",
      ],
      "Complex traumatic injury": [
        "Preserve current restrictions, multi-region impairments, pain, equipment and environmental context.",
        "Review the whole meaningful task because progress in one component may increase demand elsewhere.",
        "Use the multidisciplinary rehabilitation plan and current surgical record as the authoritative boundaries.",
      ],
      "Limb loss rehabilitation": [
        "Review function, comfort, interface response, device configuration, personal preference and participation together.",
        "Do not treat wear time or device use as a sufficient outcome without task value and tolerance.",
        "Keep prosthetic-service review and the person's chosen bimanual priorities visible.",
      ],
      "Peripheral nerve injury": [
        "Retain surgical protection, tissue status, sensory safety and task demand when interpreting practice volume.",
        "Review selective movement and real-task accuracy rather than repetition count alone.",
        "Coordinate conclusions with the current hand-surgery and therapy protocol.",
      ],
      "Hip fracture rehabilitation": [
        "Review mobility, transfers, pain, cognition, falls risk, equipment and return-to-residence goals together.",
        "Retain aid, assistance and surface conditions when comparing performance.",
        "Use coordinated orthogeriatric and community plans to interpret the recovery trajectory.",
      ],
      "Post-critical illness rehabilitation": [
        "Review physical, cognitive, communication and psychosocial function across the rehabilitation pathway.",
        "Relate gains to activities of daily living, participation, equipment and formal handover needs.",
        "Do not infer whole-person readiness from one mobility or endurance measure.",
      ],
      "Cancer rehabilitation": [
        "Interpret activity and fatigue within the current oncology and rehabilitation plan.",
        "Review participation, symptoms, recovery, treatment schedule and support context together.",
        "Treat dose patterns as documentation signals, never as independent medical clearance.",
      ],
    };
    const domain = {
      "Upper limb": "For this upper-limb report, retain reach, grasp, release, compensation and bimanual or daily-task transfer context.",
      Gait: "For this gait report, retain walking purpose, setting, assistance, symmetry, tolerance and community transfer context.",
      Balance: "For this balance report, retain task conditions, support, turning or reaching demands and functional confidence context.",
      Cognition: "For this cognition report, retain cueing, task complexity, error awareness and participation context.",
      "Speech / swallowing": "For this communication-focused report, retain participation, communication-partner support and task conditions; source clinical records remain authoritative.",
      "ADL / participation": "For this participation report, retain assistance, environment, equipment and the person-defined purpose of the activity.",
      "Functional task practice": "For this functional-task report, retain task components, assistance, quality, environmental demands and transfer.",
      "Mixed programme": "For this mixed programme, interpret each component against the shared functional goal rather than combining unlike measures.",
    }[c.domain];
    return [domain, ...(pathway[c.diagnosis] || pathway["Other neurological condition"])].filter(Boolean);
  }

  function caseReportMetrics(c) {
    const sessions = sessionsFor(c.id).slice().sort(latestFirst);
    const weekly = sessions.filter((session) => inWeek(session.date));
    const outcomes = outcomesFor(c.id).slice().sort(latestFirst);
    const scheduled = total(weekly.map((session) => session.minutes));
    const active = total(weekly.map((session) => session.activeMinutes));
    const reps = total(weekly.map((session) => session.reps));
    const attempted = total(
      weekly.map((session) =>
        session.attemptedReps == null ? session.reps : session.attemptedReps,
      ),
    );
    const assessed = weekly.filter((session) => session.carryover !== "Not assessed");
    const positive = assessed.filter((session) =>
      ["Yes, in daily activity", "Partial"].includes(session.carryover),
    );
    const deviceSessions = weekly.filter((session) => (session.equipmentIds || []).length);
    const equipment = [
      ...new Map(
        sessions
          .flatMap((session) => equipmentForSession(session))
          .map((item) => [item.id, item]),
      ).values(),
    ];
    const signals = globalThis.PlexusAI?.caseSignals?.(c) || [];
    const expectedFraction = globalThis.PlexusAI?.weekProgressFor?.(c) ?? 1;
    const expectedMinutes = Math.round(n(c.weeklyMinutes) * expectedFraction);
    const expectedReps = Math.round(n(c.weeklyReps) * expectedFraction);
    const contribution = weekly
      .map((session) => session.activeContribution)
      .filter((value) => value != null && Number.isFinite(Number(value)));
    const deviceAssistance = weekly
      .map((session) => session.deviceAssistance)
      .filter((value) => value != null && Number.isFinite(Number(value)));
    const calibrationIssues = weekly.filter(
      (session) =>
        session.calibrationStatus &&
        !["Valid", "Not recorded"].includes(session.calibrationStatus),
    );
    return {
      sessions,
      weekly,
      outcomes,
      scheduled,
      active,
      reps,
      attempted,
      assessed,
      positive,
      equipment,
      deviceSessions,
      signals,
      expectedMinutes,
      expectedReps,
      conversion: scheduled ? Math.round((active / scheduled) * 100) : 0,
      validRate: attempted ? Math.round((reps / attempted) * 100) : 0,
      quality: mean(weekly.map((session) => session.quality)),
      fatigue: mean(weekly.map((session) => session.fatigue)),
      pain: mean(weekly.map((session) => session.pain)),
      peakFatigue: weekly.length ? Math.max(...weekly.map((session) => n(session.fatigue))) : 0,
      peakPain: weekly.length ? Math.max(...weekly.map((session) => n(session.pain))) : 0,
      restBreaks: total(weekly.map((session) => session.restBreaks)),
      carryRate: assessed.length ? Math.round((positive.length / assessed.length) * 100) : null,
      contribution: contribution.length ? Math.round(mean(contribution)) : null,
      deviceAssistance: deviceAssistance.length ? Math.round(mean(deviceAssistance)) : null,
      calibrationIssues,
      completeness: signals[0]?.completeness ?? 0,
    };
  }

  function executiveSummary(c, metrics) {
    const primary = metrics.signals[0];
    const outcome = metrics.outcomes[0];
    const dose = metrics.weekly.length
      ? `${metrics.active} active minutes and ${metrics.reps.toLocaleString()} valid repetitions are recorded in ${metrics.weekly.length} current-week session${metrics.weekly.length === 1 ? "" : "s"}.`
      : "No current-week session is recorded.";
    const trajectory = outcome
      ? `${outcome.name} is recorded at ${outcome.current || "—"}, from ${outcome.baseline || "—"} toward ${outcome.target || "—"}; the stated scoring direction is ${outcome.direction.toLowerCase()}.`
      : "No linked outcome measure is recorded.";
    const signal = primary
      ? `The highest-ranked Plexus signal is “${primary.title}” (${primary.type.toLowerCase()}, ${primary.severity} priority).`
      : "No Plexus signal is available.";
    return `${c.label} is a synthetic ${c.phase.toLowerCase()} ${c.diagnosis.toLowerCase()} programme focused on ${c.primaryGoal.charAt(0).toLowerCase()}${c.primaryGoal.slice(1)} Goal status is ${c.goalStatus.toLowerCase()}. ${dose} ${trajectory} ${signal}`;
  }

  function reportMetric(label, value, note = "") {
    return `<div class="clinical-metric"><span>${e(label)}</span><strong>${e(value)}</strong>${note ? `<small>${e(note)}</small>` : ""}</div>`;
  }

  function renderReportIndex() {
    const target = $("reportCaseIndex");
    if (!target) return;
    const query = reportQuery.trim().toLowerCase();
    const cases = state.cases.filter((c) => {
      const matchesQuery = !query || [
        c.label,
        c.diagnosis,
        c.phase,
        c.domain,
        c.primaryGoal,
        ...Object.values(c.clinicalScenario || {}),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
      const matchesStatus = reportStatus === "all" || reportState(c.id) === reportStatus;
      return matchesQuery && matchesStatus;
    });
    const drafted = state.cases.filter((c) => reportState(c.id) !== "Not started").length;
    $("reportIndexSummary").innerHTML = `<div><strong>${cases.length}</strong><span>reports shown</span></div><div><strong>${state.cases.length}</strong><span>synthetic cases</span></div><div><strong>${drafted}</strong><span>clinician addenda</span></div><p>Select a case to open the full report layer. Search and status filters only change this index.</p>`;
    target.innerHTML = cases.length
      ? cases
          .map((c, index) => {
            const metrics = caseReportMetrics(c);
            const primary = metrics.signals[0];
            const outcome = metrics.outcomes[0];
            const statusValue = reportState(c.id);
            return `<button type="button" class="report-index-card" data-open-case-report="${e(c.id)}" aria-label="Open comprehensive report for ${e(c.label)}">
              <span class="report-card-number">${String(state.cases.indexOf(c) + 1).padStart(2, "0")}</span>
              <span class="report-card-copy"><span class="report-card-meta">${e(c.diagnosis)} · ${e(c.phase)}</span><strong>${e(c.label)}</strong><small>${e(c.primaryGoal)}</small></span>
              <span class="report-card-facts"><span>${metrics.active}/${c.weeklyMinutes} active min</span><span>${outcome ? `${e(outcome.name)} · ${e(outcome.current || "—")}` : "No outcome"}</span></span>
              <span class="report-card-signal ${e(primary?.severity || "good")}"><i></i>${e(primary?.title || "No active signal")}</span>
              <span class="report-card-status ${safeId(statusValue)}">${e(statusValue)}</span><span class="report-card-arrow" aria-hidden="true">→</span>
            </button>`;
          })
          .join("")
      : `<div class="empty-state report-empty"><strong>No matching reports</strong><p>Clear the search or choose another report status.</p></div>`;
  }

  function renderOutcomesSection(metrics) {
    return metrics.outcomes.length
      ? metrics.outcomes
          .map((outcome) => {
            const progress = outcomeProgress(outcome);
            return `<article class="report-outcome-card"><div><span>${e(outcome.name)}</span><time datetime="${e(outcome.date)}">${fmt(outcome.date)}</time></div><dl><div><dt>Baseline</dt><dd>${e(outcome.baseline || "—")}</dd></div><div><dt>Current</dt><dd>${e(outcome.current || "—")}</dd></div><div><dt>Target</dt><dd>${e(outcome.target || "—")}</dd></div></dl>${progress == null ? `<p>${e(outcome.direction)} · clinician interpretation required</p>` : `<div class="report-progress"><span style="width:${progress}%"></span></div><p>${progress}% of recorded target trajectory · ${e(outcome.direction)}</p>`}${outcome.note ? `<small>${e(outcome.note)}</small>` : ""}</article>`;
          })
          .join("")
      : `<p class="report-no-data">No outcome measures are linked to this case.</p>`;
  }

  function renderSignalsSection(metrics) {
    return metrics.signals.length
      ? metrics.signals
          .slice(0, 5)
          .map(
            (signal) => `<details class="report-signal ${e(signal.severity)}" ${signal === metrics.signals[0] ? "open" : ""}><summary><span class="badge ${e(signal.severity)}">${e(signal.severity)}</span><span><strong>${e(signal.title)}</strong><small>${e(signal.type)} · ${e(signal.category)} · score ${e(signal.score)}</small></span></summary><p>${e(signal.summary)}</p><dl><div><dt>Why it may matter</dt><dd>${e(signal.why)}</dd></div><div><dt>Clinician review</dt><dd>${e(signal.review)}</dd></div><div><dt>Calculation</dt><dd>${e(signal.calculation)}</dd></div></dl><ul>${signal.evidence.map((item) => `<li>${e(item)}</li>`).join("")}</ul></details>`,
          )
          .join("")
      : `<p class="report-no-data">No configured Plexus signal is available.</p>`;
  }

  function renderDeviceSection(metrics) {
    if (!metrics.equipment.length)
      return `<p class="report-no-data">No equipment is linked to this case’s session records.</p>`;
    return `<div class="report-device-list">${metrics.equipment
      .map((item) => {
        const linked = metrics.sessions.filter((session) => (session.equipmentIds || []).includes(item.id));
        const scheduled = total(linked.map((session) => session.minutes));
        const active = total(linked.map((session) => session.activeMinutes));
        const valid = total(linked.map((session) => session.reps));
        const attempted = total(linked.map((session) => session.attemptedReps == null ? session.reps : session.attemptedReps));
        return `<article><div><span>${e(item.category)}</span><h4>${e(item.name)}</h4></div><dl><div><dt>Linked sessions</dt><dd>${linked.length}</dd></div><div><dt>Active conversion</dt><dd>${scheduled ? Math.round((active / scheduled) * 100) : 0}%</dd></div><div><dt>Valid / attempted</dt><dd>${valid.toLocaleString()} / ${attempted.toLocaleString()}</dd></div><div><dt>Last use</dt><dd>${linked.length ? fmt(linked.slice().sort(latestFirst)[0].date) : "—"}</dd></div></dl></article>`;
      })
      .join("")}</div><div class="report-metric-strip">${reportMetric("Device-linked sessions this week", metrics.deviceSessions.length)}${reportMetric("Mean active contribution", metrics.contribution == null ? "Not recorded" : `${metrics.contribution}%`)}${reportMetric("Mean device assistance", metrics.deviceAssistance == null ? "Not recorded" : `${metrics.deviceAssistance}%`)}${reportMetric("Data-quality flags", metrics.calibrationIssues.length)}</div>`;
  }

  function renderChronology(metrics) {
    return metrics.sessions.length
      ? `<div class="table-wrap report-table"><table><thead><tr><th>Date</th><th>Task and setting</th><th>Dose</th><th>Response</th><th>Assistance &amp; transfer</th><th>Equipment / data quality</th></tr></thead><tbody>${metrics.sessions
          .map((session) => {
            const equipment = equipmentForSession(session);
            return `<tr><td>${fmt(session.date)}</td><td><strong>${e(session.task)}</strong><br><span>${e(session.setting)} · ${e(session.specificity)}</span></td><td>${session.activeMinutes}/${session.minutes} active min<br>${n(session.reps).toLocaleString()} valid reps</td><td>Quality ${session.quality}/5<br>Fatigue ${session.fatigue}/10 · pain ${session.pain}/10<br>${n(session.restBreaks)} rest break${n(session.restBreaks) === 1 ? "" : "s"}</td><td>${e(session.assistance)} · ${e(session.challenge)}<br><span>Carryover: ${e(session.carryover)}</span></td><td>${equipment.length ? equipment.map((item) => e(item.name)).join(", ") : "None linked"}<br><span>${e(session.calibrationStatus || "Not recorded")}</span></td></tr>`;
          })
          .join("")}</tbody></table></div>`
      : `<p class="report-no-data">No session records are linked to this case.</p>`;
  }

  function renderAddendum(c) {
    const draft = reportDraft(c.id);
    const hasNarrative = draft && [draft.overview, draft.interpretation, draft.priorities, draft.plan, draft.communication].some(Boolean);
    return `<div class="report-addendum-state"><div><span class="report-eyebrow">Clinician-authored · editable</span><h3>Clinical interpretation &amp; sign-off</h3><p>This section is stored separately from the computed evidence. Saving it does not alter source sessions, outcomes or Plexus calculations.</p></div><span class="report-status-badge ${safeId(reportState(c.id))}">${e(reportState(c.id))}</span></div>
      ${hasNarrative ? `<div class="clinician-narrative"><dl>${draft.overview ? `<div><dt>Professional overview</dt><dd>${e(draft.overview)}</dd></div>` : ""}${draft.interpretation ? `<div><dt>Clinical interpretation</dt><dd>${e(draft.interpretation)}</dd></div>` : ""}${draft.priorities ? `<div><dt>Review priorities</dt><dd>${e(draft.priorities)}</dd></div>` : ""}${draft.plan ? `<div><dt>Plan / follow-up</dt><dd>${e(draft.plan)}</dd></div>` : ""}${draft.communication ? `<div><dt>Handover / communication</dt><dd>${e(draft.communication)}</dd></div>` : ""}</dl><p class="clinician-signature"><strong>${e(draft.author || "Author not recorded")}</strong>${draft.role ? ` · ${e(draft.role)}` : ""}<span>Updated ${fmt(String(draft.updatedAt || "").slice(0, 10))}</span></p></div>` : `<div class="report-no-addendum"><strong>No clinician addendum saved</strong><p>Add interpretation, priorities and sign-off only after reviewing the source records.</p></div>`}
      <button type="button" class="secondary compact-button report-edit-toggle" data-report-action="edit-addendum" aria-expanded="false">${draft ? "Edit clinician addendum" : "Add clinician addendum"}</button>
      <form id="reportAddendumForm" class="report-addendum-form" hidden>
        <input id="reportAddendumCaseId" type="hidden" value="${e(c.id)}" />
        <div class="grid-2"><label>Report status<select id="reportAddendumStatus"><option${reportState(c.id) === "Draft" ? " selected" : ""}>Draft</option><option${reportState(c.id) === "Reviewed" ? " selected" : ""}>Reviewed</option><option${reportState(c.id) === "Final" ? " selected" : ""}>Final</option></select></label><label>Author <input id="reportAddendumAuthor" type="text" maxlength="80" value="${e(draft?.author || c.clinician || "")}" /></label></div>
        <label>Professional role <input id="reportAddendumRole" type="text" maxlength="80" value="${e(draft?.role || "")}" placeholder="e.g. Physiotherapist, occupational therapist, rehabilitation physician" /></label>
        <label>Professional overview <textarea id="reportAddendumOverview" rows="4" placeholder="Clinician-authored synthesis of current function, context and trajectory">${e(draft?.overview || "")}</textarea></label>
        <label>Clinical interpretation <textarea id="reportAddendumInterpretation" rows="4" placeholder="Interpret the source evidence, uncertainty and relevant context">${e(draft?.interpretation || "")}</textarea></label>
        <div class="grid-2"><label>Review priorities <textarea id="reportAddendumPriorities" rows="4" placeholder="Items for clinician or multidisciplinary review">${e(draft?.priorities || "")}</textarea></label><label>Plan / follow-up <textarea id="reportAddendumPlan" rows="4" placeholder="Clinician-determined plan and review interval">${e(draft?.plan || "")}</textarea></label></div>
        <label>Handover / communication <textarea id="reportAddendumCommunication" rows="3" placeholder="Information for the person, family, carers or receiving team, as appropriate">${e(draft?.communication || "")}</textarea></label>
        <div class="report-form-actions"><button type="submit" class="primary compact-button">Save clinician addendum</button><button type="button" class="secondary compact-button" data-report-action="cancel-addendum">Cancel</button></div>
      </form>`;
  }

  function renderClinicalScenario(c) {
    const scenario = c.clinicalScenario;
    if (!scenario) return "";
    const fields = [
      ["Referral profile", scenario.profile],
      ["Current presentation", scenario.presentation],
      ["Participation priority", scenario.participation],
      ["Environment and supports", scenario.environment],
      ["Clinical complexity", scenario.complexity],
      ["Multidisciplinary review focus", scenario.reviewFocus],
    ].filter(([, value]) => value);
    return `<section class="report-section report-section-wide report-scenario"><div class="report-section-heading"><span>01A</span><div><p>${e(scenario.cohort || "Evidence-informed synthetic cohort")}</p><h3>Clinical scenario &amp; referral context</h3></div><span class="badge info">Synthetic scenario</span></div><p class="report-intro">This structured scenario combines plausible rehabilitation contexts described in authoritative guidance. It is not a real person, diagnosis, prognosis or patient-specific recommendation.</p><dl class="report-definition-list columns">${fields.map(([label, value]) => `<div><dt>${e(label)}</dt><dd>${e(value)}</dd></div>`).join("")}</dl></section>`;
  }

  function renderCaseReport(c) {
    const metrics = caseReportMetrics(c);
    const primary = metrics.signals[0];
    const sources = reportSources(c);
    const expectedMinutePace = metrics.expectedMinutes ? Math.round((metrics.active / metrics.expectedMinutes) * 100) : 0;
    const expectedRepPace = metrics.expectedReps ? Math.round((metrics.reps / metrics.expectedReps) * 100) : 0;
    return `<article class="case-report-document" data-case-report="${e(c.id)}">
      <header class="case-report-header">
        <div class="case-report-back"><button type="button" class="text-button" data-report-action="back">← All ${state.cases.length} reports</button><span>Generated ${fmt(today())} · synthetic demonstration record</span></div>
        <div class="case-report-title"><div><p class="ai-kicker">VivantePlexus™ comprehensive clinical report</p><h2>${e(c.label)}</h2><p>${e(c.diagnosis)} · ${e(c.phase)} · ${e(c.domain)}</p></div><div class="case-report-actions"><button type="button" class="secondary compact-button" data-report-action="edit-source">Edit source programme</button><button type="button" class="secondary compact-button" data-report-action="export">Export report</button><button type="button" class="primary compact-button" data-report-action="print">Print</button></div></div>
        <dl class="case-report-identity"><div><dt>Goal status</dt><dd>${e(c.goalStatus)}</dd></div><div><dt>Responsible clinician</dt><dd>${e(c.clinician || "Not specified")}</dd></div><div><dt>Review date</dt><dd>${fmt(c.reviewDate)}</dd></div><div><dt>Report status</dt><dd>${e(reportState(c.id))}</dd></div><div><dt>Data completeness</dt><dd>${metrics.completeness}%</dd></div><div><dt>Plexus method</dt><dd>${e(globalThis.PlexusAI?.METHOD_VERSION || "Local rules")}</dd></div></dl>
      </header>

      <div class="report-boundary"><strong>Structured evidence summary</strong><span>Read-only calculations · no diagnosis, recovery prediction or autonomous treatment recommendation · clinician interpretation required</span></div>

      <div class="case-report-grid">
        <section class="report-section report-section-wide report-executive"><div class="report-section-heading"><span>01</span><div><p>Professional overview</p><h3>Executive clinical summary</h3></div>${primary ? `<span class="badge ${e(primary.severity)}">${e(primary.severity)} priority</span>` : ""}</div><p class="executive-copy">${e(executiveSummary(c, metrics))}</p><div class="report-metric-strip">${reportMetric("Current-week sessions", metrics.weekly.length, `${metrics.sessions.length} total records`)}${reportMetric("Active dose pace", `${expectedMinutePace}%`, `${metrics.active}/${metrics.expectedMinutes} min expected to date`)}${reportMetric("Repetition pace", `${expectedRepPace}%`, `${metrics.reps.toLocaleString()}/${metrics.expectedReps.toLocaleString()} expected`)}${reportMetric("Movement quality", `${round(metrics.quality)}/5`, `Minimum configured ${c.minimumQuality}/5`)}${reportMetric("Functional carryover", metrics.carryRate == null ? "Not assessed" : `${metrics.carryRate}%`, `${metrics.positive.length}/${metrics.assessed.length} positive or partial`)}</div></section>

        ${renderClinicalScenario(c)}

        <section class="report-section"><div class="report-section-heading"><span>02</span><div><p>WHO ICF-aligned context</p><h3>Function, goals &amp; participation</h3></div></div><dl class="report-definition-list"><div><dt>Primary functional goal</dt><dd>${e(c.primaryGoal)}</dd></div><div><dt>Secondary goals</dt><dd>${e(c.secondaryGoals || "Not specified")}</dd></div><div><dt>ICF / participation frame</dt><dd>${e(c.icfFrame || "Not specified")}</dd></div><div><dt>Protocol / dose rationale</dt><dd>${e(c.protocol || "Not specified")}</dd></div><div><dt>Precautions / boundaries</dt><dd>${e(c.precautions || "Not specified")}</dd></div></dl></section>

        <section class="report-section"><div class="report-section-heading"><span>03</span><div><p>Pathway-specific lens</p><h3>Professional review domains</h3></div></div><ul class="report-review-lens">${pathwayLens(c).map((item) => `<li>${e(item)}</li>`).join("")}</ul><p class="report-caveat">These are documentation prompts derived from authoritative reporting principles. They are not patient-specific treatment instructions.</p></section>

        <section class="report-section report-section-wide"><div class="report-section-heading"><span>04</span><div><p>Current programme week</p><h3>Dose, delivery &amp; task exposure</h3></div></div><div class="report-metric-strip six">${reportMetric("Scheduled time", `${metrics.scheduled} min`)}${reportMetric("Active practice", `${metrics.active} min`, `${metrics.conversion}% active conversion`)}${reportMetric("Valid repetitions", metrics.reps.toLocaleString())}${reportMetric("Attempted repetitions", metrics.attempted.toLocaleString(), `${metrics.validRate}% valid / attempted`)}${reportMetric("Weekly minute target", `${c.weeklyMinutes} min`)}${reportMetric("Weekly repetition target", n(c.weeklyReps).toLocaleString())}</div><dl class="report-definition-list columns"><div><dt>Planned treatment days</dt><dd>${e(c.plannedDays || "Not specified")}</dd></div><div><dt>Task specificity</dt><dd>${metrics.weekly.length ? metrics.weekly.map((session) => e(session.specificity)).join(" · ") : "No current-week record"}</dd></div><div><dt>Settings represented</dt><dd>${metrics.weekly.length ? [...new Set(metrics.weekly.map((session) => session.setting))].map(e).join(", ") : "No current-week record"}</dd></div><div><dt>Challenge levels</dt><dd>${metrics.weekly.length ? [...new Set(metrics.weekly.map((session) => session.challenge))].map(e).join(", ") : "No current-week record"}</dd></div></dl></section>

        <section class="report-section"><div class="report-section-heading"><span>05</span><div><p>Recorded response</p><h3>Tolerance &amp; performance</h3></div></div><div class="report-metric-strip two">${reportMetric("Mean quality", `${round(metrics.quality)}/5`)}${reportMetric("Total rest breaks", metrics.restBreaks)}${reportMetric("Mean fatigue", `${round(metrics.fatigue)}/10`, `Peak ${metrics.peakFatigue}/10`)}${reportMetric("Mean pain / discomfort", `${round(metrics.pain)}/10`, `Peak ${metrics.peakPain}/10`)}</div><p class="report-caveat">Ordinal session ratings describe recorded therapist observations; they are not interchangeable with validated outcome measures.</p></section>

        <section class="report-section"><div class="report-section-heading"><span>06</span><div><p>Rehabilitation technology</p><h3>Equipment &amp; device response</h3></div></div>${renderDeviceSection(metrics)}</section>

        <section class="report-section report-section-wide"><div class="report-section-heading"><span>07</span><div><p>Recorded functional measures</p><h3>Outcome trajectory</h3></div></div><div class="report-outcome-grid">${renderOutcomesSection(metrics)}</div></section>

        <section class="report-section report-section-wide"><div class="report-section-heading"><span>08</span><div><p>Plexus Signals · explainable computation</p><h3>Review signals &amp; calculations</h3></div></div><p class="report-intro">Signals prioritise source-record review. A threshold not firing is not a clinical clearance, and every signal remains subject to clinician interpretation.</p><div class="report-signal-list">${renderSignalsSection(metrics)}</div></section>

        <section class="report-section report-section-wide"><div class="report-section-heading"><span>09</span><div><p>Source-record chronology</p><h3>Therapy sessions</h3></div></div>${renderChronology(metrics)}</section>

        <section class="report-section"><div class="report-section-heading"><span>10</span><div><p>Traceability</p><h3>Data provenance &amp; limitations</h3></div></div><dl class="report-definition-list"><div><dt>Source records</dt><dd>${metrics.sessions.length} therapy sessions, ${metrics.outcomes.length} outcomes, ${metrics.equipment.length} linked equipment items</dd></div><div><dt>Storage</dt><dd>Browser-local structured records in the VivantePlexus namespace</dd></div><div><dt>Record type</dt><dd>Synthetic demonstration case; no directly identifying data should be entered</dd></div><div><dt>Limitations</dt><dd>Short observation windows, ordinal ratings and changing task context can limit comparison. Formal measures require appropriate administration and clinical interpretation.</dd></div><div><dt>Generation</dt><dd>${fmt(today())} · schema ${SCHEMA_VERSION} · ${e(globalThis.PlexusAI?.METHOD_VERSION || "local rules")}</dd></div></dl></section>

        <section class="report-section"><div class="report-section-heading"><span>11</span><div><p>Evidence-informed structure</p><h3>Reporting frame</h3></div></div><p class="report-intro">This report organises function in context, person-centred goals, multidisciplinary progress and attributable document sections. Local policy and the authoritative source record take precedence.</p><ul class="report-source-list">${sources.map((source) => `<li><a href="${source.href}" target="_blank" rel="noopener noreferrer">${e(source.label)} <span aria-hidden="true">↗</span></a></li>`).join("")}</ul></section>

        <section class="report-section report-section-wide report-addendum">${renderAddendum(c)}</section>
      </div>
    </article>`;
  }

  function caseReportText(c) {
    const metrics = caseReportMetrics(c);
    const draft = reportDraft(c.id);
    return [
      "VivantePlexus™ · Comprehensive Clinical Report",
      c.label,
      `Generated: ${fmt(today())} · Synthetic demonstration record`,
      "",
      "PROFESSIONAL OVERVIEW",
      executiveSummary(c, metrics),
      ...(c.clinicalScenario
        ? [
            "",
            "CLINICAL SCENARIO & REFERRAL CONTEXT",
            `Referral profile: ${c.clinicalScenario.profile || "Not specified"}`,
            `Current presentation: ${c.clinicalScenario.presentation || "Not specified"}`,
            `Participation priority: ${c.clinicalScenario.participation || "Not specified"}`,
            `Environment and supports: ${c.clinicalScenario.environment || "Not specified"}`,
            `Clinical complexity: ${c.clinicalScenario.complexity || "Not specified"}`,
            `Multidisciplinary review focus: ${c.clinicalScenario.reviewFocus || "Not specified"}`,
          ]
        : []),
      "",
      "PROGRAMME CONTEXT",
      `Pathway: ${c.diagnosis} · ${c.phase} · ${c.domain}`,
      `Goal status: ${c.goalStatus}`,
      `Primary functional goal: ${c.primaryGoal}`,
      `Secondary goals: ${c.secondaryGoals || "Not specified"}`,
      `ICF / participation frame: ${c.icfFrame || "Not specified"}`,
      `Protocol / dose rationale: ${c.protocol || "Not specified"}`,
      `Precautions / boundaries: ${c.precautions || "Not specified"}`,
      "",
      "CURRENT-WEEK DOSE & RESPONSE",
      `Sessions: ${metrics.weekly.length}`,
      `Scheduled / active: ${metrics.scheduled} / ${metrics.active} minutes (${metrics.conversion}% conversion)`,
      `Valid / attempted repetitions: ${metrics.reps} / ${metrics.attempted}`,
      `Mean quality: ${round(metrics.quality)}/5`,
      `Mean fatigue: ${round(metrics.fatigue)}/10; mean pain/discomfort: ${round(metrics.pain)}/10`,
      `Carryover: ${metrics.carryRate == null ? "Not assessed" : `${metrics.carryRate}%`}`,
      "",
      "OUTCOMES",
      ...(metrics.outcomes.length ? metrics.outcomes.map((outcome) => `${outcome.name}: baseline ${outcome.baseline || "—"}; current ${outcome.current || "—"}; target ${outcome.target || "—"}; ${outcome.direction}`) : ["No outcome measures recorded."]),
      "",
      "PLEXUS REVIEW SIGNALS",
      ...metrics.signals.slice(0, 5).map((signal) => `${signal.title} [${signal.type}/${signal.severity}]: ${signal.summary} Calculation: ${signal.calculation}`),
      "",
      "CLINICIAN ADDENDUM",
      draft ? `Status: ${draft.status}\nProfessional overview: ${draft.overview || "—"}\nClinical interpretation: ${draft.interpretation || "—"}\nReview priorities: ${draft.priorities || "—"}\nPlan / follow-up: ${draft.plan || "—"}\nHandover / communication: ${draft.communication || "—"}\nAuthor: ${draft.author || "—"}${draft.role ? ` · ${draft.role}` : ""}` : "No clinician addendum saved.",
      "",
      "BOUNDARY",
      "Synthetic structured evidence summary for clinician review. It does not diagnose, predict recovery or make autonomous treatment recommendations.",
    ].join("\n");
  }

  function showReportLayer(next, focus = false) {
    if (next === "detail" && !activeReportCaseId) next = "index";
    reportLayer = next;
    document.querySelectorAll("[data-report-layer]").forEach((layer) => {
      const on = layer.dataset.reportLayer === next;
      layer.hidden = !on;
      layer.classList.toggle("active", on);
    });
    document.querySelectorAll("[data-report-layer-target]").forEach((button) => {
      const on = button.dataset.reportLayerTarget === next;
      button.classList.toggle("active", on);
      button.setAttribute("aria-selected", String(on));
      button.tabIndex = on ? 0 : -1;
    });
    if (focus) $(next === "detail" ? "reportDetailTab" : "reportIndexTab")?.focus();
    $(next === "detail" ? "report-detail-layer" : "report-index-layer")?.scrollTo?.({ top: 0 });
  }

  function openCaseReport(caseId, focus = false) {
    const c = getCase(caseId);
    if (!c) return;
    activeReportCaseId = c.id;
    $("reportDetailTab").disabled = false;
    $("reportDetailTab").title = c.label;
    $("caseReportDetail").innerHTML = renderCaseReport(c);
    showReportLayer("detail", focus);
    status(`Opened comprehensive report for ${c.label}.`);
  }

  function closeCaseReport(focus = false) {
    showReportLayer("index", focus);
    status("Showing all case reports.");
  }

  function saveReportAddendum(event) {
    event.preventDefault();
    const caseId = $("reportAddendumCaseId")?.value;
    if (!getCase(caseId)) return;
    state.reportDrafts ||= {};
    state.reportDrafts[caseId] = {
      status: $("reportAddendumStatus").value,
      author: $("reportAddendumAuthor").value.trim(),
      role: $("reportAddendumRole").value.trim(),
      overview: $("reportAddendumOverview").value.trim(),
      interpretation: $("reportAddendumInterpretation").value.trim(),
      priorities: $("reportAddendumPriorities").value.trim(),
      plan: $("reportAddendumPlan").value.trim(),
      communication: $("reportAddendumCommunication").value.trim(),
      updatedAt: new Date().toISOString(),
    };
    save();
    renderReportIndex();
    openCaseReport(caseId);
    status(`Clinician addendum saved for ${getCase(caseId).label}.`);
  }

  function handleReportClick(event) {
    const opener = event.target.closest("[data-open-case-report]");
    if (opener) return openCaseReport(opener.dataset.openCaseReport, true);
    const action = event.target.closest("[data-report-action]")?.dataset.reportAction;
    if (!action) return;
    const c = getCase(activeReportCaseId);
    if (action === "back") return closeCaseReport(true);
    if (!c) return;
    if (action === "edit-addendum") {
      const form = $("reportAddendumForm");
      const button = event.target.closest("[data-report-action]");
      form.hidden = false;
      button.setAttribute("aria-expanded", "true");
      form.querySelector("textarea, input, select")?.focus();
    } else if (action === "cancel-addendum") {
      $("reportAddendumForm").hidden = true;
      $("caseReportDetail").querySelector("[data-report-action='edit-addendum']")?.setAttribute("aria-expanded", "false");
    } else if (action === "edit-source") {
      editProgram(c.id);
    } else if (action === "export") {
      dl(`vivanteplexus-${safeId(c.label)}-report-${today()}.txt`, caseReportText(c));
    } else if (action === "print") {
      globalThis.print?.();
    }
  }

  function bindReportEvents() {
    const reports = $("reports");
    if (!reports || reports.dataset.reportBound === "true") return;
    reports.dataset.reportBound = "true";
    reports.addEventListener("click", handleReportClick);
    reports.addEventListener("submit", (event) => {
      if (event.target.id === "reportAddendumForm") saveReportAddendum(event);
    });
    $("reportSearch")?.addEventListener("input", (event) => {
      reportQuery = event.target.value;
      renderReportIndex();
    });
    $("reportStatusFilter")?.addEventListener("change", (event) => {
      reportStatus = event.target.value;
      renderReportIndex();
    });
    $("reportIndexTab")?.addEventListener("click", () => closeCaseReport());
    $("reportDetailTab")?.addEventListener("click", () => {
      if (activeReportCaseId) showReportLayer("detail");
    });
    document.querySelector(".report-layer-nav")?.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      const tabs = [...document.querySelectorAll('.report-layer-nav [role="tab"]:not(:disabled)')];
      const current = tabs.indexOf(document.activeElement);
      if (current < 0 || tabs.length < 2) return;
      event.preventDefault();
      const next = event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].focus();
      showReportLayer(tabs[next].dataset.reportLayerTarget);
    });
  }

  function renderReports() {
    state.reportDrafts ||= {};
    if (activeReportCaseId && !getCase(activeReportCaseId)) {
      activeReportCaseId = null;
      reportLayer = "index";
    }
    renderReportIndex();
    if (activeReportCaseId) {
      $("reportDetailTab").disabled = false;
      $("caseReportDetail").innerHTML = renderCaseReport(getCase(activeReportCaseId));
    } else {
      $("reportDetailTab").disabled = true;
      $("caseReportDetail").innerHTML = "";
    }
    showReportLayer(reportLayer);
  }

  report = renderReports;
  const bindCore = bind;
  bind = function () {
    bindCore();
    bindReportEvents();
  };

  globalThis.PlexusReports = {
    caseReportMetrics,
    caseReportText,
    openCaseReport,
    pathwayLens,
    renderReports,
    showReportLayer,
  };
})();
