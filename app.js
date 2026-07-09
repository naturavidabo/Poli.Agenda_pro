'use strict';

const APP_VERSION = '2.2.0';
const MEDIA_CACHE = 'poliagenda-media-v1';
const DB_NAME = 'poliagenda-db';
const DB_VERSION = 4;
const STORE = 'kv';
const DAYS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const WEEK_DAYS = ['Lunes','Martes','Miércoles','Jueves','Viernes'];
const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

const state = {
  view: new URLSearchParams(location.search).get('view') || 'home',
  academicSub: 'overview',
  libraryDoc: null,
  libraryQuery: '',
  libraryFilter: '',
  reminderTab: 'pending',
  scheduleDay: DAYS[new Date().getDay()] === 'Domingo' || DAYS[new Date().getDay()] === 'Sábado' ? 'Lunes' : DAYS[new Date().getDay()],
  uniformes: null,
  sumario: null,
  baseSchedule: null,
  settings: { academicMode: true },
  deferredInstall: null,
  swRegistration: null,
  modal: null,
};

const app = document.getElementById('app');
const toastEl = document.getElementById('toast');
const updateBanner = document.getElementById('updateBanner');
const applyUpdateBtn = document.getElementById('applyUpdateBtn');

const iconPaths = {
  home:'<path d="M3 11.5 12 4l9 7.5v8a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H4.5A1.5 1.5 0 0 1 3 19.5z"/><path d="M9 21v-6h6v6"/>',
  book:'<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11a3 3 0 0 1 3 3v15a3 3 0 0 0-3-3H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H14v18a3 3 0 0 1 3-3h.5A2.5 2.5 0 0 1 20 20.5z"/>',
  academic:'<path d="m3 10 9-5 9 5-9 5z"/><path d="M7 12.2V17c3 2 7 2 10 0v-4.8"/><path d="M21 10v6"/>',
  briefcase:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/>',
  bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
  more:'<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  location:'<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0"/><circle cx="12" cy="10" r="2.5"/>',
  uniform:'<path d="m8 4 4 2 4-2 4 4-3 2v11H7V10L4 8z"/><path d="M9 4c0 2 1.2 3 3 3s3-1 3-3"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  checklist:'<path d="m4 6 2 2 4-4M4 13l2 2 4-4M4 20l2 2 4-4"/><path d="M13 6h7M13 13h7M13 20h7"/>',
  shield:'<path d="M12 3 5 6v5c0 5 3.5 8.5 7 10 3.5-1.5 7-5 7-10V6z"/><path d="m9 12 2 2 4-4"/>',
  scale:'<path d="M12 3v18M5 6h14M6 6 3 12h6zM18 6l-3 6h6zM8 21h8"/>',
  alert:'<path d="M12 3 2.5 20h19z"/><path d="M12 9v4M12 17h.01"/>',
  edit:'<path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10z"/><path d="m14 7 3 3"/>',
  trash:'<path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/>',
  archive:'<rect x="3" y="5" width="18" height="4" rx="1"/><path d="M5 9v11h14V9M10 13h4"/>',
  check:'<path d="m5 12 4 4 10-10"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  back:'<path d="m15 18-6-6 6-6"/>',
  download:'<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>',
  upload:'<path d="M12 21V9M7 14l5-5 5 5"/><path d="M5 3h14"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1z"/>',
  install:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M12 7v7M9 11l3 3 3-3M10 18h4"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  chevron:'<path d="m9 18 6-6-6-6"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  link:'<path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2"/>',
  history:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  image:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 20"/>',
};

function icon(name, className='') {
  return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || iconPaths.info}</svg>`;
}

function escapeHtml(value='') {
  return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}
function attr(value='') { return escapeHtml(value).replace(/`/g,'&#96;'); }
function formatDate(value, long=false) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat('es-BO', long ? {weekday:'long',day:'numeric',month:'long',year:'numeric'} : {day:'2-digit',month:'2-digit',year:'numeric'}).format(d);
}
function todayISO(){ return new Date().toISOString().slice(0,10); }
function nowISO(){ return new Date().toISOString(); }
function uid(prefix='id'){ return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`; }
function normalize(value='') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/n\.?\s*[°ºo]/g,' n ')
    .replace(/[\-–—_/.,;:()\[\]{}*#"'!?]/g,' ')
    .replace(/\s+/g,' ').trim();
}
function compact(value=''){ return normalize(value).replace(/\s+/g,'').replace(/^n(?=\d)/,''); }
function excerpt(text='', max=220){ const clean=String(text).replace(/\s+/g,' ').trim(); return clean.length > max ? `${clean.slice(0,max).trim()}…` : clean; }
function isStandalone(){ return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; }
function safeExternalUrl(value=''){ try{ const u=new URL(value,location.href); return ['http:','https:'].includes(u.protocol)?u.href:''; }catch(_){ return ''; } }

function openDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function dbGet(key, fallback){
  try{
    const db=await openDB();
    return await new Promise(resolve=>{
      const tx=db.transaction(STORE,'readonly');
      const req=tx.objectStore(STORE).get(key);
      req.onsuccess=()=>resolve(req.result ?? fallback);
      req.onerror=()=>resolve(fallback);
    });
  }catch(e){ console.error(e); return fallback; }
}
async function dbSet(key,value){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).put(value,key);
    tx.oncomplete=()=>resolve(true);
    tx.onerror=()=>reject(tx.error);
  });
}
async function dbDelete(key){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');
    tx.objectStore(STORE).delete(key);
    tx.oncomplete=()=>resolve(true);
    tx.onerror=()=>reject(tx.error);
  });
}

function toast(message){
  toastEl.textContent=message;
  toastEl.classList.add('show');
  clearTimeout(toastEl._timer);
  toastEl._timer=setTimeout(()=>toastEl.classList.remove('show'),2800);
}
function modal(html, onOpen){
  closeModal();
  document.body.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" id="modalBackdrop"><section class="modal" role="dialog" aria-modal="true"><div class="modal-handle"></div>${html}</section></div>`);
  const backdrop=document.getElementById('modalBackdrop');
  backdrop.addEventListener('click',e=>{ if(e.target===backdrop) closeModal(); });
  document.body.style.overflow='hidden';
  if(onOpen) requestAnimationFrame(onOpen);
}
function closeModal(){
  document.getElementById('modalBackdrop')?.remove();
  document.body.style.overflow='';
}

async function loadData(){
  const [uniformes,sumario,baseSchedule]=await Promise.all([
    fetch('./data/reglamento-uniformes.json').then(r=>{if(!r.ok)throw new Error('uniformes');return r.json();}),
    fetch('./data/reglamento-sumario-unipol.json').then(r=>{if(!r.ok)throw new Error('sumario');return r.json();}),
    fetch('./data/horario-base.json').then(r=>{if(!r.ok)throw new Error('horario');return r.json();}),
  ]);
  state.uniformes=uniformes; state.sumario=sumario; state.baseSchedule=baseSchedule;
}
async function migrateAndSeed(){
  state.settings=await dbGet('settings',{academicMode:true,scheduleInitialized:false});
  if(typeof state.settings.academicMode!=='boolean') state.settings.academicMode=true;
  let schedule=await dbGet('horarioSemanal',[]);
  if(!Array.isArray(schedule)) schedule=[];
  if(schedule.length && state.settings.scheduleInitialized!==true){
    state.settings.scheduleInitialized=true;
    await dbSet('settings',state.settings);
  }
  if(schedule.length===0 && state.settings.scheduleInitialized!==true){
    schedule=state.baseSchedule.entradas.map(x=>({...x,created:nowISO(),source:'base-2026'}));
    await dbSet('horarioSemanal',schedule);
    await dbSet('scheduleMeta',state.baseSchedule.metadatos);
    state.settings.scheduleInitialized=true;
    await dbSet('settings',state.settings);
  }
  let reminders=await dbGet('pendientes',[]);
  if(!Array.isArray(reminders)) reminders=[];
  reminders=reminders.map(x=>({
    ...x,
    id:x.id||uid('reminder'),
    title:x.title||x.titulo||'Recordatorio',
    prio:x.prio||'Normal',
    tipo:x.tipo||'Instrucción',
    done:!!x.done,
    archived:!!x.archived,
    created:x.created||nowISO(),
  }));
  await dbSet('pendientes',reminders);
  let agenda=await dbGet('agenda',[]);
  if(!Array.isArray(agenda)) agenda=[];
  agenda=agenda.map(x=>({...x,id:x.id||uid('agenda'),tipo:x.tipo||'actividad',created:x.created||nowISO()}));
  await dbSet('agenda',agenda);
  schedule=schedule.map(x=>({...x,id:x.id||uid('schedule'),observacion:x.observacion||x.obs||'',created:x.created||nowISO()}));
  await dbSet('horarioSemanal',schedule);
  let histories=await dbGet('historialHorarios',[]);
  if(!Array.isArray(histories)) histories=[];
  histories=histories.map(h=>({...h,id:h.id||uid('history'),items:Array.isArray(h.items)?h.items:[],created:h.created||nowISO()}));
  await dbSet('historialHorarios',histories);
  let favorites=await dbGet('favorites',[]);
  if(!Array.isArray(favorites)) favorites=[];
  await dbSet('favorites',favorites);
}

function headerTemplate(){
  const date=new Intl.DateTimeFormat('es-BO',{day:'numeric',month:'short',year:'numeric'}).format(new Date()).replace('.','').toUpperCase();
  return `<header class="app-header">
    <div class="header-top">
      <div class="brand-mark"><img src="./assets/escudo-policia.png" alt="Emblema de la Policía Boliviana"></div>
      <div class="brand-copy"><h1>PoliAgenda Pro</h1><p>Biblioteca, agenda y ayuda memoria policial</p></div>
      <div class="date-chip">${escapeHtml(date)}</div>
    </div>
    <div class="header-search">
      <label class="search-box" aria-label="Buscar en la biblioteca">
        ${icon('search')}
        <input id="globalSearch" type="search" placeholder="Buscar: 3B, artículo 55, marbete, atraso…" autocomplete="off" value="${attr(state.libraryQuery)}">
      </label>
    </div>
  </header>`;
}
function bottomNavTemplate(){
  const academic=state.settings.academicMode;
  const items=[
    ['home','home','Inicio'],
    ['library','book','Biblioteca'],
    [academic?'academic':'professional',academic?'academic':'briefcase',academic?'Académico':'Profesional'],
    ['reminders','bell','Recordatorios'],
    ['more','more','Más'],
  ];
  return `<nav class="bottom-nav" aria-label="Navegación principal">${items.map(([view,ico,label])=>`<button type="button" class="nav-btn ${state.view===view?'active':''}" data-nav="${view}">${icon(ico)}<span>${label}</span></button>`).join('')}</nav>`;
}
async function render(){
  let content='';
  try{
    if(state.view==='home') content=await renderHome();
    else if(state.view==='library') content=await renderLibrary();
    else if(state.view==='academic') content=await renderAcademic();
    else if(state.view==='professional') content=await renderProfessional();
    else if(state.view==='reminders') content=await renderReminders();
    else content=await renderMore();
  }catch(e){
    console.error(e);
    content=`<div class="card danger"><h3>No se pudo cargar esta sección</h3><p>${escapeHtml(e.message||String(e))}</p><div class="actions"><button class="btn primary" data-nav="home">Volver al inicio</button></div></div>`;
  }
  app.innerHTML=`<div class="app-shell">${headerTemplate()}<main class="main">${content}</main>${bottomNavTemplate()}</div>`;
  bindCommonEvents();
}
function bindCommonEvents(){
  document.querySelectorAll('[data-nav]').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.nav)));
  const search=document.getElementById('globalSearch');
  if(search){
    search.addEventListener('keydown',e=>{if(e.key==='Enter'){state.libraryQuery=search.value.trim();state.libraryDoc=null;state.libraryFilter='';navigate('library');}});
    search.addEventListener('search',()=>{if(!search.value){state.libraryQuery=''; if(state.view==='library') render();}});
  }
}
function navigate(view){
  state.view=view;
  if(view==='academic' && !state.settings.academicMode) state.view='professional';
  history.replaceState(null,'',`${location.pathname}${view!=='home'?`?view=${view}`:''}`);
  window.scrollTo({top:0,behavior:'smooth'});
  render();
}

async function renderHome(){
  const agenda=await dbGet('agenda',[]);
  const reminders=await dbGet('pendientes',[]);
  const schedule=await dbGet('horarioSemanal',[]);
  const today=todayISO();
  const formation=agenda.filter(x=>x.fecha===today && (x.tipo==='formacion'||x.tipo==='Formación')).sort((a,b)=>(b.created||'').localeCompare(a.created||''))[0];
  const pending=reminders.filter(x=>!x.done && !x.archived).sort(sortReminders);
  const latest=reminders.filter(x=>!x.archived).sort((a,b)=>(b.created||'').localeCompare(a.created||''))[0];
  const nextClass=findNextClass(schedule);
  return `<div class="page-title"><div><h2>Tu día, en un vistazo</h2><p>${escapeHtml(formatDate(today,true))}</p></div></div>
    <div class="stack">
      ${state.settings.academicMode ? `<article class="card accent">
        <div class="card-head"><div class="icon-tile gold">${icon('academic')}</div><div class="card-main"><h3>Formación de hoy</h3>
        ${formation?`<div class="card-meta"><span class="badge">${icon('uniform')} ${escapeHtml(formation.uniforme||'Uniforme pendiente')}</span><span class="badge gold">${icon('clock')} ${escapeHtml(formation.hora||formation.formacion||'Sin hora')}</span></div>
        <dl class="kv"><dt>Arribo</dt><dd>${escapeHtml(formation.arribo||'-')}</dd><dt>Parte</dt><dd>${escapeHtml(formation.parte||'-')}</dd><dt>Lugar</dt><dd>${escapeHtml(formation.lugar||'No registrado')}</dd></dl>`:`<p>No registraste una formación para hoy.</p>`}
        <div class="actions"><button class="btn primary small" data-action="open-formation">${formation?'Ver o editar':'Registrar formación'}</button></div></div></div>
      </article>`:''}
      ${state.settings.academicMode ? `<article class="card"><div class="card-head"><div class="icon-tile">${icon('clock')}</div><div class="card-main"><h3>Próxima actividad académica</h3>${nextClass?`<p><strong>${escapeHtml(nextClass.materia)}</strong></p><div class="card-meta"><span class="badge">${escapeHtml(nextClass.dia)} ${escapeHtml(nextClass.inicio)}-${escapeHtml(nextClass.fin)}</span>${nextClass.docente?`<span class="badge blue">${escapeHtml(nextClass.docente)}</span>`:''}</div>`:`<p>No hay una actividad próxima en el horario vigente.</p>`}<div class="actions"><button class="btn secondary small" data-action="open-schedule">Ver horario</button></div></div></div></article>`:''}
      <div class="stat-row"><div class="stat"><b>${pending.length}</b><span>recordatorios pendientes</span></div><div class="stat"><b>${state.sumario.articulos.length + state.uniformes.articulos.length}</b><span>artículos consultables</span></div></div>
      <article class="card"><div class="card-head"><div class="icon-tile">${icon('checklist')}</div><div class="card-main"><h3>Pendientes prioritarios</h3>${pending.length?pending.slice(0,3).map(r=>`<p>• ${escapeHtml(r.title||r.titulo||'Sin título')}${r.date?` · ${escapeHtml(formatDate(r.date))}`:''}</p>`).join(''):'<p>No tienes pendientes activos.</p>'}<div class="actions"><button class="btn primary small" data-nav="reminders">Abrir recordatorios</button><button class="btn secondary small" data-action="new-instruction">Nueva instrucción</button></div></div></div></article>
      ${latest?`<article class="card info"><div class="card-head"><div class="icon-tile">${icon('bell')}</div><div class="card-main"><h3>Última instrucción guardada</h3><p><strong>${escapeHtml(latest.title||latest.titulo||'Recordatorio')}</strong></p><p>${escapeHtml(excerpt(latest.obs||latest.raw||'',150))}</p></div></div></article>`:''}
    </div>`;
}
function findNextClass(schedule){
  const now=new Date(); const todayName=DAYS[now.getDay()]; const mins=now.getHours()*60+now.getMinutes();
  const order=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
  const start=Math.max(0,order.indexOf(todayName));
  for(let offset=0;offset<7;offset++){
    const day=order[(start+offset)%7];
    const candidates=schedule.filter(x=>x.dia===day && x.tipo!=='descanso').sort((a,b)=>(a.inicio||'').localeCompare(b.inicio||''));
    for(const item of candidates){
      if(offset>0) return item;
      const [h,m]=(item.inicio||'00:00').split(':').map(Number);
      if(h*60+m>=mins) return item;
    }
  }
  return null;
}

