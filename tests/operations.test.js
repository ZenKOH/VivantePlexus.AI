const test = require("node:test");
const assert = require("node:assert/strict");
const {
  weekWindow,
  fieldCompleteness,
  defaultConfig,
  buildSnapshot,
  snapshotToCsv,
} = require("../operations.js");

const clinical = {
  cases: [
    { id: "case-1", label: "Case 1" },
    { id: "case-2", label: "Case 2" },
  ],
  equipment: [
    { id: "device-a", name: "Device A", category: "Gait" },
    { id: "device-b", name: "Device B", category: "Upper limb" },
  ],
  outcomes: [{ caseId: "case-1", measure: "10MWT" }],
  sessions: [
    {
      id: "s1", caseId: "case-1", date: "2026-09-01", minutes: 60, activeMinutes: 45,
      reps: 200, quality: 4, fatigue: 2, pain: 1, assistance: "Minimal", task: "Walking",
      specificity: "Directly linked to functional goal", carryover: "Emerging",
      equipmentIds: ["device-a"], deviceMode: "Assist-as-needed", deviceAssistance: 30,
      activeContribution: 70, rangeOfMotion: "Functional", symmetry: 82, calibrationStatus: "Checked",
    },
    {
      id: "s2", caseId: "case-2", date: "2026-09-03", minutes: 30, activeMinutes: 24,
      reps: 120, quality: 3, fatigue: 3, pain: 0, assistance: "Supervision", task: "Reach",
      specificity: "Directly linked to functional goal", carryover: "Observed",
      equipmentIds: ["device-a", "device-b"], deviceMode: "Active", deviceAssistance: 10,
      activeContribution: 90, rangeOfMotion: "Functional", symmetry: 88, calibrationStatus: "Checked",
    },
    {
      id: "old", caseId: "case-1", date: "2026-08-25", minutes: 90, activeMinutes: 70,
      equipmentIds: ["device-a"],
    },
  ],
};

test("weekWindow uses Monday through Sunday", () => {
  assert.deepEqual(weekWindow("2026-09-03").startIso, "2026-08-31");
  assert.deepEqual(weekWindow("2026-09-03").endIso, "2026-09-06");
});

test("buildSnapshot calculates utilisation only from configured capacity", () => {
  const config = defaultConfig();
  config.capacities = { "device-a": 180, "device-b": 120 };
  const snapshot = buildSnapshot(clinical, config, "2026-09-03");
  const deviceA = snapshot.equipment.find((item) => item.id === "device-a");
  const deviceB = snapshot.equipment.find((item) => item.id === "device-b");

  assert.equal(snapshot.portfolio.sessions, 2);
  assert.equal(snapshot.portfolio.scheduledMinutes, 90);
  assert.equal(snapshot.portfolio.activeMinutes, 69);
  assert.equal(snapshot.portfolio.activePracticeConversionPct, 77);
  assert.equal(deviceA.scheduledMinutes, 90);
  assert.equal(deviceA.utilisationPct, 50);
  assert.equal(deviceB.scheduledMinutes, 30);
  assert.equal(deviceB.utilisationPct, 25);
  assert.equal(deviceB.status, "Under-used");
});

test("missing capacity stays explicitly unconfigured", () => {
  const snapshot = buildSnapshot(clinical, defaultConfig(), "2026-09-03");
  assert.equal(snapshot.portfolio.utilisationPct, null);
  assert.equal(snapshot.equipment[0].utilisationPct, null);
  assert.equal(snapshot.equipment[0].status, "Capacity not configured");
});

test("reporting scenario is user-entered and calculates a transparent delta", () => {
  const config = defaultConfig();
  config.reporting = { baselineMinutes: 90, currentMinutes: 30, reportsPerMonth: 8 };
  const snapshot = buildSnapshot(clinical, config, "2026-09-03");
  assert.equal(snapshot.reportingScenario.minutesSavedPerReport, 60);
  assert.equal(snapshot.reportingScenario.monthlyHoursSaved, 8);
  assert.equal(snapshot.reportingScenario.isUserEnteredScenario, true);
});

test("field completeness treats numeric zero as present", () => {
  assert.equal(fieldCompleteness([{ pain: 0, fatigue: 2 }], ["pain", "fatigue"]), 100);
});

test("CSV export contains equipment-level operational evidence", () => {
  const config = defaultConfig();
  config.capacities = { "device-a": 180 };
  const csv = snapshotToCsv(buildSnapshot(clinical, config, "2026-09-03"));
  assert.match(csv, /Device A/);
  assert.match(csv, /utilisation_pct/);
  assert.match(csv, /Well utilised|Capacity available/);
});
