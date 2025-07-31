/* SAFE_ESCAPEHTML */
function escapeHTML(str){var s=(str==null?'':String(str));s=s.replace(/&/g,'&amp;');s=s.replace(/</g,'&lt;');s=s.replace(/>/g,'&gt;');s=s.replace(/"/g,'&quot;');s=s.replace(/'/g,'&#39;');return s;}

// ====== Utilidades ======
const DB_KEY = 'visitas_restaurantes_v1';
const fmtEUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const fmt2 = (n) => (Math.round(n * 100) / 100).toFixed(2);
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const byId = (id) => document.getElementById(id);
const todayISO = () => new Date().toISOString().slice(0, 10);
const yearOf = (iso) => new Date(iso + 'T12:00:00').getFullYear();
function norm(s){ return (s || '').toString().trim().replace(/\s+/g,' ').toLocaleLowerCase('es-ES'); }
function avg(arr){ return arr.length ? arr.reduce((a,b)=>a+b,0) / arr.length : 0; }
function uid(){ return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function escapeHTML(str){
  var s = (str == null ? '' : String(str));
  s = s.replace(/&/g,'&amp;');
  s = s.replace(/</g,'&lt;');
  s = s.replace(/>/g,'&gt;');
  s = s.replace(/"/g,'&quot;');
  s = s.replace(/'/g,'&#39;');
  return s;
};
    return map[s] || s;
  });
}[s])
  );
}

// ====== Fotos en IndexedDB ======
const PHOTOS_DB = 'rt-photos';
const PHOTOS_STORE = 'photos';
let dbPhotos = null;
function openPhotosDB(){
  return new Promise((resolve, reject)=>{
    if(dbPhotos){ resolve(dbPhotos); return; }
    const req = indexedDB.open(PHOTOS_DB, 1);
    req.onupgradeneeded = (e)=>{
      const db = e.target.result;
      if(!db.objectStoreNames.contains(PHOTOS_STORE)){
        db.createObjectStore(PHOTOS_STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = (e)=>{ dbPhotos = e.target.result; resolve(dbPhotos); };
    req.onerror = ()=> reject(req.error || new Error('No se pudo abrir IndexedDB'));
  });
}
async function photosPutBlob(key, blob){
  const db = await openPhotosDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(PHOTOS_STORE, 'readwrite');
    tx.objectStore(PHOTOS_STORE).put({ key, blob, type: blob.type || 'image/*', createdAt: Date.now() });
    tx.oncomplete = ()=> resolve(true);
    tx.onerror = ()=> reject(tx.error || new Error('No se pudo guardar foto'));
  });
}
async function photosGetBlob(key){
  const db = await openPhotosDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(PHOTOS_STORE, 'readonly');
    const req = tx.objectStore(PHOTOS_STORE).get(key);
    req.onsuccess = ()=> resolve(req.result.blob || null);
    req.onerror = ()=> reject(req.error || new Error('No se pudo leer foto'));
  });
}
async function photosDelete(key){
  const db = await openPhotosDB();
  return new Promise((resolve, reject)=>{
    const tx = db.transaction(PHOTOS_STORE, 'readwrite');
    tx.objectStore(PHOTOS_STORE).delete(key);
    tx.oncomplete = ()=> resolve(true);
    tx.onerror = ()=> reject(tx.error || new Error('No se pudo borrar foto'));
  });
}

// Fotos en formulario (staging antes de guardar)
let stagedPhotoKeys = []; // claves de fotos añadidas en el formulario
async function handlePhotosInput(files){
  if(!files || !files.length) return;
  for(const file of files){
    const key = 'p_' + uid();
    await photosPutBlob(key, file);
    stagedPhotoKeys.push(key);
  }
  renderPhotosPreview();
}
async function renderPhotosPreview(){
  const wrap = byId('photosPreview');
  if(!wrap) return;
  wrap.innerHTML = '';
  for(const key of stagedPhotoKeys){
    const blob = await photosGetBlob(key);
    if(!blob) continue;
    const url = URL.createObjectURL(blob);
    const div = document.createElement('div'); div.className='ph';
    const img = document.createElement('img'); img.src = url; img.alt='Foto añadida'; img.loading='lazy';
    const rm = document.createElement('button'); rm.className='remove'; rm.type='button'; rm.textContent='×';
    rm.addEventListener('click', async()=>{
      await photosDelete(key);
      stagedPhotoKeys = stagedPhotoKeys.filter(k => k !== key);
      renderPhotosPreview();
    });
    div.appendChild(img); div.appendChild(rm);
    wrap.appendChild(div);
  }
}

// Helpers para mostrar fotos de una visita
async function buildGallery(keys){
  const frag = document.createDocumentFragment();
  for(const key of (keys||[])){
    const blob = await photosGetBlob(key);
    if(!blob) continue;
    const url = URL.createObjectURL(blob);
    const img = document.createElement('img'); img.src = url; img.alt='Foto'; img.loading='lazy';
    img.addEventListener('click', ()=>{ const w=window.open(); if(w) w.document.write('<img src="'+url+'" style="width:100%">'); });
    frag.appendChild(img);
  }
  const div = document.createElement('div'); div.className='gallery';
  div.appendChild(frag);
  return div;
}

