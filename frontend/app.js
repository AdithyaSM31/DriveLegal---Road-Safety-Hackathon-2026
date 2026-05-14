/* ============================================================
   DRIVELEGAL — app.js
   PWA registration + App Shell interactivity + UI Overhaul
   ============================================================ */

'use strict';

// ── SERVICE WORKER ────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/service-worker.js');
      console.log('[DriveLegal] SW registered:', reg.scope);
    } catch (err) {
      console.warn('[DriveLegal] SW registration failed:', err);
    }
  });
}

// ── DOM REFS ──────────────────────────────────────────────────
const sidebar        = document.getElementById('sidebar');
const overlay        = document.getElementById('sidebar-overlay');
const hamburgerBtn   = document.getElementById('hamburger-btn');
const geoBtn         = document.getElementById('geo-btn');
const locationState  = document.getElementById('location-state');
const statusDot      = document.getElementById('status-dot');
const statusText     = document.getElementById('status-text');
const roadAlert      = document.getElementById('road-alert');
const alertText      = document.getElementById('alert-text');
const hudSpeed       = document.getElementById('hud-current-speed');
const hudLimit       = document.getElementById('hud-speed-limit');
const hudZone        = document.getElementById('hud-zone');
const notificationBtn = document.getElementById('notification-btn');
const notificationDropdown = document.getElementById('notification-dropdown');

// ── SIDEBAR (mobile) ──────────────────────────────────────────
function openSidebar() {
  sidebar.classList.add('open');
  overlay.classList.add('open');
  hamburgerBtn.setAttribute('aria-expanded', 'true');
  overlay.setAttribute('aria-hidden', 'false');
}

function closeSidebar() {
  sidebar.classList.remove('open');
  overlay.classList.remove('open');
  hamburgerBtn.setAttribute('aria-expanded', 'false');
  overlay.setAttribute('aria-hidden', 'true');
}

hamburgerBtn?.addEventListener('click', () => {
  sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
});
overlay?.addEventListener('click', closeSidebar);

// ── TAB / VIEW SWITCHING ──────────────────────────────────────
const navItems = document.querySelectorAll('.nav-item[data-view], .bottom-nav-item[data-view]');
const views    = document.querySelectorAll('.view');

function switchView(viewId) {
  views.forEach(v => v.classList.remove('active'));
  navItems.forEach(n => n.classList.remove('active'));

  const targetView = document.getElementById(viewId);
  const targetNavs = document.querySelectorAll(`[data-view="${viewId}"]`);

  if (targetView) {
    targetView.classList.add('active');
    window.scrollTo(0, 0);
  }
  
  targetNavs.forEach(n => {
    n.classList.add('active');
    if (n.classList.contains('nav-item')) n.setAttribute('aria-current', 'page');
  });

  closeSidebar();
}

navItems.forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

// Quick Action Cards
document.querySelectorAll('.quick-action-card').forEach(card => {
  card.addEventListener('click', () => {
    const action = card.dataset.action;
    if (action === 'calc') switchView('view-calculator');
    if (action === 'laws') switchView('view-laws');
    if (action === 'ai') switchView('view-ai');
  });
});

// ── NOTIFICATIONS ─────────────────────────────────────────────
notificationBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  notificationDropdown.classList.toggle('open');
});

document.addEventListener('click', () => {
  notificationDropdown.classList.remove('open');
  document.getElementById('law-modal').style.right = '-100%';
  document.getElementById('modal-overlay').classList.remove('open');
});

notificationDropdown?.addEventListener('click', e => e.stopPropagation());

// ── LIVE ALERT SIMULATION ─────────────────────────────────────
const ALERTS = [
  { text: '🚸 SCHOOL ZONE • Speed Limit: 25 km/h', type: 'warning' },
  { text: '⚠️ Overspeeding Detected • Reduce speed immediately', type: 'danger' },
  { text: '↩️ One-way road ahead', type: 'info' },
  { text: '🟢 Route clear • Driving conditions normal', type: 'success' },
  { text: '🚧 Roadwork on NH 44 • Expect minor delays', type: 'warning' }
];

let alertIndex = 0;
function cycleAlerts() {
  const alert = ALERTS[alertIndex];
  roadAlert.className = `road-alert ${alert.type}`;
  alertText.textContent = alert.text;
  alertIndex = (alertIndex + 1) % ALERTS.length;
}

setInterval(cycleAlerts, 8000);
cycleAlerts();

document.getElementById('close-alert')?.addEventListener('click', () => {
  roadAlert.parentElement.style.display = 'none';
});

