(function () {
  if (typeof CASES === "undefined" || typeof TASKS === "undefined") return;

  const expandedCases = [
    [
      "Case 19 · Stroke Aphasia",
      "Stroke",
      "Community",
      "Speech / swallowing",
      "In progress",
      "Improve supported conversation for family and appointment participation.",
      "Increase communication-partner strategy use and reduce breakdowns. Training protocol: three 40-minute communication sessions with supported conversation, naming-to-use practice, partner cue rehearsal and home carryover logging.",
      120,
      360,
      "Communication participation rating",
      "3/10",
      "5/10",
      "8/10",
    ],
    [
      "Case 20 · Stroke Neglect",
      "Stroke",
      "Inpatient rehabilitation",
      "Cognition",
      "In progress",
      "Improve left-sided scanning during meals, transfers and wheelchair navigation.",
      "Reduce missed objects during functional routines. Training protocol: functional visual scanning embedded in mobility and ADL tasks, with graded cue fading and carryover checks in real environments.",
      150,
      520,
      "Behavioural inattention test",
      "41 points",
      "52 points",
      "68 points",
    ],
    [
      "Case 21 · Incomplete SCI Gait",
      "Spinal cord injury",
      "Outpatient",
      "Gait",
      "Improving",
      "Increase safe overground walking with assistive device for clinic-to-car distance.",
      "Improve step consistency and standing tolerance. Training protocol: body-weight-supported or robotic-assisted gait intervals followed by overground transfer practice and fatigue review.",
      180,
      980,
      "10MWT",
      "0.31 m/s",
      "0.46 m/s",
      "0.65 m/s",
    ],
    [
      "Case 22 · SCI Wheelchair Skills",
      "Spinal cord injury",
      "Home programme",
      "Functional task practice",
      "In progress",
      "Improve wheelchair propulsion, ramp approach and pressure-relief routine.",
      "Reduce shoulder overload and increase community confidence. Training protocol: distributed wheelchair skills practice with propulsion efficiency, ramp sequencing, pressure-relief timing and shoulder-load monitoring.",
      140,
      620,
      "Wheelchair Skills Test",
      "58%",
      "67%",
      "80%",
    ],
    [
      "Case 23 · CP Diplegia Gait",
      "Cerebral palsy",
      "Outpatient",
      "Gait",
      "In progress",
      "Improve step length and endurance for school corridor walking.",
      "Build confidence with stairs and playground transitions. Training protocol: task-specific gait practice with treadmill or overground intervals, orthotic check-ins, step-up practice and child-centred goal carryover.",
      150,
      760,
      "GMFM walking dimension",
      "62%",
      "68%",
      "78%",
    ],
    [
      "Case 24 · CP Hemiplegic UL",
      "Cerebral palsy",
      "Home programme",
      "Upper limb",
      "Improving",
      "Increase affected-hand use during dressing and school tabletop tasks.",
      "Improve bimanual timing and reduce learned non-use. Training protocol: modified constraint-induced and bimanual practice blocks, parent-supported home repetitions and play-based grasp-release transfer.",
      135,
      820,
      "Assisting Hand Assessment",
      "46 units",
      "52 units",
      "62 units",
    ],
    [
      "Case 25 · CP Dystonia ADL",
      "Cerebral palsy",
      "Chronic / long-term management",
      "ADL / participation",
      "Plateauing",
      "Improve head, trunk and upper-limb control during powered mobility setup.",
      "Reduce fatigue during communication-device access. Training protocol: postural setup rehearsal, access-switch timing, graded reaching and rest-planned participation practice.",
      105,
      340,
      "COPM performance",
      "3/10",
      "4/10",
      "7/10",
    ],
    [
      "Case 26 · TBI Vestibular",
      "Traumatic brain injury",
      "Outpatient",
      "Balance",
      "In progress",
      "Improve gaze stability and walking tolerance in visually busy settings.",
      "Reduce symptom flare during return-to-study travel. Training protocol: graded vestibular-ocular practice, balance exposure and symptom-limited aerobic intervals with recovery rules recorded each session.",
      110,
      440,
      "Dizziness Handicap Inventory",
      "64 points",
      "48 points",
      "28 points",
    ],
    [
      "Case 27 · TBI Re-entry",
      "Traumatic brain injury",
      "Community",
      "Cognition",
      "In progress",
      "Improve route planning, error detection and pacing for community errands.",
      "Reduce caregiver cueing during multi-step tasks. Training protocol: real-world task rehearsal with checklist fading, dual-task limits, pacing review and post-task error-awareness reflection.",
      130,
      460,
      "Community Integration Questionnaire",
      "9 points",
      "12 points",
      "18 points",
    ],
    [
      "Case 28 · MS Hand Dexterity",
      "Multiple sclerosis",
      "Home programme",
      "Upper limb",
      "In progress",
      "Improve hand dexterity for keyboard, medication and meal tasks.",
      "Track fatigue effect on fine-motor quality. Training protocol: short distributed hand-practice blocks, cooling/pacing options, dexterity repetitions and fatigue-sensitive task grading.",
      100,
      560,
      "9-Hole Peg Test sec",
      "38 sec",
      "34 sec",
      "28 sec",
    ],
    [
      "Case 29 · MS Heat Fatigue",
      "Multiple sclerosis",
      "Community",
      "Mixed programme",
      "In progress",
      "Improve activity pacing for errands without next-day functional drop.",
      "Integrate aerobic, resistance and balance work around fatigue windows. Training protocol: moderate aerobic-resistance-balance circuit with heat-management notes, rest breaks and next-day response tracking.",
      115,
      430,
      "Modified Fatigue Impact score",
      "52 points",
      "44 points",
      "32 points",
    ],
    [
      "Case 30 · Guillain-Barre Gait",
      "Other neurological condition",
      "Subacute",
      "Gait",
      "Improving",
      "Rebuild walking endurance after peripheral weakness for household mobility.",
      "Improve sit-to-stand strength and reduce rest dependence. Training protocol: low-to-moderate intensity strengthening, interval gait practice and autonomic/fatigue monitoring with gradual weekly progression.",
      160,
      680,
      "6MWT",
      "120 m",
      "185 m",
      "280 m",
    ],
    [
      "Case 31 · Parkinson Speech",
      "Parkinson's disease",
      "Outpatient",
      "Speech / swallowing",
      "In progress",
      "Improve speech loudness and intelligibility during group conversation.",
      "Rehearse swallow safety strategies during meals. Training protocol: speech-effort practice, respiratory-voice coordination, EMST-style strategy rehearsal and daily communication carryover.",
      120,
      360,
      "Voice participation rating",
      "4/10",
      "6/10",
      "8/10",
    ],
    [
      "Case 32 · ALS Energy ADL",
      "Other neurological condition",
      "Chronic / long-term management",
      "ADL / participation",
      "Revised",
      "Maintain safe self-care participation with adaptive equipment and energy planning.",
      "Reduce unnecessary effort during transfers and morning routine. Training protocol: compensatory ADL training, equipment trials, caregiver workflow rehearsal and fatigue-triggered dose boundaries.",
      90,
      260,
      "COPM satisfaction",
      "4/10",
      "5/10",
      "7/10",
    ],
    [
      "Case 33 · TKA Gait",
      "Orthopaedic / MSK rehabilitation",
      "Outpatient",
      "Gait",
      "Improving",
      "Restore symmetrical walking after total knee arthroplasty.",
      "Improve knee range, quadriceps control and stair confidence. Training protocol: range-of-motion, progressive strengthening, gait retraining and stair practice with pain and swelling response tracked.",
      170,
      840,
      "TUG",
      "21 sec",
      "16 sec",
      "12 sec",
    ],
    [
      "Case 34 · ACL Neuromuscular",
      "Orthopaedic / MSK rehabilitation",
      "Outpatient",
      "Functional task practice",
      "In progress",
      "Improve single-leg control for running progression after ACL reconstruction.",
      "Build landing mechanics and confidence before sport-specific drills. Training protocol: progressive strength, neuromuscular control, balance, landing mechanics and criterion-based running preparation.",
      180,
      900,
      "Single-leg hop symmetry",
      "62%",
      "74%",
      "90%",
    ],
    [
      "Case 35 · Rotator Cuff Repair",
      "Orthopaedic / MSK rehabilitation",
      "Outpatient",
      "Upper limb",
      "In progress",
      "Restore shoulder reach for grooming and overhead household tasks.",
      "Progress from protected range to light functional strengthening. Training protocol: surgeon-bounded shoulder progression from assisted range to active control, scapular setting and low-load functional reaching.",
      125,
      520,
      "QuickDASH functional score",
      "58 points",
      "43 points",
      "25 points",
    ],
    [
      "Case 36 · Amputee Prosthetic Gait",
      "Orthopaedic / MSK rehabilitation",
      "Outpatient",
      "Gait",
      "In progress",
      "Improve prosthetic step symmetry and confidence on curbs.",
      "Increase tolerance for community walking without skin irritation. Training protocol: prosthetic alignment check, weight-shift practice, curb negotiation, interval walking and skin/tolerance review after each session.",
      155,
      720,
      "Prosthetic Limb Users Survey",
      "48 points",
      "58 points",
      "72 points",
    ],
  ];

  TASKS["Speech / swallowing"] = [
    "Communication-effort practice",
    "Swallow safety strategy rehearsal",
    "Respiratory-voice coordination routine",
  ];

  const protocolByLabel = Object.fromEntries(
    expandedCases.map((row) => [
      row[0],
      row[6].replace(/^.*Training protocol: /, ""),
    ]),
  );

  const existingLabels = new Set(CASES.map((row) => row[0]));
  expandedCases.forEach((row) => {
    if (!existingLabels.has(row[0])) CASES.push(row);
  });

  function applyProtocols() {
    if (typeof state === "undefined" || !Array.isArray(state?.cases)) return;
    state.cases = state.cases.map((entry) => {
      const protocol = entry.protocol || protocolByLabel[entry.label] || "";
      if (!protocol) return entry;
      return {
        ...entry,
        protocol,
        secondaryGoals: /Training protocol:/i.test(entry.secondaryGoals || "")
          ? entry.secondaryGoals
          : `${entry.secondaryGoals || ""} Training protocol: ${protocol}`.trim(),
      };
    });
  }

  if (typeof renderPrograms === "function") {
    const renderProgramsCore = renderPrograms;
    renderPrograms = function () {
      renderProgramsCore();
      document.querySelectorAll("[data-edit]").forEach((button) => {
        const protocol = getCase(button.dataset.edit)?.protocol;
        const card = button.closest(".programme-card");
        if (protocol && card && !card.querySelector(".protocol-note")) {
          button.insertAdjacentHTML(
            "beforebegin",
            `<p class="protocol-note"><strong>${e("Protocol")}:</strong> ${e(protocol)}</p>`,
          );
        }
      });
    };
  }

  if (typeof editProgram === "function") {
    const editProgramCore = editProgram;
    editProgram = function (id) {
      editProgramCore(id);
      if ($("protocol")) $("protocol").value = getCase(id)?.protocol || "";
    };
  }

  if (typeof saveProgram === "function") {
    saveProgram = function (ev) {
      ev.preventDefault();
      const id = $("caseId").value || uid("case"),
        old = getCase(id);
      state.cases = state.cases
        .filter((c) => c.id !== id)
        .concat({
          id,
          label: $("caseLabel").value.trim(),
          diagnosis: $("diagnosis").value,
          phase: $("phase").value,
          domain: $("domain").value,
          goalStatus: $("goalStatus").value,
          primaryGoal: $("primaryGoal").value.trim(),
          secondaryGoals: $("secondaryGoals").value.trim(),
          protocol: $("protocol")?.value.trim() || old?.protocol || "",
          weeklyMinutes: n($("weeklyMinutes").value),
          weeklyReps: n($("weeklyReps").value),
          minimumQuality: n($("minimumQuality").value),
          reviewDate: $("reviewDate").value,
          plannedDays: $("plannedDays")?.value.trim() || old?.plannedDays || "Mon, Wed, Fri",
          clinician: $("clinician").value.trim(),
          icfFrame: $("icfFrame").value.trim(),
          precautions: $("precautions").value.trim(),
          createdAt: old?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      applyProtocols();
      save();
      ev.target.reset();
      defaults();
      render();
      status("Programme saved.");
    };
  }

  function refreshExpandedState() {
    if (
      typeof sample !== "function" ||
      typeof save !== "function" ||
      typeof state === "undefined"
    )
      return;
    if (state?.cases?.length === 18) {
      state = sample();
      applyProtocols();
      save();
    }
  }

  applyProtocols();
  if (typeof save === "function") save();
  refreshExpandedState();

  document.addEventListener("DOMContentLoaded", () => {
    if (state?.cases?.length === 36 && typeof status === "function") {
      status(
        "Loaded 36 synthetic neurorehabilitation cases. Use the tabs or exports above.",
      );
    }

    $("loadSampleBtn")?.addEventListener("click", () => {
      if (state?.cases?.length === 36 && typeof status === "function") {
        status(
          "Loaded 36 synthetic neurorehabilitation cases, 108 sessions and 72 outcomes.",
        );
      }
    });

    $("clearBtn")?.addEventListener("click", () => {
      if (!state?.cases?.length && typeof status === "function") {
        status(
          "Local data cleared. Click Load sample to restore the 36 synthetic cases.",
        );
      }
    });
  });
})();
