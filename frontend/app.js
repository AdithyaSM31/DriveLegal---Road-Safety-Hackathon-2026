// DriveLegal App v5
"use strict";

// â”€â”€ DEPLOYMENT CONFIG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Automatically switches between local dev and Render production.
// Update RENDER_URL when your Render deployment is live.
const RENDER_URL = "https://drivelegal-road-safety-hackathon-2026.onrender.com";
const API_BASE = (window.location.hostname === "localhost" ||
                  window.location.hostname === "127.0.0.1")
  ? ""           // Local: use relative paths (uvicorn serves everything)
  : RENDER_URL;  // Production: point to Render backend

// â”€â”€ KEEP-ALIVE PING (Layer 3 — Frontend) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Pings the backend every 8 minutes while any browser tab is open.
// Works alongside UptimeRobot (Layer 1) and GitHub Actions (Layer 2).
(function startKeepAlive() {
  const PING_INTERVAL_MS = 8 * 60 * 1000; // 8 minutes

  async function pingBackend() {
    try {
      const res = await fetch(`${API_BASE}/api/health`, { cache: "no-store" });
      if (res.ok) console.log("[DriveLegal] Keep-alive ping âœ… — backend is awake.");
    } catch {
      console.log("[DriveLegal] Keep-alive ping sent — backend may be waking up...");
    }
  }

  // Fire immediately on page load, then on interval
  pingBackend();
  setInterval(pingBackend, PING_INTERVAL_MS);
})();
// â”€â”€ LOCAL FALLBACK DATA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const MV_ACT_LAWS = [
  { id: 1, section_reference: "177", violation_name: "General penalty for traffic offences", first_offence_fine: 500, subsequent_offence_fine: 1500, imprisonment_text: null, category_name: "General" },
  { id: 2, section_reference: "180", violation_name: "Allowing unauthorized person to drive", first_offence_fine: 5000, subsequent_offence_fine: 10000, imprisonment_text: null, category_name: "Documentation" },
  { id: 3, section_reference: "181", violation_name: "Driving without a valid license", first_offence_fine: 5000, subsequent_offence_fine: 10000, imprisonment_text: null, category_name: "Documentation" },
  { id: 4, section_reference: "183", violation_name: "Over-speeding", first_offence_fine: 1000, subsequent_offence_fine: 2000, imprisonment_text: null, category_name: "Speeding" },
  { id: 5, section_reference: "184", violation_name: "Dangerous or rash driving", first_offence_fine: 1000, subsequent_offence_fine: 5000, imprisonment_text: "Up to 6 months", category_name: "Dangerous Driving" },
  { id: 6, section_reference: "185", violation_name: "Drunken driving / substance influence", first_offence_fine: 10000, subsequent_offence_fine: 15000, imprisonment_text: "Up to 6 months", category_name: "Alcohol & Drugs" },
  { id: 7, section_reference: "194B", violation_name: "Driving without seat belt", first_offence_fine: 1000, subsequent_offence_fine: 1000, imprisonment_text: null, category_name: "Safety Equipment" },
  { id: 8, section_reference: "194D", violation_name: "Riding without helmet", first_offence_fine: 1000, subsequent_offence_fine: 1000, imprisonment_text: null, category_name: "Safety Equipment" },
  { id: 9, section_reference: "194E", violation_name: "Not giving way to emergency vehicles", first_offence_fine: 10000, subsequent_offence_fine: 10000, imprisonment_text: null, category_name: "Emergency & Special" },
  { id: 10, section_reference: "196", violation_name: "Driving without insurance", first_offence_fine: 2000, subsequent_offence_fine: 4000, imprisonment_text: "Up to 3 months", category_name: "Documentation" },
];
// â”€â”€ STATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let currentView = "view-home";
let currentJurisdictionId = null;
let lawsPage = 1;
let lawsPageSize = 10;
let lawsTotal = 0;
let allLaws = [];
let offenceChartInst = null;
let severityChartInst = null;
let chatHistory = [
  {
    role: "assistant",
    content:
      "Hello! I'm your DriveLegal AI Copilot. Ask me anything about Indian traffic laws, fines, and your rights on the road.",
  },
];

// â”€â”€ NAVIGATION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebar-overlay");
const hamburger = document.getElementById("hamburger");
const contentArea = document.getElementById("content-area");

function switchView(id) {
  document
    .querySelectorAll(".view")
    .forEach((v) => v.classList.remove("active"));
  document.getElementById(id)?.classList.add("active");
  currentView = id;

  document
    .querySelectorAll(".nav-btn")
    .forEach((b) => b.classList.toggle("active", b.dataset.view === id));
  document
    .querySelectorAll(".bn-item")
    .forEach((b) => b.classList.toggle("active", b.dataset.view === id));

  if (window.innerWidth <= 768) closeSidebar();
  if (id === "view-laws") loadLaws();
  if (id === "view-analytics") loadAnalytics();
}

