const CONFIG = window.PLAYBOOK_CONFIG || {};
const LANGUAGE_ORDER = ["it", "en", "fr", "de"];
const DEFAULT_FLOW_ORDER = ["Before Showroom", "Follow up", "Future"];
const DEFAULT_LABELS = {
  flow: "Flow",
  objective: "Objective",
  inner_flow: "Inner flow",
  step: "Step",
  trigger: "What triggers the step",
  action: "Action",
  time: "Time",
  speech: "Template / Speech",
  if_reply: "If answer / reply",
  if_no_reply: "If no answer / no reply",
  template: "If No Answer / No Reply - Template",
  rules: "Rules",
  extra: "Notes"
};
const DATA_KEYS = ["flow", "objective", "inner_flow", "step", "trigger", "action", "time", "speech", "if_reply", "if_no_reply", "template"];

let currentLanguage = null;
let currentLabels = { ...DEFAULT_LABELS };
let rows = [];
let selectedFlow = null;
let selectedInner = null;
let allExpanded = false;
let loading = false;

const el = {
  sourcePill: document.getElementById("sourcePill"),
  languageSwitcher: document.getElementById("languageSwitcher"),
  languageGate: document.getElementById("languageGate"),
  gateLanguageGrid: document.getElementById("gateLanguageGrid"),
  appLayout: document.getElementById("appLayout"),
  searchInput: document.getElementById("searchInput"),
  channelFilter: document.getElementById("channelFilter"),
  resetBtn: document.getElementById("resetBtn"),
  breadcrumbs: document.getElementById("breadcrumbs"),
  flowGrid: document.getElementById("flowGrid"),
  innerPanel: document.getElementById("innerPanel"),
  innerPanelTitle: document.getElementById("innerPanelTitle"),
  flowObjective: document.getElementById("flowObjective"),
  innerGrid: document.getElementById("innerGrid"),
  stepsPanel: document.getElementById("stepsPanel"),
  stepsPanelTitle: document.getElementById("stepsPanelTitle"),
  innerDescription: document.getElementById("innerDescription"),
  stepsContainer: document.getElementById("stepsContainer"),
  flowCount: document.getElementById("flowCount"),
  innerCount: document.getElementById("innerCount"),
  stepCount: document.getElementById("stepCount"),
  expandAllBtn: document.getElementById("expandAllBtn")
};

document.addEventListener("DOMContentLoaded", init);

function init() {
  renderLanguageControls();
  bindEvents();
  showGate();
}

function bindEvents() {
  el.searchInput.addEventListener("input", render);
  el.channelFilter.addEventListener("change", render);
  el.resetBtn.addEventListener("click", () => {
    el.searchInput.value = "";
    el.channelFilter.value = "";
    selectedFlow = null;
    selectedInner = null;
    allExpanded = false;
    el.expandAllBtn.textContent = "Expand all";
    render();
  });
  el.expandAllBtn.addEventListener("click", () => {
    allExpanded = !allExpanded;
    el.expandAllBtn.textContent = allExpanded ? "Collapse all" : "Expand all";
    renderSteps();
  });
}

function renderLanguageControls() {
  const buttons = LANGUAGE_ORDER.map(code => languageButtonHtml(code, "top-language-btn")).join("");
  el.languageSwitcher.innerHTML = buttons;
  el.gateLanguageGrid.innerHTML = LANGUAGE_ORDER.map(code => languageButtonHtml(code, "language-card")).join("");
}

function languageButtonHtml(code, className) {
  const meta = languageMeta(code);
  return `<button type="button" class="${className}" data-language="${escapeHtml(code)}">${escapeHtml(meta.label || code)}</button>`;
}

function languageMeta(code) {
  return (CONFIG.languages && CONFIG.languages[code]) || { label: code, sheetNames: [] };
}

function showGate() {
  currentLanguage = null;
  rows = [];
  selectedFlow = null;
  selectedInner = null;
  el.languageGate.classList.remove("hidden");
  el.appLayout.classList.add("hidden");
  el.sourcePill.textContent = "Select language";
  refreshLanguageButtons();
}