async function renderLibrary(){
  const query=state.libraryQuery;
  const filter=state.libraryFilter;
  let body='';
  if(query) body=renderLibraryResults(query);
  else if(filter) body=filter==='__favorites__' ? await renderFavoriteArticles() : renderQuickFilter(filter);
  else if(state.libraryDoc) body=renderDocumentList(state.libraryDoc);
  else body=`<div class="quick-grid">
      <article class="card doc-cover"><div class="doc-cover-media"><img src="./assets/escudo-policia.png" alt="Escudo de la Policía Boliviana"></div><div class="doc-cover-body"><h3>Reglamento de Uniformes</h3><p>52 artículos, prendas, emblemas, grados y uniformes con referencia visual al documento oficial.</p><div class="card-meta"><span class="badge">52 artículos</span><span class="badge gold">PDF original</span></div><div class="actions"><button class="btn primary full" data-doc="uniformes">Abrir reglamento</button></div></div></article>
      <article class="card doc-cover"><div class="doc-cover-media" style="background:linear-gradient(145deg,#15364a,#245f88)">${icon('scale','hero-icon')}</div><div class="doc-cover-body"><h3>Reglamento Comisión Sumaria</h3><p>Artículos 1 al 92, faltas, sanciones, procedimiento, prescripción y recursos.</p><div class="card-meta"><span class="badge blue">92 artículos</span><span class="badge">Texto completo</span></div><div class="actions"><button class="btn primary full" data-doc="sumario">Abrir reglamento</button></div></div></article>
    </div>
    <div class="section-title"><h3>Accesos rápidos</h3></div>
    <div class="tabs">
      <button class="tab" data-filter="__favorites__">★ Favoritos</button>
      ${['Faltas leves','Faltas graves','Faltas gravísimas','Sanciones','Prescripción','Uniforme 3B','Insignias','Marbete'].map(x=>`<button class="tab" data-filter="${attr(x)}">${escapeHtml(x)}</button>`).join('')}
    </div>`;
  return `<div class="page-title"><div><h2>Biblioteca normativa</h2><p>Consulta artículos, uniformes y faltas sin recorrer el PDF manualmente.</p></div></div>${body}`;
}
function renderQuickFilter(filter){
  const uniformes=state.uniformes.articulos.map(a=>({...a,_doc:'uniformes'}));
  const sumario=state.sumario.articulos.map(a=>({...a,_doc:'sumario'}));
  const byNumber=(list,numbers)=>list.filter(a=>numbers.includes(Number((a.numero.match(/\d+/)||[])[0])));
  const maps={
    'Faltas leves':byNumber(sumario,[53]),
    'Faltas graves':byNumber(sumario,[54]),
    'Faltas gravísimas':byNumber(sumario,[55]),
    'Sanciones':byNumber(sumario,[59,60,61,62,63,64,65]),
    'Prescripción':byNumber(sumario,[67,68]),
    'Uniforme 3B':byNumber(uniformes,[43,44]),
    'Insignias':byNumber(uniformes,[8,9,10,11,12,13]),
    'Marbete':byNumber(uniformes,[14,15]),
  };
  const results=maps[filter]||[];
  return `<div class="actions" style="margin:0 0 12px"><button class="btn secondary small" data-action="library-back">${icon('back')} Biblioteca</button></div><div class="section-title"><h3>${escapeHtml(filter)}</h3><small>${results.length} ${results.length===1?'artículo':'artículos'}</small></div><div class="search-results">${results.map(articleCard).join('')||`<div class="card empty">${icon('search')}<p>No hay artículos en este acceso.</p></div>`}</div>`;
}
async function renderFavoriteArticles(){
  const favs=await dbGet('favorites',[]);
  const docs=[...state.uniformes.articulos.map(a=>({...a,_doc:'uniformes'})),...state.sumario.articulos.map(a=>({...a,_doc:'sumario'}))];
  const results=docs.filter(a=>favs.includes(`${a._doc}:${a.id}`));
  return `<div class="actions" style="margin:0 0 12px"><button class="btn secondary small" data-action="library-back">${icon('back')} Biblioteca</button></div><div class="section-title"><h3>Favoritos</h3><small>${results.length}</small></div><div class="search-results">${results.length?results.map(articleCard).join(''):`<div class="card empty">${icon('book')}<p>Todavía no agregaste artículos a favoritos.</p></div>`}</div>`;
}
function renderLibraryResults(term){
  const q=normalize(term), qc=compact(term);
  const docs=[...state.uniformes.articulos.map(a=>({...a,_doc:'uniformes'})),...state.sumario.articulos.map(a=>({...a,_doc:'sumario'}))];
  const results=docs.map(a=>{
    const hay=[a.numero,a.titulo,a.texto,...(a.alias_busqueda||[]),...(a.palabras_clave||[])].join(' ');
    const n=normalize(hay), c=compact(hay);
    let score=0;
    if(normalize(a.numero)===q) score+=100;
    if(normalize(a.titulo).includes(q)) score+=40;
    if(n.includes(q)) score+=20;
    if(qc.length>=2 && c.includes(qc)) score+=25;
    for(const token of q.split(' ')) if(token && n.includes(token)) score+=3;
    return {a,score};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,100);
  return `<div class="section-title"><h3>Resultados</h3><small>${results.length} coincidencias</small></div>
    <div class="search-results">${results.length?results.map(({a})=>articleCard(a)).join(''):`<div class="card empty">${icon('search')}<p>No se encontraron coincidencias para “${escapeHtml(term)}”.</p></div>`}</div>`;
}
function renderDocumentList(doc){
  const data=doc==='uniformes'?state.uniformes:state.sumario;
  return `<div class="actions" style="margin:0 0 12px"><button class="btn secondary small" data-action="library-back">${icon('back')} Documentos</button>${doc==='uniformes'?`<a class="btn ghost small" href="./assets/reglamento-uniformes-2021.pdf" target="_blank" rel="noopener">Ver PDF original</a>`:''}</div>
    <div class="section-title"><h3>${doc==='uniformes'?'Reglamento de Uniformes':'Reglamento Comisión Sumaria'}</h3><small>${data.articulos.length} artículos</small></div>
    <div class="search-results">${data.articulos.map(a=>articleCard({...a,_doc:doc})).join('')}</div>`;
}
function articleCard(a){
  return `<article class="article-card"><button type="button" data-article-doc="${a._doc}" data-article-id="${attr(a.id)}"><div class="article-number">${escapeHtml(a.numero)} · ${a._doc==='uniformes'?'Uniformes':'Comisión Sumaria'}</div><h4>${escapeHtml(a.titulo)}</h4><p>${escapeHtml(excerpt(a.texto))}</p>${a.pagina_inicio?`<div class="card-meta"><span class="badge">Página ${a.pagina_inicio}${a.pagina_fin>a.pagina_inicio?`-${a.pagina_fin}`:''}</span></div>`:''}</button></article>`;
}
function openArticle(doc,id){
  const source=doc==='uniformes'?state.uniformes:state.sumario;
  const a=source.articulos.find(x=>x.id===id); if(!a) return;
  const favKey=`${doc}:${id}`;
  dbGet('favorites',[]).then(favs=>{
    const isFav=favs.includes(favKey);
    const images=a.imagenes_asociadas||[];
    modal(`<div class="modal-header"><div><div class="article-number">${escapeHtml(a.numero)}</div><h3>${escapeHtml(a.titulo)}</h3></div><button class="modal-close" data-close-modal aria-label="Cerrar">${icon('close')}</button></div>
      <div class="card-meta"><span class="badge">${doc==='uniformes'?'Reglamento de Uniformes':'Comisión Sumaria UNIPOL'}</span>${a.pagina_inicio?`<span class="badge gold">Página ${a.pagina_inicio}${a.pagina_fin>a.pagina_inicio?`-${a.pagina_fin}`:''}</span>`:''}</div>
      <div class="article-body">${escapeHtml(a.texto)}</div>
      ${images.length?`<div class="section-title"><h3>Referencia visual</h3></div><div class="article-image"><img id="articleMainImage" src="./${attr(images[0])}" alt="Página original relacionada" loading="lazy"></div>${images.length>1?`<div class="image-strip">${images.map((img,i)=>`<button class="${i===0?'active':''}" data-image-src="./${attr(img)}"><img src="./${attr(img)}" alt="Página ${a.pagina_inicio+i}" loading="lazy"></button>`).join('')}</div>`:''}`:''}
      <div class="actions"><button class="btn ${isFav?'gold':'secondary'}" id="favoriteBtn" data-fav-key="${attr(favKey)}">${isFav?'★ Favorito':'☆ Agregar a favoritos'}</button>${doc==='uniformes'&&a.pagina_inicio?`<a class="btn ghost" href="./assets/reglamento-uniformes-2021.pdf#page=${a.pagina_inicio}" target="_blank" rel="noopener">Abrir PDF</a>`:''}</div>`,()=>bindArticleModal());
  });
}
function bindArticleModal(){
  document.querySelector('[data-close-modal]')?.addEventListener('click',closeModal);
  document.querySelectorAll('[data-image-src]').forEach(btn=>btn.addEventListener('click',()=>{
    document.getElementById('articleMainImage').src=btn.dataset.imageSrc;
    document.querySelectorAll('[data-image-src]').forEach(x=>x.classList.remove('active'));btn.classList.add('active');
  }));
  document.getElementById('favoriteBtn')?.addEventListener('click',async e=>{
    const key=e.currentTarget.dataset.favKey; let fav=await dbGet('favorites',[]);
    if(fav.includes(key)) fav=fav.filter(x=>x!==key); else fav.push(key);
    await dbSet('favorites',fav); toast(fav.includes(key)?'Agregado a favoritos':'Quitado de favoritos'); closeModal();
  });
}

async function renderAcademic(){
  if(!state.settings.academicMode) return renderProfessional();
  if(state.academicSub==='formation') return renderFormationPage();
  if(state.academicSub==='schedule') return renderSchedulePage();
  if(state.academicSub==='history') return renderScheduleHistoryPage();
  const agenda=await dbGet('agenda',[]); const schedule=await dbGet('horarioSemanal',[]); const histories=await dbGet('historialHorarios',[]);
  const today=agenda.find(x=>x.fecha===todayISO() && normalize(x.tipo).includes('formacion'));
  return `<div class="page-title"><div><h2>Modo académico</h2><p>La información académica está separada y puede ocultarse desde Configuración.</p></div></div>
    <div class="stack">
      <article class="card"><div class="card-head"><div class="icon-tile gold">${icon('location')}</div><div class="card-main"><h3>Formación del día</h3><p>${today?`${escapeHtml(today.hora||'Sin hora')} · ${escapeHtml(today.lugar||'Lugar pendiente')} · ${escapeHtml(today.uniforme||'Uniforme pendiente')}`:'Uniforme, arribo, formación, parte, lugar y observaciones.'}</p><div class="actions"><button class="btn primary" data-academic-sub="formation">Abrir formación</button></div></div></div></article>
      <article class="card"><div class="card-head"><div class="icon-tile">${icon('calendar')}</div><div class="card-main"><h3>Horario semanal</h3><p>${schedule.length} bloques cargados. Horario del Segundo Semestre 2026, editable por materia y parcial.</p><div class="actions"><button class="btn primary" data-academic-sub="schedule">Ver horario</button></div></div></div></article>
      <article class="card"><div class="card-head"><div class="icon-tile">${icon('history')}</div><div class="card-main"><h3>Historial de parciales</h3><p>${histories.length} horarios guardados como referencia.</p><div class="actions"><button class="btn secondary" data-academic-sub="history">Abrir historial</button></div></div></div></article>
    </div>`;
}
async function renderFormationPage(){
  const agenda=await dbGet('agenda',[]);
  const entries=agenda.filter(x=>normalize(x.tipo).includes('formacion')).sort((a,b)=>(b.fecha||'').localeCompare(a.fecha||'') || (b.created||'').localeCompare(a.created||''));
  const today=entries.find(x=>x.fecha===todayISO())||{};
  return `<div class="actions" style="margin:0 0 12px"><button class="btn secondary small" data-academic-sub="overview">${icon('back')} Académico</button></div>
    <div class="page-title"><div><h2>Formación del día</h2><p>Campos amplios y guardado visible para trabajar cómodamente desde el celular.</p></div></div>
    <form class="form-card" id="formationForm">
      <input type="hidden" id="formationId" value="${attr(today.id||'')}">
      <div class="form-grid">
        <div class="field"><label for="formationDate">Fecha</label><input class="input" id="formationDate" type="date" value="${attr(today.fecha||todayISO())}" required></div>
        <div class="field"><label for="formationUniform">Uniforme</label><input class="input" id="formationUniform" placeholder="Ej.: 3B, aulas con chamarra" value="${attr(today.uniforme||'')}"></div>
        <div class="field"><label for="formationArrival">Hora de arribo</label><input class="input" id="formationArrival" type="time" value="${attr(today.arribo||'')}"></div>
        <div class="field"><label for="formationTime">Hora de formación</label><input class="input" id="formationTime" type="time" value="${attr(today.hora||today.formacion||'')}"></div>
        <div class="field"><label for="formationPart">Hora del parte</label><input class="input" id="formationPart" type="time" value="${attr(today.parte||'')}"></div>
        <div class="field"><label for="formationPlace">Lugar de formación</label><input class="input" id="formationPlace" placeholder="Patio, plaza, coliseo…" value="${attr(today.lugar||'')}"></div>
        <div class="field full"><label for="formationLink">Enlace de ubicación</label><input class="input" id="formationLink" type="url" inputmode="url" placeholder="https://maps…" value="${attr(today.link||'')}"><span class="help">Puede quedar vacío y completarse cuando envíen la ubicación.</span></div>
        <div class="field full"><label for="formationNotes">Observaciones</label><textarea id="formationNotes" placeholder="Llegar 15 minutos antes, prendas obligatorias, instrucciones…">${escapeHtml(today.obs||'')}</textarea></div>
      </div>
      <div class="sticky-save"><button class="btn primary full" type="submit">${icon('check')} Guardar formación</button></div>
    </form>
    <div class="section-title"><h3>Formaciones registradas</h3><small>${entries.length}</small></div>
    <div class="stack">${entries.length?entries.slice(0,20).map(x=>`<article class="card compact"><div class="card-head"><div class="icon-tile">${icon('academic')}</div><div class="card-main"><h4>${escapeHtml(formatDate(x.fecha,true))}</h4><div class="card-meta"><span class="badge">${escapeHtml(x.hora||'Sin hora')}</span><span class="badge gold">${escapeHtml(x.uniforme||'Uniforme pendiente')}</span></div><p>${escapeHtml(x.lugar||'Lugar no registrado')}</p><div class="inline-actions"><button class="btn secondary small" data-edit-formation="${attr(x.id||'')}">${icon('edit')} Editar</button><button class="icon-btn danger" data-delete-formation="${attr(x.id||'')}" aria-label="Eliminar">${icon('trash')}</button></div></div></div></article>`).join(''):`<div class="card empty">${icon('calendar')}<p>No hay formaciones registradas.</p></div>`}</div>`;
}
async function saveFormation(e){
  e.preventDefault();
  let agenda=await dbGet('agenda',[]);
  const id=document.getElementById('formationId').value||uid('formation');
  const item={id,tipo:'formacion',fecha:document.getElementById('formationDate').value,uniforme:document.getElementById('formationUniform').value.trim(),arribo:document.getElementById('formationArrival').value,hora:document.getElementById('formationTime').value,parte:document.getElementById('formationPart').value,lugar:document.getElementById('formationPlace').value.trim(),link:document.getElementById('formationLink').value.trim(),obs:document.getElementById('formationNotes').value.trim(),created:agenda.find(x=>x.id===id)?.created||nowISO(),updated:nowISO()};
  const index=agenda.findIndex(x=>x.id===id);
  if(index>=0) agenda[index]=item; else agenda.push(item);
  await dbSet('agenda',agenda); toast('Formación guardada'); state.academicSub='formation'; render();
}
async function editFormation(id){
  const agenda=await dbGet('agenda',[]); const x=agenda.find(i=>i.id===id); if(!x)return;
  state.academicSub='formation'; await render();
  const map={formationId:id,formationDate:x.fecha,formationUniform:x.uniforme,formationArrival:x.arribo,formationTime:x.hora,formationPart:x.parte,formationPlace:x.lugar,formationLink:x.link,formationNotes:x.obs};
  Object.entries(map).forEach(([k,v])=>{const el=document.getElementById(k);if(el)el.value=v||'';}); window.scrollTo({top:0,behavior:'smooth'});
}
async function deleteFormation(id){
  if(!confirm('¿Eliminar esta formación?'))return;
  let agenda=await dbGet('agenda',[]); agenda=agenda.filter(x=>x.id!==id); await dbSet('agenda',agenda); toast('Formación eliminada'); render();
}

async function renderSchedulePage(){
  const schedule=await dbGet('horarioSemanal',[]); const meta=await dbGet('scheduleMeta',state.baseSchedule.metadatos);
  const items=schedule.filter(x=>x.dia===state.scheduleDay).sort((a,b)=>(a.inicio||'').localeCompare(b.inicio||''));
  return `<div class="actions" style="margin:0 0 12px"><button class="btn secondary small" data-academic-sub="overview">${icon('back')} Académico</button></div>
    <div class="page-title"><div><h2>Horario semanal</h2><p>${escapeHtml(meta.curso||'Curso')} · ${escapeHtml(meta.nivel||'')} · ${escapeHtml(meta.periodo||'')}</p></div></div>
    <div class="tabs">${WEEK_DAYS.map(d=>`<button class="tab ${d===state.scheduleDay?'active':''}" data-schedule-day="${d}">${d.slice(0,3)}</button>`).join('')}</div>
    <article class="card"><div class="section-title" style="margin-top:0"><h3>${escapeHtml(state.scheduleDay)}</h3><button class="btn primary small" data-action="add-schedule">${icon('plus')} Agregar</button></div>
      ${items.length?items.map(x=>scheduleRow(x)).join(''):`<div class="empty">${icon('calendar')}<p>No hay actividades este día.</p></div>`}
    </article>
    <div class="actions"><button class="btn secondary" data-action="save-schedule-history">${icon('history')} Guardar horario en historial</button><button class="btn ghost" data-action="show-reference-image">${icon('image')} Ver foto original</button></div>`;
}
function scheduleRow(x, readOnly=false){
  const isBreak=x.tipo==='descanso'||normalize(x.materia).includes('descanso');
  const actions=readOnly?'':`<div class="inline-actions schedule-actions" style="margin:0"><button class="icon-btn" data-edit-schedule="${attr(x.id)}" aria-label="Editar">${icon('edit')}</button><button class="icon-btn danger" data-delete-schedule="${attr(x.id)}" aria-label="Eliminar">${icon('trash')}</button></div>`;
  return `<div class="schedule-row ${isBreak?'break':''}"><div class="schedule-time">${escapeHtml(x.inicio||'')}<br>${x.fin?`<span>${escapeHtml(x.fin)}</span>`:''}</div><div class="schedule-body"><strong>${escapeHtml(x.materia||'Actividad')}</strong>${x.docente?`<span>${escapeHtml(x.docente)}</span>`:''}${x.lugar?`<span>${icon('location')} ${escapeHtml(x.lugar)}</span>`:''}${x.uniforme?`<span>Uniforme: ${escapeHtml(x.uniforme)}</span>`:''}</div>${actions}</div>`;
}
function openScheduleForm(item={}){
  modal(`<div class="modal-header"><h3>${item.id?'Editar actividad':'Nueva actividad'}</h3><button class="modal-close" data-close-modal>${icon('close')}</button></div>
    <form id="scheduleForm"><input type="hidden" id="scheduleId" value="${attr(item.id||'')}">
      <div class="form-grid"><div class="field"><label>Día</label><select id="scheduleFormDay">${WEEK_DAYS.map(d=>`<option ${d===(item.dia||state.scheduleDay)?'selected':''}>${d}</option>`).join('')}</select></div><div class="field"><label>Tipo</label><select id="scheduleType"><option value="clase" ${item.tipo==='clase'?'selected':''}>Clase</option><option value="formacion" ${item.tipo==='formacion'?'selected':''}>Formación</option><option value="descanso" ${item.tipo==='descanso'?'selected':''}>Descanso</option><option value="actividad" ${item.tipo==='actividad'?'selected':''}>Actividad</option></select></div>
      <div class="field"><label>Hora inicial</label><input class="input" id="scheduleStart" type="time" value="${attr(item.inicio||'')}"></div><div class="field"><label>Hora final</label><input class="input" id="scheduleEnd" type="time" value="${attr(item.fin||'')}"></div>
      <div class="field full"><label>Materia o actividad</label><input class="input" id="scheduleSubject" value="${attr(item.materia||'')}" required></div><div class="field full"><label>Docente / instructor</label><input class="input" id="scheduleTeacher" value="${attr(item.docente||'')}"></div><div class="field full"><label>Aula / lugar</label><input class="input" id="schedulePlace" value="${attr(item.lugar||'')}"></div><div class="field full"><label>Uniforme requerido</label><input class="input" id="scheduleUniform" value="${attr(item.uniforme||'')}"></div><div class="field full"><label>Observaciones</label><textarea id="scheduleNotes">${escapeHtml(item.observacion||item.obs||'')}</textarea></div></div>
      <button class="btn primary full" type="submit">Guardar actividad</button></form>`,()=>{
        document.querySelector('[data-close-modal]').onclick=closeModal;
        document.getElementById('scheduleForm').onsubmit=saveScheduleEntry;
      });
}
async function saveScheduleEntry(e){
  e.preventDefault(); let schedule=await dbGet('horarioSemanal',[]);
  const id=document.getElementById('scheduleId').value||uid('schedule');
  const item={id,dia:document.getElementById('scheduleFormDay').value,tipo:document.getElementById('scheduleType').value,inicio:document.getElementById('scheduleStart').value,fin:document.getElementById('scheduleEnd').value,materia:document.getElementById('scheduleSubject').value.trim(),docente:document.getElementById('scheduleTeacher').value.trim(),lugar:document.getElementById('schedulePlace').value.trim(),uniforme:document.getElementById('scheduleUniform').value.trim(),observacion:document.getElementById('scheduleNotes').value.trim(),created:schedule.find(x=>x.id===id)?.created||nowISO(),updated:nowISO()};
  const i=schedule.findIndex(x=>x.id===id); if(i>=0)schedule[i]=item;else schedule.push(item);
  await dbSet('horarioSemanal',schedule); state.scheduleDay=item.dia; closeModal(); toast('Horario actualizado'); render();
}
async function editSchedule(id){const list=await dbGet('horarioSemanal',[]); const item=list.find(x=>x.id===id);if(item)openScheduleForm(item);}
async function deleteSchedule(id){if(!confirm('¿Eliminar esta actividad del horario?'))return;let list=await dbGet('horarioSemanal',[]);list=list.filter(x=>x.id!==id);await dbSet('horarioSemanal',list);toast('Actividad eliminada');render();}
async function saveScheduleHistory(){
  const list=await dbGet('horarioSemanal',[]); if(!list.length)return toast('No hay horario para guardar');
  modal(`<div class="modal-header"><h3>Guardar horario en historial</h3><button class="modal-close" data-close-modal>${icon('close')}</button></div><form id="historyForm"><div class="field"><label>Nombre</label><input class="input" id="historyName" placeholder="Ej.: Primer parcial 2026" required></div><button class="btn primary full" type="submit">Guardar copia</button></form>`,()=>{
    document.querySelector('[data-close-modal]').onclick=closeModal;
    document.getElementById('historyForm').onsubmit=async e=>{e.preventDefault();let h=await dbGet('historialHorarios',[]);h.unshift({id:uid('history'),nombre:document.getElementById('historyName').value.trim(),items:list,created:nowISO()});await dbSet('historialHorarios',h);closeModal();toast('Horario guardado en historial');};
  });
}
async function renderScheduleHistoryPage(){
  const histories=await dbGet('historialHorarios',[]);
  return `<div class="actions" style="margin:0 0 12px"><button class="btn secondary small" data-academic-sub="overview">${icon('back')} Académico</button></div><div class="page-title"><div><h2>Historial de horarios</h2><p>Copias referenciales de parciales anteriores.</p></div></div><div class="stack">${histories.length?histories.map(h=>`<article class="card"><div class="card-head"><div class="icon-tile">${icon('history')}</div><div class="card-main"><h3>${escapeHtml(h.nombre)}</h3><p>${h.items.length} registros · Guardado ${escapeHtml(new Date(h.created).toLocaleString('es-BO'))}</p><div class="actions"><button class="btn secondary small" data-view-history="${attr(h.id)}">Ver</button><button class="icon-btn danger" data-delete-history="${attr(h.id)}">${icon('trash')}</button></div></div></div></article>`).join(''):`<div class="card empty">${icon('history')}<p>No guardaste horarios anteriores.</p></div>`}</div>`;
}
async function viewHistory(id){const list=await dbGet('historialHorarios',[]);const h=list.find(x=>x.id===id);if(!h)return;modal(`<div class="modal-header"><h3>${escapeHtml(h.nombre)}</h3><button class="modal-close" data-close-modal>${icon('close')}</button></div><div class="tabs">${WEEK_DAYS.map((d,i)=>`<button class="tab ${i===0?'active':''}" data-history-day="${d}">${d.slice(0,3)}</button>`).join('')}</div><div id="historyContent"></div>`,()=>{
  document.querySelector('[data-close-modal]').onclick=closeModal;
  const draw=d=>{document.getElementById('historyContent').innerHTML=`<article class="card" style="box-shadow:none">${h.items.filter(x=>x.dia===d).sort((a,b)=>(a.inicio||'').localeCompare(b.inicio||'')).map(x=>scheduleRow(x,true)).join('')||'<p class="muted">Sin actividades.</p>'}</article>`;};draw('Lunes');document.querySelectorAll('[data-history-day]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-history-day]').forEach(x=>x.classList.remove('active'));b.classList.add('active');draw(b.dataset.historyDay);});
});}
async function deleteHistory(id){if(!confirm('¿Eliminar este historial?'))return;let h=await dbGet('historialHorarios',[]);h=h.filter(x=>x.id!==id);await dbSet('historialHorarios',h);render();}
function showReferenceImage(){modal(`<div class="modal-header"><h3>Horario original de referencia</h3><button class="modal-close" data-close-modal>${icon('close')}</button></div><div class="article-image"><img src="./assets/horario-referencia.webp" alt="Fotografía del horario académico"></div>`,()=>document.querySelector('[data-close-modal]').onclick=closeModal);}