// ── DRIVER HUD SIMULATION ─────────────────────────────────────
let currentSpeed = 48;
function simulateSpeed() {
  const change = (Math.random() - 0.5) * 4;
  currentSpeed = Math.max(0, Math.min(120, currentSpeed + change));
  if (hudSpeed) hudSpeed.textContent = Math.round(currentSpeed);
  
  const limit = parseInt(hudLimit?.textContent || '50');
  if (currentSpeed > limit) {
    hudSpeed.style.color = 'var(--danger)';
  } else {
    hudSpeed.style.color = 'var(--primary)';
  }
}

setInterval(simulateSpeed, 1000);

// ── LAW DETAILS MODAL ─────────────────────────────────────────
const lawModal = document.getElementById('law-modal');
const modalOverlay = document.getElementById('modal-overlay');

function openLawDetails(title, content) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = `
    <p style="font-weight:700;margin-bottom:12px;color:var(--primary);">Motor Vehicles Act, 1988</p>
    <p style="font-size:0.9rem;line-height:1.6;color:var(--text-secondary);">${content}</p>
    <div class="divider"></div>
    <div class="card" style="background:var(--bg-elevated);border-color:var(--primary-dim);">
      <p style="font-size:0.75rem;font-weight:600;margin-bottom:8px;">STATE MODIFICATIONS</p>
      <p style="font-size:0.8rem;color:var(--text-primary);">In Karnataka: Fine enhanced to ₹1,000 for first offence. Repeated offence leads to 3 months DL suspension.</p>
    </div>
  `;
  lawModal.style.right = '0';
  modalOverlay.classList.add('open');
}

document.querySelectorAll('#laws-tbody tr').forEach(row => {
  row.addEventListener('click', () => {
    const section = row.cells[0].textContent;
    const offence = row.cells[1].textContent;
    openLawDetails(`${section} — ${offence}`, `This section deals with ${offence.toLowerCase()} under the MV Act. It mandates a fine of ${row.cells[2].textContent} and emphasizes road safety compliance.`);
  });
});

document.getElementById('close-modal')?.addEventListener('click', () => {
  lawModal.style.right = '-100%';
  modalOverlay.classList.remove('open');
});

lawModal?.addEventListener('click', e => e.stopPropagation());

// ── LAW BROWSER SEARCH ────────────────────────────────────────
const lawSearch = document.getElementById('law-search');
const lawRows   = document.querySelectorAll('#laws-tbody tr');

lawSearch?.addEventListener('input', () => {
  const q = lawSearch.value.toLowerCase().trim();
  lawRows.forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
});

// ── CHALLAN CALCULATOR (Improved) ─────────────────────────────
const FINES = {
  helmet:    { name: 'Riding without Helmet', section: '§ 194C MV Act', first: 1000, repeat: 2000, jail: '—', licence: 'Suspended 3 months' },
  seatbelt:  { name: 'Not wearing Seat Belt',  section: '§ 194B MV Act', first: 1000, repeat: 1000, jail: '—',              licence: '—' },
  speeding:  { name: 'Over Speeding (LMV)',    section: '§ 183 MV Act',  first: 1000, repeat: 2000, jail: '—',              licence: '—' },
  drunk:     { name: 'Drunk Driving (DUI)',     section: '§ 185 MV Act',  first: 10000, repeat: 15000, jail: 'Up to 2 years', licence: 'Suspended 6 months' },
  mobile:    { name: 'Using Mobile while Driving', section: '§ 177A MV Act', first: 1000, repeat: 5000, jail: '—',          licence: '—' },
  signal:    { name: 'Jumping Red Light',       section: '§ 177 MV Act',  first: 1000, repeat: 5000, jail: '—',             licence: '—' },
  license:   { name: 'Driving without Licence', section: '§ 3/181 MV Act', first: 5000, repeat: 10000, jail: 'Up to 3 months', licence: '—' },
  insurance: { name: 'Driving without Insurance', section: '§ 196 MV Act', first: 2000, repeat: 4000, jail: 'Up to 3 months', licence: '—' },
  overload:  { name: 'Vehicle Overloading',     section: '§ 194 MV Act',  first: 20000, repeat: 20000, jail: '—',           licence: '—' },
};

const STATE_MULTIPLIER = { DL: 1.5, MH: 1.2, KA: 1.0, TN: 1.0, UP: 1.0, GJ: 1.1, WB: 1.0, RJ: 1.0 };

