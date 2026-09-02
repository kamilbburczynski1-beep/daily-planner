// name=src/app.js
// Expanded app logic: calendar, tasks, steps, finance, books, stats
const OWNER = 'kamilbburczynski1-beep';
const REPO = 'daily-planner';
const DATA_DAYS_PREFIX = 'data/days/';
const DATA_FINANCE = 'data/finance/entries.json';
const DATA_BOOKS = 'data/books.json';
const ACCOUNTS_FILE = 'data/finance/accounts.json';
let GITHUB_TOKEN = null;

const el = id => document.getElementById(id);
const status = txt => { el('status').textContent = txt; };

function b64enc(s){return btoa(unescape(encodeURIComponent(s)));}
function b64dec(b){return decodeURIComponent(escape(atob(b)));}

async function apiGet(path){
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path)}`;
  const headers = { Accept: 'application/vnd.github+json' };
  if(GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  const r = await fetch(url,{headers});
  if(r.status===404) return null;
  if(!r.ok) throw new Error(`GET ${r.status}`);
  const j = await r.json();
  if(j.content) return {sha:j.sha,content: JSON.parse(b64dec(j.content))};
  return null;
}

async function apiPut(path,data,message,sha){
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path)}`;
  const body = { message, content: b64enc(JSON.stringify(data,null,2)) };
  if(sha) body.sha = sha;
  const headers = { Accept:'application/vnd.github+json','Content-Type':'application/json' };
  if(GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  const r = await fetch(url,{method:'PUT',headers,body:JSON.stringify(body)});
  if(!r.ok) throw new Error(`PUT ${r.status} ${await r.text()}`);
  return await r.json();
}

// DAYS
async function loadDay(date){
  const path = DATA_DAYS_PREFIX + date + '.json';
  const f = await apiGet(path);
  if(!f) return {exists:false,data:{date,tasks:[],steps:0,reading:[],workouts:[],measurements:{}}};
  return {exists:true,sha:f.sha,data:f.content};
}
async function saveDay(date,data){
  const path = DATA_DAYS_PREFIX + date + '.json';
  const existing = await apiGet(path);
  const sha = existing ? existing.sha : null;
  return await apiPut(path,data,`Save day ${date}`,sha);
}

// FINANCE
async function loadFinance(){
  const f = await apiGet(DATA_FINANCE);
  if(!f) return {sha:null, data:[]};
  return {sha:f.sha, data:f.content};
}
async function saveFinance(entries){
  const existing = await apiGet(DATA_FINANCE);
  const sha = existing ? existing.sha : null;
  return await apiPut(DATA_FINANCE,entries,'Update finance entries',sha);
}
async function loadAccounts(){
  const f = await apiGet(ACCOUNTS_FILE);
  if(!f) return {sha:null, data:{konto:0,oszczednosci:0,akcje:0}};
  return {sha:f.sha, data:f.content};
}
async function saveAccounts(acc){
  const existing = await apiGet(ACCOUNTS_FILE);
  const sha = existing ? existing.sha : null;
  return await apiPut(ACCOUNTS_FILE,acc,'Update accounts',sha);
}

// BOOKS
async function loadBooks(){ const f = await apiGet(DATA_BOOKS); if(!f) return {sha:null,data:{}}; return {sha:f.sha,data:f.content}; }
async function saveBooks(obj){ const existing = await apiGet(DATA_BOOKS); const sha = existing?existing.sha:null; return await apiPut(DATA_BOOKS,obj,'Update books',sha); }

// UI helpers
function formatDate(d){ return d.toISOString().slice(0,10); }
function parseISO(s){ return new Date(s+'T00:00:00'); }

// Calendar
let calYear, calMonth; // 0-indexed month
function renderCalendar(y,m){
  calYear=y; calMonth=m;
  const title = new Date(y,m,1).toLocaleString('pl-PL',{month:'long',year:'numeric'});
  el('calTitle').textContent = title;
  const start = new Date(y,m,1); const startDay = start.getDay(); // 0 Sun..6 Sat
  // shift so Monday first -> convert
  const firstOffset = (startDay + 6) % 7; // Monday=0
  const daysInMonth = new Date(y,m+1,0).getDate();
  const grid = el('calendar'); grid.innerHTML='';
  // headings
  const weekdays=['Pon','Wto','Śro','Czw','Pią','Sob','Nie'];
  weekdays.forEach(w=>{ const h=document.createElement('div'); h.className='text-center fw-semibold'; h.textContent=w; grid.appendChild(h); });
  // empty slots
  for(let i=0;i<firstOffset;i++){ const e=document.createElement('div'); grid.appendChild(e); }
  for(let d=1;d<=daysInMonth;d++){
    const cell=document.createElement('div'); cell.className='cal-day';
    const daynum=document.createElement('div'); daynum.className='daynum'; daynum.textContent=d; cell.appendChild(daynum);
    const meta=document.createElement('div'); meta.className='meta'; meta.textContent='...'; cell.appendChild(meta);
    cell.onclick = ()=>{ openDay(formatDate(new Date(y,m,d))); };
    grid.appendChild(cell);
    // load day summary asynchronously
    (async function(sd,md){
      const dateStr=formatDate(new Date(y,m,sd));
      try{ const res = await loadDay(dateStr); const dd=res.data; let tcount=(dd.tasks||[]).filter(t=>!t.done).length; md.textContent = (tcount? tcount+' zadań':'' ) + (dd.steps?(' • '+dd.steps+' kroków'):''); }catch(e){ md.textContent=''; }
    })(d,meta);
  }
}