async function renderProfessional(){
  const agenda=await dbGet('agenda',[]); const events=agenda.filter(x=>!normalize(x.tipo).includes('formacion'));
  return `<div class="page-title"><div><h2>Agenda profesional</h2><p>El modo académico está desactivado. Aquí se registran servicios, operativos y reuniones.</p></div></div><div class="actions"><button class="btn primary" data-action="add-professional">${icon('plus')} Nueva actividad</button></div><div class="stack" style="margin-top:12px">${events.length?events.map(x=>`<article class="card"><h3>${escapeHtml(x.titulo||x.tipo||'Actividad')}</h3><div class="card-meta"><span class="badge">${escapeHtml(formatDate(x.fecha)||'Sin fecha')}</span><span class="badge gold">${escapeHtml(x.hora||'Sin hora')}</span></div><p>${escapeHtml(x.lugar||'Lugar no registrado')}</p><p>${escapeHtml(x.obs||'')}</p></article>`).join(''):`<div class="card empty">${icon('briefcase')}<p>No hay actividades profesionales registradas.</p></div>`}</div>`;
}
function openProfessionalForm(){
  modal(`<div class="modal-header"><h3>Nueva actividad profesional</h3><button class="modal-close" data-close-modal>${icon('close')}</button></div><form id="professionalForm"><div class="field"><label>Título</label><input class="input" id="profTitle" required></div><div class="form-grid"><div class="field"><label>Fecha</label><input class="input" id="profDate" type="date"></div><div class="field"><label>Hora</label><input class="input" id="profTime" type="time"></div></div><div class="field"><label>Lugar</label><input class="input" id="profPlace"></div><div class="field"><label>Observaciones</label><textarea id="profNotes"></textarea></div><button class="btn primary full">Guardar actividad</button></form>`,()=>{
    document.querySelector('[data-close-modal]').onclick=closeModal;
    document.getElementById('professionalForm').onsubmit=async e=>{e.preventDefault();let a=await dbGet('agenda',[]);a.push({id:uid('professional'),tipo:'actividad profesional',titulo:document.getElementById('profTitle').value.trim(),fecha:document.getElementById('profDate').value,hora:document.getElementById('profTime').value,lugar:document.getElementById('profPlace').value.trim(),obs:document.getElementById('profNotes').value.trim(),created:nowISO()});await dbSet('agenda',a);closeModal();toast('Actividad guardada');render();};
  });
}

function sortReminders(a,b){
  const pa={Urgente:0,Importante:1,Normal:2};
  const p=(pa[a.prio]??2)-(pa[b.prio]??2); if(p)return p;
  return (a.date||'9999').localeCompare(b.date||'9999') || (a.time||'').localeCompare(b.time||'');
}
async function renderReminders(){
  const reminders=await dbGet('pendientes',[]);
  const filtered=reminders.filter(x=>state.reminderTab==='archived'?x.archived:state.reminderTab==='completed'?x.done&&!x.archived:!x.done&&!x.archived).sort(sortReminders);
  return `<div class="page-title"><div><h2>Recordatorios</h2><p>Guarda instrucciones tal cual o conviértelas en una ficha clara.</p></div></div>
    <div class="actions"><button class="btn primary full" data-action="new-instruction">${icon('plus')} Nueva instrucción o recordatorio</button></div>
    <div class="tabs" style="margin-top:14px"><button class="tab ${state.reminderTab==='pending'?'active':''}" data-reminder-tab="pending">Pendientes</button><button class="tab ${state.reminderTab==='completed'?'active':''}" data-reminder-tab="completed">Cumplidos</button><button class="tab ${state.reminderTab==='archived'?'active':''}" data-reminder-tab="archived">Archivados</button></div>
    <div class="stack">${filtered.length?filtered.map(reminderCard).join(''):`<div class="card empty">${icon('bell')}<p>No hay elementos en esta sección.</p></div>`}</div>`;
}
function reminderCard(r){
  const done=!!r.done;
  return `<article class="card compact ${done?'item-done':''}"><div class="check-line"><button class="check-btn ${done?'done':''}" data-toggle-reminder="${attr(r.id||'')}" aria-label="${done?'Marcar pendiente':'Marcar cumplido'}">${done?icon('check'):''}</button><div class="card-main"><h4>${escapeHtml(r.title||r.titulo||'Recordatorio')}</h4><div class="card-meta">${r.prio?`<span class="badge ${r.prio==='Urgente'?'red':r.prio==='Importante'?'gold':''}">${escapeHtml(r.prio)}</span>`:''}${r.date?`<span class="badge">${escapeHtml(formatDate(r.date))}${r.time?` · ${escapeHtml(r.time)}`:''}</span>`:''}${r.tipo?`<span class="badge blue">${escapeHtml(r.tipo)}</span>`:''}</div>${r.lugar?`<p>${icon('location')} ${escapeHtml(r.lugar)}</p>`:''}${r.obs||r.raw?`<p>${escapeHtml(excerpt(r.obs||r.raw,220))}</p>`:''}<div class="inline-actions"><button class="btn secondary small" data-view-reminder="${attr(r.id||'')}">Ver</button>${r.archived?`<button class="btn ghost small" data-unarchive-reminder="${attr(r.id||'')}">Restaurar</button>`:`<button class="icon-btn" data-archive-reminder="${attr(r.id||'')}" aria-label="Archivar">${icon('archive')}</button>`}<button class="icon-btn danger" data-delete-reminder="${attr(r.id||'')}" aria-label="Eliminar">${icon('trash')}</button></div></div></div></article>`;
}
function openInstructionModal(){
  modal(`<div class="modal-header"><div><h3>Nueva instrucción</h3><p class="muted">Pega el mensaje recibido. Puedes conservarlo intacto o pedir que la app lo organice.</p></div><button class="modal-close" data-close-modal>${icon('close')}</button></div>
    <div class="field"><label for="instructionTitle">Título opcional</label><input class="input" id="instructionTitle" placeholder="Ej.: Presentar boleta, formación general…"></div>
    <div class="field"><label for="instructionRaw">Mensaje o instrucción</label><textarea id="instructionRaw" placeholder="Pega aquí el comunicado de WhatsApp…"></textarea></div>
    <div class="actions"><button class="btn secondary" id="saveRawInstruction">Guardar tal cual</button><button class="btn primary" id="organizeInstruction">Organizar mensaje</button></div>`,()=>{
      document.querySelector('[data-close-modal]').onclick=closeModal;
      document.getElementById('saveRawInstruction').onclick=saveRawInstruction;
      document.getElementById('organizeInstruction').onclick=organizeInstruction;
  });
}
async function saveRawInstruction(){
  const raw=document.getElementById('instructionRaw').value.trim();if(!raw)return toast('Pega o escribe una instrucción');
  const title=document.getElementById('instructionTitle').value.trim()||extractTitle(raw);
  let list=await dbGet('pendientes',[]);list.unshift({id:uid('reminder'),title,raw,obs:raw,prio:/urgente|obligatori|impostergable/i.test(raw)?'Urgente':'Normal',done:false,archived:false,created:nowISO(),tipo:'Instrucción'});await dbSet('pendientes',list);closeModal();toast('Instrucción guardada');state.reminderTab='pending';render();
}
function extractTitle(raw){
  const lines=raw.split(/\n+/).map(x=>x.replace(/[\*🚨📢⚠️❗🏦📅📍🦺]/g,'').trim()).filter(Boolean);
  const preferred=lines.find(x=>x.length>=5&&x.length<=90&&(/[A-ZÁÉÍÓÚÑ]{4}/.test(x)||/comunicado|orden|formaci|depósito|presentar/i.test(x)));
  return (preferred||lines[0]||'Nueva instrucción').replace(/[:–-]+$/,'').slice(0,100);
}
function parseDateFromText(raw){
  const iso=raw.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);if(iso)return `${iso[1]}-${iso[2].padStart(2,'0')}-${iso[3].padStart(2,'0')}`;
  const m=normalize(raw).match(/(?:lunes|martes|miercoles|jueves|viernes|sabado|domingo)?\s*(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(?:de\s+)?(20\d{2})/i);
  if(m){const month=MONTHS.indexOf(m[2])+1;return `${m[3]}-${String(month).padStart(2,'0')}-${m[1].padStart(2,'0')}`;}
  return '';
}
function parseInstruction(raw,title=''){
  const low=normalize(raw);
  const lines=raw.split(/\n+/).map(x=>x.replace(/\*/g,'').replace(/^[^A-Za-zÁÉÍÓÚÑáéíóúñ0-9]+/,'').trim()).filter(Boolean);
  const lineValue=line=>line.includes(':')?line.slice(line.indexOf(':')+1).trim():line.trim();
  const findLine=regex=>{const line=lines.find(x=>regex.test(normalize(x)));return line?lineValue(line):'';};
  const urls=raw.match(/https?:\/\/[^\s)]+/g)||[];
  const to24=(hour,minute,meridiem='')=>{
    let h=Number(hour);const mer=normalize(meridiem);
    if(/p m|pm/.test(mer)&&h<12)h+=12;
    if(/a m|am/.test(mer)&&h===12)h=0;
    return `${String(h).padStart(2,'0')}:${minute}`;
  };
  const timeRegex=/\b([01]?\d|2[0-3]):([0-5]\d)\s*(hrs?\.?|a\.?m\.?|p\.?m\.?)?/gi;
  const allTimes=[...raw.matchAll(timeRegex)].map(m=>to24(m[1],m[2],m[3]||''));
  const labeled=label=>{
    const r=new RegExp(`${label}[^\\d]{0,35}([01]?\\d|2[0-3]):([0-5]\\d)\\s*(hrs?\\.?|a\\.?m\\.?|p\\.?m\\.?)?`,'i');
    const m=raw.match(r);return m?to24(m[1],m[2],m[3]||''):'';
  };
  const garments=['chamarra','polera blanca','polera','botines','calatrava','placa policial','apaches del bicentenario','gorra','teresiana','boina','camisa','pantalón','pantalon','corbata','botas'];
  let foundGarments=garments.filter(g=>low.includes(normalize(g)));
  if(foundGarments.includes('polera blanca'))foundGarments=foundGarments.filter(g=>g!=='polera');
  const uniformParts=lines.filter(x=>/^(uniforme|prendas base|detalle distintivo)/.test(normalize(x))).map(lineValue).filter(x=>x&&!/^(control de uniforme|uso de uniforme)$/i.test(x));
  const dailyUniforms=lines.map(x=>{
    const m=normalize(x).match(/^(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\s+(.{1,45})$/);
    return m?`${m[1][0].toUpperCase()+m[1].slice(1)}: ${x.replace(/^\S+\s+/,'').trim()}`:'';
  }).filter(Boolean);
  const type=/dep[oó]sito|boleta|fotocopia|certificado|fecha límite|fecha limite|presentaci[oó]n|entrega/i.test(raw)?'Requisito':/orden de guarnici[oó]n|servicio|operativo|planeamiento y operaciones/i.test(raw)?'Servicio':/formaci[oó]n|parte de diana|parte de asamblea/i.test(raw)?'Formación':'Instrucción';
  const place=findLine(/^(lugar|entrega|concentracion)/) || (raw.match(/LUGAR[:*\s-]+([^\n]+)/i)||[])[1] || '';
  const rectification=/rectificando|modificando|postergando|suspendiendo|nueva hora|cambio de lugar|se deja sin efecto/i.test(raw);
  const describedUniform=normalize([...uniformParts,...dailyUniforms].join(' '));
  const supplementalGarments=foundGarments.filter(g=>!describedUniform.includes(normalize(g)));
  const uniqueUniform=[...uniformParts,...dailyUniforms,...supplementalGarments].filter(Boolean).filter((x,i,a)=>a.findIndex(y=>normalize(y)===normalize(x))===i);
  return {
    title:title||extractTitle(raw), tipo:type, date:parseDateFromText(raw),
    time:labeled('hora de formaci[oó]n')||labeled('hora')||allTimes[0]||'',
    arrival:labeled('hora de arribo')||labeled('control de asistencia')||'',
    part:labeled('(?:hora (?:del|de) parte|dando parte|parte)')||'',
    place:place.trim(), link:urls.find(u=>/maps|goo\.gl|waze/i.test(u))||urls[0]||'',
    uniform:uniqueUniform.join(', '),
    priority:/urgente|obligatori|impostergable|estricto cumplimiento/i.test(raw)?'Urgente':'Normal',
    rectification, raw
  };
}
async function organizeInstruction(){
  const raw=document.getElementById('instructionRaw').value.trim();if(!raw)return toast('Pega o escribe una instrucción');
  const parsed=parseInstruction(raw,document.getElementById('instructionTitle').value.trim());
  const existing=await findPossibleUpdates(parsed);
  modal(`<div class="modal-header"><div><h3>Revisar información detectada</h3><p class="muted">Corrige o completa lo que falte antes de guardar.</p></div><button class="modal-close" data-close-modal>${icon('close')}</button></div>
    ${parsed.rectification?`<div class="card warn compact"><strong>Posible modificación detectada</strong><p>El mensaje contiene una rectificación, suspensión o cambio. Puedes relacionarlo con un registro anterior.</p></div>`:''}
    <form id="parsedForm"><div class="form-grid"><div class="field full"><label>Título</label><input class="input" id="parsedTitle" value="${attr(parsed.title)}" required></div><div class="field"><label>Tipo</label><select id="parsedType">${['Instrucción','Formación','Servicio','Requisito'].map(x=>`<option ${x===parsed.tipo?'selected':''}>${x}</option>`).join('')}</select></div><div class="field"><label>Prioridad</label><select id="parsedPriority"><option ${parsed.priority==='Normal'?'selected':''}>Normal</option><option>Importante</option><option ${parsed.priority==='Urgente'?'selected':''}>Urgente</option></select></div><div class="field"><label>Fecha</label><input class="input" id="parsedDate" type="date" value="${attr(parsed.date)}"></div><div class="field"><label>Hora principal</label><input class="input" id="parsedTime" type="time" value="${attr(parsed.time)}"></div><div class="field"><label>Hora de arribo</label><input class="input" id="parsedArrival" type="time" value="${attr(parsed.arrival)}"></div><div class="field"><label>Hora del parte</label><input class="input" id="parsedPart" type="time" value="${attr(parsed.part)}"></div><div class="field full"><label>Lugar</label><input class="input" id="parsedPlace" value="${attr(parsed.place)}" placeholder="Pendiente de confirmar"></div><div class="field full"><label>Enlace de ubicación</label><input class="input" id="parsedLink" type="url" value="${attr(parsed.link)}"></div><div class="field full"><label>Uniforme / prendas</label><input class="input" id="parsedUniform" value="${attr(parsed.uniform)}"></div>${parsed.rectification&&existing.length?`<div class="field full"><label>Relacionar con registro anterior</label><select id="parsedReplace"><option value="">Guardar como nueva versión</option>${existing.map(x=>`<option value="${attr(x.id)}">Actualizar: ${escapeHtml(x.title||x.titulo||'Registro')}</option>`).join('')}</select></div>`:''}<div class="field full"><label>Mensaje original / observaciones</label><textarea id="parsedRaw">${escapeHtml(raw)}</textarea></div></div><div class="actions"><button class="btn secondary" type="button" data-action="back-to-instruction">Volver</button><button class="btn primary" type="submit">Guardar ficha</button></div></form>`,()=>{
      document.querySelector('[data-close-modal]').onclick=closeModal;
      document.querySelector('[data-action="back-to-instruction"]').onclick=openInstructionModal;
      document.getElementById('parsedForm').onsubmit=saveParsedInstruction;
  });
}
async function findPossibleUpdates(parsed){
  if(!parsed.rectification)return[]; const list=await dbGet('pendientes',[]); const words=normalize(parsed.title).split(' ').filter(x=>x.length>4);
  return list.filter(x=>!x.archived&&words.some(w=>normalize(x.title||'').includes(w))).slice(0,8);
}
async function saveParsedInstruction(e){
  e.preventDefault(); let list=await dbGet('pendientes',[]); const replace=document.getElementById('parsedReplace')?.value||'';
  const item={id:replace||uid('reminder'),title:document.getElementById('parsedTitle').value.trim(),tipo:document.getElementById('parsedType').value,prio:document.getElementById('parsedPriority').value,date:document.getElementById('parsedDate').value,time:document.getElementById('parsedTime').value,arrival:document.getElementById('parsedArrival').value,part:document.getElementById('parsedPart').value,lugar:document.getElementById('parsedPlace').value.trim(),link:document.getElementById('parsedLink').value.trim(),uniforme:document.getElementById('parsedUniform').value.trim(),obs:document.getElementById('parsedRaw').value.trim(),raw:document.getElementById('parsedRaw').value.trim(),done:false,archived:false,created:nowISO(),updated:nowISO()};
  if(replace){const i=list.findIndex(x=>x.id===replace);if(i>=0){item.created=list[i].created;item.versions=[...(list[i].versions||[]),{...list[i],versionSaved:nowISO()}];list[i]=item;}else list.unshift(item);}else list.unshift(item);
  await dbSet('pendientes',list);
  if(item.tipo==='Formación'){
    let agenda=await dbGet('agenda',[]); agenda.push({id:uid('formation'),tipo:'formacion',fecha:item.date,hora:item.time,arribo:item.arrival,parte:item.part,lugar:item.lugar,link:item.link,uniforme:item.uniforme,obs:item.obs,created:nowISO()}); await dbSet('agenda',agenda);
  }
  closeModal();toast(replace?'Registro actualizado':'Ficha guardada');state.reminderTab='pending';render();
}
async function toggleReminder(id){let list=await dbGet('pendientes',[]);const i=list.findIndex(x=>x.id===id);if(i>=0){list[i].done=!list[i].done;list[i].updated=nowISO();await dbSet('pendientes',list);render();}}
async function archiveReminder(id,archived=true){let list=await dbGet('pendientes',[]);const i=list.findIndex(x=>x.id===id);if(i>=0){list[i].archived=archived;await dbSet('pendientes',list);toast(archived?'Archivado':'Restaurado');render();}}
async function deleteReminder(id){if(!confirm('¿Eliminar este recordatorio de forma definitiva?'))return;let list=await dbGet('pendientes',[]);list=list.filter(x=>x.id!==id);await dbSet('pendientes',list);toast('Recordatorio eliminado');render();}
async function viewReminder(id){const list=await dbGet('pendientes',[]);const r=list.find(x=>x.id===id);if(!r)return;modal(`<div class="modal-header"><div><h3>${escapeHtml(r.title||'Recordatorio')}</h3><div class="card-meta"><span class="badge">${escapeHtml(r.tipo||'Instrucción')}</span>${r.prio?`<span class="badge ${r.prio==='Urgente'?'red':''}">${escapeHtml(r.prio)}</span>`:''}</div></div><button class="modal-close" data-close-modal>${icon('close')}</button></div><dl class="kv"><dt>Fecha</dt><dd>${escapeHtml(formatDate(r.date)||'-')}</dd><dt>Hora</dt><dd>${escapeHtml(r.time||'-')}</dd><dt>Arribo</dt><dd>${escapeHtml(r.arrival||'-')}</dd><dt>Parte</dt><dd>${escapeHtml(r.part||'-')}</dd><dt>Lugar</dt><dd>${escapeHtml(r.lugar||'-')}</dd><dt>Uniforme</dt><dd>${escapeHtml(r.uniforme||'-')}</dd></dl>${safeExternalUrl(r.link)?`<div class="actions"><a class="btn ghost" href="${attr(safeExternalUrl(r.link))}" target="_blank" rel="noopener">${icon('location')} Abrir ubicación</a></div>`:''}<div class="section-title"><h3>Mensaje guardado</h3></div><div class="article-body">${escapeHtml(r.obs||r.raw||'')}</div>${r.versions?.length?`<div class="section-title"><h3>Historial de cambios</h3><small>${r.versions.length}</small></div>${r.versions.map((v,i)=>`<div class="card compact" style="box-shadow:none"><strong>Versión ${i+1}</strong><p>${escapeHtml(excerpt(v.obs||v.raw||'',180))}</p></div>`).join('')}`:''}`,()=>document.querySelector('[data-close-modal]').onclick=closeModal);}