const calcBtn = document.getElementById('calc-btn');
const resultContent = document.getElementById('result-content');
const placeholder = document.getElementById('result-placeholder');

calcBtn?.addEventListener('click', () => {
  const state    = document.getElementById('select-state').value;
  const vehicle  = document.getElementById('select-vehicle').value;
  const offence  = document.getElementById('select-offence').value;
  const repeat   = document.getElementById('select-repeat').value === 'repeat';
  const juvenile = document.getElementById('check-juvenile').checked;

  if (!offence) return;

  let data = {...FINES[offence]};
  let mult = STATE_MULTIPLIER[state] ?? 1.0;
  
  if (vehicle === 'hgv') mult *= 2;
  if (vehicle === 'comm') mult *= 1.5;

  let fine = Math.round((repeat ? data.repeat : data.first) * mult);
  let severity = 'minor';

  if (juvenile) {
    fine = 25000;
    data.name = 'Juvenile Offence (Guardian liable)';
    data.section = '§ 199A MV Act';
    data.jail = 'Up to 3 years (for Guardian)';
    data.licence = 'Vehicle registration cancelled';
    severity = 'critical';
  } else if (fine > 5000) {
    severity = 'major';
  } else if (fine > 2000) {
    severity = 'moderate';
  }

  const resultAmount = document.getElementById('result-amount');
  resultAmount.textContent = `₹${fine.toLocaleString('en-IN')}`;
  resultAmount.className = 'amount amount-lg';
  
  document.getElementById('result-offence-name').textContent = data.name;
  document.getElementById('result-section').textContent = data.section;
  document.getElementById('result-jail').textContent = data.jail;
  document.getElementById('result-licence').textContent = data.licence;

  // Add severity ribbon
  const card = document.getElementById('result-card');
  let ribbon = card.querySelector('.sev-ribbon');
  if (!ribbon) {
    ribbon = document.createElement('div');
    card.appendChild(ribbon);
  }
  ribbon.className = `sev-ribbon sev-${severity}`;

  placeholder.style.display = 'none';
  resultContent.style.display = 'block';
  
  if (state) {
    locationState.textContent = document.getElementById('select-state').options[document.getElementById('select-state').selectedIndex].text;
  }
});

// ── AI ASSISTANT (Chips & Interaction) ────────────────────────
const aiInput = document.getElementById('ai-input');
const chatMsgs = document.getElementById('chat-messages');

function appendMessage(text, role = 'user') {
  const isUser = role === 'user';
  const wrap = document.createElement('div');
  wrap.style.cssText = `display:flex;gap:10px;align-items:flex-start;${isUser ? 'flex-direction:row-reverse;' : ''}`;
  wrap.innerHTML = `
    <div style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:${isUser ? 'var(--accent)' : 'var(--primary-dim)'};">
      <i class="ph ph-${isUser ? 'user' : 'robot'}" style="color:${isUser ? '#fff' : 'var(--primary)'};font-size:1rem;"></i>
    </div>
    <div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-md);padding:12px 14px;max-width:85%;">
      <p style="font-size:0.875rem;line-height:1.6;color:var(--text-secondary);">${text}</p>
    </div>
  `;
  chatMsgs.appendChild(wrap);
  chatMsgs.scrollTop = chatMsgs.scrollHeight;
}

function handleAiSend(text) {
  const q = text || aiInput.value.trim();
  if (!q) return;
  appendMessage(q, 'user');
  aiInput.value = '';
  
  setTimeout(() => {
    appendMessage("I'm analyzing the Motor Vehicles Act for you. Based on Section 185, drunk driving is a serious offence. Would you like to see the specific fines for your state?", 'ai');
  }, 800);
}

document.getElementById('ai-send-btn')?.addEventListener('click', () => handleAiSend());
aiInput?.addEventListener('keydown', e => { if (e.key === 'Enter') handleAiSend(); });

document.querySelectorAll('#ai-suggestions button').forEach(btn => {
  btn.addEventListener('click', () => handleAiSend(btn.textContent));
});

