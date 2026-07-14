(function () {
  "use strict";

  const APP_KEY = "vivantePlexus.v1";
  const REQUIRED_EQUIPMENT = [
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
    {
      id: "equipment-custom-clinic-research",
      name: "Custom clinic or research devices",
      category: "Other",
      manufacturer: "",
      model: "",
      identifier: "",
      status: "Active",
      notes: "Placeholder option for locally configured clinic, pilot, research or prototype equipment.",
    },
  ];
  const LEGACY_ID_MAP = new Map([
    ["eq-handvivante", "equipment-handvivante"],
    ["eq-gaitvivante", "equipment-gaitvivante"],
    ["eq-elevovivante", "equipment-elevovivante"],
    ["eq-revitavivante", "equipment-revitavivante"],
    ["eq-none", ""],
  ]);

  let observer;
  let renderingDropdown = false;

  function appState() {
    try {
      if (typeof state !== "undefined" && state && Array.isArray(state.sessions)) return state;
    } catch { /* ignore */ }
    return readState();
  }

  function readState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(APP_KEY));
      return parsed && Array.isArray(parsed.sessions) ? parsed : null;
    } catch {
      return null;
    }
  }

  function writeState(nextState) {
    try {
      if (typeof save === "function" && nextState === appState()) save();
      else localStorage.setItem(APP_KEY, JSON.stringify(nextState));
    } catch {
      try { localStorage.setItem(APP_KEY, JSON.stringify(nextState)); } catch { /* ignore */ }
    }
  }

  function ensureRequiredEquipment() {
    const nextState = appState();
    if (!nextState) return;
    if (!Array.isArray(nextState.equipment)) nextState.equipment = [];
    const now = new Date().toISOString();
    const byId = new Map(nextState.equipment.map(item => [item.id, item]));
    let changed = false;
    for (const seed of REQUIRED_EQUIPMENT) {
      if (!byId.has(seed.id)) {
        nextState.equipment.push({ ...seed, createdAt: now, updatedAt: now });
        changed = true;
      }
    }
    if (changed) writeState(nextState);
  }

  function migrateLegacyEquipmentFields() {
    const nextState = appState();
    if (!nextState) return;
    let changed = false;
    for (const session of nextState.sessions) {
      if (!Array.isArray(session.equipmentIds)) session.equipmentIds = [];
      if (session.equipmentIds.length || !Array.isArray(session.equipment)) continue;
      const ids = session.equipment
        .map(id => LEGACY_ID_MAP.has(id) ? LEGACY_ID_MAP.get(id) : id)
        .filter(Boolean);
      if (ids.length) {
        session.equipmentIds = [...new Set(ids)];
        changed = true;
      }
      delete session.equipment;
    }
    if (changed) writeState(nextState);
  }

  function activeEquipment() {
    ensureRequiredEquipment();
    const nextState = appState();
    if (!nextState || !Array.isArray(nextState.equipment)) return REQUIRED_EQUIPMENT;
    const order = new Map(REQUIRED_EQUIPMENT.map((item, index) => [item.id, index]));
    return [...nextState.equipment]
      .filter(item => item.status !== "Inactive")
      .sort((a, b) => (order.get(a.id) ?? 1000) - (order.get(b.id) ?? 1000) || String(a.name).localeCompare(String(b.name)));
  }

  function nativeCheckboxes(picker) {
    return [...picker.querySelectorAll('input[name="sessionEquipment"]')]
      .filter(input => !input.closest("#sessionEquipmentHiddenInputs"));
  }

  function selectedFromExistingPicker(picker) {
    const select = picker.querySelector("#sessionEquipmentSelect");
    if (select) return select.value ? [select.value] : [];
    return nativeCheckboxes(picker).filter(input => input.checked).map(input => input.value);
  }

  function syncHiddenInput(picker) {
    const select = picker.querySelector("#sessionEquipmentSelect");
    const hidden = picker.querySelector("#sessionEquipmentHiddenInputs");
    if (!select || !hidden) return;
    hidden.innerHTML = select.value
      ? `<input type="checkbox" name="sessionEquipment" value="${htmlEscape(select.value)}" checked />`
      : "";
  }

  function htmlEscape(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderEquipmentDropdown() {
    const picker = document.getElementById("sessionEquipmentPicker");
    if (!picker || renderingDropdown) return;
    const hasDropdown = picker.querySelector("#sessionEquipmentSelect");
    const hasNativeCheckboxes = nativeCheckboxes(picker).length > 0;
    if (hasDropdown && !hasNativeCheckboxes) return;
    const previouslySelected = selectedFromExistingPicker(picker);
    const items = activeEquipment();
    const selectedId = previouslySelected.find(id => items.some(item => item.id === id)) || "";
    renderingDropdown = true;
    picker.classList.add("equipment-dropdown-wrap");
    picker.innerHTML = `
      <label class="equipment-dropdown-label" for="sessionEquipmentSelect">
        <span>Equipment dropdown list</span>
        <select id="sessionEquipmentSelect" name="sessionEquipmentSelect">
          <option value="">No equipment selected</option>
          ${items.map(item => `<option value="${htmlEscape(item.id)}" ${item.id === selectedId ? "selected" : ""}>${htmlEscape(item.name)} · ${htmlEscape(item.category)}</option>`).join("")}
        </select>
      </label>
      <p class="small-note">Use the Equipment tab to edit, add, deactivate or delete equipment options.</p>
      <div id="sessionEquipmentHiddenInputs" hidden></div>`;
    syncHiddenInput(picker);
    picker.querySelector("#sessionEquipmentSelect")?.addEventListener("change", () => syncHiddenInput(picker));
    renderingDropdown = false;
  }

  function prepareSubmitBridge(event) {
    const picker = document.getElementById("sessionEquipmentPicker");
    if (picker && event.target?.id === "sessionForm") syncHiddenInput(picker);
  }

  function repairTabButtons() {
    document.querySelectorAll(".tab-button[data-tab]").forEach(button => {
      button.type = "button";
      button.setAttribute("aria-controls", button.dataset.tab);
    });
  }

  function surfaceEquipmentHash() {
    if (location.hash === "#equipment") {
      document.getElementById("equipment")?.scrollIntoView({ block: "start" });
    }
  }

  function startPickerObserver() {
    const picker = document.getElementById("sessionEquipmentPicker");
    if (!picker || observer) return;
    observer = new MutationObserver(() => {
      const hasDropdown = picker.querySelector("#sessionEquipmentSelect");
      const hasNativeCheckboxes = nativeCheckboxes(picker).length > 0;
      if (!renderingDropdown && (!hasDropdown || hasNativeCheckboxes)) queueMicrotask(renderEquipmentDropdown);
    });
    observer.observe(picker, { childList: true, subtree: true });
  }

  ensureRequiredEquipment();
  migrateLegacyEquipmentFields();

  document.addEventListener("submit", prepareSubmitBridge, true);
  document.addEventListener("DOMContentLoaded", () => {
    repairTabButtons();
    renderEquipmentDropdown();
    startPickerObserver();
    surfaceEquipmentHash();
    window.addEventListener("hashchange", surfaceEquipmentHash);
    window.addEventListener("languagechange", () => queueMicrotask(renderEquipmentDropdown));
  });
})();

