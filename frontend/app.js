// DriveLegal App v5
"use strict";
// ── LOCAL FALLBACK DATA ────────────────────────────────────
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
// ── STATE ──────────────────────────────────────────────────
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

// ── NAVIGATION ─────────────────────────────────────────────
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
  if (el) el.textContent = `${g}, Arjun 👋`;
}
setGreeting();

// ── LAWS BROWSER ───────────────────────────────────────────
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

    const res = await fetch(`/api/laws/browse?${params}`);
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
    console.warn("[DriveLegal] API unavailable, using local fallback data.");
    const search = document.getElementById("law-search")?.value.toLowerCase() || "";
    const category = document.getElementById("law-category")?.value || "";
    allLaws = MV_ACT_LAWS.filter(law => {
      const matchesSearch = !search ||
        law.violation_name.toLowerCase().includes(search) ||
        law.section_reference.toLowerCase().includes(search);
      const matchesCategory = !category || law.category_name === category;
      return matchesSearch && matchesCategory;
    });
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
    `§ ${law.section_reference} — ${law.violation_name}`;
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

// ── LOCATIONS / CALCULATOR ──────────────────────────────────
async function loadLocations() {
  try {
    const [states, violations, vehicles] = await Promise.all([
      fetch("/api/locations").then((r) => r.json()),
      fetch("/api/locations/violations").then((r) => r.json()),
      fetch("/api/locations/vehicle-classes").then((r) => r.json()),
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
    const res = await fetch("/api/challan/calculate", {
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
      `● Applicable in ${r.jurisdiction_name || "India"}`;
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

// ── ANALYTICS ──────────────────────────────────────────────
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
      ? `/api/analytics/summary?jurisdiction_id=${currentJurisdictionId}`
      : "/api/analytics/summary";
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

// ── AI CHAT ────────────────────────────────────────────────
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
    : `<div class="msg-bubble">${text}<div class="msg-time">${time} ✓✓</div></div>`;
  chatMsgs.appendChild(div);
  chatMsgs.scrollTop = chatMsgs.scrollHeight;
  return div;
}
// ==========================================
// RISHI - LEGAL AI COPILOT ENGINE
// ==========================================

async function queryLegalLLM(prompt) {
  const token = "hf_xxxxxxxxxxxxxxxxxxxxxxxx";
  const cleanedPrompt = prompt.toLowerCase();

  const isPlaceholderToken = !token || token.includes("xxxx");
  const isOffline = !navigator.onLine;

  if (isPlaceholderToken || isOffline) {
    console.log("[DriveLegal AI] Running in local offline smart fallback mode...");
    
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
    
    return `[Offline Copilot Mode] I'm currently running in offline backup mode. For deep search, please ensure you are online and have configured a valid Hugging Face Access Token. 

You can ask me about:
• Helmet laws and fines
• Speed limit violations
• Drunk driving penalties
• Traffic signal jumping rules`;
  }

  const systemContext =
    "You are a professional traffic law assistant in India. Give precise advice according to the Indian Motor Vehicles Act, 1988. Keep it brief.";

  try {
    const res = await fetch(
      "https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: `<|system|>
${systemContext}

<|user|>
${prompt}

<|assistant|>`,
          parameters: {
            max_new_tokens: 150,
            temperature: 0.4,
            return_full_text: false,
          },
        }),
      },
    );

    const data = await res.json();

    console.log("HF Response:", data);

    let reply =
      "I'm sorry, I am currently unable to parse the legal databases.";

    if (Array.isArray(data) && data[0]?.generated_text) {
      reply = data[0].generated_text.trim();
    }

    return reply;
  } catch (err) {
    console.error("Hugging Face API inference failed:", err);

    return "Error: Unable to connect to Legal AI databases.";
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

// ── TOAST ──────────────────────────────────────────────────
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

// ── ONLINE/OFFLINE ─────────────────────────────────────────
window.addEventListener("offline", () =>
  showToast("You are offline — using cached data", "warn"),
);
window.addEventListener("online", () => showToast("Back online!", "info"));

// ── KEYBOARD ───────────────────────────────────────────────
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeSidebar();
    document.getElementById("law-modal")?.classList.remove("open");
    document.getElementById("modal-overlay")?.classList.remove("open");
  }
});

// ── SERVICE WORKER ─────────────────────────────────────────
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((r) => console.log("[DriveLegal] SW registered"))
      .catch((e) => console.warn("[DriveLegal] SW failed:", e.message));
  });
}

// ── BEAMS ANIMATION ──────────────────────────────────────────
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

// ── GEOLOCATION & REVERSE GEOCODING ────────────────────────
function getLiveLocation() {
  const addrEl = document.querySelector(".ctx-addr");
  if (!addrEl) return;

  if (!navigator.geolocation) {
    showToast("Geolocation is not supported by your browser", "warn");
    return;
  }

  addrEl.innerHTML =
    '<i class="fas fa-spinner spin"></i> Retrieving location...';

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;

      window.currentLat = latitude;
      window.currentLon = longitude;

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
        showToast("Location updated successfully!", "info");

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
    { enableHighAccuracy: true, timeout: 10000 },
  );
}

// ── INIT ───────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadLocations();
  getLiveLocation();
  initBeams();

  const waitChart = setInterval(() => {
    if (typeof Chart !== "undefined") {
      clearInterval(waitChart);
      if (currentView === "view-analytics") loadAnalytics();
    }
  }, 100);
});