// ── LAW DATA & POPULATION ─────────────────────────────────────
const LAWS_DATA = [
  { s: '§ 183', o: 'Over Speeding (LMV)', f1: '₹1,000', fr: '₹2,000', j: '—', st: 'Active' },
  { s: '§ 184', o: 'Dangerous Driving', f1: '₹1,000–₹5,000', fr: '₹10,000', j: '6 mos', st: 'Active' },
  { s: '§ 185', o: 'Drunk Driving (DUI)', f1: '₹10,000', fr: '₹15,000', j: '2 yrs', st: 'Strict' },
  { s: '§ 194', o: 'Vehicle Overloading', f1: '₹20,000', fr: '₹20,000', j: '—', st: 'Warning' },
  { s: '§ 194B', o: 'Seat Belt Offence', f1: '₹1,000', fr: '₹1,000', j: '—', st: 'Active' },
  { s: '§ 194C', o: 'Helmet Offence', f1: '₹1,000', fr: '₹1,000', j: 'DL Susp', st: 'Active' },
  { s: '§ 177A', o: 'Mobile Usage', f1: '₹1,000', fr: '₹5,000', j: '—', st: 'Active' },
  { s: '§ 196', o: 'No Insurance', f1: '₹2,000', fr: '₹4,000', j: '3 mos', st: 'Strict' }
];

function populateLaws() {
  const tbody = document.getElementById('laws-tbody');
  if (!tbody) return;
  tbody.innerHTML = LAWS_DATA.map(l => `
    <tr class="law-row">
      <td><span class="amount" style="font-size:0.85rem;">${l.s}</span></td>
      <td>${l.o}</td>
      <td><span class="amount">${l.f1}</span></td>
      <td><span class="amount">${l.fr}</span></td>
      <td>${l.j}</td>
      <td><span class="badge badge-${l.st === 'Strict' ? 'red' : l.st === 'Warning' ? 'yellow' : 'green'}">${l.st}</span></td>
    </tr>
  `).join('');

  // Re-attach listeners for modal
  document.querySelectorAll('.law-row').forEach((row, i) => {
    row.addEventListener('click', () => {
      const l = LAWS_DATA[i];
      openLawDetails(`${l.s} — ${l.o}`, `Legal provisions regarding ${l.o.toLowerCase()}. Penalties range from ${l.f1} up to ${l.fr} for repeat offences.`);
    });
  });
}

// ── INITIALIZATION ────────────────────────────────────────────
populateLaws();
updateOnlineStatus();

function updateOnlineStatus() {
  const banner = document.getElementById('offline-banner');
  if (navigator.onLine) {
    statusDot?.classList.remove('offline');
    if (statusText) statusText.textContent = 'Online · Laws synced';
    if (banner) banner.style.display = 'none';
  } else {
    statusDot?.classList.add('offline');
    if (statusText) statusText.textContent = 'Offline mode';
    if (banner) banner.style.display = 'block';
  }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// Search logic improvement
document.getElementById('law-search')?.addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase().trim();
  const rows = document.querySelectorAll('.law-row');
  let found = 0;
  rows.forEach(row => {
    const match = row.textContent.toLowerCase().includes(q);
    row.style.display = match ? '' : 'none';
    if (match) found++;
  });
  document.getElementById('laws-empty-state').style.display = found === 0 ? 'block' : 'none';
});

// ── LOCATION MODAL ────────────────────────────────────────────
const locationHeader = document.getElementById('header-location');
const locationModal = document.getElementById('location-modal');
const locationOverlay = document.getElementById('location-overlay');
const stateSearch = document.getElementById('state-search');
const stateButtons = document.querySelectorAll('#state-list .nav-item');

locationHeader?.addEventListener('click', (e) => {
  e.stopPropagation();
  locationModal.style.display = 'block';
  locationOverlay.classList.add('open');
  setTimeout(() => {
    locationModal.style.opacity = '1';
    locationModal.style.transform = 'translate(-50%, -50%) scale(1)';
  }, 10);
});

function closeLocationModal() {
  locationModal.style.opacity = '0';
  locationModal.style.transform = 'translate(-50%, -50%) scale(0.9)';
  setTimeout(() => {
    locationModal.style.display = 'none';
    locationOverlay.classList.remove('open');
  }, 300);
}

locationOverlay?.addEventListener('click', closeLocationModal);

stateSearch?.addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  stateButtons.forEach(btn => {
    btn.style.display = btn.textContent.toLowerCase().includes(q) ? 'flex' : 'none';
  });
});

stateButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById('location-state').textContent = btn.textContent;
    closeLocationModal();
    // Simulate data refresh
    roadAlert.parentElement.style.display = 'block';
    alertText.textContent = `Jurisdiction switched to ${btn.textContent}`;
  });
});

// Global Escape Key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeSidebar();
    closeLocationModal();
    document.getElementById('law-modal').style.right = '-100%';
    document.getElementById('modal-overlay').classList.remove('open');
    notificationDropdown.classList.remove('open');
  }
});