async function openDay(date){
  const res = await loadDay(date);
  const day = res.data;
  el('dayPanel').style.display='block';
  el('dayPanelTitle').textContent = new Date(date).toLocaleDateString('pl-PL',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  const container = el('dayContent'); container.innerHTML='';
  // tasks
  const taskCard = document.createElement('div'); taskCard.className='mb-2';
  const tasks = day.tasks||[];
  const ul = document.createElement('ul'); ul.className='list-group';
  tasks.forEach(t=>{ const li=document.createElement('li'); li.className='list-group-item d-flex justify-content-between align-items-center'; li.innerHTML = `<div><input type="checkbox" ${t.done?'checked':''}> <span class="ms-2">${t.text}</span></div><div><button class="btn btn-sm btn-outline-danger">Usuń</button></div>`; ul.appendChild(li); });
  taskCard.appendChild(ul); container.appendChild(taskCard);
  // quick edit: add task
  const addDiv=document.createElement('div'); addDiv.className='input-group mb-2'; addDiv.innerHTML = `<input class="form-control" id="newTaskText" placeholder="Nowe zadanie"><button class="btn btn-primary" id="saveNewTask">Dodaj</button>`; container.appendChild(addDiv);
  el('saveNewTask')?.addEventListener('click',async()=>{});
  // steps
  const stepsInput = document.createElement('div'); stepsInput.className='mb-2'; stepsInput.innerHTML = `<label class="form-label">Kroki</label><div class="input-group"><input id="daySteps" type="number" class="form-control" value="${day.steps||0}"><button class="btn btn-success" id="saveDayBtn">Zapisz dzień</button></div>`; container.appendChild(stepsInput);
  // reading etc simple display
  const reading = document.createElement('div'); reading.innerHTML = `<h6>Czytanie</h6><ul class="list-group mb-2">${(day.reading||[]).map(r=>`<li class="list-group-item">${r.book} — ${r.pages} stron</li>`).join('')}</ul>`; container.appendChild(reading);

  // handlers
  document.getElementById('saveDayBtn').onclick = async ()=>{
    day.steps = Number(document.getElementById('daySteps').value)||0;
    // also add new task if present
    const nt = document.getElementById('newTaskText').value.trim(); if(nt){ day.tasks = day.tasks||[]; day.tasks.push({id:'t'+Date.now(),text:nt,done:false}); }
    try{ await saveDay(date,day); status('Dzień zapisany'); renderCalendar(calYear,calMonth); openDay(date); }catch(e){ alert('Błąd zapisu: '+e.message); }
  };
}

// Tasks tab
async function refreshTasks(){
  // load tasks by scanning days? we'll load all days by listing a few months — but we will rely on finance entries file for explicit lists
  // simple approach: read index of days not implemented => we will show today's tasks and allow date filter
  const dt = el('taskDate').value || new Date().toISOString().slice(0,10);
  const res = await loadDay(dt);
  const tasks = res.data.tasks||[];
  const list = el('taskList'); list.innerHTML='';
  tasks.forEach(t=>{
    const li = document.createElement('li'); li.className='list-group-item d-flex justify-content-between align-items-center';
    li.innerHTML = `<div><input type="checkbox" ${t.done?'checked':''}> <span class="ms-2">${t.text}</span></div><div><button class="btn btn-sm btn-danger">Usuń</button></div>`;
    list.appendChild(li);
  });
}

// Steps
async function saveSteps(){ const d = el('stepsDate').value || new Date().toISOString().slice(0,10); const v = Number(el('stepsInput').value)||0; const res = await loadDay(d); res.data.steps = v; await saveDay(d,res.data); status('Kroki zapisane'); }

// Finance UI
async function refreshFinance(){
  const f = await loadFinance();
  const tbody = el('finTable').querySelector('tbody'); tbody.innerHTML='';
  const months = new Set();
  f.data.sort((a,b)=>a.date.localeCompare(b.date)).forEach(e=>{
    const tr = document.createElement('tr'); tr.innerHTML = `<td>${e.date}</td><td>${e.type}</td><td>${e.category||''}</td><td>${e.amount}</td><td>${e.note||''}</td><td>${e.paid?'<span class="badge bg-success">Tak</span>':'<span class="badge bg-secondary">Nie</span>'}</td>`; tbody.appendChild(tr);
    months.add(e.date.slice(0,7));
  });
  const sel = el('finFilterMonth'); sel.innerHTML=''; Array.from(months).forEach(m=>{ const o=document.createElement('option'); o.value=m; o.textContent=m; sel.appendChild(o); });
}

async function addFinance(){ const type = el('finType').value; const date = el('finDate').value || new Date().toISOString().slice(0,10); const amount = Number(el('finAmount').value)||0; const category = el('finCategory').value; const note = el('finNote').value; const f = await loadFinance(); const entries = f.data; entries.push({id:'f'+Date.now(),type, date, amount, category, note, paid:false}); await saveFinance(entries); status('Dodano transakcję'); refreshFinance(); }

async function markSelectedPaid(){ // for simplicity mark last entry as paid
  const f = await loadFinance(); if(!f.data.length){ alert('Brak wpisów'); return; } f.data[f.data.length-1].paid = true; await saveFinance(f.data); refreshFinance(); }

// Accounts
async function loadAndShowAccounts(){ const a = await loadAccounts(); el('accKonto').value = a.data.konto||''; el('accOszcz').value = a.data.oszczednosci||''; el('accAkcje').value = a.data.akcje||''; }
async function saveAccountsUI(){ const a={konto: Number(el('accKonto').value)||0, oszczednosci: Number(el('accOszcz').value)||0, akcje: Number(el('accAkcje').value)||0}; await saveAccounts(a); status('Konta zapisane'); }

// Books
async function refreshBooks(){ const b = await loadBooks(); const ul = el('booksList'); ul.innerHTML=''; Object.keys(b.data||{}).forEach(title=>{ const li=document.createElement('li'); li.className='list-group-item d-flex justify-content-between align-items-center'; li.innerHTML = `<div><strong>${title}</strong><div class="small text-muted">Suma stron: ${b.data[title].totalPages||'-'}</div></div><div><button class="btn btn-sm btn-outline-primary" data-title="${title}">Szczegóły</button></div>`; ul.appendChild(li); }); }
async function addBookRead(){ const date = el('bookDate').value || new Date().toISOString().slice(0,10); const title = el('bookTitleIn').value.trim(); const pages = Number(el('bookPagesIn').value)||0; if(!title||pages<=0){ alert('Wprowadź tytuł i liczbę stron'); return; } const b = await loadBooks(); b.data[title] = b.data[title]||{totalPages:null,readByDate:{}}; b.data[title].readByDate[date] = (b.data[title].readByDate[date]||0)+pages; await saveBooks(b.data); status('Dodano wpis czytania'); refreshBooks(); }

// Stats
async function drawStats(){ const fin = await loadFinance(); const acc = await loadAccounts(); // simple chart: balance over months
  const entries = fin.data || [];
  const monthsMap = {};
  entries.forEach(e=>{ const m = e.date.slice(0,7); monthsMap[m] = monthsMap[m]||0; monthsMap[m] += (e.type==='income'? e.amount : -e.amount); });
  const months = Object.keys(monthsMap).sort(); const values = months.map(m=>monthsMap[m]);
  // finance chart
  const ctx = document.getElementById('chartFinance'); if(ctx){ new Chart(ctx,{type:'bar',data:{labels:months, datasets:[{label:'Netto miesiąc',data:values, backgroundColor:'#0d6efd'}]}}); }
  // activity placeholder: load steps from days (scan recent 60 days) - naive
  const stepsLabels = []; const stepsData = [];
  for(let i=29;i>=0;i--){ const dt=new Date(); dt.setDate(dt.getDate()-i); const dstr = formatDate(dt); try{ const r = await loadDay(dstr); stepsLabels.push(dstr.slice(5)); stepsData.push(r.data.steps||0); }catch(e){ stepsLabels.push(dstr.slice(5)); stepsData.push(0);} }
  const ctx2 = document.getElementById('chartActivity'); if(ctx2){ new Chart(ctx2,{type:'line',data:{labels:stepsLabels,datasets:[{label:'Kroki',data:stepsData,borderColor:'#198754',tension:0.3}]}}); }
  // categories pie
  const catMap = {}; entries.forEach(e=>{ const c=e.category||'inne'; catMap[c]=(catMap[c]||0) + (e.type==='income'? e.amount : -e.amount); });
  const labels = Object.keys(catMap); const dataVals = labels.map(l=>Math.abs(catMap[l])); const ctx3 = document.getElementById('chartCategories'); if(ctx3){ new Chart(ctx3,{type:'pie',data:{labels, datasets:[{data:dataVals}]}}); }
}

// Import CSV
function parseCSV(text){ const lines = text.split('\n').map(l=>l.trim()).filter(l=>l); const rows = []; for(const line of lines){ const cols = line.split(',').map(c=>c.trim()); rows.push(cols); } return rows; }
async function importCSVFile(file){ const txt = await file.text(); const rows = parseCSV(txt); const entries = []; for(const r of rows){ // expect data,typ,kwota,kategoria,opis
    const date = r[0]||new Date().toISOString().slice(0,10); const type = r[1]||'expense'; const amount = Number(r[2])||0; const category = r[3]||''; const note = r[4]||''; entries.push({id:'f'+Date.now()+Math.random().toString(36).slice(2,6), date, type, amount, category, note, paid:false}); }
  const existing = await loadFinance(); const all = existing.data.concat(entries); await saveFinance(all); status('Import zakończony'); refreshFinance(); }

// Backup
async function backupAll(){ const daysIdx=[]; // we don't have index listing — we'll backup finance and books and a heuristic of recent 60 days
  const fin = await loadFinance(); const books = await loadBooks(); const days = {};
  for(let i=0;i<60;i++){ const dt=new Date(); dt.setDate(dt.getDate()-i); const dstr = formatDate(dt); try{ const r = await loadDay(dstr); days[dstr]=r.data; }catch(e){} }
  const blob = new Blob([JSON.stringify({finance:fin.data,books:books.data,days},null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='daily-planner-backup.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

// Init and bindings
(function init(){
  el('datePicker').value = new Date().toISOString().slice(0,10);
  // calendar initial
  const now = new Date(); renderCalendar(now.getFullYear(),now.getMonth());
  el('calPrev').onclick = ()=>{ const d=new Date(calYear,calMonth-1,1); renderCalendar(d.getFullYear(),d.getMonth()); };
  el('calNext').onclick = ()=>{ const d=new Date(calYear,calMonth+1,1); renderCalendar(d.getFullYear(),d.getMonth()); };
  el('openDayBtn').onclick = ()=>{ openDay(el('datePicker').value); };

  // tasks
  el('addTaskBtn').onclick = async ()=>{ const date = el('taskDate').value || new Date().toISOString().slice(0,10); const text = el('taskText').value.trim(); if(!text) return; const r = await loadDay(date); r.data.tasks = r.data.tasks||[]; r.data.tasks.push({id:'t'+Date.now(), text, done:false, important: el('taskImportant').checked}); await saveDay(date,r.data); el('taskText').value=''; status('Dodano zadanie'); refreshTasks(); };

  el('taskDate').value = new Date().toISOString().slice(0,10);
  el('filterDate').onchange = ()=>refreshTasks();

  // steps
  el('stepsDate').value = new Date().toISOString().slice(0,10);
  el('saveSteps').onclick = saveSteps;

  // finance
  el('addFin').onclick = addFinance; el('markPaid').onclick = markSelectedPaid; el('exportFin').onclick = async ()=>{ const f = await loadFinance(); const blob = new Blob([JSON.stringify(f.data,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='finance.json'; document.body.appendChild(a); a.click(); a.remove(); };
  el('saveAccounts').onclick = saveAccountsUI;

  // books
  el('addBookRead').onclick = addBookRead;

  // import/backup
  el('importBtn').onclick = async ()=>{ const file = el('importFile').files[0]; if(!file){ alert('Wybierz plik CSV'); return; } await importCSVFile(file); };
  el('backupBtn').onclick = backupAll;

  // settings token
  el('btnSetToken').onclick = ()=>{ const t = el('pat').value.trim(); if(!t){ alert('Wklej token'); return; } GITHUB_TOKEN = t; el('pat').value=''; status('Token ustawiony (sesja)'); loadAndRefreshAll(); };
  el('btnLogout').onclick = ()=>{ GITHUB_TOKEN = null; status('Wylogowano. Token usunięty z pamięci.'); };

  // initial loads (public read may work)
  loadAndRefreshAll();
})();

async function loadAndRefreshAll(){ try{ await refreshFinance(); await loadAndShowAccounts(); await refreshBooks(); await refreshTasks(); await drawStats(); status('Gotowe'); }catch(e){ status('Gotowe (częściowo). '+(e.message||e)); console.error(e);} }
