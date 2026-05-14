/* ============================================================
   DRIVELEGAL — app.js
   PWA registration + App Shell interactivity + UI Overhaul
   ============================================================ */

// ── IMPORTS (Offline Logic) ──────────────────────────────────
import { queryOffline, syncOfflineData } from './js/offline.js';

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

// ── CHALLAN CALCULATOR (API Integration) ─────────────────────
const calcBtn = document.getElementById('calc-btn');
const resultContent = document.getElementById('result-content');
const placeholder = document.getElementById('result-placeholder');

calcBtn?.addEventListener('click', async () => {
  const state    = document.getElementById('select-state').value;
  const vehicle  = document.getElementById('select-vehicle').value;
  const offence  = document.getElementById('select-offence').value;
  const repeat   = document.getElementById('select-repeat').value === 'repeat';
  const juvenile = document.getElementById('check-juvenile').checked;

  if (!offence || !state) {
    alert('Please select both a state and an offence.');
    return;
  }

  calcBtn.disabled = true;
  calcBtn.innerHTML = '<i class="ph ph-circle-notch animate-spin"></i> Calculating...';

  try {
    const response = await fetch('/api/challan/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state_id: state,
        offence_id: offence,
        vehicle_class: vehicle,
        is_repeat: repeat,
        is_juvenile: juvenile
      })
    });

    if (!response.ok) throw new Error('Calculation failed');
    
    const result = await response.json();
    
    const resultAmount = document.getElementById('result-amount');
    resultAmount.textContent = `₹${result.fine_amount.toLocaleString('en-IN')}`;
    resultAmount.className = 'amount amount-lg';
    
    document.getElementById('result-offence-name').textContent = result.offence_name;
    document.getElementById('result-section').textContent = result.section_reference;
    document.getElementById('result-jail').textContent = result.imprisonment || '—';
    document.getElementById('result-licence').textContent = result.licence_action || '—';

    // Severity mapping
    let severity = 'minor';
    if (result.fine_amount > 5000 || juvenile) severity = 'critical';
    else if (result.fine_amount > 2000) severity = 'major';
    else if (result.fine_amount > 500) severity = 'moderate';

    const card = document.getElementById('result-card');
    let ribbon = card.querySelector('.sev-ribbon');
    if (!ribbon) {
      ribbon = document.createElement('div');
      card.appendChild(ribbon);
    }
    ribbon.className = `sev-ribbon sev-${severity}`;

    placeholder.style.display = 'none';
    resultContent.style.display = 'block';
    
    locationState.textContent = document.getElementById('select-state').options[document.getElementById('select-state').selectedIndex].text;
  } catch (err) {
    console.error(err);
    alert('Could not calculate fine. Using offline estimation.');
  } finally {
    calcBtn.disabled = false;
    calcBtn.innerHTML = '<i class="ph ph-calculator-fill"></i> Calculate Fine';
  }
});

// ── AI ASSISTANT (API Integration) ──────────────────────────
const aiInput = document.getElementById('ai-input');
const chatMsgs = document.getElementById('chat-messages');

function appendMessage(text, role = 'user', citations = []) {
  const isUser = role === 'user';
  const wrap = document.createElement('div');
  wrap.className = 'chat-message-wrap';
  wrap.style.cssText = `display:flex;gap:10px;align-items:flex-start;${isUser ? 'flex-direction:row-reverse;' : ''} margin-bottom: 12px;`;
  
  let citationHtml = '';
  if (citations.length > 0) {
    citationHtml = `
      <div style="margin-top:8px; padding-top:8px; border-top:1px solid var(--border); font-size:0.7rem; color:var(--text-muted);">
        <strong>Sources:</strong> ${citations.map(c => `<span class="badge" style="font-size:0.65rem;">${c}</span>`).join(' ')}
      </div>
    `;
  }

  wrap.innerHTML = `
    <div style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:${isUser ? 'var(--accent)' : 'var(--primary-dim)'};">
      <i class="ph ph-${isUser ? 'user' : 'robot'}" style="color:${isUser ? '#fff' : 'var(--primary)'};font-size:1rem;"></i>
    </div>
    <div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-md);padding:12px 14px;max-width:85%;">
      <p style="font-size:0.875rem;line-height:1.6;color:var(--text-secondary); white-space: pre-wrap;">${text}</p>
      ${citationHtml}
    </div>
  `;
  chatMsgs.appendChild(wrap);
  chatMsgs.scrollTop = chatMsgs.scrollHeight;
}