document.querySelectorAll(".nav-btn, .bn-item").forEach((btn) => {
  btn.addEventListener("click", () => switchView(btn.dataset.view));
});
document.querySelectorAll("[data-view-trigger]").forEach((btn) => {
  btn.addEventListener("click", () => switchView(btn.dataset.viewTrigger));
});

function openSidebar() {
  sidebar.classList.add("open");
  sidebarOverlay.classList.add("open");
}
function closeSidebar() {
  sidebar.classList.remove("open");
  sidebarOverlay.classList.remove("open");
}
hamburger?.addEventListener("click", openSidebar);
sidebarOverlay?.addEventListener("click", closeSidebar);

// Greeting
function setGreeting() {
  const h = new Date().getHours();
  const g =
    h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening";
  const el = document.getElementById("greeting-text");
  if (el) el.textContent = g + ", Adithya 👋";
}
setGreeting();

// â”€â”€ LAWS BROWSER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function loadLaws() {
  const tbody = document.getElementById("laws-tbody");
  const empty = document.getElementById("laws-empty");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted)"><i class="fas fa-spinner spin"></i> Loading laws...</td></tr>`;
  empty.style.display = "none";

  const search = document.getElementById("law-search")?.value || "";
  const category = document.getElementById("law-category")?.value || "";

  try {
    const params = new URLSearchParams({
      page: lawsPage,
      page_size: lawsPageSize,
    });
    if (search) params.append("search", search);
    if (category) params.append("category", category);

    const res = await fetch(`${API_BASE}/api/laws/browse?${params}`);
    const data = await res.json();

    allLaws = Array.isArray(data) ? data : data.results || [];
    lawsTotal = data.total || allLaws.length;

    if (!allLaws.length) {
      tbody.innerHTML = "";
      empty.style.display = "block";
      updatePageInfo();
      return;
    }

    renderLawsTable(allLaws);
    updatePageInfo();
    renderPageBtns();
  } catch (e) {
    console.warn("[DriveLegal] API unavailable, attempting local database lookup...");
    const search = document.getElementById("law-search")?.value || "";
    const category = document.getElementById("law-category")?.value || "";

    try {
      if (typeof window.queryOffline === "function") {
        allLaws = await window.queryOffline({ search, category });
        console.log("[DriveLegal] Offline IndexedDB query returned", allLaws.length, "laws.");
      } else {
        throw new Error("window.queryOffline is not a function");
      }
    } catch (offlineErr) {
      console.warn("[DriveLegal] Local IndexedDB query failed, using hardcoded MV_ACT_LAWS fallback:", offlineErr);
      const searchLower = search.toLowerCase();
      allLaws = MV_ACT_LAWS.filter(law => {
        const matchesSearch = !searchLower ||
          law.violation_name.toLowerCase().includes(searchLower) ||
          law.section_reference.toLowerCase().includes(searchLower);
        const matchesCategory = !category || law.category_name === category;
        return matchesSearch && matchesCategory;
      });
    }

    lawsTotal = allLaws.length;
    if (!allLaws.length) {
      tbody.innerHTML = "";
      empty.style.display = "block";
    } else {
      renderLawsTable(allLaws);
    }
    updatePageInfo();
    renderPageBtns();
    showToast("Using offline law data — server unavailable", "warn");
  }
}

function renderLawsTable(laws) {
  const tbody = document.getElementById("laws-tbody");
  tbody.innerHTML = laws
    .map((l) => {
      const isSpecial = (l.first_offence_fine || 0) > 10000;
      return `<tr class="law-row" data-id="${l.id}">
      <td><span class="sec-link"><i class="fas fa-book-open"></i> Sec ${l.section_reference || "N/A"}</span></td>
      <td style="color:var(--text)">${l.violation_name || l.name || "—"}</td>
      <td class="amount">₹${Number(l.first_offence_fine || 0).toLocaleString("en-IN")}</td>
      <td class="amount">₹${Number(l.subsequent_offence_fine || 0).toLocaleString("en-IN")}</td>
      <td>${l.imprisonment_text || "—"}</td>
      <td><span class="status-badge ${isSpecial ? "status-special" : "status-active"}">${isSpecial ? "Special" : "Active"}</span></td>
    </tr>`;
    })
    .join("");

  tbody.querySelectorAll(".law-row").forEach((row) => {
    row.addEventListener("click", () => {
      const law = allLaws.find((l) => l.id == row.dataset.id);
      if (law) openLawModal(law);
    });
  });
}

function updatePageInfo() {
  const start = (lawsPage - 1) * lawsPageSize + 1;
  const end = Math.min(lawsPage * lawsPageSize, lawsTotal);
  document.getElementById("page-info").textContent =
    `Showing ${lawsTotal ? start : 0} to ${end} of ${lawsTotal} laws`;
}

