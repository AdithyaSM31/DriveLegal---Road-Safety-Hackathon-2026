import { queryOffline } from './js/offline.js';

// ── NAVIGATION & UI STATE ──────────────────────────────────────
const navItems = document.querySelectorAll('.nav-item, .bottom-nav-item');
const views = document.querySelectorAll('.view');
const sidebar = document.getElementById('main-sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const notificationDropdown = document.getElementById('notification-dropdown');
const notiToggle = document.getElementById('noti-toggle');

let currentJurisdictionId = null;

function switchView(viewId) {
  views.forEach(v => v.classList.remove('active'));
  document.getElementById(viewId)?.classList.add('active');
  
  navItems.forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewId);
  });

  if (window.innerWidth < 1024) closeSidebar();
  
  if (viewId === 'view-laws') populateLaws();
  if (viewId === 'view-analytics') initAnalytics();
}

navItems.forEach(item => {
  item.addEventListener('click', () => switchView(item.dataset.view));
});

// Trigger buttons (e.g. hero buttons)
document.querySelectorAll('[data-view-trigger]').forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.viewTrigger));
});

function toggleSidebar() {
  sidebar.classList.toggle('open');
}

function closeSidebar() {
  sidebar.classList.remove('open');
}

sidebarToggle?.addEventListener('click', toggleSidebar);

notiToggle?.addEventListener('click', (e) => {
  e.stopPropagation();
  notificationDropdown.classList.toggle('open');
});

document.addEventListener('click', () => {
  notificationDropdown?.classList.remove('open');
});

// ── ONLINE / OFFLINE STATUS ──────────────────────────────────
const offlineBanner = document.getElementById('offline-banner');

function updateOnlineStatus() {
  if (offlineBanner) {
    offlineBanner.style.display = navigator.onLine ? 'none' : 'block';
  }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// ── CHALLAN CALCULATOR ────────────────────────────────────────
const btnCalc = document.getElementById('btn-calc');
const calcResult = document.getElementById('calc-result');

btnCalc?.addEventListener('click', async () => {
  const stateId = document.getElementById('select-state').value;
  const violationId = document.getElementById('select-offence').value;
  const isSubsequent = document.querySelector('input[name="freq"]:checked').value === "2";

  if (!stateId || !violationId) {
    alert("Please select both a state and an offence.");
    return;
  }

  try {
    const response = await fetch(`/api/challan/calculate?jurisdiction_id=${stateId}&violation_id=${violationId}&is_subsequent=${isSubsequent}`);
    const data = await response.json();

    document.getElementById('res-amount').textContent = data.fine_amount.toLocaleString();
    document.getElementById('res-section').textContent = `§ ${data.section_reference}`;
    document.getElementById('res-jail').textContent = data.imprisonment || 'None';
    document.getElementById('res-license').textContent = data.license_action || 'None';
    
    calcResult.style.display = 'block';
    calcResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    console.error(err);
    alert("Failed to calculate. Using offline data...");
  }
});

// ── AI COPILOT ────────────────────────────────────────────────
const aiInput = document.getElementById('ai-input');
const aiSend = document.getElementById('ai-send');
const chatMessages = document.getElementById('chat-messages');

function appendMessage(text, isBot = false) {
  const msg = document.createElement('div');
  msg.className = `msg ${isBot ? 'bot-msg' : 'user-msg'}`;
  
  const content = isBot ? `
    <div class="msg-avatar"><i class="ph ph-robot"></i></div>
    <div class="msg-bubble">${text}</div>
  ` : `
    <div class="msg-bubble">${text}</div>
  `;
  
  msg.innerHTML = content;
  chatMessages.appendChild(msg);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function handleAISend() {
  const query = aiInput.value.trim();
  if (!query) return;

  aiInput.value = '';
  appendMessage(query, false);

  // Show thinking
  const thinkingId = 'thinking-' + Date.now();
  const thinkingMsg = document.createElement('div');
  thinkingMsg.className = 'msg bot-msg';
  thinkingMsg.id = thinkingId;
  thinkingMsg.innerHTML = `
    <div class="msg-avatar"><i class="ph ph-robot"></i></div>
    <div class="msg-bubble"><i class="ph ph-circle-notch animate-spin"></i> Analyzing traffic laws...</div>
  `;
  chatMessages.appendChild(thinkingMsg);

  try {
    const response = await fetch('/api/chat/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: query })
    });
    const data = await response.json();
    
    document.getElementById(thinkingId).remove();
    
    let formattedResponse = data.answer.replace(/\n/g, '<br>');
    if (data.citations && data.citations.length > 0) {
      const citations = [...new Set(data.citations)];
      formattedResponse += `<br><br><small style="color:var(--text-muted);">
        <strong>Sources:</strong> ${citations.map(c => `<span class="badge" style="font-size:0.65rem;">${c}</span>`).join(' ')}
      </small>`;
    }
    
    appendMessage(formattedResponse, true);
  } catch (err) {
    document.getElementById(thinkingId).remove();
    appendMessage("I'm sorry, I'm having trouble connecting to the legal database right now. Please try again later.", true);
  }
}

aiSend?.addEventListener('click', handleAISend);
aiInput?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleAISend();
  }
});