/* Load the dedicated welcome layer without coupling it to the clinical data modules. */
(function loadPlexusWelcomeLayer() {
  "use strict";
  const version = "20260714-2";
  const hash = location.hash || "#overview";
  if (hash === "#overview") {
    document.documentElement.classList.add("plexus-welcome-pending");
    const critical = document.createElement("style");
    critical.id = "plexusWelcomeCritical";
    critical.textContent = "html.plexus-welcome-pending body{visibility:hidden}";
    document.head.appendChild(critical);
    setTimeout(() => document.documentElement.classList.remove("plexus-welcome-pending"), 5000);
  }

  const loadScript = () => {
    if (document.querySelector('script[data-plexus-welcome]')) return;
    const script = document.createElement("script");
    script.src = `welcome-landing.js?v=${version}`;
    script.dataset.plexusWelcome = "true";
    script.addEventListener("error", () => document.documentElement.classList.remove("plexus-welcome-pending"));
    document.head.appendChild(script);
  };

  if (!document.querySelector('link[data-plexus-welcome]')) {
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = `welcome-landing.css?v=${version}`;
    stylesheet.dataset.plexusWelcome = "true";
    stylesheet.addEventListener("load", loadScript, { once: true });
    stylesheet.addEventListener("error", loadScript, { once: true });
    document.head.appendChild(stylesheet);
  } else {
    loadScript();
  }
})();