function renderPageBtns() {
  const container = document.getElementById("page-btns");
  const totalPages = Math.ceil(lawsTotal / lawsPageSize);
  let html = `<button class="page-btn" id="prev-page" ${lawsPage === 1 ? "disabled" : ""}><i class="fas fa-chevron-left"></i></button>`;
  const pages = getPageRange(lawsPage, totalPages);
  pages.forEach((p) => {
    if (p === "...") html += `<button class="page-btn dots">...</button>`;
    else
      html += `<button class="page-btn ${p === lawsPage ? "active" : ""}" data-page="${p}">${p}</button>`;
  });
  html += `<button class="page-btn" id="next-page" ${lawsPage === totalPages ? "disabled" : ""}><i class="fas fa-chevron-right"></i></button>`;
  container.innerHTML = html;

  container.querySelector("#prev-page")?.addEventListener("click", () => {
    if (lawsPage > 1) {
      lawsPage--;
      loadLaws();
    }
  });
  container.querySelector("#next-page")?.addEventListener("click", () => {
    if (lawsPage < totalPages) {
      lawsPage++;
      loadLaws();
    }
  });
  container.querySelectorAll("[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      lawsPage = parseInt(btn.dataset.page);
      loadLaws();
    });
  });
}

function getPageRange(current, total) {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, "...", total];
  if (current >= total - 2) return [1, "...", total - 2, total - 1, total];
  return [1, "...", current, "...", total];
}

// Law Modal
function openLawModal(law) {
  document.getElementById("modal-title").textContent =
    `Â§ ${law.section_reference} — ${law.violation_name}`;
  document.getElementById("modal-content").innerHTML = `
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="cr-row"><div class="cr-ico blue"><i class="fas fa-gavel"></i></div><div class="cr-info"><strong>Violation</strong><span>${law.violation_name || "—"}</span></div></div>
      <div class="cr-row"><div class="cr-ico orange"><i class="fas fa-indian-rupee-sign"></i></div><div class="cr-info"><strong>First Offence Fine</strong><span>₹${Number(law.first_offence_fine || 0).toLocaleString("en-IN")}</span></div></div>
      <div class="cr-row"><div class="cr-ico red"><i class="fas fa-repeat"></i></div><div class="cr-info"><strong>Repeat Offence Fine</strong><span>₹${Number(law.subsequent_offence_fine || 0).toLocaleString("en-IN")}</span></div></div>
      <div class="cr-row"><div class="cr-ico blue"><i class="fas fa-bars-progress"></i></div><div class="cr-info"><strong>Imprisonment</strong><span>${law.imprisonment_text || "None"}</span></div></div>
      ${law.full_text ? `<div style="padding:14px;background:var(--bg-elevated);border-radius:10px;font-size:0.82rem;color:var(--text-sec);line-height:1.7">${law.full_text}</div>` : ""}
    </div>`;
  document.getElementById("law-modal").classList.add("open");
  document.getElementById("modal-overlay").classList.add("open");
}

document.getElementById("close-modal")?.addEventListener("click", () => {
  document.getElementById("law-modal").classList.remove("open");
  document.getElementById("modal-overlay").classList.remove("open");
});
document.getElementById("modal-overlay")?.addEventListener("click", () => {
  document.getElementById("law-modal").classList.remove("open");
  document.getElementById("modal-overlay").classList.remove("open");
});

// Search/filter
let searchTimer;
document.getElementById("law-search")?.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    lawsPage = 1;
    loadLaws();
  }, 350);
});
document.getElementById("law-category")?.addEventListener("change", () => {
  lawsPage = 1;
  loadLaws();
});
document.getElementById("page-size")?.addEventListener("change", (e) => {
  lawsPageSize = parseInt(e.target.value);
  lawsPage = 1;
  loadLaws();
});

// â”€â”€ LOCATIONS / CALCULATOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function loadLocations() {
  try {
    const [states, violations, vehicles] = await Promise.all([
      fetch(`${API_BASE}/api/locations`).then((r) => r.json()),
      fetch(`${API_BASE}/api/locations/violations`).then((r) => r.json()),
      fetch(`${API_BASE}/api/locations/vehicle-classes`).then((r) => r.json()),
    ]);

    const stateEl = document.getElementById("calc-state");
    if (stateEl && Array.isArray(states)) {
      stateEl.innerHTML =
        `<option value="">— Select State —</option>` +
        states
          .map((s) => `<option value="${s.id}">${s.name}</option>`)
          .join("");
    }

    const violEl = document.getElementById("calc-violation");
    if (violEl && Array.isArray(violations)) {
      violEl.innerHTML =
        `<option value="">— Select Violation —</option>` +
        violations
          .map((v) => `<option value="${v.id}">${v.name}</option>`)
          .join("");
    }

    const vehEl = document.getElementById("calc-vehicle");
    if (vehEl && Array.isArray(vehicles)) {
      vehEl.innerHTML =
        `<option value="">— Any Vehicle —</option>` +
        vehicles
          .map((v) => `<option value="${v.id}">${v.name}</option>`)
          .join("");
    }
  } catch (e) {
    console.warn("[DriveLegal] Could not load location data:", e.message);
  }
  // Populate law category filter
    const catEl = document.getElementById("law-category");
    if (catEl) {
      const categories = [...new Set(MV_ACT_LAWS.map(l => l.category_name))];
      catEl.innerHTML = `<option value="">All Categories</option>` +
        categories.map(c => `<option value="${c}">${c}</option>`).join("");
    }
}

