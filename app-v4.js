const APP_KEY = "vivantePlexus.v1";
const SCHEMA_VERSION = 8;
const $ = (id) => document.getElementById(id);
const n = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const tr = (v) =>
  globalThis.i18n?.translateText(String(v ?? "")) ?? String(v ?? "");
const e = (v) =>
  tr(v)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
const uid = (p) =>
  globalThis.crypto?.randomUUID
    ? `${p}-${crypto.randomUUID()}`
    : `${p}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const fhirId = (value) =>
  String(value || "resource")
    .replace(/[^A-Za-z0-9-.]/g, "-")
    .slice(0, 64);
const today = () => new Date().toISOString().slice(0, 10);
const ago = (d) => {
  const x = new Date();
  x.setDate(x.getDate() - d);
  return x.toISOString().slice(0, 10);
};
const fmt = (d) =>
  d
    ? new Date(d + "T12:00:00").toLocaleDateString(globalThis.i18n?.locale(), {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : tr("No date");
const avg = (a) => {
  const c = a.map(Number).filter(Number.isFinite);
  return c.length ? c.reduce((x, y) => x + y, 0) / c.length : 0;
};
const pct = (v, t) =>
  t ? Math.max(0, Math.min(100, Math.round((n(v) / n(t)) * 100))) : 0;
const wk = (d) => {
  const x = new Date(d + "T00:00:00"),
    day = x.getDay();
  x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day));
  return x;
};
const inWeek = (d) => {
  const s = wk(today()),
    end = new Date(s);
  end.setDate(s.getDate() + 7);
  const x = new Date(d + "T12:00:00");
  return x >= s && x < end;
};
const daysUntil = (d) =>
  d
    ? Math.ceil(
        (new Date(d + "T00:00:00") - new Date(today() + "T00:00:00")) /
          86400000,
      )
    : null;
const num = (v) => {
  const m = String(v ?? "").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
};
function status(msg) {
  const el = $("appStatus");
  if (!el) return;
  el.textContent = tr(msg);
  clearTimeout(status.t);
  status.t = setTimeout(() => (el.textContent = ""), 5000);
}

const CASES = [
  [
    "Case 01 · Stroke UL",
    "Stroke",
    "Outpatient",
    "Upper limb",
    "Improving",
    "Improve reach, grasp and release for meal preparation.",
    "Reduce trunk compensation and improve home carryover.",
    180,
    900,
    "ARAT",
    "21 points",
    "32 points",
    "42 points",
  ],
  [
    "Case 02 · Stroke Gait",
    "Stroke",
    "Subacute",
    "Gait",
    "In progress",
    "Increase safe walking speed for short community distances.",
    "Improve step symmetry and reduce rest breaks.",
    210,
    1200,
    "10MWT",
    "0.42 m/s",
    "0.57 m/s",
    "0.75 m/s",
  ],
  [
    "Case 03 · Stroke Balance",
    "Stroke",
    "Inpatient rehabilitation",
    "Balance",
    "In progress",
    "Improve unsupported standing balance for dressing.",
    "Reduce manual assistance during transfers.",
    160,
    650,
    "Berg Balance Scale",
    "24 points",
    "32 points",
    "45 points",
  ],
  [
    "Case 04 · SCI Transfer",
    "Spinal cord injury",
    "Home programme",
    "ADL / participation",
    "Improving",
    "Increase wheelchair-to-bed transfer independence.",
    "Improve trunk control and caregiver body mechanics.",
    150,
    650,
    "SCIM mobility",
    "8 points",
    "13 points",
    "18 points",
  ],
  [
    "Case 05 · SCI Hand",
    "Spinal cord injury",
    "Outpatient",
    "Upper limb",
    "In progress",
    "Improve hand-object interaction for phone and utensil use.",
    "Increase tenodesis consistency and reduce overuse pain.",
    135,
    760,
    "GRASSP",
    "42 points",
    "49 points",
    "58 points",
  ],
  [
    "Case 06 · TBI Dual Task",
    "Traumatic brain injury",
    "Community",
    "Cognition",
    "Improving",
    "Improve walking while following simple instructions.",
    "Reduce supervision during busy environments.",
    140,
    520,
    "Dual-task TUG",
    "39 sec",
    "32 sec",
    "25 sec",
  ],
  [
    "Case 07 · TBI ADL",
    "Traumatic brain injury",
    "Outpatient",
    "ADL / participation",
    "In progress",
    "Improve sequencing for morning self-care routine.",
    "Increase error awareness and reduce caregiver cueing.",
    120,
    420,
    "Goal Attainment Scaling",
    "-2",
    "-1",
    "+1",
  ],
  [
    "Case 08 · Parkinson Gait",
    "Parkinson's disease",
    "Community",
    "Gait",
    "In progress",
    "Improve gait initiation and reduce freezing during doorway transitions.",
    "Use external cueing consistently at home.",
    150,
    700,
    "TUG",
    "18 sec",
    "15 sec",
    "12 sec",
  ],
  [
    "Case 09 · Parkinson Balance",
    "Parkinson's disease",
    "Outpatient",
    "Balance",
    "Improving",
    "Improve turning stability and kitchen confidence.",
    "Increase amplitude and step length during daily walking.",
    160,
    820,
    "Mini-BESTest",
    "16 points",
    "20 points",
    "24 points",
  ],
  [
    "Case 10 · MS Endurance",
    "Multiple sclerosis",
    "Home programme",
    "Gait",
    "In progress",
    "Improve walking endurance without triggering excessive fatigue.",
    "Pace activity and track heat/fatigue response.",
    110,
    480,
    "6MWT",
    "230 m",
    "268 m",
    "320 m",
  ],
  [
    "Case 11 · MS Balance",
    "Multiple sclerosis",
    "Outpatient",
    "Balance",
    "Plateauing",
    "Improve turning and obstacle negotiation for home safety.",
    "Reduce near-falls during evening fatigue.",
    120,
    530,
    "Timed 25-Foot Walk",
    "8.7 sec",
    "7.9 sec",
    "6.8 sec",
  ],
  [
    "Case 12 · Frailty Transfers",
    "Frailty / falls risk",
    "Community",
    "Functional task practice",
    "In progress",
    "Improve sit-to-stand confidence and indoor walking safety.",
    "Reduce fear of falling and caregiver standby time.",
    120,
    500,
    "5x Sit-to-Stand",
    "38 sec",
    "31 sec",
    "24 sec",
  ],
  [
    "Case 13 · Frailty Stairs",
    "Frailty / falls risk",
    "Home programme",
    "Gait",
    "In progress",
    "Improve step-up and stair negotiation for home entry.",
    "Improve lower-limb strength and pacing.",
    130,
    560,
    "TUG",
    "26 sec",
    "22 sec",
    "17 sec",
  ],
  [
    "Case 14 · Post-op Hip",
    "Post-surgical rehabilitation",
    "Outpatient",
    "Gait",
    "Improving",
    "Restore symmetrical walking after hip surgery.",
    "Improve endurance and reduce assistive-device reliance.",
    160,
    760,
    "6MWT",
    "250 m",
    "325 m",
    "420 m",
  ],
  [
    "Case 15 · Vestibular Balance",
    "Other neurological condition",
    "Outpatient",
    "Balance",
    "In progress",
    "Improve gaze stability and turning tolerance.",
    "Reduce dizziness during supermarket walking.",
    110,
    420,
    "Dizziness Handicap Inventory",
    "58 points",
    "42 points",
    "24 points",
  ],
  [
    "Case 16 · Cerebellar Ataxia",
    "Other neurological condition",
    "Community",
    "Balance",
    "In progress",
    "Improve controlled reaching and standing alignment.",
    "Reduce high-risk compensatory stepping.",
    140,
    620,
    "SARA",
    "18 points",
    "15 points",
    "10 points",
  ],
  [
    "Case 17 · Neuropathy Gait",
    "Other neurological condition",
    "Home programme",
    "Gait",
    "Improving",
    "Improve foot clearance and safe night walking at home.",
    "Increase sensory compensation strategies.",
    125,
    540,
    "10MWT",
    "0.54 m/s",
    "0.66 m/s",
    "0.82 m/s",
  ],
  [
    "Case 18 · Mixed Neuro ADL",
    "Other neurological condition",
    "Outpatient",
    "Mixed programme",
    "In progress",
    "Improve safe kitchen participation with upper-limb and balance demands.",
    "Increase home adherence and caregiver confidence.",
    145,
    610,
    "Patient-specific goal",
    "3/10",
    "5/10",
    "8/10",
  ],
];
const TASKS = {
  "Upper limb": [
    "Reach-grasp-release practice",
    "Object transfer into functional container",
    "Home reaching routine",
  ],
  Gait: [
    "Overground walking intervals",
    "Turning and obstacle negotiation",
    "Community-distance walking practice",
  ],
  Balance: [
    "Static balance and weight shift",
    "Dynamic reaching in standing",
    "Stepping strategy practice",
  ],
  "Functional task practice": [
    "Sit-to-stand practice",
    "Bed-chair transfer sequence",
    "Functional strengthening circuit",
  ],
  Cognition: [
    "Dual-task walking",
    "Sequencing and error-awareness routine",
    "Functional navigation practice",
  ],
  "ADL / participation": [
    "Transfer component practice",
    "Morning self-care sequence",
    "Kitchen participation routine",
  ],
  "Mixed programme": [
    "Combined reach and balance practice",
    "Functional task circuit",
    "Home carryover rehearsal",
  ],
};
const EQUIPMENT_LIBRARY = [
  {
    id: "equipment-handvivante",
    name: "HandVivante™",
    category: "Upper-limb robotics",
    manufacturer: "Robotimize",
    model: "",
    identifier: "",
    status: "Active",
    notes: "Robotic hand and upper-limb rehabilitation equipment.",
  },
  {
    id: "equipment-gaitvivante",
    name: "GaitVivante™",
    category: "Gait robotics",
    manufacturer: "Robotimize",
    model: "",
    identifier: "",
    status: "Active",
    notes: "Robotic gait rehabilitation equipment.",
  },
  {
    id: "equipment-elevovivante",
    name: "ElevoVivante™",
    category: "Therapy technology",
    manufacturer: "Robotimize",
    model: "",
    identifier: "",
    status: "Active",
    notes: "Configurable rehabilitation equipment example.",
  },
  {
    id: "equipment-revitavivante",
    name: "RevitaVivante™",
    category: "FES / electrostimulation",
    manufacturer: "Robotimize",
    model: "",
    identifier: "",
    status: "Active",
    notes: "Functional electrical stimulation rehabilitation equipment.",
  },
];
const equipmentSeed = (createdAt = new Date().toISOString()) =>
  EQUIPMENT_LIBRARY.map((item) => ({
    ...item,
    createdAt,
    updatedAt: createdAt,
  }));
function sample() {
  const now = new Date().toISOString();
  const equipment = equipmentSeed(now);
  const cases = CASES.map((x, i) => ({
    id: `case-${String(i + 1).padStart(2, "0")}`,
    label: x[0],
    diagnosis: x[1],
    phase: x[2],
    domain: x[3],
    goalStatus: x[4],
    primaryGoal: x[5],
    secondaryGoals: x[6],
    weeklyMinutes: x[7],
    weeklyReps: x[8],
    minimumQuality: 3,
    plannedDays:
      i % 3 === 0
        ? "Mon, Wed, Fri"
        : i % 3 === 1
          ? "Tue, Thu, Sat"
          : "Mon, Tue, Thu, Fri",
    reviewDate: ago(i % 5 === 0 ? -7 : (i % 4) + 3),
    clinician:
      i % 3 === 0
        ? "Neurorehab therapist"
        : i % 3 === 1
          ? "Community rehabilitation team"
          : "Home rehabilitation clinician",
    icfFrame: `Synthetic ICF frame: ${x[3]} limitation tied to home or community participation.`,
    precautions:
      i % 4 === 0
        ? "Monitor fatigue and pain; grade task if quality falls below 3/5."
        : "Use therapist judgement; adjust challenge if fatigue, safety or carryover concerns emerge.",
    createdAt: now,
    updatedAt: now,
  }));
  let sessions = [];
  const set = ["Clinic", "Home", "Community", "Inpatient gym", "Tele-rehab"],
    assist = [
      "Verbal cueing",
      "Manual assist",
      "Caregiver assist",
      "Robotic assist",
      "Mixed assist",
      "Independent",
    ],
    carry = ["Yes, in daily activity", "Partial", "No", "Not assessed"],
    home = ["High", "Moderate", "Low", "Not reported"];
  cases.forEach((c, i) => {
    (TASKS[c.domain] || TASKS["Mixed programme"]).forEach((task, j) => {
      const stress = (i + j) % 6,
        scheduled = 25 + ((i + j) % 4) * 10,
        active = Math.max(10, scheduled - (5 + (stress % 3) * 3));
      sessions.push({
        id: `session-${String(i + 1).padStart(2, "0")}-${j + 1}`,
        caseId: c.id,
        date: ago(j * 3 + (i % 2)),
        setting: set[(i + j) % set.length],
        task,
        minutes: scheduled,
        activeMinutes: active,
        reps: Math.max(
          35,
          Math.round(c.weeklyReps / 6 + j * 18 - (stress === 4 ? 35 : 0)),
        ),
        quality: Math.max(
          2,
          Math.min(5, 3 + (j === 2 ? 1 : 0) - (stress === 4 ? 1 : 0)),
        ),
        fatigue: Math.min(9, 4 + (stress % 5) + (j === 0 ? 1 : 0)),
        pain: Math.min(7, (i % 4) + (stress === 4 ? 2 : 0)),
        assistance: assist[(i + j) % assist.length],
        challenge:
          stress === 4
            ? "Too difficult"
            : stress === 0
              ? "Too easy"
              : "Appropriate",
        specificity:
          j === 1 && i % 7 === 0
            ? "Unclear link"
            : j === 2
              ? "Partially linked to functional goal"
              : "Directly linked to functional goal",
        carryover: carry[(i + j) % carry.length],
        homeAdherence: home[(i + j) % home.length],
        restBreaks: 1 + (stress % 5),
        equipmentIds:
          c.domain === "Upper limb"
            ? ["equipment-handvivante"]
            : c.domain === "Gait"
              ? ["equipment-gaitvivante"]
              : i % 5 === 0
                ? ["equipment-elevovivante"]
                : i % 4 === 0
                  ? ["equipment-revitavivante"]
                  : [],
        deviceMode:
          c.domain === "Gait"
            ? `Gait pattern ${String.fromCharCode(65 + (i % 3))}`
            : c.domain === "Upper limb"
              ? `Reach-grasp level ${(i % 4) + 1}`
              : i % 4 === 0
                ? "Therapist-configured mode"
                : "",
        attemptedReps: Math.max(
          40,
          Math.round(c.weeklyReps / 6 + j * 20 + 12),
        ),
        activeContribution:
          c.domain === "Gait" || c.domain === "Upper limb"
            ? 44 + ((i * 5 + j * 7) % 43)
            : null,
        deviceAssistance:
          c.domain === "Gait" || c.domain === "Upper limb"
            ? 56 - ((i * 4 + j * 5) % 32)
            : null,
        rangeOfMotion:
          c.domain === "Upper limb" ? `${38 + ((i + j) % 18)}°` : "",
        symmetry: c.domain === "Gait" ? 61 + ((i * 3 + j * 6) % 31) : null,
        calibrationStatus:
          c.domain === "Gait" || c.domain === "Upper limb"
            ? (i + j) % 11 === 0
              ? "Incomplete capture"
              : "Valid"
            : "Not recorded",
        notes:
          stress === 4
            ? "Therapist should review grading and tolerance before increasing dose."
            : "Synthetic session note: task completed with therapist-observed dose and tolerance markers.",
        createdAt: now,
      });
    });
  });
  const outcomes = CASES.flatMap((x, i) => {
    const caseId = `case-${String(i + 1).padStart(2, "0")}`,
      lower = /TUG|Sit-to-Stand|Dizziness|SARA|sec/i.test(x.join(" "));
    return [
      {
        id: `outcome-${i + 1}-a`,
        caseId,
        name: x[9],
        baseline: x[10],
        current: x[11],
        target: x[12],
        date: ago(i % 3),
        direction: lower ? "Lower is better" : "Higher is better",
        note: "Synthetic outcome value for dashboard demonstration only.",
        createdAt: now,
      },
      {
        id: `outcome-${i + 1}-b`,
        caseId,
        name: "Functional carryover rating",
        baseline: `${2 + (i % 3)}/10`,
        current: `${4 + (i % 4)}/10`,
        target: "8/10",
        date: ago((i % 4) + 1),
        direction: "Higher is better",
        note: "Clinician-rated transfer into daily routine.",
        createdAt: now,
      },
    ];
  });
  return {
    schemaVersion: SCHEMA_VERSION,
    cases,
    sessions,
    outcomes,
    equipment,
    exports: [],
    aiActions: {},
    reportDrafts: {},
  };
}
function normal(v) {
  if (!v || !Array.isArray(v.cases) || !Array.isArray(v.sessions)) return null;
  return {
    schemaVersion: SCHEMA_VERSION,
    cases: v.cases,
    sessions: v.sessions.map((session) => ({
      ...session,
      equipmentIds: Array.isArray(session.equipmentIds)
        ? session.equipmentIds
        : [],
    })),
    outcomes: Array.isArray(v.outcomes) ? v.outcomes : [],
    equipment: Array.isArray(v.equipment) ? v.equipment : equipmentSeed(),
    exports: Array.isArray(v.exports) ? v.exports : [],
    aiActions:
      v.aiActions && typeof v.aiActions === "object" && !Array.isArray(v.aiActions)
        ? v.aiActions
        : {},
    reportDrafts:
      v.reportDrafts &&
      typeof v.reportDrafts === "object" &&
      !Array.isArray(v.reportDrafts)
        ? v.reportDrafts
        : {},
  };
}
function load() {
  try {
    return normal(JSON.parse(localStorage.getItem(APP_KEY))) || sample();
  } catch {
    return sample();
  }
}
let state = load();
const save = () => localStorage.setItem(APP_KEY, JSON.stringify(state));
const getCase = (id) => state.cases.find((c) => c.id === id);
const getEquipment = (id) => state.equipment.find((item) => item.id === id);
const equipmentForSession = (session) =>
  (session.equipmentIds || []).map(getEquipment).filter(Boolean);
const sel = () =>
  $("reviewCaseFilter")?.value && $("reviewCaseFilter").value !== "all"
    ? $("reviewCaseFilter").value
    : null;
const scope = () =>
  sel() ? state.cases.filter((c) => c.id === sel()) : state.cases;
const sessionsFor = (id) => state.sessions.filter((s) => s.caseId === id);
const outcomesFor = (id) => state.outcomes.filter((o) => o.caseId === id);
const weeklyFor = (id) => sessionsFor(id).filter((s) => inWeek(s.date));
function stats(c) {
  const w = weeklyFor(c.id),
    active = w.reduce((a, s) => a + n(s.activeMinutes), 0),
    scheduled = w.reduce((a, s) => a + n(s.minutes), 0),
    reps = w.reduce((a, s) => a + n(s.reps), 0),
    ass = w.filter((s) => s.carryover !== "Not assessed"),
    pos = ass.filter(
      (s) =>
        s.carryover === "Yes, in daily activity" || s.carryover === "Partial",
    );
  return {
    w,
    active,
    scheduled,
    reps,
    quality: avg(w.map((s) => s.quality)),
    fatigue: avg(w.map((s) => s.fatigue)),
    pain: avg(w.map((s) => s.pain)),
    carryAssessed: ass.length,
    carryPositive: pos.length,
    carryRate: ass.length ? Math.round((pos.length / ass.length) * 100) : 0,
    highFatigue: w.filter((s) => n(s.fatigue) >= 8 && n(s.quality) <= 2),
    highPain: w.filter((s) => n(s.pain) >= 7),
    hard: w.filter((s) => s.challenge === "Too difficult"),
    lowHome: w.filter((s) => s.homeAdherence === "Low"),
    unclear: w.filter((s) => s.specificity === "Unclear link"),
    reviewDue: daysUntil(c.reviewDate),
    minutePct: pct(active, c.weeklyMinutes),
    repPct: pct(reps, c.weeklyReps),
  };
}
function review(c) {
  if (globalThis.PlexusAI?.legacyReviewFor)
    return globalThis.PlexusAI.legacyReviewFor(c);
  const s = stats(c),
    r = [];
  if (!s.w.length)
    r.push([
      "warning",
      "No session logged this week",
      "No current-week session has been recorded.",
      "Check whether therapy occurred but was not recorded.",
    ]);
  if (s.active < n(c.weeklyMinutes) * 0.5)
    r.push([
      "warning",
      "Active practice below half of target",
      `${s.active} active minutes against a ${c.weeklyMinutes} minute target.`,
      "Review setup time, fatigue, staffing and home-practice feasibility.",
    ]);
  if (s.reps < n(c.weeklyReps) * 0.5)
    r.push([
      "warning",
      "Repetition volume below half of target",
      `${s.reps} reps against a ${c.weeklyReps} rep target.`,
      "Consider shorter bouts, simpler tasks or assisted practice.",
    ]);
  if (s.highFatigue.length)
    r.push([
      "risk",
      "High fatigue with low quality",
      `${s.highFatigue.length} session(s) show fatigue >=8/10 and quality <=2/5.`,
      "Review rest intervals, compensation, safety and dose tolerance.",
    ]);
  if (s.highPain.length)
    r.push([
      "risk",
      "Pain needs review",
      `${s.highPain.length} session(s) show pain >=7/10.`,
      "Review precautions, task selection and clinical assessment needs.",
    ]);
  if (s.carryAssessed >= 2 && s.carryPositive === 0)
    r.push([
      "warning",
      "No functional carryover",
      `${s.carryAssessed} assessed sessions with no full or partial carryover.`,
      "Review task specificity, home environment and caregiver support.",
    ]);
  if (s.hard.length >= 2)
    r.push([
      "warning",
      "Challenge may be too high",
      `${s.hard.length} session(s) marked Too difficult.`,
      "Grade the task or increase assistance before increasing dose.",
    ]);
  if (s.lowHome.length >= 2)
    r.push([
      "warning",
      "Home adherence is low",
      `${s.lowHome.length} session(s) marked low home adherence.`,
      "Simplify the home task and review barriers.",
    ]);
  if (s.unclear.length)
    r.push([
      "info",
      "Task specificity is unclear",
      `${s.unclear.length} session(s) had unclear goal linkage.`,
      "Clarify the functional bridge or revise the goal.",
    ]);
  if (s.reviewDue !== null && s.reviewDue <= 0)
    r.push([
      "warning",
      "Programme review is due",
      `Review date: ${fmt(c.reviewDate)}.`,
      "Update goals, targets, precautions and outcome measures.",
    ]);
  if (
    s.w.length &&
    s.active >= n(c.weeklyMinutes) &&
    s.reps >= n(c.weeklyReps) &&
    s.quality >= n(c.minimumQuality)
  )
    r.push([
      "good",
      "Dose and quality targets are being met",
      `${s.active} min, ${s.reps} reps, quality ${s.quality.toFixed(1)}/5.`,
      "Check whether gains transfer into outcomes and daily activity.",
    ]);
  return (
    r.length
      ? r
      : [
          [
            "good",
            "No major review flags",
            "Current entries do not cross rule-based thresholds.",
            "Continue collecting dose, quality, fatigue, pain, carryover and outcomes.",
          ],
        ]
  ).map((x) => ({ severity: x[0], title: x[1], trigger: x[2], review: x[3] }));
}
const allReviews = () =>
  state.cases.length
    ? scope().flatMap(review)
    : [
        {
          severity: "warning",
          title: "No programme created",
          trigger: "The app has no case/programme yet.",
          review:
            "Create a programme first, then add sessions and outcome measures.",
        },
      ];
function renderSelectors() {
  const selectedSessionCase = $("sessionCaseId")?.value;
  const selectedOutcomeCase = $("outcomeCaseId")?.value;
  const opts = state.cases
      .map((c) => `<option value="${c.id}">${e(c.label)}</option>`)
      .join(""),
    empty = '<option value="">Create a programme first</option>';
  if ($("sessionCaseId")) $("sessionCaseId").innerHTML = opts || empty;
  if ($("outcomeCaseId")) $("outcomeCaseId").innerHTML = opts || empty;
  if (
    selectedSessionCase &&
    state.cases.some((c) => c.id === selectedSessionCase)
  )
    $("sessionCaseId").value = selectedSessionCase;
  if (
    selectedOutcomeCase &&
    state.cases.some((c) => c.id === selectedOutcomeCase)
  )
    $("outcomeCaseId").value = selectedOutcomeCase;
  if ($("reviewCaseFilter")) {
    const cur = $("reviewCaseFilter").value || "all";
    $("reviewCaseFilter").innerHTML =
      `<option value="all">All ${state.cases.length || 18} sample cases</option>${opts}`;
    $("reviewCaseFilter").value =
      cur === "all" || state.cases.some((c) => c.id === cur) ? cur : "all";
  }
  renderEquipmentPicker();
}
function renderEquipmentPicker() {
  const picker = $("sessionEquipmentPicker");
  if (!picker) return;
  const selected = new Set(
    [...picker.querySelectorAll('input[type="checkbox"]:checked')].map(
      (input) => input.value,
    ),
  );
  const available = state.equipment.filter((item) => item.status === "Active");
  picker.innerHTML = available.length
    ? available
        .map(
          (item) =>
            `<label class="equipment-option"><input type="checkbox" name="sessionEquipment" value="${e(item.id)}" ${selected.has(item.id) ? "checked" : ""} /><span>${e(item.name)}<small>${e(item.category)}</small></span></label>`,
        )
        .join("")
    : '<p class="empty">No active equipment. Add or activate equipment in the Equipment section.</p>';
}
function renderStats() {
  const ps = scope(),
    w = ps.flatMap((c) => weeklyFor(c.id)),
    active = w.reduce((a, s) => a + n(s.activeMinutes), 0),
    reps = w.reduce((a, s) => a + n(s.reps), 0),
    tm = ps.reduce((a, c) => a + n(c.weeklyMinutes), 0),
    targetReps = ps.reduce((a, c) => a + n(c.weeklyReps), 0);
  $("minutesThisWeek").textContent = active;
  $("repsThisWeek").textContent = reps;
  const qualities = w
    .map((s) => n(s.quality, NaN))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const medianQuality = qualities.length
    ? qualities.length % 2
      ? qualities[(qualities.length - 1) / 2]
      : (qualities[qualities.length / 2 - 1] + qualities[qualities.length / 2]) / 2
    : 0;
  $("avgQuality").textContent = medianQuality.toFixed(1);
  $("casesNeedingReview").textContent = globalThis.PlexusAI?.activeSignals
    ? globalThis.PlexusAI.activeSignals().length
    : ps.filter((c) =>
        review(c).some((i) => i.severity === "warning" || i.severity === "risk"),
      ).length;
  const expectedMinutes = Math.round(
    ps.reduce(
      (sum, c) =>
        sum + n(c.weeklyMinutes) * (globalThis.PlexusAI?.weekProgressFor?.(c) ?? 1),
      0,
    ),
  );
  const expectedReps = Math.round(
    ps.reduce(
      (sum, c) =>
        sum + n(c.weeklyReps) * (globalThis.PlexusAI?.weekProgressFor?.(c) ?? 1),
      0,
    ),
  );
  $("minutesTargetLabel").textContent =
    `${tr("Expected to date")}: ${expectedMinutes} min · ${pct(active, expectedMinutes)}%`;
  $("repsTargetLabel").textContent =
    `${tr("Expected to date")}: ${expectedReps} reps · ${pct(reps, expectedReps)}%`;
}
function renderPrograms() {
  const el = $("programmeList");
  if (!el) return;
  if (!state.cases.length) {
    el.innerHTML =
      '<p class="empty">No programmes yet. Click Load sample to restore the 18 synthetic cases.</p>';
    return;
  }
  el.innerHTML = state.cases
    .map((c) => {
      const s = stats(c),
        flag =
          review(c).find((i) => i.severity === "risk") ||
          review(c).find((i) => i.severity === "warning") ||
          review(c)[0];
      return `<article class="programme-card"><div class="session-top"><div><h3>${e(c.label)}</h3><p>${e(c.diagnosis)} · ${e(c.phase)} · ${e(c.domain)}</p></div><span class="badge ${flag.severity}">${e(flag.severity === "good" ? "On track" : flag.severity)}</span></div><p>${e(c.primaryGoal)}</p><div class="mini-metrics"><span>${s.active}/${c.weeklyMinutes} min</span><span>${s.reps}/${c.weeklyReps} reps</span><span>Quality ${s.quality ? s.quality.toFixed(1) : "0.0"}/5</span></div><button type="button" class="secondary mini-button" data-edit="${c.id}">Edit programme</button></article>`;
    })
    .join("");
  document
    .querySelectorAll("[data-edit]")
    .forEach((b) => (b.onclick = () => editProgram(b.dataset.edit)));
}
function renderEquipment() {
  const list = $("equipmentList");
  const usageTable = $("equipmentUsageTable");
  if (!list || !usageTable) return;
  list.innerHTML = state.equipment.length
    ? state.equipment
        .map((item) => {
          const linked = state.sessions.filter((session) =>
            (session.equipmentIds || []).includes(item.id),
          ).length;
          return `<article class="programme-card"><div class="programme-card-top"><div><h3>${e(item.name)}</h3><p>${e(item.category)} · ${e(item.manufacturer || "Manufacturer not specified")}</p></div><span class="badge ${item.status === "Active" ? "good" : item.status === "Maintenance" ? "warning" : "info"}">${e(item.status)}</span></div><div class="mini-metrics"><span>${linked} ${e(linked === 1 ? "session" : "sessions")}</span>${item.model ? `<span>${e(item.model)}</span>` : ""}${item.identifier ? `<span>${e(item.identifier)}</span>` : ""}</div>${item.notes ? `<p>${e(item.notes)}</p>` : ""}<div class="equipment-card-actions"><button type="button" class="secondary mini-button" data-edit-equipment="${e(item.id)}">Edit equipment</button><button type="button" class="danger mini-button" data-remove-equipment="${e(item.id)}">Remove</button></div></article>`;
        })
        .join("")
    : '<p class="empty">No equipment has been added.</p>';

  usageTable.innerHTML = state.equipment.length
    ? state.equipment
        .map((item) => {
          const sessions = state.sessions.filter((session) =>
            (session.equipmentIds || []).includes(item.id),
          );
          const active = sessions.reduce(
            (sum, session) => sum + n(session.activeMinutes),
            0,
          );
          const reps = sessions.reduce(
            (sum, session) => sum + n(session.reps),
            0,
          );
          const lastUsed = sessions
            .map((session) => session.date)
            .filter(Boolean)
            .sort()
            .at(-1);
          return `<tr><td><strong>${e(item.name)}</strong>${item.identifier ? `<br><span>${e(item.identifier)}</span>` : ""}</td><td>${e(item.category)}</td><td><span class="badge ${item.status === "Active" ? "good" : item.status === "Maintenance" ? "warning" : "info"}">${e(item.status)}</span></td><td>${sessions.length}</td><td>${active}</td><td>${reps}</td><td>${lastUsed ? fmt(lastUsed) : e("Never")}</td></tr>`;
        })
        .join("")
    : '<tr><td colspan="7" class="empty">No equipment has been added.</td></tr>';

  document
    .querySelectorAll("[data-edit-equipment]")
    .forEach(
      (button) =>
        (button.onclick = () => editEquipment(button.dataset.editEquipment)),
    );
  document
    .querySelectorAll("[data-remove-equipment]")
    .forEach(
      (button) =>
        (button.onclick = () =>
          removeEquipment(button.dataset.removeEquipment)),
    );
}
function renderTable() {
  if (!state.cases.length) {
    $("caseTable").innerHTML =
      '<tr><td colspan="8" class="empty">No programmes yet.</td></tr>';
    return;
  }
  $("caseTable").innerHTML = state.cases
    .map((c) => {
      const s = stats(c),
        flag =
          review(c).find((i) => i.severity === "risk") ||
          review(c).find((i) => i.severity === "warning") ||
          review(c)[0];
      return `<tr><td><strong>${e(c.label)}</strong><br><span>${e(c.diagnosis)} · ${e(c.phase)}</span></td><td>${e(c.primaryGoal)}</td><td>${s.active}/${c.weeklyMinutes} min<br>${s.reps}/${c.weeklyReps} reps</td><td>${s.quality ? s.quality.toFixed(1) : "0.0"}/5</td><td>${s.fatigue ? s.fatigue.toFixed(1) : "0.0"}/10</td><td>${s.pain ? s.pain.toFixed(1) : "0.0"}/10</td><td>${s.carryAssessed ? `${s.carryRate}%` : "Not assessed"}</td><td><span class="badge ${flag.severity}">${e(flag.title)}</span></td></tr>`;
    })
    .join("");
}
function renderInsights() {
  if (globalThis.PlexusAI?.renderQueue) {
    globalThis.PlexusAI.renderQueue();
    return;
  }
  $("insights").innerHTML = allReviews()
    .map(
      (i) =>
        `<article class="insight ${i.severity}"><div class="insight-top"><strong>${e(i.title)}</strong><span class="badge ${i.severity}">${e(i.severity === "risk" ? "Review recommended" : i.severity)}</span></div><p><b>Trigger:</b> ${e(i.trigger)}</p><p><b>Clinician review:</b> ${e(i.review)}</p></article>`,
    )
    .join("");
}
function renderSessions() {
  const data = (
    sel() ? state.sessions.filter((s) => s.caseId === sel()) : state.sessions
  ).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  $("sessionsList").innerHTML = data.length
    ? data
        .map((s) => {
          const equipment = equipmentForSession(s);
          const deviceDetails = [
            s.deviceMode ? `mode ${e(s.deviceMode)}` : "",
            s.attemptedReps != null ? `${s.reps}/${s.attemptedReps} valid reps` : "",
            s.activeContribution != null ? `active contribution ${s.activeContribution}%` : "",
            s.deviceAssistance != null ? `device assistance ${s.deviceAssistance}%` : "",
            s.symmetry != null ? `symmetry ${s.symmetry}%` : "",
            s.calibrationStatus && s.calibrationStatus !== "Not recorded"
              ? `data quality ${e(s.calibrationStatus)}`
              : "",
          ].filter(Boolean);
          return `<article class="session-item"><div class="session-top"><div><div class="session-title">${e(s.task)} · ${e(getCase(s.caseId)?.label || "Unknown case")}</div><div class="session-meta">${fmt(s.date)} · ${e(s.setting)}<br>active ${s.activeMinutes} min / scheduled ${s.minutes} min · ${s.reps} reps · quality ${s.quality}/5 · fatigue ${s.fatigue}/10 · pain ${s.pain}/10<br>${e(s.assistance)} · ${e(s.challenge)} · carryover: ${e(s.carryover)} · home: ${e(s.homeAdherence)}${deviceDetails.length ? `<br>${deviceDetails.join(" · ")}` : ""}</div>${equipment.length ? `<div class="equipment-chips" aria-label="Equipment used">${equipment.map((item) => `<span class="equipment-chip">${e(item.name)}</span>`).join("")}</div>` : ""}</div><button type="button" class="delete-session danger" data-id="${s.id}">Delete</button></div>${s.notes ? `<p class="session-notes">${e(s.notes)}</p>` : ""}</article>`;
        })
        .join("")
    : '<p class="empty">No sessions saved yet.</p>';
  document.querySelectorAll(".delete-session").forEach(
    (b) =>
      (b.onclick = () => {
        state.sessions = state.sessions.filter((s) => s.id !== b.dataset.id);
        save();
        render();
        status("Session deleted.");
      }),
  );
}
function outcomeProgress(o) {
  const b = num(o.baseline),
    c = num(o.current),
    t = num(o.target);
  if (
    o.direction === "Goal-specific" ||
    b === null ||
    c === null ||
    t === null ||
    b === t
  )
    return null;
  return o.direction === "Lower is better"
    ? pct(b - c, b - t)
    : pct(c - b, t - b);
}
function renderOutcomes() {
  const data = (
    sel() ? state.outcomes.filter((o) => o.caseId === sel()) : state.outcomes
  ).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  $("outcomeTrajectoryChart").innerHTML = data.length
    ? data
        .map(
          (o) =>
            `<article class="outcome-card"><div class="outcome-top"><strong>${e(o.name)}</strong><span>${e(getCase(o.caseId)?.label || "Case")}</span></div><div class="trajectory"><span>Baseline<br><b>${e(o.baseline || "—")}</b></span><span>Current<br><b>${e(o.current || "—")}</b></span><span>Target<br><b>${e(o.target || "—")}</b></span></div>${outcomeProgress(o) === null ? `<p class="small-note">Goal-specific direction · clinician interpretation required</p>` : `<div class="progress"><div class="bar" style="width:${outcomeProgress(o)}%"></div></div><small>${outcomeProgress(o)}% of target trajectory · ${e(o.direction)}</small>`}</article>`,
        )
        .join("")
    : '<p class="empty">Outcome trajectory charts appear after sample data or recorded measures are available.</p>';
  $("outcomesList").innerHTML = data.length
    ? data
        .map(
          (o) =>
            `<article class="session-item"><div class="session-top"><div><div class="session-title">${e(o.name)} · ${e(getCase(o.caseId)?.label || "Unknown case")}</div><div class="session-meta">${fmt(o.date)} · baseline: ${e(o.baseline || "—")} · current: ${e(o.current || "—")} · target: ${e(o.target || "—")} · ${e(o.direction)}</div></div><button type="button" class="delete-outcome danger" data-id="${o.id}">Delete</button></div>${o.note ? `<p class="session-notes">${e(o.note)}</p>` : ""}</article>`,
        )
        .join("")
    : '<p class="empty">No outcome measures recorded yet.</p>';
  document.querySelectorAll(".delete-outcome").forEach(
    (b) =>
      (b.onclick = () => {
        state.outcomes = state.outcomes.filter((o) => o.id !== b.dataset.id);
        save();
        render();
        status("Outcome deleted.");
      }),
  );
}
function charts() {
  const ps = scope();
  const doseCases = ps.length > 8
    ? ps
        .slice()
        .sort((a, b) => {
          const aStats = stats(a), bStats = stats(b);
          return Math.min(aStats.minutePct, aStats.repPct) - Math.min(bStats.minutePct, bStats.repPct) || a.label.localeCompare(b.label);
        })
        .slice(0, 8)
    : ps;
  $("doseChart").innerHTML = doseCases.length
    ? doseCases
        .map((c) => {
          const s = stats(c);
          return `<div class="chart-row"><span>${e(c.label)}</span><div class="dual-bars"><i class="bar-minutes" style="width:${s.minutePct}%"></i><i class="bar-reps" style="width:${s.repPct}%"></i></div><b>${s.minutePct}% min · ${s.repPct}% reps</b></div>`;
        })
        .join("")
    : '<p class="empty">No programme data available.</p>';
  const w = ps.flatMap((c) => weeklyFor(c.id)),
    act = w.reduce((a, s) => a + n(s.activeMinutes), 0),
    sch = w.reduce((a, s) => a + n(s.minutes), 0),
    ap = pct(act, sch);
  $("doseChartSummary").textContent =
    `${act} active minutes logged this week across ${ps.length} programme(s).${ps.length > doseCases.length ? ` Showing the ${doseCases.length} lowest-attainment cases.` : ""}`;
  $("activeScheduledChart").innerHTML =
    `<div class="stacked-bar"><span class="active" style="width:${ap}%"></span><span class="inactive" style="width:${100 - ap}%"></span></div><div class="legend"><span><i class="dot active-dot"></i>Active ${act} min</span><span><i class="dot inactive-dot"></i>Other scheduled time ${Math.max(0, sch - act)} min</span></div>`;
  $("activeScheduledSummary").textContent = sch
    ? `${ap}% of scheduled time became active practice this week.`
    : "No scheduled time recorded this week.";
  const yes = w.filter((s) => s.carryover === "Yes, in daily activity").length,
    part = w.filter((s) => s.carryover === "Partial").length,
    no = w.filter((s) => s.carryover === "No").length,
    na = w.filter((s) => s.carryover === "Not assessed").length,
    total = Math.max(1, w.length),
    d1 = (yes / total) * 360,
    d2 = ((yes + part) / total) * 360,
    d3 = ((yes + part + no) / total) * 360;
  $("carryoverChart").innerHTML =
    `<div class="donut" style="background:conic-gradient(var(--ok) 0deg ${d1}deg,var(--accent) ${d1}deg ${d2}deg,var(--risk) ${d2}deg ${d3}deg,rgba(255,255,255,.12) ${d3}deg 360deg)"><span>${Math.round(((yes + part) / total) * 100)}%</span></div><div class="legend vertical"><span><i class="dot ok-dot"></i>Yes ${yes}</span><span><i class="dot active-dot"></i>Partial ${part}</span><span><i class="dot risk-dot"></i>No ${no}</span><span><i class="dot muted-dot"></i>Not assessed ${na}</span></div>`;
  $("carryoverSummary").textContent =
    `${yes + part} of ${w.length} current-week session(s) show full or partial carryover.`;
  lineChart(ps);
}
function lineChart(ps) {
  const data = ps
      .flatMap((c) => sessionsFor(c.id))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .slice(-18),
    el = $("toleranceChart");
  if (!data.length) {
    el.innerHTML =
      '<p class="empty">No sessions available for tolerance trend.</p>';
    return;
  }
  const W = 760,
    H = 230,
    P = 30,
    x = (i) =>
      data.length === 1 ? W / 2 : P + (i * (W - P * 2)) / (data.length - 1),
    y5 = (v) => H - P - ((n(v) - 1) / 4) * (H - P * 2),
    y10 = (v) => H - P - (n(v) / 10) * (H - P * 2),
    poly = (pts, cl) =>
      `<polyline class="${cl}" points="${pts.map((p) => `${p.x},${p.y}`).join(" ")}"/>`;
  const q = data.map((s, i) => ({ x: x(i), y: y5(s.quality) })),
    f = data.map((s, i) => ({ x: x(i), y: y10(s.fatigue) })),
    p = data.map((s, i) => ({ x: x(i), y: y10(s.pain) }));
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="line-chart"><line x1="${P}" y1="${H - P}" x2="${W - P}" y2="${H - P}" class="axis"/><line x1="${P}" y1="${P}" x2="${P}" y2="${H - P}" class="axis"/>${poly(q, "line-quality")}${poly(f, "line-fatigue")}${poly(p, "line-pain")}${q.map((a) => `<circle cx="${a.x}" cy="${a.y}" r="4" class="point quality"/>`).join("")}${f.map((a) => `<circle cx="${a.x}" cy="${a.y}" r="4" class="point fatigue"/>`).join("")}${p.map((a) => `<circle cx="${a.x}" cy="${a.y}" r="4" class="point pain"/>`).join("")}</svg><div class="legend"><span><i class="dot quality-dot"></i>Quality</span><span><i class="dot fatigue-dot"></i>Fatigue</span><span><i class="dot pain-dot"></i>Pain</span></div>`;
  const last = data.at(-1);
  $("toleranceSummary").textContent =
    `Latest session: quality ${last.quality}/5, fatigue ${last.fatigue}/10 and pain ${last.pain}/10.`;
}
function evidence() {
  const s = state.sessions,
    act = s.reduce((a, x) => a + n(x.activeMinutes), 0),
    sch = s.reduce((a, x) => a + n(x.minutes), 0),
    ass = s.filter((x) => x.carryover !== "Not assessed"),
    pos = ass.filter(
      (x) =>
        x.carryover === "Yes, in daily activity" || x.carryover === "Partial",
    ),
    cards = [
      ["Synthetic cases", state.cases.length],
      ["Sessions", s.length],
      ["Equipment items", state.equipment.length],
      [
        "Equipment-linked sessions",
        s.length
          ? `${Math.round((s.filter((session) => (session.equipmentIds || []).length).length / s.length) * 100)}%`
          : "—",
      ],
      ["Outcome measures", state.outcomes.length],
      ["Active practice", `${act} min`],
      ["Practice conversion", sch ? `${Math.round((act / sch) * 100)}%` : "—"],
      [
        "Carryover rate",
        ass.length
          ? `${Math.round((pos.length / ass.length) * 100)}%`
          : "Not assessed",
      ],
      [
        "Home-adherence entries",
        s.filter(
          (x) => !["Not applicable", "Not reported"].includes(x.homeAdherence),
        ).length,
      ],
      [
        "Review prompts",
        allReviews().filter((x) => x.severity !== "good").length,
      ],
    ];
  $("evidenceSummary").innerHTML = cards
    .map(
      (c) =>
        `<div class="evidence-card"><span>${e(c[0])}</span><strong>${e(c[1])}</strong></div>`,
    )
    .join("");
}
function note() {
  return (
    scope()
      .map((c) => {
        const s = stats(c),
          outs = outcomesFor(c.id),
          equipment = [
            ...new Map(
              sessionsFor(c.id)
                .flatMap(equipmentForSession)
                .map((item) => [item.id, item]),
            ).values(),
          ],
          rv = review(c).slice(0, 5),
          notSpecified = tr("Not specified");
        return [
          "VivantePlexus™",
          tr("Weekly Neurorehabilitation Progress Note"),
          "",
          `${tr("Case")}: ${c.label}`,
          `${tr("Pathway")}: ${tr(c.diagnosis)} · ${tr(c.phase)} · ${tr(c.domain)}`,
          `${tr("Goal status")}: ${tr(c.goalStatus)}`,
          `${tr("Responsible clinician")}: ${c.clinician || notSpecified}`,
          `${tr("Primary functional goal")}: ${c.primaryGoal}`,
          `${tr("Secondary goals")}: ${c.secondaryGoals || notSpecified}`,
          `${tr("ICF / participation frame")}: ${c.icfFrame || notSpecified}`,
          `${tr("Precautions / boundaries")}: ${c.precautions || notSpecified}`,
          "",
          `${tr("Dose summary, current week")}:`,
          `- ${tr("Sessions")}: ${s.w.length}`,
          `- ${tr("Active practice minutes")}: ${s.active} / ${c.weeklyMinutes}`,
          `- ${tr("Scheduled minutes")}: ${s.scheduled}`,
          `- ${tr("Repetitions")}: ${s.reps} / ${c.weeklyReps}`,
          `- ${tr("Average movement quality")}: ${s.quality ? s.quality.toFixed(1) : "0.0"} / 5`,
          `- ${tr("Average fatigue")}: ${s.fatigue ? s.fatigue.toFixed(1) : "0.0"} / 10`,
          `- ${tr("Average pain/discomfort")}: ${s.pain ? s.pain.toFixed(1) : "0.0"} / 10`,
          `- ${tr("Functional carryover")}: ${s.carryAssessed ? `${s.carryPositive}/${s.carryAssessed}` : tr("Not assessed")}`,
          `- ${tr("Equipment used")}: ${equipment.length ? equipment.map((item) => item.name).join(", ") : tr("None recorded")}`,
          "",
          `${tr("Outcome measures")}:`,
          outs.length
            ? outs
                .map(
                  (o) =>
                    `- ${o.name}: ${tr("Baseline")} ${o.baseline || "—"}, ${tr("Current")} ${o.current || "—"}, ${tr("Target")} ${o.target || "—"} (${fmt(o.date)})`,
                )
                .join("\n")
            : `- ${tr("No outcome measures recorded.")}`,
          "",
          `${tr("AI-Generated Review for clinician interpretation")}:`,
          rv.map((i) => `- ${tr(i.title)}: ${tr(i.review)}`).join("\n"),
          "",
          `${tr("Documentation note")}:`,
          tr(
            "This generated note is a draft for clinician review and does not make treatment decisions.",
          ),
        ].join("\n");
      })
      .join("\n\n---\n\n") || tr("No programme data available.")
  );
}
function report() {
  const ps = scope();
  $("reportPreview").innerHTML = ps.length
    ? `<div class="report-header"><div><h3>VivantePlexus™ Clinical Dose Review</h3><p>Generated ${fmt(today())} · ${ps.length} programme(s) in view</p></div><span class="badge info">Robotimize prototype</span></div><div class="report-columns">${ps
        .map((c) => {
          const s = stats(c);
          const equipment = [
            ...new Map(
              sessionsFor(c.id)
                .flatMap(equipmentForSession)
                .map((item) => [item.id, item]),
            ).values(),
          ];
          return `<article class="report-case"><h3>${e(c.label)}</h3><p>${e(c.primaryGoal)}</p><div class="mini-metrics"><span>${s.minutePct}% minute target</span><span>${s.repPct}% rep target</span><span>${s.carryAssessed ? `${s.carryRate}% carryover` : "Carryover N/A"}</span></div><div class="equipment-chips" aria-label="Equipment used">${equipment.length ? equipment.map((item) => `<span class="equipment-chip">${e(item.name)}</span>`).join("") : `<span class="equipment-chip">${e("None recorded")}</span>`}</div></article>`;
        })
        .join(
          "",
        )}</div><h3>Priority review prompts</h3><div class="report-prompts">${allReviews()
        .slice(0, 8)
        .map(
          (i) =>
            `<div class="prompt-line"><span class="badge ${i.severity}">${e(i.severity)}</span><p><b>${e(i.title)}:</b> ${e(i.review)}</p></div>`,
        )
        .join("")}</div><pre>${e(note())}</pre>`
    : '<p class="empty">No programme data available.</p>';
}
function render() {
  try {
    renderSelectors();
    renderStats();
    renderPrograms();
    renderEquipment();
    renderTable();
    renderInsights();
    renderSessions();
    renderOutcomes();
    charts();
    evidence();
    report();
    globalThis.PlexusAI?.render?.();
    globalThis.i18n?.translatePage();
  } catch (err) {
    console.error(err);
    status(`Render error: ${err.message}`);
  }
}
function tab(name, historyMode = "replace") {
  const requested = $(name) ? name : "overview";
  const target = $(requested)?.classList.contains("tab-panel")
    ? requested
    : "overview";
  document.querySelectorAll(".tab-button").forEach((b) => {
    const on = b.dataset.tab === target;
    b.classList.toggle("active", on);
    if (on) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  document.querySelectorAll(".tab-panel").forEach((p) => {
    const on = p.id === target;
    p.classList.toggle("active", on);
    p.hidden = !on;
  });
  const hashTarget = requested !== target && $(requested) ? requested : target;
  if (hashTarget === "ai-review") globalThis.PlexusAI?.showLayer?.("signals");
  else if (hashTarget === "ai-transparency") globalThis.PlexusAI?.showLayer?.("transparency");
  else if (target === "overview") globalThis.PlexusAI?.showLayer?.("command");
  if (historyMode === "push" && location.hash !== `#${hashTarget}`)
    history.pushState?.(null, "", `#${hashTarget}`);
  else if (historyMode === "replace")
    history.replaceState?.(null, "", `#${hashTarget}`);
  scrollTo({ top: 0, behavior: "smooth" });
  if (hashTarget !== target)
    $(hashTarget)?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  status(`Showing ${hashTarget}.`);
}
function resetEquipmentForm() {
  $("equipmentForm")?.reset();
  if ($("equipmentId")) $("equipmentId").value = "";
  if ($("equipmentStatus")) $("equipmentStatus").value = "Active";
}
function editEquipment(id) {
  const item = getEquipment(id);
  if (!item) return;
  Object.entries({
    equipmentId: item.id,
    equipmentName: item.name,
    equipmentCategory: item.category,
    equipmentStatus: item.status,
    equipmentManufacturer: item.manufacturer,
    equipmentModel: item.model,
    equipmentIdentifier: item.identifier,
    equipmentNotes: item.notes,
  }).forEach(([key, value]) => {
    if ($(key)) $(key).value = value || "";
  });
  tab("equipment", "push");
  $("equipmentName")?.focus();
}
function saveEquipment(ev) {
  ev.preventDefault();
  const id = $("equipmentId").value || uid("equipment");
  const previous = getEquipment(id);
  const now = new Date().toISOString();
  const item = {
    id,
    name: $("equipmentName").value.trim(),
    category: $("equipmentCategory").value,
    status: $("equipmentStatus").value,
    manufacturer: $("equipmentManufacturer").value.trim(),
    model: $("equipmentModel").value.trim(),
    identifier: $("equipmentIdentifier").value.trim(),
    notes: $("equipmentNotes").value.trim(),
    createdAt: previous?.createdAt || now,
    updatedAt: now,
  };
  state.equipment = state.equipment
    .filter((entry) => entry.id !== id)
    .concat(item);
  save();
  resetEquipmentForm();
  render();
  status("Equipment saved.");
}
function removeEquipment(id) {
  const item = getEquipment(id);
  if (!item) return;
  const linked = state.sessions.filter((session) =>
    (session.equipmentIds || []).includes(id),
  ).length;
  const message = linked
    ? `${item.name} is linked to ${linked} session(s). Remove it and unlink those sessions?`
    : `Remove ${item.name} from the equipment library?`;
  if (!confirm(tr(message))) return;
  state.equipment = state.equipment.filter((entry) => entry.id !== id);
  state.sessions = state.sessions.map((session) => ({
    ...session,
    equipmentIds: (session.equipmentIds || []).filter(
      (equipmentId) => equipmentId !== id,
    ),
  }));
  save();
  render();
  status("Equipment removed.");
}
function editProgram(id) {
  const c = getCase(id);
  if (!c) return;
  Object.entries({
    caseId: c.id,
    caseLabel: c.label,
    diagnosis: c.diagnosis,
    phase: c.phase,
    domain: c.domain,
    goalStatus: c.goalStatus,
    primaryGoal: c.primaryGoal,
    secondaryGoals: c.secondaryGoals,
    weeklyMinutes: c.weeklyMinutes,
    weeklyReps: c.weeklyReps,
    minimumQuality: c.minimumQuality,
    reviewDate: c.reviewDate,
    plannedDays: c.plannedDays,
    clinician: c.clinician,
    icfFrame: c.icfFrame,
    precautions: c.precautions,
  }).forEach(([k, v]) => {
    if ($(k)) $(k).value = v ?? "";
  });
  tab("programmes");
  $("caseLabel")?.focus();
}
function saveProgram(ev) {
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
  save();
  ev.target.reset();
  defaults();
  render();
  status("Programme saved.");
}
function saveSession(ev) {
  ev.preventDefault();
  if (!$("sessionCaseId").value)
    return alert(tr("Create a programme before logging a session."));
  state.sessions.push({
    id: uid("session"),
    caseId: $("sessionCaseId").value,
    date: $("date").value,
    setting: $("setting").value,
    task: $("task").value.trim(),
    minutes: n($("minutes").value),
    activeMinutes: n($("activeMinutes").value),
    reps: n($("reps").value),
    quality: n($("quality").value),
    fatigue: n($("fatigue").value),
    pain: n($("pain").value),
    assistance: $("assistance").value,
    challenge: $("challenge").value,
    specificity: $("specificity").value,
    carryover: $("carryover").value,
    homeAdherence: $("homeAdherence").value,
    restBreaks: n($("restBreaks").value),
    deviceMode: $("deviceMode")?.value.trim() || "",
    attemptedReps: $("attemptedReps")?.value
      ? n($("attemptedReps").value)
      : null,
    activeContribution: $("activeContribution")?.value
      ? n($("activeContribution").value)
      : null,
    deviceAssistance: $("deviceAssistance")?.value
      ? n($("deviceAssistance").value)
      : null,
    rangeOfMotion: $("rangeOfMotion")?.value.trim() || "",
    symmetry: $("symmetry")?.value ? n($("symmetry").value) : null,
    calibrationStatus: $("calibrationStatus")?.value || "Not recorded",
    equipmentIds: [
      ...document.querySelectorAll(
        '#sessionEquipmentPicker input[name="sessionEquipment"]:checked',
      ),
    ].map((input) => input.value),
    notes: $("notes").value.trim(),
    createdAt: new Date().toISOString(),
  });
  save();
  ev.target.reset();
  defaults();
  render();
  status("Session saved.");
}
function saveOutcome(ev) {
  ev.preventDefault();
  if (!$("outcomeCaseId").value)
    return alert(tr("Create a programme before recording an outcome."));
  state.outcomes.push({
    id: uid("outcome"),
    caseId: $("outcomeCaseId").value,
    name: $("outcomeName").value.trim(),
    baseline: $("baselineValue").value.trim(),
    current: $("currentValue").value.trim(),
    target: $("targetValue").value.trim(),
    date: $("outcomeDate").value || today(),
    direction: $("outcomeDirection").value,
    note: $("outcomeNote").value.trim(),
    createdAt: new Date().toISOString(),
  });
  save();
  ev.target.reset();
  defaults();
  render();
  status("Outcome saved.");
}
function defaults() {
  if ($("date")) $("date").value = today();
  if ($("outcomeDate")) $("outcomeDate").value = today();
  if ($("reviewDate") && !$("reviewDate").value)
    $("reviewDate").value = ago(-14);
  [
    ["minutes", 30],
    ["activeMinutes", 25],
    ["reps", 100],
    ["quality", 3],
    ["fatigue", 4],
    ["pain", 0],
    ["restBreaks", 1],
  ].forEach(([k, v]) => {
    if ($(k)) $(k).value = v;
  });
}
function dl(filename, content, type = "text/plain;charset=utf-8") {
  const b = new Blob([content], { type }),
    u = URL.createObjectURL(b),
    a = document.createElement("a");
  a.href = u;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(u);
  state.exports.push({
    id: uid("export"),
    filename,
    createdAt: new Date().toISOString(),
  });
  save();
  evidence();
  status(`${filename} exported.`);
}
function csv() {
  const h = [
      "caseLabel",
      "diagnosis",
      "phase",
      "primaryGoal",
      "date",
      "setting",
      "task",
      "scheduledMinutes",
      "activeMinutes",
      "repetitions",
      "quality",
      "fatigue",
      "pain",
      "assistance",
      "challenge",
      "specificity",
      "carryover",
      "homeAdherence",
      "restBreaks",
      "deviceMode",
      "attemptedReps",
      "activeContributionPercent",
      "deviceAssistancePercent",
      "rangeOfMotion",
      "symmetryPercent",
      "calibrationStatus",
      "equipmentNames",
      "equipmentIds",
      "notes",
    ],
    cell = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`,
    rows = state.sessions.map((s) => {
      const c = getCase(s.caseId) || {};
      return [
        c.label,
        c.diagnosis,
        c.phase,
        c.primaryGoal,
        s.date,
        s.setting,
        s.task,
        s.minutes,
        s.activeMinutes,
        s.reps,
        s.quality,
        s.fatigue,
        s.pain,
        s.assistance,
        s.challenge,
        s.specificity,
        s.carryover,
        s.homeAdherence,
        s.restBreaks,
        s.deviceMode,
        s.attemptedReps,
        s.activeContribution,
        s.deviceAssistance,
        s.rangeOfMotion,
        s.symmetry,
        s.calibrationStatus,
        equipmentForSession(s)
          .map((item) => item.name)
          .join("; "),
        (s.equipmentIds || []).join("; "),
        s.notes,
      ]
        .map(cell)
        .join(",");
    });
  dl(
    `vivanteplexus-therapy-data-${today()}.csv`,
    [h.join(","), ...rows].join("\n"),
    "text/csv;charset=utf-8",
  );
}
function fhir() {
  const entry = [],
    language = globalThis.i18n?.language || "en";
  state.cases.forEach((c) => {
    entry.push({
      resource: {
        resourceType: "Patient",
        language,
        id: c.id,
        identifier: [
          {
            system: "https://zenkoh.github.io/VivantePlexus.AI/case",
            value: c.label,
          },
        ],
        note: [{ text: "Synthetic or pseudonymous case label only." }],
      },
    });
    entry.push({
      resource: {
        resourceType: "CarePlan",
        language,
        id: `careplan-${c.id}`,
        status: "active",
        intent: "plan",
        subject: { reference: `Patient/${c.id}` },
        title: `VivantePlexus™ rehabilitation programme: ${c.domain}`,
        description: c.primaryGoal,
      },
    });
  });
  state.equipment.forEach((item) => {
    const resource = {
      resourceType: "Device",
      language,
      id: fhirId(item.id),
      status:
        item.status === "Active"
          ? "active"
          : item.status === "Inactive"
            ? "inactive"
            : "unknown",
      deviceName: [{ name: item.name, type: "user-friendly-name" }],
      type: { text: item.category },
    };
    if (item.identifier)
      resource.identifier = [
        {
          system: "https://zenkoh.github.io/VivantePlexus.AI/equipment",
          value: item.identifier,
        },
      ];
    if (item.manufacturer) resource.manufacturer = item.manufacturer;
    if (item.model) resource.modelNumber = item.model;
    if (item.notes) resource.note = [{ text: item.notes }];
    entry.push({ resource });
  });
  state.sessions.forEach((s) => {
    const procedureId = `therapy-${fhirId(s.id)}`.slice(0, 64);
    entry.push({
      resource: {
        resourceType: "Procedure",
        language,
        id: procedureId,
        status: "completed",
        subject: { reference: `Patient/${s.caseId}` },
        performedDateTime: s.date,
        code: { text: s.task || "Neurorehabilitation therapy session" },
        usedReference: (s.equipmentIds || [])
          .filter((id) => getEquipment(id))
          .map((id) => ({ reference: `Device/${fhirId(id)}` })),
        note: s.notes ? [{ text: s.notes }] : undefined,
      },
    });
    [
      [
        "active-practice-minutes",
        "Active practice minutes",
        s.activeMinutes,
        "min",
      ],
      ["repetitions", "Therapy repetitions", s.reps, "count"],
      ["movement-quality", "Movement quality score", s.quality, "score"],
      ["fatigue", "Fatigue rating", s.fatigue, "score"],
      ["pain", "Pain/discomfort rating", s.pain, "score"],
    ].forEach((m) =>
      entry.push({
        resource: {
          resourceType: "Observation",
          language,
          id: `${m[0]}-${s.id}`,
          status: "final",
          partOf: [{ reference: `Procedure/${procedureId}` }],
          subject: { reference: `Patient/${s.caseId}` },
          effectiveDateTime: s.date,
          code: { text: m[1] },
          valueQuantity: { value: n(m[2]), unit: m[3] },
        },
      }),
    );
  });
  state.outcomes.forEach((o) =>
    entry.push({
      resource: {
        resourceType: "Observation",
        language,
        id: `outcome-${o.id}`,
        status: "final",
        subject: { reference: `Patient/${o.caseId}` },
        effectiveDateTime: o.date,
        code: { text: o.name },
        valueString: `Baseline: ${o.baseline || "—"}; current: ${o.current || "—"}; target: ${o.target || "—"}`,
      },
    }),
  );
  dl(
    `vivanteplexus-fhir-shaped-export-${today()}.json`,
    JSON.stringify(
      {
        resourceType: "Bundle",
        language,
        type: "collection",
        timestamp: new Date().toISOString(),
        entry,
      },
      null,
      2,
    ),
    "application/json;charset=utf-8",
  );
}
function restore(ev) {
  const file = ev.target.files?.[0];
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const x = normal(JSON.parse(r.result));
      if (!x) return alert(tr("This does not look like a valid backup."));
      state = x;
      save();
      render();
      status("Backup restored.");
    } catch {
      alert(tr("Could not read this JSON backup."));
    } finally {
      ev.target.value = "";
    }
  };
  r.readAsText(file);
}
function bind() {
  document.querySelectorAll("[data-tab]").forEach(
    (link) =>
      (link.onclick = (event) => {
        event.preventDefault();
        tab(link.dataset.tab, "push");
      }),
  );
  $("caseForm")?.addEventListener("submit", saveProgram);
  $("sessionForm")?.addEventListener("submit", saveSession);
  $("equipmentForm")?.addEventListener("submit", saveEquipment);
  $("cancelEquipmentEditBtn")?.addEventListener("click", resetEquipmentForm);
  $("outcomeForm")?.addEventListener("submit", saveOutcome);
  $("reviewCaseFilter")?.addEventListener("change", () => {
    render();
    status("Review focus updated.");
  });
  $("loadSampleBtn")?.addEventListener("click", () => {
    state = sample();
    save();
    render();
    status(
      "Loaded 18 synthetic neurorehabilitation cases, 54 sessions and 36 outcomes.",
    );
  });
  $("exportCsvBtn")?.addEventListener("click", csv);
  $("exportNoteBtn")?.addEventListener("click", () =>
    dl(`vivanteplexus-progress-note-${today()}.txt`, note()),
  );
  $("exportFhirBtn")?.addEventListener("click", fhir);
  $("backupBtn")?.addEventListener("click", () =>
    dl(
      `vivanteplexus-backup-${today()}.json`,
      JSON.stringify(state, null, 2),
      "application/json;charset=utf-8",
    ),
  );
  $("restoreInput")?.addEventListener("change", restore);
  $("restoreLabel")?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    $("restoreInput")?.click();
  });
  $("clearBtn")?.addEventListener("click", () => {
    if (confirm(tr("Clear all local data from this browser?"))) {
      state = {
        schemaVersion: SCHEMA_VERSION,
        cases: [],
        sessions: [],
        outcomes: [],
        equipment: [],
        exports: [],
        aiActions: {},
        reportDrafts: {},
      };
      save();
      render();
      status(
        "Local data cleared. Click Load sample to restore the 18 synthetic cases.",
      );
    }
  });
  globalThis.addEventListener?.("languagechange", render);
  globalThis.addEventListener?.("popstate", () =>
    tab(location.hash.replace("#", "") || "overview", "none"),
  );
}
document.addEventListener("DOMContentLoaded", () => {
  bind();
  defaults();
  save();
  tab(location.hash.replace("#", "") || "overview");
  render();
  if (state.cases.length === 18)
    status(
      "Loaded 18 synthetic neurorehabilitation cases. Use the tabs or exports above.",
    );
});