// ====== Tema ======
function updateMetaThemeColor(){
  const meta = document.querySelector('meta[name="theme-color"]');
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if(meta){ meta.setAttribute('content', isDark ? '#0b0e14' : '#ff4d6d'); }
}
function applyTheme(theme){
  if(theme === 'system'){ document.documentElement.removeAttribute('data-theme'); }
  else if(theme === 'dark'){ document.documentElement.setAttribute('data-theme','dark'); }
  else { document.documentElement.removeAttribute('data-theme'); }
  localStorage.setItem('rt_theme', theme);
  var btn = byId('themeToggle');
  if(btn){
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark' || (theme==='system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    btn.textContent = isDark ? 'Oscuro' : 'Claro';
  }
  updateMetaThemeColor();
}
  else if(theme === 'dark'){ document.documentElement.setAttribute('data-theme','dark'); }
  else { document.documentElement.removeAttribute('data-theme'); }
  localStorage.setItem('rt_theme', theme);
  const btn = byId('themeToggle');
  if(btn){ btn.textContent = (document.documentElement.getAttribute('data-theme')==='dark') ? '☀️' : '🌙'; }
  updateMetaThemeColor();
}
function initTheme(){
  var pref = localStorage.getItem('rt_theme');
  if(!pref || pref==='system'){
    var prefersDark = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    applyTheme(prefersDark ? 'dark' : 'light'); // aplicamos aspecto inicial
    localStorage.setItem('rt_theme','system'); // pero guardamos intención 'system'
  }else{ applyTheme(pref); }
  var toggle = byId('themeToggle');
  if(toggle){ toggle.addEventListener('click', function(){
    var current = localStorage.getItem('rt_theme') || 'system';
    var next = (current==='dark') ? 'light' : (current==='light' ? 'system' : 'dark');
    applyTheme(next);
    var sel = byId('themeSelect');
  if(sel){
    var stored = localStorage.getItem('rt_theme') || 'system';
    sel.value = stored;
    sel.addEventListener('change', function(){ applyTheme(sel.value); });
  }
  // Chips en cabecera
  var chipD = byId('chipDark'); if(chipD){ chipD.addEventListener('click', function(){ applyTheme('dark'); var s=byId('themeSelect'); if(s){ s.value='dark'; } }); }
  var chipL = byId('chipLight'); if(chipL){ chipL.addEventListener('click', function(){ applyTheme('light'); var s=byId('themeSelect'); if(s){ s.value='light'; } }); }
  var chipS = byId('chipSystem'); if(chipS){ chipS.addEventListener('click', function(){ applyTheme('system'); var s=byId('themeSelect'); if(s){ s.value='system'; } }); }
}else{ applyTheme(pref); }
  const toggle = byId('themeToggle');
  if(toggle){ toggle.addEventListener('click', ()=>{
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    applyTheme(isDark ? 'light' : 'dark');
  }); }
  if(window.matchMedia){
    var mql = window.matchMedia('(prefers-color-scheme: dark)');
    var handler = function(e){ var pref = localStorage.getItem('rt_theme') || 'system'; if(pref==='system'){ applyTheme(e.matches ? 'dark' : 'light'); } };
    if(mql.addEventListener) mql.addEventListener('change', handler);
    else if(mql.addListener) mql.addListener(handler);
  }
}

// ====== Estado ======
let state = { visits: [] };
function load(){
  try{ const raw = localStorage.getItem(DB_KEY); state.visits = raw ? JSON.parse(raw) : []; }
  catch(e){ console.error('Error leyendo localStorage', e); state.visits = []; }
}
function save(){
  localStorage.setItem(DB_KEY, JSON.stringify(state.visits));
  try{ scheduleAutoPublish(); }catch(e){}
}

function isMobileView(){ return window.matchMedia && window.matchMedia('(max-width: 900px)').matches; }

// ====== Pestañas ======
function initTabs(){
  const tabs = $$('.tab');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      $$('.tabpanel').forEach(s => s.classList.remove('active'));
      byId('tab-' + btn.dataset.tab).classList.add('active');
    });
  });
}