// Calculator
document.getElementById("btn-calc")?.addEventListener("click", async () => {
  const jurisdiction_id = document.getElementById("calc-state")?.value;
  const violation_id = document.getElementById("calc-violation")?.value;
  const vehicle_class_id =
    document.getElementById("calc-vehicle")?.value || null;

  if (!jurisdiction_id || !violation_id) {
    showToast("Please select a state and violation type.", "warn");
    return;
  }

  const btn = document.getElementById("btn-calc");
  btn.innerHTML = '<i class="fas fa-spinner spin"></i> Calculating...';
  btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/api/challan/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jurisdiction_id: +jurisdiction_id,
        violation_id: +violation_id,
        vehicle_class_id: vehicle_class_id ? +vehicle_class_id : null,
        is_repeat_offence: false,
      }),
    });
    const data = await res.json();

    if (!data.success || !data.result) {
      showToast(
        data.message || "No fine schedule found for this combination.",
        "warn",
      );
      return;
    }

    const r = data.result;
    document.getElementById("res-amount").textContent = Number(
      r.fine_amount || 0,
    ).toLocaleString("en-IN");
    document.getElementById("res-words").textContent = numberToWords(
      r.fine_amount || 0,
    );
    document.getElementById("res-jur").textContent =
      `â— Applicable in ${r.jurisdiction_name || "India"}`;
    document.getElementById("res-section").textContent = r.section_reference
      ? `Section ${r.section_reference}, MV Act, 1988`
      : "As per MV Act, 1988";
    document.getElementById("res-sec-badge").textContent = r.section_reference
      ? `Sec ${r.section_reference}`
      : "MV Act";
    document.getElementById("res-jail").textContent = r.imprisonment || "None";
    document.getElementById("res-jail-badge").textContent =
      r.imprisonment || "None";
    document.getElementById("res-license").textContent =
      r.license_action || "No action specified";
    document.getElementById("res-lic-badge").textContent =
      r.license_action || "N/A";
    if (r.notes) document.getElementById("res-notes").textContent = r.notes;

    const resultEl = document.getElementById("calc-result");
    resultEl.style.display = "block";
    resultEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (e) {
    showToast("Failed to calculate. Is the server running?", "error");
  } finally {
    btn.innerHTML = '<i class="fas fa-calculator"></i> Calculate Fine';
    btn.disabled = false;
  }
});

function numberToWords(n) {
  if (!n || n === 0) return "Rupees Zero Only";
  const units = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  if (n < 20) return `Rupees ${units[n]} Only`;
  if (n < 100)
    return `Rupees ${tens[Math.floor(n / 10)]}${n % 10 ? " " + units[n % 10] : ""} Only`;
  if (n < 1000)
    return `Rupees ${units[Math.floor(n / 100)]} Hundred${
      n % 100
        ? " " +
          numberToWords(n % 100)
            .replace("Rupees ", "")
            .replace(" Only", "")
        : ""
    } Only`;
  if (n < 100000)
    return `Rupees ${numberToWords(Math.floor(n / 1000))
      .replace("Rupees ", "")
      .replace(" Only", "")} Thousand${
      n % 1000
        ? " " +
          numberToWords(n % 1000)
            .replace("Rupees ", "")
            .replace(" Only", "")
        : ""
    } Only`;
  return `Rupees ${n.toLocaleString("en-IN")} Only`;
}

