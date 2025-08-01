(function(){
'use strict';

/* === Utils === */
// Actualizamos la clave de almacenamiento para separar los datos de versiones anteriores.
// Actualizamos la clave de almacenamiento para la versión 13.7.3
var DB_KEY='visitas_restaurantes_v1373';
var RECENT_FRIENDS_KEY='rt_recent_friends_v1';
function byId(id){return document.getElementById(id);}
function setStep(msg){var el=byId('stepDiag'); if(el){el.textContent=msg;}}
function setMini(msg){var el=byId('miniDiag'); if(el){el.textContent=msg;}}
function fmtEUR(n){try{return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(n||0);}catch(e){return (Math.round((n||0)*100)/100).toFixed(2)+' €';}}
function fmt2(n){return (Math.round((n||0)*100)/100).toFixed(2);}
function norm(s){return (s||'').toString().trim().replace(/\s+/g,' ').toLowerCase();}
function avg(a){return a.length?a.reduce(function(x,y){return x+y;},0)/a.length:0;}
function uid(){return Math.random().toString(36).slice(2)+Date.now().toString(36);}
function todayISO(){var d=new Date();var m=('0'+(d.getMonth()+1)).slice(-2);var day=('0'+d.getDate()).slice(-2);return d.getFullYear()+'-'+m+'-'+day;}
function yearOf(iso){return (new Date(iso+'T12:00:00')).getFullYear();}
function parseNumber(str){var s=(str||'').toString().trim(); if(!s) return 0; s=s.replace(/\./g,''); s=s.replace(',','.'); var n=parseFloat(s); return isNaN(n)?0:n;}

/* === Theme === */
function applyTheme(theme){if(theme==='system'){document.documentElement.removeAttribute('data-theme');}else if(theme==='dark'){document.documentElement.setAttribute('data-theme','dark');}else{document.documentElement.removeAttribute('data-theme');}try{localStorage.setItem('rt_theme',theme);}catch(e){}var isDark=document.documentElement.getAttribute('data-theme')==='dark'||(theme==='system'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);var lab=byId('themeLabel');if(lab){lab.textContent='Tema: '+(isDark?'Oscuro':(theme==='system'?'Automático':'Claro'));}}
function initTheme(){var pref='system';try{pref=localStorage.getItem('rt_theme')||'system';}catch(e){}if(pref==='system'){var d=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);applyTheme(d?'dark':'light');try{localStorage.setItem('rt_theme','system');}catch(e){}}else{applyTheme(pref);}var dEl=byId('chipDark'),lEl=byId('chipLight'),sEl=byId('chipSystem');if(dEl)dEl.addEventListener('click',function(){applyTheme('dark');});if(lEl)lEl.addEventListener('click',function(){applyTheme('light');});if(sEl)sEl.addEventListener('click',function(){applyTheme('system');});}

/* === State === */
var state={visits:[]};
function load(){try{var raw=localStorage.getItem(DB_KEY);state.visits=raw?JSON.parse(raw):[]}catch(e){state.visits=[];}}
function save(){try{localStorage.setItem(DB_KEY,JSON.stringify(state.visits));}catch(e){} try{scheduleAutoPublish();}catch(e){}}

/* === Attachments (IndexedDB) === */
var ATT_DB='rt-attachments',ATT_STORE='files',dbAtt=null;
function openAttDB(){return new Promise(function(res,rej){if(dbAtt){res(dbAtt);return;}var req=indexedDB.open(ATT_DB,1);req.onupgradeneeded=function(e){var db=e.target.result;if(!db.objectStoreNames.contains(ATT_STORE)){db.createObjectStore(ATT_STORE,{keyPath:'key'});}};req.onsuccess=function(e){dbAtt=e.target.result;res(dbAtt);};req.onerror=function(){rej(req.error||new Error('No IDB'));};});}
function attPut(key,blob){return openAttDB().then(function(db){return new Promise(function(res,rej){var tx=db.transaction(ATT_STORE,'readwrite');tx.objectStore(ATT_STORE).put({key:key,type:blob.type||'application/octet-stream',blob:blob,createdAt:Date.now()});tx.oncomplete=function(){res(true);};tx.onerror=function(){rej(tx.error||new Error('No put'));};});});}
function attGet(key){return openAttDB().then(function(db){return new Promise(function(res,rej){var tx=db.transaction(ATT_STORE,'readonly');var rq=tx.objectStore(ATT_STORE).get(key);rq.onsuccess=function(){res(rq.result||null);};rq.onerror=function(){rej(rq.error||new Error('No get'));};});});}
function attDelete(key){return openAttDB().then(function(db){return new Promise(function(res,rej){var tx=db.transaction(ATT_STORE,'readwrite');tx.objectStore(ATT_STORE).delete(key);tx.oncomplete=function(){res(true);};tx.onerror=function(){rej(tx.error||new Error('No del'));};});});}

var stagedAttKeys=[];
function handleAttInput(files){if(!files||!files.length)return;(function next(i){if(i>=files.length){renderAttPreview();return;}var f=files[i];var key='a_'+uid();attPut(key,f).then(function(){stagedAttKeys.push(key);next(i+1);});})(0);}
function renderAttPreview(){var wrap=byId('attPreview');if(!wrap)return;wrap.innerHTML='';var i=0;(function addNext(){if(i>=stagedAttKeys.length)return;var key=stagedAttKeys[i++];attGet(key).then(function(rec){if(!rec){addNext();return;}var url=URL.createObjectURL(rec.blob);var el=document.createElement('div');el.className='att';if((rec.type||'').indexOf('image/')===0){var img=new Image();img.src=url;img.alt='Adjunto';img.loading='lazy';el.appendChild(img);}else{var box=document.createElement('div');box.style.cssText='width:100%;height:80px;display:flex;align-items:center;justify-content:center;color:#fff;';box.textContent='Archivo';el.appendChild(box);}var lab=document.createElement('div');lab.className='label';lab.textContent=((rec.type||'').indexOf('pdf')!==-1)?'PDF':'Foto';el.appendChild(lab);var rm=document.createElement('button');rm.className='remove';rm.type='button';rm.textContent='×';rm.addEventListener('click',function(){attDelete(key).then(function(){stagedAttKeys=stagedAttKeys.filter(function(k){return k!==key;});renderAttPreview();});});el.appendChild(rm);el.addEventListener('click',function(){var w=window.open();if(w){w.document.write('<title>Adjunto</title><style>html,body{margin:0;background:#000}</style>');w.document.write((rec.type||'').indexOf('image/')===0?'<img src=\"'+url+'\" style=\"width:100%\">':'<embed src=\"'+url+'\" type=\"'+rec.type+'\" width=\"100%\" height=\"100%\">');}});wrap.appendChild(el);addNext();});})();}

/* === Tabs === */
function initTabs(){var tabs=document.querySelectorAll('.tab');for(var i=0;i<tabs.length;i++){(function(btn){btn.addEventListener('click',function(){for(var j=0;j<tabs.length;j++)tabs[j].classList.remove('active');btn.classList.add('active');var panels=document.querySelectorAll('.tabpanel');for(var k=0;k<panels.length;k++)panels[k].classList.remove('active');byId('tab-'+btn.getAttribute('data-tab')).classList.add('active');});})(tabs[i]);}}

/* === Form === */
var editingId=null;
function initForm(){
  setStep('initForm');
  byId('date').value=todayISO();
  var attIn=byId('attInput'); if(attIn){attIn.addEventListener('change',function(e){handleAttInput(e.target.files);});}

  function updateAvg(){
    var diners=parseInt(byId('diners').value||'0',10);
    var total=parseNumber(byId('total').value||'0');
    var out = (diners>0)? (fmt2(total/diners)+' €') : '—';
    byId('avgPerDiner').value = out;
    setMini('calc:'+out);
  }
  // Escuchamos más eventos (keypress, mousedown, touchstart, pointerdown) para mejorar compatibilidad móvil
  ['input','change','blur','keyup','keypress','mousedown','touchstart','pointerdown'].forEach(function(ev){
    byId('diners').addEventListener(ev, updateAvg);
    byId('total').addEventListener(ev, updateAvg);
  });

  byId('mapsSearch').addEventListener('click',function(){var name=byId('restaurant').value.replace(/\s+/g,' ').trim();if(!name){alert('Introduce el nombre del restaurante.');return;}var q=encodeURIComponent(name);window.open('https://www.google.com/maps/search/?api=1&query='+q,'_blank');});

  var starsEl=byId('rating'); var hidden=byId('ratingValue');
  function paint(v){
    var bs=starsEl.querySelectorAll('button[data-value]');
    for(var i=0;i<bs.length;i++){
      var val=parseInt(bs[i].getAttribute('data-value'),10);
      var on=val<=v;
      bs[i].classList.toggle('filled',on);
      bs[i].setAttribute('aria-pressed',on?'true':'false');
    }
  }
  setStep('bindStars');
  // Escuchamos varios eventos (click, touchstart, pointerdown, mousedown) para los botones de estrellas para ser compatibles con dispositivos táctiles y ratón.
  ['click','touchstart','pointerdown','mousedown'].forEach(function(evt){
    starsEl.addEventListener(evt, function(e){
      if(e && e.preventDefault) e.preventDefault();
      var b = e.target && e.target.closest ? e.target.closest('button[data-value]') : null;
      if(!b) return;
      hidden.value=b.getAttribute('data-value');
      paint(parseInt(hidden.value,10)||0);
      setStep('star:'+hidden.value);
    }, {passive:false});
  });
  // Manejador para limpiar la valoración usando los mismos eventos.
  ['click','touchstart','pointerdown','mousedown'].forEach(function(evt){
    var rc=byId('ratingClear');
    rc.addEventListener(evt, function(e){
      if(e && e.preventDefault) e.preventDefault();
      hidden.value='0';
      paint(0);
      setStep('star:0');
    }, {passive:false});
  });

  byId('selfTest').addEventListener('click', function(){
    byId('diners').value='4';
    byId('total').value='100,50';
    updateAvg();
    hidden.value='4'; paint(4);
    alert('Prueba ejecutada: promedio y estrellas aplicados. Comprueba los campos.');
  });

  byId('visitForm').addEventListener('submit',function(e){
    e.preventDefault();
    var restaurant=document.getElementById('restaurant').value.trim();
    var city=document.getElementById('city').value.trim();
    var date=document.getElementById('date').value;
    var diners=parseInt(document.getElementById('diners').value,10);
    var total=parseNumber(document.getElementById('total').value);
    var rating=parseInt(document.getElementById('ratingValue').value,10)||0;
    var notes=document.getElementById('notes').value.trim();
    var mapsUrl=document.getElementById('mapsUrl').value.trim();
    if(!restaurant||!date||!diners||isNaN(total)){alert('Completa restaurante, fecha, comensales e importe total.');return;}
    var avg=diners?total/diners:0;

    if(editingId){
      var v=null; for(var i=0;i<state.visits.length;i++){if(state.visits[i].id===editingId){v=state.visits[i];break;}}
      if(v){v.restaurant=restaurant;v.city=city;v.date=date;v.diners=diners;v.total=total;v.avg=avg;v.rating=rating;v.notes=notes;v.mapsUrl=mapsUrl||'';v.attKeys=stagedAttKeys.slice();v.updatedAt=Date.now();}
      state.visits.sort(function(a,b){return (b.date||'').localeCompare(a.date||'');});
    }else{
      var visit={id:uid(),restaurant:restaurant,city:city,date:date,diners:diners,total:total,avg:avg,rating:rating,notes:notes,mapsUrl:mapsUrl||'',attKeys:stagedAttKeys.slice(),updatedAt:Date.now()};
      state.visits.unshift(visit);
    }
    save();
    if(ensureSupa()){ try{ getCurrentUser().then(function(u){ if(u){ syncUpVisit(state.visits[0]).catch(function(){}); } }); }catch(err){} }
    cancelEdit(); renderAll();
  });

  // Inicializa avg visual al cargar
  updateAvg();
  setStep('initForm-ok');
}
function startEdit(id){stagedAttKeys=[];var v=null;for(var i=0;i<state.visits.length;i++){if(state.visits[i].id===id){v=state.visits[i];break;}}if(!v)return;document.querySelector('.tab[data-tab=\"add\"]').click();byId('restaurant').value=v.restaurant;byId('city').value=v.city||'';byId('date').value=v.date;byId('diners').value=v.diners;byId('total').value=v.total;byId('mapsUrl').value=v.mapsUrl||'';byId('notes').value=v.notes||'';byId('ratingValue').value=String(v.rating||0);var diners=parseInt(byId('diners').value||'0',10);var total=parseNumber(byId('total').value||'0');byId('avgPerDiner').value=diners>0?fmt2(total/diners)+' €':'—';var starsEl=byId('rating');var bs=starsEl.querySelectorAll('button[data-value]');for(var i=0;i<bs.length;i++){var val=parseInt(bs[i].getAttribute('data-value'),10);if(val<=v.rating){bs[i].classList.add('filled');bs[i].setAttribute('aria-pressed','true');}else{bs[i].classList.remove('filled');bs[i].setAttribute('aria-pressed','false');}}stagedAttKeys=Array.isArray(v.attKeys)?v.attKeys.slice():[];renderAttPreview();editingId=id;byId('submitBtn').textContent='Guardar cambios';byId('cancelEdit').style.display='inline-flex';byId('visitForm').classList.add('editing');}
function cancelEdit(){editingId=null;byId('submitBtn').textContent='Guardar visita';byId('cancelEdit').style.display='none';byId('visitForm').classList.remove('editing');byId('visitForm').reset();byId('date').value=todayISO();byId('ratingValue').value='0';var starsEl=byId('rating');var bs=starsEl.querySelectorAll('button[data-value]');for(var i=0;i<bs.length;i++){bs[i].classList.remove('filled');bs[i].setAttribute('aria-pressed','false');}byId('avgPerDiner').value='—';stagedAttKeys=[];renderAttPreview();}

/* === Export/Import/Clear === */
function initDataOps(){byId('exportBtn').addEventListener('click',function(){var blob=new Blob([JSON.stringify(state.visits,null,2)],{type:'application/json'});var url=URL.createObjectURL(blob);var a=document.createElement('a');a.href=url;a.download='mis-restaurantes.json';a.click();URL.revokeObjectURL(url);});byId('importInput').addEventListener('change',function(e){var file=e.target.files&&e.target.files[0];if(!file)return;var reader=new FileReader();reader.onload=function(){try{var arr=JSON.parse(reader.result);if(!Array.isArray(arr))throw new Error('Formato no válido');arr=arr.map(function(v){return{id:v.id||uid(),restaurant:String(v.restaurant||'').slice(0,200),city:String(v.city||''),date:v.date,diners:Math.max(1,parseInt(v.diners,10)||1),total:Math.max(0,parseNumber(v.total)||0),avg:Math.max(0,parseFloat(v.avg)||0),rating:Math.max(0,Math.min(5,parseInt(v.rating,10)||0)),notes:String(v.notes||'').slice(0,2000),mapsUrl:String(v.mapsUrl||''),attKeys:Array.isArray(v.attKeys)?v.attKeys:[],updatedAt:Date.now()};});state.visits=arr.sort(function(a,b){return (b.date||'').localeCompare(a.date||'');});save();renderAll();alert('Datos importados.');}catch(err){alert('No se pudo importar: '+err.message);}};reader.readAsText(file);e.target.value='';});byId('clearAll').addEventListener('click',function(){if(confirm('¿Seguro que quieres borrar todas las visitas?')){state.visits=[];save();renderAll();}});}

/* === Summary/History/Explore === */
function renderRecent(){var ul=byId('recentList');ul.innerHTML='';for(var i=0;i<Math.min(8,state.visits.length);i++){var v=state.visits[i];var li=document.createElement('li');var left=document.createElement('div');var right=document.createElement('div');var name=document.createElement('div');name.textContent=v.restaurant;var meta=document.createElement('div');meta.className='muted';var avgText=v.diners?fmtEUR(v.total/v.diners):'—';var cityTxt=v.city?' • 📍 '+v.city:'';meta.textContent=v.date+cityTxt+' • '+avgText+'/persona • ⭐ '+v.rating;left.appendChild(name);left.appendChild(meta);right.innerHTML=v.mapsUrl?'<a class=\"btn outline\" href=\"'+v.mapsUrl+'\" target=\"_blank\" rel=\"noopener\">Mapa</a>':'<button class=\"btn outline\" data-q=\"'+encodeURIComponent(v.restaurant)+'\">Buscar</button>';var eb=document.createElement('button');eb.className='btn secondary';eb.textContent='Editar';(function(id){eb.addEventListener('click',function(){startEdit(id);});})(v.id);right.appendChild(eb);var db=document.createElement('button');db.className='btn danger outline';db.textContent='Eliminar';(function(id){db.addEventListener('click',function(){deleteVisit(id);});})(v.id);right.appendChild(db);right.addEventListener('click',function(e){var btn=e.target&&e.target.closest?e.target.closest('button[data-q]'):null;if(btn){var q=btn.getAttribute('data-q');window.open('https://www.google.com/maps/search/?api=1&query='+q,'_blank');}});li.appendChild(left);li.appendChild(right);ul.appendChild(li);}}
function renderSummary(){var tb=document.querySelector('#summaryTable tbody');tb.innerHTML='';var map={};for(var i=0;i<state.visits.length;i++){var v=state.visits[i];var rKey=norm(v.restaurant);var y=yearOf(v.date);var key=rKey+'|'+y;if(!map[key])map[key]={restaurantDisplay:v.restaurant,year:y,totalsPP:[],ratings:[],count:0};if(v.diners>0)map[key].totalsPP.push(v.total/v.diners);map[key].ratings.push(v.rating||0);map[key].count++;if(!map[key].restaurantDisplay)map[key].restaurantDisplay=v.restaurant;}var rows=[];for(var k in map){var x=map[k];rows.push({restaurant:x.restaurantDisplay,year:x.year,visits:x.count,avgPP:x.totalsPP.length?avg(x.totalsPP):0,avgRating:x.ratings.length?avg(x.ratings):0});}rows.sort(function(a,b){return (b.year-a.year)||a.restaurant.localeCompare(b.restaurant);});for(var i=0;i<rows.length;i++){var r=rows[i];var tr=document.createElement('tr');tr.innerHTML='<td>'+r.restaurant+'</td><td>'+r.year+'</td><td>'+r.visits+'</td><td>'+fmtEUR(r.avgPP)+'</td><td>⭐ '+fmt2(r.avgRating)+'</td>';tb.appendChild(tr);}}
function renderRestaurantFilter(){var sel=byId('restaurantFilter');var map={};for(var i=0;i<state.visits.length;i++){var k=norm(state.visits[i].restaurant);if(!map[k])map[k]=state.visits[i].restaurant;}var names=[];for(var k in map)names.push(map[k]);names.sort(function(a,b){return a.localeCompare(b);});var current=sel.value;var html='<option value=\"\">— Elige uno —</option>';for(var i=0;i<names.length;i++){html+='<option value=\"'+names[i]+'\">'+names[i]+'</option>'; }sel.innerHTML=html;for(var i=0;i<names.length;i++){if(norm(names[i])===norm(current)){sel.value=names[i];break;}}}
function renderHistory(){var container=byId('historyContainer');container.innerHTML='';var name=byId('restaurantFilter').value;if(!name){container.innerHTML='<p class=\"muted\">Elige un restaurante para ver todas sus visitas agrupadas por año.</p>';return;}var visits=[];for(var i=0;i<state.visits.length;i++){if(norm(state.visits[i].restaurant)===norm(name))visits.push(state.visits[i]);}visits.sort(function(a,b){return (b.date||'').localeCompare(a.date||'');});var byYear={};for(var i=0;i<visits.length;i++){var y=yearOf(visits[i].date);if(!byYear[y])byYear[y]=[];byYear[y].push(visits[i]);}var years=Object.keys(byYear).map(function(x){return parseInt(x,10);}).sort(function(a,b){return b-a;});for(var yi=0;yi<years.length;yi++){var y=years[yi];var arr=byYear[y];var avgPP=avg(arr.map(function(v){return v.diners>0?v.total/v.diners:0;}));var avgR=avg(arr.map(function(v){return v.rating||0;}));var group=document.createElement('div');group.className='group';group.innerHTML='<h4>'+name+' — '+y+' • '+fmtEUR(avgPP)+'/persona • ⭐ '+fmt2(avgR)+' ('+arr.length+' visitas)</h4>';var ul=document.createElement('ul');ul.className='list';for(var i2=0;i2<arr.length;i2++){var v=arr[i2];var li=document.createElement('li');li.innerHTML='<div><div><span class=\"badge\">'+v.date+'</span> • <strong class=\"price\">'+fmtEUR(v.total)+'</strong> • '+v.diners+' comensales • '+fmtEUR(v.diners>0?v.total/v.diners:0)+'/persona • ⭐ '+v.rating+'</div>'+(v.notes?'<div class=\"muted\">'+v.notes+'</div>':'')+'</div><div>'+(v.mapsUrl?'<a class=\"btn outline\" href=\"'+v.mapsUrl+'\" target=\"_blank\" rel=\"noopener\">Mapa</a>':'')+'</div>';var right=li.children[1];var eb=document.createElement('button');eb.className='btn secondary';eb.textContent='Editar';(function(id){eb.addEventListener('click',function(){startEdit(id);});})(v.id);right.appendChild(eb);var db=document.createElement('button');db.className='btn danger outline';db.textContent='Eliminar';(function(id){db.addEventListener('click',function(){deleteVisit(id);});})(v.id);right.appendChild(db);ul.appendChild(li);}group.appendChild(ul);container.appendChild(group);}}
function computeAggregatedByRestaurantCity(visits){var map={};for(var i=0;i<visits.length;i++){var v=visits[i];var city=(v.city||'').trim();var rKey=norm(v.restaurant);var cKey=norm(city);var key=rKey+'|'+cKey;if(!map[key])map[key]={restaurant:v.restaurant,city:city,totalsPP:[],ratings:[],count:0,mapsUrl:'',lastDate:''};if(v.diners>0)map[key].totalsPP.push(v.total/v.diners);map[key].ratings.push(v.rating||0);map[key].count++;if(v.mapsUrl)map[key].mapsUrl=v.mapsUrl;if(!map[key].lastDate||(v.date||'')>map[key].lastDate)map[key].lastDate=v.date||'';}var out=[];for(var k in map){var x=map[k];out.push({restaurant:x.restaurant,city:x.city,visits:x.count,avgPP:x.totalsPP.length?avg(x.totalsPP):0,avgRating:x.ratings.length?avg(x.ratings):0,mapsUrl:x.mapsUrl||''});}return out;}
function renderCityFilter(){var sel=byId('cityFilter');var map={};var arr=state.visits;for(var i=0;i<arr.length;i++){var c=(arr[i].city||'').trim();if(!c)continue;var k=norm(c);if(!map[k])map[k]=c;}var names=[];for(var k in map)names.push(map[k]);names.sort(function(a,b){return a.localeCompare(b);});var current=sel.value;var html='<option value=\"\">Todas</option>';for(var i=0;i<names.length;i++){html+='<option value=\"'+names[i]+'\">'+names[i]+'</option>'; }sel.innerHTML=html;for(var i=0;i<names.length;i++){if(norm(names[i])===norm(current)){sel.value=names[i];break;}}}
function renderExplore(){renderCityFilter();var info=byId('exploreInfo');info.textContent='Explora tus restaurantes por ciudad y valoración.';var city=byId('cityFilter').value;var minRating=parseInt(byId('minRating').value||'0',10);var sortBy=byId('sortBy').value;var rows=computeAggregatedByRestaurantCity(state.visits);if(city)rows=rows.filter(function(r){return norm(r.city||'')===norm(city);});rows=rows.filter(function(r){return r.avgRating>=minRating;});rows.sort(function(a,b){switch(sortBy){case'ratingAsc':return (a.avgRating-b.avgRating)||a.restaurant.localeCompare(b.restaurant);case'avgPPAsc':return (a.avgPP-b.avgPP)||a.restaurant.localeCompare(b.restaurant);case'avgPPDesc':return (b.avgPP-a.avgPP)||a.restaurant.localeCompare(b.restaurant);case'visitsDesc':return (b.visits-a.visits)||(b.avgRating-a.avgRating);case'ratingDesc':default:return (b.avgRating-a.avgRating)||(b.visits-a.visits);}});var container=byId('exploreContainer');if(!rows.length){container.innerHTML='<p class=\"muted\">No hay resultados con estos filtros.</p>';return;}var table=document.createElement('table');table.innerHTML='<thead><tr><th>Restaurante</th><th>Ciudad</th><th>Visitas</th><th>⭐ media</th><th>€/persona</th><th></th></tr></thead><tbody></tbody>';table.style.minWidth='640px';var tbody=table.querySelector('tbody');for(var i=0;i<rows.length;i++){var r=rows[i];var tr=document.createElement('tr');tr.innerHTML='<td>'+r.restaurant+'</td><td>'+(r.city||'')+'</td><td>'+r.visits+'</td><td>⭐ '+fmt2(r.avgRating)+'</td><td>'+fmtEUR(r.avgPP)+'</td><td>'+(r.mapsUrl?'<a class=\"btn outline\" href=\"'+r.mapsUrl+'\" target=\"_blank\" rel=\"noopener\">Mapa</a>':'')+'</td>';tbody.appendChild(tr);}container.innerHTML='';var wrap=document.createElement('div');wrap.className='table-wrap';wrap.appendChild(table);container.appendChild(wrap);}

/* === Restaurant datalist === */
function renderRestaurantDatalist(){var dl=document.getElementById('restaurantList');if(!dl)return;var map={},names=[];for(var i=0;i<state.visits.length;i++){var k=norm(state.visits[i].restaurant);if(!map[k])map[k]=state.visits[i].restaurant;}for(var k in map)names.push(map[k]);names.sort(function(a,b){return a.localeCompare(b);});var html='';for(var i=0;i<names.length;i++){html+='<option value=\"'+names[i]+'\"></option>'; }dl.innerHTML=html;}

/* === Delete === */
function deleteVisit(id){var idx=-1;for(var i=0;i<state.visits.length;i++){if(state.visits[i].id===id){idx=i;break;}}if(idx===-1)return;if(confirm('¿Seguro que quieres eliminar esta visita?')){var removed=state.visits[idx];state.visits.splice(idx,1);save(); if(ensureSupa()){ try{ getCurrentUser().then(function(u){ if(u){ syncDeleteVisit(removed.id).catch(function(){}); } }); }catch(e){} } renderAll();}}

/* === Friends recents: datalist + chips === */
function getRecentFriends(){try{return JSON.parse(localStorage.getItem(RECENT_FRIENDS_KEY))||[];}catch(e){return[];}}
function saveRecentFriends(list){try{localStorage.setItem(RECENT_FRIENDS_KEY,JSON.stringify(list));}catch(e){}}
function addRecentFriend(uname){uname=(uname||'').trim().toLowerCase();if(!uname)return;var list=getRecentFriends();if(list.indexOf(uname)===-1){list.unshift(uname);if(list.length>50)list.length=50;saveRecentFriends(list);renderRecentFriendsUI();}}
function renderRecentFriendsUI(){var dl=byId('friendUserList');if(dl){var list=getRecentFriends();dl.innerHTML=list.map(function(u){return '<option value=\"'+u+'\"></option>';}).join('');}var chips=byId('friendRecentChips');if(chips){var list=getRecentFriends();chips.innerHTML=list.length?list.slice(0,10).map(function(u){return '<button class=\"chip\" data-u=\"'+u+'\">'+u+'</button>';}).join(' '):'<span class=\"muted\">Sin recientes</span>';chips.onclick=function(e){var b=e.target&&e.target.closest?e.target.closest('button[data-u]'):null;if(!b)return;byId('friendUsername').value=b.getAttribute('data-u');byId('loadFriendBtn').click();};}}

/* === Supabase (simple friends) + sesiones persistentes === */
var SUPA={url:(window.APP_CONFIG&&window.APP_CONFIG.SUPABASE_URL)||(localStorage.getItem('rt_supabase_url')||''),anon:(window.APP_CONFIG&&window.APP_CONFIG.SUPABASE_ANON_KEY)||(localStorage.getItem('rt_supabase_anon')||'')};
// Deshabilitamos integración con Supabase: siempre retornamos null para evitar errores cuando no hay configuración.
var supa=null;function ensureSupa(){return null;}
function getCurrentUser(){var c=ensureSupa();if(!c)return Promise.resolve(null);return c.auth.getUser().then(function(r){return (r&&r.data&&r.data.user)||null;});}
function signInWithEmail(email){var c=ensureSupa();if(!c)return Promise.reject(new Error('Configura SUPABASE_URL y ANON_KEY'));var redirect=location.origin+location.pathname;return c.auth.signInWithOtp({email:email,options:{emailRedirectTo:redirect}}).then(function(r){if(r&&r.error)throw r.error;return true;});}
function signOut(){var c=ensureSupa();if(!c)return Promise.resolve();return c.auth.signOut();}
function ensureProfileExists(){var c=ensureSupa();if(!c)return Promise.resolve(null);return getCurrentUser().then(function(user){if(!user)return null;return c.from('profiles').select('id,username').eq('id',user.id).maybeSingle().then(function(r){if(r.error)throw r.error;if(r.data){return r.data;}return c.from('profiles').upsert({id:user.id}).select().then(function(res){return res.data&&res.data[0]?res.data[0]:{id:user.id,username:null};});});});}
function validateUsername(u){var v=(u||'').trim().toLowerCase();if(!/^[a-z0-9._]{3,30}$/.test(v))return {ok:false,msg:'Solo minúsculas, números, punto o guion bajo (3–30).'};var reserved=['admin','root','support','help','api','auth','me','null','undefined','public','settings'];if(reserved.indexOf(v)>=0)return {ok:false,msg:'Ese nombre está reservado. Elige otro.'};return {ok:true,value:v};}
function upsertProfileUsername(username){var c=ensureSupa();if(!c)return Promise.reject(new Error('Configura Supabase'));return getCurrentUser().then(function(user){if(!user)throw new Error('Inicia sesión');return c.from('profiles').upsert({id:user.id,username:username}).select();});
function myShareItemsUsers(){var rows=computeAggregatedByRestaurantCity(state.visits);return rows.map(function(r){return {restaurant:r.restaurant,city:r.city||'',avgPP:Number(fmt2(r.avgPP)),avgRating:Number(fmt2(r.avgRating)),visits:r.visits,mapsUrl:r.mapsUrl||''};});}
function publishMySummary(){var c=ensureSupa();if(!c)return Promise.reject(new Error('Configura Supabase'));return getCurrentUser().then(function(user){if(!user)throw new Error('Inicia sesión');var items=myShareItemsUsers();return c.from('summaries').upsert({owner_id:user.id,items:items}).select();});}
var autoPublishTimer=null;function scheduleAutoPublish(){if(autoPublishTimer)clearTimeout(autoPublishTimer);autoPublishTimer=setTimeout(function(){var c=ensureSupa();if(!c){return;}getCurrentUser().then(function(u){if(!u)return;publishMySummary().catch(function(){});});},1500);}
function fetchFriendSummary(username){var c=ensureSupa();if(!c)return Promise.reject(new Error('Configura Supabase'));var uname=(username||'').trim().toLowerCase();return c.from('profiles').select('id,username').ilike('username', uname).maybeSingle().then(function(r){if(r.error)throw r.error;var prof=(r&&r.data)||null;if(!prof)throw new Error('Usuario no encontrado');return c.from('summaries').select('items').eq('owner_id',prof.id).maybeSingle();});}

/* === VISITS sync === */
var SYNC_ENABLED = true;
function mapLocalToRemote(v, ownerId){return {id:v.id,owner_id:ownerId,restaurant:String(v.restaurant||''),city:String(v.city||''),date:v.date,diners:Number(v.diners||0),total:Number(v.total||0),avg:Number(v.avg||0),rating:Number(v.rating||0),notes:String(v.notes||''),maps_url:String(v.mapsUrl||''),updated_at:new Date(v.updatedAt||Date.now()).toISOString()};}
function mapRemoteToLocal(row){return {id:row.id,restaurant:row.restaurant||'',city:row.city||'',date:row.date,diners:row.diners||0,total:row.total||0,avg:row.avg||0,rating:row.rating||0,notes:row.notes||'',mapsUrl:row.maps_url||'',attKeys:[],updatedAt:(row.updated_at? (new Date(row.updated_at)).getTime() : Date.now())};}
function mergeByNewest(localArr, remoteArr){var byId={};for(var i=0;i<localArr.length;i++){byId[localArr[i].id]=localArr[i];}for(var j=0;j<remoteArr.length;j++){var r=remoteArr[j];if(!byId[r.id] || (r.updatedAt||0) > (byId[r.id].updatedAt||0)){ byId[r.id]=r; }}var out=Object.keys(byId).map(function(k){return byId[k];});out.sort(function(a,b){return (b.date||'').localeCompare(a.date||'');});return out;}
function syncDownVisits(){var c=ensureSupa(); if(!c) return Promise.resolve(false);return getCurrentUser().then(function(user){if(!user) return false;return c.from('visits').select('*').eq('owner_id', user.id).order('updated_at', {ascending: false}).then(function(res){if(res.error){console.warn('syncDown error',res.error); return false;}var remote=(res.data||[]).map(mapRemoteToLocal);state.visits=mergeByNewest(state.visits||[],remote);save();renderAll();return true;});});}
function syncUpVisit(v){var c=ensureSupa(); if(!c) return Promise.resolve(false);return getCurrentUser().then(function(user){if(!user) return false;return c.from('visits').upsert(mapLocalToRemote(v,user.id)).then(function(res){if(res.error){console.warn('syncUp error',res.error);return false;}return true;});});}
function syncDeleteVisit(id){var c=ensureSupa(); if(!c) return Promise.resolve(false);return getCurrentUser().then(function(user){if(!user) return false;return c.from('visits').delete().eq('owner_id',user.id).eq('id',id).then(function(res){if(res.error){console.warn('syncDel error',res.error);return false;}return true;});});}
// Simplificamos bootstrapSessionAndSync para no depender de Supabase en esta versión.
function bootstrapSessionAndSync(){
  // Simplemente actualizamos la información de la cuenta local (no autenticación remota).
  try { updateAccountInfo(); } catch(_) {}
  return;
}

/* === Friends UI === */
function initFriends(){var urlIn=byId('supabaseUrlInput'),anonIn=byId('supabaseAnonInput');if(urlIn)urlIn.value=SUPA.url||'';if(anonIn)anonIn.value=SUPA.anon||'';var saveCfg=byId('saveSupabaseCfgBtn');if(saveCfg)saveCfg.addEventListener('click',function(){var u=urlIn.value.trim();var a=anonIn.value.trim();localStorage.setItem('rt_supabase_url',u);localStorage.setItem('rt_supabase_anon',a);SUPA.url=u;SUPA.anon=a;supa=null;updateAccountInfo();alert('Configuración guardada.');});var clearCfg=byId('clearSupabaseCfgBtn');if(clearCfg)clearCfg.addEventListener('click',function(){localStorage.removeItem('rt_supabase_url');localStorage.removeItem('rt_supabase_anon');SUPA.url=(window.APP_CONFIG&&window.APP_CONFIG.SUPABASE_URL)||'';SUPA.anon=(window.APP_CONFIG&&window.APP_CONFIG.SUPABASE_ANON_KEY)||'';supa=null;if(urlIn)urlIn.value=SUPA.url;if(anonIn)anonIn.value=SUPA.anon;updateAccountInfo();alert('Configuración borrada.');});var sendML=byId('sendMagicLink');if(sendML)sendML.addEventListener('click',function(){try{var email=byId('authEmail').value.trim();if(!email){alert('Introduce un email');return;}signInWithEmail(email).then(function(){alert('Te enviamos un enlace de inicio de sesión a tu correo.');}).catch(function(err){alert(err.message||err);});}catch(err){alert(err.message||err);}});var chk=byId('checkSessionBtn');if(chk)chk.addEventListener('click',function(){getCurrentUser().then(function(user){updateAccountInfo();alert(user?('Sesión activa: '+(user.email||user.id)):'No hay sesión activa.');});});var out=byId('signOutBtn');if(out)out.addEventListener('click',function(){signOut().then(function(){updateAccountInfo();});});var saveU=byId('saveUsernameBtn');if(saveU)saveU.addEventListener('click',function(){var uname=byId('usernameInput').value.trim();var chk=validateUsername(uname);if(!chk.ok){alert(chk.msg);return;}upsertProfileUsername(chk.value).then(function(){alert('Nombre de usuario guardado.');updateAccountInfo();}).catch(function(err){if(err&&err.code==='23505'){alert('Ese nombre ya existe. Prueba otro.');}else{alert(err.message||err);}});});var pub=byId('publishSummaryBtn');if(pub)pub.addEventListener('click',function(){publishMySummary().then(function(){alert('Resumen publicado/actualizado.');}).catch(function(err){alert(err.message||err);});});var lf=byId('loadFriendBtn');if(lf)lf.addEventListener('click',function(){var uname=byId('friendUsername').value.trim();if(!uname){alert('Introduce el usuario de tu amigo');return;}fetchFriendSummary(uname).then(function(r){var items=(r&&r.data&&r.data.items)||[];renderFriendSummary(items);addRecentFriend(uname);}).catch(function(err){alert(err.message||err);});});renderRecentFriendsUI();updateAccountInfo();}

// Desactivamos la lógica de la pestaña "Amigos" porque Supabase no está configurado en esta versión. Solo se conservará el inicio de sesión local.
function initFriends(){
  // No hacemos nada aquí: la persistencia del enlace mágico se maneja en DOMContentLoaded.
  return;
}

/* Account info + friend summary render */
function updateAccountInfo(){var info=byId('accountInfo');var c=ensureSupa();if(!c){info.innerHTML='Supabase <strong>no configurado</strong>';return;}getCurrentUser().then(function(user){info.innerHTML=user?('Conectado: <strong>'+(user.email||user.id)+'</strong>'):'No has iniciado sesión.';});}
function renderFriendSummary(items){var cont=byId('friendSummaryContainer');cont.innerHTML='';if(!items||!items.length){cont.innerHTML='<p class=\"muted\">Nada que mostrar.</p>';return;}var table=document.createElement('table');table.innerHTML='<thead><tr><th>Restaurante</th><th>Ciudad</th><th>Visitas</th><th>⭐ media</th><th>€/persona</th><th></th></tr></thead><tbody></tbody>';var tb=table.querySelector('tbody');for(var i=0;i<items.length;i++){var r=items[i];var tr=document.createElement('tr');tr.innerHTML='<td>'+r.restaurant+'</td><td>'+(r.city||'')+'</td><td>'+r.visits+'</td><td>⭐ '+fmt2(r.avgRating||0)+'</td><td>'+fmtEUR(r.avgPP||0)+'</td><td>'+(r.mapsUrl?'<a class=\"btn outline\" href=\"'+r.mapsUrl+'\" target=\"_blank\" rel=\"noopener\">Mapa</a>':'')+'</td>';tb.appendChild(tr);}var wrap=document.createElement('div');wrap.className='table-wrap';wrap.appendChild(table);cont.appendChild(wrap);}

/* === Boot === */
function renderAll(){renderRecent();renderSummary();renderRestaurantFilter();renderHistory();renderExplore();renderRestaurantDatalist();}
document.addEventListener('DOMContentLoaded',function(){
  setStep('DOMContentLoaded');
  try{initTheme();}catch(e){}
  load(); initTabs(); initForm(); initDataOps(); renderAll();
  var jsStatus=byId('jsStatus'); if(jsStatus)jsStatus.textContent='JS OK';
  initFriends(); bootstrapSessionAndSync();
  // Añadimos persistencia de registro. Si el usuario ya se registró previamente mediante el enlace mágico,
  // deshabilitamos el formulario de login y actualizamos el botón. Además, marcamos el registro la primera vez.
  try {
    var emailInput = byId('authEmail');
    var magicBtn   = byId('sendMagicLink');
    var registered = false;
    try { registered = localStorage.getItem('rt_is_registered') === 'true'; } catch(_e) { registered = false; }
    if(registered) {
      if(emailInput) emailInput.disabled = true;
      if(magicBtn) {
        magicBtn.disabled = true;
        magicBtn.textContent = 'Ya registrado';
      }
    }
    if(magicBtn) {
      magicBtn.addEventListener('click', function(e) {
        try {
          var em = emailInput ? emailInput.value.trim() : '';
          if(em) {
            try { localStorage.setItem('rt_is_registered', 'true'); } catch(_) {}
            if(emailInput) emailInput.disabled = true;
            if(magicBtn) {
              magicBtn.disabled = true;
              magicBtn.textContent = 'Enlace enviado';
            }
          }
        } catch(_) {}
      }, { once: true });
    }
  } catch(_err) {}
  try{var c=ensureSupa(); if(c){c.auth.onAuthStateChange(function(){updateAccountInfo(); if(SYNC_ENABLED){ syncDownVisits(); }});}}catch(e){}
  setStep('ready');
});
}
})();