async function renderMore(){
  const lastBackup=await dbGet('lastBackup',null);
  return `<div class="page-title"><div><h2>Más y configuración</h2><p>Controla el modo de uso, la instalación y los respaldos.</p></div></div><div class="stack">
    <article class="card"><div class="switch-row"><div class="card-head"><div class="icon-tile">${icon('academic')}</div><div class="card-main"><h3>Modo académico</h3><p>Al desactivarlo se ocultan Formación y Horario. Los datos no se borran.</p></div></div><label class="switch"><input id="academicModeSwitch" type="checkbox" ${state.settings.academicMode?'checked':''}><span class="slider"></span></label></div></article>
    <article class="card install-card"><div class="card-head"><div class="icon-tile gold">${icon('install')}</div><div class="card-main"><h3>${isStandalone()?'Aplicación instalada':'Instalar PoliAgenda Pro'}</h3><p>${isStandalone()?'Estás usando la aplicación en modo independiente.':'Instálala desde Chrome para abrirla como aplicación y usarla sin conexión.'}</p>${!isStandalone()?`<div class="actions"><button class="btn gold" id="installAppBtn">Instalar aplicación</button></div>`:''}</div></div></article>
    <article class="card"><div class="card-head"><div class="icon-tile">${icon('image')}</div><div class="card-main"><h3>Imágenes y PDF sin conexión</h3><p>La instalación inicial guarda la aplicación y los textos. Este botón descarga de forma opcional las 121 páginas visuales y el PDF para consultarlos también sin internet.</p><div class="card-meta"><span class="badge" id="mediaOfflineStatus">${(await dbGet('mediaOffline',null))?.completed?'Material visual descargado':'Descarga opcional'}</span></div><div class="actions"><button class="btn secondary" id="downloadOfflineBtn">${icon('download')} Descargar material visual</button></div></div></div></article>
    <article class="card"><div class="card-head"><div class="icon-tile">${icon('download')}</div><div class="card-main"><h3>Respaldo y restauración</h3><p>Exporta agenda, horario, recordatorios, configuración y favoritos en un archivo JSON.</p><div class="card-meta"><span class="badge">Último respaldo: ${lastBackup?escapeHtml(new Date(lastBackup).toLocaleString('es-BO')):'Nunca'}</span></div><div class="actions"><button class="btn primary" data-action="export-backup">${icon('download')} Exportar</button><label class="btn secondary" for="backupInput">${icon('upload')} Importar</label><input class="file-input" id="backupInput" type="file" accept="application/json,.json"></div></div></div></article>
    <article class="card danger"><div class="card-head"><div class="icon-tile">${icon('trash')}</div><div class="card-main"><h3>Eliminar datos académicos</h3><p>Esta acción borra formaciones, horario vigente e historial. Antes se recomienda exportar un respaldo.</p><div class="actions"><button class="btn danger" data-action="clear-academic">Eliminar datos académicos</button></div></div></div></article>
    <article class="card"><div class="card-head"><div class="icon-tile">${icon('info')}</div><div class="card-main"><h3>Acerca de la aplicación</h3><p><span class="status-dot"></span>PoliAgenda Pro v${APP_VERSION}. PWA offline-first, sin Supabase en esta fase.</p><p>La información personal se conserva en IndexedDB del dispositivo.</p></div></div></article>
  </div>`;
}
async function toggleAcademicMode(checked){state.settings.academicMode=checked;await dbSet('settings',state.settings);toast(checked?'Modo académico activado':'Modo académico desactivado');if(!checked&&state.view==='academic')state.view='professional';render();}
async function exportBackup(){
  const keys=['agenda','horarioSemanal','historialHorarios','pendientes','favorites','settings','scheduleMeta','docs','pin']; const data={app:'PoliAgenda Pro',version:APP_VERSION,exportedAt:nowISO(),data:{}};
  for(const key of keys)data.data[key]=await dbGet(key,key==='settings'?{}:[]);
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`respaldo-poliagenda-${todayISO()}.json`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);await dbSet('lastBackup',nowISO());toast('Respaldo exportado');render();
}
async function importBackup(file){
  if(!file)return;
  try{
    const parsed=JSON.parse(await file.text());
    if(parsed.app && parsed.app!=='PoliAgenda Pro') throw new Error('Aplicación no compatible');
    const data=parsed.data||parsed;
    if(!data || typeof data!=='object') throw new Error('Estructura inválida');
    if(!confirm('La importación reemplazará los datos actuales de agenda, horario y recordatorios. ¿Continuar?'))return;
    const keys=['agenda','horarioSemanal','historialHorarios','pendientes','favorites','settings','scheduleMeta','docs','pin'];
    for(const key of keys) if(Object.prototype.hasOwnProperty.call(data,key)) await dbSet(key,data[key]);
    state.settings=await dbGet('settings',{academicMode:true,scheduleInitialized:true});
    if(typeof state.settings.academicMode!=='boolean') state.settings.academicMode=true;
    state.settings.scheduleInitialized=true;
    await dbSet('settings',state.settings);
    toast('Respaldo restaurado correctamente');render();
  }catch(e){console.error(e);toast('El archivo no es un respaldo válido');}
}
async function clearAcademicData(){
  if(!confirm('Se borrarán formaciones, horario vigente e historial académico. ¿Continuar?'))return;
  const word=prompt('Escribe ELIMINAR para confirmar');if(word!=='ELIMINAR')return toast('Operación cancelada');
  let agenda=await dbGet('agenda',[]);agenda=agenda.filter(x=>!normalize(x.tipo).includes('formacion'));
  await dbSet('agenda',agenda);await dbSet('horarioSemanal',[]);await dbSet('historialHorarios',[]);
  state.settings.scheduleInitialized=true;await dbSet('settings',state.settings);
  toast('Datos académicos eliminados');render();
}
async function downloadOfflineVisuals(){
  if(!('caches' in window)) return toast('Este navegador no permite la descarga offline');
  if(!navigator.onLine) return toast('Conéctate a internet para descargar el material');
  if(!confirm('Se descargarán el PDF y 121 páginas visuales. Puede ocupar decenas de MB y tardar varios minutos. ¿Continuar?')) return;
  const button=document.getElementById('downloadOfflineBtn');
  if(button){button.disabled=true;button.textContent='Preparando descarga…';}
  const urls=['./assets/reglamento-uniformes-2021.pdf',...Array.from({length:121},(_,i)=>`./assets/pages/pagina-${String(i+1).padStart(3,'0')}.jpg`)];
  const cache=await caches.open(MEDIA_CACHE);let done=0,failed=0;
  for(const url of urls){
    try{
      const req=new Request(url,{cache:'reload'});
      const existing=await cache.match(req);
      if(!existing){const response=await fetch(req);if(!response.ok)throw new Error(String(response.status));await cache.put(req,response.clone());}
      done++;
    }catch(e){console.warn('No se pudo descargar',url,e);failed++;}
    if(button && (done+failed)%5===0) button.textContent=`Descargando ${done+failed}/${urls.length}…`;
  }
  const completed=failed===0;
  await dbSet('mediaOffline',{completed,done,failed,total:urls.length,downloadedAt:nowISO()});
  if(button){button.disabled=false;button.innerHTML=`${icon('download')} ${completed?'Material descargado':'Reintentar descarga'}`;}
  const status=document.getElementById('mediaOfflineStatus');if(status)status.textContent=completed?'Material visual descargado':`${done}/${urls.length} archivos descargados`;
  toast(completed?'Material visual disponible sin conexión':`Descarga parcial: faltaron ${failed} archivos`);
}

async function installApp(){
  if(isStandalone())return toast('La aplicación ya está instalada');
  if(state.deferredInstall){state.deferredInstall.prompt();const choice=await state.deferredInstall.userChoice;state.deferredInstall=null;toast(choice.outcome==='accepted'?'Instalación iniciada':'Instalación cancelada');return;}
  modal(`<div class="modal-header"><h3>Instalar PoliAgenda Pro</h3><button class="modal-close" data-close-modal>${icon('close')}</button></div><div class="article-body">En Chrome, abre el menú de tres puntos y selecciona <strong>Instalar aplicación</strong> o <strong>Agregar a pantalla principal</strong>. Si la opción no aparece, recarga la página una vez después de esta actualización.</div>`,()=>document.querySelector('[data-close-modal]').onclick=closeModal);
}