// â”€â”€ ANALYTICS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function loadAnalytics() {
  const offenceCanvas = document.getElementById("offenceChart");
  const severityCanvas = document.getElementById("severityChart");
  if (!offenceCanvas || !severityCanvas || typeof Chart === "undefined") return;

  let data = {
    offences: {
      labels: [
        "Over Speeding",
        "No Helmet",
        "Signal Jumping",
        "No Seat Belt",
        "Wrong Side Driving",
      ],
      values: [2568, 1842, 1326, 934, 745],
    },
    severity: {
      labels: ["Minor", "Moderate", "Major", "Critical"],
      values: [42, 28, 20, 10],
    },
    hud: {
      safety_index: "92%",
      risk_level: "Low",
      traffic_density: "Moderate",
    },
  };

  try {
    const url = currentJurisdictionId
      ? `${API_BASE}/api/analytics/summary?jurisdiction_id=${currentJurisdictionId}`
      : `${API_BASE}/api/analytics/summary`;
    const res = await fetch(url);
    if (res.ok) data = await res.json();
  } catch (e) {
    /* use fallback */
  }

  document.getElementById("hud-safety").textContent =
    data.hud?.safety_index || "92%";
  document.getElementById("hud-risk").textContent =
    data.hud?.risk_level || "Low";
  document.getElementById("hud-traffic").textContent =
    data.hud?.traffic_density || "Moderate";

  Chart.defaults.color = "#4b5563";
  Chart.defaults.font.family = "'Inter', sans-serif";

  if (offenceChartInst) offenceChartInst.destroy();
  offenceChartInst = new Chart(offenceCanvas, {
    type: "bar",
    data: {
      labels: data.offences?.labels || [],
      datasets: [
        {
          label: "Violations",
          data: data.offences?.values || [],
          backgroundColor: "#10b981",
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: { color: "#94a3b8", usePointStyle: true, boxWidth: 8 },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: "rgba(255,255,255,0.05)" },
          ticks: { color: "#4b5563" },
        },
        x: {
          grid: { display: false },
          ticks: { color: "#94a3b8", maxRotation: 30 },
        },
      },
    },
  });

  if (severityChartInst) severityChartInst.destroy();
  severityChartInst = new Chart(severityCanvas, {
    type: "doughnut",
    data: {
      labels: data.severity?.labels || [],
      datasets: [
        {
          data: data.severity?.values || [],
          backgroundColor: ["#10b981", "#f59e0b", "#f97316", "#ef4444"],
          borderWidth: 0,
          hoverOffset: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "65%",
      plugins: {
        legend: {
          position: "right",
          labels: {
            color: "#94a3b8",
            usePointStyle: true,
            boxWidth: 8,
            padding: 16,
          },
        },
      },
    },
  });
}

document
  .getElementById("btn-refresh-analytics")
  ?.addEventListener("click", loadAnalytics);

// â”€â”€ AI CHAT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const aiInput = document.getElementById("ai-input");
const aiSend = document.getElementById("ai-send");
const chatMsgs = document.getElementById("chat-messages");

function appendMsg(text, isBot = false) {
  const time = new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const div = document.createElement("div");
  div.className = `msg ${isBot ? "bot-msg" : "user-msg"}`;
  div.innerHTML = isBot
    ? `<div class="msg-avatar"><i class="fas fa-robot"></i></div><div class="msg-bubble">${text}<div class="msg-time">${time}</div></div>`
    : `<div class="msg-bubble">${text}<div class="msg-time">${time} âœ“âœ“</div></div>`;
  chatMsgs.appendChild(div);
  chatMsgs.scrollTop = chatMsgs.scrollHeight;
  return div;
}
// ==========================================
// RISHI - LEGAL AI COPILOT ENGINE
// ==========================================

async function queryLegalLLM(prompt) {
  const isOffline = !navigator.onLine;

  if (isOffline) {
    console.log("[DriveLegal AI] Running in local offline smart fallback mode...");
    
    const cleanedPrompt = prompt.toLowerCase();
    if (cleanedPrompt.includes("helmet")) {
      return "Under Section 129 of the Motor Vehicles Act, 1988, wearing a protective helmet is strictly mandatory for both the rider and the pillion passenger. Riding without a helmet attracts a fine of ₹1,000 and can result in the disqualification of your driving license for a period of up to 3 months.";
    }
    if (cleanedPrompt.includes("speed") || cleanedPrompt.includes("overspeed")) {
      return "Under Section 183 of the Motor Vehicles Act, 1988, driving a vehicle at a speed exceeding the maximum speed limit is a punishable offence. For Light Motor Vehicles (LMVs/cars), the fine is ₹1,000 to ₹2,000 for the first offence, whereas for Medium/Heavy passenger or goods vehicles, it is ₹2,000 to ₹4,000.";
    }
    if (cleanedPrompt.includes("drunk") || cleanedPrompt.includes("alcohol") || cleanedPrompt.includes("drink")) {
      return "Under Section 185 of the Motor Vehicles Act, 1988, driving under the influence of alcohol (exceeding 30 mg per 100 ml of blood) or drugs is a severe offence. The first offence is punishable with a fine of up to ₹10,000 and/or imprisonment for up to 6 months.";
    }
    if (cleanedPrompt.includes("signal") || cleanedPrompt.includes("red light")) {
      return "Jumping a red light or violating traffic signals falls under Section 184 (Dangerous Driving) of the Motor Vehicles Act, 1988. It attracts a fine of ₹1,000 to ₹5,000 and/or imprisonment of 6 months to 1 year, along with potential license suspension.";
    }
    
    return `[Offline Copilot Mode] I'm currently running in offline backup mode.
You can ask me about:
• Helmet laws and fines
• Speed limit violations
• Drunk driving penalties
• Traffic signal jumping rules`;
  }

  try {
    const res = await fetch(`${API_BASE}/api/chat/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: prompt
      }),
    });

    if (!res.ok) {
      throw new Error(`Chat API failed: ${res.status}`);
    }

    const data = await res.json();
    return data.reply || "I'm sorry, I couldn't process that request.";
  } catch (err) {
    console.error("Chat API inference failed:", err);
    return "Error: Unable to connect to DriveLegal AI services.";
  }
}
async function sendMessage() {
  const query = aiInput?.value.trim();
  if (!query) return;
  aiInput.value = "";
  aiInput.style.height = "auto";
  appendMsg(escapeHtml(query), false);

  const thinking = appendMsg(
    '<i class="fas fa-spinner spin"></i> Analyzing traffic laws...',
    true,
  );
  aiSend.disabled = true;

  try {
    const reply = await queryLegalLLM(query);

    thinking.remove();

    let html = escapeHtml(reply).replace(/\n/g, "<br>");
    appendMsg(html, true);
  } catch (e) {
    thinking.remove();
    appendMsg(
      "I'm having trouble connecting to the legal database. Please check that the server is running.",
      true,
    );
  } finally {
    aiSend.disabled = false;
  }
}

aiSend?.addEventListener("click", sendMessage);
aiInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
aiInput?.addEventListener("input", function () {
  this.style.height = "auto";
  this.style.height = Math.min(this.scrollHeight, 120) + "px";
});
document.getElementById("btn-new-chat")?.addEventListener("click", () => {
  chatMsgs.innerHTML = "";
  appendMsg(
    "Hello! I'm your DriveLegal AI Copilot. Start a new question about Indian traffic laws.",
    true,
  );
});

// â”€â”€ TOAST â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function showToast(msg, type = "info") {
  let t = document.getElementById("dl-toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "dl-toast";
    Object.assign(t.style, {
      position: "fixed",
      bottom: "90px",
      left: "50%",
      transform: "translateX(-50%)",
      padding: "10px 20px",
      borderRadius: "8px",
      fontWeight: "600",
      fontSize: "0.85rem",
      zIndex: "9999",
      transition: "opacity 0.3s",
    });
    document.body.appendChild(t);
  }
  const colors = { info: "#10b981", warn: "#f59e0b", error: "#ef4444" };
  t.style.background = colors[type] || colors.info;
  t.style.color = type === "warn" ? "#000" : "#fff";
  t.textContent = msg;
  t.style.opacity = "1";
  clearTimeout(t._timer);
  t._timer = setTimeout(() => (t.style.opacity = "0"), 3000);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// â”€â”€ ONLINE/OFFLINE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
window.addEventListener("offline", () =>
  showToast("You are offline — using cached data", "warn"),
);
window.addEventListener("online", () => showToast("Back online!", "info"));

// â”€â”€ KEYBOARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeSidebar();
    document.getElementById("law-modal")?.classList.remove("open");
    document.getElementById("modal-overlay")?.classList.remove("open");
  }
});

// â”€â”€ SERVICE WORKER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((r) => console.log("[DriveLegal] SW registered"))
      .catch((e) => console.warn("[DriveLegal] SW failed:", e.message));
  });
}

// â”€â”€ BEAMS ANIMATION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function initBeams() {
  const canvas = document.getElementById("beams-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener("resize", () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const beams = [
    {
      x1: -100,
      y1: 0,
      x2: width * 0.8,
      y2: height + 100,
      cp1x: width * 0.2,
      cp1y: height * 0.3,
      cp2x: width * 0.4,
      cp2y: height * 0.7,
      color: "rgba(16, 185, 129, 0.05)",
      colorGlow: "rgba(52, 211, 153, 0.015)",
      thickness: 200,
      phase: 0,
      speed: 0.0006,
      swayRange: 180,
    },
    {
      x1: width * 0.3,
      y1: -150,
      x2: width + 150,
      y2: height * 0.8,
      cp1x: width * 0.5,
      cp1y: height * 0.2,
      cp2x: width * 0.8,
      cp2y: height * 0.6,
      color: "rgba(6, 182, 212, 0.04)",
      colorGlow: "rgba(34, 211, 238, 0.015)",
      thickness: 280,
      phase: Math.PI / 4,
      speed: 0.0004,
      swayRange: 220,
    },
    {
      x1: width * 0.1,
      y1: -100,
      x2: width * 0.9,
      y2: height + 150,
      cp1x: width * 0.3,
      cp1y: height * 0.4,
      cp2x: width * 0.6,
      cp2y: height * 0.8,
      color: "rgba(16, 185, 129, 0.03)",
      colorGlow: "rgba(16, 185, 129, 0.008)",
      thickness: 160,
      phase: Math.PI / 2,
      speed: 0.0008,
      swayRange: 140,
    },
    {
      x1: -150,
      y1: height * 0.3,
      x2: width + 150,
      y2: height * 0.9,
      cp1x: width * 0.2,
      cp1y: height * 0.7,
      cp2x: width * 0.7,
      cp2y: height * 0.4,
      color: "rgba(16, 185, 129, 0.02)",
      colorGlow: "rgba(59, 130, 246, 0.006)",
      thickness: 340,
      phase: Math.PI,
      speed: 0.0003,
      swayRange: 260,
    },
  ];

  function draw() {
    ctx.clearRect(0, 0, width, height);

    let bgGrad = ctx.createRadialGradient(
      width / 2,
      height / 2,
      10,
      width / 2,
      height / 2,
      Math.max(width, height),
    );
    bgGrad.addColorStop(0, "#090d16");
    bgGrad.addColorStop(1, "#040609");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    beams.forEach((beam) => {
      beam.phase += beam.speed;

      let swayY1 = Math.sin(beam.phase) * beam.swayRange;
      let swayY2 = Math.cos(beam.phase * 0.8) * beam.swayRange;
      let swayX1 = Math.cos(beam.phase * 0.5) * (beam.swayRange * 0.5);

      ctx.beginPath();
      ctx.moveTo(beam.x1 + swayX1, beam.y1 + swayY1);

      let cp1x = beam.cp1x + Math.sin(beam.phase * 0.7) * 90;
      let cp1y = beam.cp1y + swayY1 * 0.5;
      let cp2x = beam.cp2x + Math.cos(beam.phase * 0.9) * 90;
      let cp2y = beam.cp2y + swayY2 * 0.5;

      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, beam.x2, beam.y2 + swayY2);

      ctx.strokeStyle = beam.color;
      ctx.lineWidth = beam.thickness;
      ctx.lineCap = "round";
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(beam.x1 + swayX1, beam.y1 + swayY1);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, beam.x2, beam.y2 + swayY2);
      ctx.strokeStyle = beam.colorGlow;
      ctx.lineWidth = beam.thickness * 0.4;
      ctx.stroke();
    });

    requestAnimationFrame(draw);
  }

  draw();
}

// â”€â”€ GEOLOCATION & REVERSE GEOCODING â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let geoWatchId = null;
window.isSimulatingSpeed = false;
window.currentSpeedLimit = 50;

function getLiveLocation() {
  const addrEl = document.querySelector(".ctx-addr");
  if (!addrEl) return;

  if (!navigator.geolocation) {
    showToast("Geolocation is not supported by your browser", "warn");
    return;
  }

  addrEl.innerHTML =
    '<i class="fas fa-spinner spin"></i> Retrieving location...';

  // Use watchPosition for real-time tracking
  geoWatchId = navigator.geolocation.watchPosition(
    async (position) => {
      const { latitude, longitude, speed } = position.coords;

      window.currentLat = latitude;
      window.currentLon = longitude;

      // Update real vehicle speed if simulator is disabled
      if (!window.isSimulatingSpeed) {
        if (speed !== null && speed !== undefined && speed >= 0) {
          const speedKmh = Math.round(speed * 3.6);
          updateVehicleSpeedUI(speedKmh);
        } else {
          updateVehicleSpeedUI(0);
        }
      }

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
        );
        if (!res.ok) throw new Error("Network response was not ok");
        const data = await res.json();

        const road = data.address.road || data.address.suburb || "";
        const city =
          data.address.city ||
          data.address.town ||
          data.address.county ||
          "India";
        const stateCode = data.address.state || "";

        let addrStr = "";
        if (road) addrStr += road;
        if (city) addrStr += (addrStr ? ", " : "") + city;
        if (stateCode) addrStr += (addrStr ? ", " : "") + stateCode;

        if (!addrStr)
          addrStr = `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`;

        addrEl.textContent = addrStr;

        if (typeof window.onLocationFound === "function") {
          window.onLocationFound(latitude, longitude);
        }
      } catch (err) {
        console.warn("Nominatim reverse geocoding failed:", err.message);
        addrEl.textContent = `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`;
      }
    },
    (error) => {
      console.warn("Geolocation failed or access denied:", error.message);
      addrEl.textContent =
        "MG Road, Bangalore, Karnataka (Location Access Denied)";
      showToast("Could not retrieve live GPS coordinates.", "warn");
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
  );
}

// ── SPEEDOMETER HUD ENGINE & SIMULATION ─────────────────────
let simInterval = null;
let simSpeed = 35;
let simDirection = 1; // 1 = accelerating, -1 = decelerating

function updateVehicleSpeedUI(speed) {
  // Update numerical speed
  const speedNumEl = document.querySelector(".gauge-num");
  if (speedNumEl) speedNumEl.textContent = String(speed);

  // Update SVG Gauge Dashoffset
  // The gauge-arc has stroke-dasharray="320 108"
  // dashoffset ranges from 320 (0 km/h) to 0 (120 km/h+)
  const maxSpeed = 120;
  const pct = Math.min(speed / maxSpeed, 1);
  const dashoffset = 320 - Math.round(pct * 320);
  
  const arc = document.querySelector(".gauge-arc");
  if (arc) {
    arc.style.strokeDashoffset = dashoffset;
    // Set warning red color if speeding
    if (speed > window.currentSpeedLimit) {
      arc.setAttribute("stroke", "url(#gaugeGradDanger)");
    } else {
      arc.setAttribute("stroke", "url(#gaugeGrad)");
    }
  }

  // Update Alert/Safety HUD Status Bar
  const speedStatus = document.querySelector(".speed-status");
  if (speedStatus) {
    if (speed > window.currentSpeedLimit) {
      speedStatus.className = "speed-status danger";
      speedStatus.innerHTML = `<i class="fas fa-triangle-exclamation"></i> Speeding detected! Sec 183 fine: ₹1,000`;
      
      // Gentle device vibration alert for drivers (if supported on mobile)
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    } else {
      speedStatus.className = "speed-status safe";
      speedStatus.innerHTML = `<i class="fas fa-circle-check"></i> You're within the speed limit`;
    }
  }
}

function startSpeedSimulation() {
  if (simInterval) clearInterval(simInterval);
  showToast("Driving simulation started!", "info");
  
  simInterval = setInterval(() => {
    // Smoothly fluctuate speed between 32 and 68 km/h
    if (simSpeed >= 68) {
      simDirection = -1;
    } else if (simSpeed <= 32) {
      simDirection = 1;
    }
    
    // Add random fluctuations for a realistic feel
    const change = (Math.random() * 3 + 1) * simDirection;
    simSpeed = Math.round(Math.max(0, simSpeed + change));
    
    updateVehicleSpeedUI(simSpeed);
  }, 1000);
}

function stopSpeedSimulation() {
  if (simInterval) {
    clearInterval(simInterval);
    simInterval = null;
  }
  showToast("Driving simulation stopped.", "info");
  updateVehicleSpeedUI(0);
}

// â”€â”€ INIT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
document.addEventListener("DOMContentLoaded", () => {
  loadLocations();
  getLiveLocation();
  initBeams();

  // Setup simulation toggle controls
  const simToggle = document.getElementById("sim-toggle");
  if (simToggle) {
    simToggle.addEventListener("change", (e) => {
      window.isSimulatingSpeed = e.target.checked;
      if (window.isSimulatingSpeed) {
        startSpeedSimulation();
      } else {
        stopSpeedSimulation();
      }
    });
  }

  const waitChart = setInterval(() => {
    if (typeof Chart !== "undefined") {
      clearInterval(waitChart);
      if (currentView === "view-analytics") loadAnalytics();
    }
  }, 100);
});

// â”€â”€ WEATHER API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
window.onLocationFound = function(lat, lon) {
  fetchWeatherData(lat, lon);
  fetchSpeedLimit(lat, lon);
};

// â”€â”€ OVERPASS SPEED LIMIT (OpenStreetMap) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function fetchSpeedLimit(lat, lon) {
  // Update UI immediately with a safe fallback.
  let speedLimit = 50;

  try {
    const url = `${API_BASE}/api/locations/speed-limit?lat=${lat}&lon=${lon}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Speed Limit Proxy HTTP ${res.status}`);

    const data = await res.json();
    if (data.speed_limit) {
      speedLimit = data.speed_limit;
    }
    
    // Save to localStorage for offline cache
    localStorage.setItem("drivelegal_last_speed_limit", speedLimit);
  } catch (err) {
    console.error("Overpass API speed limit retrieval failed:", err);
    // Load from cache if offline
    const cached = localStorage.getItem("drivelegal_last_speed_limit");
    if (cached) {
      const n = parseInt(cached, 10);
      if (!Number.isNaN(n)) {
        speedLimit = n;
        console.log("[DriveLegal] Loaded offline cached speed limit:", speedLimit);
      }
    }
  }

  // Update dashboard Speed Circular Sign and Gauge
  const circle = document.querySelector(".limit-circle span");
  if (circle) circle.textContent = String(speedLimit);

  // Update live warning thresholds based on custom gauges
  window.currentSpeedLimit = speedLimit;

  // Also update label text if it exists.
  const limitVal = document.querySelector(".limit-val");
  if (limitVal) limitVal.textContent = `${speedLimit} km/h`;
}