document.addEventListener("click", event => {
  const languageButton = event.target.closest("[data-language]");
  if (languageButton) {
    loadLanguage(languageButton.dataset.language);
    return;
  }
  const flowButton = event.target.closest("[data-flow]");
  if (flowButton) {
    selectFlow(flowButton.dataset.flow);
    return;
  }
  const innerButton = event.target.closest("[data-inner]");
  if (innerButton) {
    selectInner(innerButton.dataset.inner);
    return;
  }
  const copyButton = event.target.closest("[data-copy-text]");
  if (copyButton) {
    copyText(copyButton);
  }
});

async function loadLanguage(code) {
  if (loading || currentLanguage === code) return;
  const oldFlow = selectedFlow;
  const oldInner = selectedInner;
  const meta = languageMeta(code);
  loading = true;
  el.sourcePill.textContent = `Loading ${meta.label || code}…`;
  refreshLanguageButtons(code);
  try {
    const result = await loadLiveRows(code);
    currentLanguage = code;
    rows = result.rows.filter(hasUsefulData);
    currentLabels = { ...DEFAULT_LABELS, ...result.labels };
    populateFilters();
    el.languageGate.classList.add("hidden");
    el.appLayout.classList.remove("hidden");
    el.sourcePill.textContent = `Source: Google Sheet · ${meta.label || code}`;
    selectedFlow = rows.some(r => sameFlow(r.flow, oldFlow)) ? canonicalFlowName(oldFlow) : null;
    selectedInner = selectedFlow && rows.some(r => r.flow === selectedFlow && r.inner_flow === oldInner) ? oldInner : null;
    allExpanded = false;
    el.expandAllBtn.textContent = "Expand all";
    render();
  } catch (error) {
    currentLanguage = null;
    rows = [];
    el.languageGate.classList.remove("hidden");
    el.appLayout.classList.add("hidden");
    el.sourcePill.textContent = "Data load error";
    el.gateLanguageGrid.insertAdjacentHTML("beforeend", `<div class="error-box">${escapeHtml(error.message || error)}</div>`);
  } finally {
    loading = false;
    refreshLanguageButtons();
  }
}

async function loadLiveRows(code) {
  const spreadsheetId = cleanValue(CONFIG.spreadsheetId);
  if (!spreadsheetId || spreadsheetId === "PASTE_GOOGLE_SHEET_ID_HERE") {
    throw new Error("config.js is missing the Google Sheet ID.");
  }
  const meta = languageMeta(code);
  const range = cleanValue(CONFIG.range) || "A:K";
  const attempts = [];
  if (cleanValue(meta.gid)) attempts.push({ gid: cleanValue(meta.gid), label: meta.label });
  (meta.sheetNames || []).forEach(sheet => {
    if (cleanValue(sheet)) attempts.push({ sheet: cleanValue(sheet), label: meta.label });
  });
  if (!attempts.length) throw new Error(`No sheet configured for ${meta.label || code}.`);

  let lastError = null;
  for (const selector of attempts) {
    try {
      const matrix = await loadMatrixFromGoogleSheet(spreadsheetId, selector, range);
      const parsed = rowsFromMatrix(matrix);
      if (!parsed.rows.length) throw new Error("No rows found in selected sheet.");
      const flowKeys = new Set(parsed.rows.map(r => flowKey(r.flow)));
      const expected = flowOrder().map(flow => flowKey(flow));
      const missing = expected.filter(flow => !flowKeys.has(flow));
      if (missing.length) throw new Error(`Missing flows: ${missing.join(", ")}`);
      return parsed;
    } catch (error) {
      lastError = error;
      console.warn("Google Sheet attempt failed", selector, error);
    }
  }
  throw lastError || new Error("No Google Sheet loading method worked.");
}

function loadMatrixFromGoogleSheet(spreadsheetId, selector, range) {
  return new Promise((resolve, reject) => {
    const callbackName = "__srLiveCallback_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Google Sheet loading timeout. Check sharing permissions and sheet name/GID."));
    }, 20000);
    window[callbackName] = response => {
      cleanup();
      try {
        if (response.status === "error") {
          const message = response.errors && response.errors.length ? response.errors.map(item => item.message).join("; ") : "Unknown Google Sheets error.";
          reject(new Error(message));
          return;
        }
        resolve(matrixFromGoogleVisualization(response));
      } catch (error) {
        reject(error);
      }
    };
    script.onerror = () => {
      cleanup();
      reject(new Error("Cannot load Google Sheet script. Check spreadsheet ID and sharing permissions."));
    };
    const params = new URLSearchParams({
      range,
      headers: "0",
      tqx: "responseHandler:" + callbackName,
      cachebust: String(Date.now())
    });
    if (selector.gid) params.set("gid", selector.gid);
    if (selector.sheet) params.set("sheet", selector.sheet);
    script.src = "https://docs.google.com/spreadsheets/d/" + encodeURIComponent(spreadsheetId) + "/gviz/tq?" + params.toString();
    document.head.appendChild(script);
    function cleanup() {
      window.clearTimeout(timeout);
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }
  });
}