function bindPageEvents(){
  document.querySelectorAll('[data-doc]').forEach(b=>b.onclick=()=>{state.libraryDoc=b.dataset.doc;state.libraryQuery='';state.libraryFilter='';render();});
  document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{state.libraryFilter=b.dataset.filter;state.libraryQuery='';render();});
  document.querySelectorAll('[data-article-id]').forEach(b=>b.onclick=()=>openArticle(b.dataset.articleDoc,b.dataset.articleId));
  document.querySelector('[data-action="library-back"]')?.addEventListener('click',()=>{state.libraryDoc=null;state.libraryFilter='';state.libraryQuery='';render();});
  document.querySelectorAll('[data-academic-sub]').forEach(b=>b.onclick=()=>{state.academicSub=b.dataset.academicSub;render();});
  document.querySelector('[data-action="open-formation"]')?.addEventListener('click',()=>{state.view='academic';state.academicSub='formation';render();});
  document.querySelector('[data-action="open-schedule"]')?.addEventListener('click',()=>{state.view='academic';state.academicSub='schedule';render();});
  document.getElementById('formationForm')?.addEventListener('submit',saveFormation);
  document.querySelectorAll('[data-edit-formation]').forEach(b=>b.onclick=()=>editFormation(b.dataset.editFormation));
  document.querySelectorAll('[data-delete-formation]').forEach(b=>b.onclick=()=>deleteFormation(b.dataset.deleteFormation));
  document.querySelectorAll('[data-schedule-day]').forEach(b=>b.onclick=()=>{state.scheduleDay=b.dataset.scheduleDay;render();});
  document.querySelector('[data-action="add-schedule"]')?.addEventListener('click',()=>openScheduleForm());
  document.querySelectorAll('[data-edit-schedule]').forEach(b=>b.onclick=()=>editSchedule(b.dataset.editSchedule));
  document.querySelectorAll('[data-delete-schedule]').forEach(b=>b.onclick=()=>deleteSchedule(b.dataset.deleteSchedule));
  document.querySelector('[data-action="save-schedule-history"]')?.addEventListener('click',saveScheduleHistory);
  document.querySelector('[data-action="show-reference-image"]')?.addEventListener('click',showReferenceImage);
  document.querySelectorAll('[data-view-history]').forEach(b=>b.onclick=()=>viewHistory(b.dataset.viewHistory));
  document.querySelectorAll('[data-delete-history]').forEach(b=>b.onclick=()=>deleteHistory(b.dataset.deleteHistory));
  document.querySelector('[data-action="add-professional"]')?.addEventListener('click',openProfessionalForm);
  document.querySelectorAll('[data-reminder-tab]').forEach(b=>b.onclick=()=>{state.reminderTab=b.dataset.reminderTab;render();});
  document.querySelectorAll('[data-action="new-instruction"]').forEach(b=>b.onclick=openInstructionModal);
  document.querySelectorAll('[data-toggle-reminder]').forEach(b=>b.onclick=()=>toggleReminder(b.dataset.toggleReminder));
  document.querySelectorAll('[data-archive-reminder]').forEach(b=>b.onclick=()=>archiveReminder(b.dataset.archiveReminder,true));
  document.querySelectorAll('[data-unarchive-reminder]').forEach(b=>b.onclick=()=>archiveReminder(b.dataset.unarchiveReminder,false));
  document.querySelectorAll('[data-delete-reminder]').forEach(b=>b.onclick=()=>deleteReminder(b.dataset.deleteReminder));
  document.querySelectorAll('[data-view-reminder]').forEach(b=>b.onclick=()=>viewReminder(b.dataset.viewReminder));
  document.getElementById('academicModeSwitch')?.addEventListener('change',e=>toggleAcademicMode(e.target.checked));
  document.getElementById('installAppBtn')?.addEventListener('click',installApp);
  document.getElementById('downloadOfflineBtn')?.addEventListener('click',downloadOfflineVisuals);
  document.querySelector('[data-action="export-backup"]')?.addEventListener('click',exportBackup);
  document.getElementById('backupInput')?.addEventListener('change',e=>importBackup(e.target.files[0]));
  document.querySelector('[data-action="clear-academic"]')?.addEventListener('click',clearAcademicData);
}
const originalRender=render;
render=async function(){await originalRender();bindPageEvents();};

async function registerServiceWorker(){
  if(!('serviceWorker' in navigator))return;
  try{
    const reg=await navigator.serviceWorker.register('./sw.js',{scope:'./'});state.swRegistration=reg;
    if(reg.waiting)showUpdate(reg);
    reg.addEventListener('updatefound',()=>{const worker=reg.installing;if(worker)worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)showUpdate(reg);});});
    let refreshing=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(refreshing)return;refreshing=true;location.reload();});
  }catch(e){console.error('SW',e);}
}
function showUpdate(reg){updateBanner.classList.remove('hidden');applyUpdateBtn.onclick=()=>{reg.waiting?.postMessage({type:'SKIP_WAITING'});};}

window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();state.deferredInstall=e;if(state.view==='more')render();});
window.addEventListener('appinstalled',()=>{state.deferredInstall=null;toast('PoliAgenda Pro instalada');if(state.view==='more')render();});
window.addEventListener('online',()=>toast('Conexión restablecida'));
window.addEventListener('offline',()=>toast('Modo sin conexión activo'));

async function init(){
  try{
    await loadData(); await migrateAndSeed(); await registerServiceWorker(); await render();
  }catch(e){
    console.error(e);
    app.innerHTML=`<main class="main"><div class="card danger"><h3>No se pudo iniciar PoliAgenda Pro</h3><p>Verifica que todos los archivos se hayan subido al repositorio y recarga la página.</p><p>${escapeHtml(e.message||String(e))}</p></div></main>`;
  }
}
if (typeof window !== 'undefined') window.PoliAgendaTest={normalize,compact,parseInstruction,parseDateFromText,extractTitle,findNextClass,formatDate};

/* =========================
   POLIAGENDA PRO v2.1
   Reorganización funcional y visual
   ========================= */
const ACTIVATION_HASH_V21='77fdb82a65f1267b496683a0f44ffde77144060f1dac8989f3b687fde132fe4a';
state.activityTab=state.activityTab||'upcoming';
state.reminderTab=['active','history','calendar'].includes(state.reminderTab)?state.reminderTab:'active';
state.calendarCursor=state.calendarCursor||todayISO().slice(0,7);
state.homeTimer=null;
state.remoteVersion=null;

async function hashTextV21(value){
  const bytes=new TextEncoder().encode(String(value));
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function versionPartsV21(v='0.0.0'){return String(v).split('.').map(n=>Number(n)||0);}
function isVersionNewerV21(remote,local){
  const a=versionPartsV21(remote),b=versionPartsV21(local);
  for(let i=0;i<Math.max(a.length,b.length);i++){if((a[i]||0)!==(b[i]||0))return (a[i]||0)>(b[i]||0);}return false;
}
function timeMinutesV21(value=''){const m=String(value).match(/^(\d{1,2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):null;}
function nowMinutesV21(){const d=new Date();return d.getHours()*60+d.getMinutes();}
function dateTimeValueV21(date,time){if(!date||!time)return null;const d=new Date(`${date}T${time}:00`);return Number.isNaN(d.getTime())?null:d;}
function activityStartV21(x){
  if(Array.isArray(x.times)&&x.times.length){const t=x.times.find(i=>i.time)?.time; if(t)return t;}
  return x.hora||x.time||x.formacion||x.inicio||'';
}
function activityEndV21(x){
  if(Array.isArray(x.times)&&x.times.length){const list=x.times.filter(i=>i.time);if(list.length>1)return list[list.length-1].time;}
  return x.fin||x.end||'';
}
function activityTitleV21(x){return x.titulo||x.title||x.materia||(/^formacion/i.test(normalize(x.tipo||''))?'Formación':'Actividad');}
function activityStagesV21(x){
  if(Array.isArray(x.times)&&x.times.length)return x.times;
  const out=[];
  if(x.arribo)out.push({label:'Arribo',time:x.arribo});
  if(x.hora||x.formacion)out.push({label:'Formación',time:x.hora||x.formacion});
  if(x.parte)out.push({label:'Parte',time:x.parte});
  if(!out.length&&x.time)out.push({label:'Inicio',time:x.time});
  return out;
}
function timelineStatusV21(start,end,now=nowMinutesV21()){
  const s=timeMinutesV21(start);if(s===null)return 'undated';
  let e=timeMinutesV21(end);if(e===null)e=s+60;
  if(now<s)return 'upcoming';if(now>=e)return 'completed';return 'current';
}
function remainingLabelV21(start,end){
  const now=nowMinutesV21(),s=timeMinutesV21(start),e=timeMinutesV21(end);
  if(s===null)return '';
  if(now<s){const diff=s-now;return diff>=60?`Comienza en ${Math.floor(diff/60)} h ${diff%60} min`:`Comienza en ${diff} min`;}
  if(e!==null&&now<e){const diff=e-now;return diff>=60?`En curso · faltan ${Math.floor(diff/60)} h ${diff%60} min`:`En curso · faltan ${diff} min`;}
  return 'Finalizada';
}
function isOverdueV21(r){return !r.done&&!r.archived&&r.date&&r.date<todayISO();}
function optionsMenuV21(items=[]){
  return `<details class="options-menu"><summary aria-label="Opciones">${icon('more')}<span>Opciones</span></summary><div class="options-popover">${items.join('')}</div></details>`;
}
function optionButtonV21(label,attrs='',danger=false,ico='edit'){return `<button type="button" class="option-item ${danger?'danger':''}" ${attrs}>${icon(ico)}<span>${escapeHtml(label)}</span></button>`;}

headerTemplate=function(){
  const date=new Intl.DateTimeFormat('es-BO',{day:'numeric',month:'short',year:'numeric'}).format(new Date()).replace('.','').toUpperCase();
  const mode=state.settings.academicMode?'Académico':'Profesional';
  return `<header class="app-header">
    <div class="header-top">
      <div class="brand-mark"><img src="./assets/escudo-policia.png" alt="Emblema de la Policía Boliviana"></div>
      <div class="brand-copy"><h1>PoliAgenda Pro</h1><p>${mode} · agenda y ayuda memoria policial</p></div>
      <button type="button" class="header-icon-btn" data-open-settings aria-label="Configuración">${icon('settings')}</button>
    </div>
    <div class="header-meta"><span class="date-chip">${escapeHtml(date)}</span><span class="connection-chip ${navigator.onLine?'online':'offline'}"><span></span>${navigator.onLine?'En línea':'Sin conexión'}</span></div>
    <div class="header-search"><label class="search-box" aria-label="Buscar en la biblioteca">${icon('search')}<input id="globalSearch" type="search" placeholder="Buscar: 3B tropical, artículo 55, marbete…" autocomplete="off" value="${attr(state.libraryQuery)}"></label></div>
  </header>`;
};

bottomNavTemplate=function(){
  const modeView=state.settings.academicMode?'academic':'professional';
  const items=[
    ['home','home','Inicio'],
    [modeView,state.settings.academicMode?'academic':'briefcase',state.settings.academicMode?'Académica':'Profesional'],
    ['activities','calendar','Formaciones'],
    ['library','book','Biblioteca'],
    ['reminders','bell','Pendientes'],
  ];
  return `<nav class="bottom-nav" aria-label="Navegación principal">${items.map(([view,ico,label])=>`<button type="button" class="nav-btn ${state.view===view?'active':''}" data-nav="${view}">${icon(ico)}<span>${label}</span></button>`).join('')}</nav>`;
};
function floatingActionTemplateV21(){return `<button type="button" class="fab" id="quickAddBtn" aria-label="Agregar rápidamente">${icon('plus')}<span>Agregar</span></button>`;}

render=async function(){
  clearTimeout(state.homeTimer);
  let content='';
  try{
    if(state.view==='home')content=await renderHome();
    else if(state.view==='library')content=await renderLibrary();
    else if(state.view==='academic')content=await renderAcademic();
    else if(state.view==='professional')content=await renderProfessional();
    else if(state.view==='activities')content=await renderActivitiesV21();
    else if(state.view==='reminders')content=await renderReminders();
    else if(state.view==='settings')content=await renderSettingsV21();
    else content=await renderHome();
  }catch(e){console.error(e);content=`<div class="card danger"><h3>No se pudo cargar esta sección</h3><p>${escapeHtml(e.message||String(e))}</p><div class="actions"><button class="btn primary" data-nav="home">Volver al inicio</button></div></div>`;}
  app.innerHTML=`<div class="app-shell">${headerTemplate()}<main class="main">${content}</main>${floatingActionTemplateV21()}${bottomNavTemplate()}</div>`;
  bindCommonEventsV21();bindPageEventsV21();
  if(state.view==='home')state.homeTimer=setTimeout(()=>render(),60000);
};
function bindCommonEventsV21(){
  document.querySelectorAll('[data-nav]').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.nav)));
  document.querySelector('[data-open-settings]')?.addEventListener('click',()=>navigate('settings'));
  document.getElementById('quickAddBtn')?.addEventListener('click',openQuickCreateV21);
  const search=document.getElementById('globalSearch');
  if(search){search.addEventListener('keydown',e=>{if(e.key==='Enter'){state.libraryQuery=search.value.trim();state.libraryDoc=null;state.libraryFilter='';navigate('library');}});search.addEventListener('search',()=>{if(!search.value){state.libraryQuery='';if(state.view==='library')render();}});}
}
navigate=function(view){
  state.view=view;
  if(view==='academic'&&!state.settings.academicMode)state.view='professional';
  if(view==='professional'&&state.settings.academicMode)state.view='academic';
  history.replaceState(null,'',`${location.pathname}${state.view!=='home'?`?view=${state.view}`:''}`);
  window.scrollTo({top:0,behavior:'smooth'});render();
};

function buildTodayTimelineV21(schedule,agenda){
  const day=DAYS[new Date().getDay()];
  const academic=schedule.filter(x=>x.dia===day).map(x=>({
    id:x.id,source:'schedule',tipo:x.tipo||'clase',titulo:x.materia||'Actividad académica',fecha:todayISO(),inicio:x.inicio||'',fin:x.fin||'',lugar:x.lugar||'',uniforme:x.uniforme||'',docente:x.docente||'',obs:x.observacion||''
  }));
  const dated=agenda.filter(x=>x.fecha===todayISO()).map(x=>({...x,source:'agenda',titulo:activityTitleV21(x),inicio:activityStartV21(x),fin:activityEndV21(x)}));
  return [...academic,...dated].sort((a,b)=>(a.inicio||'99:99').localeCompare(b.inicio||'99:99'));
}
function timelineCardV21(x,status){
  const label=remainingLabelV21(x.inicio,x.fin);
  return `<article class="card timeline-card ${status}"><div class="timeline-kicker">${status==='current'?'EN CURSO':status==='upcoming'?'PRÓXIMA ACTIVIDAD':'FINALIZADA'}</div><div class="card-head"><div class="icon-tile ${status==='current'?'gold':''}">${icon(normalize(x.tipo).includes('formacion')?'location':'clock')}</div><div class="card-main"><h3>${escapeHtml(x.titulo||'Actividad')}</h3><div class="card-meta"><span class="badge">${escapeHtml(x.inicio||'Sin hora')}${x.fin?`–${escapeHtml(x.fin)}`:''}</span>${label?`<span class="badge ${status==='current'?'gold':''}">${escapeHtml(label)}</span>`:''}</div>${x.docente?`<p>${escapeHtml(x.docente)}</p>`:''}${x.lugar?`<p>${icon('location')} ${escapeHtml(x.lugar)}</p>`:''}${x.uniforme?`<p><strong>Uniforme:</strong> ${escapeHtml(x.uniforme)}</p>`:''}</div></div></article>`;
}
renderHome=async function(){
  const agenda=await dbGet('agenda',[]),reminders=await dbGet('pendientes',[]),schedule=await dbGet('horarioSemanal',[]);
  const timeline=buildTodayTimelineV21(schedule,agenda);
  const current=timeline.find(x=>timelineStatusV21(x.inicio,x.fin)==='current');
  const next=timeline.find(x=>timelineStatusV21(x.inicio,x.fin)==='upcoming');
  const completed=timeline.filter(x=>timelineStatusV21(x.inicio,x.fin)==='completed');
  const active=reminders.filter(x=>!x.archived&&!x.done).sort(sortReminders);
  const overdue=active.filter(isOverdueV21);
  const lastBackup=await dbGet('lastBackup',null);
  const backupDue=!lastBackup||Date.now()-new Date(lastBackup).getTime()>7*86400000;
  return `<div class="page-title"><div><h2>Hoy</h2><p>${escapeHtml(formatDate(todayISO(),true))}</p></div></div>
    <div class="stack">
      ${current?timelineCardV21(current,'current'):next?`<div class="card info compact"><strong>No hay una actividad en curso.</strong><p>La siguiente comienza a las ${escapeHtml(next.inicio)}.</p></div>`:`<div class="card empty">${icon('calendar')}<p>No hay actividades registradas para este momento.</p></div>`}
      ${next?timelineCardV21(next,'upcoming'):''}
      <div class="summary-grid"><button class="summary-card" data-nav="reminders"><b>${active.length}</b><span>Pendientes activos</span><small>${overdue.length?`${overdue.length} vencido(s)`:'Todo al día'}</small></button><button class="summary-card" data-nav="activities"><b>${timeline.length}</b><span>Actividades de hoy</span><small>${completed.length} finalizada(s)</small></button></div>
      ${backupDue?`<article class="card warn compact"><div class="card-head"><div class="icon-tile">${icon('download')}</div><div class="card-main"><h3>Respaldo recomendado</h3><p>${lastBackup?'Han pasado más de 7 días desde el último respaldo.':'Todavía no realizaste un respaldo.'}</p><div class="actions"><button class="btn secondary small" data-action="export-backup">Crear respaldo</button></div></div></div></article>`:''}
      <article class="card"><div class="section-title" style="margin-top:0"><h3>Pendientes prioritarios</h3><button class="btn ghost small" data-nav="reminders">Ver todos</button></div>${active.length?active.slice(0,4).map(r=>`<button type="button" class="mini-reminder ${isOverdueV21(r)?'overdue':''}" data-view-reminder="${attr(r.id)}"><span>${r.recordType==='note'?'📝':'☐'}</span><div><strong>${escapeHtml(r.title)}</strong><small>${r.date?escapeHtml(formatDate(r.date)):'Sin fecha'}${isOverdueV21(r)?' · Vencido':''}</small></div></button>`).join(''):`<div class="empty compact"><p>No tienes pendientes activos.</p></div>`}</article>
      ${completed.length?`<details class="completed-list"><summary>Ver actividades anteriores de hoy (${completed.length})</summary><div class="stack">${completed.map(x=>timelineCardV21(x,'completed')).join('')}</div></details>`:''}
    </div>`;
};