// ====== Formulario Añadir/Editar ======
let editingId = null;
function initForm(){
  var elPhotos = byId('photosInput'); if(elPhotos){ elPhotos.addEventListener('change', function(e){ handlePhotosInput(e.target.files); }); }
  byId('date').value = todayISO();
  byId('photosInput').addEventListener('change', (e)=> handlePhotosInput(e.target.files));

  function updateAvg(){
    const diners = parseInt(byId('diners').value || '0', 10);
    const total = parseFloat(byId('total').value || '0');
    byId('avgPerDiner').value = diners > 0 ? fmt2(total/diners) + ' €' : '—';
  }
  byId('diners').addEventListener('input', updateAvg);
  byId('total').addEventListener('input', updateAvg);

  byId('mapsSearch').addEventListener('click', () => {
    const name = byId('restaurant').value.trim();
    if(!name){ alert('Introduce el nombre del restaurante para buscarlo en Google Maps.'); return; }
    const q = encodeURIComponent(name);
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank');
  });

  const starsEl = byId('rating');
  const hidden = byId('ratingValue');
  function paintStars(v){
    starsEl.querySelectorAll('button[data-value]').forEach(b => { const val = parseInt(b.dataset.value,10); b.classList.toggle('filled', val <= v); });
  }
  starsEl.querySelectorAll('button[data-value]').forEach(btn => btn.addEventListener('click', () => {
    hidden.value = btn.dataset.value;
    paintStars(parseInt(hidden.value,10));
  }));
  byId('ratingClear').addEventListener('click', () => { hidden.value = '0'; paintStars(0); });

  byId('visitForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const restaurant = byId('restaurant').value.trim();
    const city = byId('city').value.trim();
    const date = byId('date').value;
    const diners = parseInt(byId('diners').value, 10);
    const total = parseFloat(byId('total').value);
    const rating = parseInt(byId('ratingValue').value, 10) || 0;
    const notes = byId('notes').value.trim();
    const mapsUrl = byId('mapsUrl').value.trim();
    if(!restaurant || !date || !diners || !total){ alert('Completa restaurante, fecha, comensales e importe total.'); return; }

    if(editingId){
      const v = state.visits.find(x => x.id === editingId);
      if(v){ v.restaurant = restaurant; v.city = city; v.date = date; v.diners = diners; v.total = total; v.avg = diners? total/diners : 0; v.rating = rating; v.notes = notes; v.mapsUrl = mapsUrl || ''; v.photoKeys = Array.isArray(stagedPhotoKeys)? stagedPhotoKeys.slice() : []; }
      state.visits.sort((a,b)=> (b.date||'').localeCompare(a.date||''));
    }else{
      const visit = { id: uid(), restaurant, city, date, diners, total, avg: diners? total/diners : 0, rating, notes, mapsUrl: mapsUrl || '', photoKeys: Array.isArray(stagedPhotoKeys)? stagedPhotoKeys.slice() : [] };
      state.visits.unshift(visit);
    }
    save();
    cancelEdit();
    renderAll();
  });

  byId('cancelEdit').addEventListener('click', cancelEdit);
}
function startEdit(id){
  stagedPhotoKeys = [];
  const v = state.visits.find(x => x.id === id); if(!v) return;
  document.querySelector('.tab[data-tab="add"]').click();
  byId('restaurant').value = v.restaurant;
  byId('city').value = v.city || '';
  byId('date').value = v.date;
  byId('diners').value = v.diners;
  byId('total').value = v.total;
  byId('mapsUrl').value = v.mapsUrl || '';
  byId('notes').value = v.notes || '';
  byId('ratingValue').value = String(v.rating || 0);
  const starsEl = byId('rating');
  starsEl.querySelectorAll('button[data-value]').forEach(b => { const val = parseInt(b.dataset.value,10); b.classList.toggle('filled', val <= (v.rating||0)); });
  const diners = parseInt(byId('diners').value || '0', 10); const total = parseFloat(byId('total').value || '0');
  byId('avgPerDiner').value = diners > 0 ? fmt2(total/diners) + ' €' : '—';
  stagedPhotoKeys = Array.isArray(v.photoKeys) ? v.photoKeys.slice() : [];
  renderPhotosPreview();
  editingId = id;
  byId('submitBtn').textContent = 'Guardar cambios';
  byId('cancelEdit').style.display = 'inline-flex';
  byId('visitForm').classList.add('editing');
}
function cancelEdit(){
  editingId = null;
  byId('submitBtn').textContent = 'Guardar visita';
  byId('cancelEdit').style.display = 'none';
  byId('visitForm').classList.remove('editing');
  byId('visitForm').reset();
  byId('date').value = todayISO();
  byId('ratingValue').value = '0';
  byId('rating').querySelectorAll('button[data-value]').forEach(b => b.classList.remove('filled'));
  byId('avgPerDiner').value = '—';
  stagedPhotoKeys = [];
  renderPhotosPreview();
}

// ====== Exportar/Importar/Borrar ======
function initDataOps(){
  byId('exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state.visits, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'mis-restaurantes.json'; a.click();
    URL.revokeObjectURL(url);
  });
  byId('importInput').addEventListener('change', (e) => {
    const file = e.target.files.[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const arr = JSON.parse(reader.result);
        if(!Array.isArray(arr)) throw new Error('Formato no válido');
        const cleaned = arr.map(v => ({
          id: v.id || uid(),
          restaurant: String(v.restaurant || '').slice(0,200),
          city: String(v.city || ''),
          date: v.date,
          diners: Math.max(1, parseInt(v.diners,10) || 1),
          total: Math.max(0, parseFloat(v.total) || 0),
          avg: Math.max(0, parseFloat(v.avg) || 0),
          rating: Math.max(0, Math.min(5, parseInt(v.rating,10) || 0)),
          notes: String(v.notes || '').slice(0,2000),
          mapsUrl: String(v.mapsUrl || ''),
          photoKeys: Array.isArray(v.photoKeys) ? v.photoKeys : [] // no vienen blobs; solo claves si existen
        }));
        state.visits = cleaned.sort((a,b)=> (b.date||'').localeCompare(a.date||''));
        save(); renderAll(); alert('Datos importados correctamente.');
      }catch(err){ alert('No se pudo importar: ' + err.message); }
    };
    reader.readAsText(file); e.target.value='';
  });
  byId('clearAll').addEventListener('click', () => {
    if(confirm('¿Seguro que quieres borrar todas las visitas? Esta acción no se puede deshacer.')){ state.visits=[]; save(); renderAll(); }
  });
}