// ── LAW BROWSER ──────────────────────────────────────────────
const roadAlert = document.getElementById('sticky-alert-text');
const alertText = document.getElementById('sticky-alert-text');

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
      
      console.log('[DriveLegal] Fetching laws with params:', params.toString());
      const response = await fetch(`/api/laws/browse?${params.toString()}`);
      if (!response.ok) throw new Error('API Error');
      
      const data = await response.json();
      console.log('[DriveLegal] API Laws Data:', data);
      laws = data.results || [];
    } else {
      console.log('[DriveLegal] Using offline data for Law Browser');
      laws = await queryOffline({ search, severity: category });
    }

    console.log('[DriveLegal] Final laws array:', laws);

    if (!Array.isArray(laws) || laws.length === 0) {
      document.getElementById('laws-empty-state').style.display = 'block';
      tbody.innerHTML = '';
      return;
    }

    document.getElementById('laws-empty-state').style.display = 'none';
    tbody.innerHTML = laws.map(l => `
      <tr class="law-row" data-law-id="${l.id}">
        <td><span class="amount" style="font-size:0.85rem;">§ ${l.section_reference || 'N/A'}</span></td>
        <td>${l.violation_name || l.name || 'Unknown'}</td>
        <td><span class="amount">₹${l.first_offence_fine || 0}</span></td>
        <td><span class="amount">₹${l.subsequent_offence_fine || 0}</span></td>
        <td>${l.imprisonment_text || '—'}</td>
        <td><span class="badge badge-${(l.first_offence_fine || 0) > 5000 ? 'red' : 'green'}">Active</span></td>
      </tr>
    `).join('');

    document.querySelectorAll('.law-row').forEach(row => {
      row.addEventListener('click', () => {
        const lawId = row.dataset.lawId;
        const law = laws.find(item => item.id == lawId);
        if (law) {
            openLawDetails(`§ ${law.section_reference} — ${law.violation_name}`, law.full_text || `Violation: ${law.violation_name}. Primary fine: ₹${law.first_offence_fine}.`);
        }
      });
    });

  } catch (err) {
    console.error('[DriveLegal] Law Browser Error:', err);
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--danger);">Error loading laws. Check console.</td></tr>';
  }
}

document.getElementById('law-category')?.addEventListener('change', populateLaws);
document.getElementById('law-search')?.addEventListener('input', debounce(populateLaws, 300));

function debounce(func, timeout = 300){
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => { func.apply(this, args); }, timeout);
  };
}

function openLawDetails(title, content) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-content').innerHTML = `<p>${content}</p>`;
  document.getElementById('law-modal').style.right = '0';
  document.getElementById('modal-overlay').classList.add('open');
}

document.getElementById('close-law-modal')?.addEventListener('click', () => {
  document.getElementById('law-modal').style.right = '-100%';
  document.getElementById('modal-overlay').classList.remove('open');
});

// ── LOCATION MODAL ────────────────────────────────────────────
const locationHeader = document.getElementById('header-location');
const locationModal = document.getElementById('location-modal');
const locationOverlay = document.getElementById('location-overlay');
const stateSearch = document.getElementById('state-search');
const stateListContainer = document.getElementById('state-list');