renderAcademic=async function(){
  if(!state.settings.academicMode)return renderProfessional();
  if(state.academicSub==='schedule')return renderSchedulePage();
  if(state.academicSub==='history')return renderScheduleHistoryPage();
  const schedule=await dbGet('horarioSemanal',[]),histories=await dbGet('historialHorarios',[]);
  const todayItems=schedule.filter(x=>x.dia===DAYS[new Date().getDay()]).sort((a,b)=>(a.inicio||'').localeCompare(b.inicio||''));
  const current=todayItems.find(x=>timelineStatusV21(x.inicio,x.fin)==='current');
  const next=todayItems.find(x=>timelineStatusV21(x.inicio,x.fin)==='upcoming');
  return `<div class="page-title"><div><h2>Académica</h2><p>Horario, materias, docentes e historial del curso.</p></div></div><div class="stack">
    ${current?timelineCardV21({...current,titulo:current.materia},'current'):next?timelineCardV21({...next,titulo:next.materia},'upcoming'):`<div class="card empty">${icon('academic')}<p>No hay clases en curso ni próximas hoy.</p></div>`}
    <article class="card"><div class="card-head"><div class="icon-tile">${icon('calendar')}</div><div class="card-main"><h3>Horario semanal</h3><p>${schedule.length} bloques vigentes. Las clases finalizadas se muestran en gris y la actual se resalta.</p><div class="actions"><button class="btn primary small" data-academic-sub="schedule">Abrir horario</button><button class="btn secondary small" data-academic-sub="history">Historial (${histories.length})</button></div></div></div></article>
    <article class="card"><div class="section-title" style="margin-top:0"><h3>Clases de hoy</h3></div>${todayItems.length?todayItems.map(x=>scheduleRow(x)).join(''):`<div class="empty"><p>No hay clases registradas para hoy.</p></div>`}</article>
  </div>`;
};
renderProfessional=async function(){
  const agenda=await dbGet('agenda',[]),reminders=await dbGet('pendientes',[]);
  const upcoming=agenda.filter(x=>x.fecha>=todayISO()).sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||'')||(activityStartV21(a)||'').localeCompare(activityStartV21(b)||''));
  const active=reminders.filter(x=>!x.archived&&!x.done);
  return `<div class="page-title"><div><h2>Profesional</h2><p>Servicios, operativos, reuniones y pendientes institucionales.</p></div></div><div class="stack">
    <article class="card accent"><div class="card-head"><div class="icon-tile gold">${icon('briefcase')}</div><div class="card-main"><h3>Próxima actividad profesional</h3>${upcoming[0]?`<p><strong>${escapeHtml(activityTitleV21(upcoming[0]))}</strong></p><div class="card-meta"><span class="badge">${escapeHtml(formatDate(upcoming[0].fecha))}</span><span class="badge gold">${escapeHtml(activityStartV21(upcoming[0])||'Sin hora')}</span></div>`:'<p>No hay actividades futuras registradas.</p>'}<div class="actions"><button class="btn primary small" data-nav="activities">Abrir actividades</button></div></div></div></article>
    <div class="summary-grid"><button class="summary-card" data-nav="activities"><b>${upcoming.length}</b><span>Actividades futuras</span><small>Servicios y reuniones</small></button><button class="summary-card" data-nav="reminders"><b>${active.length}</b><span>Pendientes activos</span><small>Notas e instrucciones</small></button></div>
  </div>`;
};

function scheduleRow(x,readOnly=false){
  const isBreak=x.tipo==='descanso'||normalize(x.materia).includes('descanso');
  const status=x.dia===DAYS[new Date().getDay()]?timelineStatusV21(x.inicio,x.fin):'future';
  const actions=readOnly?'':optionsMenuV21([
    optionButtonV21('Editar',`data-edit-schedule="${attr(x.id)}"`,false,'edit'),
    optionButtonV21('Eliminar',`data-delete-schedule="${attr(x.id)}"`,true,'trash')
  ]);
  return `<div class="schedule-row ${isBreak?'break':''} ${status}"><div class="schedule-time">${escapeHtml(x.inicio||'')}<br>${x.fin?`<span>${escapeHtml(x.fin)}</span>`:''}</div><div class="schedule-body"><strong>${escapeHtml(x.materia||'Actividad')}</strong>${x.docente?`<span>${escapeHtml(x.docente)}</span>`:''}${x.lugar?`<span>${icon('location')} ${escapeHtml(x.lugar)}</span>`:''}${x.uniforme?`<span>Uniforme: ${escapeHtml(x.uniforme)}</span>`:''}${status==='current'?`<small class="status-label">En curso</small>`:status==='completed'?`<small class="status-label">Finalizada</small>`:''}</div>${actions}</div>`;
};

async function renderActivitiesV21(){
  const agenda=await dbGet('agenda',[]);
  const items=[...agenda].sort((a,b)=>(a.fecha||'').localeCompare(b.fecha||'')||(activityStartV21(a)||'').localeCompare(activityStartV21(b)||''));
  let body='';
  if(state.activityTab==='calendar')body=await renderCalendarV21();
  else{
    const list=items.filter(x=>{
      const dt=dateTimeValueV21(x.fecha,activityEndV21(x)||activityStartV21(x)||'23:59');
      const past=dt?dt.getTime()<Date.now():x.fecha<todayISO();
      return state.activityTab==='past'?past:!past;
    });
    body=`<div class="stack">${list.length?list.map(activityCardV21).join(''):`<div class="card empty">${icon('calendar')}<p>No hay actividades en esta sección.</p><button class="btn primary small" data-action="new-activity">Crear actividad</button></div>`}</div>`;
  }
  return `<div class="page-title"><div><h2>Formaciones / Actividades</h2><p>Formaciones, servicios, reuniones, actos y actividades extraordinarias.</p></div></div>
    <div class="screen-guide">${icon('info')} Registra una actividad manualmente o créala desde un mensaje de WhatsApp.</div>
    <div class="tabs"><button class="tab ${state.activityTab==='upcoming'?'active':''}" data-activity-tab="upcoming">Próximas</button><button class="tab ${state.activityTab==='calendar'?'active':''}" data-activity-tab="calendar">Calendario</button><button class="tab ${state.activityTab==='past'?'active':''}" data-activity-tab="past">Anteriores</button></div>${body}`;
}
function activityCardV21(x){
  const stages=activityStagesV21(x);
  const status=x.fecha===todayISO()?timelineStatusV21(activityStartV21(x),activityEndV21(x)):x.fecha<todayISO()?'completed':'upcoming';
  return `<article class="card activity-card ${status}"><div class="card-head"><div class="icon-tile ${normalize(x.tipo).includes('formacion')?'gold':''}">${icon(normalize(x.tipo).includes('formacion')?'location':'calendar')}</div><div class="card-main"><div class="activity-title-row"><div><h3>${escapeHtml(activityTitleV21(x))}</h3><div class="card-meta"><span class="badge">${escapeHtml(formatDate(x.fecha)||'Sin fecha')}</span><span class="badge blue">${escapeHtml(x.tipo||'Actividad')}</span></div></div>${optionsMenuV21([optionButtonV21('Editar',`data-edit-activity="${attr(x.id)}"`,false,'edit'),optionButtonV21('Duplicar',`data-duplicate-activity="${attr(x.id)}"`,false,'plus'),optionButtonV21('Eliminar',`data-delete-activity="${attr(x.id)}"`,true,'trash')])}</div>${stages.length?`<div class="stage-list">${stages.map(s=>`<span><b>${escapeHtml(s.time)}</b>${escapeHtml(s.label||'Hora')}</span>`).join('')}</div>`:''}${x.lugar?`<p>${icon('location')} ${escapeHtml(x.lugar)}</p>`:''}${x.uniforme?`<p><strong>Uniforme:</strong> ${escapeHtml(x.uniforme)}</p>`:''}${x.obs?`<p>${escapeHtml(excerpt(x.obs,180))}</p>`:''}</div></div></article>`;
}
function openActivityFormV21(item={}){
  const stages=activityStagesV21(item);if(!stages.length)stages.push({label:'Inicio',time:item.hora||''});
  modal(`<div class="modal-header"><div><h3>${item.id?'Editar actividad':'Nueva actividad'}</h3><p class="muted">Agrega las horas que necesites: arribo, formación, inicio, parte o final.</p></div><button class="modal-close" data-close-modal>${icon('close')}</button></div>
    <form id="activityForm"><input type="hidden" id="activityId" value="${attr(item.id||'')}"><div class="field"><label>Tipo</label><select id="activityType">${['Formación','Servicio','Reunión','Actividad académica','Acto institucional','Operativo','Otro'].map(t=>`<option ${normalize(t)===normalize(item.tipo||'')?'selected':''}>${t}</option>`).join('')}</select></div><div class="field"><label>Título</label><input class="input" id="activityTitle" value="${attr(activityTitleV21(item)==='Actividad'?'':activityTitleV21(item))}" placeholder="Ej.: Formación general, servicio de seguridad" required></div><div class="field"><label>Fecha</label><input class="input" id="activityDate" type="date" value="${attr(item.fecha||todayISO())}" required></div><div class="field"><label>Horas de la actividad</label><div id="activityTimes" class="stage-editor">${stages.map((s,i)=>stageRowEditorV21(s,i)).join('')}</div><button type="button" class="btn ghost small" id="addActivityTime">${icon('plus')} Agregar hora</button></div><div class="field"><label>Lugar</label><input class="input" id="activityPlace" value="${attr(item.lugar||'')}"></div><div class="field"><label>Enlace de ubicación</label><input class="input" id="activityLink" type="url" value="${attr(item.link||'')}"></div><div class="field"><label>Uniforme / prendas</label><input class="input" id="activityUniform" value="${attr(item.uniforme||'')}"></div><div class="field"><label>Observaciones</label><textarea id="activityNotes">${escapeHtml(item.obs||'')}</textarea></div><button class="btn primary full" type="submit">Guardar actividad</button></form>`,()=>{
      document.querySelector('[data-close-modal]').onclick=closeModal;document.getElementById('addActivityTime').onclick=()=>{const wrap=document.getElementById('activityTimes');wrap.insertAdjacentHTML('beforeend',stageRowEditorV21({label:'',time:''},wrap.children.length));bindStageRemoveV21();};bindStageRemoveV21();document.getElementById('activityForm').onsubmit=saveActivityFormV21;
    });
}
function stageRowEditorV21(s,i){return `<div class="stage-editor-row"><input class="input stage-label" placeholder="Ej.: Arribo" value="${attr(s.label||'')}"><input class="input stage-time" type="time" value="${attr(s.time||'')}"><button type="button" class="icon-btn danger remove-stage" aria-label="Quitar hora">${icon('close')}</button></div>`;}
function bindStageRemoveV21(){document.querySelectorAll('.remove-stage').forEach(b=>b.onclick=()=>{if(document.querySelectorAll('.stage-editor-row').length>1)b.closest('.stage-editor-row').remove();});}
async function saveActivityFormV21(e){
  e.preventDefault();let agenda=await dbGet('agenda',[]);const id=document.getElementById('activityId').value||uid('activity');const times=[...document.querySelectorAll('.stage-editor-row')].map(r=>({label:r.querySelector('.stage-label').value.trim()||'Hora',time:r.querySelector('.stage-time').value})).filter(x=>x.time);
  const item={id,tipo:document.getElementById('activityType').value,titulo:document.getElementById('activityTitle').value.trim(),fecha:document.getElementById('activityDate').value,times,lugar:document.getElementById('activityPlace').value.trim(),link:document.getElementById('activityLink').value.trim(),uniforme:document.getElementById('activityUniform').value.trim(),obs:document.getElementById('activityNotes').value.trim(),created:agenda.find(x=>x.id===id)?.created||nowISO(),updated:nowISO()};
  if(normalize(item.tipo).includes('formacion')){item.arribo=times.find(x=>normalize(x.label).includes('arribo'))?.time||'';item.hora=times.find(x=>normalize(x.label).includes('formacion'))?.time||times[0]?.time||'';item.parte=times.find(x=>normalize(x.label).includes('parte'))?.time||'';}
  const i=agenda.findIndex(x=>x.id===id);if(i>=0)agenda[i]=item;else agenda.push(item);await dbSet('agenda',agenda);closeModal();toast('Actividad guardada');state.view='activities';state.activityTab='upcoming';render();
}
async function editActivityV21(id){const a=await dbGet('agenda',[]);const x=a.find(i=>i.id===id);if(x)openActivityFormV21(x);}
async function duplicateActivityV21(id){const a=await dbGet('agenda',[]);const x=a.find(i=>i.id===id);if(x)openActivityFormV21({...x,id:'',titulo:`${activityTitleV21(x)} (copia)`});}
async function deleteActivityV21(id){if(!confirm('¿Eliminar esta actividad?'))return;let a=await dbGet('agenda',[]);a=a.filter(x=>x.id!==id);await dbSet('agenda',a);toast('Actividad eliminada');render();}

async function renderCalendarV21(){
  const agenda=await dbGet('agenda',[]),rem=await dbGet('pendientes',[]);const [y,m]=state.calendarCursor.split('-').map(Number);const first=new Date(y,m-1,1),days=new Date(y,m,0).getDate(),start=(first.getDay()+6)%7;const cells=[];for(let i=0;i<start;i++)cells.push('<div class="calendar-cell empty-cell"></div>');
  for(let d=1;d<=days;d++){const date=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;const ev=agenda.filter(x=>x.fecha===date),pd=rem.filter(x=>x.date===date&&!x.archived);cells.push(`<button type="button" class="calendar-cell ${date===todayISO()?'today':''}" data-calendar-date="${date}"><b>${d}</b><span>${ev.slice(0,3).map(()=>'<i class="dot event"></i>').join('')}${pd.slice(0,3).map(()=>'<i class="dot pending"></i>').join('')}</span></button>`);}
  const title=new Intl.DateTimeFormat('es-BO',{month:'long',year:'numeric'}).format(first);
  return `<article class="card calendar-card"><div class="calendar-head"><button class="icon-btn" data-calendar-move="-1">‹</button><h3>${escapeHtml(title)}</h3><button class="icon-btn" data-calendar-move="1">›</button></div><div class="calendar-week"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div><div class="calendar-grid">${cells.join('')}</div><div class="calendar-legend"><span><i class="dot event"></i>Actividades</span><span><i class="dot pending"></i>Pendientes</span></div></article>`;
}
async function openCalendarDayV21(date){const a=(await dbGet('agenda',[])).filter(x=>x.fecha===date),r=(await dbGet('pendientes',[])).filter(x=>x.date===date&&!x.archived);modal(`<div class="modal-header"><div><h3>${escapeHtml(formatDate(date,true))}</h3><p class="muted">Actividades y pendientes de la fecha.</p></div><button class="modal-close" data-close-modal>${icon('close')}</button></div><div class="stack">${a.map(activityCardV21).join('')}${r.map(reminderCard).join('')||(!a.length?'<div class="empty"><p>No hay registros.</p></div>':'')}</div>`,()=>document.querySelector('[data-close-modal]').onclick=closeModal);}

renderReminders=async function(){
  const reminders=await dbGet('pendientes',[]);let body='';
  if(state.reminderTab==='calendar')body=await renderCalendarV21();
  else{const filtered=reminders.filter(x=>state.reminderTab==='history'?x.archived:!x.archived&&!x.done).sort(sortReminders);body=`<div class="stack">${filtered.length?filtered.map(reminderCard).join(''):`<div class="card empty">${icon('bell')}<p>${state.reminderTab==='history'?'No hay elementos archivados.':'No hay pendientes ni notas activas.'}</p></div>`}</div>`;}
  return `<div class="page-title"><div><h2>Pendientes y Notificaciones</h2><p>Notas rápidas, tareas, instrucciones y mensajes organizados.</p></div></div><div class="screen-guide">${icon('info')} Una nota no necesita fecha. Un pendiente puede vencer. Un mensaje de WhatsApp puede convertirse en actividad.</div><div class="tabs"><button class="tab ${state.reminderTab==='active'?'active':''}" data-reminder-tab="active">Activos</button><button class="tab ${state.reminderTab==='history'?'active':''}" data-reminder-tab="history">Anteriores</button><button class="tab ${state.reminderTab==='calendar'?'active':''}" data-reminder-tab="calendar">Calendario</button></div>${body}`;
};
reminderCard=function(r){
  const overdue=isOverdueV21(r);const type=r.recordType||(/nota/i.test(r.tipo||'')?'note':'pending');
  return `<article class="card compact reminder-card ${overdue?'overdue':''}"><div class="check-line"><button class="check-btn" data-toggle-reminder="${attr(r.id||'')}" aria-label="Marcar resuelto"></button><div class="card-main"><div class="activity-title-row"><div><h4>${escapeHtml(r.title||'Sin título')}</h4><div class="card-meta"><span class="badge blue">${type==='note'?'Nota':type==='notification'?'Notificación':'Pendiente'}</span>${r.prio?`<span class="badge ${r.prio==='Urgente'?'red':r.prio==='Importante'?'gold':''}">${escapeHtml(r.prio)}</span>`:''}${r.date?`<span class="badge ${overdue?'red':''}">${escapeHtml(formatDate(r.date))}${overdue?' · Vencido':''}</span>`:''}</div></div>${optionsMenuV21([optionButtonV21('Ver detalle',`data-view-reminder="${attr(r.id)}"`,false,'info'),optionButtonV21('Archivar',`data-archive-reminder="${attr(r.id)}"`,false,'archive'),optionButtonV21('Eliminar',`data-delete-reminder="${attr(r.id)}"`,true,'trash')])}</div>${r.obs||r.raw?`<p>${escapeHtml(excerpt(r.obs||r.raw,220))}</p>`:''}</div></div></article>`;
};
toggleReminder=async function(id){let list=await dbGet('pendientes',[]);const i=list.findIndex(x=>x.id===id);if(i>=0){list[i].done=true;list[i].archived=true;list[i].resolvedAt=nowISO();list[i].updated=nowISO();await dbSet('pendientes',list);toast('Marcado como resuelto y archivado');render();}};

function openQuickCreateV21(){modal(`<div class="modal-header"><div><h3>Agregar rápidamente</h3><p class="muted">Elige qué deseas registrar.</p></div><button class="modal-close" data-close-modal>${icon('close')}</button></div><div class="quick-create-grid"><button data-quick-kind="note">📝<strong>Nota rápida</strong><span>Idea o información sin fecha obligatoria</span></button><button data-quick-kind="pending">☐<strong>Pendiente</strong><span>Tarea con fecha o prioridad</span></button><button data-quick-kind="activity">📅<strong>Formación / actividad</strong><span>Servicio, reunión o evento</span></button><button data-quick-kind="whatsapp">💬<strong>Mensaje WhatsApp</strong><span>Guardar u organizar un comunicado</span></button></div>`,()=>{document.querySelector('[data-close-modal]').onclick=closeModal;document.querySelectorAll('[data-quick-kind]').forEach(b=>b.onclick=()=>{const k=b.dataset.quickKind;closeModal();if(k==='activity')openActivityFormV21();else if(k==='whatsapp')openInstructionModal();else openSimpleReminderFormV21(k);});});}
function openSimpleReminderFormV21(kind='note'){
  const isNote=kind==='note';modal(`<div class="modal-header"><div><h3>${isNote?'Nueva nota rápida':'Nuevo pendiente'}</h3><p class="muted">${isNote?'La fecha es opcional.':'Registra lo necesario sin llenar campos innecesarios.'}</p></div><button class="modal-close" data-close-modal>${icon('close')}</button></div><form id="simpleReminderForm"><input type="hidden" id="simpleKind" value="${kind}"><div class="field"><label>Título</label><input class="input" id="simpleTitle" required placeholder="${isNote?'Ej.: Consultar al docente':'Ej.: Presentar fotocopia de CI'}"></div><div class="field"><label>Detalle</label><textarea id="simpleText"></textarea></div><div class="form-grid"><div class="field"><label>Fecha ${isNote?'(opcional)':''}</label><input class="input" id="simpleDate" type="date"></div><div class="field"><label>Hora (opcional)</label><input class="input" id="simpleTime" type="time"></div></div><div class="field"><label>Prioridad</label><select id="simplePriority"><option>Normal</option><option>Importante</option><option>Urgente</option></select></div><button class="btn primary full" type="submit">Guardar</button></form>`,()=>{document.querySelector('[data-close-modal]').onclick=closeModal;document.getElementById('simpleReminderForm').onsubmit=saveSimpleReminderV21;});
}
async function saveSimpleReminderV21(e){e.preventDefault();let l=await dbGet('pendientes',[]);const kind=document.getElementById('simpleKind').value;l.unshift({id:uid('reminder'),title:document.getElementById('simpleTitle').value.trim(),obs:document.getElementById('simpleText').value.trim(),date:document.getElementById('simpleDate').value,time:document.getElementById('simpleTime').value,prio:document.getElementById('simplePriority').value,recordType:kind,tipo:kind==='note'?'Nota':'Pendiente',done:false,archived:false,created:nowISO()});await dbSet('pendientes',l);closeModal();state.view='reminders';state.reminderTab='active';toast(kind==='note'?'Nota guardada':'Pendiente guardado');render();}

