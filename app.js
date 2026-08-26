const APP_VERSION='2.17.1';
const BUILD_DATE='2026-08-26';
const ACTIVATION_CODE='271261';
const SECONDARY_ACTIVATION_CODE='2026JINETES';
const SECONDARY_ACTIVATION_EXPIRES='2026-08-30T23:59:59-04:00';
const DB_NAME='agenda-policial-db';
const DEFAULT_STATE={activated:false,mode:null,view:'inicio',scheduleView:'dia',selectedScheduleId:'capitanes-a-2026-2',scheduleTemplateVersion:null,scheduleSource:'catalog',formations:[],tasks:[],notes:[],scheduleBlocks:[],schedulePhoto:null,schedulePhotoName:null,scheduleMeta:null,scheduleHistory:[],kardex:{fields:{},sourceText:''},settings:{lastBackup:null,lastUpdateCheck:null,lastCleanUpdate:null},teacherProfiles:{},drafts:{},archive:{formations:[],tasks:[],notes:[]}};
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
let state=structuredClone(DEFAULT_STATE), docs={}, deferredPrompt=null;

const store={db:null, async open(){return new Promise((res,rej)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=e=>e.target.result.createObjectStore('kv');req.onsuccess=e=>{this.db=e.target.result;res()};req.onerror=()=>rej(req.error)})}, async get(k){return new Promise(res=>{const tx=this.db.transaction('kv','readonly');const r=tx.objectStore('kv').get(k);r.onsuccess=()=>res(r.result);r.onerror=()=>res(null)})}, async set(k,v){return new Promise((res,rej)=>{const tx=this.db.transaction('kv','readwrite');tx.objectStore('kv').put(v,k);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}};
async function save(){await store.set('state',state)}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8)}
function todayISO(){return localISO(new Date())}
function timeNow(){return new Date().toTimeString().slice(0,5)}
function fmtDate(d){if(!d)return 'Sin fecha'; const [y,m,dd]=String(d).split('-').map(Number); if(!y||!m||!dd)return d; const x=new Date(y,m-1,dd); const wd=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'][x.getDay()]; const months=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']; return `${wd} ${String(dd).padStart(2,'0')} ${months[m-1]||''}`}
function minutes(t){if(!t)return null; const m=String(t).match(/(\d{1,2})[:.](\d{2})/); return m?Number(m[1])*60+Number(m[2]):null}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),2600)}
function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function normalize(s=''){return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/n[.º°]*\s*/g,'n').replace(/[-_]/g,' ').replace(/\s+/g,' ').trim()}
function contains(hay,q){const a=normalize(hay), b=normalize(q); if(!b)return true; const compact=a.replace(/\s+/g,''); return a.includes(b)||compact.includes(b.replace(/\s+/g,''))}
async function loadJSON(path){try{return await (await fetch(path)).json()}catch(e){console.warn('no load',path,e);return null}}
async function init(){await store.open(); const saved=await store.get('state'); if(saved) state={...structuredClone(DEFAULT_STATE),...saved,archive:{...DEFAULT_STATE.archive,...(saved.archive||{})},drafts:{...DEFAULT_STATE.drafts,...(saved.drafts||{})},settings:{...DEFAULT_STATE.settings,...(saved.settings||{})},teacherProfiles:{...(saved.teacherProfiles||{})}}; if(localStorage.getItem('agenda-policial-activated')==='true') state.activated=true; bindSW(); render(); loadAllData().then(async()=>{ const migrated=ensureScheduleTemplate(); if(migrated) await save(); render(); }).catch(()=>{});} 
async function loadAllData(){docs.uniformes=await loadJSON('./data/reglamento-uniformes.json'); docs.sumario=await loadJSON('./data/reglamento-sumario-unipol.json'); docs.horario=await loadJSON('./data/horario-base.json'); docs.catalogo=await loadJSON('./data/biblioteca-catalogo.json'); await loadNorms();}
async function loadNorms(){const files=['cpe','ley-1178','ds-23215','ds-23318-a','ds-26237','ds-29820','ds-29536','codigo-penal','codigo-procedimiento-penal','ley-777','ley-101','ley-organica-policia','ley-004','ley-348']; docs.norms=[]; for(const f of files){const d=await loadJSON(`./data/${f}.json`); if(d) docs.norms.push(d)}}
const NORM_DOCS=[
{id:'cpe',file:'cpe',pdf:'assets/cpe.pdf',title:'Constitución Política del Estado'},
{id:'ley1178',file:'ley-1178',pdf:'assets/ley-1178-ds-23215.pdf',title:'Ley N.º 1178 de Administración y Control Gubernamentales'},
{id:'ds23215',file:'ds-23215',pdf:'assets/ley-1178-ds-23215.pdf',title:'D.S. N.º 23215'},
{id:'ds23318a',file:'ds-23318-a',pdf:'assets/ds-23318-a.pdf',title:'D.S. N.º 23318-A'},
{id:'ds26237',file:'ds-26237',pdf:'assets/ds-26237.pdf',title:'D.S. N.º 26237'},
{id:'ds29820',file:'ds-29820',pdf:'assets/ds-29820.pdf',title:'D.S. N.º 29820'},
{id:'ds29536',file:'ds-29536',pdf:'assets/ds-29536.pdf',title:'D.S. N.º 29536'},
{id:'codigopenal',file:'codigo-penal',pdf:'assets/codigo-penal-procedimiento-penal.pdf',title:'Código Penal'},
{id:'codigoprocedimientopenal',file:'codigo-procedimiento-penal',pdf:'assets/codigo-penal-procedimiento-penal.pdf',title:'Código de Procedimiento Penal'},
{id:'ley777',file:'ley-777',pdf:'assets/ley-777.pdf',title:'Ley N.º 777 — Sistema de Planificación Integral del Estado'},
{id:'ley101',file:'ley-101',pdf:'assets/ley-101.pdf',title:'Ley N.º 101 — Régimen Disciplinario de la Policía Boliviana'},
{id:'leyorganicapolicia',file:'ley-organica-policia',pdf:'assets/ley-organica-policia.pdf',title:'Ley Orgánica de la Policía Nacional — Ley N.º 734'},
{id:'ley004',file:'ley-004',pdf:'assets/ley-004.pdf',title:'Ley N.º 004 — Marcelo Quiroga Santa Cruz'},
{id:'ley348',file:'ley-348',pdf:'assets/ley-348.pdf',title:'Ley N.º 348 — Vida Libre de Violencia'}
];
function normDocMetaById(id){const key=normalize(String(id||'')).replace(/\s+/g,''); const aliases={ley1178:'ley1178',ley1178safco:'ley1178',safco:'ley1178',sarco:'ley1178',ds23215:'ds23215',ds23318a:'ds23318a',ds23318:'ds23318a',ds26237:'ds26237',ds29820:'ds29820',ds29536:'ds29536',codigopenal:'codigopenal','codigo penal':'codigopenal',cp:'codigopenal',codigoprocedimientopenal:'codigoprocedimientopenal',cpp:'codigoprocedimientopenal',cpe:'cpe',ley777:'ley777',spie:'ley777',ley101:'ley101',regimendisciplinario:'ley101',leyorganica:'leyorganicapolicia',ley734:'leyorganicapolicia',leyorganicapolicia:'leyorganicapolicia',ley004:'ley004',ley4:'ley004',marceloquirogasantacruz:'ley004',ley348:'ley348',vidalibredeviolencia:'ley348'}; return NORM_DOCS.find(d=>d.id===key)||NORM_DOCS.find(d=>d.id===aliases[key])||NORM_DOCS.find(d=>normalize(d.title).replace(/\s+/g,'').includes(key));}
function normIndexById(id){const meta=normDocMetaById(id); return meta?NORM_DOCS.indexOf(meta):-1}
function catalogEntryById(id){const key=normalize(String(id||'')).replace(/\s+/g,''); return (docs.catalogo?.documentos||[]).find(d=>normalize(d.id||d.slug||d.codigo||d.titulo||'').replace(/\s+/g,'')===key || normalize(d.abreviatura||'').replace(/\s+/g,'')===key)}
function scheduleCatalog(){const base=docs.horario||{};const list=Array.isArray(base.horarios)?base.horarios:[];if(list.length)return list;return [{id:base.metadatos?.catalog_id||'capitanes-a-2026-2',etiqueta:`${base.metadatos?.nivel||'Capitanes'} ${base.metadatos?.paralelo||'A'}`,activo:true,orden:1,metadatos:base.metadatos||{},entradas:base.entradas||base.bloques||[],fuente_visual:base.fuente_visual||''}]}
function activeScheduleCatalog(){return scheduleCatalog().filter(item=>item.activo!==false).sort((a,b)=>(Number(a.orden)||999)-(Number(b.orden)||999)||String(a.etiqueta||'').localeCompare(String(b.etiqueta||''),'es'))}
function scheduleTemplateById(id){const list=activeScheduleCatalog();return list.find(item=>String(item.id)===String(id))||list[0]||null}
function currentScheduleTemplate(){return scheduleTemplateById(state.selectedScheduleId)}
function scheduleBaseEntries(){const template=currentScheduleTemplate();return template?.entradas||[]}
function scheduleTemplateMeta(template=currentScheduleTemplate()){return {...(template?.metadatos||{}),catalog_id:template?.id||'',etiqueta:template?.etiqueta||'',fuente_visual:template?.fuente_visual||template?.metadatos?.fuente_visual||'assets/horario-segundo-semestre-2026.png'}}
function normalizeScheduleEntry(e){return {...e,id:e.id||uid(),dia:normDayWord(e.dia)||normalize(e.dia||'lunes'),inicio:e.inicio||'',fin:e.fin||'',materia:e.materia||e.actividad||'',docente:e.docente||e.instructor||'',tipo:e.tipo||'clase',lugar:e.lugar||'',uniforme:e.uniforme||'',observacion:e.observacion||''}}
function isPlaceholderSchedule(){return !state.scheduleBlocks?.length || (state.scheduleBlocks.length<=2 && state.scheduleBlocks.every(b=>/horario por configurar/i.test(b.materia||b.actividad||'')))}
function archiveCurrentSchedule(reason='Cambio de horario'){state.scheduleHistory=state.scheduleHistory||[];if(state.scheduleBlocks?.length)state.scheduleHistory.push({id:uid(),date:new Date().toISOString(),reason,selectedScheduleId:state.selectedScheduleId,templateVersion:state.scheduleTemplateVersion,blocks:state.scheduleBlocks,photo:state.schedulePhoto,name:state.schedulePhotoName,meta:state.scheduleMeta})}
function applyCatalogSchedule(template,archive=true,reason='Actualización automática del horario'){if(!template?.entradas?.length)return false;if(archive)archiveCurrentSchedule(reason);state.selectedScheduleId=template.id;state.scheduleBlocks=template.entradas.map(normalizeScheduleEntry);state.scheduleMeta=scheduleTemplateMeta(template);state.scheduleTemplateVersion=template.metadatos?.template_version||docs.horario?.catalog_version||'';state.scheduleSource='catalog';state.schedulePhoto=null;state.schedulePhotoName=template.metadatos?.nombre||template.etiqueta||'Horario oficial';return true}
function seedSchedule(force=false){const template=currentScheduleTemplate();if(!template)return false;if(force||isPlaceholderSchedule())return applyCatalogSchedule(template,force,'Restauración del horario oficial');return false}
function scheduleHasOfficialSignature(){const blocks=state.scheduleBlocks||[];const has=(day,start,end,subject)=>blocks.some(b=>normalize(b.dia)===normalize(day)&&b.inicio===start&&b.fin===end&&normalize(b.materia||'')===normalize(subject));return blocks.length===53&&has('lunes','06:45','07:15','Hora mística')&&has('viernes','07:15','07:30','Organización y control')&&has('lunes','14:00','16:00','Acondicionamiento físico')&&has('jueves','14:00','16:00','Tiro policial')}
function isLegacyIncorrectSchedule(){const meta=state.scheduleMeta||{};return meta.id==='horario-sucre-2026-2'||meta.template_version==='2026-07-24'||(state.scheduleBlocks||[]).some(b=>normalize(b.materia||'').includes('parte de diana'))||((meta.nivel||'').toLowerCase().includes('capitan')&&!scheduleHasOfficialSignature())}
function ensureScheduleTemplate(){let changed=false;const migration='2026-07-28-v268';const active=activeScheduleCatalog();if(!active.length)return false;if(!state.selectedScheduleId||!scheduleTemplateById(state.selectedScheduleId)){state.selectedScheduleId=active[0].id;changed=true}const template=currentScheduleTemplate();const expectedVersion=template?.metadatos?.template_version||docs.horario?.catalog_version||'';const mustRefresh=isPlaceholderSchedule()||isLegacyIncorrectSchedule()||state.scheduleSource!=='catalog'||state.scheduleTemplateVersion!==expectedVersion||state.scheduleMeta?.catalog_id!==template?.id;if(state.settings.scheduleMigration!==migration||mustRefresh){if(mustRefresh)changed=applyCatalogSchedule(template,true,'Actualización automática del horario oficial v2.6.7')||changed;else if(template){state.scheduleMeta=scheduleTemplateMeta(template);state.scheduleTemplateVersion=expectedVersion;changed=true}state.settings.scheduleMigration=migration;changed=true}return changed}
async function selectScheduleProfile(id){const template=scheduleTemplateById(id);if(!template)return toast('Ese horario no está activo');if(String(state.selectedScheduleId)===String(template.id)&&state.scheduleTemplateVersion===(template.metadatos?.template_version||docs.horario?.catalog_version||''))return toast('Ese horario ya está seleccionado');applyCatalogSchedule(template,true,`Cambio de horario a ${template.etiqueta||template.id}`);await save();render();toast(`Horario seleccionado: ${template.etiqueta||'activo'}`)}
async function restoreBaseSchedule(){const template=currentScheduleTemplate();if(!template)return toast('No hay horario activo');if(!confirm(`Se restaurará el horario oficial de ${template.etiqueta||'la opción seleccionada'}. El horario actual quedará en el historial local. ¿Continuar?`))return;applyCatalogSchedule(template,true,'Restauración manual del horario oficial');await save();render();toast('Horario oficial restaurado')}
function bindSW(){window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e}); $('#updateNow')?.addEventListener('click',applyUpdate); if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>{window._swReg=reg; reg.update().catch(()=>{}); if(reg.waiting) showUpdateBanner(); reg.addEventListener('updatefound',()=>{const nw=reg.installing; if(!nw)return; nw.addEventListener('statechange',()=>{if(nw.state==='installed'&&navigator.serviceWorker.controller) showUpdateBanner()})}); navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!window._refreshing){window._refreshing=true; location.replace('./index.html?v='+APP_VERSION+'&r='+Date.now())}})}).catch(()=>{})}}
function icon(name){const common='viewBox="0 0 24 24" aria-hidden="true" focusable="false"'; const paths={home:'<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h5v-5.5h3V20h5v-9.5"/>',shield:'<path d="M12 3 5.5 5.6v5.8c0 4.4 2.7 7.5 6.5 9.1 3.8-1.6 6.5-4.7 6.5-9.1V5.6L12 3Z"/><path d="M9 12.2 11 14l4-4.4"/>',tasks:'<path d="M8 6h12"/><path d="M8 12h12"/><path d="M8 18h12"/><path d="M4 6.1l1 1 2-2"/><path d="M4 12.1l1 1 2-2"/><path d="M4 18.1l1 1 2-2"/>',calendar:'<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16"/><path d="M8 14h3M13 14h3M8 17h3"/>',books:'<path d="M5 4h5v16H5zM10 4h4v16h-4zM15 5l4-1 3 15-4 1z"/><path d="M6.5 8h2M11 8h2M16.5 8.5l2-.4"/>',note:'<path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4"/><path d="M8.5 11h7M8.5 15h7M8.5 18h4"/>',settings:'<path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z"/><path d="M19.4 15a8 8 0 0 0 .1-1l2-1.5-2-3.4-2.4 1a7.8 7.8 0 0 0-1.7-1L15 6.5h-6l-.4 2.6a7.8 7.8 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a8 8 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7.8 7.8 0 0 0 1.7 1l.4 2.6h6l.4-2.6a7.8 7.8 0 0 0 1.7-1l2.4 1 2-3.4-2.1-1.5Z"/>',office:'<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',plus:'<path d="M12 5v14M5 12h14"/>'}; return `<svg class="ui-icon" ${common}>${paths[name]||paths.home}</svg>`}
function academicHeaderAccess(){const session=typeof academicSession!=='undefined'?academicSession:null; const name=session?.full_name||''; return `<button class="academic-access ${session?'connected':''} ${state.view==='online'?'active':''}" onclick="go('online')" aria-label="Abrir área académica online"><span class="academic-access-icon">${icon('shield')}</span><span class="academic-access-copy"><b>${session?'Área académica conectada':'Acceso académico online'}</b><small>${session?esc(name||'Sesión activa'):'Ingresar con carnet y celular'}</small></span><span class="academic-access-state">${session?'Abrir':'Ingresar'}</span></button>`}
function appShell(content){const onlinePublish=state.view==='online'&&typeof academicCanPublish==='function'&&academicCanPublish();const fab=state.view==='online'?(onlinePublish?`<button class="fab academic-fab" onclick="openAcademicPublishMenu()" title="Publicar contenido académico">${icon('plus')}</button>`:''):`<button class="fab" onclick="openQuick()" title="Agregar rápido">${icon('plus')}</button>`;return `<div class="app"><header class="top"><div class="top-row"><img src="./assets/escudo-policia.png" class="seal"><div class="title"><h1>Agenda Policial</h1><p>${state.mode==='profesional'?'Modo profesional':'Modo académico'} · v${APP_VERSION} <span class="version-dot">estable</span></p></div><div class="top-actions">${state.view!=='online'?`<button class="icon-btn office-top-btn-v2135" onclick="openOfficeCenterV2128()" title="Office · Documentos" aria-label="Abrir Office offline"><span class="office-top-mark-v2135">${icon('office')}</span></button>`:''}<button class="icon-btn" onclick="openSettings()" title="Configuración">${icon('settings')}</button></div></div>${academicHeaderAccess()}</header><main>${content}</main>${nav()}${fab}</div>`}
function nav(){const items=[['inicio','home','Inicio'],['formaciones','shield','Formación'],['tareas','tasks','Tareas'],['horario','calendar','Horario'],['biblioteca','books','Biblioteca']];return `<nav class="bottom-nav">${items.map(i=>`<button class="nav-btn ${state.view===i[0]?'active':''}" onclick="go('${i[0]}')"><span>${icon(i[1])}</span><span>${i[2]}</span></button>`).join('')}</nav>`}
async function go(v){state.view=v; await save(); render()}
function render(){if(!state.activated)return renderActivation(); if(!state.mode)return renderMode(); const map={inicio:renderInicio,online:renderOnline,formaciones:renderFormaciones,tareas:renderTareas,horario:renderHorario,biblioteca:renderBiblioteca}; $('#app').innerHTML=appShell((map[state.view]||renderInicio)()); wireView()}
function renderActivation(){ $('#app').innerHTML=`<div class="activation"><div class="activation-card"><img src="./assets/escudo-policia.png" class="seal"><h1>Agenda Policial</h1><p class="subtle">Ingrese el código de activación para usar la aplicación en este dispositivo.</p><div class="form"><input id="activationCode" type="password" inputmode="text" maxlength="12" autocomplete="off" placeholder="Código de activación" onkeydown="if(event.key==='Enter') activateApp()"><button class="btn" onclick="activateApp()">Activar</button></div><p class="subtle">El código se guarda localmente y solo vuelve a pedirse si se borran los datos o se reinstala.</p></div></div>`}
async function activateApp(){const v=$('#activationCode').value.trim(); const primary=v===ACTIVATION_CODE; const secondary=v.toUpperCase()===SECONDARY_ACTIVATION_CODE && Date.now()<=new Date(SECONDARY_ACTIVATION_EXPIRES).getTime(); if(!primary&&!secondary){const expired=v.toUpperCase()===SECONDARY_ACTIVATION_CODE; return toast(expired?'La clave temporal venció el 30 de agosto de 2026':'Código incorrecto')} state.activated=true; localStorage.setItem('agenda-policial-activated','true'); localStorage.setItem('agenda-policial-activation-type',primary?'principal':'2026JINETES'); await save(); render()}
function renderMode(){ $('#app').innerHTML=`<div class="activation"><div class="activation-card"><h1>Elija modo inicial</h1><p class="subtle">Puede cambiarlo después en configuración.</p><div class="mode-grid"><button class="mode-card" onclick="setMode('academico')"><h3>🎓 Académico</h3><p>Horario de clases, tareas, formaciones y biblioteca.</p></button><button class="mode-card" onclick="setMode('profesional')"><h3>👮 Profesional</h3><p>Servicios, actividades, tareas y normativa.</p></button></div></div></div>`}
async function setMode(m){state.mode=m; await save(); render()}
function wireView(){ }
function currentDayKey(){return ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'][new Date().getDay()]}
function localISO(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function addDaysISO(baseISO,days){const [y,m,d]=String(baseISO||todayISO()).split('-').map(Number); const x=new Date(y,m-1,d); x.setDate(x.getDate()+days); return localISO(x)}
function weekdayISO(iso){if(!iso)return ''; const [y,m,d]=String(iso).split('-').map(Number); return ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'][new Date(y,m-1,d).getDay()]}
function dateForDayKey(day,horizon=7){const target=['domingo','lunes','martes','miercoles','jueves','viernes','sabado'].indexOf(day); if(target<0)return todayISO(); const now=new Date(); const today=now.getDay(); let add=(target-today+7)%7; if(add===0)add=0; const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()+add); return localISO(d)}
function getTodayBlocks(){const d=currentDayKey();return state.scheduleBlocks.filter(b=>normalize(b.dia)===d).sort((a,b)=>minutes(a.inicio)-minutes(b.inicio))}
function getBlocksForDay(day){return state.scheduleBlocks.filter(b=>normalize(b.dia)===day).sort((a,b)=>minutes(a.inicio)-minutes(b.inicio))}
function classifyBlock(b,iso=todayISO()){const now=new Date(); const isToday=iso===todayISO(); const m=now.getHours()*60+now.getMinutes(), a=minutes(b.inicio), z=minutes(b.fin); if(a==null||z==null)return ''; if(isToday&&m>=a&&m<z)return 'current'; if(isToday&&m>=z)return 'finished'; return 'next'}
function eventDateTime(e){const t=e.time||e.formacion||e.arribo||e.inicio||'00:00'; const [y,m,d]=String(e.date||todayISO()).split('-').map(Number); const [hh,mm]=String(t).split(':').map(Number); return new Date(y,m-1,d,hh||0,mm||0)}
function nextEvent(list){const now=new Date(); return list.filter(e=>e.date&&eventDateTime(e)>=new Date(now.getTime()-20*60000)).sort((a,b)=>eventDateTime(a)-eventDateTime(b))[0]||list.filter(e=>e.date>=todayISO()).sort((a,b)=>(a.date+(a.time||a.formacion||a.arribo||'99:99')).localeCompare(b.date+(b.time||b.formacion||b.arribo||'99:99')))[0]}
function countdown(date,time){if(!date||!time)return ''; const [y,m,d]=String(date).split('-').map(Number); const [hh,mm]=String(time).split(':').map(Number); const target=new Date(y,m-1,d,hh||0,mm||0); const diff=Math.ceil((target-new Date())/60000); if(diff<-15)return 'Finalizado'; if(diff<=0)return 'En curso'; if(diff<60)return `Faltan ${diff} min`; if(diff<1440)return `Faltan ${Math.floor(diff/60)} h ${diff%60} min`; return `Faltan ${Math.floor(diff/1440)} día(s)`}
function intervalCountdown(date,start,end){if(!date||!start)return ''; const a=eventDateTime({date,time:start}); const z=end?eventDateTime({date,time:end}):new Date(a.getTime()+60*60000); const now=new Date(); if(now<a)return countdown(date,start); if(now>=a&&now<z){const diff=Math.max(0,Math.ceil((z-now)/60000)); if(diff<60)return `Finaliza en ${diff} min`; return `Finaliza en ${Math.floor(diff/60)} h ${diff%60} min`;} return 'Finalizado'}
function upcomingScheduleItems(limit=6){const out=[]; for(let add=0; add<7 && out.length<limit; add++){const iso=addDaysISO(todayISO(),add); const day=weekdayISO(iso); getBlocksForDay(day).forEach(b=>{const cls=classifyBlock(b,iso); if(cls!=='finished')out.push({kind:'schedule',date:iso,time:b.inicio,block:b,sort:eventDateTime({date:iso,time:b.inicio})})})} return out.sort((a,b)=>a.sort-b.sort).slice(0,limit)}
function upcomingAgenda(limit=7){const forms=state.formations.filter(x=>x.status!=='archived'&&x.date).map(f=>({kind:'formation',date:f.date,time:f.formacion||f.arribo||f.parte||'00:00',formation:f,sort:eventDateTime({date:f.date,time:f.formacion||f.arribo||f.parte||'00:00'})})); const schedules=upcomingScheduleItems(10); const tasks=state.tasks.filter(t=>t.status!=='done'&&t.status!=='archived'&&t.dueDate).map(t=>({kind:'task',date:t.dueDate,time:t.dueTime||'23:59',task:t,sort:eventDateTime({date:t.dueDate,time:t.dueTime||'23:59'})})); return [...forms,...schedules,...tasks].filter(x=>x.sort>=new Date(Date.now()-20*60000)).sort((a,b)=>a.sort-b.sort).slice(0,limit)}
function agendaMiniCard(item){if(item.kind==='formation')return `<div class="agenda-mini formation" onclick="openFormation('${item.formation.id}')"><span>Formación</span><b>${esc(item.formation.title||item.formation.type||'Formación / servicio')}</b><small>${fmtDate(item.date)} · ${esc(item.time||'')} ${item.formation.uniforme?'· '+esc(item.formation.uniforme):''}</small></div>`; if(item.kind==='task')return `<div class="agenda-mini task" onclick="openTask('${item.task.id}')"><span>Tarea</span><b>${esc(item.task.title||'Tarea académica')}</b><small>${fmtDate(item.date)} ${esc(item.time==='23:59'?'':item.time)}</small></div>`; return `<div class="agenda-mini class" onclick="openClassDetail('${item.block.id}')"><span>${/hora mística|parte/i.test(item.block.materia||'')?'Formación académica':'Clase'}</span><b>${esc(item.block.materia||'Actividad')}</b><small>${fmtDate(item.date)} · ${esc(item.block.inicio)}-${esc(item.block.fin)} ${item.block.docente?'· '+esc(item.block.docente)+' '+teacherIndicator(item.block.docente):''}</small></div>`}
function itemKey(it){if(!it)return ''; if(it.kind==='schedule')return 's-'+it.block.id+'-'+it.date; if(it.kind==='formation')return 'f-'+it.formation.id; if(it.kind==='task')return 't-'+it.task.id; return ''}
function currentAgendaItem(){const now=new Date(); const iso=todayISO(); const curSchedule=getBlocksForDay(currentDayKey()).find(b=>classifyBlock(b,iso)==='current'); if(curSchedule)return {kind:'schedule',date:iso,time:curSchedule.inicio,block:curSchedule,sort:eventDateTime({date:iso,time:curSchedule.inicio})}; const curForm=state.formations.filter(f=>f.status!=='archived'&&f.date===iso).find(f=>{const t=f.formacion||f.arribo||f.parte; if(!t)return false; const start=eventDateTime({date:f.date,time:t}); const end=new Date(start.getTime()+60*60000); return now>=start&&now<=end}); if(curForm)return {kind:'formation',date:iso,time:curForm.formacion||curForm.arribo||curForm.parte,formation:curForm,sort:eventDateTime({date:iso,time:curForm.formacion||curForm.arribo||curForm.parte})}; return null}
function mainAgendaCard(label,item,kind){if(!item)return ''; if(item.kind==='formation')return formationCard(item.formation,true); if(item.kind==='task')return `<div class="card dashboard-card priority clickable" onclick="openTask('${item.task.id}')"><div class="row between"><span class="tag danger">${esc(label)}</span><span class="countdown-pill">${esc(countdown(item.date,item.time))}</span></div><h3>${esc(item.task.title||'Tarea académica')}</h3><p><b>${esc(item.task.subject||'Sin materia')}</b> · ${fmtDate(item.date)}</p></div>`; return classCard(label,item.block,kind,item.date)}
function renderInicio(){const agendaAll=upcomingAgenda(14); const current=currentAgendaItem(); const next=agendaAll.find(x=>itemKey(x)!==itemKey(current)); const skip=new Set([itemKey(current),itemKey(next)]); const chron=agendaAll.filter(x=>!skip.has(itemKey(x))).slice(0,8); const urgentTasks=state.tasks.filter(t=>t.status!=='done'&&t.status!=='archived'&&t.dueDate&&t.dueDate<=addDaysISO(todayISO(),1)).sort((a,b)=>(a.dueDate+(a.dueTime||'99:99')).localeCompare(b.dueDate+(b.dueTime||'99:99'))).slice(0,4); const alerts=urgentTasks.length?`<div class="home-alerts"><div class="row between"><h2 class="section-title">Alertas académicas</h2><button class="option-btn" onclick="go('tareas')">Ver tareas</button></div>${urgentTasks.map(t=>`<div class="alert-task clickable" onclick="openTask('${t.id}')"><span class="alert-dot"></span><div><b>${esc(t.title||'Tarea académica')}</b><small>${esc(t.subject||'Sin materia')} · ${t.dueDate===todayISO()?'Hoy':t.dueDate===addDaysISO(todayISO(),1)?'Mañana':fmtDate(t.dueDate)} ${esc(t.dueTime||'')}</small></div></div>`).join('')}</div>`:''; return `<section><div class="home-hero"><div><span class="eyebrow">Panel de inicio</span><h2>Agenda próxima</h2><p>Clases, hora mística, formaciones, servicios y tareas por prioridad.</p></div></div><button class="offline-office-card-v2133" type="button" onclick="openOfficeCenterV2128()"><span class="offline-office-icon-v2133">${icon('office')}</span><span class="offline-office-copy-v2133"><small>HERRAMIENTA OFFLINE</small><b>Office · Documentos</b><em>Word · PDF · Excel · PowerPoint · imágenes</em></span><span class="offline-office-open-v2133">Abrir ›</span></button>${current?mainAgendaCard('Actividad actual',current,'current'):''}${next?mainAgendaCard('Próxima actividad',next,'next'):''}${alerts}<div class="row between"><h2 class="section-title">Cronología</h2><button class="option-btn" onclick="go('horario')">Horario</button></div>${chron.length?`<div class="agenda-list">${chron.map(agendaMiniCard).join('')}</div>`:`<div class="card small"><p>No hay actividades próximas registradas.</p></div>`}</section>`}
function classCard(title,b,kind,iso=todayISO()){const isFormation=/(hora mística|hora mistica|parte de diana|parte de asamblea)/i.test(b.materia||''); const cd=kind==='current'?intervalCountdown(iso,b.inicio,b.fin):countdown(iso,b.inicio); return `<div class="card dashboard-card ${kind==='next'?'priority':''} ${isFormation?'formation-highlight':''} clickable" onclick="openClassDetail('${b.id}')"><div class="row between"><span class="tag ${isFormation?'warn':''}">${esc(title)}</span>${kind==='next'||kind==='current'?`<span class="countdown-pill">${esc(cd)}</span>`:''}</div><h3>${esc(b.materia||b.actividad||'Actividad')}</h3><p><b>${fmtDate(iso)} · ${b.inicio||''} - ${b.fin||''}</b> ${b.docente?' · '+esc(b.docente):''} ${teacherIndicator(b.docente)}</p>${b.lugar?`<p>📍 ${esc(b.lugar)}</p>`:''}</div>`}
function formationCard(f,compact=false){const title=/hora mistica|hora mística/i.test(f.title||f.observations||f.original||'')?'Hora mística':(f.title||'Sin título'); const past=eventDateTime({date:f.date,time:f.formacion||f.arribo||f.parte||'23:59'})<new Date(Date.now()-20*60000); return `<div class="card dashboard-card priority formation-highlight ${past?'finished-card':''} clickable" onclick="openFormation('${f.id}')"><div class="row between"><span class="tag warn">${past?'Actividad concluida':esc(f.type||'Formación / servicio')}</span><button class="option-btn" onclick="event.stopPropagation();formationOptions('${f.id}')">⋮</button></div><h3>${esc(title)}</h3><p><b>${fmtDate(f.date)}</b>${f.arribo?` · Arribo ${esc(f.arribo)}`:''}${f.formacion?` · Formación ${esc(f.formacion)}`:''}${f.parte?` · Parte ${esc(f.parte)}`:''}</p>${f.place?`<p>📍 ${esc(f.place)}</p>`:''}${f.uniforme?`<p>👔 ${esc(f.uniforme)}</p>`:''}${compact&&(f.formacion||f.arribo||f.parte)?`<p class="countdown-pill inline">${intervalCountdown(f.date,f.formacion||f.arribo||f.parte,'')}</p>`:''}</div>`}
function taskCard(t){const overdue=t.dueDate&&t.dueDate<todayISO(); return `<div class="list-item ${overdue?'danger-card':''} clickable" onclick="openTask('${t.id}')"><div class="row"><button class="checkbox ${t.status==='done'?'on':''}" onclick="event.stopPropagation();toggleTask('${t.id}')">${t.status==='done'?'✓':''}</button><div style="flex:1"><h3>${esc(t.title||'Tarea')}</h3><p>${t.subject?esc(t.subject)+' · ':''}${t.dueDate?`Entrega: ${fmtDate(t.dueDate)}`:'Sin fecha'} ${t.dueTime?esc(t.dueTime):''}</p>${overdue?`<p class="status-red">Vencida</p>`:''}</div><button class="option-btn" onclick="event.stopPropagation();taskOptions('${t.id}')">⋮</button></div>${t.subtasks?.length?`<details><summary>Puntos de trabajo (${t.subtasks.filter(s=>s.done).length}/${t.subtasks.length})</summary><div class="list">${t.subtasks.map((s,i)=>`<div class="row"><button class="checkbox ${s.done?'on':''}" onclick="event.preventDefault();event.stopPropagation();toggleSubtask('${t.id}',${i})">${s.done?'✓':''}</button><span>${esc(s.text)}</span></div>`).join('')}</div></details>`:''}</div>`}
function renderFormaciones(){const active=state.formations.filter(f=>f.status!=='archived').sort((a,b)=>(a.date+(a.formacion||a.time||'')).localeCompare(b.date+(b.formacion||b.time||''))); return `<section><div class="row between"><h2 class="section-title">Formaciones y servicios</h2><button class="btn" onclick="openFormationForm()">Nueva</button></div><div class="card"><h3>Mensaje inteligente de formación</h3><p>Pegue aquí comunicados de formación, servicio, orden de guarnición o cambio de hora/lugar.</p><button class="btn secondary" onclick="openFormationSmart()">Pegar comunicado</button></div>${active.length?active.map(f=>formationCard(f)).join(''):`<div class="card small"><p>Sin formaciones o servicios registrados.</p></div>`}</section>`}
function renderTareas(){const active=state.tasks.filter(t=>t.status!=='archived'&&t.status!=='done'); const done=state.tasks.filter(t=>t.status==='done'); return `<section><div class="row between"><h2 class="section-title">Tareas académicas</h2><button class="btn" onclick="openTaskForm()">Nueva</button></div><div class="card"><h3>Mensaje inteligente de tarea</h3><p>Pegue instrucciones de trabajos, lecturas, entregas, exposiciones o requisitos académicos.</p><button class="btn secondary" onclick="openTaskSmart()">Pegar instrucción</button></div>${active.length?active.map(taskCard).join(''):`<div class="card small"><p>No hay tareas académicas pendientes.</p></div>`}<details class="card"><summary><b>Ver tareas cumplidas (${done.length})</b></summary><div class="list">${done.map(taskCard).join('')||'<p class="subtle">Sin tareas cumplidas.</p>'}</div></details></section>`}
function renderHorario(){const meta=state.scheduleMeta||scheduleTemplateMeta()||{};const view=state.scheduleView||'dia';const active=activeScheduleCatalog();const selected=state.selectedScheduleId||active[0]?.id||'';return `<section><div class="row between wrap"><h2 class="section-title">Horario académico</h2><div class="row wrap"><button class="btn secondary" onclick="openScheduleMetaForm()">Editar datos</button><button class="btn modern-action" onclick="restoreBaseSchedule()">Restaurar horario</button></div></div><div class="schedule-picker card"><label><span>Elige tu horario</span><select id="scheduleProfileSelect" onchange="selectScheduleProfile(this.value)">${active.map(item=>`<option value="${esc(item.id)}" ${String(selected)===String(item.id)?'selected':''}>${esc(item.etiqueta||item.id)}</option>`).join('')}</select></label><small>${active.length>1?'Seleccione el curso o paralelo que le corresponde.':'Los nuevos cursos y paralelos aparecerán aquí cuando se activen.'}</small></div><div class="schedule-meta-card card"><h3>${esc(meta.institucion||'Escuela Superior de Policías — Filial Sucre')}</h3><p><b>${esc(meta.curso||'Curso de Capacitación Policial')}</b> ${meta.paralelo?` · Paralelo ${esc(meta.paralelo)}`:''}${meta.turno?` · Turno ${esc(meta.turno)}`:''}</p><p>${esc(meta.nivel||'Nivel')} ${meta.periodo?` · ${esc(meta.periodo)}`:''}</p><div class="row between wrap schedule-view-row"><div class="schedule-switch"><button class="${view==='dia'?'active':''}" onclick="setScheduleView('dia')">Día</button><button class="${view==='semana'?'active':''}" onclick="setScheduleView('semana')">Semana</button></div><span class="schedule-auto-badge">Actualización automática</span></div><div class="card small image-tools"><b>Horario oficial</b><div class="row wrap schedule-toolbar"><button class="btn secondary" onclick="openReferenceScheduleImage()">Ver imagen</button><button class="btn secondary" onclick="chooseScheduleFile()">Usar imagen propia</button><button class="btn ghost" onclick="openScheduleAnalyzer()">Analizar imagen</button></div></div><input id="scheduleFile" type="file" accept="image/*" class="hidden"><input id="scheduleCamera" type="file" accept="image/*" capture="environment" class="hidden"><p class="subtle">La tabla se actualiza con la opción activa. Puede editar un casillero y restaurar el horario oficial cuando sea necesario.</p></div>${view==='semana'?renderWeeklySchedule():renderDailySchedule()}</section>`}
function openScheduleMetaForm(){const meta={...(state.scheduleMeta||docs.horario?.metadatos||{})}; showModal(`<button class="icon-btn close" onclick="closeModal()">×</button><h2>Editar datos del horario</h2><p class="subtle">Cambie curso, paralelo, turno, nivel o gestión sin borrar las celdas del horario.</p><form id="scheduleMetaForm">${buildForm([{name:'institucion',label:'Institución / sede'},{name:'curso',label:'Curso'},{name:'paralelo',label:'Paralelo'},{name:'turno',label:'Turno',type:'select',options:['Mañana','Tarde','Noche','Mixto']},{name:'nivel',label:'Nivel / grado'},{name:'periodo',label:'Periodo / gestión'},{name:'nombre',label:'Nombre del horario'}],meta)}<div class="form-actions"><button class="btn" type="submit">Guardar datos</button><button class="btn secondary" type="button" onclick="closeModal()">Cancelar</button></div></form>`); $('#scheduleMetaForm').onsubmit=async e=>{e.preventDefault(); state.scheduleMeta={...(state.scheduleMeta||{}),...formData(e.target),fuente_visual:state.scheduleMeta?.fuente_visual||docs.horario?.fuente_visual||'assets/horario-segundo-semestre-2026.png'}; await save(); closeModal(); render(); toast('Datos del horario actualizados')}}
async function setScheduleView(v){state.scheduleView=v; await save(); render()}
function scheduleDays(){return ['lunes','martes','miercoles','jueves','viernes']}
function dayLabel(d){return d==='miercoles'?'MIÉRCOLES':d.toUpperCase()}
function scheduleRows(){const order=['07:15-07:30','07:30-08:10','08:10-08:50','08:50-09:05','09:05-09:45','09:45-10:25','10:25-10:40','10:40-11:20','11:20-12:00','12:00-12:40','15:30-16:15','16:15-17:00','17:00-17:15','17:15-18:00']; const keys=new Set(order); (state.scheduleBlocks||[]).forEach(b=>{if(b.inicio&&b.fin)keys.add(`${b.inicio}-${b.fin}`)}); return [...keys].sort((a,b)=>minutes(a.split('-')[0])-minutes(b.split('-')[0])).map(k=>{const [inicio,fin]=k.split('-'); return {inicio,fin}})}
function findScheduleCell(day,inicio,fin){return (state.scheduleBlocks||[]).find(b=>normalize(b.dia)===day&&b.inicio===inicio&&b.fin===fin)}
function renderWeeklySchedule(){const rows=scheduleRows(); return `<div class="schedule-table-wrap card"><div class="schedule-title-strip"><b>Horario semanal editable</b><span>${state.scheduleBlocks.length} casilleros</span></div><table class="schedule-table"><thead><tr><th>Horas</th>${scheduleDays().map(d=>`<th>${dayLabel(d)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>scheduleTableRow(r)).join('')}</tbody></table></div>`}
function renderDailySchedule(){const selected=state.selectedDay||currentDayKey(); const tabs=scheduleDays().map(d=>`<button class="day-pill ${selected===d?'active':''}" onclick="selectDay('${d}')">${dayLabel(d).slice(0,3)}</button>`).join(''); const blocks=getBlocksForDay(selected); return `<div class="card daily-schedule"><div class="row between"><h3>Vista diaria</h3><span class="tag">${dayLabel(selected)}</span></div><div class="day-tabs">${tabs}</div><div class="daily-list">${blocks.map(b=>dailyBlockCard(b)).join('')||'<p class="subtle">No hay bloques cargados para este día.</p>'}</div></div>`}
function dailyBlockCard(b){const cls=/descanso/i.test(b.materia||'')?'break':/(hora mística|hora mistica|parte)/i.test(b.materia||'')?'formation':'class'; return `<div class="daily-block ${cls} clickable" onclick="openScheduleBlockForm('${b.id}')"><div class="time-badge">${esc(b.inicio)}<span>${esc(b.fin)}</span></div><div><b>${esc(b.materia||'Actividad')}</b><p>${esc(b.docente||b.instructor||(/descanso/i.test(b.materia||'')?'':'Docente / instructor pendiente'))} ${teacherIndicator(b.docente||b.instructor)}</p>${b.observacion?`<small>${esc(b.observacion)}</small>`:''}</div></div>`}
function scheduleTableRow(r){const cells=scheduleDays().map(day=>{const b=findScheduleCell(day,r.inicio,r.fin); const isBreak=b&&/descanso/i.test(b.materia||''); const isSpecial=b&&/(parte|hora mística|hora mistica)/i.test(b.materia||''); const cls=isBreak?'break':isSpecial?'special':b?'filled':'empty'; return `<td class="schedule-cell ${cls}" onclick="openScheduleCell('${day}','${r.inicio}','${r.fin}')">${b?`<div class="cell-subject">${esc(b.materia||'')}</div><div class="cell-teacher">${esc(b.docente||b.instructor||'Docente / instructor pendiente')}</div>`:`<div class="cell-empty">Toque para llenar</div><div class="cell-teacher">Docente / instructor</div>`}</td>`}).join(''); return `<tr><th class="time-col">${esc(r.inicio)}<br><span>${esc(r.fin)}</span></th>${cells}</tr>`}
function openScheduleCell(day,inicio,fin){let b=findScheduleCell(day,inicio,fin); if(!b){b={id:uid(),dia:day,inicio,fin,materia:'',docente:'',tipo:'clase',lugar:'',uniforme:'',observacion:''}; state.scheduleBlocks.push(b)} openScheduleBlockForm(b.id)}
async function selectDay(d){state.selectedDay=d; await save(); render()}
function renderBiblioteca(){const catalog=docs.catalogo?.documentos||[]; return `<section><h2 class="section-title">Biblioteca normativa</h2><div class="card library-search-card"><div class="row wrap"><input id="libQuery" class="grow" placeholder="Buscar artículo, ley, falta o uniforme..." onkeydown="if(event.key==='Enter') doLibrarySearch(this.value)"><button class="btn" onclick="doLibrarySearch($('#libQuery').value)">Buscar</button></div><p class="subtle">Busque dentro de los textos estructurados y abra el PDF institucional incorporado en cada documento.</p><div class="row wrap"><button class="btn secondary" onclick="showUniformIndex()">Índice de uniformes</button><a class="btn secondary link-btn" href="./assets/reglamento-uniformes-2021.pdf" target="_blank" rel="noopener">PDF de uniformes</a><button class="btn ghost" onclick="auditUniformImages()">Auditar imágenes</button></div></div><div id="libResults"></div><h3 class="section-title">Documentos</h3><div class="document-list">${catalog.map(d=>`<button class="list-item clickable doc-item" onclick="openDoc('${d.id||d.slug||d.codigo||d.nombre}')"><span class="doc-status">${d.pdf?'PDF incorporado':'Consulta estructurada'}</span><h3>${esc(d.titulo||d.nombre)}</h3><p>${esc(d.descripcion||'Documento normativo disponible para consulta por artículos.')}</p><small>${esc(d.categoria||'Biblioteca normativa')}</small></button>`).join('')}</div><div class="card"><h3>Accesos rápidos</h3><div class="row wrap"><button class="btn secondary" onclick="quickSumario('Faltas Leves')">Faltas leves</button><button class="btn secondary" onclick="quickSumario('Faltas Graves')">Faltas graves</button><button class="btn secondary" onclick="quickSumario('Faltas Gravísimas')">Faltas gravísimas</button><button class="btn secondary" onclick="doLibrarySearch('Uniforme N° 3-B Tropical')">3B Tropical</button></div></div></section>`}
function renderNotes(){const notes=state.notes.filter(n=>!n.archived); return `<section><div class="row between"><h2 class="section-title">Bloc de notas</h2><button class="btn" onclick="openNoteForm()">+</button></div><div class="tabs"><button class="active">Todo</button><button onclick="showArchivedNotes()">Archivadas</button></div><div class="note-grid">${notes.map(n=>`<div class="note-card clickable" onclick="openNoteForm('${n.id}')"><h3>${esc(n.title||'Sin título')}</h3><p>${esc((n.text||'').slice(0,130))}${(n.text||'').length>130?'...':''}</p><div class="muted">${new Date(n.updated||n.created).toLocaleString('es-BO')}</div></div>`).join('')||'<div class="card small"><p>No hay notas guardadas.</p></div>'}</div></section>`}
function showModal(html){$('#modalRoot').innerHTML=`<div class="modal-bg" onclick="if(event.target.className==='modal-bg') closeModal()"><div class="modal">${html}</div></div>`}
function closeModal(){ $('#modalRoot').innerHTML='' }
function openQuick(){showModal(`<h2>Agregar rápido</h2><div class="drawer-list quick-list"><button class="drawer-btn" onclick="closeModal();openFormationForm()">${icon('shield')}<span><b>Formación / servicio</b><small>Control, hora mística, orden o acto</small></span></button><button class="drawer-btn" onclick="closeModal();openTaskForm()">${icon('tasks')}<span><b>Tarea académica</b><small>Trabajo, entrega, lectura o exposición</small></span></button><button class="drawer-btn" onclick="closeModal();openNoteForm()">${icon('note')}<span><b>Bloc de notas</b><small>Consigna, apunte o recordatorio</small></span></button><button class="drawer-btn" onclick="closeModal();go('horario');setTimeout(chooseScheduleFile,150)">${icon('calendar')}<span><b>Foto de horario</b><small>Imagen desde galería o cámara</small></span></button></div>`)}
function openNotes(){ $('#app').innerHTML=appShell(renderNotes()) }
function openSettings(){showModal(`<button class="icon-btn close" onclick="closeModal()">×</button><div class="settings-head"><img src="./assets/escudo-policia.png" class="seal small-seal"><div><h2>Configuración</h2><p>Agenda Policial · v${APP_VERSION}</p></div></div><div class="settings-current"><b>Modo actual:</b> <span class="tag">${state.mode||'académico'}</span><button class="btn secondary" onclick="toggleMode()">Cambiar modo</button></div><div class="drawer-list settings-list"><button class="drawer-btn" onclick="openKardex()">👤 Kardex / datos del policía</button><button class="drawer-btn" onclick="openTeachersPanel()">👥 Docentes / instructores</button><button class="drawer-btn" onclick="exportBackup()">⬇️ Exportar respaldo JSON</button><button class="drawer-btn" onclick="importBackup()">⬆️ Importar respaldo JSON</button><div class="settings-two"><button class="drawer-btn important" onclick="checkUpdate()"><b>1</b> Buscar actualización</button><button class="drawer-btn important" onclick="forceCleanUpdate()"><b>2</b> Actualización limpia</button></div><button class="drawer-btn warn-action" onclick="cleanAppCachesConfirm()">⚠️ Limpiar caché sin borrar datos</button><button class="drawer-btn danger-action" onclick="resetAllData()">🗑️ Borrar todos mis datos</button><details class="advanced-settings"><summary>Herramientas avanzadas</summary><button class="drawer-btn" onclick="openDiagnostics()">Estado técnico / diagnóstico</button><button class="drawer-btn" onclick="location.href='./reset.html'">Reparar actualización bloqueada</button><button class="drawer-btn" onclick="auditUniformImages()">Auditar imágenes de uniformes</button></details><button class="drawer-btn" onclick="toast('Último respaldo: ${state.settings.lastBackup||'sin respaldo'}')">Último respaldo</button></div><input id="backupImport" type="file" accept="application/json" class="hidden">`)}
async function cleanAppCachesConfirm(){if(!confirm('Se limpiará solo el caché de la app. No se borrarán tareas, horario, notas ni activación. ¿Continuar?'))return; await cleanAppCaches(true)}
async function resetAllData(){if(!confirm('ADVERTENCIA: esto borrará horario, tareas, formaciones, notas, Kardex, docentes, sesión académica y activación local. ¿Continuar?'))return; if(!confirm('Confirmación final: no se podrá deshacer salvo que tenga respaldo JSON. ¿Borrar todo?'))return; state=structuredClone(DEFAULT_STATE); [...Array(localStorage.length)].map((_,i)=>localStorage.key(i)).filter(Boolean).filter(k=>k.startsWith('agenda-academic-')||k.startsWith('academic-post-cache-')||k.startsWith('agenda-demo-')).forEach(k=>localStorage.removeItem(k)); localStorage.removeItem('agenda-policial-activated'); localStorage.removeItem('agenda-policial-activation-type'); await save(); closeModal(); renderActivation(); toast('Datos locales borrados por completo')}
function scheduleTeachers(){const map=new Map(); (state.scheduleBlocks||[]).forEach(b=>{const n=(b.docente||b.instructor||'').trim(); if(!n||/pendiente|no consignado|descanso/i.test(n))return; const key=normalize(n); if(!map.has(key))map.set(key,{name:n,subjects:new Set()}); if(b.materia)map.get(key).subjects.add(b.materia)}); return [...map.values()].map(x=>({name:x.name,subjects:[...x.subjects]})).sort((a,b)=>a.name.localeCompare(b.name,'es'))}
function teacherProfile(name){return (state.teacherProfiles||{})[normalize(name)]||{level:'Normal',note:''}}
function teacherIndicator(name){if(!name)return ''; const p=teacherProfile(name); const cls={'Tranquilo':'ok','Normal':'normal','Estricto':'warn','Muy estricto':'orange','Cuidado especial':'danger'}[p.level]||'normal'; return `<span class="teacher-dot ${cls}" title="${esc(p.level)}"></span>`}
function openTeachersPanel(){const list=scheduleTeachers(); showModal(`<button class="icon-btn close" onclick="closeModal()">×</button><h2>Docentes / instructores</h2><p class="subtle">La lista se genera desde el horario activo. Puede clasificar a cada docente con un indicador discreto para el panel de inicio.</p><div class="teacher-list">${list.map(t=>{const p=teacherProfile(t.name);return `<div class="teacher-row clickable" onclick="openTeacherForm('${esc(t.name)}')"><div>${teacherIndicator(t.name)}<b>${esc(t.name)}</b><small>${esc(t.subjects.join(', '))}</small></div><span class="tag">${esc(p.level)}</span></div>`}).join('')||'<p class="subtle">No hay docentes cargados en el horario.</p>'}</div>`)}
function openTeacherForm(name){const p=teacherProfile(name); showModal(`<button class="icon-btn close" onclick="openTeachersPanel()">←</button><h2>${esc(name)}</h2><form id="teacherForm">${buildForm([{name:'level',label:'Indicador',type:'select',options:['Tranquilo','Normal','Estricto','Muy estricto','Cuidado especial']},{name:'note',label:'Observación personal',type:'textarea'}],p)}<div class="form-actions"><button class="btn" type="submit">Guardar</button><button class="btn secondary" type="button" onclick="openTeachersPanel()">Cancelar</button></div></form>`); $('#teacherForm').onsubmit=async e=>{e.preventDefault(); state.teacherProfiles=state.teacherProfiles||{}; state.teacherProfiles[normalize(name)]=formData(e.target); await save(); openTeachersPanel(); toast('Docente actualizado')}}
async function toggleMode(){state.mode=state.mode==='academico'?'profesional':'academico'; await save(); closeModal(); render()}
function buildForm(fields, obj={}){return `<div class="form">${fields.map(f=>{const v=obj[f.name]??''; const label=`<label>${f.label}</label>`; if(f.type==='textarea')return `${label}<textarea name="${f.name}">${esc(v)}</textarea>`; if(f.type==='select')return `${label}<select name="${f.name}">${(f.options||[]).map(o=>`<option ${v===o?'selected':''}>${esc(o)}</option>`).join('')}</select>`; const listId=f.datalist?`dl-${f.name}`:''; const dl=f.datalist?`<datalist id="${listId}">${f.datalist.map(o=>`<option value="${esc(o)}"></option>`).join('')}</datalist>`:''; return `${label}<input name="${f.name}" type="${f.type||'text'}" value="${esc(v)}" ${listId?`list="${listId}"`:''} ${f.placeholder?`placeholder="${esc(f.placeholder)}"`:''}>${dl}`}).join('')}</div>`}
function formData(root){return Object.fromEntries(new FormData(root).entries())}
function scheduleSubjects(){const map=new Map(); (state.scheduleBlocks||[]).forEach(b=>{const m=(b.materia||'').trim(); if(!m)return; if(/descanso|parte de diana|parte de asamblea|hora mística|hora mistica|trabajo de investigación/i.test(m))return; const key=normalize(m); if(!map.has(key))map.set(key,m)}); return [...map.values()].sort((a,b)=>a.localeCompare(b,'es'))}
function subjectField(current=''){const opts=scheduleSubjects(); if(current&&!opts.some(o=>normalize(o)===normalize(current)))opts.unshift(current); return {name:'subject',label:'Materia',type:'select',options:opts.length?opts:['Sin materias en horario']}}
function firstClassTimeForSubjectDate(subject,date){const day=weekdayISO(date); const blocks=getBlocksForDay(day).filter(b=>normalize(b.materia)===normalize(subject)).sort((a,b)=>minutes(a.inicio)-minutes(b.inicio)); return blocks[0]?.inicio||''}
function nextClassDateForSubject(subject){for(let add=0; add<28; add++){const iso=addDaysISO(todayISO(),add); const day=weekdayISO(iso); const blocks=getBlocksForDay(day).filter(b=>normalize(b.materia)===normalize(subject)&&classifyBlock(b,iso)!=='finished'); if(blocks.length)return iso}return todayISO()}
function setTaskNextClass(){const subject=$('[name="subject"]')?.value||''; if(!subject)return toast('Seleccione primero una materia'); const iso=nextClassDateForSubject(subject); $('[name="dueDate"]').value=iso; toast('Fecha colocada en la próxima clase: '+fmtDate(iso))}
function openFormationForm(id=null, pre={}){const f=id?state.formations.find(x=>x.id===id):{date:todayISO(),...pre}; const fields=[{name:'type',label:'Tipo de actividad',type:'select',options:['Formación','Servicio extraordinario','Orden de guarnición','Acto institucional','Control','Otro']},{name:'title',label:'Título / nombre'},{name:'date',label:'Fecha',type:'date'},{name:'arribo',label:'Hora de arribo',type:'time'},{name:'formacion',label:'Hora de formación',type:'time'},{name:'parte',label:'Hora de parte',type:'time'},{name:'place',label:'Lugar'},{name:'location',label:'Link de ubicación'},{name:'uniforme',label:'Uniforme'},{name:'observations',label:'Observaciones',type:'textarea'},{name:'original',label:'Mensaje original',type:'textarea'}]; showModal(`<h2>${id?'Editar':'Nueva'} formación / servicio</h2><form id="formationForm">${buildForm(fields,f)}<div class="form-actions"><button class="btn" type="submit">Guardar</button><button class="btn secondary" type="button" onclick="closeModal()">Cancelar</button></div></form>`); $('#formationForm').onsubmit=async e=>{e.preventDefault(); const data=formData(e.target); if(id)Object.assign(f,data,{updated:new Date().toISOString()}); else state.formations.push({...data,id:uid(),status:'active',created:new Date().toISOString()}); await save(); closeModal(); render(); toast('Formación guardada') }}
function openFormationSmart(){showModal(`<h2>Mensaje inteligente de formación</h2><p class="subtle">Pega el comunicado recibido. La app conserva el mensaje original y propone datos editables.</p><textarea id="smartText" placeholder="Pegar comunicado..." style="width:100%;min-height:220px"></textarea><div class="form-actions"><button class="btn" onclick="analyzeFormation()">Analizar</button><button class="btn secondary" onclick="closeModal()">Cancelar</button></div>`)}
function analyzeFormation(){const raw=$('#smartText').value.trim(); if(!raw)return toast('Pegue un mensaje'); const a=parseFormation(raw); const titles=suggestTitles(raw,'formation'); showModal(`<h2>Revisar formación</h2><p>Elige un título:</p><div class="row wrap">${titles.map(t=>`<button class="option-btn" onclick="$('#fTitle').value='${esc(t)}'">${esc(t)}</button>`).join('')}</div><form id="formationForm">${buildForm([{name:'title',label:'Título'},{name:'type',label:'Tipo',type:'select',options:['Formación','Servicio extraordinario','Orden de guarnición','Acto institucional','Control','Otro']},{name:'date',label:'Fecha',type:'date'},{name:'arribo',label:'Hora de arribo',type:'time'},{name:'formacion',label:'Hora de formación',type:'time'},{name:'parte',label:'Hora de parte',type:'time'},{name:'place',label:'Lugar'},{name:'location',label:'Link de ubicación'},{name:'uniforme',label:'Uniforme'},{name:'observations',label:'Observaciones',type:'textarea'},{name:'original',label:'Mensaje original',type:'textarea'}],{...a,title:titles[0],original:raw})}<div class="form-actions"><button class="btn" type="submit">Guardar</button><button class="btn secondary" type="button" onclick="closeModal()">Cancelar</button></div></form>`); $('input[name="title"]').id='fTitle'; $('#formationForm').onsubmit=async e=>{e.preventDefault(); state.formations.push({...formData(e.target),id:uid(),status:'active',created:new Date().toISOString()}); await save(); closeModal(); render(); toast('Formación guardada')}}
function parseFormation(raw){const t=String(raw||''); const h=[...t.matchAll(/(?:hora(?:\s+de)?\s*(formaci[oó]n|arribo|parte)?|arribo|formaci[oó]n|parte)\D{0,25}(\d{1,2})[:.](\d{2})/gi)]; const out={date:extractDate(t),observations:t}; h.forEach(m=>{const label=normalize(m[1]||m[0]); const val=m[2].padStart(2,'0')+':'+m[3]; if(label.includes('arribo'))out.arribo=val; else if(label.includes('parte'))out.parte=val; else out.formacion=val}); const lugar=t.match(/(?:lugar|concentraci[oó]n|ubicaci[oó]n)\s*[:\-]?\s*([^\n]+)/i); if(lugar)out.place=lugar[1].trim(); const link=t.match(/https?:\/\/\S+/i); if(link)out.location=link[0]; const uni=t.match(/(?:uniforme|prendas base|uniforme de aulas|control de uniforme)\s*[:\-]?\s*([^\n]+)/i); if(uni)out.uniforme=uni[1].trim(); if(/hora\s+m[ií]stica/i.test(t)){out.type='Formación'; out.title='Hora mística'; if(!out.formacion&&!out.arribo)out.formacion='06:00'} else if(/servicio|orden de guarnici[oó]n|acto|desfile/i.test(t))out.type='Servicio extraordinario'; else out.type=out.type||'Formación'; return out}
function extractDate(t){const s=String(t||''); const iso=s.match(/(20\d{2})[-\/](\d{1,2})[-\/](\d{1,2})/); if(iso)return `${iso[1]}-${iso[2].padStart(2,'0')}-${iso[3].padStart(2,'0')}`; const dm=s.match(/(\d{1,2})\s+de\s+([a-záéíóú]+)(?:\s+de\s+(20\d{2}))?/i); const months={enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,setiembre:9,octubre:10,noviembre:11,diciembre:12}; if(dm){const mm=months[normalize(dm[2])]; const yy=dm[3]?Number(dm[3]):new Date().getFullYear(); if(mm){let out=`${yy}-${String(mm).padStart(2,'0')}-${dm[1].padStart(2,'0')}`; if(out<todayISO()) out=`${yy+1}-${String(mm).padStart(2,'0')}-${dm[1].padStart(2,'0')}`; return out}} if(/\bma[nñ]ana\b/i.test(s))return addDaysISO(todayISO(),1); const dayMatch=s.match(/\b(lunes|martes|mi[eé]rcoles|miercoles|jueves|viernes|s[aá]bado|domingo)\b/i); if(dayMatch){const day=normDayWord(dayMatch[1]); return dateForDayKey(day)} return todayISO()}
function suggestTitles(raw,type){const n=normalize(raw); if(type==='task'){if(n.includes('expos'))return ['Preparar exposición','Exposición pendiente','Trabajo de exposición']; if(n.includes('leer'))return ['Lectura asignada','Leer material de clase','Lectura pendiente']; if(n.includes('present'))return ['Presentar trabajo','Entrega académica','Presentación pendiente']; return ['Tarea académica pendiente','Trabajo de clase','Actividad académica']} if(n.includes('hora mistica'))return ['Hora mística','Control de formación','Formación académica']; if(n.includes('rectificando')||n.includes('nueva hora'))return ['Rectificación de formación','Cambio de hora','Actualización de servicio']; if(n.includes('orden de guarnicion'))return ['Orden de guarnición','Servicio por orden de guarnición','Actividad institucional']; if(n.includes('formacion'))return ['Formación general','Nueva formación','Control de formación']; if(n.includes('servicio'))return ['Servicio extraordinario','Servicio programado','Actividad de servicio']; return ['Comunicado de formación','Actividad institucional','Instrucción recibida']}
function openFormation(id){const f=state.formations.find(x=>x.id===id); if(!f)return; showModal(`<button class="icon-btn close" onclick="closeModal()">×</button><h2>${esc(f.title)}</h2><p><span class="tag warn">${esc(f.type||'Formación')}</span></p><p><b>Fecha:</b> ${fmtDate(f.date)}</p><p><b>Arribo:</b> ${esc(f.arribo||'')} · <b>Formación:</b> ${esc(f.formacion||'')} · <b>Parte:</b> ${esc(f.parte||'')}</p><p><b>Lugar:</b> ${esc(f.place||'')}</p><p><b>Uniforme:</b> ${esc(f.uniforme||'')}</p>${f.location?`<p><a href="${esc(f.location)}" target="_blank">Abrir ubicación</a></p>`:''}<h3>Observaciones</h3><p>${esc(f.observations||'')}</p><h3>Mensaje original</h3><pre class="article-text">${esc(f.original||'')}</pre><div class="row wrap"><button class="btn" onclick="closeModal();openFormationForm('${f.id}')">Editar</button><button class="btn secondary" onclick="archiveFormation('${f.id}')">Archivar</button><button class="btn danger" onclick="deleteFormation('${f.id}')">Eliminar</button></div>`)}
async function archiveFormation(id){const f=state.formations.find(x=>x.id===id); if(f)f.status='archived'; await save(); closeModal(); render(); toast('Archivado')}
async function deleteFormation(id){if(!confirm('¿Eliminar formación?'))return; state.formations=state.formations.filter(x=>x.id!==id); await save(); closeModal(); render(); toast('Eliminado')}
function formationOptions(id){showModal(`<h2>Opciones</h2><div class="drawer-list"><button class="drawer-btn" onclick="closeModal();openFormation('${id}')">Ver detalle</button><button class="drawer-btn" onclick="closeModal();openFormationForm('${id}')">Editar</button><button class="drawer-btn" onclick="duplicateFormation('${id}')">Duplicar</button><button class="drawer-btn" onclick="archiveFormation('${id}')">Archivar</button><button class="drawer-btn" onclick="deleteFormation('${id}')">Eliminar</button></div>`)}
async function duplicateFormation(id){const f=state.formations.find(x=>x.id===id); if(f){state.formations.push({...f,id:uid(),title:f.title+' (copia)',created:new Date().toISOString()}); await save(); closeModal(); render()}}
function openTaskForm(id=null, pre={}){const t=id?state.tasks.find(x=>x.id===id):{dueDate:todayISO(),subtasks:[],...pre}; const subj=subjectField(t.subject); const regDate=t.created?localISO(new Date(t.created)):todayISO(); showModal(`<h2>${id?'Editar':'Nueva'} tarea académica</h2><p class="subtle">Fecha de registro automática: <b>${fmtDate(regDate)}</b></p><p class="subtle">La materia se despliega desde el horario académico activo, sin duplicar nombres.</p><form id="taskForm">${buildForm([subj,{name:'title',label:'Título de la tarea'}],t)}<div class="task-next-row"><button class="btn secondary" type="button" onclick="setTaskNextClass()">Próxima clase</button><span class="subtle">Usa la próxima fecha donde aparece esa materia.</span></div>${buildForm([{name:'dueDate',label:'Fecha de entrega',type:'date'},{name:'kind',label:'Tipo',type:'select',options:['Personal','Grupo','Lectura','Exposición','Documento','Otro']},{name:'description',label:'Descripción',type:'textarea'},{name:'subtasksText',label:'Puntos de trabajo, uno por línea',type:'textarea'},{name:'original',label:'Mensaje original',type:'textarea'}],{...t,subtasksText:(t.subtasks||[]).map(s=>s.text).join('\n')})}<div class="form-actions"><button class="btn" type="submit">Guardar</button><button class="btn secondary" type="button" onclick="closeModal()">Cancelar</button></div></form>`); $('#taskForm').onsubmit=async e=>{e.preventDefault(); const data=formData(e.target); data.dueTime=firstClassTimeForSubjectDate(data.subject,data.dueDate); data.subtasks=(data.subtasksText||'').split('\n').map(x=>x.trim()).filter(Boolean).map((text,i)=>({text,done:(t.subtasks||[])[i]?.done||false})); delete data.subtasksText; if(id)Object.assign(t,data,{updated:new Date().toISOString()}); else state.tasks.push({...data,id:uid(),status:'pending',created:new Date().toISOString()}); await save(); closeModal(); render(); toast('Tarea guardada') }}
function openTaskSmart(){showModal(`<h2>Mensaje inteligente de tarea académica</h2><textarea id="smartText" placeholder="Pegar instrucción de tarea..." style="width:100%;min-height:220px"></textarea><div class="form-actions"><button class="btn" onclick="analyzeTask()">Analizar</button><button class="btn secondary" onclick="closeModal()">Cancelar</button></div>`)}
function analyzeTask(){const raw=$('#smartText').value.trim(); if(!raw)return toast('Pegue un mensaje'); const titles=suggestTitles(raw,'task'); const a=parseTask(raw); const subj=subjectField(a.subject); showModal(`<h2>Revisar tarea</h2><p>Elige un título:</p><div class="row wrap">${titles.map(t=>`<button class="option-btn" onclick="$('input[name=title]').value='${esc(t)}'">${esc(t)}</button>`).join('')}</div><p class="subtle">Fecha de registro automática: <b>${fmtDate(todayISO())}</b></p><form id="taskForm">${buildForm([subj,{name:'title',label:'Título de la tarea'}],{...a,title:titles[0]})}<div class="task-next-row"><button class="btn secondary" type="button" onclick="setTaskNextClass()">Próxima clase</button><span class="subtle">Coloca la próxima fecha según la materia seleccionada.</span></div>${buildForm([{name:'dueDate',label:'Fecha de entrega',type:'date'},{name:'kind',label:'Tipo',type:'select',options:['Personal','Grupo','Lectura','Exposición','Documento','Otro']},{name:'description',label:'Descripción',type:'textarea'},{name:'subtasksText',label:'Puntos de trabajo, uno por línea',type:'textarea'},{name:'original',label:'Mensaje original',type:'textarea'}],{...a,description:raw,original:raw})}<div class="form-actions"><button class="btn" type="submit">Guardar</button><button class="btn secondary" type="button" onclick="closeModal()">Cancelar</button></div></form>`); $('#taskForm').onsubmit=async e=>{e.preventDefault(); const data=formData(e.target); data.dueTime=firstClassTimeForSubjectDate(data.subject,data.dueDate); data.subtasks=(data.subtasksText||'').split('\n').map(x=>x.trim()).filter(Boolean).map(text=>({text,done:false})); delete data.subtasksText; state.tasks.push({...data,id:uid(),status:'pending',created:new Date().toISOString()}); await save(); closeModal(); render(); toast('Tarea guardada')}}
function extractTaskPoints(raw){const lines=String(raw||'').split(/\n+/).map(x=>x.trim()).filter(Boolean); const points=[]; for(const line of lines){let m=line.match(/^[-•*]\s+(.+)/); if(!m)m=line.match(/^\d+[.)]\s+(.+)/); if(!m)m=line.match(/^[a-z][.)]\s+(.+)/i); if(m)points.push(m[1].trim())} if(!points.length){const after=String(raw).split(/(?:lo siguiente|siguientes puntos|contenido mínimo|requisitos|deberán|deberan)\s*[:：]/i)[1]; if(after)after.split(/[;\n]/).map(x=>x.trim()).filter(x=>x.length>4).forEach(x=>points.push(x.replace(/^[-•*\d.)\s]+/,'')))} return [...new Set(points)].slice(0,20)}
function parseTask(raw){const out={dueDate:extractDate(raw),subtasksText:extractTaskPoints(raw).join('\n')}; const mat=raw.match(/(?:materia|asignatura)\s*[:\-]?\s*([^\n]+)/i); if(mat)out.subject=mat[1].trim(); const hh=raw.match(/(\d{1,2})[:.](\d{2})/); if(hh)out.dueTime=hh[1].padStart(2,'0')+':'+hh[2]; if(/grupo|grupal/i.test(raw))out.kind='Grupo'; else if(/leer|lectura/i.test(raw))out.kind='Lectura'; else if(/expos/i.test(raw))out.kind='Exposición'; return out}
function openTask(id){const t=state.tasks.find(x=>x.id===id); if(!t)return; showModal(`<button class="icon-btn close" onclick="closeModal()">×</button><h2>${esc(t.title)}</h2><p><b>Materia:</b> ${esc(t.subject||'')}</p><p><b>Entrega:</b> ${fmtDate(t.dueDate)} ${esc(t.dueTime||'')}</p><p><b>Tipo:</b> ${esc(t.kind||'')}</p><h3>Descripción</h3><p>${esc(t.description||'')}</p>${t.subtasks?.length?`<h3>Puntos de trabajo</h3>${t.subtasks.map((s,i)=>`<div class="row"><button class="checkbox ${s.done?'on':''}" onclick="toggleSubtask('${t.id}',${i})">${s.done?'✓':''}</button><span>${esc(s.text)}</span></div>`).join('')}`:''}<h3>Mensaje original</h3><pre class="article-text">${esc(t.original||'')}</pre><div class="row wrap"><button class="btn" onclick="closeModal();openTaskForm('${t.id}')">Editar</button><button class="btn secondary" onclick="toggleTask('${t.id}')">${t.status==='done'?'Marcar pendiente':'Marcar cumplida'}</button><button class="btn danger" onclick="deleteTask('${t.id}')">Eliminar</button></div>`)}
async function toggleTask(id){const t=state.tasks.find(x=>x.id===id); if(!t)return; t.status=t.status==='done'?'pending':'done'; t.updated=new Date().toISOString(); await save(); closeModal(); render(); toast(t.status==='done'?'Tarea cumplida':'Tarea pendiente')}
async function toggleSubtask(id,i){const t=state.tasks.find(x=>x.id===id); if(!t||!t.subtasks[i])return; t.subtasks[i].done=!t.subtasks[i].done; await save(); render();}
function taskOptions(id){showModal(`<h2>Opciones</h2><div class="drawer-list"><button class="drawer-btn" onclick="closeModal();openTask('${id}')">Ver detalle</button><button class="drawer-btn" onclick="closeModal();openTaskForm('${id}')">Editar</button><button class="drawer-btn" onclick="toggleTask('${id}')">Cumplida / pendiente</button><button class="drawer-btn" onclick="archiveTask('${id}')">Archivar</button><button class="drawer-btn" onclick="deleteTask('${id}')">Eliminar</button></div>`)}
async function archiveTask(id){const t=state.tasks.find(x=>x.id===id); if(t)t.status='archived'; await save(); closeModal(); render()}
async function deleteTask(id){if(!confirm('¿Eliminar tarea?'))return; state.tasks=state.tasks.filter(x=>x.id!==id); await save(); closeModal(); render()}
function openNoteForm(id=null){const n=id?state.notes.find(x=>x.id===id):{title:'',text:'',category:''}; showModal(`<button class="icon-btn close" onclick="closeModal()">×</button><h2>${id?'Editar':'Nueva'} nota</h2><p class="subtle">Bloc de notas policial. Escriba libremente; se puede editar después.</p><form id="noteForm" class="note-editor-form">${buildForm([{name:'title',label:'Título'},{name:'category',label:'Carpeta / categoría'},{name:'text',label:'Texto',type:'textarea'}],n)}<div class="form-actions note-actions"><button class="btn" type="submit">Guardar</button><button class="btn secondary" type="button" onclick="closeModal()">Cancelar</button></div></form>`); const textArea=$('#noteForm textarea[name="text"]'); if(textArea) textArea.classList.add('note-textarea'); $('#noteForm').onsubmit=async e=>{e.preventDefault(); const data=formData(e.target); if(id)Object.assign(n,data,{updated:new Date().toISOString()}); else state.notes.push({...data,id:uid(),created:new Date().toISOString(),updated:new Date().toISOString(),archived:false}); await save(); closeModal(); openNotes(); toast('Nota guardada')}}
function openScheduleImage(){if(!state.schedulePhoto)return toast('No hay imagen propia cargada. Puede ver la imagen de referencia.'); showModal(`<h2>Imagen actual del horario</h2><img class=\"image-preview\" src=\"${state.schedulePhoto}\"><div class=\"row wrap\"><button class=\"btn secondary\" onclick=\"chooseScheduleFile()\">Reemplazar desde archivos</button><button class=\"btn secondary\" onclick=\"takeSchedulePhoto()\">Tomar foto</button><button class=\"btn danger\" onclick=\"removeScheduleImage()\">Eliminar imagen</button></div>`)}
function openReferenceScheduleImage(){const template=currentScheduleTemplate();const src=(state.scheduleMeta?.fuente_visual||template?.fuente_visual||docs.horario?.fuente_visual||'assets/horario-segundo-semestre-2026.png'); showModal(`<h2>Imagen de referencia del horario</h2><img class=\"image-preview schedule-reference-image\" src=\"./${esc(src)}\"><p class=\"subtle\">Esta imagen queda como referencia visual. La tabla editable ya está armada con sus campos.</p><div class=\"row wrap\"><button class=\"btn\" onclick=\"restoreBaseSchedule()\">Restaurar tabla base</button><button class=\"btn secondary\" onclick=\"closeModal()\">Cerrar</button></div>`)}
function chooseScheduleFile(){closeModal(); $('#scheduleFile')?.click(); setTimeout(()=>{const input=$('#scheduleFile'); if(input) input.onchange=e=>loadScheduleImage(e.target.files[0])},50)}
function takeSchedulePhoto(){closeModal(); $('#scheduleCamera')?.click(); setTimeout(()=>{const input=$('#scheduleCamera'); if(input) input.onchange=e=>loadScheduleImage(e.target.files[0])},50)}
function loadScheduleImage(file){if(!file)return; const rd=new FileReader(); rd.onload=async()=>{state.schedulePhoto=rd.result; state.schedulePhotoName=file.name; await save(); render(); toast('Imagen cargada')}; rd.readAsDataURL(file)}
async function removeScheduleImage(){state.schedulePhoto=null; state.schedulePhotoName=null; await save(); closeModal(); render()}
function openScheduleAnalyzer(){showModal(`<h2>Analizar / rellenar horario</h2>${state.schedulePhoto?`<img class="image-preview" src="${state.schedulePhoto}">`:'<p>No hay imagen cargada.</p>'}<div class="card small warn-card"><b>Nota realista sobre OCR</b><p>La lectura automática en GitHub Pages depende del navegador. En tablas con letras pequeñas puede no leer docentes aunque la imagen esté nítida. Por eso se agregó relleno asistido: lee lo que pueda, completa docentes desde la plantilla y deja revisión antes de guardar.</p></div><div class="row wrap"><button class="btn secondary" onclick="chooseScheduleFile()">Subir otra imagen</button><button class="btn secondary" onclick="takeSchedulePhoto()">Tomar foto</button>${state.schedulePhoto?'<button class="btn" onclick="runScheduleOCR()">Leer imagen automáticamente</button>':''}<button class="btn important" onclick="applyScheduleTemplateFromPhoto()">Usar plantilla base editable</button></div><div id="ocrStatus" class="subtle"></div><textarea id="scheduleText" style="width:100%;min-height:200px" placeholder="También puede pegar texto reconocido. Ej.: 07:30-08:10 Planificación Estratégica Lic. ...   Inteligencia Estratégica My. ..."></textarea><div class="form-actions"><button class="btn" onclick="parseScheduleText()">Crear bloques</button><button class="btn ghost" onclick="reviewParsedSchedule(scheduleBaseEntries().map(normalizeScheduleEntry))">Revisar estructura base</button><button class="btn secondary" onclick="closeModal()">Cancelar</button></div>`)}
async function runScheduleOCR(){if(!state.schedulePhoto)return toast('Primero suba una imagen'); const st=$('#ocrStatus'); st.textContent='Preparando lectura OCR: se probarán varias mejoras de contraste.'; try{let text=''; const variants=await preprocessImageVariantsForOCR(state.schedulePhoto).catch(async()=>[state.schedulePhoto]); if(window.Tesseract){for(let i=0;i<variants.length;i++){st.textContent=`OCR variante ${i+1}/${variants.length}...`; const result=await Tesseract.recognize(variants[i],'spa+eng',{logger:m=>{if(m.status) st.textContent=`OCR ${i+1}/${variants.length}: ${m.status} ${m.progress?Math.round(m.progress*100)+'%':''}`}, tessedit_pageseg_mode:'6', preserve_interword_spaces:'1'}); const candidate=(result?.data?.text||'').trim(); if(candidate.length>text.length) text=candidate; if(candidate.match(/PLANIFIC|INTELIG|PROCED|CIENCIA|AUDITOR|ADMINISTR|ACONDICION|TECNICAS/i)) break;}} else if('TextDetector' in window){const img=new Image(); img.src=variants[0]; await img.decode(); const detector=new TextDetector(); const found=await detector.detect(img); text=found.map(x=>x.rawValue).join('\n');} else {st.innerHTML='Este navegador no tiene OCR disponible. Use <b>Usar plantilla base editable</b> y edite las celdas.'; return toast('OCR no disponible en este dispositivo');} $('#scheduleText').value=text.trim(); if(text.trim()){st.textContent='Texto detectado. Se intentará ubicarlo en la tabla y completar docentes desde la plantilla.'; const ok=parseScheduleText(false); if(!ok) st.innerHTML='Se leyó texto, pero no se pudo estructurar. Use plantilla base editable y corrija celdas puntuales.';} else {st.innerHTML='No se pudo leer texto. Use <b>Usar plantilla base editable</b> para rellenar la tabla y editar.';} }catch(e){console.error(e); st.innerHTML='No se pudo analizar la imagen. Use <b>Usar plantilla base editable</b> o registre manualmente.'; toast('Falló la lectura OCR')}}
function preprocessImageForOCR(dataUrl){return preprocessImageVariantsForOCR(dataUrl).then(v=>v[0])}
function preprocessImageVariantsForOCR(dataUrl){return new Promise((resolve,reject)=>{const img=new Image(); img.onload=()=>{try{const maxW=2600; const scale=Math.min(3.2,Math.max(1.8,maxW/img.width)); const variants=[]; const modes=['contrast','bw','gray']; for(const mode of modes){const canvas=document.createElement('canvas'); canvas.width=Math.round(img.width*scale); canvas.height=Math.round(img.height*scale); const ctx=canvas.getContext('2d',{willReadFrequently:true}); ctx.fillStyle='white'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high'; ctx.drawImage(img,0,0,canvas.width,canvas.height); const im=ctx.getImageData(0,0,canvas.width,canvas.height); const d=im.data; for(let i=0;i<d.length;i+=4){const gray=(d[i]*.299+d[i+1]*.587+d[i+2]*.114); let v=gray; if(mode==='contrast')v=gray>190?255:gray<105?0:Math.round((gray-105)*255/85); if(mode==='bw')v=gray>168?255:0; if(mode==='gray')v=Math.min(255,Math.max(0,(gray-115)*1.65+115)); d[i]=d[i+1]=d[i+2]=v; d[i+3]=255;} ctx.putImageData(im,0,0); variants.push(canvas.toDataURL('image/png'));} resolve(variants);}catch(e){reject(e)}}; img.onerror=reject; img.src=dataUrl})}
async function applyScheduleTemplateFromPhoto(){if(!scheduleBaseEntries().length){toast('No hay estructura base cargada'); return} if(!confirm('Se aplicará la estructura base del horario policial de referencia: Paralelo A, Turno Mañana, Nivel Capitanes, Segundo Semestre Gestión 2026. Use esta plantilla como base y edite los datos de su curso, paralelo, turno y cada celda. El horario actual quedará en historial local. ¿Continuar?'))return; state.scheduleHistory=state.scheduleHistory||[]; if(state.scheduleBlocks?.length) state.scheduleHistory.push({id:uid(),date:new Date().toISOString(),blocks:state.scheduleBlocks,photo:state.schedulePhoto,name:state.schedulePhotoName,meta:state.scheduleMeta}); state.scheduleBlocks=scheduleBaseEntries().map(normalizeScheduleEntry); state.scheduleMeta={...(docs.horario?.metadatos||{}),fuente_visual:docs.horario?.fuente_visual||'assets/horario-segundo-semestre-2026.png'}; await save(); closeModal(); render(); toast('Horario rellenado con plantilla base editable')}
function cleanOCRLine(line){return String(line||'').replace(/[|]/g,'  ').replace(/[–—]/g,'-').replace(/(\d{1,2})[.;](\d{2})/g,'$1:$2').replace(/\s+/g,' ').trim()}
function normDayWord(w=''){const n=normalize(w); if(n.startsWith('lun'))return 'lunes'; if(n.startsWith('mar'))return 'martes'; if(n.startsWith('mie'))return 'miercoles'; if(n.startsWith('jue'))return 'jueves'; if(n.startsWith('vie'))return 'viernes'; if(n.startsWith('sab'))return 'sabado'; if(n.startsWith('dom'))return 'domingo'; return ''}
function splitCells(rest){let s=String(rest||'').trim(); if(!s)return []; let parts=s.split(/\s{2,}|\t|¦|\u2502|\u2758/g).map(x=>x.trim()).filter(Boolean); if(parts.length<=1){parts=s.split(/(?=\b(?:PLANIFICACION|PLANIFICACIÓN|INTELIGENCIA|PROCEDIMIENTOS|CIENCIA|ADMINISTRACION|ADMINISTRACIÓN|AUDITORIA|AUDITORÍA|METODOS|MÉTODOS|TRABAJO|ACONDICIONAMIENTO|TECNICAS|TÉCNICAS|DESCANSO|PARTE)\b)/i).map(x=>x.trim()).filter(Boolean);} return parts}
function splitSubjectTeacher(txt){let s=String(txt||'').replace(/\s+/g,' ').trim(); const m=s.match(/^(.*?)(\b(?:Lic\.?|My\.?|Mayor|Cnl\.?|Coronel|Tcnl\.?|Cap\.?|Sgto\.?|Sof\.?|Ing\.?|Dr\.?|Dra\.?|Instructor(?:a)?|Docente).*)$/i); if(m)return {materia:m[1].trim(),docente:m[2].trim()}; return {materia:s,docente:''}}
function templateTeacherFor(subject){const ns=normalize(subject); let best=''; let score=0; scheduleBaseEntries().forEach(e=>{const m=normalize(e.materia||''); if(!m||/descanso|parte|hora mistica/i.test(m))return; const parts=m.split(' ').filter(x=>x.length>3); let s=0; parts.forEach(p=>{if(ns.includes(p))s++}); if((ns.includes(m)||m.includes(ns))&&m.length>2)s+=5; if(s>score){score=s; best=e.docente||''}}); return best}function enhanceScheduleRows(rows){return rows.map(r=>{if(!r.docente&&r.materia)r.docente=templateTeacherFor(r.materia)||''; if(!r.tipo)r.tipo=/descanso/i.test(r.materia||'')?'descanso':/(parte|hora mística|hora mistica)/i.test(r.materia||'')?'formacion':'clase'; return r})}
function parseScheduleText(showEmpty=true){const text=$('#scheduleText')?.value||''; const rows=[]; const days=['lunes','martes','miercoles','jueves','viernes']; const lines=text.split(/\n+/).map(cleanOCRLine).filter(Boolean); for(const line of lines){let m=line.match(/\b(lunes|martes|mi[eé]rcoles|miercoles|jueves|viernes|s[aá]bado|domingo)\b.*?(\d{1,2}:\d{2})\s*[-a]\s*(\d{1,2}:\d{2})\s+(.+)/i); if(m){const st=splitSubjectTeacher(m[4]); rows.push({dia:normDayWord(m[1]),inicio:m[2],fin:m[3],materia:st.materia,docente:st.docente,lugar:'',observacion:''}); continue;} m=line.match(/^(\d{1,2}:\d{2})\s*[-a]\s*(\d{1,2}:\d{2})\s+(.+)/i); if(m){const ini=m[1], fin=m[2], rest=m[3]; const cells=splitCells(rest).filter(c=>!/^horas?$/i.test(c)); if(cells.length>=2){cells.slice(0,5).forEach((cell,i)=>{if(!cell||/^[-_]+$/.test(cell))return; const st=splitSubjectTeacher(cell); rows.push({dia:days[i]||'lunes',inicio:ini,fin:fin,materia:st.materia,docente:st.docente,lugar:'',observacion:''})});} else if(cells.length===1){const st=splitSubjectTeacher(cells[0]); rows.push({dia:'lunes',inicio:ini,fin:fin,materia:st.materia,docente:st.docente,lugar:'',observacion:'Revise día: el OCR no identificó columna'})} continue;} }
  if(!rows.length){if(showEmpty)toast('No se detectaron filas. Use plantilla base editable o pegue texto.'); return false;}
  reviewParsedSchedule(enhanceScheduleRows(rows)); return true;}
function reviewParsedSchedule(rows){window._parsedSchedule=rows; showModal(`<h2>Revisar horario detectado</h2><p class="subtle">Revise cada fila antes de guardar. El docente o instructor es obligatorio para las clases; si el OCR no lo leyó, complete ese campo antes de guardar.</p><div class="parsed-list">${rows.map((r,i)=>`<div class="card small parsed-row"><div class="grid two"><label>Día<select id="rowDia${i}"><option ${r.dia==='lunes'?'selected':''}>lunes</option><option ${r.dia==='martes'?'selected':''}>martes</option><option ${r.dia==='miercoles'?'selected':''}>miercoles</option><option ${r.dia==='jueves'?'selected':''}>jueves</option><option ${r.dia==='viernes'?'selected':''}>viernes</option><option ${r.dia==='sabado'?'selected':''}>sabado</option><option ${r.dia==='domingo'?'selected':''}>domingo</option></select></label><label>Horario<div class="row"><input id="rowIni${i}" value="${esc(r.inicio)}"><input id="rowFin${i}" value="${esc(r.fin)}"></div></label></div><label>Materia / actividad<input id="rowMat${i}" value="${esc(r.materia)}"></label><label>Docente / instructor<input id="rowDoc${i}" value="${esc(r.docente||'')}"></label><label>Observación<input id="rowObs${i}" value="${esc(r.observacion||'')}"></label></div>`).join('')}</div><div class="form-actions"><button class="btn" onclick="saveParsedSchedule(${rows.length})">Reemplazar horario</button><button class="btn secondary" onclick="appendParsedSchedule(${rows.length})">Crear/Agregar parcial</button><button class="btn ghost" onclick="closeModal()">Cancelar</button></div>`)}
function collectParsedRows(n){return Array.from({length:n},(_,i)=>{const materia=$(`#rowMat${i}`).value.trim(); const docente=$(`#rowDoc${i}`).value.trim(); const tipo=/descanso/i.test(materia)?'descanso':/(parte|hora mística|hora mistica)/i.test(materia)?'formacion':'clase'; return {dia:$(`#rowDia${i}`).value,inicio:$(`#rowIni${i}`).value,fin:$(`#rowFin${i}`).value,materia,docente,lugar:'',observacion:$(`#rowObs${i}`).value,id:uid(),tipo}}).filter(r=>r.materia||r.docente)}
async function saveParsedSchedule(n){if(!confirm('¿Reemplazar el horario actual? El horario anterior quedará en el historial local si existe.'))return; state.scheduleHistory=state.scheduleHistory||[]; if(state.scheduleBlocks?.length) state.scheduleHistory.push({id:uid(),date:new Date().toISOString(),blocks:state.scheduleBlocks,photo:state.schedulePhoto,name:state.schedulePhotoName}); state.scheduleBlocks=collectParsedRows(n); await save(); closeModal(); render(); toast('Horario reemplazado')}
async function appendParsedSchedule(n){state.scheduleBlocks.push(...collectParsedRows(n)); await save(); closeModal(); render(); toast('Horario agregado')}
function openScheduleBlockForm(id=null,day=null){const b=id?state.scheduleBlocks.find(x=>x.id===id):{dia:day||currentDayKey(),inicio:'07:30',fin:'08:10',tipo:'clase',docente:''}; showModal(`<h2>${id?'Editar':'Nuevo'} bloque</h2><form id="blockForm">${buildForm([{name:'dia',label:'Día',type:'select',options:['lunes','martes','miercoles','jueves','viernes','sabado','domingo']},{name:'inicio',label:'Inicio',type:'time'},{name:'fin',label:'Fin',type:'time'},{name:'tipo',label:'Tipo',type:'select',options:['clase','formacion','descanso','actividad']},{name:'materia',label:'Materia / actividad'},{name:'docente',label:'Docente / instructor'},{name:'lugar',label:'Aula / lugar'},{name:'observacion',label:'Observación',type:'textarea'}],b)}<div class="form-actions"><button class="btn" type="submit">Guardar</button>${id?`<button class="btn danger" type="button" onclick="deleteBlock('${id}')">Eliminar</button>`:''}<button class="btn secondary" type="button" onclick="closeModal()">Cancelar</button></div></form>`); $('#blockForm').onsubmit=async e=>{e.preventDefault(); const data=formData(e.target); if(id)Object.assign(b,data); else state.scheduleBlocks.push({...data,id:uid()}); await save(); closeModal(); render()}}
async function deleteBlock(id){if(!confirm('¿Eliminar bloque?'))return; state.scheduleBlocks=state.scheduleBlocks.filter(x=>x.id!==id); await save(); closeModal(); render()}
function openClassDetail(id){const b=state.scheduleBlocks.find(x=>x.id===id); if(!b)return; showModal(`<h2>${esc(b.materia||'Actividad')}</h2><p><b>${esc(b.dia)}</b> · ${esc(b.inicio)} - ${esc(b.fin)}</p><p><b>Docente:</b> ${esc(b.docente||'')}</p><p><b>Lugar:</b> ${esc(b.lugar||'')}</p><p>${esc(b.observacion||'')}</p><button class="btn" onclick="closeModal();openScheduleBlockForm('${b.id}')">Editar</button>`) }
async function doLibrarySearch(q){if(!docs.uniformes){$('#libResults').innerHTML='<div class="card small"><p>Cargando biblioteca normativa...</p></div>'; await loadAllData();} const res=libraryResults(q); $('#libResults').innerHTML=res.length?`<h3>Resultados</h3>${res.slice(0,60).map(r=>`<div class="list-item clickable" onclick="openArticle('${r.doc}','${r.num}')"><span class="tag">${esc(r.docTitle)}</span><h3>${esc(r.title)}</h3><p>${esc(r.snip)}</p>${r.hasImage?'<p class="subtle">🖼️ Incluye imagen del reglamento</p>':''}</div>`).join('')}`:`<div class="card small"><p>No se encontraron resultados. Pruebe con variantes como <b>Ley 101</b>, <b>Ley 348</b>, <b>Uniforme 3A</b> o <b>Artículo 41</b>.</p></div>`}
function uniformCodeAliases(a){const text=[a.titulo,a.texto,a.codigo,a.alias_busqueda,(a.aliases||[]).join(' '),(a.alias_extra||[]).join(' ')].join(' '); const out=[]; [...text.matchAll(/(?:uniforme\s*)?(?:n[º°.]?\s*)?(0?\d)\s*[-–]?\s*([ab])(?:\s*\(?tropical\)?)?/gi)].forEach(m=>{const n=String(Number(m[1])); const l=m[2].toUpperCase(); out.push(`${n}${l}`,`${n}-${l}`,`${n} ${l}`,`0${n}${l}`,`0${n}-${l}`,`0${n} ${l}`,`uniforme ${n}${l}`,`uniforme ${n}-${l}`,`uniforme 0${n}${l}`); if(/tropical/i.test(m[0])||/tropical/i.test(a.titulo||'')) out.push(`${n}${l} tropical`,`${n}-${l} tropical`,`0${n} ${l} tropical`,`uniforme ${n}${l} tropical`,`uniforme ${n}-${l} tropical`);}); return out}
function articleHasImage(a){return !!(a.pagina_inicio||a.imagen_principal||(a.imagenes_bloque||[]).length||(a.imagenes||[]).length)}
function articleHaystack(a){return [a.numero,a.numero_articulo,a.titulo,a.texto,a.codigo,a.variante,a.alias_busqueda,(a.categorias||[]).join(' '),(a.aliases||[]).join(' '),(a.alias_extra||[]).join(' '),...uniformCodeAliases(a)].join(' ')}
function searchScore(a,q,doc){const nq=normalize(q), compact=nq.replace(/\s+/g,''); let score=0; const title=normalize(a.titulo||''), num=normalize(a.numero||''), text=normalize(a.texto||''); const aliases=uniformCodeAliases(a).map(x=>normalize(x)); if(doc==='uniformes' && aliases.some(x=>x.replace(/\s+/g,'')===compact || x===nq)) score+=140; if(title.includes(nq)||title.replace(/\s+/g,'').includes(compact)) score+=100; if(num.includes(nq)) score+=80; if((a.alias_busqueda||'').toString().toLowerCase().includes(q.toLowerCase())) score+=70; if(text.includes(nq)||text.replace(/\s+/g,'').includes(compact)) score+=25; if(articleHasImage(a)) score+=5; if(/tropical/i.test(a.titulo||'')&&!/tropical/i.test(q)) score-=35; return score}
function libraryMatch(hay,q){if(contains(hay,q))return true; const tokens=normalize(q).split(' ').filter(t=>t.length>1); return tokens.length>1&&tokens.every(t=>contains(hay,t))}
function libraryResults(q){const out=[]; if(!q)return out; const push=(doc,docTitle,arr)=>arr?.forEach(a=>{const hay=`${docTitle} ${articleHaystack(a)}`; if(libraryMatch(hay,q)){const score=searchScore(a,q,doc)+(contains(docTitle,q)?18:0); out.push({doc,docTitle,num:a.numero,title:`${a.numero} ${a.titulo||''}`,snip:(a.texto||'').replace(/\s+/g,' ').slice(0,190),hasImage:articleHasImage(a),score})}}); push('uniformes','Reglamento de Uniformes',docs.uniformes?.articulos); push('sumario','Reglamento Sumario',docs.sumario?.articulos||docs.sumario?.contenido?.articulos); docs.norms?.forEach((d,i)=>push('norm'+i,d.metadatos?.titulo||d.titulo||d.nombre||'Norma',d.articulos||d.contenido?.articulos)); return out.sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title))}
function searchGlobal(q){go('biblioteca').then(()=>setTimeout(()=>{const inp=$('#libQuery'); if(inp){inp.value=q; doLibrarySearch(q)}},100))}
async function openDoc(id){if(!docs.catalogo||!docs.norms) await loadAllData(); const key=String(id||'').toLowerCase(); if(key.includes('uniform')) return showUniformIndex(); if(key.includes('sumaria')||key.includes('sumario')) return showDocumentView('sumario'); const meta=normDocMetaById(id); if(meta) return showDocumentView(meta.id); const cat=catalogEntryById(id); if(cat?.pdf) return showDocumentView(cat.id); if(cat?.url){window.open(cat.url,'_blank','noopener'); return} doLibrarySearch('artículo')}
function quickSumario(title){doLibrarySearch(title.replace('Faltas ',''));}

function articleArrayForDoc(docId){if(docId==='sumario')return docs.sumario?.articulos||docs.sumario?.contenido?.articulos||[]; const idx=normIndexById(docId); const d=idx>=0?docs.norms[idx]:null; return d?.articulos||d?.contenido?.articulos||[]}
function titleForDoc(docId){if(docId==='sumario')return 'Reglamento de la Comisión Sumaria ESP–UNIPOL'; const meta=normDocMetaById(docId); const idx=normIndexById(docId); const d=idx>=0?docs.norms[idx]:null; return d?.metadatos?.titulo||d?.titulo||meta?.title||'Documento normativo'}
function pdfForDoc(docId){if(docId==='sumario')return 'assets/reglamento-comision-sumaria-unipol.pdf'; const meta=normDocMetaById(docId); const idx=normIndexById(docId); const d=idx>=0?docs.norms[idx]:null; return meta?.pdf||d?.pdf||d?.fuente_pdf||''}
function docParamForDoc(docId){if(docId==='sumario')return 'sumario'; const idx=normIndexById(docId); return idx>=0?'norm'+idx:''}
function showDocumentView(docId,query=''){const arr=articleArrayForDoc(docId); const title=titleForDoc(docId); const pdf=pdfForDoc(docId); const q=String(query||'').trim(); const filtered=arr.filter(a=>!q||contains(articleHaystack(a),q)).slice(0,140); const docParam=docParamForDoc(docId); $('#libResults').innerHTML=`<div class="card doc-view"><div class="row between wrap"><div><p class="tag">Documento</p><h3>${esc(title)}</h3><p class="subtle">${arr.length} artículo(s) cargados para consulta estructurada.</p></div><div class="row wrap">${pdf?`<a class="btn important link-btn" href="./${esc(pdf)}" target="_blank" rel="noopener">Ver documento original PDF</a>`:''}<button class="btn secondary" onclick="doLibrarySearch($('#libQuery').value||'artículo')">Volver a búsqueda general</button></div></div><div class="row wrap doc-search-row"><input id="docSearchInput" class="grow" value="${esc(q)}" placeholder="Buscar dentro de este documento: artículo, palabra clave..." onkeydown="if(event.key==='Enter') showDocumentView('${esc(docId)}',this.value)"><button class="btn" onclick="showDocumentView('${esc(docId)}',$('#docSearchInput').value)">Buscar en documento</button></div>${!pdf?'<p class="subtle warn-text">PDF original no incorporado para este documento; se muestra el texto estructurado disponible.</p>':''}</div><div class="doc-article-list">${filtered.length?filtered.map(a=>`<div class="list-item clickable" onclick="openArticle('${docParam}','${esc(a.numero)}')"><span class="tag">${esc(title)}</span><h3>${esc(a.numero)} ${esc(a.titulo||'')}</h3><p>${esc((a.texto||'').replace(/\s+/g,' ').slice(0,220))}</p></div>`).join(''):'<div class="card small"><p>No hay coincidencias dentro de este documento.</p></div>'}</div>${arr.length>filtered.length?`<p class="subtle">Mostrando ${filtered.length} de ${arr.length}. Use el buscador interno para ubicar artículos específicos.</p>`:''}`; window.scrollTo({top:0,behavior:'smooth'})}
function showUniformIndex(){const arts=(docs.uniformes?.articulos||[]).filter(a=>/uniforme/i.test(a.titulo||'')); $('#libResults').innerHTML=`<h3>Uniformes del reglamento</h3>${arts.map(a=>`<div class="list-item clickable" onclick="openArticle('uniformes','${a.numero}')"><span class="tag">Reglamento de Uniformes</span><h3>${esc(a.numero)} ${esc(a.titulo||'')}</h3>${articleHasImage(a)?'<p>🖼️ Ver imagen y ficha completa</p>':'<p>Ficha sin imagen asociada pendiente de revisión visual.</p>'}</div>`).join('')}`}
function articleImages(art){const list=[]; (art.imagenes_bloque||[]).forEach(x=>list.push(x)); if(art.imagen_principal) list.push(art.imagen_principal); (art.imagenes||[]).forEach(x=>list.push(x)); (art.imagenes_asociadas||[]).forEach(x=>{ if(typeof x==='string'&&x.match(/\.(png|jpg|jpeg|webp)$/i)) list.push(x) }); return [...new Set(list.filter(Boolean))]}
function articlePageImages(art){const n=Number(art.numero_articulo||String(art.numero||'').match(/\d+/)?.[0]||0); if(n>=36&&n<=52)return [`assets/uniformes/bloques/art-${n}-bloque.jpg`]; return articleImages(art)}
function pdfLinkFor(doc,art){if(doc==='uniformes')return `./assets/reglamento-uniformes-2021.pdf${art.pagina_inicio?'#page='+encodeURIComponent(art.pagina_inicio):''}`; if(doc==='sumario')return './assets/reglamento-comision-sumaria-unipol.pdf'; if(doc.startsWith('norm')){const idx=+doc.replace('norm',''); const d=docs.norms[idx]; const meta=NORM_DOCS[idx]; const pdf=d?.pdf||d?.fuente_pdf||art?.fuente_pdf||meta?.pdf||''; return pdf?`./${pdf}`:''} return ''}
function openArticle(doc,num){let art, title=''; if(doc==='uniformes'){art=docs.uniformes.articulos.find(a=>a.numero===num); title='Reglamento de Uniformes'} else if(doc==='sumario'){const arr=docs.sumario?.articulos||docs.sumario?.contenido?.articulos; art=arr.find(a=>a.numero===num); title='Reglamento Sumario'} else if(doc.startsWith('norm')){const d=docs.norms[+doc.replace('norm','')]; const arr=d.articulos||d.contenido?.articulos; art=arr?.find(a=>a.numero===num); title=d.metadatos?.titulo||d.titulo||'Norma'} if(!art)return; const link=pdfLinkFor(doc,art); const pageList=doc==='uniformes'?articlePageImages(art):[]; const pageImgs=pageList.map(src=>`<figure class=\"pdf-page-figure\"><img src=\"./${src}\" loading=\"lazy\" onclick=\"openImageFull('./${src}')\" onerror=\"this.closest('figure').classList.add('img-error')\"><figcaption>${src.includes('/bloques/')?'Bloque visual completo del artículo':'Página '+esc(src.match(/pagina-(\d+)/)?.[1]||'')}</figcaption></figure>`).join(''); const extraImgs=doc==='uniformes'?articleImages(art).filter(x=>!pageList.includes(x)).map(src=>`<figure class=\"uniform-figure\"><img src=\"./${src}\" loading=\"lazy\" onerror=\"this.closest('figure').classList.add('img-error')\"><figcaption>${esc(src.split('/').pop())}</figcaption></figure>`).join(''):''; showModal(`<button class=\"icon-btn close\" onclick=\"closeModal()\">×</button><p class=\"tag\">${esc(title)}</p><h2>${esc(art.numero)} ${esc(art.titulo||'')}</h2><div class=\"article-actions\">${link?`<a class=\"btn important link-btn\" href=\"${esc(link)}\" target=\"_blank\" rel=\"noopener\">Ver documento original PDF</a>`:''}${doc==='uniformes'?`<button class=\"btn ghost\" onclick=\"auditUniformImages('${esc(art.numero)}')\">Auditar imágenes</button>`:''}</div>${doc==='uniformes'?`<div class=\"card small visual-rule\"><b>Visual literal del artículo</b><p>Se muestra el bloque visual consolidado del artículo, tomado del PDF original: título, descripción y capturas/fotografías asociadas hasta antes del siguiente artículo.</p></div>${pageImgs?`<div class=\"pdf-page-stack\">${pageImgs}</div>`:'<div class=\"card small warn-card\"><p>No hay captura de página disponible. Use Ver documento original PDF.</p></div>'}${extraImgs?`<details class=\"card\"><summary><b>Imágenes recortadas complementarias</b></summary><div class=\"uniform-imgs\">${extraImgs}</div></details>`:''}`:''}<div class=\"article-text\">${formatArticleText(art.texto||'')}</div>${art.pagina_inicio?`<p class=\"subtle\">Página original: ${art.pagina_inicio}${art.pagina_fin&&art.pagina_fin!==art.pagina_inicio?' a '+art.pagina_fin:''}</p>`:''}${doc!=='uniformes'&&link?`<p><a class=\"btn important\" href=\"${esc(link)}\" target=\"_blank\" rel=\"noopener\">Ver documento original PDF</a></p>`:''}`)}
function openImageFull(src){showModal(`<button class=\"icon-btn close\" onclick=\"closeModal()\">×</button><img src=\"${esc(src)}\" class=\"image-preview full-page-preview\"><p class=\"subtle\">Toque cerrar para volver.</p>`)}
function formatArticleText(text){if(!text)return '<p class="subtle">Texto no disponible. Use Ver documento original PDF.</p>'; const raw=String(text).replace(/\r/g,'').trim(); const parts=raw.split(/(?=^\s*(?:\d{1,2}|[a-z])\.\s+)/gmi).map(x=>x.trim()).filter(Boolean); if(parts.length>1&&parts.length<80){return `<div class="num-list">${parts.map(p=>{const m=p.match(/^\s*([\da-z]+)\.\s*([\s\S]*)$/i); return m?`<div class="num-entry"><strong>${esc(m[1])}</strong><span>${esc(m[2])}</span></div>`:`<pre class="article-pre">${esc(p)}</pre>`}).join('')}</div><details class="card small"><summary><b>Ver texto completo sin cortes</b></summary><pre class="article-pre">${esc(raw)}</pre></details>`} return `<pre class="article-pre">${esc(raw)}</pre>`}
function openKardex(){showModal(`<h2>Ficha Kardex</h2><p class="subtle">Datos voluntarios. No se cargan datos reales por defecto.</p><textarea id="kardexText" style="width:100%;min-height:140px" placeholder="Pegar texto de identificación..."></textarea><button class="btn secondary" onclick="parseKardex()">Interpretar texto</button><form id="kardexForm">${buildForm(['numeroLista','grado','nombre','ci','expedido','escalafon','celular','fechaNacimiento','edad','tipoSangre','numAsegurado','numEmpleador','domicilio','correo'].map(n=>({name:n,label:n.replace(/[A-Z]/g,m=>' '+m).replace(/^./,c=>c.toUpperCase())})),state.kardex.fields)}<div class="form-actions"><button class="btn" type="submit">Guardar</button><button class="btn secondary" type="button" onclick="closeModal()">Cancelar</button></div></form>`); $('#kardexText').value=state.kardex.sourceText||''; $('#kardexForm').onsubmit=async e=>{e.preventDefault(); state.kardex.fields=formData(e.target); state.kardex.sourceText=$('#kardexText').value; await save(); closeModal(); toast('Kardex guardado')}}
function parseKardex(){const t=$('#kardexText').value; const map={numeroLista:/n[uú]mero de lista\s*([\w-]+)/i,nombre:/nombre\s+(.+)/i,grado:/(CAP\.|SGTO\.|SOF\.|TCNL\.|CNL\.)/i,ci:/c\.?i\.?\s*([^\n]+)/i,escalafon:/esc\.?\s*([^\n]+)/i,celular:/cel\.?\s*([^\n]+)/i,fechaNacimiento:/nac\.?\s*([^\n]+)/i,tipoSangre:/tipo de sangre\s*([^\n]+)/i,numAsegurado:/asegurado\s*([^\n]+)/i,numEmpleador:/empleador\s*([^\n]+)/i,domicilio:/domicilio\s*([^\n]+)/i,correo:/correo\s*([^\n]+)/i,edad:/edad\.?\s*([^\n]+)/i}; Object.entries(map).forEach(([k,r])=>{const m=t.match(r); if(m){const el=$(`[name="${k}"]`); if(el)el.value=(m[1]||m[0]).trim()}})}
function showUpdateBanner(){const b=$('#updateBanner'); if(b)b.classList.remove('hidden')}
function rememberLocalBackup(){try{localStorage.setItem('agenda-policial-last-backup',JSON.stringify({version:APP_VERSION,date:new Date().toISOString(),state}))}catch(e){console.warn(e)}}
function installMode(){return window.matchMedia('(display-mode: standalone)').matches||navigator.standalone?'PWA instalada':'Navegador'}
async function cacheNames(){return 'caches' in window ? await caches.keys() : []}
async function applyUpdate(){toast('Aplicando actualización...'); rememberLocalBackup(); try{const reg=await navigator.serviceWorker?.getRegistration?.(); if(reg){await reg.update().catch(()=>{}); if(reg.waiting){reg.waiting.postMessage({type:'SKIP_WAITING'}); return}} await cleanAppCaches(false); location.replace('./index.html?v='+APP_VERSION+'&r='+Date.now())}catch(e){console.warn(e); location.replace('./index.html?v='+APP_VERSION+'&r='+Date.now())}}
async function checkUpdate(){toast('Buscando actualización...'); rememberLocalBackup(); state.settings.lastUpdateCheck=new Date().toISOString(); await save(); if('serviceWorker' in navigator) navigator.serviceWorker.getRegistration().then(r=>r&&r.update()).catch(()=>{}); fetch('./version.json?ts='+Date.now(),{cache:'no-store'}).then(r=>r.json()).then(v=>{if(v.version&&v.version!==APP_VERSION){showUpdateBanner(); toast('Nueva versión disponible: '+v.version)} else toast('La versión publicada coincide: '+APP_VERSION)}).catch(()=>toast('No se pudo comprobar. Revise conexión o GitHub Pages.'))}
async function cleanAppCaches(show=true){if(!('caches' in window)){if(show)toast('Este navegador no expone caché'); return} const keys=await caches.keys(); await Promise.all(keys.filter(k=>k.startsWith('agenda-policial')).map(k=>caches.delete(k))); if(show)toast('Caché limpiado sin borrar sus datos')}
async function forceCleanUpdate(){if(!confirm('Se limpiará caché de la app sin borrar sus datos. Luego se recargará desde GitHub. ¿Continuar?'))return; rememberLocalBackup(); state.settings.lastCleanUpdate=new Date().toISOString(); await save(); await cleanAppCaches(false); const regs=await navigator.serviceWorker?.getRegistrations?.()||[]; await Promise.all(regs.filter(r=>String(r.scope).includes(location.pathname.split('/').filter(Boolean)[0])||String(r.scope).includes('Poli.Agenda_pro')).map(r=>r.update().catch(()=>{}))); location.replace('./index.html?clean=1&v='+APP_VERSION+'&r='+Date.now())}
async function openDiagnostics(){const keys=await cacheNames(); const reg=await navigator.serviceWorker?.getRegistration?.(); const rows=[['Versión visible',APP_VERSION],['Compilación',BUILD_DATE],['URL',location.href],['Modo',state.mode||'sin modo'],['Instalación',installMode()],['Activación',state.activated?'activa':'no activa'],['Service Worker',reg?(reg.active?'activo':reg.waiting?'esperando':'registrado'):'no registrado'],['Cachés',keys.join(', ')||'sin caché'],['Registros locales',`${state.formations.length} formaciones · ${state.tasks.length} tareas · ${state.notes.length} notas · ${state.scheduleBlocks.length} bloques horario`],['Última revisión',state.settings.lastUpdateCheck||'sin revisión']]; showModal(`<button class="icon-btn close" onclick="closeModal()">×</button><h2>Estado técnico</h2><div class="diagnostic-table">${rows.map(r=>`<div><b>${esc(r[0])}</b><span>${esc(r[1])}</span></div>`).join('')}</div><div class="row wrap"><button class="btn important" onclick="forceCleanUpdate()">Forzar actualización limpia</button><button class="btn secondary" onclick="cleanAppCaches()">Limpiar caché</button><button class="btn ghost" onclick="exportBackup()">Exportar respaldo</button></div>`)}
async function auditUniformImages(articleNum=''){if(!docs.uniformes) await loadAllData(); const arts=(docs.uniformes?.articulos||[]).filter(a=>!articleNum||a.numero===articleNum); const items=[]; for(const a of arts){for(const src of articleImages(a)){items.push({article:a.numero,title:a.titulo||'',src})}} if(!items.length){toast('No hay imágenes declaradas para auditar'); return} showModal(`<button class="icon-btn close" onclick="closeModal()">×</button><h2>Auditoría de imágenes</h2><p class="subtle">Verificando rutas locales de uniformes...</p><div id="auditImageResults" class="audit-list"><p>Procesando ${items.length} imagen(es)...</p></div>`); const results=[]; for(const it of items){let ok=false; try{const r=await fetch('./'+it.src,{cache:'no-store'}); ok=r.ok}catch(e){ok=false} results.push({...it,ok})} const bad=results.filter(x=>!x.ok); const el=$('#auditImageResults'); if(el) el.innerHTML=`<div class="status-grid"><div><b>Total</b><span>${results.length}</span></div><div><b>Correctas</b><span>${results.length-bad.length}</span></div><div><b>Faltantes</b><span>${bad.length}</span></div></div>${results.map(r=>`<div class="audit-row ${r.ok?'ok':'bad'}"><b>${esc(r.article)}</b><span>${r.ok?'✓':'⚠'} ${esc(r.src)}</span></div>`).join('')}`; toast(bad.length?`Hay ${bad.length} imagen(es) con problema`:'Imágenes verificadas correctamente')}
function exportBackup(){if(!confirm('Se generará una copia de respaldo JSON con sus datos locales. ¿Guardar respaldo?'))return; const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='agenda-policial-respaldo.json'; a.click(); state.settings.lastBackup=new Date().toISOString(); save(); toast('Respaldo generado')}
function importBackup(){const input=$('#backupImport'); input.onchange=e=>{const f=e.target.files[0]; if(!f)return; const rd=new FileReader(); rd.onload=async()=>{try{const data=JSON.parse(rd.result); const valid=data&&typeof data==='object'&&!Array.isArray(data)&&['formations','tasks','notes','scheduleBlocks'].every(k=>data[k]===undefined||Array.isArray(data[k])); if(!valid)throw new Error('Estructura inválida'); if(confirm('¿Reemplazar datos actuales por el respaldo?')){state={...structuredClone(DEFAULT_STATE),...data,archive:{...DEFAULT_STATE.archive,...(data.archive||{})},drafts:{...DEFAULT_STATE.drafts,...(data.drafts||{})},settings:{...DEFAULT_STATE.settings,...(data.settings||{})},teacherProfiles:{...(data.teacherProfiles||{})}}; await save(); closeModal(); render(); toast('Respaldo validado e importado')}}catch(error){console.warn(error);toast('Archivo de respaldo inválido o incompatible')}}; rd.readAsText(f)}; input.click()}
window.addEventListener('DOMContentLoaded',init);


/* =========================================================
   Agenda Policial v2.6.8 — estabilización de horario y agenda
   ========================================================= */
const SCHEDULE_DATA_VERSION='2026-07-28-05';
const DATABASE_DATA_VERSION='agenda-db-2';

const SUBJECT_VISUALS={
  'planificacion estrategica':{accent:'#4f6f8f',soft:'#edf3f8'},
  'procedimientos especiales':{accent:'#357d98',soft:'#eaf5f8'},
  'auditoria gubernamental':{accent:'#70815a',soft:'#f1f5ed'},
  'inteligencia estrategica':{accent:'#74658b',soft:'#f3f0f7'},
  'ciencia politica':{accent:'#4e7a75',soft:'#edf5f3'},
  'administracion general':{accent:'#3d7894',soft:'#edf5f8'},
  'metodologia de investigacion':{accent:'#687078',soft:'#f1f3f4'},
  'acondicionamiento fisico':{accent:'#94694e',soft:'#f9f0eb'},
  'tiro policial':{accent:'#8a7048',soft:'#f7f2e8'},
  'hora mistica':{accent:'#9a7a2f',soft:'#faf5e8'},
  'organizacion y control':{accent:'#476b55',soft:'#eef5f0'},
  'descanso 25 minutos':{accent:'#8a8d8b',soft:'#f4f5f4'},
  'descanso 10 minutos':{accent:'#8a8d8b',soft:'#f4f5f4'}
};
const SUBJECT_VISUAL_FALLBACKS=[
  {accent:'#54706c',soft:'#eef4f3'},
  {accent:'#63728a',soft:'#f0f2f6'},
  {accent:'#7b6b57',soft:'#f5f1ec'},
  {accent:'#6c7756',soft:'#f2f4ed'},
  {accent:'#765f75',soft:'#f5f0f4'}
];
function subjectVisual(subject=''){
  const key=normalize(subject||'sin materia');
  if(SUBJECT_VISUALS[key])return SUBJECT_VISUALS[key];
  let hash=0;for(const ch of key)hash=(hash*31+ch.charCodeAt(0))>>>0;
  return SUBJECT_VISUAL_FALLBACKS[hash%SUBJECT_VISUAL_FALLBACKS.length];
}
function subjectStyleAttr(subject=''){const v=subjectVisual(subject);return `style="--subject-accent:${v.accent};--subject-soft:${v.soft}"`}
function teacherForSubject(subject=''){
  const key=normalize(subject);const row=(state.scheduleBlocks||[]).find(b=>normalize(b.materia||'')===key&&(b.docente||b.instructor)&&!/pendiente|no consignado/i.test(b.docente||b.instructor||''));
  return row?.docente||row?.instructor||'';
}
function isCapitanesASelected(){return String(state.selectedScheduleId||'capitanes-a-2026-2')==='capitanes-a-2026-2'}
function isNonLectiveBlock(b){
  if(!b)return false;
  if(b.es_no_lectiva===true||b.no_lectiva===true)return true;
  const text=normalize(`${b.tipo||''} ${b.estado||''} ${b.observacion||''}`);
  if(text.includes('no lectiva')||text.includes('no se pasan clases'))return true;
  return isCapitanesASelected()&&b.inicio==='11:50'&&b.fin==='12:35'&&['lunes','martes','miercoles','jueves','viernes'].includes(normalize(b.dia));
}
function canonicalScheduleEntry(entry){
  const e={...entry};const day=normalize(e.dia||'');
  if(isCapitanesASelected()&&e.inicio==='06:45'&&e.fin==='07:15'){
    if(day==='lunes'){e.materia='Hora mística';e.tipo='formacion'}
    else if(['martes','miercoles','jueves','viernes'].includes(day)){e.materia='Organización y control';e.tipo='formacion'}
  }
  if(isCapitanesASelected()&&e.inicio==='11:50'&&e.fin==='12:35'&&['lunes','martes','miercoles','jueves','viernes'].includes(day)){
    e.tipo='no_lectiva';e.estado='no_lectiva';e.es_no_lectiva=true;e.observacion='HORARIO NO LECTIVO · NO SE PASAN CLASES';
  }
  return e;
}
function normalizeScheduleEntry(e){return canonicalScheduleEntry({...e,id:e.id||uid(),dia:normDayWord(e.dia)||normalize(e.dia||'lunes'),inicio:e.inicio||'',fin:e.fin||'',materia:e.materia||e.actividad||'',docente:e.docente||e.instructor||'',tipo:e.tipo||'clase',lugar:e.lugar||'',uniforme:e.uniforme||'',observacion:e.observacion||''})}
function getTodayBlocks(){return getBlocksForDay(currentDayKey())}
function getBlocksForDay(day){return (state.scheduleBlocks||[]).filter(b=>normalize(b.dia)===day).map(canonicalScheduleEntry).sort((a,b)=>minutes(a.inicio)-minutes(b.inicio))}
function scheduleHasOfficialSignature(){
  const blocks=(state.scheduleBlocks||[]).map(canonicalScheduleEntry);
  const has=(day,start,end,subject)=>blocks.some(b=>normalize(b.dia)===normalize(day)&&b.inicio===start&&b.fin===end&&normalize(b.materia||'')===normalize(subject));
  const nonLective=blocks.filter(isNonLectiveBlock).length;
  return blocks.length===53&&has('lunes','06:45','07:15','Hora mística')&&has('martes','06:45','07:15','Organización y control')&&has('viernes','06:45','07:15','Organización y control')&&nonLective===5&&has('lunes','14:00','16:00','Acondicionamiento físico')&&has('jueves','14:00','16:00','Tiro policial');
}
function ensureScheduleTemplate(){
  let changed=false;const active=activeScheduleCatalog();if(!active.length)return false;
  state.settings=state.settings||{};
  if(!state.selectedScheduleId||!scheduleTemplateById(state.selectedScheduleId)){state.selectedScheduleId=active[0].id;changed=true}
  const template=currentScheduleTemplate();const expected=template?.metadatos?.template_version||docs.horario?.catalog_version||SCHEDULE_DATA_VERSION;
  const installed=state.settings.scheduleVersion||state.scheduleTemplateVersion||'';
  const mustRefresh=isPlaceholderSchedule()||isLegacyIncorrectSchedule()||!scheduleHasOfficialSignature()||state.scheduleSource!=='catalog'||installed!==expected||state.scheduleMeta?.catalog_id!==template?.id;
  if(mustRefresh){changed=applyCatalogSchedule(template,Boolean(state.scheduleBlocks?.length),'Migración selectiva del horario oficial v2.6.8')||changed}
  else if(template){state.scheduleBlocks=(state.scheduleBlocks||[]).map(normalizeScheduleEntry);state.scheduleMeta=scheduleTemplateMeta(template);state.scheduleTemplateVersion=expected}
  if(state.settings.appVersion!==APP_VERSION){state.settings.appVersion=APP_VERSION;changed=true}
  if(state.settings.scheduleVersion!==expected){state.settings.scheduleVersion=expected;changed=true}
  if(state.settings.databaseVersion!==DATABASE_DATA_VERSION){state.settings.databaseVersion=DATABASE_DATA_VERSION;changed=true}
  if(state.settings.scheduleMigration!=='2026-07-28-v268'){state.settings.scheduleMigration='2026-07-28-v268';changed=true}
  return changed;
}
function classifyBlock(b,iso=todayISO()){
  if(isNonLectiveBlock(b))return 'non-lective';
  const now=new Date();const isToday=iso===todayISO();const m=now.getHours()*60+now.getMinutes(),a=minutes(b.inicio),z=minutes(b.fin);
  if(a==null||z==null)return '';
  if(isToday&&m>=a&&m<z)return 'current';if(isToday&&m>=z)return 'finished';return 'next';
}
function upcomingScheduleItems(limit=6){
  const out=[];
  for(let add=0;add<7&&out.length<limit*2;add++){
    const iso=addDaysISO(todayISO(),add);const day=weekdayISO(iso);
    getBlocksForDay(day).forEach(b=>{if(isNonLectiveBlock(b))return;const cls=classifyBlock(b,iso);if(cls!=='finished')out.push({kind:'schedule',date:iso,time:b.inicio,block:b,sort:eventDateTime({date:iso,time:b.inicio})})});
  }
  return out.sort((a,b)=>a.sort-b.sort).slice(0,limit);
}
function currentAgendaItem(){
  const now=new Date(),iso=todayISO();
  const curSchedule=getBlocksForDay(currentDayKey()).find(b=>!isNonLectiveBlock(b)&&classifyBlock(b,iso)==='current');
  if(curSchedule)return {kind:'schedule',date:iso,time:curSchedule.inicio,block:curSchedule,sort:eventDateTime({date:iso,time:curSchedule.inicio})};
  const curForm=state.formations.filter(f=>f.status!=='archived'&&f.date===iso).find(f=>{const t=f.formacion||f.arribo||f.parte;if(!t)return false;const start=eventDateTime({date:f.date,time:t}),end=new Date(start.getTime()+60*60000);return now>=start&&now<=end});
  if(curForm)return {kind:'formation',date:iso,time:curForm.formacion||curForm.arribo||curForm.parte,formation:curForm,sort:eventDateTime({date:iso,time:curForm.formacion||curForm.arribo||curForm.parte})};return null;
}
function agendaFullDate(iso){const [y,m,d]=String(iso).split('-').map(Number);return new Intl.DateTimeFormat('es-BO',{weekday:'long',day:'numeric',month:'long'}).format(new Date(y,m-1,d))}
function agendaDayTitle(iso){const diff=Math.round((new Date(`${iso}T00:00:00`)-new Date(`${todayISO()}T00:00:00`))/86400000);const full=agendaFullDate(iso);if(diff===0)return `HOY — ${full}`;if(diff===1)return `MAÑANA — ${full}`;return full.toUpperCase()}
function renderAgendaTimeline(items){
  const groups=new Map();items.forEach(it=>{if(!groups.has(it.date))groups.set(it.date,[]);groups.get(it.date).push(it)});
  return [...groups.entries()].map(([date,rows],index)=>`<section class="agenda-day-group tone-${index%2}" data-agenda-date="${esc(date)}"><header class="agenda-day-header">${esc(agendaDayTitle(date))}</header><div class="agenda-day-items">${rows.map(agendaMiniCard).join('')}</div></section>`).join('');
}
function agendaMiniCard(item){
  if(item.kind==='formation')return `<div class="agenda-mini formation" onclick="openFormation('${item.formation.id}')"><span>Formación</span><b>${esc(item.formation.title||item.formation.type||'Formación / servicio')}</b><small>${esc(item.time||'')} ${item.formation.uniforme?'· '+esc(item.formation.uniforme):''}</small></div>`;
  if(item.kind==='task'){const style=subjectStyleAttr(item.task.subject||'');return `<div class="agenda-mini task subject-coded" ${style} onclick="openTask('${item.task.id}')"><span>Tarea</span><b>${esc(item.task.title||'Tarea académica')}</b><small>${esc(item.task.subject||'Sin materia')} · ${esc(item.time==='23:59'?'':item.time)}</small></div>`}
  const b=canonicalScheduleEntry(item.block);const style=subjectStyleAttr(b.materia||'');return `<div class="agenda-mini class subject-coded" ${style} onclick="openClassDetail('${b.id}')"><span>${/hora mística|organización y control/i.test(b.materia||'')?'Actividad institucional':'Clase'}</span><b>${esc(b.materia||'Actividad')}</b><small>${esc(b.inicio)}-${esc(b.fin)} ${b.docente?'· '+esc(b.docente)+' '+teacherIndicator(b.docente):''}</small></div>`;
}
function classCard(title,b,kind,iso=todayISO()){
  b=canonicalScheduleEntry(b);if(isNonLectiveBlock(b))return '';
  const isFormation=/(hora mística|hora mistica|organización y control|organizacion y control|parte de diana|parte de asamblea)/i.test(b.materia||'');const cd=kind==='current'?intervalCountdown(iso,b.inicio,b.fin):countdown(iso,b.inicio);const style=subjectStyleAttr(b.materia||'');
  return `<div class="card dashboard-card subject-coded ${kind==='next'?'priority':''} ${isFormation?'formation-highlight':''} clickable" ${style} onclick="openClassDetail('${b.id}')"><div class="row between"><span class="tag ${isFormation?'warn':''}">${esc(title)}</span>${kind==='next'||kind==='current'?`<span class="countdown-pill">${esc(cd)}</span>`:''}</div><h3>${esc(b.materia||b.actividad||'Actividad')}</h3><p><b>${fmtDate(iso)} · ${b.inicio||''} - ${b.fin||''}</b> ${b.docente?' · '+esc(b.docente):''} ${teacherIndicator(b.docente)}</p>${b.lugar?`<p>📍 ${esc(b.lugar)}</p>`:''}</div>`;
}
function renderInicio(){
  const agendaAll=upcomingAgenda(18).filter(it=>it.kind!=='schedule'||!isNonLectiveBlock(it.block));const current=currentAgendaItem();const next=agendaAll.find(x=>itemKey(x)!==itemKey(current));const skip=new Set([itemKey(current),itemKey(next)]);const chron=agendaAll.filter(x=>!skip.has(itemKey(x))).slice(0,12);
  const urgentTasks=state.tasks.filter(t=>t.status!=='done'&&t.status!=='archived'&&t.dueDate&&t.dueDate<=addDaysISO(todayISO(),1)).sort((a,b)=>(a.dueDate+(a.dueTime||'99:99')).localeCompare(b.dueDate+(b.dueTime||'99:99'))).slice(0,4);
  const alerts=urgentTasks.length?`<div class="home-alerts"><div class="row between"><h2 class="section-title">Alertas académicas</h2><button class="option-btn" onclick="go('tareas')">Ver tareas</button></div>${urgentTasks.map(t=>`<div class="alert-task subject-coded clickable" ${subjectStyleAttr(t.subject||'')} onclick="openTask('${t.id}')"><span class="alert-dot"></span><div><b>${esc(t.title||'Tarea académica')}</b><small>${esc(t.subject||'Sin materia')} · ${t.dueDate===todayISO()?'Hoy':t.dueDate===addDaysISO(todayISO(),1)?'Mañana':fmtDate(t.dueDate)} ${esc(t.dueTime||'')}</small></div></div>`).join('')}</div>`:'';
  return `<section><div class="home-hero"><div><span class="eyebrow">Panel de inicio</span><h2>Agenda próxima</h2><p>Actividades reales, formaciones, servicios y tareas organizadas por fecha.</p></div></div>${current?mainAgendaCard('Actividad actual',current,'current'):''}${next?mainAgendaCard('Próxima actividad',next,'next'):''}${alerts}<div class="row between"><h2 class="section-title">Cronología</h2><button class="option-btn" onclick="go('horario')">Horario</button></div>${chron.length?`<div class="agenda-timeline-grouped">${renderAgendaTimeline(chron)}</div>`:`<div class="card small"><p>No hay actividades próximas registradas.</p></div>`}</section>`;
}
function dailyBlockCard(b){
  b=canonicalScheduleEntry(b);const non=isNonLectiveBlock(b);const cls=non?'non-lective':/descanso/i.test(b.materia||'')?'break':/(hora mística|hora mistica|organización y control|organizacion y control|parte)/i.test(b.materia||'')?'formation':'class';const style=subjectStyleAttr(b.materia||'');
  if(non)return `<div class="daily-block non-lective clickable" ${style} onclick="openScheduleBlockForm('${b.id}')"><div class="time-badge">${esc(b.inicio)}<span>${esc(b.fin)}</span></div><div><span class="non-lective-label">HORARIO NO LECTIVO</span><b class="non-lective-subject">${esc(b.materia||'Bloque figurativo')}</b><p>NO SE PASAN CLASES</p><small>Este bloque no genera alertas ni próxima actividad.</small></div></div>`;
  return `<div class="daily-block ${cls} subject-coded clickable" ${style} onclick="openScheduleBlockForm('${b.id}')"><div class="time-badge">${esc(b.inicio)}<span>${esc(b.fin)}</span></div><div><b>${esc(b.materia||'Actividad')}</b><p>${esc(b.docente||b.instructor||(/descanso/i.test(b.materia||'')?'':'Docente / instructor pendiente'))} ${teacherIndicator(b.docente||b.instructor)}</p>${b.observacion?`<small>${esc(b.observacion)}</small>`:''}</div></div>`;
}
function scheduleTableRow(r){
  const cells=scheduleDays().map(day=>{let b=findScheduleCell(day,r.inicio,r.fin);if(b)b=canonicalScheduleEntry(b);const non=b&&isNonLectiveBlock(b),isBreak=b&&/descanso/i.test(b.materia||''),isSpecial=b&&/(parte|hora mística|hora mistica|organización y control|organizacion y control)/i.test(b.materia||'');const cls=non?'non-lective':isBreak?'break':isSpecial?'special':b?'filled':'empty';const style=b?subjectStyleAttr(b.materia||''):'';
    return `<td class="schedule-cell ${cls}" ${style} onclick="openScheduleCell('${day}','${r.inicio}','${r.fin}')">${b?(non?`<div class="non-lective-label">NO LECTIVO</div><div class="cell-subject non-lective-subject">${esc(b.materia||'')}</div><div class="cell-teacher">NO SE PASAN CLASES</div>`:`<div class="cell-subject">${esc(b.materia||'')}</div><div class="cell-teacher">${esc(b.docente||b.instructor||(/descanso/i.test(b.materia||'')?'': 'Docente / instructor pendiente'))}</div>`):`<div class="cell-empty">Toque para llenar</div><div class="cell-teacher">Docente / instructor</div>`}</td>`}).join('');
  return `<tr><th class="time-col">${esc(r.inicio)}<br><span>${esc(r.fin)}</span></th>${cells}</tr>`;
}
function openClassDetail(id){
  let b=(state.scheduleBlocks||[]).find(x=>x.id===id);if(!b)return;b=canonicalScheduleEntry(b);const non=isNonLectiveBlock(b);
  showModal(`<h2>${esc(b.materia||'Actividad')}</h2><p><b>${esc(b.dia)}</b> · ${esc(b.inicio)} - ${esc(b.fin)}</p>${non?`<div class="non-lective-detail"><b>HORARIO NO LECTIVO</b><span>NO SE PASAN CLASES</span><p>Este bloque es únicamente figurativo y no participa en alertas, cronología ni próxima actividad.</p></div>`:`<p><b>Docente:</b> ${esc(b.docente||'')}</p><p><b>Lugar:</b> ${esc(b.lugar||'')}</p><p>${esc(b.observacion||'')}</p>`}<button class="btn" onclick="closeModal();openScheduleBlockForm('${b.id}')">Editar</button>`);
}
function openScheduleBlockForm(id=null,day=null){
  const existing=id?state.scheduleBlocks.find(x=>x.id===id):null;const b=existing?canonicalScheduleEntry(existing):{dia:day||currentDayKey(),inicio:'07:30',fin:'08:10',tipo:'clase',docente:''};
  showModal(`<h2>${id?'Editar':'Nuevo'} bloque</h2><form id="blockForm">${buildForm([{name:'dia',label:'Día',type:'select',options:['lunes','martes','miercoles','jueves','viernes','sabado','domingo']},{name:'inicio',label:'Inicio',type:'time'},{name:'fin',label:'Fin',type:'time'},{name:'tipo',label:'Tipo',type:'select',options:['clase','formacion','descanso','actividad','no_lectiva']},{name:'materia',label:'Materia / actividad'},{name:'docente',label:'Docente / instructor'},{name:'lugar',label:'Aula / lugar'},{name:'observacion',label:'Observación',type:'textarea'}],b)}<div class="form-actions"><button class="btn" type="submit">Guardar</button>${id?`<button class="btn danger" type="button" onclick="deleteBlock('${id}')">Eliminar</button>`:''}<button class="btn secondary" type="button" onclick="closeModal()">Cancelar</button></div></form>`);
  $('#blockForm').onsubmit=async e=>{e.preventDefault();let data=formData(e.target);data.es_no_lectiva=data.tipo==='no_lectiva';if(data.es_no_lectiva&&!/no lectiva/i.test(data.observacion||''))data.observacion='HORARIO NO LECTIVO · NO SE PASAN CLASES';if(id)Object.assign(existing,data);else state.scheduleBlocks.push({...data,id:uid()});await save();closeModal();render()};
}


/* v2.6.8 — la tabla digital corregida es la fuente operativa oficial. */
openReferenceScheduleImage=function(){
  const template=currentScheduleTemplate();
  const src=(state.scheduleMeta?.fuente_visual||template?.fuente_visual||docs.horario?.fuente_visual||'assets/horario-segundo-semestre-2026.png');
  showModal(`<h2>Imagen de referencia del horario</h2>
    <div class="schedule-reference-notice"><b>Tabla digital corregida</b><span>La aplicación aplica Hora mística únicamente el lunes, Organización y control de martes a viernes y excluye los bloques no lectivos de la actividad real. Si la imagen histórica difiere, prevalece la tabla digital de esta versión.</span></div>
    <img class="image-preview schedule-reference-image" src="./${esc(src)}" alt="Imagen de referencia del horario">
    <div class="row wrap"><button class="btn" onclick="restoreBaseSchedule()">Restaurar horario oficial</button><button class="btn secondary" onclick="closeModal()">Cerrar</button></div>`);
};

/* v2.6.8 — archivo de notas funcional; elimina un botón sin acción heredado. */
function showArchivedNotes(){
  const notes=state.notes.filter(n=>n.archived);
  $('#app').innerHTML=appShell(`<section><div class="row between wrap"><h2 class="section-title">Notas archivadas</h2><button class="btn secondary" onclick="openNotes()">Volver</button></div><div class="tabs"><button onclick="openNotes()">Todo</button><button class="active">Archivadas</button></div><div class="note-grid">${notes.map(n=>`<div class="note-card"><h3>${esc(n.title||'Sin título')}</h3><p>${esc((n.text||'').slice(0,130))}${(n.text||'').length>130?'...':''}</p><div class="muted">${new Date(n.updated||n.created).toLocaleString('es-BO')}</div><div class="row wrap"><button class="btn secondary" onclick="restoreNote('${n.id}')">Restaurar</button><button class="btn ghost" onclick="openNoteForm('${n.id}')">Ver / editar</button></div></div>`).join('')||'<div class="card small"><p>No hay notas archivadas.</p></div>'}</div></section>`);
}
async function archiveNote(id){const n=state.notes.find(x=>x.id===id);if(!n)return;n.archived=true;n.updated=new Date().toISOString();await save();closeModal();openNotes();toast('Nota archivada')}
async function restoreNote(id){const n=state.notes.find(x=>x.id===id);if(!n)return;n.archived=false;n.updated=new Date().toISOString();await save();showArchivedNotes();toast('Nota restaurada')}
openNoteForm=function(id=null){
  const n=id?state.notes.find(x=>x.id===id):{title:'',text:'',category:''};
  if(!n)return toast('Nota no encontrada');
  showModal(`<button class="icon-btn close" onclick="closeModal()">×</button><h2>${id?'Editar':'Nueva'} nota</h2><p class="subtle">Bloc de notas policial. Escriba libremente; se puede editar después.</p><form id="noteForm" class="note-editor-form">${buildForm([{name:'title',label:'Título'},{name:'category',label:'Carpeta / categoría'},{name:'text',label:'Texto',type:'textarea'}],n)}<div class="form-actions note-actions"><button class="btn" type="submit">Guardar</button>${id&&!n.archived?`<button class="btn secondary" type="button" onclick="archiveNote('${id}')">Archivar</button>`:''}${id&&n.archived?`<button class="btn secondary" type="button" onclick="restoreNote('${id}');closeModal()">Restaurar</button>`:''}<button class="btn ghost" type="button" onclick="closeModal()">Cancelar</button></div></form>`);
  const textArea=$('#noteForm textarea[name="text"]');if(textArea)textArea.classList.add('note-textarea');
  $('#noteForm').onsubmit=async e=>{e.preventDefault();const data=formData(e.target);if(id)Object.assign(n,data,{updated:new Date().toISOString()});else state.notes.push({...data,id:uid(),created:new Date().toISOString(),updated:new Date().toISOString(),archived:false});await save();closeModal();openNotes();toast('Nota guardada')};
};


/* =========================================================
   Agenda Policial v2.6.9 — horario lectivo exacto
   Solo anula las celdas que la fuente marca HORA NO LECTIVA.
   ========================================================= */
function isOfficialNonLectiveSlotV269(b){
  if(!b||String(state.selectedScheduleId||'capitanes-a-2026-2')!=='capitanes-a-2026-2')return false;
  const day=normalize(b.dia||'');
  return b.inicio==='11:50'&&b.fin==='12:35'&&['lunes','martes','jueves','viernes'].includes(day);
}
function isOfficialWednesdayLectiveSlotV269(b){
  if(!b||String(state.selectedScheduleId||'capitanes-a-2026-2')!=='capitanes-a-2026-2')return false;
  return normalize(b.dia||'')==='miercoles'&&b.inicio==='11:50'&&b.fin==='12:35';
}
isNonLectiveBlock=function isNonLectiveBlockV269(b){
  if(!b)return false;
  if(isOfficialWednesdayLectiveSlotV269(b))return false;
  if(isOfficialNonLectiveSlotV269(b))return true;
  if(b.es_no_lectiva===true||b.no_lectiva===true)return true;
  const text=normalize(`${b.tipo||''} ${b.estado||''} ${b.observacion||''}`);
  return text.includes('no lectiva')||text.includes('no se pasan clases');
};
canonicalScheduleEntry=function canonicalScheduleEntryV269(entry){
  const e={...entry},day=normalize(e.dia||''),isCapA=String(state.selectedScheduleId||'capitanes-a-2026-2')==='capitanes-a-2026-2';
  if(isCapA&&e.inicio==='06:45'&&e.fin==='07:15'){
    if(day==='lunes'){e.materia='Hora mística';e.tipo='formacion';e.observacion='Actividad institucional'}
    else if(['martes','miercoles','jueves','viernes'].includes(day)){e.materia='Organización y control';e.tipo='formacion';e.observacion='Actividad institucional'}
    delete e.estado;delete e.es_no_lectiva;delete e.no_lectiva;
  }else if(isCapA&&isOfficialNonLectiveSlotV269(e)){
    e.tipo='no_lectiva';e.estado='no_lectiva';e.es_no_lectiva=true;e.observacion='HORARIO NO LECTIVO · NO SE PASAN CLASES';
  }else if(isCapA&&isOfficialWednesdayLectiveSlotV269(e)){
    e.tipo='clase';delete e.estado;delete e.es_no_lectiva;delete e.no_lectiva;
    e.observacion=`${e.codigo?e.codigo+' · ':''}HORA LECTIVA`;
  }else if(isCapA&&e.tipo==='clase'){
    e.observacion=`${e.codigo?e.codigo+' · ':''}HORA LECTIVA`;
  }
  return e;
};
normalizeScheduleEntry=function normalizeScheduleEntryV269(e){
  return canonicalScheduleEntry({...e,id:e.id||uid(),dia:normDayWord(e.dia)||normalize(e.dia||'lunes'),inicio:e.inicio||'',fin:e.fin||'',materia:e.materia||e.actividad||'',docente:e.docente||e.instructor||'',tipo:e.tipo||'clase',lugar:e.lugar||'',uniforme:e.uniforme||'',observacion:e.observacion||''});
};
scheduleHasOfficialSignature=function scheduleHasOfficialSignatureV269(){
  const blocks=(state.scheduleBlocks||[]).map(canonicalScheduleEntry);
  const has=(day,start,end,subject)=>blocks.some(b=>normalize(b.dia)===normalize(day)&&b.inicio===start&&b.fin===end&&normalize(b.materia||'')===normalize(subject));
  const nonLective=blocks.filter(isNonLectiveBlock).length;
  const wed=blocks.find(b=>normalize(b.dia)==='miercoles'&&b.inicio==='11:50'&&b.fin==='12:35');
  return blocks.length===53&&has('lunes','06:45','07:15','Hora mística')&&has('martes','06:45','07:15','Organización y control')&&has('viernes','06:45','07:15','Organización y control')&&nonLective===4&&Boolean(wed)&&!isNonLectiveBlock(wed)&&has('lunes','14:00','16:00','Acondicionamiento físico')&&has('jueves','14:00','16:00','Tiro policial');
};
ensureScheduleTemplate=function ensureScheduleTemplateV269(){
  let changed=false;const active=activeScheduleCatalog();if(!active.length)return false;
  state.settings=state.settings||{};
  if(!state.selectedScheduleId||!scheduleTemplateById(state.selectedScheduleId)){state.selectedScheduleId=active[0].id;changed=true}
  const template=currentScheduleTemplate(),expected=template?.metadatos?.template_version||docs.horario?.catalog_version||SCHEDULE_DATA_VERSION;
  const installed=state.settings.scheduleVersion||state.scheduleTemplateVersion||'';
  const mustRefresh=isPlaceholderSchedule()||isLegacyIncorrectSchedule()||!scheduleHasOfficialSignature()||state.scheduleSource!=='catalog'||installed!==expected||state.scheduleMeta?.catalog_id!==template?.id;
  if(mustRefresh)changed=applyCatalogSchedule(template,Boolean(state.scheduleBlocks?.length),'Migración selectiva del horario oficial v2.6.9')||changed;
  else if(template){state.scheduleBlocks=(state.scheduleBlocks||[]).map(normalizeScheduleEntry);state.scheduleMeta=scheduleTemplateMeta(template);state.scheduleTemplateVersion=expected}
  if(state.settings.appVersion!==APP_VERSION){state.settings.appVersion=APP_VERSION;changed=true}
  if(state.settings.scheduleVersion!==expected){state.settings.scheduleVersion=expected;changed=true}
  if(state.settings.databaseVersion!==DATABASE_DATA_VERSION){state.settings.databaseVersion=DATABASE_DATA_VERSION;changed=true}
  if(state.settings.scheduleMigration!=='2026-07-28-v269'){state.settings.scheduleMigration='2026-07-28-v269';changed=true}
  return changed;
};
dailyBlockCard=function dailyBlockCardV269(b){
  b=canonicalScheduleEntry(b);const non=isNonLectiveBlock(b),cls=non?'non-lective':/descanso/i.test(b.materia||'')?'break':/(hora mística|hora mistica|organización y control|organizacion y control|parte)/i.test(b.materia||'')?'formation':'class',style=subjectStyleAttr(b.materia||'');
  if(non)return `<div class="daily-block non-lective clickable" ${style} onclick="openScheduleBlockForm('${b.id}')"><div class="time-badge">${esc(b.inicio)}<span>${esc(b.fin)}</span></div><div><span class="non-lective-label">HORA NO LECTIVA</span><b class="non-lective-subject">${esc(b.materia||'Bloque figurativo')}</b><p>${esc(b.codigo||'')} · NO SE PASAN CLASES</p><small>${esc(b.docente||'')}</small></div></div>`;
  return `<div class="daily-block ${cls} subject-coded clickable" ${style} onclick="openScheduleBlockForm('${b.id}')"><div class="time-badge">${esc(b.inicio)}<span>${esc(b.fin)}</span></div><div><b>${esc(b.materia||'Actividad')}</b>${b.tipo==='clase'?`<span class="lective-label">${esc(b.codigo||'')} · HORA LECTIVA</span>`:''}<p>${esc(b.docente||b.instructor||(/descanso/i.test(b.materia||'')?'':'Docente / instructor pendiente'))} ${teacherIndicator(b.docente||b.instructor)}</p>${b.observacion&&!/hora lectiva/i.test(b.observacion)?`<small>${esc(b.observacion)}</small>`:''}</div></div>`;
};
scheduleTableRow=function scheduleTableRowV269(r){
  const cells=scheduleDays().map(day=>{let b=findScheduleCell(day,r.inicio,r.fin);if(b)b=canonicalScheduleEntry(b);const non=b&&isNonLectiveBlock(b),isBreak=b&&/descanso/i.test(b.materia||''),isSpecial=b&&/(parte|hora mística|hora mistica|organización y control|organizacion y control)/i.test(b.materia||''),cls=non?'non-lective':isBreak?'break':isSpecial?'special':b?'filled':'empty',style=b?subjectStyleAttr(b.materia||''):'';
    return `<td class="schedule-cell ${cls}" ${style} onclick="openScheduleCell('${day}','${r.inicio}','${r.fin}')">${b?(non?`<div class="non-lective-label">HORA NO LECTIVA</div><div class="cell-subject non-lective-subject">${esc(b.materia||'')}</div><div class="cell-meta">${esc(b.codigo||'')} · NO SE PASAN CLASES</div><div class="cell-teacher">${esc(b.docente||b.instructor||'')}</div>`:`<div class="cell-subject">${esc(b.materia||'')}</div>${b.tipo==='clase'?`<div class="cell-meta lective">${esc(b.codigo||'')} · HORA LECTIVA</div>`:''}<div class="cell-teacher">${esc(b.docente||b.instructor||(/descanso/i.test(b.materia||'')?'':'Docente / instructor pendiente'))}</div>`):`<div class="cell-empty">Toque para llenar</div><div class="cell-teacher">Docente / instructor</div>`}</td>`}).join('');
  return `<tr><th class="time-col">${esc(r.inicio)}<br><span>${esc(r.fin)}</span></th>${cells}</tr>`;
};
openClassDetail=function openClassDetailV269(id){
  let b=(state.scheduleBlocks||[]).find(x=>x.id===id);if(!b)return;b=canonicalScheduleEntry(b);const non=isNonLectiveBlock(b);
  showModal(`<h2>${esc(b.materia||'Actividad')}</h2><p><b>${esc(b.dia)}</b> · ${esc(b.inicio)} - ${esc(b.fin)}</p>${non?`<div class="non-lective-detail"><b>HORA NO LECTIVA</b><span>NO SE PASAN CLASES</span><p>${esc(b.codigo||'')} · ${esc(b.docente||'')}</p></div>`:`${b.tipo==='clase'?`<p><span class="lective-label">${esc(b.codigo||'')} · HORA LECTIVA</span></p>`:''}<p><b>Docente:</b> ${esc(b.docente||'')}</p><p><b>Lugar:</b> ${esc(b.lugar||'')}</p>${b.observacion&&!/hora lectiva/i.test(b.observacion)?`<p>${esc(b.observacion)}</p>`:''}`}<button class="btn" onclick="closeModal();openScheduleBlockForm('${b.id}')">Editar</button>`);
};
openReferenceScheduleImage=function openReferenceScheduleImageV269(){
  const template=currentScheduleTemplate(),src=(state.scheduleMeta?.fuente_visual||template?.fuente_visual||docs.horario?.fuente_visual||'assets/horario-segundo-semestre-2026.png');
  showModal(`<h2>Imagen de referencia del horario</h2><div class="schedule-reference-notice"><b>Tabla digital verificada</b><span>Las HORA LECTIVA permanecen como clases normales. Solo se anulan los bloques expresamente rotulados HORA NO LECTIVA: lunes, martes, jueves y viernes de 11:50 a 12:35.</span></div><img class="image-preview schedule-reference-image" src="./${esc(src)}" alt="Imagen de referencia del horario"><div class="row wrap"><button class="btn" onclick="restoreBaseSchedule()">Restaurar horario oficial</button><button class="btn secondary" onclick="closeModal()">Cerrar</button></div>`);
};


/* =========================================================
   Agenda Policial v2.7.3 — pulido de horario offline
   Selector por curso, sin carga de imagen local y vista simplificada.
   ========================================================= */
renderHorario=function renderHorarioV273(){
  const meta=state.scheduleMeta||scheduleTemplateMeta()||{};
  const view=state.scheduleView||'dia';
  const active=activeScheduleCatalog();
  const selected=state.selectedScheduleId||active[0]?.id||'';
  return `<section><div class="row between wrap"><h2 class="section-title">Horario académico</h2><div class="row wrap"><button class="btn secondary" onclick="openReferenceScheduleImage()">Ver referencia</button><button class="btn modern-action" onclick="restoreBaseSchedule()">Restaurar horario</button></div></div><div class="schedule-picker card schedule-picker-clean"><label><span>Elige tu horario</span><select id="scheduleProfileSelect" onchange="selectScheduleProfile(this.value)">${active.map(item=>`<option value="${esc(item.id)}" ${String(selected)===String(item.id)?'selected':''}>${esc(item.etiqueta||item.id)}</option>`).join('')}</select></label><small>El cambio de curso o paralelo se realiza desde las opciones oficiales incluidas en cada actualización de la app.</small></div><div class="schedule-meta-card card schedule-meta-clean"><h3>${esc(meta.institucion||'Escuela Superior de Policías — Filial Sucre')}</h3><p><b>${esc(meta.curso||'Curso académico')}</b>${meta.paralelo?` · Paralelo ${esc(meta.paralelo)}`:''}${meta.turno?` · Turno ${esc(meta.turno)}`:''}</p><p>${esc(meta.nivel||'Nivel')} ${meta.periodo?` · ${esc(meta.periodo)}`:''}</p><div class="row between wrap schedule-view-row"><div class="schedule-switch"><button class="${view==='dia'?'active':''}" onclick="setScheduleView('dia')">Día</button><button class="${view==='semana'?'active':''}" onclick="setScheduleView('semana')">Semana</button></div><span class="schedule-auto-badge">Horario oficial incluido</span></div><div class="schedule-reference-notice schedule-inline-note"><b>Actualización por versión</b><span>La app usa horarios oficiales incluidos en la actualización. Se retiró la carga manual de imágenes para evitar botones sin función.</span></div></div>${view==='semana'?renderWeeklySchedule():renderDailySchedule()}</section>`;
};

scheduleTableRow=function scheduleTableRowV273(r){
  const cells=scheduleDays().map(day=>{let b=findScheduleCell(day,r.inicio,r.fin);if(b)b=canonicalScheduleEntry(b);const non=b&&isNonLectiveBlock(b),isBreak=b&&/descanso/i.test(b.materia||''),isSpecial=b&&/(parte|hora mística|hora mistica|organización y control|organizacion y control)/i.test(b.materia||''),cls=non?'non-lective':isBreak?'break':isSpecial?'special':b?'filled':'empty',style=b?subjectStyleAttr(b.materia||''):'';
    const click=b?`onclick="openClassDetail('${b.id}')"`:'';
    return `<td class="schedule-cell ${cls} ${b?'has-data':'no-data'}" ${style} ${click}>${b?(non?`<div class="non-lective-label">HORA NO LECTIVA</div><div class="cell-subject non-lective-subject">${esc(b.materia||'')}</div><div class="cell-meta">${esc(b.codigo||'')} · NO SE PASAN CLASES</div><div class="cell-teacher">${esc(b.docente||b.instructor||'')}</div>`:`<div class="cell-subject">${esc(b.materia||'')}</div>${b.tipo==='clase'?`<div class="cell-meta lective">${esc(b.codigo||'')} · HORA LECTIVA</div>`:''}<div class="cell-teacher">${esc(b.docente||b.instructor||(/descanso/i.test(b.materia||'')?'':'Docente / instructor pendiente'))}</div>`):`<div class="cell-empty">&nbsp;</div>`}</td>`}).join('');
  return `<tr><th class="time-col">${esc(r.inicio)}<br><span>${esc(r.fin)}</span></th>${cells}</tr>`;
};

openScheduleCell=function openScheduleCellV273(day,inicio,fin){
  const b=findScheduleCell(day,inicio,fin);
  if(!b)return;
  openClassDetail(b.id);
};
chooseScheduleFile=function chooseScheduleFileV273(){toast('La carga manual de imágenes fue desactivada. Los horarios se incorporan mediante actualizaciones oficiales.');};
takeSchedulePhoto=function takeSchedulePhotoV273(){toast('La carga manual de imágenes fue desactivada. Los horarios se incorporan mediante actualizaciones oficiales.');};
loadScheduleImage=function loadScheduleImageV273(){toast('Esta versión ya no usa carga manual de imágenes para el horario.');};
openScheduleAnalyzer=function openScheduleAnalyzerV273(){toast('El análisis manual de imágenes fue retirado para simplificar el horario oficial.');};
openScheduleMetaForm=function openScheduleMetaFormV273(){toast('Los datos generales del horario se actualizan junto con la versión oficial de la aplicación.');};


/* =========================================================
   Agenda Policial v2.7.4 — catálogo multicurso de horarios
   ========================================================= */
Object.assign(SUBJECT_VISUALS,{
  'victimologia':{accent:'#347b8a',soft:'#eaf5f7'},
  'criminalistica general y de campo':{accent:'#8b7547',soft:'#f7f2e8'},
  'disciplinas criminalisticas':{accent:'#527b5f',soft:'#edf5ef'},
  'psicologia criminal y forense':{accent:'#a66b29',soft:'#fbf1e5'},
  'perfilacion criminal':{accent:'#8c6079',soft:'#f7edf3'},
  'investigacion criminal':{accent:'#71698b',soft:'#f0eef6'},
  'gestion policial':{accent:'#397d9b',soft:'#eaf4f8'},
  'administracion de recursos humanos':{accent:'#758257',soft:'#f1f4ea'},
  'administracion policial y doctrina de estado mayor':{accent:'#5f7180',soft:'#edf1f4'},
  'sistemas organizacionales':{accent:'#9a4d3f',soft:'#f9ece9'},
  'preparacion de proyectos institucionales':{accent:'#9a7441',soft:'#f8f1e7'}
});

function scheduleLectiveLabelV274(block){
  return block?.etiqueta_lectiva || 'HORA LECTIVA';
}
function scheduleNonLectiveLabelV274(block){
  return block?.etiqueta_no_lectiva || 'HORA NO LECTIVA';
}
function scheduleEntryComparableV274(block){
  const b=normalizeScheduleEntry(block);
  return [
    normalize(b.dia||''),b.inicio||'',b.fin||'',normalize(b.materia||''),
    normalize(b.docente||''),b.tipo||'',b.codigo||''
  ].join('|');
}
function scheduleMatchesTemplateV274(template){
  if(!template?.entradas?.length)return false;
  const installed=(state.scheduleBlocks||[]).map(scheduleEntryComparableV274).sort();
  const expected=template.entradas.map(scheduleEntryComparableV274).sort();
  return installed.length===expected.length&&installed.every((value,index)=>value===expected[index]);
}
scheduleHasOfficialSignature=function scheduleHasOfficialSignatureV274(){
  return scheduleMatchesTemplateV274(currentScheduleTemplate());
};
scheduleRows=function scheduleRowsV274(){
  const keys=new Set();
  (state.scheduleBlocks||[]).forEach(block=>{
    if(block.inicio&&block.fin)keys.add(`${block.inicio}-${block.fin}`);
  });
  return [...keys]
    .sort((a,b)=>minutes(a.split('-')[0])-minutes(b.split('-')[0])||minutes(a.split('-')[1])-minutes(b.split('-')[1]))
    .map(key=>{const [inicio,fin]=key.split('-');return {inicio,fin}});
};
ensureScheduleTemplate=function ensureScheduleTemplateV274(){
  let changed=false;
  const active=activeScheduleCatalog();
  if(!active.length)return false;
  state.settings=state.settings||{};
  state.settings.scheduleVersionsByCourse=state.settings.scheduleVersionsByCourse||{};
  if(!state.selectedScheduleId||!scheduleTemplateById(state.selectedScheduleId)){
    state.selectedScheduleId=active[0].id;
    changed=true;
  }
  const template=currentScheduleTemplate();
  const expected=template?.metadatos?.template_version||docs.horario?.catalog_version||'';
  const installed=state.settings.scheduleVersionsByCourse[template.id]||state.scheduleTemplateVersion||'';
  const mustRefresh=isPlaceholderSchedule()||state.scheduleSource!=='catalog'||
    state.scheduleMeta?.catalog_id!==template.id||installed!==expected||
    !scheduleMatchesTemplateV274(template);
  if(mustRefresh){
    changed=applyCatalogSchedule(template,Boolean(state.scheduleBlocks?.length),'Actualización oficial del horario seleccionado')||changed;
  }else{
    state.scheduleBlocks=(state.scheduleBlocks||[]).map(normalizeScheduleEntry);
    state.scheduleMeta=scheduleTemplateMeta(template);
    state.scheduleTemplateVersion=expected;
  }
  state.settings.scheduleVersionsByCourse[template.id]=expected;
  if(state.settings.appVersion!==APP_VERSION){state.settings.appVersion=APP_VERSION;changed=true}
  if(state.settings.scheduleVersion!==docs.horario?.catalog_version){state.settings.scheduleVersion=docs.horario?.catalog_version;changed=true}
  if(state.settings.scheduleMigration!=='2026-07-29-v274'){state.settings.scheduleMigration='2026-07-29-v274';changed=true}
  return changed;
};
selectScheduleProfile=async function selectScheduleProfileV274(id){
  const template=scheduleTemplateById(id);
  if(!template)return toast('Ese horario no está activo');
  const expected=template?.metadatos?.template_version||docs.horario?.catalog_version||'';
  if(String(state.selectedScheduleId)===String(template.id)&&state.scheduleTemplateVersion===expected){
    return toast('Ese horario ya está seleccionado');
  }
  applyCatalogSchedule(template,true,`Cambio de horario a ${template.etiqueta||template.id}`);
  state.settings=state.settings||{};
  state.settings.scheduleVersionsByCourse=state.settings.scheduleVersionsByCourse||{};
  state.settings.scheduleVersionsByCourse[template.id]=expected;
  state.settings.scheduleVersion=docs.horario?.catalog_version||expected;
  state.selectedDay=currentDayKey();
  await save();
  render();
  toast(`Horario activo: ${template.etiqueta||'seleccionado'}`);
};
restoreBaseSchedule=async function restoreBaseScheduleV274(){
  const template=currentScheduleTemplate();
  if(!template)return toast('No hay horario oficial activo');
  if(!confirm(`Se restaurará el horario oficial de ${template.etiqueta||'la opción seleccionada'}. ¿Continuar?`))return;
  applyCatalogSchedule(template,true,'Restauración del horario oficial seleccionado');
  state.settings=state.settings||{};
  state.settings.scheduleVersionsByCourse=state.settings.scheduleVersionsByCourse||{};
  state.settings.scheduleVersionsByCourse[template.id]=template.metadatos?.template_version||'';
  await save();render();toast('Horario oficial restaurado');
};
dailyBlockCard=function dailyBlockCardV274(block){
  const b=canonicalScheduleEntry(block);
  const non=isNonLectiveBlock(b);
  const isBreak=/descanso/i.test(b.materia||'');
  const cls=non?'non-lective':isBreak?'break':/(hora mística|hora mistica|organización y control|organizacion y control|parte)/i.test(b.materia||'')?'formation':'class';
  const style=subjectStyleAttr(b.materia||'');
  if(non)return `<div class="daily-block non-lective clickable" ${style} onclick="openClassDetail('${b.id}')"><div class="time-badge">${esc(b.inicio)}<span>${esc(b.fin)}</span></div><div><span class="non-lective-label">${esc(scheduleNonLectiveLabelV274(b))}</span><b class="non-lective-subject">${esc(b.materia||'Actividad')}</b>${b.codigo?`<p>${esc(b.codigo)}</p>`:''}<small>${esc(b.docente||'')}</small></div></div>`;
  return `<div class="daily-block ${cls} subject-coded clickable" ${style} onclick="openClassDetail('${b.id}')"><div class="time-badge">${esc(b.inicio)}<span>${esc(b.fin)}</span></div><div><b>${esc(b.materia||'Actividad')}</b>${b.tipo==='clase'?`<span class="lective-label">${esc(b.codigo||'')} · ${esc(scheduleLectiveLabelV274(b))}</span>`:''}<p>${esc(b.docente||b.instructor||'')}</p>${b.observacion&&!/(hora|clase) lectiva/i.test(b.observacion)?`<small>${esc(b.observacion)}</small>`:''}</div></div>`;
};
scheduleTableRow=function scheduleTableRowV274(row){
  const cells=scheduleDays().map(day=>{
    let b=findScheduleCell(day,row.inicio,row.fin);
    if(b)b=canonicalScheduleEntry(b);
    const non=b&&isNonLectiveBlock(b);
    const isBreak=b&&/descanso/i.test(b.materia||'');
    const isSpecial=b&&/(hora mística|hora mistica|organización y control|organizacion y control|parte)/i.test(b.materia||'');
    const cls=non?'non-lective':isBreak?'break':isSpecial?'special':b?'filled':'empty';
    const style=b?subjectStyleAttr(b.materia||''):'';
    return `<td class="schedule-cell ${cls} ${b?'has-data':'no-data'}" ${style} ${b?`onclick="openClassDetail('${b.id}')"`:''}>${b?(non?`<div class="non-lective-label">${esc(scheduleNonLectiveLabelV274(b))}</div><div class="cell-subject non-lective-subject">${esc(b.materia||'')}</div>${b.codigo?`<div class="cell-meta">${esc(b.codigo)}</div>`:''}<div class="cell-teacher">${esc(b.docente||b.instructor||'')}</div>`:`<div class="cell-subject">${esc(b.materia||'')}</div>${b.tipo==='clase'?`<div class="cell-meta lective">${esc(b.codigo||'')} · ${esc(scheduleLectiveLabelV274(b))}</div>`:''}<div class="cell-teacher">${esc(b.docente||b.instructor||'')}</div>`):`<div class="cell-empty">&nbsp;</div>`}</td>`;
  }).join('');
  return `<tr><th class="time-col">${esc(row.inicio)}<br><span>${esc(row.fin)}</span></th>${cells}</tr>`;
};
openClassDetail=function openClassDetailV274(id){
  let b=(state.scheduleBlocks||[]).find(item=>item.id===id);
  if(!b)return;
  b=canonicalScheduleEntry(b);
  const non=isNonLectiveBlock(b);
  showModal(`<button class="icon-btn close" onclick="closeModal()">×</button><h2>${esc(b.materia||'Actividad')}</h2><p><b>${esc(dayLabel(normalize(b.dia||'')))}</b> · ${esc(b.inicio)} - ${esc(b.fin)}</p>${non?`<div class="non-lective-detail"><b>${esc(scheduleNonLectiveLabelV274(b))}</b>${b.codigo?`<span>${esc(b.codigo)}</span>`:''}<p>${esc(b.docente||'')}</p></div>`:`${b.tipo==='clase'?`<p><span class="lective-label">${esc(b.codigo||'')} · ${esc(scheduleLectiveLabelV274(b))}</span></p>`:''}${b.docente?`<p><b>Docente:</b> ${esc(b.docente)}</p>`:''}${b.lugar?`<p><b>Lugar:</b> ${esc(b.lugar)}</p>`:''}${b.observacion&&!/(hora|clase) lectiva/i.test(b.observacion)?`<p>${esc(b.observacion)}</p>`:''}`}<button class="btn secondary" onclick="closeModal()">Cerrar</button>`);
};


/* =========================================================
   AGENDA POLICIAL v2.12.8 — OFFICE PERSONAL UNIVERSAL
   - Acceso desde cualquier pantalla, online u offline.
   - PDF, DOCX, XLSX/XLSM, PPTX, CSV/TXT e imágenes.
   - Procesamiento local; no sube el archivo al servidor.
   - Word incorpora borrador editable de texto (no reemplaza el DOCX original).
   ========================================================= */
const OFFICE_MAMMOTH_V2128='https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js';
const OFFICE_JSZIP_V2128='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
const OFFICE_XLSX_V2128='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
let officeObjectUrlV2128=null;
let officeCurrentFileV2128=null;
let officeWorkbookV2128=null;

function officeLoadScriptV2128(src,globalName){
  if(globalName&&window[globalName])return Promise.resolve(window[globalName]);
  return new Promise((resolve,reject)=>{
    const existing=[...document.scripts].find(el=>el.src===src);
    if(existing){
      if(globalName&&window[globalName])return resolve(window[globalName]);
      existing.addEventListener('load',()=>resolve(globalName?window[globalName]:true),{once:true});
      existing.addEventListener('error',()=>reject(new Error('Componente Office no disponible')),{once:true});
      return;
    }
    const script=document.createElement('script');script.src=src;script.async=true;script.crossOrigin='anonymous';
    script.onload=()=>resolve(globalName?window[globalName]:true);
    script.onerror=()=>reject(new Error('Componente Office no disponible'));
    document.head.appendChild(script);
  });
}
function officeTypeV2128(file){
  const name=String(file?.name||'').toLowerCase(),type=String(file?.type||'').toLowerCase();
  if(name.endsWith('.pdf')||type==='application/pdf')return 'pdf';
  if(name.endsWith('.docx')||type.includes('wordprocessingml'))return 'docx';
  if(name.endsWith('.xlsx')||name.endsWith('.xlsm')||type.includes('spreadsheetml'))return 'xlsx';
  if(name.endsWith('.pptx')||type.includes('presentationml'))return 'pptx';
  if(name.endsWith('.csv')||type.includes('csv'))return 'csv';
  if(name.endsWith('.txt')||name.endsWith('.md')||type.startsWith('text/'))return 'text';
  if(type.startsWith('image/')||/\.(png|jpe?g|webp|gif|bmp)$/i.test(name))return 'image';
  if(/\.(doc|xls|ppt)$/i.test(name))return 'legacy';
  return 'unknown';
}
function officeTypeLabelV2128(type){return ({pdf:'PDF',docx:'Word DOCX',xlsx:'Excel XLSX',pptx:'PowerPoint PPTX',csv:'CSV',text:'Texto',image:'Imagen',legacy:'Office antiguo'})[type]||'Archivo'}
function officeSizeV2128(bytes){const n=Number(bytes||0);return n<1024?`${n} B`:n<1048576?`${(n/1024).toFixed(0)} KB`:`${(n/1048576).toFixed(1)} MB`}
function officeSanitizeHtmlV2128(html){
  const doc=new DOMParser().parseFromString(`<div id="officeSafe">${html||''}</div>`,'text/html'),root=doc.getElementById('officeSafe');
  root?.querySelectorAll('script,style,iframe,object,embed,form').forEach(el=>el.remove());
  root?.querySelectorAll('*').forEach(el=>{
    [...el.attributes].forEach(attr=>{
      const n=attr.name.toLowerCase(),v=String(attr.value||'').trim();
      if(n.startsWith('on'))el.removeAttribute(attr.name);
      if((n==='href'||n==='src')&&/^javascript:/i.test(v))el.removeAttribute(attr.name);
    });
  });
  return root?.innerHTML||'';
}
function officeSetBodyV2128(html){const box=document.getElementById('officeBodyV2128');if(box)box.innerHTML=html}
function officeRevokeV2128(){if(officeObjectUrlV2128){try{URL.revokeObjectURL(officeObjectUrlV2128)}catch{}officeObjectUrlV2128=null}}

function openOfficeCenterV2128(){
  officeRevokeV2128();officeCurrentFileV2128=null;officeWorkbookV2128=null;
  showModal(`<div class="office-shell-v2128">
    <div class="office-head-v2128"><div><span class="eyebrow">Herramienta offline</span><h2>Office · Documentos</h2><p>Gestione documentos directamente en el celular. Este módulo pertenece al modo offline.</p></div><button class="office-close-v2128" type="button" onclick="closeModal()">✕ <span>Salir</span></button></div>
    <div class="office-format-grid-v2128"><span>📕 PDF</span><span>📘 Word</span><span>📗 Excel</span><span>📙 PowerPoint</span></div>
    <label class="office-picker-v2128"><input id="officeFileV2128" type="file" accept=".pdf,.docx,.xlsx,.xlsm,.pptx,.csv,.txt,.md,image/*" onchange="officePickV2128(this)"><b>＋ Abrir documento</b><small>PDF · Word · Excel · PowerPoint · CSV · texto · imágenes</small></label>
    <div class="office-local-note-v2128"><b>📴 Modo offline</b><span>El documento se procesa en este dispositivo. No se publica ni se sube al área académica.</span></div>
    <div id="officeBodyV2128" class="office-body-v2128"><div class="office-empty-v2128"><span>▦</span><b>Seleccione un archivo</b><small>Office está disponible desde el panel offline de Agenda Policial.</small></div></div>
  </div>`);
  requestAnimationFrame(()=>document.querySelector('#modalRoot .modal')?.classList.add('office-modal-v2128'));
}
async function officePickV2128(input){const file=input?.files?.[0];if(!file)return;await officeOpenFileV2128(file)}
async function officeOpenFileV2128(file){
  officeCurrentFileV2128=file;officeWorkbookV2128=null;officeRevokeV2128();
  const type=officeTypeV2128(file),head=`<div class="office-filebar-v2128"><div><b>${esc(file.name||'Documento')}</b><small>${officeTypeLabelV2128(type)} · ${officeSizeV2128(file.size)}</small></div><button type="button" onclick="officeRepickV2131()">Cambiar</button></div>`;
  officeSetBodyV2128(`${head}<div class="office-loading-v2128"><span></span><b>Preparando documento…</b></div>`);
  try{
    if(type==='pdf')return officeRenderPdfV2128(file,head);
    if(type==='image')return officeRenderImageV2128(file,head);
    if(type==='text'||type==='csv')return await officeRenderTextV2128(file,head,type);
    if(type==='docx')return await officeRenderDocxV2128(file,head);
    if(type==='xlsx')return await officeRenderExcelV2128(file,head);
    if(type==='pptx')return await officeRenderPptxV2128(file,head);
    if(type==='legacy')throw new Error('Este archivo usa el formato antiguo .DOC/.XLS/.PPT. Guárdelo como DOCX, XLSX o PPTX para verlo dentro de Agenda Policial.');
    throw new Error('Formato todavía no compatible con el visor interno.');
  }catch(error){console.error('Office v2.12.8:',error);officeSetBodyV2128(`${head}<div class="office-error-v2128"><b>No se pudo abrir este archivo</b><p>${esc(error?.message||'Formato no compatible')}</p><small>Si está sin internet y es la primera vez que usa Word, Excel o PowerPoint, conecte una vez para completar los componentes del visor.</small></div>`)}
}
function officeRenderPdfV2128(file,head){officeObjectUrlV2128=URL.createObjectURL(file);officeSetBodyV2128(`${head}<div class="office-view-tools-v2128"><span>Vista PDF</span><a href="${officeObjectUrlV2128}" target="_blank" rel="noopener">Abrir a pantalla completa</a></div><iframe class="office-pdf-v2128" src="${officeObjectUrlV2128}" title="${esc(file.name||'PDF')}"></iframe>`)}
function officeRenderImageV2128(file,head){officeObjectUrlV2128=URL.createObjectURL(file);officeSetBodyV2128(`${head}<div class="office-view-tools-v2128"><span>Vista de imagen</span><a href="${officeObjectUrlV2128}" target="_blank" rel="noopener">Abrir completa</a></div><img class="office-image-v2128" src="${officeObjectUrlV2128}" alt="${esc(file.name||'Imagen')}">`)}
async function officeRenderTextV2128(file,head,type){const text=await file.text();if(type==='csv'){const rows=text.split(/\r?\n/).filter(Boolean).slice(0,300).map(line=>line.split(/[,;\t]/));const table=`<div class="office-table-scroll-v2128"><table>${rows.map((r,i)=>`<tr>${r.slice(0,40).map(c=>`<${i===0?'th':'td'}>${esc(c)}</${i===0?'th':'td'}>`).join('')}</tr>`).join('')}</table></div>`;officeSetBodyV2128(`${head}<div class="office-view-tools-v2128"><span>Vista CSV</span><button onclick="officeCopyTextV2128()">Copiar texto</button></div>${table}<pre id="officeRawTextV2128" class="hidden">${esc(text)}</pre>`)}else officeSetBodyV2128(`${head}<div class="office-view-tools-v2128"><span>Documento de texto</span><button onclick="officeCopyTextV2128()">Copiar</button></div><pre id="officeRawTextV2128" class="office-text-v2128">${esc(text)}</pre>`)}
async function officeRenderDocxV2128(file,head){
  await officeLoadScriptV2128(OFFICE_MAMMOTH_V2128,'mammoth');if(!window.mammoth)throw new Error('No se pudo iniciar el lector Word.');
  const buffer=await file.arrayBuffer(),result=await window.mammoth.convertToHtml({arrayBuffer:buffer},{includeDefaultStyleMap:true}),html=officeSanitizeHtmlV2128(result.value||'');
  officeSetBodyV2128(`${head}<div class="office-view-tools-v2128"><span>Vista Word</span><div><button id="officeEditToggleV2128" onclick="officeToggleEditV2128()">✎ Editar texto</button><button onclick="officeSaveDraftV2128()">Guardar borrador TXT</button></div></div><div class="office-word-note-v2128">La vista editable es para correcciones rápidas. El archivo DOCX original no se modifica.</div><article id="officeWordV2128" class="office-word-v2128" contenteditable="false">${html||'<p>Documento sin texto visible.</p>'}</article>`)
}
function officeToggleEditV2128(){const el=document.getElementById('officeWordV2128'),btn=document.getElementById('officeEditToggleV2128');if(!el)return;const editing=el.getAttribute('contenteditable')==='true';el.setAttribute('contenteditable',editing?'false':'true');el.classList.toggle('editing',!editing);if(btn)btn.textContent=editing?'✎ Editar texto':'✓ Terminar edición';if(!editing){el.focus();toast('Edición básica activada')}}
function officeSaveDraftV2128(){const el=document.getElementById('officeWordV2128');if(!el)return toast('Abra un Word primero');const base=String(officeCurrentFileV2128?.name||'documento').replace(/\.docx$/i,''),blob=new Blob([el.innerText||''],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${base}-borrador.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1200);toast('Borrador guardado')}
async function officeRenderExcelV2128(file,head){
  await officeLoadScriptV2128(OFFICE_XLSX_V2128,'XLSX');if(!window.XLSX)throw new Error('No se pudo iniciar el lector Excel.');
  officeWorkbookV2128=window.XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});const names=officeWorkbookV2128.SheetNames||[];if(!names.length)throw new Error('El libro no contiene hojas visibles.');
  officeSetBodyV2128(`${head}<div class="office-view-tools-v2128"><span>Vista Excel</span><small>${names.length} hoja${names.length===1?'':'s'}</small></div><div class="office-sheet-tabs-v2128">${names.map((n,i)=>`<button class="${i===0?'active':''}" onclick="officeRenderSheetIndexV2128(${i},this)">${esc(n)}</button>`).join('')}</div><div id="officeSheetV2128"></div>`);officeRenderSheetIndexV2128(0,document.querySelector('.office-sheet-tabs-v2128 button'))
}
function officeRenderSheetIndexV2128(index,button){const names=officeWorkbookV2128?.SheetNames||[];const name=names[Number(index)||0];if(name)officeRenderSheetV2128(name,button)}
function officeRenderSheetV2128(name,button){if(!officeWorkbookV2128||!window.XLSX)return;document.querySelectorAll('.office-sheet-tabs-v2128 button').forEach(b=>b.classList.remove('active'));button?.classList.add('active');const ws=officeWorkbookV2128.Sheets[name],box=document.getElementById('officeSheetV2128');if(!ws||!box)return;let html=window.XLSX.utils.sheet_to_html(ws,{id:'officeExcelTableV2128',editable:false});box.innerHTML=`<div class="office-table-scroll-v2128 office-excel-v2128">${officeSanitizeHtmlV2128(html)}</div>`}
async function officeRenderPptxV2128(file,head){
  await officeLoadScriptV2128(OFFICE_JSZIP_V2128,'JSZip');if(!window.JSZip)throw new Error('No se pudo iniciar el lector PowerPoint.');
  const zip=await window.JSZip.loadAsync(await file.arrayBuffer()),slides=Object.keys(zip.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/i.test(n)).sort((a,b)=>(Number(a.match(/slide(\d+)/i)?.[1])||0)-(Number(b.match(/slide(\d+)/i)?.[1])||0));
  if(!slides.length)throw new Error('No se encontraron diapositivas legibles.');
  const cards=[];for(let i=0;i<slides.length;i++){const xml=await zip.file(slides[i]).async('text'),doc=new DOMParser().parseFromString(xml,'application/xml'),texts=[...doc.getElementsByTagName('*')].filter(n=>n.localName==='t').map(n=>n.textContent?.trim()).filter(Boolean);cards.push(`<section class="office-slide-v2128"><header><span>${i+1}</span><b>Diapositiva ${i+1}</b></header>${texts.length?texts.map((t,j)=>j===0?`<h3>${esc(t)}</h3>`:`<p>${esc(t)}</p>`).join(''):'<p class="subtle">Sin texto extraíble en esta diapositiva.</p>'}</section>`)}
  officeSetBodyV2128(`${head}<div class="office-view-tools-v2128"><span>Vista PowerPoint</span><small>${slides.length} diapositiva${slides.length===1?'':'s'} · vista de contenido</small></div><div class="office-slides-v2128">${cards.join('')}</div>`)
}
async function officeCopyTextV2128(){const text=document.getElementById('officeRawTextV2128')?.textContent||document.getElementById('officeWordV2128')?.innerText||'';if(!text)return toast('No hay texto para copiar');try{await navigator.clipboard.writeText(text);toast('Texto copiado')}catch{toast('No se pudo copiar automáticamente')}}

const closeModalBeforeOfficeV2128=closeModal;
closeModal=function closeModalOfficeV2128(){officeRevokeV2128();return closeModalBeforeOfficeV2128()};

/* Agenda Policial v2.12.9 — pulido Word personal */
let officeWordSearchTermV2129='';
async function officeRenderDocxV2128(file,head){
  await officeLoadScriptV2128(OFFICE_MAMMOTH_V2128,'mammoth');if(!window.mammoth)throw new Error('No se pudo iniciar el lector Word.');
  const buffer=await file.arrayBuffer(),result=await window.mammoth.convertToHtml({arrayBuffer:buffer},{includeDefaultStyleMap:true}),html=officeSanitizeHtmlV2128(result.value||'');
  officeSetBodyV2128(`${head}<div class="office-view-tools-v2128 office-word-tools-v2129"><span>Vista Word</span><div><button id="officeEditToggleV2128" onclick="officeToggleEditV2128()">✎ Editar</button><button onclick="officeCopyTextV2128()">⧉ Copiar</button><button onclick="officeSaveDraftV2128()">↓ Guardar TXT</button></div></div><div class="office-word-search-v2129"><input id="officeWordSearchV2129" type="search" placeholder="Buscar dentro del Word…" onkeydown="if(event.key==='Enter')officeFindWordV2129()"><button type="button" onclick="officeFindWordV2129()">Buscar</button><button type="button" onclick="officeClearWordSearchV2129()">Limpiar</button></div><div class="office-word-note-v2128">Edición rápida y búsqueda local. El DOCX original permanece intacto.</div><article id="officeWordV2128" class="office-word-v2128" contenteditable="false">${html||'<p>Documento sin texto visible.</p>'}</article>`)
}
function officeClearWordMarksV2129(){
  const root=document.getElementById('officeWordV2128');if(!root)return;
  root.querySelectorAll('mark.office-word-mark-v2129').forEach(mark=>mark.replaceWith(document.createTextNode(mark.textContent||'')));root.normalize();
}
function officeClearWordSearchV2129(){officeWordSearchTermV2129='';officeClearWordMarksV2129();const input=document.getElementById('officeWordSearchV2129');if(input)input.value=''}
function officeFindWordV2129(){
  const root=document.getElementById('officeWordV2128'),input=document.getElementById('officeWordSearchV2129');if(!root||!input)return;
  const term=String(input.value||'').trim();officeClearWordMarksV2129();if(!term)return toast('Escriba una palabra para buscar');officeWordSearchTermV2129=term;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement?.closest('mark')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  let count=0,first=null;const needle=term.toLocaleLowerCase('es');
  for(const node of nodes){const text=node.nodeValue||'',low=text.toLocaleLowerCase('es');if(!low.includes(needle))continue;const frag=document.createDocumentFragment();let pos=0,idx=low.indexOf(needle);while(idx>=0){if(idx>pos)frag.appendChild(document.createTextNode(text.slice(pos,idx)));const mark=document.createElement('mark');mark.className='office-word-mark-v2129';mark.textContent=text.slice(idx,idx+term.length);frag.appendChild(mark);if(!first)first=mark;count++;pos=idx+term.length;idx=low.indexOf(needle,pos)}if(pos<text.length)frag.appendChild(document.createTextNode(text.slice(pos)));node.replaceWith(frag)}
  if(first)first.scrollIntoView({behavior:'smooth',block:'center'});toast(count?`${count} coincidencia${count===1?'':'s'} encontrada${count===1?'':'s'}`:'No se encontró ese texto');
}

/* =========================================================
   Agenda Policial v2.13.1 — Word móvil progresivo
   - Vista móvil refluida para lectura cómoda.
   - Vista documento / vista móvil con un toque.
   - Edición básica visible.
   - Guardado local de copia HTML o TXT; DOCX original intacto.
   ========================================================= */
let officeWordMobileV2130=true;
let officeWordFontV2130=18;
async function officeRenderDocxV2128(file,head){
  await officeLoadScriptV2128(OFFICE_MAMMOTH_V2128,'mammoth');if(!window.mammoth)throw new Error('No se pudo iniciar el lector Word.');
  const buffer=await file.arrayBuffer(),result=await window.mammoth.convertToHtml({arrayBuffer:buffer},{includeDefaultStyleMap:true}),html=officeSanitizeHtmlV2128(result.value||'');
  officeWordMobileV2130=true;officeWordFontV2130=18;
  officeSetBodyV2128(`${head}<div class="office-view-tools-v2128 office-word-tools-v2129 office-word-tools-v2130"><span>Word</span><div><button id="officeWordModeV2130" onclick="officeToggleWordMobileV2130()">📱 Vista móvil</button><button id="officeEditToggleV2128" onclick="officeToggleEditV2128()">✎ Editar</button><button onclick="officeSaveHtmlV2130()">↓ Guardar copia</button></div></div><div class="office-word-mobilebar-v2130"><button onclick="officeWordFontV2130Change(-1)">A−</button><span id="officeWordFontLabelV2130">18 px</span><button onclick="officeWordFontV2130Change(1)">A+</button><button onclick="officeCopyTextV2128()">⧉ Copiar</button><button onclick="officeSaveDraftV2128()">TXT</button></div><div class="office-word-search-v2129"><input id="officeWordSearchV2129" type="search" placeholder="Buscar dentro del Word…" onkeydown="if(event.key==='Enter')officeFindWordV2129()"><button type="button" onclick="officeFindWordV2129()">Buscar</button><button type="button" onclick="officeClearWordSearchV2129()">Limpiar</button></div><div class="office-word-note-v2128">Vista móvil optimizada para celular. Puede editar y guardar una copia local; el DOCX original no se sobrescribe.</div><article id="officeWordV2128" class="office-word-v2128 office-word-mobile-v2130" style="--office-word-font-v2130:18px" contenteditable="false">${html||'<p>Documento sin texto visible.</p>'}</article>`)
}
function officeToggleWordMobileV2130(){
  const el=document.getElementById('officeWordV2128'),btn=document.getElementById('officeWordModeV2130');if(!el)return;
  officeWordMobileV2130=!officeWordMobileV2130;el.classList.toggle('office-word-mobile-v2130',officeWordMobileV2130);el.classList.toggle('office-word-document-v2130',!officeWordMobileV2130);
  if(btn)btn.textContent=officeWordMobileV2130?'📱 Vista móvil':'📄 Vista documento';
  toast(officeWordMobileV2130?'Vista móvil activada':'Vista documento activada');
}
function officeWordFontV2130Change(delta){
  officeWordFontV2130=Math.max(14,Math.min(26,officeWordFontV2130+Number(delta||0)*2));const el=document.getElementById('officeWordV2128'),label=document.getElementById('officeWordFontLabelV2130');if(el)el.style.setProperty('--office-word-font-v2130',`${officeWordFontV2130}px`);if(label)label.textContent=`${officeWordFontV2130} px`;
}
function officeSaveHtmlV2130(){
  const el=document.getElementById('officeWordV2128');if(!el)return toast('Abra un Word primero');
  const base=String(officeCurrentFileV2128?.name||'documento').replace(/\.docx$/i,'');
  const html=`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(base)}</title><style>body{font-family:Arial,sans-serif;max-width:850px;margin:32px auto;padding:0 22px;line-height:1.55;color:#172119}table{border-collapse:collapse;max-width:100%;overflow:auto}td,th{border:1px solid #bbb;padding:6px}img{max-width:100%;height:auto}</style></head><body>${el.innerHTML}</body></html>`;
  const blob=new Blob([html],{type:'text/html;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${base}-editado.html`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1200);toast('Copia editable guardada');
}


/* =========================================================
   Agenda Policial v2.13.1 — Word directo + estabilización Android
   - Captura los bytes del archivo inmediatamente al seleccionarlo para evitar
     referencias temporales que Android puede invalidar mientras cargan dependencias.
   - Word abre por defecto como documento real (docx-preview), no como texto plano.
   - Vista documento, lectura móvil y edición básica en un solo flujo.
   ========================================================= */
const OFFICE_DOCX_PREVIEW_V2131='https://cdn.jsdelivr.net/npm/docx-preview@0.4.0/dist/docx-preview.min.js';
let officeCurrentBytesV2131=null;
let officeCurrentDocxHtmlV2131='';
let officeWordModeV2131='document';

function officeArrayBufferCopyV2131(buffer){
  if(!buffer)return null;
  try{return buffer.slice(0)}catch{return buffer}
}
async function officeReadBytesV2131(file){
  let lastError=null;
  const attempts=[
    async()=>file.arrayBuffer(),
    async()=>new Response(file).arrayBuffer(),
    async()=>{
      if(!file.stream)throw new Error('stream no disponible');
      const reader=file.stream().getReader(),chunks=[];let total=0;
      while(true){const {done,value}=await reader.read();if(done)break;if(value){chunks.push(value);total+=value.byteLength}}
      const out=new Uint8Array(total);let offset=0;for(const chunk of chunks){out.set(chunk,offset);offset+=chunk.byteLength}return out.buffer;
    },
    ()=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error||new Error('No se pudo leer el archivo'));reader.readAsArrayBuffer(file)})
  ];
  for(const attempt of attempts){try{const data=await attempt();if(data&&data.byteLength>=0)return data}catch(error){lastError=error}}
  throw lastError||new Error('Android no permitió leer este archivo. Vuelva a seleccionarlo desde Descargas o Documentos.');
}
function officeStableFileV2131(file,bytes){
  try{return new File([bytes],file?.name||'documento',{type:file?.type||'application/octet-stream',lastModified:file?.lastModified||Date.now()})}
  catch{const blob=new Blob([bytes],{type:file?.type||'application/octet-stream'});try{Object.defineProperty(blob,'name',{value:file?.name||'documento'})}catch{}return blob}
}
async function officeSnapshotFileV2131(file,type){
  if(!['docx','xlsx','pptx','csv','text'].includes(type)){officeCurrentBytesV2131=null;return file}
  const bytes=await officeReadBytesV2131(file);
  officeCurrentBytesV2131=officeArrayBufferCopyV2131(bytes);
  return officeStableFileV2131(file,bytes);
}

async function officeOpenFileV2128(file){
  officeWorkbookV2128=null;officeRevokeV2128();officeCurrentDocxHtmlV2131='';officeWordModeV2131='document';
  const type=officeTypeV2128(file),originalName=file?.name||'Documento';
  const head=`<div class="office-filebar-v2128"><div><b>${esc(originalName)}</b><small>${officeTypeLabelV2128(type)} · ${officeSizeV2128(file?.size)}</small></div><button type="button" onclick="officeRepickV2131()">Cambiar</button></div>`;
  officeSetBodyV2128(`${head}<div class="office-loading-v2128"><span></span><b>Tomando una copia segura del archivo…</b><small>Esto evita que Android pierda el permiso temporal mientras se prepara el visor.</small></div>`);
  try{
    const stable=await officeSnapshotFileV2131(file,type);officeCurrentFileV2128=stable;
    if(type==='pdf')return officeRenderPdfV2128(stable,head);
    if(type==='image')return officeRenderImageV2128(stable,head);
    if(type==='text'||type==='csv')return await officeRenderTextV2128(stable,head,type);
    if(type==='docx')return await officeRenderDocxV2128(stable,head);
    if(type==='xlsx')return await officeRenderExcelV2128(stable,head);
    if(type==='pptx')return await officeRenderPptxV2128(stable,head);
    if(type==='legacy')throw new Error('Este archivo usa .DOC/.XLS/.PPT antiguo. Guárdelo como DOCX, XLSX o PPTX para abrirlo dentro de Agenda Policial.');
    throw new Error('Formato todavía no compatible con el visor interno.');
  }catch(error){
    console.error('Office v2.13.1:',error);
    const permission=/requested file could not be read|permission|notreadable|could not be read/i.test(String(error?.message||error));
    officeSetBodyV2128(`${head}<div class="office-error-v2128 office-error-v2131"><b>No se pudo abrir este archivo</b><p>${permission?'Android entregó un permiso temporal que no permitió copiar el archivo.':esc(error?.message||'Formato no compatible')}</p><small>${permission?'Toque “Volver a seleccionar” y elija el archivo desde Descargas o Documentos. Agenda Policial intentará copiarlo a memoria inmediatamente.':'Si es la primera vez que usa Word, Excel o PowerPoint, mantenga internet una vez para descargar el componente del visor.'}</small><button type="button" onclick="officeRepickV2131()">↻ Volver a seleccionar</button></div>`)
  }
}

async function officeDocxDepsV2131(){
  await officeLoadScriptV2128(OFFICE_JSZIP_V2128,'JSZip');
  await officeLoadScriptV2128(OFFICE_DOCX_PREVIEW_V2131,'docx');
  if(!window.docx?.renderAsync)throw new Error('No se pudo iniciar la vista Word directa.');
}
function officeWordToolbarV2131(){
  return `<div class="office-word-toolbar-v2131"><div class="office-word-mode-tabs-v2131"><button id="officeWordDirectBtnV2131" class="active" type="button" onclick="officeSetWordModeV2131('document')">📄 Word</button><button id="officeWordMobileBtnV2131" type="button" onclick="officeSetWordModeV2131('mobile')">📱 Lectura móvil</button><button id="officeWordEditBtnV2131" type="button" onclick="officeSetWordModeV2131('edit')">✎ Editar</button></div><div class="office-word-actions-v2131"><button type="button" onclick="officeCopyWordV2131()">⧉ Copiar</button><button type="button" onclick="officeSaveWordCopyV2131()">↓ Guardar copia</button></div></div>`;
}
async function officeRenderDocxV2128(file,head){
  let buffer=officeCurrentBytesV2131;
  if(!buffer){buffer=await officeReadBytesV2131(file);officeCurrentBytesV2131=officeArrayBufferCopyV2131(buffer)}
  officeWordModeV2131='document';officeWordFontV2130=18;officeCurrentDocxHtmlV2131='';
  officeSetBodyV2128(`${head}${officeWordToolbarV2131()}<div class="office-word-note-v2128 office-word-note-v2131"><b>Vista Word directa</b> · El documento se representa por páginas, conservando tablas, imágenes, saltos y estilos compatibles. Use “Lectura móvil” cuando prefiera el texto refluido al ancho del celular.</div><div id="officeWordStageV2131" class="office-word-stage-v2131"><div class="office-loading-v2128"><span></span><b>Abriendo Word…</b></div></div>`);
  await officeRenderWordDirectV2131();
}
async function officeRenderWordDirectV2131(){
  const stage=document.getElementById('officeWordStageV2131');if(!stage||!officeCurrentBytesV2131)return;
  stage.innerHTML='<div class="office-loading-v2128"><span></span><b>Construyendo páginas de Word…</b></div>';
  try{
    await officeDocxDepsV2131();
    stage.innerHTML='<div id="officeWordStylesV2131"></div><div id="officeWordCanvasV2131" class="office-word-canvas-v2131"></div>';
    const canvas=document.getElementById('officeWordCanvasV2131'),styles=document.getElementById('officeWordStylesV2131');
    await window.docx.renderAsync(new Uint8Array(officeArrayBufferCopyV2131(officeCurrentBytesV2131)),canvas,styles,{className:'agenda-office-word-v2131',inWrapper:true,ignoreWidth:false,ignoreHeight:false,ignoreFonts:false,breakPages:true,ignoreLastRenderedPageBreak:false,renderHeaders:true,renderFooters:true,renderFootnotes:true,renderEndnotes:true,useBase64URL:true,debug:false});
    requestAnimationFrame(()=>officeFitWordDirectV2131());
  }catch(error){console.error(error);stage.innerHTML=`<div class="office-error-v2128"><b>No se pudo dibujar la vista Word</b><p>${esc(error?.message||'Visualizador no disponible')}</p><button type="button" onclick="officeSetWordModeV2131('mobile')">Abrir en lectura móvil</button></div>`}
}
function officeFitWordDirectV2131(){
  const stage=document.getElementById('officeWordStageV2131'),canvas=document.getElementById('officeWordCanvasV2131'),page=canvas?.querySelector('section');if(!stage||!canvas||!page)return;
  canvas.style.zoom='1';const natural=page.getBoundingClientRect().width,available=Math.max(250,stage.clientWidth-18);const fit=natural>available?Math.max(.42,Math.min(1,available/natural)):1;canvas.style.zoom=String(fit);
}
async function officeEnsureWordHtmlV2131(){
  if(officeCurrentDocxHtmlV2131)return officeCurrentDocxHtmlV2131;
  if(!officeCurrentBytesV2131)throw new Error('No hay una copia legible del Word.');
  await officeLoadScriptV2128(OFFICE_MAMMOTH_V2128,'mammoth');if(!window.mammoth)throw new Error('No se pudo iniciar la lectura móvil.');
  const result=await window.mammoth.convertToHtml({arrayBuffer:officeArrayBufferCopyV2131(officeCurrentBytesV2131)},{includeDefaultStyleMap:true});
  officeCurrentDocxHtmlV2131=officeSanitizeHtmlV2128(result?.value||'')||'<p>Documento sin texto visible.</p>';return officeCurrentDocxHtmlV2131;
}
async function officeSetWordModeV2131(mode){
  if(!['document','mobile','edit'].includes(mode))mode='document';officeWordModeV2131=mode;
  document.querySelectorAll('.office-word-mode-tabs-v2131 button').forEach(btn=>btn.classList.remove('active'));
  document.getElementById(mode==='document'?'officeWordDirectBtnV2131':mode==='mobile'?'officeWordMobileBtnV2131':'officeWordEditBtnV2131')?.classList.add('active');
  const stage=document.getElementById('officeWordStageV2131');if(!stage)return;
  if(mode==='document')return officeRenderWordDirectV2131();
  stage.innerHTML='<div class="office-loading-v2128"><span></span><b>Preparando texto adaptable…</b></div>';
  try{
    const html=await officeEnsureWordHtmlV2131(),editable=mode==='edit';
    stage.innerHTML=`<div class="office-word-mobilebar-v2130 office-word-mobilebar-v2131"><button onclick="officeWordFontV2130Change(-1)">A−</button><span id="officeWordFontLabelV2130">${officeWordFontV2130} px</span><button onclick="officeWordFontV2130Change(1)">A+</button><button onclick="officeFindWordV2129()">⌕ Buscar</button><button onclick="officeSaveDraftV2128()">TXT</button></div><div class="office-word-search-v2129"><input id="officeWordSearchV2129" type="search" placeholder="Buscar dentro del Word…" onkeydown="if(event.key==='Enter')officeFindWordV2129()"><button type="button" onclick="officeFindWordV2129()">Buscar</button><button type="button" onclick="officeClearWordSearchV2129()">Limpiar</button></div><article id="officeWordV2128" class="office-word-v2128 office-word-mobile-v2130${editable?' editing':''}" style="--office-word-font-v2130:${officeWordFontV2130}px" contenteditable="${editable?'true':'false'}">${html}</article>`;
    if(editable){document.getElementById('officeWordV2128')?.focus();toast('Edición básica activada. Guardar copia crea un HTML; el DOCX original queda intacto.')}
  }catch(error){stage.innerHTML=`<div class="office-error-v2128"><b>No se pudo abrir esta vista</b><p>${esc(error?.message||'Componente no disponible')}</p></div>`}
}

async function officeRenderExcelV2128(file,head){
  await officeLoadScriptV2128(OFFICE_XLSX_V2128,'XLSX');if(!window.XLSX)throw new Error('No se pudo iniciar el lector Excel.');
  const buffer=officeCurrentBytesV2131||await officeReadBytesV2131(file);officeCurrentBytesV2131=officeArrayBufferCopyV2131(buffer);
  officeWorkbookV2128=window.XLSX.read(officeArrayBufferCopyV2131(buffer),{type:'array',cellDates:true});const names=officeWorkbookV2128.SheetNames||[];if(!names.length)throw new Error('El libro no contiene hojas visibles.');
  officeSetBodyV2128(`${head}<div class="office-view-tools-v2128"><span>Vista Excel</span><small>${names.length} hoja${names.length===1?'':'s'}</small></div><div class="office-sheet-tabs-v2128">${names.map((n,i)=>`<button class="${i===0?'active':''}" onclick="officeRenderSheetIndexV2128(${i},this)">${esc(n)}</button>`).join('')}</div><div id="officeSheetV2128"></div>`);officeRenderSheetIndexV2128(0,document.querySelector('.office-sheet-tabs-v2128 button'))
}
async function officeRenderPptxV2128(file,head){
  await officeLoadScriptV2128(OFFICE_JSZIP_V2128,'JSZip');if(!window.JSZip)throw new Error('No se pudo iniciar el lector PowerPoint.');
  const buffer=officeCurrentBytesV2131||await officeReadBytesV2131(file);officeCurrentBytesV2131=officeArrayBufferCopyV2131(buffer);
  const zip=await window.JSZip.loadAsync(officeArrayBufferCopyV2131(buffer)),slides=Object.keys(zip.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/i.test(n)).sort((a,b)=>(Number(a.match(/slide(\d+)/i)?.[1])||0)-(Number(b.match(/slide(\d+)/i)?.[1])||0));
  if(!slides.length)throw new Error('No se encontraron diapositivas legibles.');
  const cards=[];for(let i=0;i<slides.length;i++){const xml=await zip.file(slides[i]).async('text'),doc=new DOMParser().parseFromString(xml,'application/xml'),texts=[...doc.getElementsByTagName('*')].filter(n=>n.localName==='t').map(n=>n.textContent?.trim()).filter(Boolean);cards.push(`<section class="office-slide-v2128"><header><span>${i+1}</span><b>Diapositiva ${i+1}</b></header>${texts.length?texts.map((t,j)=>j===0?`<h3>${esc(t)}</h3>`:`<p>${esc(t)}</p>`).join(''):'<p class="subtle">Sin texto extraíble en esta diapositiva.</p>'}</section>`)}
  officeSetBodyV2128(`${head}<div class="office-view-tools-v2128"><span>Vista PowerPoint</span><small>${slides.length} diapositiva${slides.length===1?'':'s'} · vista de contenido</small></div><div class="office-slides-v2128">${cards.join('')}</div>`)
}


async function officeCopyWordV2131(){
  const editable=document.getElementById('officeWordV2128');
  if(editable){try{await navigator.clipboard.writeText(editable.innerText||'');toast('Texto copiado');return}catch{}}
  try{
    const html=await officeEnsureWordHtmlV2131(),doc=new DOMParser().parseFromString(html,'text/html'),text=(doc.body?.innerText||doc.body?.textContent||'').trim();
    if(!text)return toast('No hay texto para copiar');await navigator.clipboard.writeText(text);toast('Texto copiado');
  }catch(error){console.error(error);toast('No se pudo copiar el texto')}
}
async function officeSaveWordCopyV2131(){
  const editable=document.getElementById('officeWordV2128');if(editable)return officeSaveHtmlV2130();
  try{
    const body=await officeEnsureWordHtmlV2131(),base=String(officeCurrentFileV2128?.name||'documento').replace(/\.docx$/i,''),html=`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(base)}</title><style>body{font-family:Arial,sans-serif;max-width:850px;margin:32px auto;padding:0 22px;line-height:1.55;color:#172119}table{border-collapse:collapse;max-width:100%}td,th{border:1px solid #bbb;padding:6px}img{max-width:100%;height:auto}</style></head><body>${body}</body></html>`,blob=new Blob([html],{type:'text/html;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${base}-copia.html`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1200);toast('Copia guardada');
  }catch(error){console.error(error);toast('No se pudo guardar la copia')}
}


function officeRepickV2131(accept=''){
  const input=document.getElementById('officeFileV2128');if(!input)return;
  input.value='';input.accept=accept||'.pdf,.docx,.xlsx,.xlsm,.pptx,.csv,.txt,.md,image/*';input.click();
}
function officeChooseFormatV2131(type){
  const accepts={pdf:'.pdf',docx:'.docx',xlsx:'.xlsx,.xlsm',pptx:'.pptx'};officeRepickV2131(accepts[type]||'');
}
function openOfficeCenterV2128(){
  officeRevokeV2128();officeCurrentFileV2128=null;officeWorkbookV2128=null;officeCurrentBytesV2131=null;officeCurrentDocxHtmlV2131='';
  showModal(`<div class="office-shell-v2128 office-shell-v2131">
    <div class="office-head-v2128"><div><span class="eyebrow">Herramienta offline</span><h2>Office · Documentos</h2><p>Gestione documentos directamente en el celular. Este módulo pertenece al modo offline.</p></div><button class="office-close-v2128" type="button" onclick="closeModal()">✕ <span>Salir</span></button></div>
    <div class="office-create-v2134"><button type="button" onclick="officeCreateDocumentV2134()">＋ <b>Crear documento</b><small>A4 u Oficio · guardado local</small></button></div><div class="office-format-grid-v2128 office-format-grid-v2131"><button type="button" onclick="officeChooseFormatV2131('pdf')">📕 <b>PDF</b><small>Abrir PDF</small></button><button type="button" onclick="officeChooseFormatV2131('docx')">📘 <b>Word</b><small>Vista directa</small></button><button type="button" onclick="officeChooseFormatV2131('xlsx')">📗 <b>Excel</b><small>Hojas y tablas</small></button><button type="button" onclick="officeChooseFormatV2131('pptx')">📙 <b>PowerPoint</b><small>Diapositivas</small></button></div>
    <label class="office-picker-v2128"><input id="officeFileV2128" type="file" accept=".pdf,.docx,.xlsx,.xlsm,.pptx,.csv,.txt,.md,image/*" onchange="officePickV2128(this)"><b>＋ Abrir cualquier documento</b><small>PDF · Word · Excel · PowerPoint · CSV · texto · imágenes</small></label>
    <div class="office-local-note-v2128"><b>🔒 Archivo local</b><span>Se crea una copia temporal en memoria para evitar que Android pierda el permiso del archivo. No se publica ni se sube al curso.</span></div>
    <div id="officeBodyV2128" class="office-body-v2128"><div class="office-empty-v2128"><span>▦</span><b>Seleccione un archivo</b><small>Word abre primero como documento real y también dispone de lectura móvil y edición básica.</small></div></div>
  </div>`);
  requestAnimationFrame(()=>document.querySelector('#modalRoot .modal')?.classList.add('office-modal-v2128','office-modal-v2131'));
}

const closeModalBeforeOfficeV2131=closeModal;
closeModal=function closeModalOfficeV2131(){officeCurrentBytesV2131=null;officeCurrentDocxHtmlV2131='';return closeModalBeforeOfficeV2131()};


/* =========================================================
   Agenda Policial v2.13.4 — Office Offline Etapa 2 inicial
   Crear documento + A4/Oficio + formato + imprimir/exportar PDF
   ========================================================= */
let officeDraftV2134={size:'A4',orientation:'portrait',title:'Documento'};
function officeCreateDocumentV2134(){
  officeDraftV2134={size:'A4',orientation:'portrait',title:'Documento'};
  officeSetBodyV2128(`<section class="office-create-shell-v2134">
    <div class="office-create-head-v2134"><div><span class="eyebrow">Nuevo documento</span><h3>Editor offline</h3></div><button type="button" onclick="openOfficeCenterV2128()">← Volver</button></div>
    <div class="office-page-controls-v2134">
      <label>Hoja<select id="officePageSizeV2134" onchange="officePageSetupV2134()"><option value="A4">A4 · 210 × 297 mm</option><option value="OFICIO">Oficio · 216 × 330 mm</option></select></label>
      <label>Orientación<select id="officeOrientationV2134" onchange="officePageSetupV2134()"><option value="portrait">Vertical</option><option value="landscape">Horizontal</option></select></label>
      <label>Nombre<input id="officeDocNameV2134" value="Documento" oninput="officeDraftV2134.title=this.value||'Documento'"></label>
    </div>
    <div class="office-editor-toolbar-v2134">
      <button type="button" onclick="officeFormatV2134('bold')"><b>B</b></button><button type="button" onclick="officeFormatV2134('italic')"><i>I</i></button><button type="button" onclick="officeFormatV2134('underline')"><u>U</u></button>
      <button type="button" onclick="officeFormatV2134('justifyLeft')">☰←</button><button type="button" onclick="officeFormatV2134('justifyCenter')">☰</button><button type="button" onclick="officeFormatV2134('justifyRight')">→☰</button>
      <button type="button" onclick="officeFormatV2134('insertUnorderedList')">• Lista</button><button type="button" onclick="officeFormatV2134('insertOrderedList')">1. Lista</button>
      <select onchange="officeBlockV2134(this.value);this.value='p'"><option value="p">Texto</option><option value="h1">Título</option><option value="h2">Subtítulo</option></select>
    </div>
    <div class="office-paper-wrap-v2134"><article id="officeEditorV2134" class="office-paper-v2134 a4 portrait" contenteditable="true"><p><br></p></article></div>
    <div class="office-create-actions-v2134"><button type="button" onclick="officeSaveHtmlV2134()">💾 Guardar copia</button><button class="primary" type="button" onclick="officePrintPdfV2134()">📄 Exportar / imprimir PDF</button></div>
    <p class="office-create-note-v2134">Todo se edita localmente. “Exportar / imprimir PDF” abre el diálogo del teléfono para guardar como PDF sin marca de agua.</p>
  </section>`);
  setTimeout(()=>document.getElementById('officeEditorV2134')?.focus(),80);
}
function officePageSetupV2134(){
  const size=document.getElementById('officePageSizeV2134')?.value||'A4',orientation=document.getElementById('officeOrientationV2134')?.value||'portrait',paper=document.getElementById('officeEditorV2134');
  officeDraftV2134.size=size;officeDraftV2134.orientation=orientation;if(paper)paper.className=`office-paper-v2134 ${size==='OFICIO'?'oficio':'a4'} ${orientation}`;
}
function officeFormatV2134(cmd){document.getElementById('officeEditorV2134')?.focus();try{document.execCommand(cmd,false,null)}catch{} }
function officeBlockV2134(tag){document.getElementById('officeEditorV2134')?.focus();try{document.execCommand('formatBlock',false,tag)}catch{} }
function officeSaveHtmlV2134(){
 const ed=document.getElementById('officeEditorV2134');if(!ed)return;const name=(document.getElementById('officeDocNameV2134')?.value||'Documento').replace(/[\\/:*?"<>|]+/g,'-');
 const html=`<!doctype html><html><head><meta charset="utf-8"><title>${esc(name)}</title></head><body>${ed.innerHTML}</body></html>`,blob=new Blob([html],{type:'text/html;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${name}.html`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);toast('Copia guardada en el dispositivo');
}
function officePrintPdfV2134(){
 const ed=document.getElementById('officeEditorV2134');if(!ed)return;const name=(document.getElementById('officeDocNameV2134')?.value||'Documento'),size=officeDraftV2134.size==='OFICIO'?'216mm 330mm':'210mm 297mm',land=officeDraftV2134.orientation==='landscape';
 const page=land?size.split(' ').reverse().join(' '):size,w=window.open('','_blank');if(!w)return toast('Permita ventanas emergentes para exportar el PDF');
 w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(name)}</title><style>@page{size:${page};margin:20mm}html,body{margin:0;padding:0;font-family:Arial,sans-serif;font-size:12pt;line-height:1.35;color:#111}img{max-width:100%}p{margin:.3em 0}</style></head><body>${ed.innerHTML}<script>onload=()=>setTimeout(()=>print(),250)<\/script></body></html>`);w.document.close();
}


/* =========================================================
   Agenda Policial v2.13.5 — Office visible + Bloc de notas reparado
   ========================================================= */
function deleteNoteV2135(id){
  const n=state.notes.find(x=>x.id===id);if(!n)return toast('Nota no encontrada');
  if(!confirm(`¿Eliminar definitivamente "${n.title||'esta nota'}"?`))return;
  state.notes=state.notes.filter(x=>x.id!==id);
  save().then(()=>{closeModal();openNotes();toast('Nota eliminada')});
}
function archiveNoteV2135(id){
  const n=state.notes.find(x=>x.id===id);if(!n)return toast('Nota no encontrada');
  n.archived=true;n.updated=new Date().toISOString();
  save().then(()=>{closeModal();openNotes();toast('Nota archivada')});
}
function restoreNoteV2135(id){
  const n=state.notes.find(x=>x.id===id);if(!n)return toast('Nota no encontrada');
  n.archived=false;n.updated=new Date().toISOString();
  save().then(()=>{closeModal();showArchivedNotes();toast('Nota restaurada')});
}
renderNotes=function renderNotesV2135(){
  const notes=(state.notes||[]).filter(n=>!n.archived);
  return `<section>
    <div class="row between wrap"><div><span class="eyebrow">Herramienta offline</span><h2 class="section-title">Bloc de notas</h2></div><button class="btn" onclick="openNoteForm()">＋ Nueva nota</button></div>
    <div class="tabs"><button class="active">Activas</button><button onclick="showArchivedNotes()">Archivadas</button></div>
    <div class="note-grid">${notes.map(n=>`<article class="note-card note-card-v2135">
      <button class="note-main-v2135" type="button" onclick="openNoteForm('${n.id}')"><h3>${esc(n.title||'Sin título')}</h3><p>${esc((n.text||'').slice(0,150))}${(n.text||'').length>150?'...':''}</p><div class="muted">${new Date(n.updated||n.created).toLocaleString('es-BO')}</div></button>
      <div class="note-actions-v2135"><button type="button" onclick="openNoteForm('${n.id}')">✎ Editar</button><button type="button" onclick="archiveNoteV2135('${n.id}')">Archivar</button><button class="danger" type="button" onclick="deleteNoteV2135('${n.id}')">Eliminar</button></div>
    </article>`).join('')||'<div class="card small"><p>No hay notas guardadas.</p></div>'}</div>
  </section>`;
};
showArchivedNotes=function showArchivedNotesV2135(){
  const notes=(state.notes||[]).filter(n=>n.archived);
  $('#app').innerHTML=appShell(`<section>
    <div class="row between wrap"><h2 class="section-title">Notas archivadas</h2><button class="btn secondary" onclick="openNotes()">Volver</button></div>
    <div class="note-grid">${notes.map(n=>`<article class="note-card note-card-v2135"><button class="note-main-v2135" type="button" onclick="openNoteForm('${n.id}')"><h3>${esc(n.title||'Sin título')}</h3><p>${esc((n.text||'').slice(0,150))}</p></button><div class="note-actions-v2135"><button type="button" onclick="restoreNoteV2135('${n.id}')">Restaurar</button><button type="button" onclick="openNoteForm('${n.id}')">✎ Editar</button><button class="danger" type="button" onclick="deleteNoteV2135('${n.id}')">Eliminar</button></div></article>`).join('')||'<div class="card small"><p>No hay notas archivadas.</p></div>'}</div>
  </section>`);
};
openNoteForm=function openNoteFormV2135(id=null){
  const n=id?(state.notes||[]).find(x=>x.id===id):{title:'',text:'',category:'',archived:false};
  if(!n)return toast('Nota no encontrada');
  showModal(`<button class="icon-btn close" onclick="closeModal()">×</button><h2>${id?'Editar nota':'Nueva nota'}</h2>
    <form id="noteForm" class="note-editor-form">${buildForm([{name:'title',label:'Título'},{name:'category',label:'Carpeta / categoría'},{name:'text',label:'Texto',type:'textarea'}],n)}
    <div class="form-actions note-actions"><button class="btn" type="submit">💾 Guardar</button>${id&&!n.archived?`<button class="btn secondary" type="button" onclick="archiveNoteV2135('${id}')">Archivar</button>`:''}${id&&n.archived?`<button class="btn secondary" type="button" onclick="restoreNoteV2135('${id}')">Restaurar</button>`:''}${id?`<button class="btn danger" type="button" onclick="deleteNoteV2135('${id}')">Eliminar</button>`:''}<button class="btn ghost" type="button" onclick="closeModal()">Cancelar</button></div></form>`);
  const ta=$('#noteForm textarea[name="text"]');if(ta)ta.classList.add('note-textarea');
  $('#noteForm').onsubmit=async e=>{e.preventDefault();const data=formData(e.target);if(id){Object.assign(n,data,{updated:new Date().toISOString()})}else{state.notes.push({...data,id:uid(),created:new Date().toISOString(),updated:new Date().toISOString(),archived:false})}await save();closeModal();openNotes();toast(id?'Nota actualizada':'Nota creada')};
};


/* =========================================================
   Agenda Policial v2.13.6 — Word estable + Dictado + Lectura por voz
   ========================================================= */
let officeReaderV2136={chunks:[],index:0,playing:false,paused:false,rate:1};
let officeDictationV2136=null;
let officeDictationTargetV2136=null;

function officeWordToolbarV2131(){
  return `<div class="office-word-toolbar-v2131 office-word-toolbar-v2136">
    <div class="office-word-mode-tabs-v2131">
      <button id="officeWordMobileBtnV2131" class="active" type="button" onclick="officeSetWordModeV2131('mobile')">✓ Vista estable</button>
      <button id="officeWordDirectBtnV2131" type="button" onclick="officeSetWordModeV2131('document')">📄 Original</button>
      <button id="officeWordEditBtnV2131" type="button" onclick="officeSetWordModeV2131('edit')">✎ Editar</button>
    </div>
    <div class="office-word-actions-v2131">
      <button type="button" onclick="officeReaderStartV2136()">🔊 Escuchar</button>
      <button type="button" onclick="officeCopyWordV2131()">⧉ Copiar</button>
      <button type="button" onclick="officeSaveWordCopyV2131()">↓ Guardar copia</button>
    </div>
  </div>`;
}

officeRenderDocxV2128=async function officeRenderDocxV2136(file,head){
  let buffer=officeCurrentBytesV2131;
  if(!buffer){buffer=await officeReadBytesV2131(file);officeCurrentBytesV2131=officeArrayBufferCopyV2131(buffer)}
  officeWordModeV2131='mobile';officeWordFontV2130=18;officeCurrentDocxHtmlV2131='';
  officeSetBodyV2128(`${head}${officeWordToolbarV2131()}
    <div class="office-word-note-v2128 office-word-note-v2131 office-word-note-v2136">
      <b>Vista estable</b> · Prioriza lectura correcta, imágenes y tablas adaptadas al celular. Si necesita comprobar el diseño exacto del Word, use “Original”.
    </div>
    <div id="officeWordStageV2131" class="office-word-stage-v2131">
      <div class="office-loading-v2128"><span></span><b>Estabilizando Word…</b></div>
    </div>`);
  await officeSetWordModeV2131('mobile');
};

const officeSetWordModeBaseV2136=officeSetWordModeV2131;
officeSetWordModeV2131=async function officeSetWordModeStableV2136(mode){
  officeReaderStopV2136(false);
  await officeSetWordModeBaseV2136(mode);
  const article=document.getElementById('officeWordV2128');
  if(article){
    article.classList.add('office-word-stable-v2136');
    article.querySelectorAll('img').forEach(img=>{img.loading='lazy';img.classList.add('office-doc-image-v2136')});
    article.querySelectorAll('table').forEach(table=>table.classList.add('office-doc-table-v2136'));
  }
  if(mode==='mobile'){
    officeInjectReaderV2136();
  }
  if(mode==='edit'){
    officeInjectDictationV2136('officeWordV2128');
  }
  if(mode==='document'){
    const stage=document.getElementById('officeWordStageV2131');
    if(stage&&!stage.querySelector('.office-original-warning-v2136')){
      stage.insertAdjacentHTML('afterbegin','<div class="office-original-warning-v2136">Si observa letras montadas o saltos extraños, vuelva a <b>Vista estable</b>.</div>');
    }
  }
};

function officeInjectReaderV2136(){
  const stage=document.getElementById('officeWordStageV2131');
  const article=document.getElementById('officeWordV2128');
  if(!stage||!article||stage.querySelector('.office-reader-v2136'))return;
  const bar=document.createElement('div');
  bar.className='office-reader-v2136';
  bar.innerHTML=`<button type="button" onclick="officeReaderStartV2136()">▶ Leer</button>
    <button type="button" onclick="officeReaderPauseV2136()">⏯ Pausa</button>
    <button type="button" onclick="officeReaderStopV2136()">■ Detener</button>
    <label>Velocidad <select id="officeReaderRateV2136" onchange="officeReaderRateV2136(this.value)">
      <option value=".8">0.8×</option><option value="1" selected>1×</option><option value="1.15">1.15×</option><option value="1.3">1.3×</option><option value="1.5">1.5×</option>
    </select></label>
    <span id="officeReaderStatusV2136">Listo</span>`;
  article.before(bar);
}
function officeReaderTextV2136(){
  const live=document.getElementById('officeWordV2128');
  if(live)return (live.innerText||live.textContent||'').replace(/\s+/g,' ').trim();
  return '';
}
function officeReaderChunksV2136(text){
  const sentences=(text.match(/[^.!?;:]+[.!?;:]?|[^.!?;:]+$/g)||[text]).map(x=>x.trim()).filter(Boolean);
  const chunks=[];let current='';
  for(const sentence of sentences){
    if((current+' '+sentence).length>700&&current){chunks.push(current);current=sentence}
    else current=(current+' '+sentence).trim();
  }
  if(current)chunks.push(current);return chunks;
}
function officeReaderRateV2136(value){
  officeReaderV2136.rate=Math.max(.6,Math.min(2,Number(value)||1));
  if(officeReaderV2136.playing){officeReaderStopV2136(false);officeReaderStartV2136()}
}
function officeReaderStatusV2136(text){
  const el=document.getElementById('officeReaderStatusV2136');if(el)el.textContent=text;
}
function officeReaderSetupMediaV2136(){
  if(!('mediaSession' in navigator))return;
  try{
    navigator.mediaSession.metadata=new MediaMetadata({
      title:officeCurrentFileV2128?.name||'Lectura de documento',
      artist:'Agenda Policial · Office Offline',
      album:'Lectura por voz'
    });
    navigator.mediaSession.setActionHandler('play',()=>officeReaderPauseV2136(true));
    navigator.mediaSession.setActionHandler('pause',()=>officeReaderPauseV2136(false));
    navigator.mediaSession.setActionHandler('stop',()=>officeReaderStopV2136());
  }catch{}
}
function officeReaderStartV2136(){
  if(!('speechSynthesis' in window)||!window.SpeechSynthesisUtterance)return toast('La lectura por voz no está disponible en este dispositivo');
  if(officeReaderV2136.paused){speechSynthesis.resume();officeReaderV2136.paused=false;officeReaderV2136.playing=true;officeReaderStatusV2136('Reproduciendo');try{navigator.mediaSession.playbackState='playing'}catch{};return}
  const text=officeReaderTextV2136();if(!text)return toast('No hay texto legible para reproducir');
  speechSynthesis.cancel();
  officeReaderV2136.chunks=officeReaderChunksV2136(text);officeReaderV2136.index=0;officeReaderV2136.playing=true;officeReaderV2136.paused=false;
  officeReaderSetupMediaV2136();officeReaderSpeakNextV2136();
}
function officeReaderSpeakNextV2136(){
  if(!officeReaderV2136.playing)return;
  if(officeReaderV2136.index>=officeReaderV2136.chunks.length){officeReaderStopV2136(false);officeReaderStatusV2136('Finalizado');return}
  const u=new SpeechSynthesisUtterance(officeReaderV2136.chunks[officeReaderV2136.index]);
  u.lang='es-BO';u.rate=officeReaderV2136.rate;
  u.onstart=()=>{officeReaderStatusV2136(`Leyendo ${officeReaderV2136.index+1}/${officeReaderV2136.chunks.length}`);try{navigator.mediaSession.playbackState='playing'}catch{}};
  u.onend=()=>{if(officeReaderV2136.playing){officeReaderV2136.index++;officeReaderSpeakNextV2136()}};
  u.onerror=()=>{if(officeReaderV2136.playing){officeReaderV2136.index++;officeReaderSpeakNextV2136()}};
  speechSynthesis.speak(u);
}
function officeReaderPauseV2136(forcePlay=null){
  if(!('speechSynthesis' in window))return;
  if(forcePlay===true){speechSynthesis.resume();officeReaderV2136.paused=false;officeReaderV2136.playing=true;officeReaderStatusV2136('Reproduciendo');try{navigator.mediaSession.playbackState='playing'}catch{};return}
  if(forcePlay===false||!officeReaderV2136.paused){speechSynthesis.pause();officeReaderV2136.paused=true;officeReaderStatusV2136('En pausa');try{navigator.mediaSession.playbackState='paused'}catch{}}
  else{speechSynthesis.resume();officeReaderV2136.paused=false;officeReaderStatusV2136('Reproduciendo');try{navigator.mediaSession.playbackState='playing'}catch{}}
}
function officeReaderStopV2136(show=true){
  try{speechSynthesis.cancel()}catch{}
  officeReaderV2136.playing=false;officeReaderV2136.paused=false;officeReaderV2136.index=0;
  if(show)officeReaderStatusV2136('Detenido');
  try{navigator.mediaSession.playbackState='none'}catch{}
}

function officeInsertDictationTextV2136(target,text){
  target.focus();
  const sel=window.getSelection();
  if(!sel||!sel.rangeCount||!target.contains(sel.anchorNode)){
    const range=document.createRange();range.selectNodeContents(target);range.collapse(false);sel?.removeAllRanges();sel?.addRange(range);
  }
  try{document.execCommand('insertText',false,text+' ')}
  catch{target.append(document.createTextNode(text+' '))}
}
function officeInjectDictationV2136(targetId){
  const target=document.getElementById(targetId);if(!target)return;
  const holder=target.parentElement;
  if(holder?.querySelector('.office-dictation-v2136'))return;
  const bar=document.createElement('div');bar.className='office-dictation-v2136';
  bar.innerHTML=`<button id="officeDictateBtnV2136" type="button" onclick="officeDictationToggleV2136('${targetId}')">🎙 Dictar</button><span id="officeDictationStatusV2136">Dictado en español · Bolivia</span>`;
  target.before(bar);
}
async function officeDictationToggleV2136(targetId){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR)return toast('Este navegador no admite dictado directo. Puede usar el micrófono del teclado del celular.');
  if(officeDictationV2136){try{officeDictationV2136.stop()}catch{};officeDictationV2136=null;return}
  const target=document.getElementById(targetId);if(!target)return;
  officeDictationTargetV2136=target;
  const rec=new SR();officeDictationV2136=rec;rec.lang='es-BO';rec.continuous=true;rec.interimResults=false;rec.maxAlternatives=1;
  const status=document.getElementById('officeDictationStatusV2136'),btn=document.getElementById('officeDictateBtnV2136');
  rec.onstart=()=>{if(status)status.textContent='Escuchando…';if(btn)btn.textContent='⏹ Detener dictado'};
  rec.onresult=e=>{let text='';for(let i=e.resultIndex;i<e.results.length;i++)if(e.results[i].isFinal)text+=e.results[i][0].transcript;if(text)officeInsertDictationTextV2136(target,text.trim())};
  rec.onerror=e=>{if(status)status.textContent=e.error==='not-allowed'?'Permiso de micrófono denegado':`Dictado: ${e.error}`};
  rec.onend=()=>{officeDictationV2136=null;if(status)status.textContent='Dictado detenido';if(btn)btn.textContent='🎙 Dictar'};
  // Prefer on-device dictation when current Chromium exposes the API and pack is available.
  try{
    if('processLocally' in rec && typeof SR.available==='function'){
      const opts={langs:['es-BO'],processLocally:true,quality:'dictation'};
      const availability=await SR.available(opts);
      if(availability==='available'){rec.processLocally=true}
      else if((availability==='downloadable'||availability==='downloading')&&typeof SR.install==='function'){
        if(status)status.textContent='Preparando dictado offline…';
        const ok=await SR.install(opts);if(ok)rec.processLocally=true;
      }
    }
  }catch{}
  try{rec.start()}catch(error){officeDictationV2136=null;toast('No se pudo iniciar el dictado')}
}

const officeCreateDocumentBaseV2136=officeCreateDocumentV2134;
officeCreateDocumentV2134=function officeCreateDocumentWithDictationV2136(){
  officeCreateDocumentBaseV2136();
  setTimeout(()=>{
    const toolbar=document.querySelector('.office-editor-toolbar-v2134');
    if(toolbar&&!toolbar.querySelector('.office-create-dictate-v2136')){
      const b=document.createElement('button');b.type='button';b.className='office-create-dictate-v2136';b.textContent='🎙 Dictar';
      b.onclick=()=>officeDictationToggleV2136('officeEditorV2134');toolbar.appendChild(b);
    }
    officeInjectDictationV2136('officeEditorV2134');
  },50);
};

const closeModalBaseV2136=closeModal;
closeModal=function closeModalV2136(){
  officeReaderStopV2136(false);
  if(officeDictationV2136){try{officeDictationV2136.stop()}catch{};officeDictationV2136=null}
  return closeModalBaseV2136();
};


/* =========================================================
   Agenda Policial v2.13.7 — Office Word funcional profundo
   - Editor común para documento nuevo y DOCX importado
   - Formato esencial, imágenes, márgenes y saltos
   - Exportación DOCX y PDF sin marca de agua
   ========================================================= */
let officePageV2137={size:'A4',orientation:'portrait',marginTop:20,marginRight:20,marginBottom:20,marginLeft:20};
let officeEditorNameV2137='Documento';
let officeImageInputV2137=null;

function officeEditorToolbarV2137(targetId){
  return `<div class="office-editor-pro-v2137">
    <div class="office-editor-row-v2137">
      <button type="button" title="Deshacer" onclick="officeCmdV2137('${targetId}','undo')">↶</button>
      <button type="button" title="Rehacer" onclick="officeCmdV2137('${targetId}','redo')">↷</button>
      <button type="button" onclick="officeCmdV2137('${targetId}','bold')"><b>B</b></button>
      <button type="button" onclick="officeCmdV2137('${targetId}','italic')"><i>I</i></button>
      <button type="button" onclick="officeCmdV2137('${targetId}','underline')"><u>U</u></button>
      <button type="button" title="Alinear izquierda" onclick="officeCmdV2137('${targetId}','justifyLeft')">≡←</button>
      <button type="button" title="Centrar" onclick="officeCmdV2137('${targetId}','justifyCenter')">≡</button>
      <button type="button" title="Justificar" onclick="officeCmdV2137('${targetId}','justifyFull')">☰</button>
      <button type="button" title="Alinear derecha" onclick="officeCmdV2137('${targetId}','justifyRight')">→≡</button>
      <button type="button" onclick="officeCmdV2137('${targetId}','insertUnorderedList')">• Lista</button>
      <button type="button" onclick="officeCmdV2137('${targetId}','insertOrderedList')">1. Lista</button>
    </div>
    <div class="office-editor-row-v2137">
      <label>Estilo<select onchange="officeFormatBlockV2137('${targetId}',this.value)">
        <option value="p">Texto</option><option value="h1">Título 1</option><option value="h2">Título 2</option><option value="h3">Título 3</option>
      </select></label>
      <label>Tamaño<select onchange="officeFontSizeV2137('${targetId}',this.value)">
        <option value="10">10</option><option value="11">11</option><option value="12" selected>12</option><option value="14">14</option><option value="16">16</option><option value="18">18</option><option value="20">20</option><option value="24">24</option>
      </select></label>
      <label>Interlineado<select onchange="officeLineHeightV2137('${targetId}',this.value)">
        <option value="1">1.0</option><option value="1.15" selected>1.15</option><option value="1.5">1.5</option><option value="2">2.0</option>
      </select></label>
      <button type="button" onclick="officeInsertImageV2137('${targetId}')">🖼 Imagen</button>
      <button type="button" onclick="officeInsertPageBreakV2137('${targetId}')">↵ Salto pág.</button>
      <button type="button" onclick="officeDictationToggleV2136('${targetId}')">🎙 Dictar</button>
    </div>
  </div>`;
}
function officeCmdV2137(targetId,cmd){
  const target=document.getElementById(targetId);if(!target)return;target.focus();
  try{document.execCommand(cmd,false,null)}catch{}
}
function officeFormatBlockV2137(targetId,tag){
  const target=document.getElementById(targetId);if(!target)return;target.focus();
  try{document.execCommand('formatBlock',false,tag||'p')}catch{}
}
function officeFontSizeV2137(targetId,px){
  const target=document.getElementById(targetId);if(!target)return;target.focus();
  try{
    document.execCommand('fontSize',false,'7');
    target.querySelectorAll('font[size="7"]').forEach(el=>{el.removeAttribute('size');el.style.fontSize=`${Number(px)||12}pt`});
  }catch{}
}
function officeLineHeightV2137(targetId,value){
  const target=document.getElementById(targetId);if(!target)return;
  const sel=window.getSelection();let node=sel?.anchorNode;
  if(node&&node.nodeType===3)node=node.parentElement;
  const block=node?.closest?.('p,div,li,h1,h2,h3,td')||target;
  if(target.contains(block))block.style.lineHeight=String(value||1.15);
}
function officeInsertPageBreakV2137(targetId){
  const target=document.getElementById(targetId);if(!target)return;target.focus();
  const html='<div class="office-page-break-v2137" contenteditable="false"><span>Salto de página</span></div><p><br></p>';
  try{document.execCommand('insertHTML',false,html)}catch{target.insertAdjacentHTML('beforeend',html)}
}
function officeInsertImageV2137(targetId){
  const old=document.getElementById('officeImageInputV2137');if(old)old.remove();
  const input=document.createElement('input');input.type='file';input.accept='image/*';input.id='officeImageInputV2137';input.hidden=true;
  input.onchange=()=>{const file=input.files?.[0];if(!file)return;const rd=new FileReader();rd.onload=()=>officePlaceImageV2137(targetId,rd.result,file.name);rd.readAsDataURL(file)};
  document.body.appendChild(input);input.click();
}
function officePlaceImageV2137(targetId,dataUrl,name='imagen'){
  const target=document.getElementById(targetId);if(!target)return;target.focus();
  const html=`<figure class="office-image-block-v2137"><img src="${dataUrl}" alt="${esc(name)}" style="max-width:100%;height:auto"><figcaption contenteditable="true"></figcaption></figure><p><br></p>`;
  try{document.execCommand('insertHTML',false,html)}catch{target.insertAdjacentHTML('beforeend',html)}
}
function officePagePanelV2137(){
  return `<div class="office-page-panel-v2137">
    <label>Hoja<select id="officePageSizeV2137" onchange="officeApplyPageV2137()"><option value="A4">A4 · 210×297 mm</option><option value="OFICIO">Oficio · 216×330 mm</option></select></label>
    <label>Orientación<select id="officePageOrientationV2137" onchange="officeApplyPageV2137()"><option value="portrait">Vertical</option><option value="landscape">Horizontal</option></select></label>
    <label>Margen sup.<input id="officeMarginTopV2137" type="number" min="5" max="40" value="20" onchange="officeApplyPageV2137()"></label>
    <label>Margen der.<input id="officeMarginRightV2137" type="number" min="5" max="40" value="20" onchange="officeApplyPageV2137()"></label>
    <label>Margen inf.<input id="officeMarginBottomV2137" type="number" min="5" max="40" value="20" onchange="officeApplyPageV2137()"></label>
    <label>Margen izq.<input id="officeMarginLeftV2137" type="number" min="5" max="40" value="20" onchange="officeApplyPageV2137()"></label>
  </div>`;
}
function officeApplyPageV2137(){
  officePageV2137={
    size:document.getElementById('officePageSizeV2137')?.value||officePageV2137.size||'A4',
    orientation:document.getElementById('officePageOrientationV2137')?.value||officePageV2137.orientation||'portrait',
    marginTop:Number(document.getElementById('officeMarginTopV2137')?.value||20),
    marginRight:Number(document.getElementById('officeMarginRightV2137')?.value||20),
    marginBottom:Number(document.getElementById('officeMarginBottomV2137')?.value||20),
    marginLeft:Number(document.getElementById('officeMarginLeftV2137')?.value||20)
  };
  document.querySelectorAll('.office-editor-page-v2137').forEach(page=>{
    page.classList.toggle('oficio',officePageV2137.size==='OFICIO');
    page.classList.toggle('landscape',officePageV2137.orientation==='landscape');
    page.style.padding=`${officePageV2137.marginTop}mm ${officePageV2137.marginRight}mm ${officePageV2137.marginBottom}mm ${officePageV2137.marginLeft}mm`;
  });
}
function officeEditorActionsV2137(targetId,nameGetter){
  return `<div class="office-editor-actions-v2137">
    <button type="button" onclick="officeSaveHtmlEditorV2137('${targetId}','${nameGetter}')">💾 Copia HTML</button>
    <button type="button" onclick="officeExportDocxV2137('${targetId}','${nameGetter}')">📘 Guardar DOCX</button>
    <button class="primary" type="button" onclick="officeExportPdfV2137('${targetId}','${nameGetter}')">📄 Exportar PDF</button>
  </div>`;
}
function officeDocNameV2137(inputId='officeDocNameV2137'){
  return (document.getElementById(inputId)?.value||officeCurrentFileV2128?.name?.replace(/\.docx$/i,'')||'Documento').trim()||'Documento';
}
function officeCleanFileNameV2137(name){return String(name||'Documento').replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,' ').trim()||'Documento'}
function officeSaveHtmlEditorV2137(targetId,nameInputId){
  const ed=document.getElementById(targetId);if(!ed)return;
  const name=officeCleanFileNameV2137(officeDocNameV2137(nameInputId));
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>${esc(name)}</title></head><body>${ed.innerHTML}</body></html>`;
  const blob=new Blob([html],{type:'text/html;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${name}.html`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);toast('Copia HTML guardada');
}

function officeEscapeXmlV2137(text){return String(text??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;')}
function officeTwipsV2137(mm){return Math.round(Number(mm||0)*56.692913)}
function officeDocxParagraphXmlV2137(node){
  const tag=(node.tagName||'P').toLowerCase(),style=tag==='h1'?'Title':tag==='h2'?'Heading1':tag==='h3'?'Heading2':'Normal';
  const align=(node.style?.textAlign||'').toLowerCase();let jc='';if(['center','right','justify'].includes(align))jc=`<w:jc w:val="${align==='justify'?'both':align}"/>`;
  const spacing=node.style?.lineHeight?`<w:spacing w:line="${Math.round(parseFloat(node.style.lineHeight)*240)}" w:lineRule="auto"/>`:'';
  const runs=[];
  function walk(n,fmt={}){
    if(n.nodeType===3){const text=n.nodeValue||'';if(text)runs.push({text,fmt});return}
    if(n.nodeType!==1)return;
    const t=n.tagName.toLowerCase();
    const next={...fmt};
    if(t==='b'||t==='strong')next.bold=true;if(t==='i'||t==='em')next.italic=true;if(t==='u')next.underline=true;
    if(n.style?.fontSize)next.size=Math.max(8,Math.min(72,Math.round(parseFloat(n.style.fontSize)*2)));
    if(t==='br'){runs.push({text:'\n',fmt:next});return}
    [...n.childNodes].forEach(ch=>walk(ch,next));
  }
  walk(node,{});
  const runXml=runs.map(r=>{
    if(r.text==='\n')return '<w:r><w:br/></w:r>';
    const props=`${r.fmt.bold?'<w:b/>':''}${r.fmt.italic?'<w:i/>':''}${r.fmt.underline?'<w:u w:val="single"/>':''}${r.fmt.size?`<w:sz w:val="${r.fmt.size}"/><w:szCs w:val="${r.fmt.size}"/>`:''}`;
    return `<w:r>${props?`<w:rPr>${props}</w:rPr>`:''}<w:t xml:space="preserve">${officeEscapeXmlV2137(r.text)}</w:t></w:r>`;
  }).join('');
  return `<w:p><w:pPr><w:pStyle w:val="${style}"/>${jc}${spacing}</w:pPr>${runXml||'<w:r><w:t></w:t></w:r>'}</w:p>`;
}
async function officeExportDocxV2137(targetId,nameInputId){
  const ed=document.getElementById(targetId);if(!ed)return;
  try{
    await officeLoadScriptV2128(OFFICE_JSZIP_V2128,'JSZip');if(!window.JSZip)throw new Error('Componente DOCX no disponible');
    const zip=new JSZip(),name=officeCleanFileNameV2137(officeDocNameV2137(nameInputId));
    const bodyNodes=[...ed.childNodes].filter(n=>n.nodeType===1||String(n.textContent||'').trim());
    let body='';
    for(const node of bodyNodes){
      if(node.nodeType===1&&node.classList?.contains('office-page-break-v2137')){body+='<w:p><w:r><w:br w:type="page"/></w:r></w:p>';continue}
      if(node.nodeType===1&&node.tagName.toLowerCase()==='figure'){
        // Image export is deliberately retained visually in HTML/PDF. In DOCX v2.13.7 add a placeholder line to avoid corrupting the file.
        const caption=node.querySelector('figcaption')?.textContent?.trim()||'Imagen adjunta';
        body+=`<w:p><w:r><w:t>[${officeEscapeXmlV2137(caption||'Imagen')}]</w:t></w:r></w:p>`;continue
      }
      if(node.nodeType===1&&(node.tagName==='UL'||node.tagName==='OL')){
        [...node.children].forEach(li=>{body+=officeDocxParagraphXmlV2137(li)});continue
      }
      body+=officeDocxParagraphXmlV2137(node.nodeType===1?node:Object.assign(document.createElement('p'),{textContent:node.textContent||''}));
    }
    const isLandscape=officePageV2137.orientation==='landscape',baseW=officePageV2137.size==='OFICIO'?12240:11906,baseH=officePageV2137.size==='OFICIO'?18709:16838;
    const pgW=isLandscape?baseH:baseW,pgH=isLandscape?baseW:baseH;
    const sect=`<w:sectPr><w:pgSz w:w="${pgW}" w:h="${pgH}"${isLandscape?' w:orient="landscape"':''}/><w:pgMar w:top="${officeTwipsV2137(officePageV2137.marginTop)}" w:right="${officeTwipsV2137(officePageV2137.marginRight)}" w:bottom="${officeTwipsV2137(officePageV2137.marginBottom)}" w:left="${officeTwipsV2137(officePageV2137.marginLeft)}" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>`;
    zip.file('[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`);
    zip.folder('_rels').file('.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
    zip.folder('word').file('document.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}${sect}</w:body></w:document>`);
    zip.folder('word').file('styles.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="36"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="Heading 1"/><w:rPr><w:b/><w:sz w:val="30"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="Heading 2"/><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style></w:styles>`);
    zip.folder('word').folder('_rels').file('document.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`);
    const blob=await zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${name}.docx`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1800);toast('DOCX generado');
  }catch(error){console.error(error);toast(error?.message||'No se pudo generar DOCX')}
}
function officeExportPdfV2137(targetId,nameInputId){
  const ed=document.getElementById(targetId);if(!ed)return;
  const name=officeCleanFileNameV2137(officeDocNameV2137(nameInputId));
  const base=officePageV2137.size==='OFICIO'?'216mm 330mm':'210mm 297mm';
  const page=officePageV2137.orientation==='landscape'?base.split(' ').reverse().join(' '):base;
  const w=window.open('','_blank');if(!w)return toast('Permita ventanas emergentes para exportar PDF');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(name)}</title><style>@page{size:${page};margin:${officePageV2137.marginTop}mm ${officePageV2137.marginRight}mm ${officePageV2137.marginBottom}mm ${officePageV2137.marginLeft}mm}html,body{margin:0;padding:0;font-family:Arial,sans-serif;font-size:12pt;line-height:1.35;color:#111}img{max-width:100%;height:auto}.office-page-break-v2137{break-before:page;page-break-before:always;height:0}.office-page-break-v2137 span{display:none}figure{margin:8px 0;text-align:center}figcaption{font-size:9pt;color:#555}table{border-collapse:collapse;max-width:100%}td,th{vertical-align:top}</style></head><body>${ed.innerHTML}<script>onload=()=>setTimeout(()=>print(),300)<\/script></body></html>`);
  w.document.close();
}

officeCreateDocumentV2134=function officeCreateDocumentV2137(){
  officePageV2137={size:'A4',orientation:'portrait',marginTop:20,marginRight:20,marginBottom:20,marginLeft:20};
  officeSetBodyV2128(`<section class="office-create-shell-v2134 office-create-shell-v2137">
    <div class="office-create-head-v2134"><div><span class="eyebrow">Nuevo documento</span><h3>Word offline</h3><p>Documento profesional · A4 u Oficio</p></div><button type="button" onclick="openOfficeCenterV2128()">← Volver</button></div>
    <label class="office-doc-name-v2137">Nombre<input id="officeDocNameV2137" value="Documento"></label>
    ${officePagePanelV2137()}
    ${officeEditorToolbarV2137('officeEditorV2137')}
    <div class="office-paper-wrap-v2134"><article id="officeEditorV2137" class="office-paper-v2134 office-editor-page-v2137 a4 portrait" contenteditable="true"><p><br></p></article></div>
    ${officeEditorActionsV2137('officeEditorV2137','officeDocNameV2137')}
    <p class="office-create-note-v2134">Puede insertar imágenes, dictar, usar saltos de página y exportar a DOCX o PDF. Todo el trabajo permanece en el dispositivo.</p>
  </section>`);
  setTimeout(()=>{officeApplyPageV2137();document.getElementById('officeEditorV2137')?.focus()},70);
};

const officeSetWordModeBaseV2137=officeSetWordModeV2131;
officeSetWordModeV2131=async function officeSetWordModeV2137(mode){
  await officeSetWordModeBaseV2137(mode);
  if(mode!=='edit')return;
  const stage=document.getElementById('officeWordStageV2131'),editor=document.getElementById('officeWordV2128');if(!stage||!editor)return;
  editor.id='officeImportedEditorV2137';editor.classList.add('office-editor-page-v2137');
  editor.contentEditable='true';
  const name=(officeCurrentFileV2128?.name||'Documento.docx').replace(/\.docx$/i,'');
  officePageV2137={size:'A4',orientation:'portrait',marginTop:20,marginRight:20,marginBottom:20,marginLeft:20};
  stage.innerHTML=`<div class="office-import-edit-v2137">
    <label class="office-doc-name-v2137">Nombre<input id="officeImportedNameV2137" value="${esc(name)}"></label>
    ${officePagePanelV2137()}
    ${officeEditorToolbarV2137('officeImportedEditorV2137')}
    <div class="office-paper-wrap-v2134"><article id="officeImportedEditorV2137" class="office-word-v2128 office-word-mobile-v2130 editing office-editor-page-v2137" contenteditable="true">${editor.innerHTML}</article></div>
    ${officeEditorActionsV2137('officeImportedEditorV2137','officeImportedNameV2137')}
    <p class="office-create-note-v2134">Se edita una copia del contenido. El archivo original no se sobrescribe.</p>
  </div>`;
  officeApplyPageV2137();
  document.getElementById('officeImportedEditorV2137')?.focus();
};



/* =========================================================
   Agenda Policial v2.13.8 — Office: imágenes DOCX + tablas + escáner base
   ========================================================= */
function officeDataUrlPartsV2138(src){
  const m=String(src||'').match(/^data:(image\/(?:png|jpeg|jpg));base64,(.+)$/i);if(!m)return null;
  const mime=m[1].toLowerCase().replace('image/jpg','image/jpeg'),ext=mime==='image/png'?'png':'jpg';
  return {mime,ext,b64:m[2]};
}
async function officeImageSizeV2138(src){
  return await new Promise(resolve=>{const im=new Image();im.onload=()=>resolve({w:im.naturalWidth||800,h:im.naturalHeight||600});im.onerror=()=>resolve({w:800,h:600});im.src=src});
}
function officeDocxImageXmlV2138(rId,cx,cy,id,name){
  return `<w:p><w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="${officeEscapeXmlV2137(name)}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="${officeEscapeXmlV2137(name)}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
}
function officeTableXmlV2138(table){
  const rows=[...table.rows];if(!rows.length)return '';
  return `<w:tbl><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:color="888888"/><w:left w:val="single" w:sz="4" w:color="888888"/><w:bottom w:val="single" w:sz="4" w:color="888888"/><w:right w:val="single" w:sz="4" w:color="888888"/><w:insideH w:val="single" w:sz="4" w:color="AAAAAA"/><w:insideV w:val="single" w:sz="4" w:color="AAAAAA"/></w:tblBorders></w:tblPr>${rows.map(row=>`<w:tr>${[...row.cells].map(cell=>`<w:tc><w:tcPr/><w:p><w:r><w:t xml:space="preserve">${officeEscapeXmlV2137(cell.innerText||cell.textContent||'')}</w:t></w:r></w:p></w:tc>`).join('')}</w:tr>`).join('')}</w:tbl>`;
}
function officeInsertTableV2138(targetId){
  const target=document.getElementById(targetId);if(!target)return;
  const rows=Math.max(1,Math.min(10,Number(prompt('Número de filas','3'))||3)),cols=Math.max(1,Math.min(8,Number(prompt('Número de columnas','2'))||2));
  let html='<table class="office-table-edit-v2138"><tbody>';for(let r=0;r<rows;r++){html+='<tr>';for(let c=0;c<cols;c++)html+='<td><br></td>';html+='</tr>'}html+='</tbody></table><p><br></p>';
  target.focus();try{document.execCommand('insertHTML',false,html)}catch{target.insertAdjacentHTML('beforeend',html)}
}
function officeInsertSignatureLineV2138(targetId){
  const target=document.getElementById(targetId);if(!target)return;target.focus();
  const html='<div class="office-signature-line-v2138"><div></div><span>Firma y sello</span></div><p><br></p>';
  try{document.execCommand('insertHTML',false,html)}catch{target.insertAdjacentHTML('beforeend',html)}
}
const officeEditorToolbarBaseV2138=officeEditorToolbarV2137;
officeEditorToolbarV2137=function officeEditorToolbarV2138(targetId){
  const html=officeEditorToolbarBaseV2138(targetId);
  return html.replace('</div>\n  </div>',`<button type="button" onclick="officeInsertTableV2138('${targetId}')">▦ Tabla</button><button type="button" onclick="officeInsertSignatureLineV2138('${targetId}')">✍ Firma</button></div>\n  </div>`);
}

/* DOCX v2.13.8: imágenes embebidas + tablas simples */
officeExportDocxV2137=async function officeExportDocxV2138(targetId,nameInputId){
  const ed=document.getElementById(targetId);if(!ed)return;
  try{
    await officeLoadScriptV2128(OFFICE_JSZIP_V2128,'JSZip');if(!window.JSZip)throw new Error('Componente DOCX no disponible');
    const zip=new JSZip(),name=officeCleanFileNameV2137(officeDocNameV2137(nameInputId)),rels=[],media=[],contentDefaults=new Set(),nodes=[...ed.childNodes];
    let body='',imageId=1;
    for(const node of nodes){
      if(node.nodeType!==1){if(String(node.textContent||'').trim()){const p=document.createElement('p');p.textContent=node.textContent;body+=officeDocxParagraphXmlV2137(p)}continue}
      if(node.classList?.contains('office-page-break-v2137')){body+='<w:p><w:r><w:br w:type="page"/></w:r></w:p>';continue}
      if(node.tagName==='TABLE'){body+=officeTableXmlV2138(node);continue}
      if(node.classList?.contains('office-signature-line-v2138')){body+='<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>______________________________</w:t></w:r></w:p><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>Firma y sello</w:t></w:r></w:p>';continue}
      const img=node.tagName==='FIGURE'?node.querySelector('img'):(node.tagName==='IMG'?node:null);
      if(img){
        const parts=officeDataUrlPartsV2138(img.src);
        if(parts){
          const rid=`rIdImg${imageId}`,fname=`image${imageId}.${parts.ext}`,size=await officeImageSizeV2138(img.src),maxW=5486400,ratio=size.h/size.w,cx=maxW,cy=Math.round(maxW*ratio);
          media.push({fname,b64:parts.b64});rels.push({rid,fname});contentDefaults.add(parts.ext);
          body+=officeDocxImageXmlV2138(rid,cx,cy,imageId,fname);imageId++;continue;
        }
      }
      if(node.tagName==='UL'||node.tagName==='OL'){[...node.children].forEach(li=>body+=officeDocxParagraphXmlV2137(li));continue}
      body+=officeDocxParagraphXmlV2137(node);
    }
    const land=officePageV2137.orientation==='landscape',bw=officePageV2137.size==='OFICIO'?12240:11906,bh=officePageV2137.size==='OFICIO'?18709:16838,pgW=land?bh:bw,pgH=land?bw:bh;
    const sect=`<w:sectPr><w:pgSz w:w="${pgW}" w:h="${pgH}"${land?' w:orient="landscape"':''}/><w:pgMar w:top="${officeTwipsV2137(officePageV2137.marginTop)}" w:right="${officeTwipsV2137(officePageV2137.marginRight)}" w:bottom="${officeTwipsV2137(officePageV2137.marginBottom)}" w:left="${officeTwipsV2137(officePageV2137.marginLeft)}" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>`;
    const defaults=[...contentDefaults].map(ext=>`<Default Extension="${ext}" ContentType="${ext==='png'?'image/png':'image/jpeg'}"/>`).join('');
    zip.file('[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${defaults}<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`);
    zip.folder('_rels').file('.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
    const word=zip.folder('word');word.file('document.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}${sect}</w:body></w:document>`);
    word.file('styles.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="24"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="36"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="Heading 1"/><w:rPr><w:b/><w:sz w:val="30"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="Heading 2"/><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style></w:styles>`);
    word.folder('_rels').file('document.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.map(r=>`<Relationship Id="${r.rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${r.fname}"/>`).join('')}</Relationships>`);
    const mediaFolder=word.folder('media');media.forEach(m=>mediaFolder.file(m.fname,m.b64,{base64:true}));
    const blob=await zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${name}.docx`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1800);toast(`DOCX generado${media.length?` · ${media.length} imagen(es)`:''}`);
  }catch(error){console.error(error);toast(error?.message||'No se pudo generar DOCX')}
}

/* Escáner documental base: cámara/galería, recorte manual por CSS y filtros */
let officeScanV2138={pages:[]};
function officeScannerOpenV2138(){
  officeScanV2138={pages:[]};
  officeSetBodyV2128(`<section class="office-scanner-v2138"><div class="office-create-head-v2134"><div><span class="eyebrow">Office offline</span><h3>Escáner documental</h3><p>Cámara · contraste · varias páginas · PDF</p></div><button type="button" onclick="openOfficeCenterV2128()">← Volver</button></div>
  <div class="office-scan-actions-v2138"><button type="button" onclick="officeScanCaptureV2138(true)">📷 Cámara</button><button type="button" onclick="officeScanCaptureV2138(false)">🖼 Galería</button><button type="button" onclick="officeScanPdfV2138()">📄 Generar PDF</button></div>
  <div class="office-scan-filters-v2138"><label>Mejora<select id="officeScanFilterV2138"><option value="normal">Original</option><option value="contrast">Mejorar contraste</option><option value="gray">Escala de grises</option><option value="bw">Blanco y negro</option></select></label></div>
  <div id="officeScanPagesV2138" class="office-scan-pages-v2138"><div class="card small">Añada una o más páginas.</div></div></section>`);
}
function officeScanCaptureV2138(camera){
  const input=document.createElement('input');input.type='file';input.accept='image/*';if(camera)input.capture='environment';input.multiple=!camera;
  input.onchange=()=>[...(input.files||[])].forEach(file=>{const r=new FileReader();r.onload=()=>{officeScanV2138.pages.push({src:r.result,rotation:0});officeScanRenderV2138()};r.readAsDataURL(file)});input.click();
}
function officeScanRenderV2138(){
  const box=document.getElementById('officeScanPagesV2138');if(!box)return;
  box.innerHTML=officeScanV2138.pages.map((p,i)=>`<article class="office-scan-page-v2138"><div class="office-scan-num-v2138">${i+1}</div><img src="${p.src}" style="transform:rotate(${p.rotation||0}deg)" alt="Página ${i+1}"><div><button onclick="officeScanRotateV2138(${i})">↻ Girar</button><button onclick="officeScanRemoveV2138(${i})">Eliminar</button></div></article>`).join('')||'<div class="card small">Añada una o más páginas.</div>';
}
function officeScanRotateV2138(i){if(!officeScanV2138.pages[i])return;officeScanV2138.pages[i].rotation=((officeScanV2138.pages[i].rotation||0)+90)%360;officeScanRenderV2138()}
function officeScanRemoveV2138(i){officeScanV2138.pages.splice(i,1);officeScanRenderV2138()}
function officeScanFilterCssV2138(){
  const v=document.getElementById('officeScanFilterV2138')?.value||'normal';
  return v==='contrast'?'contrast(1.35) brightness(1.05)':v==='gray'?'grayscale(1) contrast(1.15)':v==='bw'?'grayscale(1) contrast(2.2) brightness(1.1)':'none';
}
function officeScanPdfV2138(){
  if(!officeScanV2138.pages.length)return toast('Primero escanee o agregue páginas');
  const filter=officeScanFilterCssV2138(),w=window.open('','_blank');if(!w)return toast('Permita ventanas emergentes para generar PDF');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Documento escaneado</title><style>@page{size:A4;margin:0}html,body{margin:0}.p{width:210mm;height:297mm;display:flex;align-items:center;justify-content:center;page-break-after:always;overflow:hidden;background:white}.p:last-child{page-break-after:auto}.p img{max-width:100%;max-height:100%;object-fit:contain;filter:${filter}}</style></head><body>${officeScanV2138.pages.map(p=>`<div class="p"><img src="${p.src}" style="transform:rotate(${p.rotation||0}deg)"></div>`).join('')}<script>onload=()=>setTimeout(()=>print(),500)<\/script></body></html>`);w.document.close();
}
const openOfficeCenterBaseV2138=openOfficeCenterV2128;
openOfficeCenterV2128=function openOfficeCenterV2138(){
  openOfficeCenterBaseV2138();
  setTimeout(()=>{
    const create=document.querySelector('.office-create-v2134');
    if(create&&!document.querySelector('.office-scanner-entry-v2138')){
      const b=document.createElement('div');b.className='office-scanner-entry-v2138';b.innerHTML='<button type="button" onclick="officeScannerOpenV2138()">📷 <b>Escáner documental</b><small>Cámara · multipágina · PDF</small></button>';create.after(b);
    }
  },30);
};


/* =========================================================
   Agenda Policial v2.13.9
   - Continuidad real de lectura + mini reproductor persistente
   - Escáner: reordenar, borrador y ajuste manual de 4 esquinas
   ========================================================= */
const OFFICE_READER_KEY_V2139='agenda_office_reader_v2139';
const OFFICE_SCAN_KEY_V2139='agenda_office_scan_draft_v2139';
let officeReaderSavedV2139=null;
let officeScannerCornerStateV2139=null;

function officeReaderLoadSavedV2139(){
  try{
    const raw=localStorage.getItem(OFFICE_READER_KEY_V2139);
    officeReaderSavedV2139=raw?JSON.parse(raw):null;
    if(officeReaderSavedV2139 && !Array.isArray(officeReaderSavedV2139.chunks)) officeReaderSavedV2139=null;
  }catch{officeReaderSavedV2139=null}
  return officeReaderSavedV2139;
}
function officeReaderSaveV2139(){
  try{
    const payload={
      title:officeCurrentFileV2128?.name||officeReaderSavedV2139?.title||'Documento',
      chunks:officeReaderV2136.chunks||[],
      index:Number(officeReaderV2136.index||0),
      rate:Number(officeReaderV2136.rate||1),
      updatedAt:new Date().toISOString()
    };
    if(payload.chunks.length){
      localStorage.setItem(OFFICE_READER_KEY_V2139,JSON.stringify(payload));
      officeReaderSavedV2139=payload;
    }
  }catch{}
  officeMiniPlayerRefreshV2139();
}
function officeReaderClearSavedV2139(){
  try{localStorage.removeItem(OFFICE_READER_KEY_V2139)}catch{}
  officeReaderSavedV2139=null;officeMiniPlayerRefreshV2139();
}
function officeReaderResumeSavedV2139(){
  const saved=officeReaderLoadSavedV2139();
  if(!saved?.chunks?.length)return toast('No existe una lectura pendiente');
  try{speechSynthesis.cancel()}catch{}
  officeReaderV2136.chunks=saved.chunks;
  officeReaderV2136.index=Math.max(0,Math.min(saved.chunks.length-1,Number(saved.index||0)));
  officeReaderV2136.rate=Number(saved.rate||1);
  officeReaderV2136.playing=true;officeReaderV2136.paused=false;
  officeReaderSavedV2139=saved;
  officeReaderSetupMediaV2136();
  officeReaderSpeakNextV2136();
  officeMiniPlayerRefreshV2139();
}
function officeReaderBackV2139(){
  const saved=officeReaderLoadSavedV2139();
  const chunks=officeReaderV2136.chunks?.length?officeReaderV2136.chunks:saved?.chunks||[];
  if(!chunks.length)return;
  try{speechSynthesis.cancel()}catch{}
  officeReaderV2136.chunks=chunks;
  officeReaderV2136.index=Math.max(0,(officeReaderV2136.index||saved?.index||0)-1);
  officeReaderV2136.playing=true;officeReaderV2136.paused=false;
  officeReaderSaveV2139();officeReaderSpeakNextV2136();
}
function officeReaderForwardV2139(){
  const saved=officeReaderLoadSavedV2139();
  const chunks=officeReaderV2136.chunks?.length?officeReaderV2136.chunks:saved?.chunks||[];
  if(!chunks.length)return;
  try{speechSynthesis.cancel()}catch{}
  officeReaderV2136.chunks=chunks;
  officeReaderV2136.index=Math.min(chunks.length-1,(officeReaderV2136.index||saved?.index||0)+1);
  officeReaderV2136.playing=true;officeReaderV2136.paused=false;
  officeReaderSaveV2139();officeReaderSpeakNextV2136();
}
function officeReaderProgressV2139(){
  const saved=officeReaderLoadSavedV2139();
  const chunks=officeReaderV2136.chunks?.length?officeReaderV2136.chunks:saved?.chunks||[];
  const idx=officeReaderV2136.playing||officeReaderV2136.paused?officeReaderV2136.index:(saved?.index||0);
  return chunks.length?`${Math.min(idx+1,chunks.length)}/${chunks.length}`:'';
}
function officeMiniPlayerHtmlV2139(){
  const saved=officeReaderLoadSavedV2139();
  const has=saved?.chunks?.length || officeReaderV2136.playing || officeReaderV2136.paused;
  if(!has)return '';
  const title=officeCurrentFileV2128?.name||saved?.title||'Lectura de documento';
  const paused=officeReaderV2136.paused;
  return `<aside id="officeMiniPlayerV2139" class="office-mini-player-v2139">
    <button class="office-mini-main-v2139" type="button" onclick="openOfficeCenterV2128()"><span>🔊</span><span><b>${esc(title)}</b><small>Continuar lectura · ${officeReaderProgressV2139()}</small></span></button>
    <div class="office-mini-controls-v2139">
      <button type="button" onclick="officeReaderBackV2139()" title="Anterior">⏮</button>
      <button type="button" onclick="${paused?'officeReaderResumeSavedV2139()':'officeReaderPauseV2136()'}" title="Pausa / continuar">${paused?'▶':'⏯'}</button>
      <button type="button" onclick="officeReaderForwardV2139()" title="Siguiente">⏭</button>
      <button type="button" onclick="officeReaderStopV2139()" title="Cerrar">✕</button>
    </div>
  </aside>`;
}
function officeMiniPlayerRefreshV2139(){
  const old=document.getElementById('officeMiniPlayerV2139');
  const html=officeMiniPlayerHtmlV2139();
  if(old){if(html){old.outerHTML=html}else old.remove();return}
  if(html)document.querySelector('.app')?.insertAdjacentHTML('beforeend',html);
}
const appShellBaseV2139=appShell;
appShell=function appShellV2139(content){
  const html=appShellBaseV2139(content);
  const mini=officeMiniPlayerHtmlV2139();
  return mini?html.replace('</div>',`</div>${mini}`,1):html;
};

const officeReaderStartBaseV2139=officeReaderStartV2136;
officeReaderStartV2136=function officeReaderStartPersistV2139(){
  officeReaderStartBaseV2139();
  setTimeout(()=>officeReaderSaveV2139(),50);
};
const officeReaderSpeakNextBaseV2139=officeReaderSpeakNextV2136;
officeReaderSpeakNextV2136=function officeReaderSpeakNextPersistV2139(){
  if(!officeReaderV2136.playing)return;
  if(officeReaderV2136.index>=officeReaderV2136.chunks.length){
    officeReaderSavedV2139={...(officeReaderSavedV2139||{}),chunks:officeReaderV2136.chunks,index:Math.max(0,officeReaderV2136.chunks.length-1),rate:officeReaderV2136.rate,title:officeCurrentFileV2128?.name||officeReaderSavedV2139?.title||'Documento'};
    officeReaderSaveV2139();
    officeReaderV2136.playing=false;officeReaderV2136.paused=false;
    officeReaderStatusV2136('Finalizado');officeMiniPlayerRefreshV2139();return;
  }
  officeReaderSaveV2139();
  const u=new SpeechSynthesisUtterance(officeReaderV2136.chunks[officeReaderV2136.index]);
  u.lang='es-BO';u.rate=officeReaderV2136.rate;
  u.onstart=()=>{officeReaderStatusV2136(`Leyendo ${officeReaderV2136.index+1}/${officeReaderV2136.chunks.length}`);officeReaderSaveV2139();try{navigator.mediaSession.playbackState='playing'}catch{}};
  u.onend=()=>{if(officeReaderV2136.playing){officeReaderV2136.index++;officeReaderSaveV2139();officeReaderSpeakNextV2136()}};
  u.onerror=()=>{if(officeReaderV2136.playing){officeReaderV2136.index++;officeReaderSaveV2139();officeReaderSpeakNextV2136()}};
  speechSynthesis.speak(u);
};
const officeReaderPauseBaseV2139=officeReaderPauseV2136;
officeReaderPauseV2136=function officeReaderPausePersistV2139(forcePlay=null){
  officeReaderPauseBaseV2139(forcePlay);officeReaderSaveV2139();
};
function officeReaderStopV2139(){
  try{speechSynthesis.cancel()}catch{}
  officeReaderV2136.playing=false;officeReaderV2136.paused=false;
  officeReaderSaveV2139();
  officeMiniPlayerRefreshV2139();
}
const officeReaderStopBaseV2139=officeReaderStopV2136;
officeReaderStopV2136=function officeReaderStopPersistV2139(show=true){
  // Closing a document no longer erases the saved reading position.
  try{speechSynthesis.cancel()}catch{}
  officeReaderV2136.playing=false;officeReaderV2136.paused=false;
  if(show)officeReaderStatusV2136('Detenido');
  try{navigator.mediaSession.playbackState='none'}catch{}
  officeReaderSaveV2139();
};

const openOfficeCenterBaseV2139=openOfficeCenterV2128;
openOfficeCenterV2128=function openOfficeCenterV2139(){
  openOfficeCenterBaseV2139();
  setTimeout(()=>{
    const saved=officeReaderLoadSavedV2139();
    if(saved?.chunks?.length && !document.querySelector('.office-resume-reading-v2139')){
      const body=document.getElementById('officeBodyV2128');
      body?.insertAdjacentHTML('beforebegin',`<div class="office-resume-reading-v2139">
        <div><span>🔊</span><span><b>Continuar donde quedaste</b><small>${esc(saved.title||'Documento')} · ${Math.min((saved.index||0)+1,saved.chunks.length)}/${saved.chunks.length}</small></span></div>
        <button type="button" onclick="officeReaderResumeSavedV2139()">▶ Continuar</button>
        <button type="button" onclick="officeReaderClearSavedV2139()">Olvidar</button>
      </div>`);
    }
  },40);
};

/* Resaltar el párrafo aproximado de lectura cuando el documento está abierto */
function officeReaderHighlightV2139(){
  const root=document.getElementById('officeWordV2128');
  if(!root)return;
  root.querySelectorAll('.office-reading-current-v2139').forEach(x=>x.classList.remove('office-reading-current-v2139'));
  const blocks=[...root.querySelectorAll('p,li,h1,h2,h3,div')].filter(x=>(x.innerText||'').trim().length>8);
  if(!blocks.length)return;
  const chunks=officeReaderV2136.chunks||[],idx=officeReaderV2136.index||0,target=(chunks[idx]||'').slice(0,45).trim();
  if(!target)return;
  const found=blocks.find(x=>(x.innerText||'').replace(/\s+/g,' ').includes(target.slice(0,25)));
  if(found){found.classList.add('office-reading-current-v2139');found.scrollIntoView({block:'center',behavior:'smooth'})}
}
setInterval(()=>{if(officeReaderV2136.playing)officeReaderHighlightV2139()},1200);

/* ===================== ESCÁNER 2.0 ===================== */
function officeScanMoveV2139(i,delta){
  const j=i+delta;if(i<0||j<0||j>=officeScanV2138.pages.length)return;
  const [row]=officeScanV2138.pages.splice(i,1);officeScanV2138.pages.splice(j,0,row);officeScanRenderV2138();officeScanDraftSaveV2139(false);
}
function officeScanDraftSaveV2139(show=true){
  try{
    localStorage.setItem(OFFICE_SCAN_KEY_V2139,JSON.stringify({pages:officeScanV2138.pages,filter:document.getElementById('officeScanFilterV2138')?.value||'normal',updatedAt:new Date().toISOString()}));
    if(show)toast('Borrador de escáner guardado');
  }catch{
    if(show)toast('El borrador es demasiado grande para guardarse localmente');
  }
}
function officeScanDraftLoadV2139(){
  try{
    const raw=localStorage.getItem(OFFICE_SCAN_KEY_V2139);if(!raw)return toast('No hay borrador guardado');
    const draft=JSON.parse(raw);officeScanV2138.pages=Array.isArray(draft.pages)?draft.pages:[];
    officeScanRenderV2138();const sel=document.getElementById('officeScanFilterV2138');if(sel&&draft.filter)sel.value=draft.filter;toast('Borrador recuperado');
  }catch{toast('No se pudo recuperar el borrador')}
}
function officeScanDraftClearV2139(){
  try{localStorage.removeItem(OFFICE_SCAN_KEY_V2139)}catch{};toast('Borrador eliminado');
}
const officeScanRenderBaseV2139=officeScanRenderV2138;
officeScanRenderV2138=function officeScanRenderV2139(){
  const box=document.getElementById('officeScanPagesV2138');if(!box)return;
  box.innerHTML=officeScanV2138.pages.map((p,i)=>`<article class="office-scan-page-v2138">
    <div class="office-scan-num-v2138">${i+1}</div>
    <img src="${p.src}" style="transform:rotate(${p.rotation||0}deg)" alt="Página ${i+1}">
    <div class="office-scan-page-tools-v2139">
      <button onclick="officeScanMoveV2139(${i},-1)" ${i===0?'disabled':''}>←</button>
      <button onclick="officeScanMoveV2139(${i},1)" ${i===officeScanV2138.pages.length-1?'disabled':''}>→</button>
      <button onclick="officeScanCornersV2139(${i})">◰ Esquinas</button>
      <button onclick="officeScanRotateV2138(${i})">↻</button>
      <button onclick="officeScanRemoveV2138(${i})">Eliminar</button>
    </div>
  </article>`).join('')||'<div class="card small">Añada una o más páginas.</div>';
};
const officeScannerOpenBaseV2139=officeScannerOpenV2138;
officeScannerOpenV2138=function officeScannerOpenV2139(){
  officeScannerOpenBaseV2139();
  setTimeout(()=>{
    const actions=document.querySelector('.office-scan-actions-v2138');
    if(actions&&!document.querySelector('.office-scan-draft-actions-v2139')){
      actions.insertAdjacentHTML('afterend',`<div class="office-scan-draft-actions-v2139">
        <button type="button" onclick="officeScanDraftSaveV2139()">💾 Guardar borrador</button>
        <button type="button" onclick="officeScanDraftLoadV2139()">↺ Recuperar</button>
        <button type="button" onclick="officeScanDraftClearV2139()">Limpiar borrador</button>
      </div>`);
    }
  },40);
};

function officeScanCornersV2139(index){
  const page=officeScanV2138.pages[index];if(!page)return;
  const im=new Image();
  im.onload=()=>{
    const maxW=Math.min(820,window.innerWidth-40),scale=Math.min(1,maxW/im.naturalWidth),w=Math.round(im.naturalWidth*scale),h=Math.round(im.naturalHeight*scale);
    officeScannerCornerStateV2139={index,w,h,scale,corners:[{x:10,y:10},{x:w-10,y:10},{x:w-10,y:h-10},{x:10,y:h-10}]};
    showModal(`<section class="office-corner-editor-v2139"><h2>Ajustar 4 esquinas</h2><p class="subtle">Mueva cada punto hasta la esquina real de la hoja y aplique la corrección.</p>
      <div id="officeCornerStageV2139" class="office-corner-stage-v2139" style="width:${w}px;height:${h}px">
        <img src="${page.src}" width="${w}" height="${h}">
        <svg id="officeCornerSvgV2139" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><polygon id="officeCornerPolyV2139" points="10,10 ${w-10},10 ${w-10},${h-10} 10,${h-10}"/></svg>
        ${[0,1,2,3].map(i=>`<button class="office-corner-handle-v2139" data-i="${i}" style="left:${officeScannerCornerStateV2139.corners[i].x}px;top:${officeScannerCornerStateV2139.corners[i].y}px" aria-label="Esquina ${i+1}"></button>`).join('')}
      </div>
      <div class="row wrap"><button class="btn" onclick="officeScanApplyPerspectiveV2139()">Aplicar perspectiva</button><button class="btn secondary" onclick="closeModal()">Cancelar</button></div>
    </section>`);
    officeCornerWireV2139();
  };im.src=page.src;
}
function officeCornerWireV2139(){
  document.querySelectorAll('.office-corner-handle-v2139').forEach(handle=>{
    const i=Number(handle.dataset.i);
    const move=e=>{
      const stage=document.getElementById('officeCornerStageV2139');if(!stage)return;
      const r=stage.getBoundingClientRect(),pt=e.touches?.[0]||e;
      const x=Math.max(0,Math.min(r.width,pt.clientX-r.left)),y=Math.max(0,Math.min(r.height,pt.clientY-r.top));
      officeScannerCornerStateV2139.corners[i]={x,y};handle.style.left=`${x}px`;handle.style.top=`${y}px`;officeCornerPolyV2139();
    };
    const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up)};
    handle.addEventListener('pointerdown',e=>{e.preventDefault();handle.setPointerCapture?.(e.pointerId);window.addEventListener('pointermove',move);window.addEventListener('pointerup',up)});
    handle.addEventListener('touchmove',e=>{e.preventDefault();move(e)},{passive:false});
  });
}
function officeCornerPolyV2139(){
  const poly=document.getElementById('officeCornerPolyV2139');if(!poly)return;
  poly.setAttribute('points',officeScannerCornerStateV2139.corners.map(p=>`${p.x},${p.y}`).join(' '));
}
function officeSolveLinearV2139(A,b){
  const n=b.length,M=A.map((r,i)=>[...r,b[i]]);
  for(let i=0;i<n;i++){
    let max=i;for(let k=i+1;k<n;k++)if(Math.abs(M[k][i])>Math.abs(M[max][i]))max=k;
    [M[i],M[max]]=[M[max],M[i]];const piv=M[i][i]||1e-12;for(let j=i;j<=n;j++)M[i][j]/=piv;
    for(let k=0;k<n;k++){if(k===i)continue;const f=M[k][i];for(let j=i;j<=n;j++)M[k][j]-=f*M[i][j]}
  }
  return M.map(r=>r[n]);
}
function officeHomographyV2139(dst,src){
  const A=[],b=[];
  for(let i=0;i<4;i++){
    const u=dst[i].x,v=dst[i].y,x=src[i].x,y=src[i].y;
    A.push([u,v,1,0,0,0,-u*x,-v*x]);b.push(x);
    A.push([0,0,0,u,v,1,-u*y,-v*y]);b.push(y);
  }
  const h=officeSolveLinearV2139(A,b);return [...h,1];
}
async function officeScanApplyPerspectiveV2139(){
  const st=officeScannerCornerStateV2139;if(!st)return;
  const page=officeScanV2138.pages[st.index],im=new Image();
  im.onload=()=>{
    const src=st.corners.map(p=>({x:p.x/st.scale,y:p.y/st.scale}));
    const top=Math.hypot(src[1].x-src[0].x,src[1].y-src[0].y),bottom=Math.hypot(src[2].x-src[3].x,src[2].y-src[3].y);
    const left=Math.hypot(src[3].x-src[0].x,src[3].y-src[0].y),right=Math.hypot(src[2].x-src[1].x,src[2].y-src[1].y);
    let W=Math.max(200,Math.round((top+bottom)/2)),H=Math.max(200,Math.round((left+right)/2));
    const cap=1500,scale=Math.min(1,cap/Math.max(W,H));W=Math.round(W*scale);H=Math.round(H*scale);
    const cvs=document.createElement('canvas');cvs.width=W;cvs.height=H;const ctx=cvs.getContext('2d',{willReadFrequently:true});
    const srcCanvas=document.createElement('canvas');srcCanvas.width=im.naturalWidth;srcCanvas.height=im.naturalHeight;const sctx=srcCanvas.getContext('2d',{willReadFrequently:true});sctx.drawImage(im,0,0);
    const srcData=sctx.getImageData(0,0,im.naturalWidth,im.naturalHeight),out=ctx.createImageData(W,H);
    const Hm=officeHomographyV2139([{x:0,y:0},{x:W-1,y:0},{x:W-1,y:H-1},{x:0,y:H-1}],src);
    const sd=srcData.data,od=out.data,sw=im.naturalWidth,sh=im.naturalHeight;
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      const den=Hm[6]*x+Hm[7]*y+1,sx=(Hm[0]*x+Hm[1]*y+Hm[2])/den,sy=(Hm[3]*x+Hm[4]*y+Hm[5])/den,ix=Math.round(sx),iy=Math.round(sy),o=(y*W+x)*4;
      if(ix>=0&&iy>=0&&ix<sw&&iy<sh){const q=(iy*sw+ix)*4;od[o]=sd[q];od[o+1]=sd[q+1];od[o+2]=sd[q+2];od[o+3]=255}else{od[o]=od[o+1]=od[o+2]=255;od[o+3]=255}
    }
    ctx.putImageData(out,0,0);page.src=cvs.toDataURL('image/jpeg',.9);page.rotation=0;closeModal();officeScanRenderV2138();officeScanDraftSaveV2139(false);toast('Perspectiva corregida');
  };im.src=page.src;
}