function matrixFromGoogleVisualization(response) {
  const table = response.table;
  if (!table || !Array.isArray(table.rows)) throw new Error("Google Sheets returned no table rows.");
  const colCount = Math.max(
    table.cols ? table.cols.length : 0,
    ...table.rows.map(row => row.c ? row.c.length : 0),
    DATA_KEYS.length
  );
  const matrix = [];

  // Google Visualization may promote the real spreadsheet header row into table.cols.
  // Add those labels back into the matrix so header detection still works.
  const colLabels = (table.cols || []).map(col => cleanValue(col.label || col.id || ""));
  if (colLabels.some(label => canonicalHeaderKey(label))) {
    while (colLabels.length < colCount) colLabels.push("");
    matrix.push(colLabels.slice(0, colCount));
  }

  table.rows.forEach(row => {
    const out = [];
    for (let i = 0; i < colCount; i++) {
      const cell = row.c && row.c[i] ? row.c[i] : null;
      out.push(cleanCell(cell));
    }
    matrix.push(out);
  });
  return matrix;
}

function cleanCell(cell) {
  if (!cell) return "";
  if (cell.f !== undefined && cell.f !== null && String(cell.f).trim() !== "") return String(cell.f).trim();
  if (cell.v === undefined || cell.v === null) return "";
  return String(cell.v).trim();
}

function rowsFromMatrix(matrix) {
  const headerInfo = findHeaderInfo(matrix);
  if (!headerInfo) return rowsFromFixedColumns(matrix);
  const labels = labelsFromHeader(headerInfo);
  const output = recordsFromRows(matrix, headerInfo.columnKeys, headerInfo.rowIndex + 1);
  if (!output.length) return rowsFromFixedColumns(matrix);
  return { rows: output, labels };
}

function rowsFromFixedColumns(matrix) {
  // Fallback for Google Sheets cases where row 3 is treated as labels, hidden, or skipped.
  // The master table order is fixed: Flow, Objective, Inner flow, Step, Trigger, Action, Time, Speech, Reply, No reply, Template.
  const fixedKeys = ["flow", "objective", "inner_flow", "step", "trigger", "action", "time", "speech", "if_reply", "if_no_reply", "template"];
  const output = recordsFromRows(matrix, fixedKeys, 0);
  if (!output.length) throw new Error("Could not read usable SR follow-up rows from columns A:K. Check that the selected tab has Flow in column A and Step in column D.");
  return { rows: output, labels: { ...DEFAULT_LABELS } };
}

function recordsFromRows(matrix, columnKeys, startRowIndex) {
  let currentFlow = "";
  let currentObjective = "";
  let currentInner = "";
  const output = [];
  for (let rowIndex = startRowIndex; rowIndex < matrix.length; rowIndex++) {
    const sourceRow = matrix[rowIndex] || [];
    const record = emptyRecord();
    columnKeys.forEach((key, index) => {
      if (!key) return;
      const value = cleanValue(sourceRow[index]);
      if (value) record[key] = value;
    });
    const canonical = canonicalFlowName(record.flow);
    if (canonical) currentFlow = canonical;
    else if (record.flow) currentFlow = record.flow;
    record.flow = currentFlow;
    if (record.objective) currentObjective = record.objective;
    else record.objective = currentObjective;
    if (record.inner_flow) currentInner = record.inner_flow;
    else record.inner_flow = currentInner || "Reach-out process";
    record.row_number = rowIndex + 1;
    if (!isExpectedFlow(record.flow)) continue;
    if (!hasUsefulData(record)) continue;
    output.push(record);
  }
  return output;
}

