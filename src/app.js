// name=src/app.js
// Minimalna aplikacja zapisująca data/data.json w repo przez GitHub API
const OWNER = 'kamilbburczynski1-beep';
const REPO = 'daily-planner';
const DATA_PATH = 'data/data.json';
let GITHUB_TOKEN = null; // trzymamy w pamięci tylko
let appData = null;

const el = id => document.getElementById(id);
const status = txt => { el('status').textContent = txt; };

function utf8_to_b64(str){return btoa(unescape(encodeURIComponent(str)));}
function b64_to_utf8(b64){return decodeURIComponent(escape(atob(b64)));}

async function apiGetFile(path){
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path)}`;
  const headers = { Accept: 'application/vnd.github+json' };
  if(GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  const r = await fetch(url, { headers });
  if(r.status === 404) return null;
  if(!r.ok) throw new Error(`GET ${r.status}`);
  const j = await r.json();
  if(j.content) return { sha: j.sha, content: JSON.parse(b64_to_utf8(j.content)) };
  return null;
}

async function apiPutFile(path, data, message, sha){
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path)}`;
  const body = { message, content: utf8_to_b64(JSON.stringify(data, null, 2)) };
  if(sha) body.sha = sha;
  const headers = { Accept: 'application/vnd.github+json', 'Content-Type':'application/json' };
  if(GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  const r = await fetch(url, { method:'PUT', headers, body: JSON.stringify(body) });
  if(!r.ok) throw new Error(`PUT ${r.status} ${await r.text()}`);
  return await r.json();
}

function nowISO(){ return new Date().toISOString(); }

async function loadDataFromRepo(){
  try{
    status('Wczytywanie danych z repo...');
    const f = await apiGetFile(DATA_PATH);
    if(!f){
      appData = { meta:{createdAt:nowISO(), appVersion:'0.1'}, days:{}, finance:{accounts:{}}, books:{}};
      status('Brak data.json — utworzono szablon (zapisz aby go w repo).');
      return {sha:null, data:appData};
    }
    appData = f.content;
    status('Dane wczytane.');
    return {sha:f.sha, data:appData};
  }catch(e){ status('Błąd podczas wczytywania: '+e.message); throw e; }
}

function renderDay(date){
  el('tasks').innerHTML = '';
  el('reading').innerHTML = '';
  el('workouts').innerHTML = '';
  el('raw').textContent = '';
  if(!appData) return;
  const day = appData.days[date] || {};
  const tasks = day.tasks || [];
  tasks.forEach(t=>{
    const li = document.createElement('li');
    const cb = document.createElement('input'); cb.type='checkbox'; cb.checked = !!t.done;
    cb.onchange = ()=>{ t.done = cb.checked; };
    li.appendChild(cb);
    const span = document.createElement('span'); span.textContent = ' ' + t.text;
    li.appendChild(span);
    el('tasks').appendChild(li);
  });
  el('steps').value = day.steps || 0;

  (day.reading||[]).forEach(r=>{
    const li = document.createElement('li'); li.textContent = `${r.book} — ${r.pages} stron`;
    el('reading').appendChild(li);
  });
  (day.workouts||[]).forEach(w=>{
    const li = document.createElement('li'); li.textContent = `${w.type} — ${w.notes||''}`;
    el('workouts').appendChild(li);
  });
  const m = day.measurements||{};
  el('weight').value = m.weight_kg || '';
  el('fat').value = m.fat_pct || '';
  el('muscle').value = m.muscle_kg || '';
  el('protein').value = m.protein_g || '';
  el('calories').value = m.calories || '';
  const acc = appData.finance && appData.finance.accounts ? appData.finance.accounts : {};
  el('konto').value = acc.konto || '';
  el('oszcz').value = acc.oszczednosci || '';
  el('akcje').value = acc.akcje || '';
  el('notes').value = day.notes || '';

  el('raw').textContent = JSON.stringify(day, null, 2);
}

async function saveDataToRepo(message){
  try{
    status('Wczytywanie aktualnego pliku...');
    const existing = await apiGetFile(DATA_PATH);
    const sha = existing ? existing.sha : null;
    status('Zapisuję do repo...');
    const res = await apiPutFile(DATA_PATH, appData, message, sha);
    status('Zapisane: ' + res.commit.sha);
    return res;
  }catch(e){ status('Błąd zapisu: '+e.message); throw e; }
}

