(function(){
'use strict';

/* ===== Utilidades ===== */
var DB_KEY='visitas_restaurantes_v131';
function fmtEUR(n){ try{ return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(n||0); }catch(e){ return (Math.round((n||0)*100)/100).toFixed(2)+' €'; } }
function fmt2(n){ return (Math.round((n||0)*100)/100).toFixed(2); }
function $(s){ return document.querySelector(s); }
function $all(s){ return document.querySelectorAll(s); }
function byId(id){ return document.getElementById(id); }
function todayISO(){ var d=new Date(); var m=('0'+(d.getMonth()+1)).slice(-2); var day=('0'+d.getDate()).slice(-2); return d.getFullYear()+'-'+m+'-'+day; }
function yearOf(iso){ return (new Date(iso+'T12:00:00')).getFullYear(); }
function norm(s){ return (s||'').toString().trim().replace(/\s+/g,' ').toLowerCase(); }
function avg(arr){ return arr.length ? arr.reduce(function(a,b){return a+b;},0)/arr.length : 0; }
function uid(){ return Math.random().toString(36).slice(2)+Date.now().toString(36); }
function escapeHTML(str){ var s=(str==null?'':String(str)); return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

/* ===== Tema ===== */
function updateMetaThemeColor(){ var meta=document.querySelector('meta[name="theme-color"]'); var isDark=document.documentElement.getAttribute('data-theme')==='dark'; if(meta) meta.setAttribute('content', isDark ? '#0b0e14' : '#ff4d6d'); }
function applyTheme(theme){
  if(theme==='system'){ document.documentElement.removeAttribute('data-theme'); }
  else if(theme==='dark'){ document.documentElement.setAttribute('data-theme','dark'); }
  else { document.documentElement.removeAttribute('data-theme'); }
  try{ localStorage.setItem('rt_theme', theme); }catch(e){}
  var isDark=document.documentElement.getAttribute('data-theme')==='dark' || (theme==='system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  var lab=byId('themeLabel'); if(lab){ lab.textContent='Tema: '+(isDark?'Oscuro':(theme==='system'?'Automático':'Claro')); }
  updateMetaThemeColor();
}
function initTheme(){
  var pref='system'; try{ pref=localStorage.getItem('rt_theme')||'system'; }catch(e){}
  if(pref==='system'){ var prefersDark=(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches); applyTheme(prefersDark?'dark':'light'); try{ localStorage.setItem('rt_theme','system'); }catch(e){} }
  else{ applyTheme(pref); }
  var d=byId('chipDark'), l=byId('chipLight'), s=byId('chipSystem');
  if(d) d.addEventListener('click', function(){ applyTheme('dark'); });
  if(l) l.addEventListener('click', function(){ applyTheme('light'); });
  if(s) s.addEventListener('click', function(){ applyTheme('system'); });
}

/* ===== Estado ===== */
var state={ visits: [] };
function load(){ try{ var raw=localStorage.getItem(DB_KEY); state.visits=raw? JSON.parse(raw): []; }catch(e){ state.visits=[]; } }
function save(){ try{ localStorage.setItem(DB_KEY, JSON.stringify(state.visits)); }catch(e){} try{ scheduleAutoPublish(); }catch(e){} }

/* ===== IndexedDB Adjuntos ===== */
var ATT_DB='rt-attachments', ATT_STORE='files'; var dbAtt=null;
function openAttDB(){ return new Promise(function(resolve,reject){ if(dbAtt){ resolve(dbAtt); return; } var req=indexedDB.open(ATT_DB,1); req.onupgradeneeded=function(e){ var db=e.target.result; if(!db.objectStoreNames.contains(ATT_STORE)){ db.createObjectStore(ATT_STORE,{ keyPath:'key' }); } }; req.onsuccess=function(e){ dbAtt=e.target.result; resolve(dbAtt); }; req.onerror=function(){ reject(req.error||new Error('No se pudo abrir IndexedDB')); }; }); }
function attPut(key, blob){ return openAttDB().then(function(db){ return new Promise(function(resolve,reject){ var tx=db.transaction(ATT_STORE,'readwrite'); tx.objectStore(ATT_STORE).put({ key:key, type: blob.type||'application/octet-stream', blob: blob, createdAt: Date.now() }); tx.oncomplete=function(){ resolve(true); }; tx.onerror=function(){ reject(tx.error||new Error('No se pudo guardar adjunto')); }; }); }); }
function attGet(key){ return openAttDB().then(function(db){ return new Promise(function(resolve,reject){ var tx=db.transaction(ATT_STORE,'readonly'); var req=tx.objectStore(ATT_STORE).get(key); req.onsuccess=function(){ resolve(req.result||null); }; req.onerror=function(){ reject(req.error||new Error('No se pudo leer adjunto')); }; }); }); }
function attDelete(key){ return openAttDB().then(function(db){ return new Promise(function(resolve,reject){ var tx=db.transaction(ATT_STORE,'readwrite'); tx.objectStore(ATT_STORE).delete(key); tx.oncomplete=function(){ resolve(true); }; tx.onerror=function(){ reject(tx.error||new Error('No se pudo borrar adjunto')); }; }); }); }

var stagedAttKeys=[];
function handleAttInput(files){
  if(!files||!files.length) return;
  var i; function next(i){ if(i>=files.length){ renderAttPreview(); return; } var f=files[i]; var key='a_'+uid(); attPut(key,f).then(function(){ stagedAttKeys.push(key); next(i+1); }); }
  next(0);
}
function renderAttPreview(){
  var wrap=byId('attPreview'); if(!wrap) return; wrap.innerHTML='';
  var i=0; function addNext(){ if(i>=stagedAttKeys.length) return; var key=stagedAttKeys[i++]; attGet(key).then(function(rec){ if(!rec) { addNext(); return; } var url=URL.createObjectURL(rec.blob); var el=document.createElement('div'); el.className='att';
    if((rec.type||'').indexOf('image/')===0){ var img=new Image(); img.src=url; img.alt='Adjunto'; img.loading='lazy'; el.appendChild(img); }
    else{ var box=document.createElement('div'); box.style.width='100%'; box.style.height='80px'; box.style.display='flex'; box.style.alignItems='center'; box.style.justifyContent='center'; box.style.color='#fff'; box.textContent='Archivo'; el.appendChild(box); }
    var lab=document.createElement('div'); lab.className='label'; lab.textContent=((rec.type||'').indexOf('pdf')!==-1)?'PDF':'Foto'; el.appendChild(lab);
    var rm=document.createElement('button'); rm.className='remove'; rm.type='button'; rm.textContent='×'; rm.addEventListener('click', function(){ attDelete(key).then(function(){ stagedAttKeys=stagedAttKeys.filter(function(k){return k!==key;}); renderAttPreview(); }); }); el.appendChild(rm);
    el.addEventListener('click', function(){ var w=window.open(); if(w){ w.document.write('<title>Adjunto</title><style>html,body{margin:0;background:#000}</style>'); w.document.write((rec.type||'').indexOf('image/')===0? '<img src="'+url+'" style="width:100%">' : '<embed src="'+url+'" type="'+rec.type+'" width="100%" height="100%">'); } });
    wrap.appendChild(el); addNext(); }); }
  addNext();
}

/* ===== Pestañas ===== */
function initTabs(){ var tabs=$all('.tab'); for(var i=0;i<tabs.length;i++){ (function(btn){ btn.addEventListener('click', function(){ for(var j=0;j<tabs.length;j++) tabs[j].classList.remove('active'); btn.classList.add('active'); var panels=$all('.tabpanel'); for(var k=0;k<panels.length;k++) panels[k].classList.remove('active'); byId('tab-'+btn.getAttribute('data-tab')).classList.add('active'); }); })(tabs[i]); } }

/* ===== Formulario ===== */
var editingId=null;
function initForm(){
  byId('date').value=todayISO();
  var attIn=byId('attInput'); if(attIn){ attIn.addEventListener('change', function(e){ handleAttInput(e.target.files); }); }
  function updateAvg(){ var diners=parseInt(byId('diners').value||'0',10); var total=parseFloat(byId('total').value||'0'); byId('avgPerDiner').value=diners>0? fmt2(total/diners)+' €':'—'; }
  byId('diners').addEventListener('input', updateAvg); byId('total').addEventListener('input', updateAvg);
  byId('mapsSearch').addEventListener('click', function(){ var name=byId('restaurant').value.replace(/\s+/g,' ').trim(); if(!name){ alert('Introduce el nombre del restaurante.'); return; } var q=encodeURIComponent(name); window.open('https://www.google.com/maps/search/?api=1&query='+q,'_blank'); });
  var starsEl=byId('rating'); var hidden=byId('ratingValue');
  function paintStars(v){ var bs=starsEl.querySelectorAll('button[data-value]'); for(var i=0;i<bs.length;i++){ var val=parseInt(bs[i].getAttribute('data-value'),10); if(val<=v) bs[i].classList.add('filled'); else bs[i].classList.remove('filled'); } }
  var btns=starsEl.querySelectorAll('button[data-value]'); for(var i=0;i<btns.length;i++){ (function(b){ b.addEventListener('click', function(){ hidden.value=b.getAttribute('data-value'); paintStars(parseInt(hidden.value,10)); }); })(btns[i]); }
  byId('ratingClear').addEventListener('click', function(){ hidden.value='0'; paintStars(0); });
  byId('visitForm').addEventListener('submit', function(e){
    e.preventDefault();
    var restaurant=byId('restaurant').value.trim(); var city=byId('city').value.trim(); var date=byId('date').value;
    var diners=parseInt(byId('diners').value,10); var total=parseFloat(byId('total').value);
    var rating=parseInt(byId('ratingValue').value,10)||0; var notes=byId('notes').value.trim(); var mapsUrl=byId('mapsUrl').value.trim();
    if(!restaurant || !date || !diners || isNaN(total)){ alert('Completa restaurante, fecha, comensales e importe total.'); return; }
    if(editingId){ var v=null; for(var i=0;i<state.visits.length;i++){ if(state.visits[i].id===editingId){ v=state.visits[i]; break; } } if(v){ v.restaurant=restaurant; v.city=city; v.date=date; v.diners=diners; v.total=total; v.avg=diners? total/diners:0; v.rating=rating; v.notes=notes; v.mapsUrl=mapsUrl||''; v.attKeys=stagedAttKeys.slice(); } state.visits.sort(function(a,b){ return (b.date||'').localeCompare(a.date||''); }); }
    else{ var visit={ id:uid(), restaurant:restaurant, city:city, date:date, diners:diners, total:total, avg:diners? total/diners:0, rating:rating, notes:notes, mapsUrl:mapsUrl||'', attKeys: stagedAttKeys.slice() }; state.visits.unshift(visit); }
    save(); cancelEdit(); renderAll();
  });
  byId('cancelEdit').addEventListener('click', cancelEdit);
}
function startEdit(id){
  stagedAttKeys=[];
  var v=null; for(var i=0;i<state.visits.length;i++){ if(state.visits[i].id===id){ v=state.visits[i]; break; } } if(!v) return;
  document.querySelector('.tab[data-tab="add"]').click();
  byId('restaurant').value=v.restaurant; byId('city').value=v.city||''; byId('date').value=v.date; byId('diners').value=v.diners; byId('total').value=v.total; byId('mapsUrl').value=v.mapsUrl||''; byId('notes').value=v.notes||'';
  byId('ratingValue').value=String(v.rating||0); var diners=parseInt(byId('diners').value||'0',10); var total=parseFloat(byId('total').value||'0'); byId('avgPerDiner').value=diners>0? fmt2(total/diners)+' €':'—';
  var starsEl=byId('rating'); var bs=starsEl.querySelectorAll('button[data-value]'); for(var i=0;i<bs.length;i++){ var val=parseInt(bs[i].getAttribute('data-value'),10); if(val<=v.rating) bs[i].classList.add('filled'); else bs[i].classList.remove('filled'); }
  stagedAttKeys = Array.isArray(v.attKeys)? v.attKeys.slice(): []; renderAttPreview();
  editingId=id; byId('submitBtn').textContent='Guardar cambios'; byId('cancelEdit').style.display='inline-flex'; byId('visitForm').classList.add('editing');
}
function cancelEdit(){ editingId=null; byId('submitBtn').textContent='Guardar visita'; byId('cancelEdit').style.display='none'; byId('visitForm').classList.remove('editing'); byId('visitForm').reset(); byId('date').value=todayISO(); byId('ratingValue').value='0'; var bs=byId('rating').querySelectorAll('button[data-value]'); for(var i=0;i<bs.length;i++){ bs[i].classList.remove('filled'); } byId('avgPerDiner').value='—'; stagedAttKeys=[]; renderAttPreview(); }

/* ===== Exportar/Importar ===== */
function initDataOps(){
  byId('exportBtn').addEventListener('click', function(){ var blob=new Blob([JSON.stringify(state.visits,null,2)],{type:'application/json'}); var url=URL.createObjectURL(blob); var a=document.createElement('a'); a.href=url; a.download='mis-restaurantes.json'; a.click(); URL.revokeObjectURL(url); });
  byId('importInput').addEventListener('change', function(e){ var file=e.target.files&&e.target.files[0]; if(!file) return; var reader=new FileReader(); reader.onload=function(){ try{ var arr=JSON.parse(reader.result); if(!Array.isArray(arr)) throw new Error('Formato no válido'); arr=arr.map(function(v){ return { id: v.id||uid(), restaurant: String(v.restaurant||'').slice(0,200), city: String(v.city||''), date: v.date, diners: Math.max(1, parseInt(v.diners,10)||1), total: Math.max(0, parseFloat(v.total)||0), avg: Math.max(0, parseFloat(v.avg)||0), rating: Math.max(0, Math.min(5, parseInt(v.rating,10)||0)), notes: String(v.notes||'').slice(0,2000), mapsUrl: String(v.mapsUrl||''), attKeys: Array.isArray(v.attKeys)? v.attKeys: [] }; }); state.visits=arr.sort(function(a,b){ return (b.date||'').localeCompare(a.date||''); }); save(); renderAll(); alert('Datos importados.'); }catch(err){ alert('No se pudo importar: '+err.message); } }; reader.readAsText(file); e.target.value=''; });
  byId('clearAll').addEventListener('click', function(){ if(confirm('¿Seguro que quieres borrar todas las visitas?')){ state.visits=[]; save(); renderAll(); }});
}

/* ===== Listas/Resumen/Explorar ===== */
function renderRecent(){
  var ul=byId('recentList'); ul.innerHTML='';
  for(var i=0;i<Math.min(8,state.visits.length);i++){
    var v=state.visits[i]; var li=document.createElement('li'); var left=document.createElement('div'); var right=document.createElement('div');
    var name=document.createElement('div'); name.textContent=v.restaurant; var meta=document.createElement('div'); meta.className='muted';
    var avgText=v.diners? fmtEUR(v.total/v.diners):'—'; var cityTxt=v.city? ' • 📍 '+v.city:''; meta.textContent=v.date+cityTxt+' • '+avgText+'/persona • ⭐ '+v.rating;
    left.appendChild(name); left.appendChild(meta);
    right.innerHTML = v.mapsUrl? '<a class="btn outline" href="'+v.mapsUrl+'" target="_blank" rel="noopener">Mapa</a>' : '<button class="btn outline" data-q="'+encodeURIComponent(v.restaurant)+'">Buscar</button>';
    var editBtn=document.createElement('button'); editBtn.className='btn secondary'; editBtn.textContent='Editar'; (function(id){ editBtn.addEventListener('click', function(){ startEdit(id); }); })(v.id); right.appendChild(editBtn);
    var delBtn=document.createElement('button'); delBtn.className='btn danger outline'; delBtn.textContent='Eliminar'; (function(id){ delBtn.addEventListener('click', function(){ deleteVisit(id); }); })(v.id); right.appendChild(delBtn);
    if(Array.isArray(v.attKeys)&&v.attKeys.length){ var aBtn=document.createElement('button'); aBtn.className='btn outline'; aBtn.textContent='Adjuntos ('+v.attKeys.length+')'; var wrap=document.createElement('div'); aBtn.addEventListener('click', function(){ wrap.innerHTML=''; var frag=document.createDocumentFragment(); var idx=0; function next(){ if(idx>=v.attKeys.length){ wrap.appendChild(frag); return; } var key=v.attKeys[idx++]; attGet(key).then(function(rec){ if(!rec){ next(); return; } var url=URL.createObjectURL(rec.blob); var link=document.createElement('a'); link.href=url; link.target='_blank'; link.rel='noopener'; link.textContent=((rec.type||'').indexOf('pdf')!==-1)?'Ver PDF':'Ver foto'; var item=document.createElement('div'); item.appendChild(link); frag.appendChild(item); next(); }); } next(); }); right.appendChild(aBtn); var holder=document.createElement('div'); holder.appendChild(wrap); li.appendChild(holder); }
    right.addEventListener('click', function(e){ var btn=e.target && e.target.closest? e.target.closest('button[data-q]'): null; if(btn){ var q=btn.getAttribute('data-q'); window.open('https://www.google.com/maps/search/?api=1&query='+q,'_blank'); }});
    li.appendChild(left); li.appendChild(right); ul.appendChild(li);
  }
}
function computeSummary(){
  var map={}; for(var i=0;i<state.visits.length;i++){ var v=state.visits[i]; var rKey=norm(v.restaurant); var y=yearOf(v.date); var key=rKey+'|'+y; if(!map[key]) map[key]={ restaurantDisplay:v.restaurant, year:y, totalsPP:[], ratings:[], count:0 }; if(v.diners>0) map[key].totalsPP.push(v.total/v.diners); map[key].ratings.push(v.rating||0); map[key].count++; if(!map[key].restaurantDisplay) map[key].restaurantDisplay=v.restaurant; }
  var out=[]; for(var k in map){ var x=map[k]; out.push({ restaurant:x.restaurantDisplay, year:x.year, visits:x.count, avgPP: x.totalsPP.length? avg(x.totalsPP):0, avgRating: x.ratings.length? avg(x.ratings):0 }); }
  out.sort(function(a,b){ return (b.year-a.year) || a.restaurant.localeCompare(b.restaurant); }); return out;
}
function renderSummary(){ var tbody=byId('summaryTable').querySelector('tbody'); tbody.innerHTML=''; var rows=computeSummary(); for(var i=0;i<rows.length;i++){ var r=rows[i]; var tr=document.createElement('tr'); tr.innerHTML='<td>'+escapeHTML(r.restaurant)+'</td><td>'+r.year+'</td><td>'+r.visits+'</td><td>'+fmtEUR(r.avgPP)+'</td><td>⭐ '+fmt2(r.avgRating)+'</td>'; tbody.appendChild(tr); } }
function renderRestaurantFilter(){ var sel=byId('restaurantFilter'); var map={}; for(var i=0;i<state.visits.length;i++){ var k=norm(state.visits[i].restaurant); if(!map[k]) map[k]=state.visits[i].restaurant; } var names=[]; for(var k in map) names.push(map[k]); names.sort(function(a,b){ return a.localeCompare(b); }); var current=sel.value; var html='<option value="">— Elige uno —</option>'; for(var i=0;i<names.length;i++){ html+='<option value="'+escapeHTML(names[i])+'">'+escapeHTML(names[i])+'</option>'; } sel.innerHTML=html; for(var i=0;i<names.length;i++){ if(norm(names[i])===norm(current)){ sel.value=names[i]; break; } } }
function renderHistory(){ var container=byId('historyContainer'); container.innerHTML=''; var name=byId('restaurantFilter').value; if(!name){ container.innerHTML='<p class="muted">Elige un restaurante para ver todas sus visitas agrupadas por año.</p>'; return; } var visits=[]; for(var i=0;i<state.visits.length;i++){ if(norm(state.visits[i].restaurant)===norm(name)) visits.push(state.visits[i]); } visits.sort(function(a,b){ return (b.date||'').localeCompare(a.date||''); }); var byYear={}; for(var i=0;i<visits.length;i++){ var y=yearOf(visits[i].date); if(!byYear[y]) byYear[y]=[]; byYear[y].push(visits[i]); } var years=Object.keys(byYear).map(function(x){return parseInt(x,10);}).sort(function(a,b){return b-a;}); for(var yi=0; yi<years.length; yi++){ var y=years[yi]; var arr=byYear[y]; var avgPP=avg(arr.map(function(v){ return v.diners>0? v.total/v.diners:0; })); var avgRating=avg(arr.map(function(v){ return v.rating||0; })); var group=document.createElement('div'); group.className='group'; group.innerHTML='<h4>'+escapeHTML(name)+' — '+y+' • '+fmtEUR(avgPP)+'/persona • ⭐ '+fmt2(avgRating)+' ('+arr.length+' visitas)</h4>'; var ul=document.createElement('ul'); ul.className='list'; for(var i2=0;i2<arr.length;i2++){ var v=arr[i2]; var li=document.createElement('li'); li.innerHTML='<div><div><span class="badge">'+v.date+'</span> • <strong class="price">'+fmtEUR(v.total)+'</strong> • '+v.diners+' comensales • '+fmtEUR(v.diners>0? v.total/v.diners:0)+'/persona • ⭐ '+v.rating+'</div>'+(v.notes?'<div class="muted">'+escapeHTML(v.notes)+'</div>':'')+'</div><div>'+(v.mapsUrl?'<a class="btn outline" href="'+v.mapsUrl+'" target="_blank" rel="noopener">Mapa</a>':'')+'</div>'; var right=li.children[1]; var editBtn=document.createElement('button'); editBtn.className='btn secondary'; editBtn.textContent='Editar'; (function(id){ editBtn.addEventListener('click', function(){ startEdit(id); }); })(v.id); right.appendChild(editBtn); var delBtn=document.createElement('button'); delBtn.className='btn danger outline'; delBtn.textContent='Eliminar'; (function(id){ delBtn.addEventListener('click', function(){ deleteVisit(id); }); })(v.id); right.appendChild(delBtn); ul.appendChild(li); } group.appendChild(ul); container.appendChild(group); } }
function getActiveVisits(){ return state.visits; }
function computeAggregatedByRestaurantCity(visits){ var map={}; for(var i=0;i<visits.length;i++){ var v=visits[i]; var city=(v.city||'').trim(); var rKey=norm(v.restaurant); var cKey=norm(city); var key=rKey+'|'+cKey; if(!map[key]) map[key]={ restaurant:v.restaurant, city:city, totalsPP:[], ratings:[], count:0, mapsUrl:'', lastDate:'' }; if(v.diners>0) map[key].totalsPP.push(v.total/v.diners); map[key].ratings.push(v.rating||0); map[key].count++; if(v.mapsUrl) map[key].mapsUrl=v.mapsUrl; if(!map[key].lastDate || (v.date||'')>map[key].lastDate) map[key].lastDate=v.date||''; } var out=[]; for(var k in map){ var x=map[k]; out.push({ restaurant:x.restaurant, city:x.city, visits:x.count, avgPP: x.totalsPP.length? avg(x.totalsPP):0, avgRating: x.ratings.length? avg(x.ratings):0, mapsUrl: x.mapsUrl||'' }); } return out; }
function renderCityFilter(){ var sel=byId('cityFilter'); var map={}; var arr=getActiveVisits(); for(var i=0;i<arr.length;i++){ var c=(arr[i].city||'').trim(); if(!c) continue; var k=norm(c); if(!map[k]) map[k]=c; } var names=[]; for(var k in map) names.push(map[k]); names.sort(function(a,b){ return a.localeCompare(b); }); var current=sel.value; var html='<option value="">Todas</option>'; for(var i=0;i<names.length;i++){ html+='<option value="'+escapeHTML(names[i])+'">'+escapeHTML(names[i])+'</option>'; } sel.innerHTML=html; for(var i=0;i<names.length;i++){ if(norm(names[i])===norm(current)){ sel.value=names[i]; break; } } }
function renderExplore(){ renderCityFilter(); var info=byId('exploreInfo'); info.textContent='Explora tus restaurantes por ciudad y valoración.'; var city=byId('cityFilter').value; var minRating=parseInt(byId('minRating').value||'0',10); var sortBy=byId('sortBy').value; var rows=computeAggregatedByRestaurantCity(getActiveVisits()); if(city) rows=rows.filter(function(r){ return norm(r.city||'')===norm(city); }); rows=rows.filter(function(r){ return r.avgRating>=minRating; }); rows.sort(function(a,b){ switch(sortBy){ case 'ratingAsc': return (a.avgRating - b.avgRating) || a.restaurant.localeCompare(b.restaurant); case 'avgPPAsc': return (a.avgPP - b.avgPP) || a.restaurant.localeCompare(b.restaurant); case 'avgPPDesc': return (b.avgPP - a.avgPP) || a.restaurant.localeCompare(b.restaurant); case 'visitsDesc': return (b.visits - a.visits) || (b.avgRating - a.avgRating); case 'ratingDesc': default: return (b.avgRating - a.avgRating) || (b.visits - a.visits); } }); var container=byId('exploreContainer'); if(!rows.length){ container.innerHTML='<p class="muted">No hay resultados con estos filtros.</p>'; return; } var table=document.createElement('table'); table.innerHTML='<thead><tr><th>Restaurante</th><th>Ciudad</th><th>Visitas</th><th>⭐ media</th><th>€/persona</th><th></th></tr></thead><tbody></tbody>'; table.style.minWidth='640px'; var tbody=table.querySelector('tbody'); for(var i=0;i<rows.length;i++){ var r=rows[i]; var tr=document.createElement('tr'); tr.innerHTML='<td>'+escapeHTML(r.restaurant)+'</td><td>'+escapeHTML(r.city||'')+'</td><td>'+r.visits+'</td><td>⭐ '+fmt2(r.avgRating)+'</td><td>'+fmtEUR(r.avgPP)+'</td><td>'+(r.mapsUrl?'<a class="btn outline" href="'+r.mapsUrl+'" target="_blank" rel="noopener">Mapa</a>':'')+'</td>'; tbody.appendChild(tr); } container.innerHTML=''; var wrap=document.createElement('div'); wrap.className='table-wrap'; wrap.appendChild(table); container.appendChild(wrap); }
function renderRestaurantDatalist(){ var dl=byId('restaurantList'); if(!dl) return; var map={}, names=[]; for(var i=0;i<state.visits.length;i++){ var k=norm(state.visits[i].restaurant); if(!map[k]) map[k]=state.visits[i].restaurant; } for(var k in map) names.push(map[k]); names.sort(function(a,b){ return a.localeCompare(b); }); var html=''; for(var i=0;i<names.length;i++){ html+='<option value="'+escapeHTML(names[i])+'"></option>'; } dl.innerHTML=html; }
function deleteVisit(id){ var idx=-1; for(var i=0;i<state.visits.length;i++){ if(state.visits[i].id===id){ idx=i; break; } } if(idx===-1) return; if(confirm('¿Seguro que quieres eliminar esta visita?')){ state.visits.splice(idx,1); save(); renderAll(); } }
function renderAll(){ renderRecent(); renderSummary(); renderRestaurantFilter(); renderHistory(); renderRestaurantDatalist(); renderExplore(); }

/* ===== Supabase (amigos) ===== */
var SUPA={ url: (window.APP_CONFIG&&window.APP_CONFIG.SUPABASE_URL)|| (localStorage.getItem('rt_supabase_url')||''), anon: (window.APP_CONFIG&&window.APP_CONFIG.SUPABASE_ANON_KEY)|| (localStorage.getItem('rt_supabase_anon')||'') };
var supa=null;
function ensureSupa(){ if(!SUPA.url || !SUPA.anon) return null; try{ if(!supa){ supa=window.supabase.createClient(SUPA.url, SUPA.anon); } return supa; }catch(e){ return null; } }
function getCurrentUser(){ var c=ensureSupa(); if(!c) return Promise.resolve(null); return c.auth.getUser().then(function(r){ return (r&&r.data&&r.data.user)||null; }); }
function signInWithEmail(email){ var c=ensureSupa(); if(!c) return Promise.reject(new Error('Configura SUPABASE_URL y ANON_KEY')); var redirect=location.origin + location.pathname; return c.auth.signInWithOtp({ email: email, options: { emailRedirectTo: redirect } }).then(function(r){ if(r&&r.error) throw r.error; return true; }); }
function signOut(){ var c=ensureSupa(); if(!c) return Promise.resolve(); return c.auth.signOut(); }
function upsertProfileUsername(username){ var c=ensureSupa(); if(!c) return Promise.reject(new Error('Configura Supabase')); return getCurrentUser().then(function(user){ if(!user) throw new Error('Inicia sesión'); return c.from('profiles').upsert({ id:user.id, username:username }).select(); }); }
function myShareItemsUsers(){ var rows=computeAggregatedByRestaurantCity(state.visits); return rows.map(function(r){ return { restaurant:r.restaurant, city:r.city||'', avgPP:Number(fmt2(r.avgPP)), avgRating:Number(fmt2(r.avgRating)), visits:r.visits, mapsUrl:r.mapsUrl||'' }; }); }
function publishMySummary(){ var c=ensureSupa(); if(!c) return Promise.reject(new Error('Configura Supabase')); return getCurrentUser().then(function(user){ if(!user) throw new Error('Inicia sesión'); var items=myShareItemsUsers(); return c.from('summaries').upsert({ owner_id:user.id, items:items }).select(); }); }
var autoPublishTimer=null;
function scheduleAutoPublish(){ if(autoPublishTimer) clearTimeout(autoPublishTimer); autoPublishTimer = setTimeout(function(){ var c=ensureSupa(); if(!c){ return; } getCurrentUser().then(function(u){ if(!u) return; publishMySummary().catch(function(){ /* noop */ }); }); }, 1500); }
function fetchFriendSummary(username){ var c=ensureSupa(); if(!c) return Promise.reject(new Error('Configura Supabase')); return c.from('profiles').select('id,username').eq('username', username).maybeSingle().then(function(r){ if(r.error) throw r.error; var prof=(r&&r.data)||null; if(!prof) throw new Error('Usuario no encontrado'); return c.from('summaries').select('items').eq('owner_id', prof.id).maybeSingle(); }); }

function initFriends(){
  var urlIn=byId('supabaseUrlInput'), anonIn=byId('supabaseAnonInput');
  if(urlIn) urlIn.value = SUPA.url||''; if(anonIn) anonIn.value=SUPA.anon||'';
  var saveCfg=byId('saveSupabaseCfgBtn'); if(saveCfg) saveCfg.addEventListener('click', function(){ var u=urlIn.value.trim(); var a=anonIn.value.trim(); localStorage.setItem('rt_supabase_url', u); localStorage.setItem('rt_supabase_anon', a); SUPA.url=u; SUPA.anon=a; supa=null; updateAccountInfo(); alert('Configuración guardada.'); });
  var clearCfg=byId('clearSupabaseCfgBtn'); if(clearCfg) clearCfg.addEventListener('click', function(){ localStorage.removeItem('rt_supabase_url'); localStorage.removeItem('rt_supabase_anon'); SUPA.url=(window.APP_CONFIG&&window.APP_CONFIG.SUPABASE_URL)||''; SUPA.anon=(window.APP_CONFIG&&window.APP_CONFIG.SUPABASE_ANON_KEY)||''; supa=null; if(urlIn) urlIn.value=SUPA.url; if(anonIn) anonIn.value=SUPA.anon; updateAccountInfo(); alert('Configuración borrada.'); });
  var sendML=byId('sendMagicLink'); if(sendML) sendML.addEventListener('click', function(){ try{ var email=byId('authEmail').value.trim(); if(!email){ alert('Introduce un email'); return; } signInWithEmail(email).then(function(){ alert('Te enviamos un enlace de inicio de sesión a tu correo.'); }).catch(function(err){ alert(err.message||err); }); }catch(err){ alert(err.message||err); } });
  var chk=byId('checkSessionBtn'); if(chk) chk.addEventListener('click', function(){ getCurrentUser().then(function(user){ updateAccountInfo(); alert(user? ('Sesión activa: '+(user.email||user.id)) : 'No hay sesión activa.'); }); });
  var out=byId('signOutBtn'); if(out) out.addEventListener('click', function(){ signOut().then(updateAccountInfo); });
  var saveU=byId('saveUsernameBtn'); if(saveU) saveU.addEventListener('click', function(){ var uname=byId('usernameInput').value.trim(); if(!uname){ alert('Introduce un nombre de usuario'); return; } upsertProfileUsername(uname).then(function(){ alert('Nombre de usuario guardado.'); updateAccountInfo(); }).catch(function(err){ alert(err.message||err); }); });
  var pub=byId('publishSummaryBtn'); if(pub) pub.addEventListener('click', function(){ publishMySummary().then(function(){ alert('Resumen publicado/actualizado.'); }).catch(function(err){ alert(err.message||err); }); });
  var lf=byId('loadFriendBtn'); if(lf) lf.addEventListener('click', function(){ var uname=byId('friendUsername').value.trim(); if(!uname){ alert('Introduce el usuario de tu amigo'); return; } fetchFriendSummary(uname).then(function(r){ var items=(r&&r.data&&r.data.items)||[]; renderFriendSummary(items); }).catch(function(err){ alert(err.message||err); }); });
  updateAccountInfo();
}
function updateAccountInfo(){ var info=byId('accountInfo'); var c=ensureSupa(); if(!c){ info.innerHTML='Supabase <strong>no configurado</strong>.'; return; } getCurrentUser().then(function(user){ info.innerHTML = user? ('Conectado: <strong>'+ (user.email||user.id) +'</strong>') : 'No has iniciado sesión.'; }); }
function renderFriendSummary(items){ var cont=byId('friendSummaryContainer'); cont.innerHTML=''; if(!items||!items.length){ cont.innerHTML='<p class="muted">Nada que mostrar.</p>'; return; } var table=document.createElement('table'); table.innerHTML='<thead><tr><th>Restaurante</th><th>Ciudad</th><th>Visitas</th><th>⭐ media</th><th>€/persona</th><th></th></tr></thead><tbody></tbody>'; var tb=table.querySelector('tbody'); for(var i=0;i<items.length;i++){ var r=items[i]; var tr=document.createElement('tr'); tr.innerHTML='<td>'+escapeHTML(r.restaurant)+'</td><td>'+escapeHTML(r.city||'')+'</td><td>'+r.visits+'</td><td>⭐ '+fmt2(r.avgRating||0)+'</td><td>'+fmtEUR(r.avgPP||0)+'</td><td>'+(r.mapsUrl?'<a class="btn outline" href="'+r.mapsUrl+'" target="_blank" rel="noopener">Mapa</a>':'')+'</td>'; tb.appendChild(tr); } var wrap=document.createElement('div'); wrap.className='table-wrap'; wrap.appendChild(table); cont.appendChild(wrap); }

/* ===== Main ===== */
document.addEventListener('DOMContentLoaded', function(){
  try{ initTheme(); }catch(e){}
  load(); initTabs(); initForm(); initDataOps(); initFriends();
  byId('restaurantFilter').addEventListener('change', renderHistory);
  renderAll();
  var jsStatus=byId('jsStatus'); if(jsStatus){ jsStatus.textContent='JS OK'; }
});

})();