async function initLocations() {
  try {
    console.log('[DriveLegal] Initializing locations...');
    const response = await fetch('/api/locations');
    const states = await response.json();
    console.log('[DriveLegal] Locations data:', states);
    
    if (!Array.isArray(states)) {
        console.error('[DriveLegal] Locations is not an array:', states);
        return;
    }

    const calcSelect = document.getElementById('select-state');
    if (calcSelect) {
      calcSelect.innerHTML = '<option value="">— Select State —</option>' + 
        states.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    }

    if (stateListContainer) {
      stateListContainer.innerHTML = states.map(s => `
        <button class="nav-item state-btn" data-id="${s.id}">${s.name}</button>
      `).join('');

      document.querySelectorAll('.state-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.getElementById('location-state').textContent = btn.textContent;
          if (calcSelect) calcSelect.value = btn.dataset.id;
          closeLocationModal();
          
          if (roadAlert) {
            roadAlert.parentElement.style.display = 'block';
            alertText.textContent = `Jurisdiction switched to ${btn.textContent}`;
          }
          
          currentJurisdictionId = btn.dataset.id;
          populateLaws();
          initAnalytics();
        });
      });
    }
  } catch (err) {
    console.error('[DriveLegal] Failed to fetch locations:', err);
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

// ── ANALYTICS CHARTS ──────────────────────────────────────────
let offenceChartInstance = null;
let severityChartInstance = null;

async function initAnalytics() {
  console.log('[DriveLegal] Initializing analytics charts...');
  const offenceCanvas = document.getElementById('offenceChart');
  const severityCanvas = document.getElementById('severityChart');
  if (!offenceCanvas || !severityCanvas) return;

  // Fallback Mock Data
  let data = {
    offences: { labels: ['No Data'], values: [0] },
    severity: { labels: ['No Data'], values: [0] },
    hud: { safety_index: '92%', risk_level: 'Low', traffic_density: 'Moderate' }
  };

  try {
    const url = currentJurisdictionId 
      ? `/api/analytics/summary?jurisdiction_id=${currentJurisdictionId}`
      : '/api/analytics/summary';
      
    const res = await fetch(url);
    if (res.ok) {
      data = await res.json();
      console.log('[DriveLegal] Analytics live data:', data);
    }
  } catch (err) {
    console.warn('[DriveLegal] Using mock data for analytics. Fetch failed:', err);
  }

  // Update HUD
  const hudSafety = document.getElementById('hud-safety');
  const hudRisk = document.getElementById('hud-risk');
  const hudTraffic = document.getElementById('hud-traffic');

  if (hudSafety) hudSafety.textContent = data.hud.safety_index;
  if (hudRisk) hudRisk.textContent = data.hud.risk_level;
  if (hudTraffic) hudTraffic.textContent = data.hud.traffic_density;

  const style = getComputedStyle(document.documentElement);
  const primary = style.getPropertyValue('--primary').trim() || '#3B82F6';
  const success = style.getPropertyValue('--success').trim() || '#10B981';
  const warning = style.getPropertyValue('--warning').trim() || '#F59E0B';
  const danger = style.getPropertyValue('--danger').trim() || '#EF4444';
  const textPrimary = style.getPropertyValue('--text-primary').trim() || '#F8FAFC';
  const textMuted = style.getPropertyValue('--text-muted').trim() || '#64748B';
  const borderCol = style.getPropertyValue('--border-bright').trim() || '#334155';

  if (typeof Chart === 'undefined') {
      console.error('[DriveLegal] Chart.js is not loaded yet.');
      return;
  }

  Chart.defaults.color = textMuted;
  Chart.defaults.font.family = "'Inter', sans-serif";

  if (offenceChartInstance) offenceChartInstance.destroy();
  offenceChartInstance = new Chart(offenceCanvas, {
    type: 'bar',
    data: {
      labels: data.offences.labels,
      datasets: [{
        label: 'Reported Incidents',
        data: data.offences.values,
        backgroundColor: primary,
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: borderCol, drawBorder: false } },
        x: { grid: { display: false, drawBorder: false } }
      }
    }
  });

  if (severityChartInstance) severityChartInstance.destroy();
  severityChartInstance = new Chart(severityCanvas, {
    type: 'doughnut',
    data: {
      labels: data.severity.labels,
      datasets: [{
        data: data.severity.values,
        backgroundColor: [success, warning, danger, '#8B5CF6'],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
          position: 'right',
          labels: { color: textPrimary, usePointStyle: true, boxWidth: 8 }
        }
      }
    }
  });
  console.log('[DriveLegal] Charts rendered successfully.');
}

// Global Escape Key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeSidebar();
    closeLocationModal();
    document.getElementById('law-modal').style.right = '-100%';
    document.getElementById('modal-overlay').classList.remove('open');
    notificationDropdown?.classList.remove('open');
  }
});

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    initLocations();
    populateLaws();
    updateOnlineStatus();
    
    if (typeof Chart !== 'undefined') {
        initAnalytics();
    } else {
        const checkChart = setInterval(() => {
            if (typeof Chart !== 'undefined') {
                clearInterval(checkChart);
                initAnalytics();
            }
        }, 100);
    }
});
