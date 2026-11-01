import {money, lawKey, filterLaws, calculateFine, rankLaws} from './js/domain.mjs?v=24';
import {preference, loadSnapshot, syncSnapshot, request} from './js/store.mjs?v=24';

const $ = selector => document.querySelector(selector);
const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeURL = value => { try { const url = new URL(value); return ['https:','http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; } };
const external = (url, label, cls = 'source-link') => safeURL(url) ? `<a class="${cls}" href="${escape(safeURL(url))}" target="_blank" rel="noopener noreferrer">${escape(label)} ${icon('external')}</a>` : `<span>${escape(label)}</span>`;
const date = value => value ? new Date(`${value.slice(0,10)}T12:00:00`).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'}) : 'Not recorded';
const state = {data:null, route:'overview', region:preference.get('region',''), bookmarks:preference.get('saved',[]), query:'', category:'', page:1, pageSize:6, result:null, calc:{violation:'',vehicle:'',repeat:false}, messages:[], sending:false, syncing:false, user:null};
let toastTimer;
function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').hidden = true, 5000); }
function regionName() { return state.data.jurisdictions.find(j => String(j.id) === state.region)?.name || 'All jurisdictions'; }
function sourceStatus() { return !navigator.onLine ? 'Offline library' : state.data.origin === 'server' ? 'Library synced' : state.data.origin === 'cached' ? 'Cached library' : 'Included library'; }
function status() { return `<span class="inline-status"><span class="status-dot ${!navigator.onLine ? 'offline' : ''}"></span>${sourceStatus()}</span>`; }
function heading(title, subtitle, action='') { return `<div class="page-heading"><div><span class="eyebrow">YOUR ROAD COMPANION</span><h1>${title}</h1><p>${subtitle}</p></div>${action}</div>`; }
function notice(text, warning=false) { return `<div class="notice ${warning ? 'warning' : ''}">${icon('info')}<span>${text}</span></div>`; }
function stats(items) { return `<div class="stats-row">${items.map(([symbol,label,value,unit,color='']) => `<div class="stat-card"><span class="stat-icon ${color}">${icon(symbol)}</span><div><div class="stat-title">${label}</div><div class="stat-value">${value}<small>${unit}</small></div></div>${icon('chevron')}</div>`).join('')}</div>`; }
function selected(value, current) { return String(value) === String(current) ? 'selected' : ''; }
function options(rows, current, label='name') { return rows.map(row => `<option value="${row.id}" ${selected(row.id,current)}>${escape(row[label])}${row.type === 'national' ? ' · national baseline' : ''}</option>`).join(''); }
function empty(title, text, action='') { return `<div class="empty-state">${icon('search')}<h2>${title}</h2><p>${text}</p>${action}</div>`; }
function currentLaws() { return filterLaws(state.data.laws,{jurisdiction:state.region,category:state.category,search:state.query,saved:state.route === 'saved',bookmarks:state.bookmarks}); }
function lookup(key) { return state.data.laws.find(row => lawKey(row) === key); }
function bookmarkButton(row) { const saved = state.bookmarks.includes(lawKey(row)); return `<button class="bookmark-button ${saved?'saved':''}" data-action="bookmark" data-key="${lawKey(row)}" aria-label="${saved?'Unsave':'Save'} ${escape(row.violation_name)}" aria-pressed="${saved}">${icon('bookmark')}</button>`; }
function overview() {
  const {laws, jurisdictions, violations} = state.data;
  const sample = [...new Map([...filterLaws(laws,{jurisdiction:state.region}),...laws].map(row => [row.violation_id,row])).values()].slice(0,3);
  return `${heading('Your journey, a little clearer.', 'Your traffic rules, road essentials, and peace of mind. All in one place.', `<span class="date-label">${icon('sun')}${new Date().toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'long'})}</span>`)}
  <section class="hero" aria-label="Know your road rules"><div class="hero-copy"><span class="hero-label">${icon('shield')} CONFIDENCE FOR EVERY KILOMETRE</span><h2>Know the rules.<br><em>Enjoy the journey.</em></h2><p>Understand traffic laws, explore fines, and get answers before you hit the road.</p><a class="button lime" href="#laws">Explore traffic laws ${icon('arrow')}</a><a class="hero-secondary" href="#assistant">Ask the assistant ${icon('arrow')}</a></div><img class="hero-art" src="assets/road-journey.svg" alt="An illustrated winding road with a car and a safety shield"></section>
  ${stats([['book','Fine schedules',laws.length,'in your library'],['pin','Jurisdictions',jurisdictions.length,'national + regional','blue'],['shield','Violation types',violations.length,'in the supplied data','amber']])}
  <div class="section-heading"><h2>What would you like to do?</h2>${status()}</div>
  <section class="actions-grid" aria-label="Quick actions">${[['calculator','calculator','Estimate a fine','A clear breakdown for your state and vehicle.',''],['book','laws','Know your rules','Find a traffic law, its penalties, and its source.','blue'],['spark','assistant','Ask a question','Start with a question. Find the relevant records.','amber']].map(([symbol,route,title,description,color]) => `<a class="action-card" href="#${route}"><div class="stat-icon ${color}">${icon(symbol)}</div><span class="action-arrow">${icon('arrow')}</span><h3>${title}</h3><p>${description}</p></a>`).join('')}</section>
  <div class="overview-bottom"><section class="panel"><div class="section-heading"><div><h2>A look inside the law library</h2><p>First-offence amounts from existing records</p></div><a href="#laws">View library ${icon('arrow')}</a></div><div class="rule-list">${sample.map((row,index) => `<button class="rule-row" data-action="detail" data-key="${lawKey(row)}"><span class="rule-num">0${index+1}</span><span><strong>${escape(row.violation_name)}</strong><small>Section ${escape(row.section_reference)} · ${escape(row.jurisdiction_name)}</small></span><span class="rule-price">${money(row.first_offence_fine)}</span>${icon('chevron')}</button>`).join('')}</div></section>
  <section class="panel preparedness"><span class="eyebrow">A MINUTE BEFORE YOU LEAVE</span><h3>A safer trip starts<br>with the little things.</h3><p>A quick check goes a long way.</p><ul class="check-list"><li>${icon('check')}Helmet on. Seat belt fastened.</li><li>${icon('check')}Licence and vehicle documents ready.</li><li>${icon('check')}Phone away. Eyes on the road.</li></ul><button class="text-button" data-action="road-tools">Check your road context ${icon('arrow')}</button></section></div>
  <div class="section-heading" style="margin-top:23px"><a href="#insights">Understand the dataset & coverage ${icon('arrow')}</a><a class="mobile-saved" href="#saved">${icon('bookmark')}Saved laws</a><button class="mobile-saved" data-action="account">${icon('user')}Account</button></div>`;
}
function lawCard(row) {
  return `<article class="law-card"><div class="law-card-top"><span class="tag ${row.severity==='critical'?'critical':row.severity==='major'?'amber':''}">${escape(row.category_name)}</span>${bookmarkButton(row)}</div><h3>${escape(row.violation_name)}</h3><div class="law-meta">Section ${escape(row.section_reference)} · ${escape(row.jurisdiction_name)} · ${escape(row.vehicle_class || 'Any vehicle')}</div><div class="law-prices"><div><small>First offence</small><strong>${money(row.first_offence_fine)}</strong></div><div><small>Repeat offence</small><strong>${money(row.subsequent_offence_fine)}</strong></div></div><div class="law-card-bottom"><span>Effective ${date(row.effective_date)}</span><button data-action="detail" data-key="${lawKey(row)}">Details & source ${icon('arrow')}</button></div></article>`;
}
function renderLawResults() {
  const rows = currentLaws();
  const pages = Math.max(1,Math.ceil(rows.length/state.pageSize));
  state.page = Math.min(state.page,pages);
  const start = (state.page-1)*state.pageSize;
  $('#law-results').innerHTML = rows.length ? rows.slice(start,start+state.pageSize).map(lawCard).join('') : empty(state.route==='saved'?'No saved laws here yet.':'No matching records.',state.route==='saved'?'Save a law using its bookmark button, or choose a different jurisdiction.':'Try another search or jurisdiction. Regional coverage is limited; a missing record does not mean there is no penalty.');
  $('#law-pagination').innerHTML = `<span>${rows.length ? start+1 : 0}–${Math.min(start+state.pageSize,rows.length)} of ${rows.length} records</span><div class="pagination-controls"><button class="button" data-action="prev" ${state.page===1?'disabled':''}>Previous</button><span>${state.page} / ${pages}</span><button class="button" data-action="next" ${state.page===pages?'disabled':''}>Next</button></div>`;
}
function lawsPage() {
  const saved = state.route==='saved';
  return `${heading(saved?'Your saved laws.':'A clearer view of the rules.', saved?'Your bookmarked records, ready when you need them.':'Browse the supplied fine schedules by state, section, or violation.',`<button class="button" data-action="export-laws">${icon('download')}Export PDF</button>`)}
  ${notice(`Showing records for <strong>${escape(regionName())}</strong>. These are existing project records with historical effective dates; current amendments have not been verified. <a href="#insights" class="source-link">See coverage ${icon('arrow')}</a>`)}
  <div class="toolbar"><label class="search-field">${icon('search')}<input id="law-search" aria-label="Search violation or section" placeholder="Search violation or section…" value="${escape(state.query)}"></label><select class="select-field" id="law-category" aria-label="Filter by category"><option value="">All categories</option>${options(state.data.categories,state.category)}</select><select class="select-field" id="law-page-size" aria-label="Records per page">${[6,12,24].map(n => `<option value="${n}" ${selected(n,state.pageSize)}>${n} per page</option>`).join('')}</select><a class="button small mobile-saved" href="#${saved?'laws':'saved'}">${icon('bookmark')}${saved?'All laws':'Saved'}</a></div><div id="law-results" class="law-grid" aria-live="polite"></div><div id="law-pagination" class="pagination"></div>`;
}
function calcPage() {
  return `${heading('No guesswork. Just a breakdown.', 'Find an estimate using the records for your state and vehicle.')}
  ${notice('An estimate from the supplied dataset. State coverage is limited, and source dates may be historical. Check the linked authority for current rules.',true)}
  <div class="calc-layout"><form id="calculator-form" class="panel form-panel"><h2>The details of your estimate</h2><p class="panel-caption">Choose your region first. We’ll show the available records.</p><div class="field"><label for="calc-region">State / jurisdiction</label><select id="calc-region" name="region" required><option value="">Select jurisdiction</option>${options(state.data.jurisdictions,state.region)}</select></div><div class="field"><label for="calc-violation">Violation</label><select id="calc-violation" name="violation" required></select><small id="calc-coverage"></small></div><div class="field"><label for="calc-vehicle">Vehicle class</label><select id="calc-vehicle" name="vehicle" required></select></div><label class="checkbox-field"><input type="checkbox" id="calc-repeat" ${state.calc.repeat?'checked':''}> This is a repeat offence</label><div id="calc-error" class="form-error" role="alert" hidden></div><button class="button primary" type="submit">Calculate estimate ${icon('arrow')}</button><p class="panel-caption" style="margin:15px 0 0">The calculator uses database values, with no AI-generated amounts.</p></form><div id="calculator-result" aria-live="polite"></div></div>`;
}
function populateCalculator() {
  const rows = filterLaws(state.data.laws,{jurisdiction:state.region});
  const available = state.region ? state.data.violations.filter(v => rows.some(r => r.violation_id===v.id)) : [];
  if (!available.some(v => String(v.id)===state.calc.violation)) state.calc.violation = '';
  $('#calc-violation').innerHTML = `<option value="">${available.length?'Select violation':'Choose a jurisdiction first'}</option>${options(available,state.calc.violation)}`;
  $('#calc-coverage').textContent = state.region ? `${available.length} violation type${available.length===1?'':'s'} available for ${regionName()}.` : 'Select a jurisdiction to see its records.';
  populateVehicles();
}
function populateVehicles() {
  const rows = state.data.laws.filter(r => r.jurisdiction_id===Number(state.region) && r.violation_id===Number(state.calc.violation));
  const vehicles = state.data.vehicles.filter(v => rows.some(r => r.vehicle_class_id===v.id));
  const generic = rows.some(r => r.vehicle_class_id == null);
  if (!vehicles.some(v => String(v.id)===state.calc.vehicle)) state.calc.vehicle = '';
  if (vehicles.length===1 && !generic) state.calc.vehicle = String(vehicles[0].id);
  $('#calc-vehicle').innerHTML = `${generic?'<option value="any">Any vehicle</option>':'<option value="">Select vehicle class</option>'}${options(vehicles,state.calc.vehicle)}`;
}
function detailList(row, result=false) {
  const pairs = [['Jurisdiction',row.jurisdiction_name],['Vehicle',row.vehicle_class || 'Any vehicle'],['Legal section',row.section_reference],['Repeat-offence fine',money(row.subsequent_offence_fine)],['Maximum in record',money(row.max_fine)],['Compounding fee',money(row.compounding_fee)],['Imprisonment',row.imprisonment_text || 'Not specified in this record'],['Licence action',row.license_action || 'Not specified in this record'],['Other penalties',row.additional_penalties || 'Not specified in this record'],['Effective date',date(row.effective_date)]];
  return `<dl class="detail-list">${pairs.map(([label,value]) => `<div><dt>${label}</dt><dd>${escape(value ?? 'Not specified')}</dd></div>`).join('')}</dl>`;
}
function renderResult() {
  const target = $('#calculator-result');
  if (!target) return;
  const row = state.result;
  if (!row) { target.innerHTML = `<div class="result-placeholder"><span class="stat-icon">${icon('calculator')}</span><h2>Clarity is a few details away.</h2><p>Your fine estimate, legal section, and additional penalties will appear here.</p></div>`; return; }
  target.innerHTML = `<section class="panel result-panel"><span class="tag">${icon('check')}Dataset estimate · ${escape(row.jurisdiction_name)}</span><div class="estimate-label">${row.repeat?'Repeat':'First'} offence amount</div><div class="estimate-value">${money(row.fine_amount)}</div><p class="estimate-context">${escape(row.violation_name)} · ${escape(row.vehicle_class || 'Any vehicle')}</p>${notice('Compounding fees are shown separately. They are not automatically added to the offence amount.')}${detailList(row,true)}${row.notes?`<p class="panel-caption">${escape(row.notes)}</p>`:''}${external(row.source_url,row.source || 'Source authority')}<div class="result-actions"><button class="button small" data-action="export-result">${icon('download')}Download PDF</button><button class="button small" data-action="bookmark" data-key="${lawKey(row)}">${icon('bookmark')}${state.bookmarks.includes(lawKey(row))?'Saved':'Save law'}</button></div></section>`;
}
function bars(rows, key) {
  const groups = {};
  rows.forEach(r => { const label=r[key] || 'Unspecified'; groups[label]=(groups[label]||0)+1; });
  const max = Math.max(1,...Object.values(groups));
  return `<div class="bar-list">${Object.entries(groups).sort((a,b) => b[1]-a[1]).map(([label,count]) => `<div><div class="bar-label"><span>${escape(label)}</span><strong>${count}</strong></div><div class="bar-track" role="img" aria-label="${escape(label)}: ${count} schedules"><div class="bar-fill" style="width:${count/max*100}%"></div></div></div>`).join('') || '<p>No records in this jurisdiction.</p>'}</div>`;
}
function insightsPage() {
  const rows = filterLaws(state.data.laws,{jurisdiction:state.region});
  return `${heading('Good information has context.', 'Understand what’s in the library, where it comes from, and its limits.',`<button class="button" data-action="sync" ${state.syncing?'disabled':''}>${icon('refresh')}${state.syncing?'Syncing…':'Sync data'}</button>`)}
  ${notice('These charts describe the supplied law dataset. They are not live traffic, crash statistics, enforcement counts, or a road-safety score.')}
  ${stats([['book','Fine schedules',rows.length,escape(regionName())],['shield','Violation types',new Set(rows.map(r=>r.violation_id)).size,'with available records','blue'],['cloud','Library status',state.data.origin==='server'?'Synced':'Local',state.data.syncedAt?`Synced ${date(state.data.syncedAt)}`:'Included project snapshot','amber']])}
  <div class="coverage-grid"><section class="panel"><h2>Records by category</h2><p class="panel-caption" style="margin-bottom:0">Number of fine schedules in ${escape(regionName())}</p>${bars(rows,'category_name')}</section><section class="panel"><h2>Recorded severity</h2><p class="panel-caption" style="margin-bottom:0">Severity labels from the existing dataset</p>${bars(rows,'severity')}</section></div>
  <section class="panel data-panel"><div class="section-heading"><div><h2>Regional coverage</h2><p>Available records vary. Missing data is never treated as a zero fine.</p></div><button data-action="export-coverage">${icon('download')}CSV</button></div><table class="coverage-table"><thead><tr><th scope="col">Jurisdiction</th><th scope="col">Violations</th><th scope="col">Effective date</th><th scope="col"><span class="sr-only">Browse records</span></th></tr></thead><tbody>${state.data.jurisdictions.map(j => `<tr class="${String(j.id)===state.region?'selected':''}"><td>${escape(j.name)}${j.type==='national'?' · national':''}</td><td>${new Set(state.data.laws.filter(r=>r.jurisdiction_id===j.id).map(r=>r.violation_id)).size}</td><td>${date(j.effective_date)}</td><td><button class="button small" data-action="region-laws" data-id="${j.id}">Browse ${icon('arrow')}</button></td></tr>`).join('')}</tbody></table></section>
  <section class="panel data-panel"><h2>About the data</h2><p>The library is bundled from this project's existing seed files. Source links point to the recorded authorities; their current contents have not been checked. A historical effective date is not a recent verification date. State records are never silently replaced with national amounts.</p><div class="result-actions"><button class="button small" data-action="export-laws">${icon('download')}Export selected laws</button><button class="button small" data-action="sync">${icon('refresh')}Refresh from backend</button></div><p id="sync-status">${state.data.syncedAt?`Last successful sync: ${escape(new Date(state.data.syncedAt).toLocaleString('en-IN'))}`:'Using the bundled offline snapshot. Connect to your backend to sync.'}</p></section>`;
}
function assistantPage() {
  return `${heading('A question is a good place to start.', 'Find relevant records for your jurisdiction, with sources you can open.')}
  <div class="assistant-layout"><div class="assistant-controls"><span>Context: <strong>${escape(regionName())}</strong></span><button class="text-button" data-action="new-chat">New conversation ${icon('refresh')}</button></div><div class="assistant-welcome" ${state.messages.length?'hidden':''}><div class="stat-icon">${icon('spark')}</div><h2>Let’s make the rules clearer.</h2><p>Ask about a violation or legal section. The assistant searches your selected jurisdiction and tells you when coverage is missing.</p><div class="suggestions">${['What is the fine for no helmet?','What does section 194D say?','Can I drive without a licence?'].map(q=>`<button class="suggestion" data-action="suggest" data-question="${escape(q)}">${escape(q)}</button>`).join('')}</div></div><div id="chat-log" class="chat-log" role="log" aria-label="Conversation" aria-live="polite"></div><form id="chat-form" class="chat-composer"><label class="sr-only" for="chat-input">Your traffic law question</label><textarea id="chat-input" rows="2" maxlength="2000" placeholder="Ask about a traffic law, fine, or section…" required ${state.sending?'disabled':''}></textarea><button class="button primary" type="submit" aria-label="Send question" ${state.sending?'disabled':''}>${icon('send')}</button></form><p class="chat-footnote">Database lookup works offline. AI explanations require a configured backend. Always check the source for current law.</p></div>`;
}
function renderMessages() {
  if (!$('#chat-log')) return;
  $('.assistant-welcome').hidden = Boolean(state.messages.length);
  $('#chat-log').innerHTML = state.messages.map(message => `<div class="message ${message.user?'user':''}"><span class="message-avatar">${icon(message.user?'user':'spark')}</span><div class="message-content">${!message.user?`<div class="message-mode">${escape(message.mode || 'Database lookup')}</div>`:''}<div class="message-text">${escape(message.text)}</div>${message.citations?.length?`<div class="citations">${message.citations.map(c=>external(c.url,`Section ${c.section} · ${c.jurisdiction} · ${c.source}`,'citation')).join('')}</div>`:''}</div></div>`).join('') + (state.sending?`<div class="message"><span class="message-avatar">${icon('spark')}</span><div class="message-content">Looking through the law library…</div></div>`:'');
  $('#chat-input').disabled = state.sending;
  $('#chat-form button').disabled = state.sending;
}
let chatGeneration = 0;
async function sendQuestion(question) {
  const text = question.trim();
  if (!text || state.sending) return;
  const generation = chatGeneration;
  const region = state.region;
  state.messages.push({text,user:true});
  state.sending = true;
  $('#chat-input').value = '';
  renderMessages();
  try {
    let result;
    if (navigator.onLine) {
      try {
        result = await request('/api/chat/', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,jurisdiction_id:Number(region)||null})});
        if (typeof result.reply !== 'string') throw new Error('Invalid assistant response');
      } catch { /* local retrieval below */ }
    }
    if (!result) {
      const named = state.data.jurisdictions.filter(j=>new RegExp(`\\b${j.name}\\b`,'i').test(text)).sort((a,b)=>b.name.length-a.name.length)[0];
      const context = named ? String(named.id) : region;
      const matches = context ? rankLaws(text,filterLaws(state.data.laws,{jurisdiction:context})) : [];
      result = {mode:'Offline database lookup',reply:!context?'Choose a jurisdiction from the top bar so I can find relevant records.':matches.length?`Here is what the supplied dataset contains:\n\n${matches.map(r=>`${r.violation_name}\n${r.jurisdiction_name} · Section ${r.section_reference} · ${r.vehicle_class || 'Any vehicle'}\nFirst offence: ${money(r.first_offence_fine)}\nRepeat offence: ${money(r.subsequent_offence_fine)}\nEffective: ${date(r.effective_date)}${r.license_action?`\nLicence action: ${r.license_action}`:''}`).join('\n\n')}\n\nThese are existing project records. Check the source for current amendments.`:'I couldn’t find a matching record in this jurisdiction. Coverage is limited; try a violation name or section number, or check the relevant transport authority.',citations:matches.map(r=>({source:r.source,section:r.section_reference,jurisdiction:r.jurisdiction_name,url:r.source_url}))};
    }
    if (generation===chatGeneration) state.messages.push({text:result.reply,mode:result.mode==='ai'?'AI explanation · retrieved sources':result.mode==='database'?'Database lookup':result.mode,citations:result.citations});
  } finally {
    if (generation===chatGeneration) {
      state.sending = false;
      if (state.route==='assistant') { renderMessages(); $('#chat-input').focus(); $('#chat-form').scrollIntoView({block:'nearest',behavior:'smooth'}); }
    }
  }
}
function render() {
  if (!state.data) return;
  $('#saved-count').textContent = state.bookmarks.length;
  document.querySelectorAll('[data-route]').forEach(link=>{const active=link.dataset.route===state.route;link.classList.toggle('active',active);if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
  const pages = {overview, laws:lawsPage, saved:lawsPage, calculator:calcPage, insights:insightsPage, assistant:assistantPage};
  $('#main').innerHTML = (pages[state.route] || overview)();
  document.title = `${({overview:'Overview',laws:'Traffic laws',saved:'Saved laws',calculator:'Fine calculator',assistant:'Legal assistant',insights:'Data & coverage'})[state.route]} — DriveLegal`;
  if (['laws','saved'].includes(state.route)) renderLawResults();
  if (state.route==='calculator') { populateCalculator(); renderResult(); }
  if (state.route==='assistant') renderMessages();
}
function navigate() {
  const route = location.hash.slice(1) || 'overview';
  state.route = ['overview','laws','saved','calculator','assistant','insights'].includes(route)?route:'overview';
  state.page = 1;
  render();
  window.scrollTo({top:0});
}
function setRegion(value) {
  state.region=String(value);
  preference.set('region',state.region);
  $('#global-region').value=state.region;
  state.page=1;
  state.result=null;
  state.calc={violation:'',vehicle:'',repeat:false};
}
function showDialog(content) { $('#dialog-content').innerHTML=content; if (!$('#detail-dialog').open) $('#detail-dialog').showModal(); }
function showLaw(row) {
  if (!row) return;
  showDialog(`<span class="tag">${escape(row.category_name)}</span><h2 id="dialog-title">${escape(row.violation_name)}</h2><p>${escape(row.description || `Section ${row.section_reference} of the recorded traffic law schedule.`)}</p><div class="law-prices" style="margin-top:20px"><div><small>First offence</small><strong>${money(row.first_offence_fine)}</strong></div><div><small>Repeat offence</small><strong>${money(row.subsequent_offence_fine)}</strong></div></div>${detailList(row)}${row.notes?`<p>${escape(row.notes)}</p>`:''}<div class="result-actions">${external(row.source_url,row.source || 'Source authority')}<button class="button small" data-action="bookmark" data-key="${lawKey(row)}">${icon('bookmark')}${state.bookmarks.includes(lawKey(row))?'Saved law':'Save law'}</button><button class="button small" data-action="estimate-law" data-key="${lawKey(row)}">Estimate this fine ${icon('arrow')}</button></div><p class="dialog-note">Historical project data. Check the source authority for current amendments. Unspecified penalties are not treated as absent.</p>`);
}
async function sync(manual=false) {
  if (state.syncing) return;
  if (!navigator.onLine) { if(manual)toast('Reconnect to sync. Your offline library is still available.'); return; }
  state.syncing=true;
  if (manual && state.route==='insights') render();
  try {
    const name=regionName();
    const next=await syncSnapshot();
    state.data=next;
    state.region=String(next.jurisdictions.find(j=>j.name===name)?.id || '');
    $('#global-region').innerHTML='<option value="">All jurisdictions</option>'+options(next.jurisdictions,state.region);
    preference.set('region',state.region);
    if (manual) toast('Library synced. The data is ready for offline use.');
  } catch (error) { if(manual)toast(`Sync unavailable. Keeping your offline library. ${error.message}`); }
  finally { state.syncing=false; if(state.route==='insights' || state.route==='overview')render(); }
}
function toggleBookmark(key) {
  if (!lookup(key)) return;
  const saved=state.bookmarks.includes(key);
  state.bookmarks=saved?state.bookmarks.filter(k=>k!==key):[...state.bookmarks,key];
  preference.set('saved',state.bookmarks);
  $('#saved-count').textContent=state.bookmarks.length;
  if(['laws','saved'].includes(state.route))renderLawResults();
  if(state.route==='calculator')renderResult();
  if($('#detail-dialog').open && $('#dialog-content [data-action="estimate-law"]'))showLaw(lookup(key));
  toast(saved?'Law removed from saved.':'Law saved on this device.');
}
function theme(value) {
  document.documentElement.dataset.theme=value;
  preference.set('theme',value);
  $('[data-action="theme"]').innerHTML=icon(value==='dark'?'sun':'moon');
  $('meta[name="theme-color"]').content=value==='dark'?'#142321':'#111313';
}
const scripts=new Map();
function loadScript(src) {
  if(scripts.has(src))return scripts.get(src);
  const promise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>reject(new Error('Unable to load the requested feature.'));document.head.append(script);});
  scripts.set(src,promise);
  promise.catch(()=>scripts.delete(src));
  return promise;
}
async function saveFile(blob, filename, mime='application/pdf') {
  if(window.Capacitor?.isNativePlatform?.() && window.Capacitor?.registerPlugin) {
    const base64=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(blob);});
    const fs=window.Capacitor.registerPlugin('Filesystem');
    const share=window.Capacitor.registerPlugin('Share');
    const result=await fs.writeFile({path:filename,data:base64,directory:'CACHE'});
    await share.share({title:filename,url:result.uri});
  } else {
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
  }
}
async function exportPDF(rows, title, estimate=false) {
  if(!rows.length) {toast('No records to export with these filters.');return;}
  try {
    await loadScript('assets/lib/jspdf.umd.min.js');
    await loadScript('assets/lib/jspdf.plugin.autotable.min.js');
    const doc=new window.jspdf.jsPDF();
    doc.setFillColor(20,45,43);doc.rect(0,0,210,40,'F');doc.setTextColor(230,241,221);doc.setFontSize(22);doc.text('drivelegal',15,18);doc.setFontSize(11);doc.text(title,15,29);doc.setTextColor(55,70,58);doc.setFontSize(9);
    const intro='Existing project dataset. Historical effective dates. Current law has not been independently verified. Amounts in INR. Compounding fees are separate and are not added automatically.';
    doc.text(doc.splitTextToSize(intro,180),15,50);
    doc.autoTable({startY:67,head:[['Jurisdiction / vehicle','Violation / section',estimate?'Selected amount (INR)':'First / repeat (INR)','Consequences & date']],body:rows.map(r=>[`${r.jurisdiction_name}\n${r.vehicle_class || 'Any vehicle'}`,`${r.violation_name}\nSection ${r.section_reference}`,estimate?`${r.fine_amount ?? 'Not specified'}\n${r.repeat?'Repeat':'First'} offence`:`${r.first_offence_fine ?? 'Not specified'} / ${r.subsequent_offence_fine ?? 'Not specified'}`,`${r.imprisonment_text || 'Imprisonment: not specified'}\n${r.license_action || 'Licence: not specified'}\nCompounding: ${r.compounding_fee ?? 'Not specified'}\nEffective: ${r.effective_date || 'Not recorded'}`]),styles:{fontSize:8,cellPadding:4},headStyles:{fillColor:[45,105,87]},margin:{left:15,right:15}});
    doc.autoTable({startY:doc.lastAutoTable.finalY+10,head:[['Recorded sources']],body:[...new Set(rows.map(r=>`${r.source || 'Source not recorded'} | ${r.source_url || 'URL not recorded'}`))].map(source=>[source]),styles:{fontSize:8,cellPadding:4},headStyles:{fillColor:[45,105,87]},margin:{left:15,right:15}});
    for(let page=1;page<=doc.getNumberOfPages();page++){doc.setPage(page);doc.setFontSize(8);doc.setTextColor(110);doc.text(`DriveLegal | Informational dataset export | ${page}/${doc.getNumberOfPages()}`,15,289);}
    await saveFile(doc.output('blob'),estimate?'DriveLegal-Fine-Estimate.pdf':'DriveLegal-Law-Library.pdf');
    toast('Your PDF is ready.');
  } catch(error) {toast(`Export could not finish: ${error.message}`);}
}
function exportCoverage() {
  const cell=value=>`"${String(value).replaceAll('"','""')}"`;
  const rows=[['Jurisdiction','Violation types','Fine schedules','Effective date','Source URL'],...state.data.jurisdictions.map(j=>{const laws=state.data.laws.filter(r=>r.jurisdiction_id===j.id);return[j.name,new Set(laws.map(r=>r.violation_id)).size,laws.length,j.effective_date,j.source_url];})];
  saveFile(new Blob(['\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),'DriveLegal-Coverage.csv','text/csv').catch(e=>toast(e.message));
}
let roadController;
function roadTools() {
  showDialog(`<h2 id="dialog-title">A little context for the road.</h2><p>Use your device location to request weather from Open-Meteo and nearby mapped cameras from OpenStreetMap. Your coordinates are sent to those services only after you choose to continue.</p><div class="result-actions"><button class="button primary" data-action="locate">${icon('pin')}Use my location</button></div><div id="road-context" class="location-result" aria-live="polite"></div><p class="dialog-note">Mapped cameras may be incomplete. This feature does not determine a legal speed limit or road safety. Always follow posted signs.</p>`);
}
async function locate() {
  if(!navigator.geolocation) {toast('Location is not available on this device.');return;}
  const target=$('#road-context');
  if(!target)return;
  roadController?.abort();
  roadController=new AbortController();
  const controller=roadController;
  target.innerHTML='<p>Waiting for your device location…</p>';
  navigator.geolocation.getCurrentPosition(async position=>{
    if(controller.signal.aborted || !target.isConnected)return;
    const {latitude:lat,longitude:lon,accuracy,speed}=position.coords;
    target.innerHTML=`${notice(`Device location · accuracy about ${Math.round(accuracy)} m. ${speed==null?'Speed unavailable.':`Device-reported speed: ${Math.round(speed*3.6)} km/h.`}`)}${external(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`,'Open location on map')}<p id="road-weather">Loading weather…</p><p id="road-cameras">Looking for mapped cameras…</p>`;
    const timeout=setTimeout(()=>controller.abort(),16000);
    const weather=fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`,{signal:controller.signal}).then(r=>{if(!r.ok)throw new Error();return r.json();}).then(data=>{
      const code=data.current?.weather_code;
      const description=code===0?'Clear':code<=3?'Cloudy':code<=48?'Fog or haze':code<=67?'Rain or drizzle':code<=77?'Snow':code<=86?'Showers':'Thunderstorms';
      if(target.isConnected && $('#road-weather'))$('#road-weather').textContent=`Weather: ${data.current.temperature_2m}°C · ${description}. Open-Meteo observation: ${data.current.time.replace('T',' ')} (${data.timezone || 'GMT'}).`;
    }).catch(()=>{if(target.isConnected && $('#road-weather'))$('#road-weather').textContent='Weather unavailable. Reconnect and try again.';});
    const cameras=request(`/api/locations/speed-cameras?lat=${lat}&lon=${lon}&radius=3000`,{signal:controller.signal}).then(data=>{
      if(!target.isConnected || !$('#road-cameras'))return;
      if(data.error)throw new Error();
      const rows=data.cameras || [];
      $('#road-cameras').textContent=rows.length?`${rows.length} mapped camera(s) within 3 km. Nearest: ${rows[0].distance} m. OpenStreetMap coverage may be incomplete.`:'No cameras returned by the map within 3 km. This does not mean the road is camera-free.';
    }).catch(()=>{if(target.isConnected && $('#road-cameras'))$('#road-cameras').textContent='Camera lookup unavailable. No inference about cameras can be made.';});
    await Promise.allSettled([weather,cameras]);
    clearTimeout(timeout);
  },error=>{if(target.isConnected)target.textContent=error.code===1?'Location permission was declined. You can still browse laws and calculate estimates.':'Your location could not be determined. Try again outdoors or check device settings.';},{enableHighAccuracy:true,timeout:15000,maximumAge:0});
}
let accountAuth;
async function account() {
  if(state.user) {
    showDialog(`<h2 id="dialog-title">Your account</h2><p>Signed in as ${escape(state.user.email || state.user.displayName)}.</p><p class="auth-note">Bookmarks are saved on this device. They are not synced to your account.</p><div class="result-actions"><button class="button" data-action="signout">Sign out</button></div>`);return;
  }
  showDialog(`<h2 id="dialog-title">Welcome to DriveLegal.</h2><p>Your road essentials are available as a guest. Sign in with your existing DriveLegal account if you prefer.</p><form id="account-form" class="auth-panel"><div class="field"><label for="account-email">Email</label><input id="account-email" type="email" autocomplete="email" required></div><div class="field"><label for="account-password">Password</label><input id="account-password" type="password" autocomplete="current-password" minlength="6" required></div><div id="account-error" class="form-error" role="alert" hidden></div><div class="auth-tabs"><button class="button primary" type="submit">Sign in</button><button class="button" type="button" data-action="signup">Create account</button></div><button class="button" style="width:100%" type="button" data-action="google">Continue with Google</button><button class="text-button" style="margin-top:15px" type="button" data-action="reset-password">Reset password</button></form><p class="auth-note">Authentication uses the original Firebase project and requires internet access. Bookmarks stay on this device.</p>`);
}
async function getAuth() {
  if(accountAuth)return accountAuth;
  if(!navigator.onLine)throw new Error('Sign-in requires internet access. All law tools work as a guest.');
  await loadScript('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
  await loadScript('https://www.gstatic.com/firebasejs/10.9.0/firebase-auth-compat.js');
  if(!window.firebase.apps.length)window.firebase.initializeApp({apiKey:'AIzaSyAezVKmrmQ7ozOozgYQ4QpLOTfUzSRnsGc',authDomain:'drivelegal-30073.firebaseapp.com',projectId:'drivelegal-30073',appId:'1:796401271068:web:6ea83a63bae85b0839bad9'});
  accountAuth=window.firebase.auth();
  accountAuth.onAuthStateChanged(user=>{
    state.user=user;
    $('#profile-name').textContent=user?.displayName || user?.email?.split('@')[0] || 'Guest explorer';
    $('#profile-avatar').textContent=(user?.displayName || user?.email || 'G').slice(0,2).toUpperCase();
    $('#profile-status').textContent=user?'Signed in':'No account needed';
  });
  return accountAuth;
}
async function authenticate(kind) {
  const form=$('#account-form');
  if(!form || ((kind!=='google') && !form.reportValidity()))return;
  const error=$('#account-error');error.hidden=true;
  form.querySelectorAll('button').forEach(button=>button.disabled=true);
  try {
    const auth=await getAuth();
    const email=$('#account-email').value.trim(),password=$('#account-password').value;
    if(kind==='google') {
      if(window.Capacitor?.isNativePlatform?.()) {
        await loadScript('mobile-auth.js?v=1');
        const result=await window.NativeFirebaseAuthentication.signInWithGoogle({useCredentialManager:false,clientId:'796401271068-0h4jd2lhdrmnoshhedldhs7mvse43tb2.apps.googleusercontent.com'});
        await auth.signInWithCredential(window.firebase.auth.GoogleAuthProvider.credential(result.credential?.idToken));
      } else await auth.signInWithPopup(new window.firebase.auth.GoogleAuthProvider());
    } else if(kind==='signup')await auth.createUserWithEmailAndPassword(email,password);
    else await auth.signInWithEmailAndPassword(email,password);
    $('#detail-dialog').close();toast('You’re signed in.');
  } catch(e) {if(error.isConnected){error.textContent=e.message;error.hidden=false;}}
  finally {if(form.isConnected)form.querySelectorAll('button').forEach(button=>button.disabled=false);}
}
async function resetPassword() {
  const email=$('#account-email');
  if(!email?.reportValidity())return;
  try {const auth=await getAuth();await auth.sendPasswordResetEmail(email.value.trim());toast('Password reset requested. Check your email.');}catch(e){$('#account-error').textContent=e.message;$('#account-error').hidden=false;}
}

document.addEventListener('submit',event=>{
  if(event.target.id==='global-search') {event.preventDefault();state.query=$('#global-query').value.trim();state.page=1;if(state.route==='laws')render();else location.hash='laws';}
  if(event.target.id==='calculator-form') {
    event.preventDefault();
    state.calc.repeat=$('#calc-repeat').checked;
    state.result=calculateFine(state.data.laws,{jurisdiction:state.region,violation:state.calc.violation,vehicle:state.calc.vehicle==='any'?null:state.calc.vehicle,repeat:state.calc.repeat});
    $('#calc-error').hidden=Boolean(state.result);
    if(!state.result)$('#calc-error').textContent='No exact schedule is available for this combination. Choose a listed vehicle class.';
    renderResult();
    if(state.result && matchMedia('(max-width:700px)').matches)$('#calculator-result').scrollIntoView({behavior:'smooth',block:'start'});
  }
  if(event.target.id==='chat-form') {event.preventDefault();sendQuestion($('#chat-input').value);}
  if(event.target.id==='account-form') {event.preventDefault();authenticate('signin');}
});
document.addEventListener('input',event=>{
  if(event.target.id==='law-search'){state.query=event.target.value;state.page=1;renderLawResults();}
});
document.addEventListener('change',event=>{
  const {id,value}=event.target;
  if(id==='global-region'){setRegion(value);render();}
  if(id==='law-category'){state.category=value;state.page=1;renderLawResults();}
  if(id==='law-page-size'){state.pageSize=Number(value);state.page=1;renderLawResults();}
  if(id==='calc-region'){setRegion(value);populateCalculator();renderResult();$('#calc-error').hidden=true;}
  if(id==='calc-violation'){state.calc.violation=value;state.calc.vehicle='';state.result=null;populateVehicles();renderResult();}
  if(id==='calc-vehicle'){state.calc.vehicle=value;state.result=null;renderResult();}
  if(id==='calc-repeat'){state.calc.repeat=event.target.checked;state.result=null;renderResult();}
});
document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-action]');
  if(!button || button.disabled)return;
  const action=button.dataset.action,key=button.dataset.key;
  if(action==='theme')theme(document.documentElement.dataset.theme==='dark'?'light':'dark');
  if(action==='close-dialog')$('#detail-dialog').close();
  if(action==='detail')showLaw(lookup(key));
  if(action==='bookmark')toggleBookmark(key);
  if(action==='prev' || action==='next'){state.page+=action==='next'?1:-1;renderLawResults();$('#law-results').scrollIntoView({block:'start',behavior:'smooth'});}
  if(action==='sync')sync(true);
  if(action==='export-laws')exportPDF(['laws','saved'].includes(state.route)?currentLaws():filterLaws(state.data.laws,{jurisdiction:state.region}),'Traffic law library');
  if(action==='export-result' && state.result)exportPDF([state.result],'Fine estimate',true);
  if(action==='export-coverage')exportCoverage();
  if(action==='region-laws'){setRegion(button.dataset.id);state.query='';state.category='';location.hash='laws';}
  if(action==='estimate-law'){
    const row=lookup(key);if(!row)return;setRegion(row.jurisdiction_id);state.calc.violation=String(row.violation_id);state.calc.vehicle=row.vehicle_class_id==null?'any':String(row.vehicle_class_id);$('#detail-dialog').close();if(state.route==='calculator')render();else location.hash='calculator';
  }
  if(action==='new-chat'){chatGeneration++;state.messages=[];state.sending=false;renderMessages();}
  if(action==='suggest')sendQuestion(button.dataset.question);
  if(action==='road-tools')roadTools();
  if(action==='locate')locate();
  if(action==='account')account();
  if(action==='signup' || action==='google')authenticate(action);
  if(action==='signout'){try{await accountAuth?.signOut();$('#detail-dialog').close();toast('Signed out. Your guest tools are ready.');}catch(e){toast(e.message);}}
  if(action==='reset-password')resetPassword();
  if(action==='retry')location.reload();
});
$('#detail-dialog').addEventListener('click',event=>{if(event.target===$('#detail-dialog')){const rect=event.target.getBoundingClientRect();if(event.clientX<rect.left || event.clientX>rect.right || event.clientY<rect.top || event.clientY>rect.bottom)event.target.close();}});
$('#detail-dialog').addEventListener('close',()=>roadController?.abort());
document.addEventListener('keydown',event=>{
  if((event.ctrlKey || event.metaKey) && event.key.toLowerCase()==='k'){event.preventDefault();if(matchMedia('(max-width:700px)').matches){location.hash='laws';setTimeout(()=>$('#law-search')?.focus(),50);}else $('#global-query').focus();}
  if(event.target.id==='chat-input' && event.key==='Enter' && !event.shiftKey && !event.isComposing){event.preventDefault();sendQuestion(event.target.value);}
});
window.addEventListener('hashchange',navigate);
function connection(){ $('#connection-banner').hidden=navigator.onLine;if(state.data && state.route==='overview')render(); }
window.addEventListener('offline',connection);
window.addEventListener('online',()=>{connection();sync();});
theme(preference.get('theme','light'));
async function boot(){
  try {
    state.data=await loadSnapshot();
    if(!state.data.jurisdictions.some(j=>String(j.id)===state.region))state.region=String(state.data.jurisdictions.find(j=>j.type==='national')?.id || '');
    $('#global-region').innerHTML='<option value="">All jurisdictions</option>'+options(state.data.jurisdictions,state.region);
    connection();navigate();sync();
    if('serviceWorker' in navigator)navigator.serviceWorker.register('service-worker.js').catch(()=>toast('Offline app installation is unavailable in this browser.'));
  } catch(error){$('#main').innerHTML=empty('The library could not load.',escape(error.message),'<button class="button" data-action="retry">Try again</button>');}
}
boot();