async function loadAndRender(){
  await loadDataFromRepo();
  const date = el('date').value || new Date().toISOString().slice(0,10);
  renderDay(date);
}

function ensureDay(date){ if(!appData.days) appData.days = {}; if(!appData.days[date]) appData.days[date] = {}; return appData.days[date]; }

// UI handlers
el('btnSetToken').onclick = ()=>{
  const t = el('pat').value.trim(); if(!t){ alert('Wklej token'); return; }
  GITHUB_TOKEN = t; el('pat').value = '';
  status('Token ustawiony w sesji. Możesz wczytać/zapisać dane.');
};
el('btnLogout').onclick = ()=>{ GITHUB_TOKEN = null; status('Wylogowano. Token usunięty z pamięci.'); };

el('btnLoad').onclick = async ()=>{ try{ await loadAndRender(); }catch(e){ console.error(e); } };

el('btnAddTask').onclick = ()=>{
  const text = el('taskText').value.trim(); if(!text) return;
  const date = el('date').value || new Date().toISOString().slice(0,10);
  const day = ensureDay(date);
  day.tasks = day.tasks || [];
  day.tasks.push({ id: 't'+Date.now(), text, done:false });
  el('taskText').value = '';
  renderDay(date);
};

el('btnAddReading').onclick = ()=>{
  const book = el('bookTitle').value.trim(); const pages = Number(el('bookPages').value)||0; if(!book||pages<=0) return;
  const date = el('date').value || new Date().toISOString().slice(0,10);
  const day = ensureDay(date); day.reading = day.reading||[]; day.reading.push({ book, pages });
  // aggregate per book
  appData.books = appData.books || {};
  appData.books[book] = appData.books[book] || { totalPages:null, readByDate:{} };
  appData.books[book].readByDate[date] = (appData.books[book].readByDate[date]||0) + pages;
  el('bookTitle').value=''; el('bookPages').value=''; renderDay(date);
};

el('btnAddWorkout').onclick = ()=>{
  const type = el('workoutType').value; const notes = el('workoutNotes').value.trim();
  const date = el('date').value || new Date().toISOString().slice(0,10);
  const day = ensureDay(date); day.workouts = day.workouts||[]; day.workouts.push({ type, notes });
  el('workoutNotes').value = ''; renderDay(date);
};

el('btnSave').onclick = async ()=>{
  try{
    if(!GITHUB_TOKEN){ if(!confirm('Brak tokena. Chcesz kontynuować bez zapisu do repo?')) return; }
    const date = el('date').value || new Date().toISOString().slice(0,10);
    const day = ensureDay(date);
    day.steps = Number(el('steps').value)||0;
    day.measurements = {
      weight_kg: el('weight').value ? Number(el('weight').value) : undefined,
      fat_pct: el('fat').value ? Number(el('fat').value) : undefined,
      muscle_kg: el('muscle').value ? Number(el('muscle').value) : undefined,
      protein_g: el('protein').value ? Number(el('protein').value) : undefined,
      calories: el('calories').value ? Number(el('calories').value) : undefined,
    };
    appData.finance = appData.finance || {}; appData.finance.accounts = appData.finance.accounts || {};
    appData.finance.accounts.konto = el('konto').value ? Number(el('konto').value) : appData.finance.accounts.konto;
    appData.finance.accounts.oszczednosci = el('oszcz').value ? Number(el('oszcz').value) : appData.finance.accounts.oszczednosci;
    appData.finance.accounts.akcje = el('akcje').value ? Number(el('akcje').value) : appData.finance.accounts.akcje;
    day.notes = el('notes').value || '';
    const message = `Update data for ${date}`;
    await saveDataToRepo(message);
    renderDay(date);
  }catch(e){ console.error(e); alert('Błąd: '+e.message); }
};

// init
(function(){
  el('date').value = new Date().toISOString().slice(0,10);
  status('Gotowe. Wprowadź token i wczytaj dane.');
  // try to load without token (public read)
  loadDataFromRepo().then(()=>{ renderDay(el('date').value); }).catch(()=>{});
})();