async function handleAiSend(text) {
  const q = text || aiInput.value.trim();
  if (!q) return;
  
  appendMessage(q, 'user');
  aiInput.value = '';

  // Typing indicator
  const typing = document.createElement('div');
  typing.id = 'ai-typing';
  typing.innerHTML = '<p style="font-size:0.8rem; color:var(--text-muted); margin-left:42px;">AI is thinking...</p>';
  chatMsgs.appendChild(typing);
  chatMsgs.scrollTop = chatMsgs.scrollHeight;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: q })
    });

    const data = await response.json();
    typing.remove();
    appendMessage(data.response, 'ai', data.citations);
  } catch (err) {
    typing.remove();
    appendMessage("Sorry, I'm having trouble connecting to the legal database right now. Please try again later.", 'ai');
  }
}

document.getElementById('ai-send-btn')?.addEventListener('click', () => handleAiSend());
aiInput?.addEventListener('keydown', e => { if (e.key === 'Enter') handleAiSend(); });

document.querySelectorAll('#ai-suggestions button').forEach(btn => {
  btn.addEventListener('click', () => handleAiSend(btn.textContent));
});

// ── LAW DATA & POPULATION (API/Offline) ──────────────────────
async function populateLaws() {
  const tbody = document.getElementById('laws-tbody');
  if (!tbody) return;

  const category = document.getElementById('law-category')?.value;
  const search = document.getElementById('law-search')?.value;

  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:32px;"><i class="ph ph-circle-notch animate-spin"></i> Loading laws...</td></tr>';

  try {
    let laws = [];
    if (navigator.onLine) {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (search) params.append('search', search);
      
      const response = await fetch(`/api/laws/browse?${params.toString()}`);
      laws = await response.json();
    } else {
      // Use Rishi's IndexedDB query
      laws = await queryOffline({ search, severity: category });
    }

    if (laws.length === 0) {
      document.getElementById('laws-empty-state').style.display = 'block';
      tbody.innerHTML = '';
      return;
    }

    document.getElementById('laws-empty-state').style.display = 'none';
    tbody.innerHTML = laws.map(l => `
      <tr class="law-row" data-law-id="${l.id}">
        <td><span class="amount" style="font-size:0.85rem;">§ ${l.section_reference}</span></td>
        <td>${l.violation_name}</td>
        <td><span class="amount">₹${l.fine_amount_1 || 0}</span></td>
        <td><span class="amount">₹${l.fine_amount_2 || 0}</span></td>
        <td>${l.imprisonment || '—'}</td>
        <td><span class="badge badge-${l.fine_amount_1 > 5000 ? 'red' : 'green'}">Active</span></td>
      </tr>
    `).join('');

    // Attach listeners
    document.querySelectorAll('.law-row').forEach(row => {
      row.addEventListener('click', () => {
        const lawId = row.dataset.lawId;
        const law = laws.find(item => item.id == lawId);
        openLawDetails(`§ ${law.section_reference} — ${law.violation_name}`, law.full_text || `Violation: ${law.violation_name}. Primary fine: ₹${law.fine_amount_1}.`);
      });
    });

  } catch (err) {
    console.error(err);
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--danger);">Error loading laws. Check your connection.</td></tr>';
  }
}

// Category filter trigger
document.getElementById('law-category')?.addEventListener('change', populateLaws);

// ── LOCATION MODAL ────────────────────────────────────────────
const locationHeader = document.getElementById('header-location');
const locationModal = document.getElementById('location-modal');
const locationOverlay = document.getElementById('location-overlay');
const stateSearch = document.getElementById('state-search');
const stateListContainer = document.getElementById('state-list');

async function initLocations() {
  try {
    const response = await fetch('/api/locations');
    const states = await response.json();
    
    // Populate Calculator Dropdown
    const calcSelect = document.getElementById('select-state');
    if (calcSelect) {
      calcSelect.innerHTML = '<option value="">— Select State —</option>' + 
        states.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    }

    // Populate Modal List
    if (stateListContainer) {
      stateListContainer.innerHTML = states.map(s => `
        <button class="nav-item state-btn" data-id="${s.id}">${s.name}</button>
      `).join('');

      // Attach click listeners
      document.querySelectorAll('.state-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.getElementById('location-state').textContent = btn.textContent;
          if (calcSelect) calcSelect.value = btn.dataset.id;
          closeLocationModal();
          
          roadAlert.parentElement.style.display = 'block';
          alertText.textContent = `Jurisdiction switched to ${btn.textContent}`;
          
          // Re-fetch laws for this state
          populateLaws();
        });
      });
    }
  } catch (err) {
    console.error('Failed to fetch locations:', err);
  }
}

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
  document.querySelectorAll('.state-btn').forEach(btn => {
    btn.style.display = btn.textContent.toLowerCase().includes(q) ? 'flex' : 'none';
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

// Initial Load
initLocations();
populateLaws();
updateOnlineStatus();