function findHeaderInfo(matrix) {
  for (let rowIndex = 0; rowIndex < Math.min(matrix.length, 80); rowIndex++) {
    const row = matrix[rowIndex] || [];
    const rawKeys = row.map(value => canonicalHeaderKey(value));
    const columnKeys = disambiguateColumnKeys(rawKeys);
    const hasFlow = columnKeys.includes("flow");
    const hasObjective = columnKeys.includes("objective");
    const hasInner = columnKeys.includes("inner_flow");
    const hasStep = columnKeys.includes("step");
    const hasTrigger = columnKeys.includes("trigger");
    const hasAction = columnKeys.includes("action");
    const hasTime = columnKeys.includes("time");
    if (hasFlow && hasObjective && hasInner && hasStep) {
      return { rowIndex, columnKeys, labels: row.map(cleanValue) };
    }
    if (hasFlow && hasStep && (hasTrigger || hasAction || hasTime)) {
      return { rowIndex, columnKeys, labels: row.map(cleanValue) };
    }
  }
  return null;
}

function disambiguateColumnKeys(keys) {
  const counts = {};
  return keys.map(key => {
    if (!key) return "";
    const count = counts[key] || 0;
    counts[key] = count + 1;
    if (key === "if_no_reply" && count >= 1) return "template";
    return key;
  });
}

function canonicalHeaderKey(value) {
  const n = norm(value).replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  if (!n) return "";

  // Specific checks must come before generic flow/action/reply checks.
  if (n === "inner flow" || n === "innerflow" || n.includes("inner flow")) return "inner_flow";
  if (n === "flow") return "flow";
  if (n === "objective" || n.includes("objective")) return "objective";
  if (n === "step" || n === "steps") return "step";
  if (n.includes("trigger")) return "trigger";
  if (n === "action" || n.includes("action")) return "action";
  if (n === "time" || n === "timing" || n.includes("timing")) return "time";
  if (n.includes("template speech") || n.includes("template script") || n.includes("speech") || n.includes("script") || n.includes("vorlage") || n.includes("gesprachsleitfaden") || n.includes("modele")) return "speech";
  if (n.includes("no answer") || n.includes("no reply") || n.includes("keine antwort") || n.includes("aucune reponse") || n.includes("nessuna risposta") || n.includes("kein feedback") || n.includes("nessun riscontro")) return "if_no_reply";
  if ((n.includes("answer") || n.includes("reply") || n.includes("antwort") || n.includes("reponse") || n.includes("risposta")) && !n.includes("no") && !n.includes("keine") && !n.includes("aucune") && !n.includes("nessuna")) return "if_reply";
  if (n === "template") return "template";
  if (n.includes("rule")) return "rules";
  if (n.includes("note")) return "extra";
  return "";
}

function labelsFromHeader(headerInfo) {
  const labels = {};
  headerInfo.columnKeys.forEach((key, index) => {
    const label = cleanValue(headerInfo.labels[index]);
    if (key && label) labels[key] = label;
  });
  if (labels.template === labels.if_no_reply) labels.template = DEFAULT_LABELS.template;
  return labels;
}

function emptyRecord() {
  const record = {};
  DATA_KEYS.forEach(key => record[key] = "");
  record.rules = "";
  record.extra = "";
  record.channel = "";
  return record;
}

function populateFilters() {
  el.channelFilter.querySelectorAll("option:not([value=''])").forEach(option => option.remove());
  unique(rows.map(r => inferChannel(r)).filter(Boolean)).forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    el.channelFilter.appendChild(option);
  });
}

function render() {
  if (!currentLanguage) return;
  renderBreadcrumbs();
  renderFlows();
  if (selectedFlow) renderInnerFlows();
  else {
    el.innerPanel.classList.add("hidden");
    el.stepsPanel.classList.add("hidden");
  }
  if (selectedFlow && selectedInner) renderSteps();
  else el.stepsPanel.classList.add("hidden");
  refreshLanguageButtons();
}

function renderBreadcrumbs() {
  const meta = languageMeta(currentLanguage);
  const crumbs = [meta.label || currentLanguage, "All flows"];
  if (selectedFlow) crumbs.push(escapeHtml(selectedFlow));
  if (selectedInner) crumbs.push(escapeHtml(selectedInner));
  el.breadcrumbs.innerHTML = crumbs.join("<span>›</span>");
}