function generateTitleSuggestionsV21(raw){
  const low=normalize(raw),parsed=parseInstruction(raw,'');const out=[];
  const add=x=>{x=String(x||'').replace(/\s+/g,' ').trim().replace(/[.:;,-]+$/,'');if(x&&x.length<=80&&!out.some(y=>normalize(y)===normalize(x)))out.push(x);};
  if(/boleta|deposito|colegiatura/.test(low)){add('Presentar boleta de depósito');add('Realizar pago de colegiatura');add('Entrega de boleta de colegiatura');}
  if(/formacion/.test(low)){add(parsed.rectification?'Cambio de hora de formación':'Formación general');add(parsed.place?`Formación en ${parsed.place}`:'Instrucción de formación');add('Uniforme y horario de formación');}
  if(/orden de guarnicion|servicio|operativo/.test(low)){const m=raw.match(/(?:ORDEN DE GUARNICI[ÓO]N[^\n]*\n+)?([^\n]{12,120})/i);add(m?.[1]);add('Servicio u orden institucional');add('Actividad operativa programada');}
  if(/fotocopia/.test(low)){add('Presentar fotocopia requerida');add('Preparar documentación solicitada');}
  const lines=raw.split(/\n+/).map(x=>x.replace(/[\*🚨📢⚠️❗🏦📅📍🦺]/g,'').trim()).filter(x=>x.length>5&&x.length<100&&!/^(se comunica|señores|buenas|con el permiso)/i.test(x));lines.slice(0,4).forEach(add);
  add(extractTitle(raw));add(parsed.tipo==='Requisito'?'Cumplir requisito pendiente':parsed.tipo==='Servicio'?'Servicio institucional':parsed.tipo==='Formación'?'Formación programada':'Nueva instrucción');
  return out.slice(0,3);
}
function detectActionsV21(raw){
  const lines=raw.split(/\n|\.|;/).map(x=>x.trim()).filter(Boolean);const verbs=/(llevar|presentar|entregar|consultar|preguntar|pagar|depositar|asistir|llegar|comprar|enviar|firmar|imprimir|fotocopiar)/i;return lines.filter(x=>verbs.test(x)).map(x=>x.replace(/^.*?(?=(llevar|presentar|entregar|consultar|preguntar|pagar|depositar|asistir|llegar|comprar|enviar|firmar|imprimir|fotocopiar))/i,'').trim()).slice(0,6);
}
openInstructionModal=function(){
  modal(`<div class="modal-header"><div><h3>Mensaje WhatsApp inteligente</h3><p class="muted">Pega el mensaje. Puedes conservarlo tal cual o convertirlo en una ficha organizada.</p></div><button class="modal-close" data-close-modal>${icon('close')}</button></div><div class="field"><label>Mensaje</label><textarea id="instructionRaw" placeholder="Pega aquí el comunicado o una instrucción informal…"></textarea></div><div id="instructionSuggestions"></div><div class="actions"><button class="btn secondary" id="saveRawInstruction">Guardar como nota</button><button class="btn primary" id="organizeInstruction">Organizar mensaje</button></div>`,()=>{document.querySelector('[data-close-modal]').onclick=closeModal;const raw=document.getElementById('instructionRaw');raw.addEventListener('input',()=>{const s=generateTitleSuggestionsV21(raw.value);document.getElementById('instructionSuggestions').innerHTML=s.length?`<div class="field"><label>Elige un título sugerido</label><div class="suggestion-chips">${s.map((x,i)=>`<button type="button" class="suggestion-chip ${i===0?'selected':''}" data-title-choice="${attr(x)}">${escapeHtml(x)}</button>`).join('')}</div></div>`:'';document.querySelectorAll('[data-title-choice]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-title-choice]').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');});});document.getElementById('saveRawInstruction').onclick=saveRawInstructionV21;document.getElementById('organizeInstruction').onclick=organizeInstructionV21;});
};
function selectedSuggestedTitleV21(){return document.querySelector('[data-title-choice].selected')?.dataset.titleChoice||'';}
async function saveRawInstructionV21(){const raw=document.getElementById('instructionRaw').value.trim();if(!raw)return toast('Pega o escribe un mensaje');const title=selectedSuggestedTitleV21()||generateTitleSuggestionsV21(raw)[0]||'Nota recibida';let l=await dbGet('pendientes',[]);l.unshift({id:uid('note'),title,raw,obs:raw,recordType:'note',tipo:'Nota',prio:/urgente|obligatori|impostergable/i.test(raw)?'Urgente':'Normal',done:false,archived:false,created:nowISO()});await dbSet('pendientes',l);closeModal();state.view='reminders';state.reminderTab='active';toast('Mensaje guardado como nota');render();}
async function organizeInstructionV21(){
  const raw=document.getElementById('instructionRaw').value.trim();if(!raw)return toast('Pega o escribe un mensaje');const suggestions=generateTitleSuggestionsV21(raw),chosen=selectedSuggestedTitleV21()||suggestions[0]||'';const actions=detectActionsV21(raw);
  if(actions.length>1){modal(`<div class="modal-header"><div><h3>Se detectaron varias acciones</h3><p class="muted">Elige cómo deseas guardar el mensaje.</p></div><button class="modal-close" data-close-modal>${icon('close')}</button></div><div class="card compact">${actions.map(x=>`<p>☐ ${escapeHtml(x)}</p>`).join('')}</div><div class="actions"><button class="btn secondary" id="keepOneNote">Guardar como una nota</button><button class="btn primary" id="splitPendings">Crear ${actions.length} pendientes</button></div>`,()=>{document.querySelector('[data-close-modal]').onclick=closeModal;document.getElementById('keepOneNote').onclick=()=>{closeModal();openInstructionReviewV21(raw,chosen,suggestions);};document.getElementById('splitPendings').onclick=()=>splitActionsV21(actions,raw);});return;
  }
  openInstructionReviewV21(raw,chosen,suggestions);
}
function openInstructionReviewV21(raw,chosen,suggestions){
  const parsed=parseInstruction(raw,chosen);findPossibleUpdates(parsed).then(existing=>modal(`<div class="modal-header"><div><h3>Revisar información detectada</h3><p class="muted">Nada se guarda hasta que confirmes.</p></div><button class="modal-close" data-close-modal>${icon('close')}</button></div>${parsed.rectification?`<div class="card warn compact"><strong>Posible modificación detectada</strong><p>Este mensaje puede reemplazar o actualizar una instrucción anterior.</p></div>`:''}<form id="parsedForm"><div class="field"><label>Título</label><div class="suggestion-chips">${suggestions.map((x,i)=>`<button type="button" class="suggestion-chip ${x===chosen||(!chosen&&i===0)?'selected':''}" data-review-title="${attr(x)}">${escapeHtml(x)}</button>`).join('')}</div><input class="input" id="parsedTitle" value="${attr(chosen||parsed.title)}" required></div><div class="form-grid"><div class="field"><label>Tipo</label><select id="parsedType">${['Nota','Pendiente','Formación','Servicio','Reunión','Requisito'].map(x=>`<option ${x===parsed.tipo?'selected':''}>${x}</option>`).join('')}</select></div><div class="field"><label>Prioridad</label><select id="parsedPriority"><option ${parsed.priority==='Normal'?'selected':''}>Normal</option><option>Importante</option><option ${parsed.priority==='Urgente'?'selected':''}>Urgente</option></select></div><div class="field"><label>Fecha</label><input class="input" id="parsedDate" type="date" value="${attr(parsed.date)}"></div><div class="field"><label>Hora principal</label><input class="input" id="parsedTime" type="time" value="${attr(parsed.time)}"></div><div class="field"><label>Hora de arribo</label><input class="input" id="parsedArrival" type="time" value="${attr(parsed.arrival)}"></div><div class="field"><label>Hora del parte</label><input class="input" id="parsedPart" type="time" value="${attr(parsed.part)}"></div><div class="field full"><label>Lugar</label><input class="input" id="parsedPlace" value="${attr(parsed.place)}" placeholder="Pendiente de confirmar"></div><div class="field full"><label>Enlace de ubicación</label><input class="input" id="parsedLink" type="url" value="${attr(parsed.link)}"></div><div class="field full"><label>Uniforme / prendas</label><input class="input" id="parsedUniform" value="${attr(parsed.uniform)}"></div>${parsed.rectification&&existing.length?`<div class="field full"><label>Relacionar con registro anterior</label><select id="parsedReplace"><option value="">Guardar como nueva versión</option>${existing.map(x=>`<option value="${attr(x.id)}">Actualizar: ${escapeHtml(x.title)}</option>`).join('')}</select></div>`:''}<div class="field full"><label>Mensaje original</label><textarea id="parsedRaw">${escapeHtml(raw)}</textarea></div></div><button class="btn primary full" type="submit">Guardar ficha</button></form>`,()=>{document.querySelector('[data-close-modal]').onclick=closeModal;document.querySelectorAll('[data-review-title]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-review-title]').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');document.getElementById('parsedTitle').value=b.dataset.reviewTitle;});document.getElementById('parsedForm').onsubmit=saveParsedInstructionV21;}));
}
async function splitActionsV21(actions,raw){let l=await dbGet('pendientes',[]);actions.forEach(x=>l.unshift({id:uid('pending'),title:x.slice(0,80),obs:raw,raw,recordType:'pending',tipo:'Pendiente',prio:'Normal',done:false,archived:false,created:nowISO()}));await dbSet('pendientes',l);closeModal();state.view='reminders';state.reminderTab='active';toast(`${actions.length} pendientes creados`);render();}
async function saveParsedInstructionV21(e){e.preventDefault();const type=document.getElementById('parsedType').value;const replace=document.getElementById('parsedReplace')?.value||'';const raw=document.getElementById('parsedRaw').value.trim();const item={id:replace||uid('record'),title:document.getElementById('parsedTitle').value.trim(),tipo:type,recordType:type==='Nota'?'note':type==='Pendiente'||type==='Requisito'?'pending':'notification',prio:document.getElementById('parsedPriority').value,date:document.getElementById('parsedDate').value,time:document.getElementById('parsedTime').value,arrival:document.getElementById('parsedArrival').value,part:document.getElementById('parsedPart').value,lugar:document.getElementById('parsedPlace').value.trim(),link:document.getElementById('parsedLink').value.trim(),uniforme:document.getElementById('parsedUniform').value.trim(),obs:raw,raw,done:false,archived:false,created:nowISO(),updated:nowISO()};let l=await dbGet('pendientes',[]);if(replace){const i=l.findIndex(x=>x.id===replace);if(i>=0){item.created=l[i].created;item.versions=[...(l[i].versions||[]),{...l[i],versionSaved:nowISO()}];l[i]=item;}else l.unshift(item);}else l.unshift(item);await dbSet('pendientes',l);if(['Formación','Servicio','Reunión'].includes(type)){let a=await dbGet('agenda',[]);a.push({id:uid('activity'),tipo:type,titulo:item.title,fecha:item.date,times:[{label:'Arribo',time:item.arrival},{label:type==='Formación'?'Formación':'Inicio',time:item.time},{label:'Parte',time:item.part}].filter(x=>x.time),lugar:item.lugar,link:item.link,uniforme:item.uniforme,obs:item.raw,sourceReminderId:item.id,created:nowISO()});await dbSet('agenda',a);}closeModal();state.view=['Formación','Servicio','Reunión'].includes(type)?'activities':'reminders';toast(replace?'Registro actualizado':'Ficha guardada');render();}

renderLibraryResults=function(term){
  const q=normalize(term),qc=compact(term);const tropical=q.includes('tropical')||q.includes('manga corta'),standard=q.includes('estandar')||q.includes('manga larga');const docs=[...state.uniformes.articulos.map(a=>({...a,_doc:'uniformes'})),...state.sumario.articulos.map(a=>({...a,_doc:'sumario'}))];
  const results=docs.map(a=>{const aliases=[...(a.alias_busqueda||[]),a.codigo,a.variante,a.manga].filter(Boolean);const hay=[a.numero,a.titulo,a.texto,...aliases,...(a.palabras_clave||[])].join(' '),n=normalize(hay),c=compact(hay);let score=0;if(normalize(a.numero)===q)score+=100;if(normalize(a.titulo)===q)score+=90;if(aliases.some(x=>normalize(x)===q||compact(x)===qc))score+=85;if(normalize(a.titulo).includes(q))score+=40;if(n.includes(q))score+=20;if(qc.length>=2&&c.includes(qc))score+=25;if(tropical&&a.variante==='Tropical')score+=120;if(tropical&&a.variante==='Estándar')score-=80;if(standard&&a.variante==='Estándar')score+=100;if(standard&&a.variante==='Tropical')score-=60;for(const token of q.split(' '))if(token&&n.includes(token))score+=3;return{a,score};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,100);
  return `<div class="section-title"><h3>Resultados</h3><small>${results.length} coincidencias</small></div><div class="search-results">${results.length?results.map(({a})=>articleCard(a)).join(''):`<div class="card empty">${icon('search')}<p>No se encontraron coincidencias para “${escapeHtml(term)}”.</p></div>`}</div>`;
};
openArticle=function(doc,id){
  const source=doc==='uniformes'?state.uniformes:state.sumario;const a=source.articulos.find(x=>x.id===id);if(!a)return;const favKey=`${doc}:${id}`;dbGet('favorites',[]).then(favs=>{const isFav=favs.includes(favKey);const images=[a.imagen_principal,...(a.imagenes_asociadas||[])].filter(Boolean).filter((x,i,l)=>l.indexOf(x)===i);modal(`<div class="modal-header"><div><div class="article-number">${escapeHtml(a.numero)}</div><h3>${escapeHtml(a.titulo)}</h3></div><button class="modal-close" data-close-modal aria-label="Cerrar">${icon('close')}</button></div><div class="card-meta"><span class="badge">${doc==='uniformes'?'Reglamento de Uniformes':'Comisión Sumaria UNIPOL'}</span>${a.variante?`<span class="badge gold">${escapeHtml(a.variante)} · Manga ${escapeHtml(a.manga||'')}</span>`:''}${a.visual_validado?`<span class="badge blue">Visual verificado</span>`:''}${a.pagina_inicio?`<span class="badge">Artículo: páginas ${a.pagina_inicio}-${a.pagina_fin}</span>`:''}</div>${a.imagen_principal?`<div class="validated-visual"><img id="articleMainImage" src="./${attr(a.imagen_principal)}" alt="${escapeHtml(a.titulo)} ${escapeHtml(a.variante||'')}"><p>Imagen recortada y vinculada por la secuencia real del documento. Fuente visual: página PDF ${a.visual_fuente_pdf}.</p></div>`:''}<div class="article-body">${escapeHtml(a.texto)}</div>${images.length>1?`<div class="section-title"><h3>Páginas originales relacionadas</h3></div><div class="image-strip">${images.slice(a.imagen_principal?1:0).map(img=>`<button data-image-src="./${attr(img)}"><img src="./${attr(img)}" alt="Página original" loading="lazy"></button>`).join('')}</div>`:''}<div class="actions"><button class="btn ${isFav?'gold':'secondary'}" id="favoriteBtn" data-fav-key="${attr(favKey)}">${isFav?'★ Favorito':'☆ Agregar a favoritos'}</button>${doc==='uniformes'&&a.pagina_inicio?`<a class="btn ghost" href="./assets/reglamento-uniformes-2021.pdf#page=${a.pagina_inicio}" target="_blank" rel="noopener">Abrir PDF</a>`:''}</div>`,()=>bindArticleModal());});
};

async function renderSettingsV21(){
  const profile=await dbGet('profile',{custom:[]}),lastBackup=await dbGet('lastBackup',null),media=await dbGet('mediaOffline',null),lastCheck=await dbGet('lastUpdateCheck',null);
  return `<div class="actions" style="margin:0 0 12px"><button class="btn secondary small" data-nav="home">${icon('back')} Volver</button></div><div class="page-title"><div><h2>Configuración</h2><p>Modo de uso, perfil voluntario, actualización y respaldo.</p></div></div><div class="stack"><article class="card"><div class="switch-row"><div><h3>Modo académico</h3><p>Al desactivarlo, se ocultan el horario y las materias. Formaciones, servicios, biblioteca y pendientes siguen disponibles.</p></div><label class="switch"><input id="academicModeSwitch" type="checkbox" ${state.settings.academicMode?'checked':''}><span class="slider"></span></label></div></article><article class="card"><div class="card-head"><div class="icon-tile">${icon('info')}</div><div class="card-main"><h3>Perfil voluntario</h3><p>${profile.name?`${escapeHtml(profile.grade||'')} ${escapeHtml(profile.name)}`:'Guarda datos que necesites consultar o copiar con frecuencia.'}</p><div class="actions"><button class="btn secondary small" data-action="edit-profile">Editar perfil</button></div></div></div></article><article class="card"><div class="card-head"><div class="icon-tile gold">${icon('download')}</div><div class="card-main"><h3>Actualizaciones</h3><p>La aplicación comprueba automáticamente GitHub cuando hay internet. Nunca interrumpe un registro.</p><div class="card-meta"><span class="badge">Versión instalada: ${APP_VERSION}</span><span class="badge">Última revisión: ${lastCheck?escapeHtml(new Date(lastCheck).toLocaleString('es-BO')):'Nunca'}</span></div><div class="actions"><button class="btn secondary small" data-action="check-update">Buscar actualización</button></div></div></div></article><article class="card"><div class="card-head"><div class="icon-tile">${icon('download')}</div><div class="card-main"><h3>Respaldo</h3><p>Se recomienda cada 7 días. Incluye agenda, horarios, notas, pendientes, perfil y configuración.</p><div class="card-meta"><span class="badge">Último: ${lastBackup?escapeHtml(new Date(lastBackup).toLocaleString('es-BO')):'Nunca'}</span></div><div class="actions"><button class="btn primary small" data-action="export-backup">Exportar</button><label class="btn secondary small" for="backupInput">Importar</label><input class="file-input" id="backupInput" type="file" accept="application/json,.json"></div></div></div></article><article class="card"><div class="card-head"><div class="icon-tile">${icon('install')}</div><div class="card-main"><h3>${isStandalone()?'Aplicación instalada':'Instalar aplicación'}</h3><p>${isStandalone()?'Se abre en modo independiente.':'Instálala desde Chrome para usarla como aplicación.'}</p>${!isStandalone()?`<div class="actions"><button class="btn secondary small" id="installAppBtn">Instalar</button></div>`:''}</div></div></article><article class="card"><div class="card-head"><div class="icon-tile">${icon('image')}</div><div class="card-main"><h3>Material visual offline</h3><p>Descarga opcionalmente el PDF y las páginas de uniformes.</p><div class="card-meta"><span class="badge" id="mediaOfflineStatus">${media?.completed?'Descargado':'Opcional'}</span></div><div class="actions"><button class="btn secondary small" id="downloadOfflineBtn">Descargar material</button></div></div></div></article><article class="card danger"><h3>Eliminar datos académicos</h3><p>Elimina horario e historial, pero no formaciones, servicios ni recordatorios.</p><div class="actions"><button class="btn danger small" data-action="clear-academic">Eliminar</button></div></article></div>`;
}
function openProfileV21(){dbGet('profile',{custom:[]}).then(p=>modal(`<div class="modal-header"><div><h3>Perfil voluntario</h3><p class="muted">Ningún dato es obligatorio.</p></div><button class="modal-close" data-close-modal>${icon('close')}</button></div><form id="profileForm"><div class="field"><label>Nombre completo</label><input class="input" id="profileName" value="${attr(p.name||'')}"></div><div class="field"><label>Grado</label><input class="input" id="profileGrade" value="${attr(p.grade||'')}"></div><div class="field"><label>Número de escalafón</label><input class="input" id="profileScale" value="${attr(p.scale||'')}"></div><div class="field"><label>Otros datos</label><div id="profileCustom">${(p.custom||[]).map(profileCustomRowV21).join('')}</div><button type="button" class="btn ghost small" id="addProfileField">${icon('plus')} Agregar dato</button></div><button class="btn primary full" type="submit">Guardar perfil</button></form>`,()=>{document.querySelector('[data-close-modal]').onclick=closeModal;document.getElementById('addProfileField').onclick=()=>document.getElementById('profileCustom').insertAdjacentHTML('beforeend',profileCustomRowV21({}));document.getElementById('profileForm').onsubmit=saveProfileV21;}));}
function profileCustomRowV21(x={}){return `<div class="profile-custom-row"><input class="input custom-label" placeholder="Nombre del dato" value="${attr(x.label||'')}"><input class="input custom-value" placeholder="Valor" value="${attr(x.value||'')}"></div>`;}
async function saveProfileV21(e){e.preventDefault();const custom=[...document.querySelectorAll('.profile-custom-row')].map(r=>({label:r.querySelector('.custom-label').value.trim(),value:r.querySelector('.custom-value').value.trim()})).filter(x=>x.label||x.value);await dbSet('profile',{name:document.getElementById('profileName').value.trim(),grade:document.getElementById('profileGrade').value.trim(),scale:document.getElementById('profileScale').value.trim(),custom});closeModal();toast('Perfil guardado');render();}
async function checkForUpdateV21(manual=false){
  if(!navigator.onLine){if(manual)toast('Sin conexión para comprobar actualizaciones');return;}
  try{const r=await fetch(`./version.json?ts=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error('version');const v=await r.json();await dbSet('lastUpdateCheck',nowISO());if(isVersionNewerV21(v.version,APP_VERSION)){state.remoteVersion=v;updateBanner.classList.remove('hidden');updateBanner.querySelector('span').textContent=`Nueva versión ${v.version} disponible.`;applyUpdateBtn.textContent='Actualizar y reiniciar';applyUpdateBtn.onclick=async()=>{try{const reg=await navigator.serviceWorker.getRegistration();await reg?.update();if(reg?.waiting)reg.waiting.postMessage({type:'SKIP_WAITING'});else location.reload();}catch(_){location.reload();}};if(manual)toast(`Nueva versión ${v.version} disponible`);}else if(manual)toast('Ya tienes la versión más reciente');}catch(e){console.warn(e);if(manual)toast('No se pudo comprobar la actualización');}
}

async function renderActivationV21(){
  app.innerHTML=`<main class="activation-shell"><section class="activation-card"><div class="activation-emblem"><img src="./assets/escudo-policia.png" alt="Emblema de la Policía Boliviana"></div><p class="eyebrow">ACCESO AUTORIZADO</p><h1>PoliAgenda Pro</h1><p>Ingresa el código de activación para habilitar la aplicación en este dispositivo.</p><form id="activationForm"><label for="activationCode">Código de activación</label><input id="activationCode" class="activation-input" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="one-time-code" placeholder="••••••" required><button class="btn primary full" type="submit">Activar aplicación</button><p id="activationError" class="activation-error hidden">Código incorrecto.</p></form><small>La activación se conserva hasta que se borren los datos o se reinstale la aplicación.</small></section></main>`;
  document.getElementById('activationForm').onsubmit=async e=>{e.preventDefault();const value=document.getElementById('activationCode').value.trim();if(await hashTextV21(value)!==ACTIVATION_HASH_V21){document.getElementById('activationError').classList.remove('hidden');return;}await dbSet('activation',{active:true,activatedAt:nowISO()});await loadData();await migrateAndSeed();renderModeChoiceV21();};
}
function renderModeChoiceV21(){app.innerHTML=`<main class="activation-shell"><section class="activation-card mode-choice"><p class="eyebrow">CONFIGURACIÓN INICIAL</p><h1>¿Cómo usarás la aplicación?</h1><p>Podrás cambiar esta opción más adelante sin perder información.</p><div class="mode-choice-grid"><button type="button" data-mode-choice="academic">${icon('academic')}<strong>Académico</strong><span>Horario, clases y formación, además de servicios y pendientes.</span></button><button type="button" data-mode-choice="professional">${icon('briefcase')}<strong>Profesional</strong><span>Servicios, reuniones, formaciones y agenda institucional.</span></button></div></section></main>`;document.querySelectorAll('[data-mode-choice]').forEach(b=>b.onclick=async()=>{state.settings.academicMode=b.dataset.modeChoice==='academic';state.settings.initialModeChosen=true;await dbSet('settings',state.settings);await registerServiceWorker();await render();setTimeout(()=>checkForUpdateV21(false),1200);});}

async function exportBackupV21(){const keys=['agenda','horarioSemanal','historialHorarios','pendientes','favorites','settings','scheduleMeta','profile'];const data={app:'PoliAgenda Pro',version:APP_VERSION,exportedAt:nowISO(),data:{}};for(const key of keys)data.data[key]=await dbGet(key,key==='settings'?{}:[]);const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`respaldo-poliagenda-${todayISO()}.json`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);await dbSet('lastBackup',nowISO());toast('Respaldo exportado');render();}
exportBackup=exportBackupV21;

function bindPageEventsV21(){
  document.querySelectorAll('[data-doc]').forEach(b=>b.onclick=()=>{state.libraryDoc=b.dataset.doc;state.libraryQuery='';state.libraryFilter='';render();});
  document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{state.libraryFilter=b.dataset.filter;state.libraryQuery='';render();});
  document.querySelectorAll('[data-article-id]').forEach(b=>b.onclick=()=>openArticle(b.dataset.articleDoc,b.dataset.articleId));
  document.querySelector('[data-action="library-back"]')?.addEventListener('click',()=>{state.libraryDoc=null;state.libraryFilter='';state.libraryQuery='';render();});
  document.querySelectorAll('[data-academic-sub]').forEach(b=>b.onclick=()=>{state.academicSub=b.dataset.academicSub;render();});
  document.querySelectorAll('[data-schedule-day]').forEach(b=>b.onclick=()=>{state.scheduleDay=b.dataset.scheduleDay;render();});
  document.querySelector('[data-action="add-schedule"]')?.addEventListener('click',()=>openScheduleForm());
  document.querySelectorAll('[data-edit-schedule]').forEach(b=>b.onclick=()=>editSchedule(b.dataset.editSchedule));document.querySelectorAll('[data-delete-schedule]').forEach(b=>b.onclick=()=>deleteSchedule(b.dataset.deleteSchedule));
  document.querySelector('[data-action="save-schedule-history"]')?.addEventListener('click',saveScheduleHistory);document.querySelector('[data-action="show-reference-image"]')?.addEventListener('click',showReferenceImage);document.querySelectorAll('[data-view-history]').forEach(b=>b.onclick=()=>viewHistory(b.dataset.viewHistory));document.querySelectorAll('[data-delete-history]').forEach(b=>b.onclick=()=>deleteHistory(b.dataset.deleteHistory));
  document.querySelectorAll('[data-activity-tab]').forEach(b=>b.onclick=()=>{state.activityTab=b.dataset.activityTab;render();});document.querySelectorAll('[data-action="new-activity"]').forEach(b=>b.onclick=()=>openActivityFormV21());document.querySelectorAll('[data-edit-activity]').forEach(b=>b.onclick=()=>editActivityV21(b.dataset.editActivity));document.querySelectorAll('[data-duplicate-activity]').forEach(b=>b.onclick=()=>duplicateActivityV21(b.dataset.duplicateActivity));document.querySelectorAll('[data-delete-activity]').forEach(b=>b.onclick=()=>deleteActivityV21(b.dataset.deleteActivity));
  document.querySelectorAll('[data-calendar-move]').forEach(b=>b.onclick=()=>{const [y,m]=state.calendarCursor.split('-').map(Number),d=new Date(y,m-1+Number(b.dataset.calendarMove),1);state.calendarCursor=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;render();});document.querySelectorAll('[data-calendar-date]').forEach(b=>b.onclick=()=>openCalendarDayV21(b.dataset.calendarDate));
  document.querySelectorAll('[data-reminder-tab]').forEach(b=>b.onclick=()=>{state.reminderTab=b.dataset.reminderTab;render();});document.querySelectorAll('[data-toggle-reminder]').forEach(b=>b.onclick=()=>toggleReminder(b.dataset.toggleReminder));document.querySelectorAll('[data-archive-reminder]').forEach(b=>b.onclick=()=>archiveReminder(b.dataset.archiveReminder,true));document.querySelectorAll('[data-unarchive-reminder]').forEach(b=>b.onclick=()=>archiveReminder(b.dataset.unarchiveReminder,false));document.querySelectorAll('[data-delete-reminder]').forEach(b=>b.onclick=()=>deleteReminder(b.dataset.deleteReminder));document.querySelectorAll('[data-view-reminder]').forEach(b=>b.onclick=()=>viewReminder(b.dataset.viewReminder));
  document.getElementById('academicModeSwitch')?.addEventListener('change',e=>toggleAcademicMode(e.target.checked));document.querySelector('[data-action="edit-profile"]')?.addEventListener('click',openProfileV21);document.querySelector('[data-action="check-update"]')?.addEventListener('click',()=>checkForUpdateV21(true));document.getElementById('installAppBtn')?.addEventListener('click',installApp);document.getElementById('downloadOfflineBtn')?.addEventListener('click',downloadOfflineVisuals);document.querySelectorAll('[data-action="export-backup"]').forEach(b=>b.onclick=exportBackupV21);document.getElementById('backupInput')?.addEventListener('change',e=>importBackup(e.target.files[0]));document.querySelector('[data-action="clear-academic"]')?.addEventListener('click',clearAcademicData);
}

toggleAcademicMode=async function(checked){state.settings.academicMode=checked;await dbSet('settings',state.settings);toast(checked?'Modo académico activado':'Modo profesional activado');if(state.view==='academic'||state.view==='professional')state.view=checked?'academic':'professional';render();};

init=async function(){
  try{
    const activation=await dbGet('activation',null);if(!activation?.active){await renderActivationV21();return;}
    await loadData();await migrateAndSeed();state.settings=await dbGet('settings',{academicMode:true,scheduleInitialized:true,initialModeChosen:false});
    if(!state.settings.initialModeChosen){renderModeChoiceV21();return;}
    await registerServiceWorker();await render();setTimeout(()=>checkForUpdateV21(false),1200);
  }catch(e){console.error(e);app.innerHTML=`<main class="main"><div class="card danger"><h3>No se pudo iniciar PoliAgenda Pro</h3><p>Verifica que todos los archivos se hayan subido al repositorio y recarga la página.</p><p>${escapeHtml(e.message||String(e))}</p></div></main>`;}
};



/* v2.1 post-fixes */
clearAcademicData=async function(){
  if(!confirm('Se borrarán el horario vigente y el historial académico. Las formaciones, servicios y recordatorios se conservarán. ¿Continuar?'))return;
  const word=prompt('Escribe ELIMINAR para confirmar');if(word!=='ELIMINAR')return toast('Operación cancelada');
  await dbSet('horarioSemanal',[]);await dbSet('historialHorarios',[]);state.settings.scheduleInitialized=true;await dbSet('settings',state.settings);toast('Datos académicos eliminados');render();
};
importBackup=async function(file){
  if(!file)return;
  try{const parsed=JSON.parse(await file.text());if(parsed.app&&parsed.app!=='PoliAgenda Pro')throw new Error('Aplicación no compatible');const data=parsed.data||parsed;if(!data||typeof data!=='object')throw new Error('Estructura inválida');if(!confirm('La importación reemplazará los datos actuales de agenda, horario, notas y pendientes. ¿Continuar?'))return;const keys=['agenda','horarioSemanal','historialHorarios','pendientes','favorites','settings','scheduleMeta','profile'];for(const key of keys)if(Object.prototype.hasOwnProperty.call(data,key))await dbSet(key,data[key]);state.settings=await dbGet('settings',{academicMode:true,scheduleInitialized:true,initialModeChosen:true});state.settings.scheduleInitialized=true;state.settings.initialModeChosen=true;await dbSet('settings',state.settings);toast('Respaldo restaurado correctamente');render();}catch(e){console.error(e);toast('El archivo no es un respaldo válido');}
};
articleCard=function(a){
  return `<article class="article-card"><button type="button" data-article-doc="${a._doc}" data-article-id="${attr(a.id)}">${a.imagen_principal?`<img class="article-thumb" src="./${attr(a.imagen_principal)}" alt="${escapeHtml(a.titulo)}" loading="lazy">`:''}<div class="article-number">${escapeHtml(a.numero)} · ${a._doc==='uniformes'?'Uniformes':'Comisión Sumaria'}</div><h4>${escapeHtml(a.titulo)}</h4>${a.variante?`<div class="card-meta"><span class="badge gold">${escapeHtml(a.variante)}</span><span class="badge">Manga ${escapeHtml(a.manga||'')}</span></div>`:''}<p>${escapeHtml(excerpt(a.texto))}</p>${a.pagina_inicio?`<div class="card-meta"><span class="badge">Página ${a.pagina_inicio}${a.pagina_fin>a.pagina_inicio?`-${a.pagina_fin}`:''}</span></div>`:''}</button></article>`;
};
openArticle=function(doc,id){
  const source=doc==='uniformes'?state.uniformes:state.sumario;const a=source.articulos.find(x=>x.id===id);if(!a)return;const favKey=`${doc}:${id}`;dbGet('favorites',[]).then(favs=>{const isFav=favs.includes(favKey);const pages=(a.imagenes_asociadas||[]).filter(Boolean);const primary=a.imagen_principal||pages[0]||'';modal(`<div class="modal-header"><div><div class="article-number">${escapeHtml(a.numero)}</div><h3>${escapeHtml(a.titulo)}</h3></div><button class="modal-close" data-close-modal aria-label="Cerrar">${icon('close')}</button></div><div class="card-meta"><span class="badge">${doc==='uniformes'?'Reglamento de Uniformes':'Comisión Sumaria UNIPOL'}</span>${a.variante?`<span class="badge gold">${escapeHtml(a.variante)} · Manga ${escapeHtml(a.manga||'')}</span>`:''}${a.visual_validado?`<span class="badge blue">Visual verificado</span>`:''}${a.pagina_inicio?`<span class="badge">Artículo: páginas ${a.pagina_inicio}-${a.pagina_fin}</span>`:''}</div>${primary?`<div class="${a.imagen_principal?'validated-visual':'article-image'}"><img id="articleMainImage" src="./${attr(primary)}" alt="${escapeHtml(a.titulo)} ${escapeHtml(a.variante||'')}">${a.imagen_principal?`<p>Imagen recortada y vinculada por la secuencia real del documento. Fuente visual: página PDF ${a.visual_fuente_pdf}.</p>`:''}</div>`:''}<div class="article-body">${escapeHtml(a.texto)}</div>${pages.length?`<div class="section-title"><h3>Páginas originales relacionadas</h3></div><div class="image-strip">${pages.map((img,i)=>`<button class="${img===primary?'active':''}" data-image-src="./${attr(img)}"><img src="./${attr(img)}" alt="Página ${a.pagina_inicio+i}" loading="lazy"></button>`).join('')}</div>`:''}<div class="actions"><button class="btn ${isFav?'gold':'secondary'}" id="favoriteBtn" data-fav-key="${attr(favKey)}">${isFav?'★ Favorito':'☆ Agregar a favoritos'}</button>${doc==='uniformes'&&a.pagina_inicio?`<a class="btn ghost" href="./assets/reglamento-uniformes-2021.pdf#page=${a.pagina_inicio}" target="_blank" rel="noopener">Abrir PDF</a>`:''}</div>`,()=>bindArticleModal());});
};


/* PoliAgenda v2.2 inicia desde v22.js después de aplicar las extensiones. */