async function fetchWeatherData(lat, lon) {
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
    const data = await res.json();
    
    const temp = Math.round(data.current_weather.temperature);
    const code = data.current_weather.weathercode;
    
    // Save to localStorage for offline cache
    localStorage.setItem("drivelegal_last_weather", JSON.stringify({ temp, code, timestamp: Date.now() }));
    
    updateWeatherUI(temp, code);
  } catch (err) {
    console.error("Open-Meteo API failed:", err);
    // Load offline cache
    const cached = localStorage.getItem("drivelegal_last_weather");
    if (cached) {
      console.log("[DriveLegal] Using cached offline weather data...");
      try {
        const { temp, code } = JSON.parse(cached);
        updateWeatherUI(temp, code);
      } catch (e) {}
    }
  }
}

function updateWeatherUI(temp, code) {
  let statusText = "Clear";
  let iconClass = "fa-sun";
  
  if (code > 50) {
    statusText = "Rainy (Drive Slow)";
    iconClass = "fa-cloud-showers-heavy";
  } else if (code > 0) {
    statusText = "Cloudy";
    iconClass = "fa-cloud";
  }
  
  const weatherWrap = document.querySelector(".weather-row");
  if (weatherWrap) {
    weatherWrap.innerHTML = `<i class="fas ${iconClass}"></i> ${temp}°C • ${statusText}`;
  }
  
  const statVal = document.querySelector(".weather-row")?.previousElementSibling;
  if (statVal && statVal.classList.contains("stat-val")) {
    statVal.textContent = statusText;
    weatherWrap.innerHTML = `<i class="fas ${iconClass}"></i> ${temp}°C`;
  }
}