function renderFlows() {
  const data = filteredRows();
  const flowMap = groupBy(data, r => r.flow || "No flow");
  const flowNames = flowOrder().filter(flow => flowMap[flow] && flowMap[flow].length);
  el.flowCount.textContent = `${flowNames.length} flows`;
  el.flowGrid.innerHTML = flowNames.map(flowName => {
    const items = flowMap[flowName];
    const objective = firstNonEmpty(items, "objective") || "Reach-out process";
    const innerCount = Object.keys(groupBy(items, r => r.inner_flow || "Reach-out process")).length;
    const stepCount = items.filter(r => r.step).length;
    const selectedClass = selectedFlow === flowName ? " selected" : "";
    return `<button class="card flow-card${selectedClass}" data-flow="${escapeHtml(flowName)}" type="button">
      <span class="card-kicker">Flow</span>
      <strong>${escapeHtml(flowName)}</strong>
      <small>${escapeHtml(objective)}</small>
      <span class="meta-row"><span>${innerCount} inner flows</span><span>${stepCount} steps</span></span>
    </button>`;
  }).join("") || `<div class="empty">No flows match the current filters.</div>`;
}

function renderInnerFlows() {
  const data = filteredRows().filter(r => r.flow === selectedFlow);
  const innerMap = groupBy(data, r => r.inner_flow || "Reach-out process");
  const innerNames = Object.keys(innerMap).filter(Boolean);
  el.innerPanel.classList.remove("hidden");
  el.innerPanelTitle.textContent = selectedFlow;
  el.flowObjective.textContent = firstNonEmpty(data, "objective") || "Reach-out process";
  el.innerCount.textContent = `${innerNames.length} inner flows`;
  el.innerGrid.innerHTML = innerNames.map(innerName => {
    const items = innerMap[innerName];
    const description = firstNonEmpty(items, "trigger") || firstNonEmpty(items, "action") || "Reach-out process";
    const stepCount = items.filter(r => r.step).length;
    const selectedClass = selectedInner === innerName ? " selected" : "";
    return `<button class="card inner-card${selectedClass}" data-inner="${escapeHtml(innerName)}" type="button">
      <span class="card-kicker">Inner flow</span>
      <strong>${escapeHtml(innerName)}</strong>
      <small>${escapeHtml(description)}</small>
      <span class="meta-row"><span>${stepCount} steps</span><span>${escapeHtml(firstNonEmpty(items, "time") || "Timing varies")}</span></span>
    </button>`;
  }).join("") || `<div class="empty">No inner flows match the current filters.</div>`;
}

function renderSteps() {
  if (!selectedFlow || !selectedInner) return;
  const data = filteredRows()
    .filter(r => r.flow === selectedFlow && r.inner_flow === selectedInner)
    .sort((a, b) => numeric(a.step) - numeric(b.step) || numeric(a.row_number) - numeric(b.row_number));
  el.stepsPanel.classList.remove("hidden");
  el.stepsPanelTitle.textContent = selectedInner;
  el.innerDescription.textContent = firstNonEmpty(data, "objective") || "";
  el.stepCount.textContent = `${data.length} rows`;
  el.stepsContainer.innerHTML = data.map((r, index) => stepCard(r, index)).join("") || `<div class="empty">No steps match the current filters.</div>`;
}

function stepCard(r, index) {
  const openAttr = allExpanded || index === 0 ? " open" : "";
  const stepLabel = r.step || "?";
  const title = r.trigger || `Step ${stepLabel}`;
  const summary = [r.action, r.time].filter(displayValue).join(" · ");
  const infoBoxes = [
    [labelFor("trigger"), r.trigger],
    [labelFor("action"), r.action],
    [labelFor("time"), r.time],
    [labelFor("if_reply"), r.if_reply],
    [labelFor("if_no_reply"), r.if_no_reply],
    [labelFor("rules", "Stop / rule"), r.rules || r.stop_rule]
  ].filter(([, value]) => displayValue(value));
  const textBlocks = [
    [labelFor("speech"), r.speech],
    [labelFor("template"), r.template],
    [labelFor("extra", "Notes"), r.notes || r.extra]
  ].filter(([, value]) => displayValue(value));
  return `<details class="step-card"${openAttr}>
    <summary>
      <span class="step-number">${escapeHtml(stepLabel)}</span>
      <span class="step-title"><strong>${escapeHtml(title)}</strong><small>${escapeHtml(summary)}</small></span>
      <span class="chevron">›</span>
    </summary>
    <div class="step-body">
      ${infoBoxes.length ? `<div class="info-grid">${infoBoxes.map(([label, value]) => `<div class="info-box"><span>${escapeHtml(label)}</span><p>${formatText(value)}</p></div>`).join("")}</div>` : ""}
      ${textBlocks.map(([label, value]) => textBlock(label, value)).join("")}
    </div>
  </details>`;
}