// ====== Listas/Resumen/Explorar ======
function renderRecent(){
  const ul = byId('recentList'); ul.innerHTML = '';
  state.visits.slice(0,8).forEach(v => {
    const li = document.createElement('li');
    const left = document.createElement('div');
    const right = document.createElement('div');
    const name = document.createElement('div'); name.textContent = v.restaurant;
    const meta = document.createElement('div'); meta.className='muted';
    const avgText = v.diners ? fmtEUR.format(v.total / v.diners) : '—';
    const cityTxt = v.city ? ` • 📍 ${v.city}` : '';
    meta.textContent = `${v.date}${cityTxt} • ${avgText}/persona • ⭐ ${v.rating}`;
    left.appendChild(name); left.appendChild(meta);
    right.innerHTML = v.mapsUrl ? `<a class="btn outline" href="${v.mapsUrl}" target="_blank" rel="noopener">Mapa</a>`
                                : `<button class="btn outline" data-q="${encodeURIComponent(v.restaurant)}">Buscar</button>`;
    const editBtn = document.createElement('button'); editBtn.className = 'btn secondary'; editBtn.textContent = 'Editar'; editBtn.addEventListener('click', () => startEdit(v.id)); right.appendChild(editBtn);
    const delBtn = document.createElement('button'); delBtn.className = 'btn danger outline'; delBtn.textContent = 'Eliminar'; delBtn.addEventListener('click', () => deleteVisit(v.id)); right.appendChild(delBtn);
    if(Array.isArray(v.photoKeys) && v.photoKeys.length){
      const phBtn = document.createElement('button'); phBtn.className='btn outline'; phBtn.textContent = 'Fotos ('+v.photoKeys.length+')';
      const galleryWrap = document.createElement('div');
      phBtn.addEventListener('click', async()=>{ galleryWrap.innerHTML=''; galleryWrap.appendChild(await buildGallery(v.photoKeys)); });
      right.appendChild(phBtn);
      li.appendChild(document.createElement('div')).appendChild(galleryWrap);
    }
    right.addEventListener('click', (e)=>{ const btn = e.target.closest('button[data-q]'); if(btn){ const q = btn.getAttribute('data-q'); window.open('https://www.google.com/maps/search/?api=1&query=' + q, '_blank'); }});
    li.appendChild(left); li.appendChild(right); ul.appendChild(li);
  });
}
function computeSummary(){
  const map = new Map();
  for(const v of state.visits){
    const rKey = norm(v.restaurant);
    const y = yearOf(v.date);
    const key = `${rKey}|${y}`;
    const item = map.get(key) || { restaurantDisplay: v.restaurant, year: y, totalsPP: [], ratings: [], count: 0 };
    if(v.diners>0) item.totalsPP.push(v.total / v.diners);
    item.ratings.push(v.rating || 0);
    item.count += 1;
    if(!item.restaurantDisplay) item.restaurantDisplay = v.restaurant;
    map.set(key, item);
  }
  const out = Array.from(map.values()).map(x => ({ restaurant: x.restaurantDisplay, year: x.year, visits: x.count, avgPP: x.totalsPP.length? avg(x.totalsPP):0, avgRating: x.ratings.length? avg(x.ratings):0 }));
  out.sort((a,b)=> (b.year - a.year) || a.restaurant.localeCompare(b.restaurant));
  return out;
}

