'use strict';

const APP_VERSION = '2.0.1';
const MEDIA_CACHE = 'poliagenda-media-v1';
const DB_NAME = 'poliagenda-db';
const DB_VERSION = 2;
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
if (typeof window !== 'undefined' && !window.__POLI_TEST__) init();