function textBlock(label, value) {
  return `<div class="text-block">
    <div class="text-block-head"><span>${escapeHtml(label)}</span><button type="button" data-copy-text="${escapeAttr(value)}">Copy</button></div>
    <div class="text-block-content">${formatText(value)}</div>
  </div>`;
}

function filteredRows() {
  const term = norm(el.searchInput.value);
  const channel = norm(el.channelFilter.value);
  return rows.filter(r => {
    const text = norm(Object.values(r).join(" "));
    const channelOk = !channel || norm(inferChannel(r)).includes(channel);
    const textOk = !term || text.includes(term);
    return channelOk && textOk;
  });
}

function selectFlow(flowName) {
  selectedFlow = canonicalFlowName(flowName) || flowName;
  selectedInner = null;
  allExpanded = false;
  el.expandAllBtn.textContent = "Expand all";
  render();
  el.innerPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function selectInner(innerName) {
  selectedInner = innerName;
  allExpanded = false;
  el.expandAllBtn.textContent = "Expand all";
  render();
  el.stepsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function copyText(button) {
  const text = button.dataset.copyText || "";
  await navigator.clipboard.writeText(text);
  const old = button.textContent;
  button.textContent = "Copied";
  setTimeout(() => button.textContent = old, 900);
}

function refreshLanguageButtons(targetCode) {
  document.querySelectorAll("[data-language]").forEach(btn => {
    const active = btn.dataset.language === (targetCode || currentLanguage);
    btn.classList.toggle("active", active);
    btn.disabled = loading && !active;
  });
}

function flowOrder() {
  return Array.isArray(CONFIG.flowOrder) && CONFIG.flowOrder.length ? CONFIG.flowOrder.map(canonicalFlowName).filter(Boolean) : DEFAULT_FLOW_ORDER;
}

function canonicalFlowName(value) {
  const key = flowKey(value);
  if (!key) return "";
  if (key === "beforesr" || key === "beforeshowroom") return "Before Showroom";
  if (key === "followup" || key === "followups") return "Follow up";
  if (key === "future") return "Future";
  return cleanValue(value).replace(/\s+/g, " ").trim();
}

function isExpectedFlow(value) {
  const key = flowKey(canonicalFlowName(value));
  return flowOrder().some(flow => flowKey(flow) === key);
}

function sameFlow(a, b) {
  return !!a && !!b && flowKey(canonicalFlowName(a)) === flowKey(canonicalFlowName(b));
}

function inferChannel(row) {
  const text = norm([row.channel, row.action, row.speech, row.template].join(" "));
  if (text.includes("whatsapp")) return "WhatsApp";
  if (text.includes("email") || text.includes("e mail") || text.includes("mail")) return "Email";
  if (text.includes("call") || text.includes("phone") || text.includes("anruf") || text.includes("appel") || text.includes("chiam")) return "Call";
  return row.channel || "";
}

function labelFor(key, fallback) {
  return currentLabels[key] || fallback || DEFAULT_LABELS[key] || key;
}

function hasUsefulData(record) {
  return !!(record && (record.step || record.trigger || record.action || record.time || record.speech || record.if_reply || record.if_no_reply || record.template));
}

function groupBy(list, fn) {
  return list.reduce((acc, item) => {
    const key = fn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

function firstNonEmpty(items, key) {
  const found = items.find(item => displayValue(item[key]));
  return found ? found[key] : "";
}

function unique(values) {
  return [...new Set(values.map(v => String(v).trim()).filter(Boolean))].sort();
}

function numeric(value) {
  const n = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 9999;
}

function cleanValue(value) {
  return String(value ?? "").trim();
}

function displayValue(value) {
  const v = cleanValue(value);
  return !!v && v !== "—" && v !== "-";
}

function norm(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function flowKey(value) {
  return norm(value).replace(/[^a-z0-9]+/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("\n", "&#10;");
}

function formatText(value) {
  return escapeHtml(value).replace(/\n/g, "<br>");
}