function renderSummary(){
  const tbody = byId('summaryTable').querySelector('tbody'); tbody.innerHTML = '';
  const rows = computeSummary();
  const container = byId('summaryTable').parentElement.parentElement; // .card -> .table-wrap parent
  const viewMode = (byId('summaryViewMode').value) || 'auto';
  const useCards = (viewMode === 'cards') || (viewMode === 'auto' && isMobileView());

  const wrap = container.querySelector('.table-wrap');
  if(!rows.length){
    if(wrap) wrap.innerHTML = '<p class="muted">Sin datos.</p>';
    const extra = container.querySelector('.s-cards'); if(extra) extra.remove();
    return;
  }

  if(!useCards){
    // Tabla normal
    if(wrap){
      wrap.innerHTML = '<table id="summaryTable"><thead><tr><th>Restaurante</th><th>Año</th><th>Visitas</th><th>Precio medio / comensal</th><th>Valoración media</th></tr></thead><tbody></tbody></table>';
      const t = byId('summaryTable'); const tb = t.querySelector('tbody');
      for(const r of rows){
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${escapeHTML(r.restaurant)}</td><td>${r.year}</td><td>${r.visits}</td><td>${fmtEUR.format(r.avgPP)}</td><td>⭐ ${fmt2(r.avgRating)}</td>`;
        tb.appendChild(tr);
      }
    }
    // Quitar cards si existen
    const extra = container.querySelector('.s-cards'); if(extra) extra.remove();
  }else{
    // Tarjetas
    if(wrap) wrap.innerHTML = ''; // ocultar tabla
    let grid = container.querySelector('.s-cards');
    if(!grid){ grid = document.createElement('div'); grid.className='s-cards'; container.appendChild(grid); }
    grid.innerHTML = '';
    for(const r of rows){
      const card = document.createElement('div'); card.className='s-card';
      const head = document.createElement('div'); head.className='s-head';
      const titleWrap = document.createElement('div');
      const title = document.createElement('div'); title.className='s-title'; title.textContent = r.restaurant;
      const sub = document.createElement('div'); sub.className='s-sub'; sub.textContent = `Año ${r.year} • ${r.visits} visitas`;
      titleWrap.appendChild(title); titleWrap.appendChild(sub);
      head.appendChild(titleWrap);

      const metrics = document.createElement('div'); metrics.className='s-metrics';
      const c1 = document.createElement('div'); c1.className='chip'; c1.textContent = `⭐ ${fmt2(r.avgRating)}`;
      const c2 = document.createElement('div'); c2.className='chip'; c2.textContent = `${fmtEUR.format(r.avgPP)}/persona`;
      metrics.appendChild(c1); metrics.appendChild(c2);

      card.appendChild(head); card.appendChild(metrics);
      grid.appendChild(card);
    }
  }
}
</td><td>${r.year}</td><td>${r.visits}</td><td>${fmtEUR.format(r.avgPP)}</td><td>⭐ ${fmt2(r.avgRating)}</td>`;
    tbody.appendChild(tr);
  }
}
function renderRestaurantFilter(){
  const select = byId('restaurantFilter');
  const map = new Map(); state.visits.forEach(v => { const k = norm(v.restaurant); if(!map.has(k)) map.set(k, v.restaurant); });
  const names = Array.from(map.values()).sort((a,b)=>a.localeCompare(b));
  const current = select.value;
  select.innerHTML = '<option value="">— Elige uno —</option>' + names.map(n => `<option value="${escapeHTML(n)}">${escapeHTML(n)}</option>`).join('');
  const hasCurrent = names.some(n => norm(n) === norm(current)); if(hasCurrent) select.value = names.find(n => norm(n) === norm(current));
}

function renderHistory(){
  const container = byId('historyContainer'); container.innerHTML = '';
  const name = byId('restaurantFilter').value;
  const viewMode = (byId('historyViewMode').value) || 'auto';
  const useCards = (viewMode === 'cards') || (viewMode === 'auto' && isMobileView());
  if(!name){ container.innerHTML = '<p class="muted">Elige un restaurante para ver todas sus visitas agrupadas por año.</p>'; return; }
  const visits = state.visits.filter(v => norm(v.restaurant) === norm(name)).slice().sort((a,b)=> (b.date||'').localeCompare(a.date||''));
  const byYear = new Map();
  for(const v of visits){ const y = yearOf(v.date); const arr = byYear.get(y) || []; arr.push(v); byYear.set(y, arr); }
  const years = Array.from(byYear.keys()).sort((a,b)=> b-a);
  for(const y of years){
    const group = document.createElement('div'); group.className='group';
    const arr = byYear.get(y);
    const avgPP = avg(arr.map(v => v.diners>0 ? v.total/v.diners : 0));
    const avgRating = avg(arr.map(v => v.rating || 0));
    if(!useCards){
      group.innerHTML = `<h4>${escapeHTML(name)} — ${y} • ${fmtEUR.format(avgPP)}/persona • ⭐ ${fmt2(avgRating)} (${arr.length} visitas)</h4>`;
      const ul = document.createElement('ul'); ul.className='list';
      arr.forEach(v => {
        const li = document.createElement('li');
        li.innerHTML = `
          <div>
            <div><span class="badge">${v.date}</span> • <strong class="price">${fmtEUR.format(v.total)}</strong> • ${v.diners} comensales • ${fmtEUR.format(v.diners>0? v.total/v.diners : 0)}/persona • ⭐ ${v.rating}</div>
            ${v.notes ? `<div class="muted">${escapeHTML(v.notes)}</div>` : ''}
          </div>
          <div>
            ${v.mapsUrl ? `<a class="btn outline" href="${v.mapsUrl}" target="_blank" rel="noopener">Mapa</a>` : ''}
          </div>
        `;
        const rightDiv = li.children[1];
        const editBtn = document.createElement('button'); editBtn.className='btn secondary'; editBtn.textContent='Editar'; editBtn.addEventListener('click', () => startEdit(v.id)); rightDiv.appendChild(editBtn);
        const delBtn = document.createElement('button'); delBtn.className='btn danger outline'; delBtn.textContent='Eliminar'; delBtn.addEventListener('click', () => deleteVisit(v.id)); rightDiv.appendChild(delBtn);
        if(Array.isArray(v.photoKeys) && v.photoKeys.length){
          const phBtn = document.createElement('button'); phBtn.className='btn outline'; phBtn.textContent = 'Fotos ('+v.photoKeys.length+')';
          const galleryWrap = document.createElement('div');
          phBtn.addEventListener('click', async()=>{ galleryWrap.innerHTML=''; galleryWrap.appendChild(await buildGallery(v.photoKeys)); });
          rightDiv.appendChild(phBtn);
          li.appendChild(document.createElement('div')).appendChild(galleryWrap);
        }
        ul.appendChild(li);
      });
      group.appendChild(ul);
    }else{
      group.innerHTML = `<h4>${escapeHTML(name)} — ${y} • ${fmtEUR.format(avgPP)}/persona • ⭐ ${fmt2(avgRating)} (${arr.length} visitas)</h4>`;
      const grid = document.createElement('div'); grid.className='h-cards';
      arr.forEach(v => {
        const card = document.createElement('div'); card.className='h-card';
        const head = document.createElement('div'); head.className='h-head';
        const title = document.createElement('div'); title.className='h-title'; title.textContent = `${v.date} — ${fmtEUR.format(v.total)}`;
        const sub = document.createElement('div'); sub.className='h-sub'; sub.textContent = `${v.diners} comensales • ${fmtEUR.format(v.diners>0? v.total/v.diners : 0)}/persona • ⭐ ${v.rating}`;
        head.appendChild(title);
        const metrics = document.createElement('div'); metrics.className='h-metrics';
        if(v.notes){ const chip = document.createElement('div'); chip.className='chip'; chip.textContent = (v.notes.length>28? v.notes.slice(0,28)+'…': v.notes); metrics.appendChild(chip); }
        const actions = document.createElement('div'); actions.className='h-actions';
        if(v.mapsUrl){ const mapA = document.createElement('a'); mapA.className='btn outline'; mapA.href=v.mapsUrl; mapA.target='_blank'; mapA.rel='noopener'; mapA.textContent='Mapa'; actions.appendChild(mapA); }
        const editB = document.createElement('button'); editB.className='btn secondary'; editB.textContent='Editar'; editB.addEventListener('click', ()=> startEdit(v.id)); actions.appendChild(editB);
        const delB = document.createElement('button'); delB.className='btn danger outline'; delB.textContent='Eliminar'; delB.addEventListener('click', ()=> deleteVisit(v.id)); actions.appendChild(delB);
        const wrapFrag = document.createDocumentFragment();
        if(Array.isArray(v.photoKeys) && v.photoKeys.length){
          const phBtn = document.createElement('button'); phBtn.className='btn outline'; phBtn.textContent = 'Fotos ('+v.photoKeys.length+')';
          const galleryWrap = document.createElement('div');
          phBtn.addEventListener('click', async()=>{ galleryWrap.innerHTML=''; galleryWrap.appendChild(await buildGallery(v.photoKeys)); });
          actions.appendChild(phBtn);
          wrapFrag.appendChild(galleryWrap);
        }
        card.appendChild(head);
        card.appendChild(sub);
        if(metrics.childElementCount) card.appendChild(metrics);
        card.appendChild(actions);
        if(wrapFrag.childNodes.length) card.appendChild(wrapFrag);
        grid.appendChild(card);
      });
      group.appendChild(grid);
    }
    container.appendChild(group);
  }
}

  const visits = state.visits.filter(v => norm(v.restaurant) === norm(name)).slice().sort((a,b)=> (b.date||'').localeCompare(a.date||''));
  const byYear = new Map();
  for(const v of visits){ const y = yearOf(v.date); const arr = byYear.get(y) || []; arr.push(v); byYear.set(y, arr); }
  const years = Array.from(byYear.keys()).sort((a,b)=> b-a);
  for(const y of years){
    const group = document.createElement('div'); group.className='group';
    const arr = byYear.get(y);
    const avgPP = avg(arr.map(v => v.diners>0 ? v.total/v.diners : 0));
    const avgRating = avg(arr.map(v => v.rating || 0));
    group.innerHTML = `<h4>${escapeHTML(name)} — ${y} • ${fmtEUR.format(avgPP)}/persona • ⭐ ${fmt2(avgRating)} (${arr.length} visitas)</h4>`;
    const ul = document.createElement('ul'); ul.className='list';
    arr.forEach(v => {
      const li = document.createElement('li');
      li.innerHTML = `
        <div>
          <div><span class="badge">${v.date}</span> • <strong class="price">${fmtEUR.format(v.total)}</strong> • ${v.diners} comensales • ${fmtEUR.format(v.diners>0? v.total/v.diners : 0)}/persona • ⭐ ${v.rating}</div>
          ${v.notes ? `<div class="muted">${escapeHTML(v.notes)}</div>` : ''}
        </div>
        <div>
          ${v.mapsUrl ? `<a class="btn outline" href="${v.mapsUrl}" target="_blank" rel="noopener">Mapa</a>` : ''}
        </div>
      `;
      const rightDiv = li.children[1];
      const editBtn = document.createElement('button'); editBtn.className='btn secondary'; editBtn.textContent='Editar'; editBtn.addEventListener('click', () => startEdit(v.id)); rightDiv.appendChild(editBtn);
      const delBtn = document.createElement('button'); delBtn.className='btn danger outline'; delBtn.textContent='Eliminar'; delBtn.addEventListener('click', () => deleteVisit(v.id)); rightDiv.appendChild(delBtn);
      if(Array.isArray(v.photoKeys) && v.photoKeys.length){
        const phBtn = document.createElement('button'); phBtn.className='btn outline'; phBtn.textContent = 'Fotos ('+v.photoKeys.length+')';
        const galleryWrap = document.createElement('div');
        phBtn.addEventListener('click', async()=>{ galleryWrap.innerHTML=''; galleryWrap.appendChild(await buildGallery(v.photoKeys)); });
        rightDiv.appendChild(phBtn);
        li.appendChild(document.createElement('div')).appendChild(galleryWrap);
      }
      ul.appendChild(li);
    });
    group.appendChild(ul); container.appendChild(group);
  }
}

// Explorar
function getActiveVisits(){ return state.visits; }
function computeAggregatedByRestaurantCity(visits){
  const map = new Map();
  for(const v of visits){
    const city = (v.city || '').trim();
    const rKey = norm(v.restaurant); const cKey = norm(city);
    const key = `${rKey}|${cKey}`;
    const item = map.get(key) || { restaurant: v.restaurant, city, totalsPP: [], ratings: [], count:0, lastMap: '', lastDate:'' };
    if(v.diners>0) item.totalsPP.push(v.total/v.diners);
    item.ratings.push(v.rating || 0);
    item.count += 1;
    if(v.mapsUrl) item.lastMap = v.mapsUrl;
    if(!item.lastDate || (v.date||'') > item.lastDate) item.lastDate = v.date || '';
    if(!item.restaurant) item.restaurant = v.restaurant;
    if(!item.city && v.city) item.city = v.city;
    map.set(key, item);
  }
  return Array.from(map.values()).map(x => ({ restaurant: x.restaurant, city: x.city, visits: x.count, avgPP: x.totalsPP.length? avg(x.totalsPP):0, avgRating: x.ratings.length? avg(x.ratings):0, mapsUrl: x.lastMap || '' }));
}
function renderCityFilter(){
  const select = byId('cityFilter');
  const map = new Map(); getActiveVisits().forEach(v => { const c=(v.city||'').trim(); if(!c) return; const k=norm(c); if(!map.has(k)) map.set(k,c); });
  const names = Array.from(map.values()).sort((a,b)=>a.localeCompare(b));
  const current = select.value;
  select.innerHTML = '<option value="">Todas</option>' + names.map(n => `<option value="${escapeHTML(n)}">${escapeHTML(n)}</option>`).join('');
  const hasCurrent = names.some(n => norm(n) === norm(current)); if(hasCurrent) select.value = names.find(n => norm(n) === norm(current));
}

function renderExplore(){
  renderCityFilter();
  const info = byId('exploreInfo');
  info.textContent = 'Explora tus restaurantes por ciudad y valoración.';
  const city = byId('cityFilter').value;
  const minRating = parseInt(byId('minRating').value || '0', 10);
  const sortBy = byId('sortBy').value;
  const viewMode = (byId('viewMode').value) || 'auto';

  let rows = computeAggregatedByRestaurantCity(getActiveVisits());
  if(city) rows = rows.filter(r => norm(r.city||'') === norm(city));
  rows = rows.filter(r => r.avgRating >= minRating);
  rows.sort((a,b)=>{
    switch(sortBy){
      case 'ratingAsc': return (a.avgRating - b.avgRating) || a.restaurant.localeCompare(b.restaurant);
      case 'avgPPAsc': return (a.avgPP - b.avgPP) || a.restaurant.localeCompare(b.restaurant);
      case 'avgPPDesc': return (b.avgPP - a.avgPP) || a.restaurant.localeCompare(b.restaurant);
      case 'visitsDesc': return (b.visits - a.visits) || b.avgRating - a.avgRating;
      case 'ratingDesc':
      default: return (b.avgRating - a.avgRating) || b.visits - a.visits;
    }
  });

  const container = byId('exploreContainer');
  if(!rows.length){ container.innerHTML = '<p class="muted">No hay resultados con estos filtros.</p>'; return; }

  const useCards = (viewMode === 'cards') || (viewMode === 'auto' && isMobileView());
  container.innerHTML = '';
  if(!useCards){
    const table = document.createElement('table');
    table.innerHTML = `<thead><tr><th>Restaurante</th><th>Ciudad</th><th>Visitas</th><th>⭐ Valoración media</th><th>Precio medio / comensal</th><th></th></tr></thead><tbody></tbody>`;
    table.style.minWidth = '640px';
    const tbody = table.querySelector('tbody');
    for(const r of rows){
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${escapeHTML(r.restaurant)}</td><td>${escapeHTML(r.city||'')}</td><td>${r.visits}</td><td>⭐ ${fmt2(r.avgRating)}</td><td>${fmtEUR.format(r.avgPP)}</td><td>${r.mapsUrl ? `<a class="btn outline" href="${r.mapsUrl}" target="_blank" rel="noopener">Mapa</a>` : ''}</td>`;
      tbody.appendChild(tr);
    }
    const wrap = document.createElement('div'); wrap.className='table-wrap'; wrap.appendChild(table); container.appendChild(wrap);
  }else{
    const grid = document.createElement('div'); grid.className='r-cards';
    for(const r of rows){
      const card = document.createElement('div'); card.className='r-card';
      const head = document.createElement('div'); head.className='r-head';
      const titleWrap = document.createElement('div');
      const title = document.createElement('div'); title.className='r-title'; title.textContent = r.restaurant;
      const cityEl = document.createElement('div'); cityEl.className='r-city'; cityEl.textContent = r.city || '';
      titleWrap.appendChild(title); titleWrap.appendChild(cityEl);
      const actions = document.createElement('div'); actions.className='r-actions';
      if(r.mapsUrl){ const btn = document.createElement('a'); btn.className='btn outline'; btn.href=r.mapsUrl; btn.target='_blank'; btn.rel='noopener'; btn.textContent='Mapa'; actions.appendChild(btn); }
      head.appendChild(titleWrap); head.appendChild(actions);

      const metrics = document.createElement('div'); metrics.className='r-metrics';
      const c1 = document.createElement('div'); c1.className='chip'; c1.textContent = `⭐ ${fmt2(r.avgRating)}`;
      const c2 = document.createElement('div'); c2.className='chip'; c2.textContent = `${fmtEUR.format(r.avgPP)}/persona`;
      const c3 = document.createElement('div'); c3.className='chip'; c3.textContent = `${r.visits} visitas`;
      metrics.appendChild(c1); metrics.appendChild(c2); metrics.appendChild(c3);

      card.appendChild(head); card.appendChild(metrics);
      grid.appendChild(card);
    }
    container.appendChild(grid);
  }
}

function initExplore(){ ['cityFilter','minRating','sortBy'].forEach(id => byId(id).addEventListener('change', renderExplore)); renderExplore(); }

function renderRestaurantDatalist(){
  const dl = byId('restaurantList'); if(!dl) return;
  const map = new Map(); state.visits.forEach(v => { const k = norm(v.restaurant); if(!map.has(k)) map.set(k, v.restaurant); });
  const names = Array.from(map.values()).sort((a,b)=>a.localeCompare(b));
  dl.innerHTML = names.map(n => `<option value="${escapeHTML(n)}"></option>`).join('');
}

function deleteVisit(id){
  const idx = state.visits.findIndex(v => v.id === id);
  if(idx === -1) return;
  if(confirm('¿Seguro que quieres eliminar esta visita?')){ state.visits.splice(idx,1); save(); renderAll(); }
}

function renderAll(){
  renderRecent();
  renderSummary();
  renderRestaurantFilter();
  renderHistory();
  renderRestaurantDatalist();
}

// ====== Supabase (preconfig + auto publish resumen) ======
let SUPA = {
  url: localStorage.getItem('rt_supabase_url') || (window.APP_CONFIG && window.APP_CONFIG.SUPABASE_URL) || '',
  anon: localStorage.getItem('rt_supabase_anon') || (window.APP_CONFIG && window.APP_CONFIG.SUPABASE_ANON_KEY) || ''
};
let supa = null;
function ensureSupa(){ if(!SUPA.url || !SUPA.anon) return null; try{ if(!supa){ supa = window.supabase.createClient(SUPA.url, SUPA.anon); } return supa; }catch(e){ console.error('Supabase no disponible', e); return null; } }
async function getCurrentUser(){ const c = ensureSupa(); if(!c) return null; const { data } = await c.auth.getUser(); return data.user || null; }
async function signInWithEmail(email){ const c = ensureSupa(); if(!c) throw new Error('Configura SUPABASE_URL y ANON_KEY'); const redirect = location.origin + location.pathname; const { error } = await c.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect } }); if(error) throw error; }
async function signOut(){ const c = ensureSupa(); if(!c) return; await c.auth.signOut(); }
async function upsertProfileUsername(username){ const c = ensureSupa(); if(!c) throw new Error('Configura Supabase'); const user = await getCurrentUser(); if(!user) throw new Error('Inicia sesión'); const { error } = await c.from('profiles').upsert({ id: user.id, username }).select(); if(error) throw error; }
function myShareItemsUsers(){ const rows = computeAggregatedByRestaurantCity(state.visits); return rows.map(r => ({ restaurant: r.restaurant, city: r.city || '', avgPP: Number(fmt2(r.avgPP)), avgRating: Number(fmt2(r.avgRating)), visits: r.visits, mapsUrl: r.mapsUrl || '' })); }
async function publishMySummary(){ const c = ensureSupa(); if(!c) throw new Error('Configura Supabase'); const user = await getCurrentUser(); if(!user) throw new Error('Inicia sesión'); const items = myShareItemsUsers(); const { error } = await c.from('summaries').upsert({ owner_id: user.id, items }).select(); if(error) throw error; }
let autoPublishTimer = null;
function scheduleAutoPublish(){ if(autoPublishTimer) clearTimeout(autoPublishTimer); autoPublishTimer = setTimeout(async () => { try{ const c = ensureSupa(); if(!c) return; const user = await getCurrentUser(); if(!user) return; await publishMySummary(); } catch(e){ console.warn('No se pudo auto-publicar:', e); } }, 2000); }

async function updateAccountInfo(){
  const info = byId('accountInfo');
  if(!SUPA.url || !SUPA.anon){ info.innerHTML = 'Supabase <strong>no configurado</strong>.'; return; }
  const user = await getCurrentUser();
  if(user){ info.innerHTML = `Conectado: <strong>${user.email||user.id}</strong>`; }
  else{ info.innerHTML = 'No has iniciado sesión.'; }
}
function initFriendsUsers(){
  initTabs();
  byId('supabaseUrlInput').value = SUPA.url;
  byId('supabaseAnonInput').value = SUPA.anon;
  byId('saveSupabaseCfgBtn').addEventListener('click', () => { SUPA.url = byId('supabaseUrlInput').value.trim(); SUPA.anon = byId('supabaseAnonInput').value.trim(); localStorage.setItem('rt_supabase_url', SUPA.url); localStorage.setItem('rt_supabase_anon', SUPA.anon); supa=null; updateAccountInfo(); alert('Configuración guardada.'); });
  byId('clearSupabaseCfgBtn').addEventListener('click', () => { localStorage.removeItem('rt_supabase_url'); localStorage.removeItem('rt_supabase_anon'); SUPA={ url: (window.APP_CONFIG&&window.APP_CONFIG.SUPABASE_URL)||'', anon: (window.APP_CONFIG&&window.APP_CONFIG.SUPABASE_ANON_KEY)||'' }; supa=null; byId('supabaseUrlInput').value=SUPA.url; byId('supabaseAnonInput').value=SUPA.anon; updateAccountInfo(); alert('Configuración borrada (se usarán las preconfiguradas).'); });
  byId('sendMagicLink').addEventListener('click', async () => { try{ const email = byId('authEmail').value.trim(); if(!email){ alert('Introduce un email'); return; } await signInWithEmail(email); alert('Te enviamos un enlace de inicio de sesión a tu correo.'); }catch(err){ alert(err.message || err); } });
  byId('checkSessionBtn').addEventListener('click', async () => { try{ const user = await getCurrentUser(); updateAccountInfo(); alert(user ? `Sesión activa: ${user.email||user.id}` : 'No hay sesión activa.'); }catch(err){ alert(err.message||err); } });
  byId('signOutBtn').addEventListener('click', async () => { try{ await signOut(); updateAccountInfo(); }catch(err){ alert(err.message||err); } });
  byId('saveUsernameBtn').addEventListener('click', async () => { try{ const uname = byId('usernameInput').value.trim(); if(!uname){ alert('Introduce un nombre de usuario'); return; } await upsertProfileUsername(uname); alert('Nombre de usuario guardado.'); updateAccountInfo(); }catch(err){ alert(err.message || err); } });
  updateAccountInfo();
}

// ====== Main ======
console.log('BUILD v12.4.2 loaded');

document.addEventListener('DOMContentLoaded', function() { var jsStatus=document.getElementById('jsStatus'); if(jsStatus){ jsStatus.textContent='JS iniciando…'; }
  initTheme();
  load();
  initForm();
  initDataOps();
  byId('restaurantFilter').addEventListener('change', renderHistory);
  byId('summaryViewMode').addEventListener('change', renderSummary);
  byId('historyViewMode').addEventListener('change', renderHistory);
  initExplore();
  initFriendsUsers();
  renderAll();
  var jsStatus=document.getElementById('jsStatus'); if(jsStatus){ jsStatus.textContent='JS OK'; }
});
