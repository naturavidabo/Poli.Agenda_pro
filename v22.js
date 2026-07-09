'use strict';

/* ========================================================================== 
   POLIAGENDA PRO 2.2.0
   Extensión estructural sobre la base estable 2.1:
   - Biblioteca normativa ampliada
   - Tareas, notas, consignas y notificaciones separadas
   - Kardex voluntario e importación desde texto
   - Fotografía de horario, OCR y revisión antes de guardar
   ========================================================================== */

iconPaths.camera='<path d="M4 7h3l1.5-2h7L17 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"/><circle cx="12" cy="13" r="4"/>';
iconPaths.note='<path d="M5 3h11l3 3v15H5z"/><path d="M16 3v4h4M8 11h8M8 15h8M8 19h5"/>';
iconPaths.pin='<path d="m9 4 6 6M14 3l7 7-3 1-4 4-1 4-2-2-4 4-1-1 4-4-2-2 4-1 4-4z"/>';
iconPaths.user='<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>';
iconPaths.rotate='<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>';

state.libraryCatalog=null;
state.libraryDocs={};
state.reminderTab=['tasks','notes','consignas','notifications','history'].includes(state.reminderTab)?state.reminderTab:'tasks';
state.schedulePhotoMode='current';

/* ------------------------------- Datos ---------------------------------- */
loadData=async function(){
  const [catalog,baseSchedule]=await Promise.all([
    fetch('./data/biblioteca-catalogo.json').then(r=>{if(!r.ok)throw new Error('No se pudo cargar el catálogo de la Biblioteca');return r.json();}),
    fetch('./data/horario-base.json').then(r=>{if(!r.ok)throw new Error('No se pudo cargar el horario base');return r.json();}),
  ]);
  const docs={};
  await Promise.all(catalog.documentos.map(async meta=>{
    const data=await fetch(`./${meta.archivo}`).then(r=>{if(!r.ok)throw new Error(`No se pudo cargar ${meta.titulo}`);return r.json();});
    docs[meta.id]={...data,_catalog:meta};
  }));
  state.libraryCatalog=catalog;
  state.libraryDocs=docs;
  state.uniformes=docs.uniformes;
  state.sumario=docs.sumario;
  state.baseSchedule=baseSchedule;
};

const migrateAndSeedV22Base=migrateAndSeed;
migrateAndSeed=async function(){
  await migrateAndSeedV22Base();
  let records=await dbGet('pendientes',[]);
  if(!Array.isArray(records))records=[];
  records=records.map(r=>{
    let recordType=r.recordType||'';
    if(recordType==='pending')recordType='task';
    if(!recordType){
      const t=normalize(`${r.tipo||''} ${r.title||''}`);
      recordType=t.includes('nota')?'note':t.includes('consigna')?'consigna':t.includes('notificacion')?'notification':'task';
    }
    return {
      ...r,
      id:r.id||uid('record'),
      title:r.title||r.titulo||'Sin título',
      recordType,
      subtasks:Array.isArray(r.subtasks)?r.subtasks.map(s=>typeof s==='string'?{id:uid('sub'),text:s,done:false}:{id:s.id||uid('sub'),text:s.text||s.title||'',done:!!s.done}):[],
      done:!!r.done,
      archived:!!r.archived,
      active:r.active!==false,
      created:r.created||nowISO(),
      updated:r.updated||r.created||nowISO(),
    };
  });
  await dbSet('pendientes',records);
  const photo=await dbGet('schedulePhoto',null);
  if(photo&&typeof photo==='string')await dbSet('schedulePhoto',{dataUrl:photo,uploadedAt:nowISO(),name:'Horario'});
  const profile=await dbGet('profile',{});
  if(!profile||typeof profile!=='object')await dbSet('profile',{});
};

function catalogDocV22(id){return state.libraryCatalog?.documentos?.find(d=>d.id===id)||state.libraryDocs[id]?._catalog||null;}
function allArticlesV22(){
  return Object.entries(state.libraryDocs||{}).flatMap(([doc,data])=>(data.articulos||[]).map(a=>({...a,_doc:doc})));
}
function docDisplayNameV22(id){return catalogDocV22(id)?.titulo||state.libraryDocs[id]?.metadatos?.titulo||id;}
function docShortNameV22(id){return catalogDocV22(id)?.abreviatura||docDisplayNameV22(id);}

/* -------------------------- Biblioteca ampliada ------------------------- */
renderLibrary=async function(){
  let body='';
  if(state.libraryQuery)body=renderLibraryResults(state.libraryQuery);
  else if(state.libraryFilter)body=state.libraryFilter==='__favorites__'?await renderFavoriteArticlesV22():renderQuickFilterV22(state.libraryFilter);
  else if(state.libraryDoc)body=renderDocumentListV22(state.libraryDoc);
  else{
    const groups=[];
    const order=['Policial e institucional','Académica y disciplinaria','Constitucional','Administración y responsabilidad pública','Normas modificatorias SAFCO','Penal'];
    for(const cat of order){
      const docs=(state.libraryCatalog?.documentos||[]).filter(d=>d.categoria===cat);
      if(docs.length)groups.push(`<section class="library-group"><div class="section-title"><h3>${escapeHtml(cat)}</h3><small>${docs.length} documento${docs.length!==1?'s':''}</small></div><div class="document-grid">${docs.map(documentCardV22).join('')}</div></section>`);
    }
    body=`<div class="library-callout"><div class="icon-tile gold">${icon('search')}</div><div><strong>Búsqueda normativa general</strong><p>Busca un número de artículo, una conducta o una palabra en todos los documentos.</p></div></div>
      <div class="tabs library-shortcuts"><button class="tab" data-filter="__favorites__">★ Favoritos</button><button class="tab" data-filter="Faltas leves">Faltas leves</button><button class="tab" data-filter="Faltas graves">Faltas graves</button><button class="tab" data-filter="Faltas gravísimas">Faltas gravísimas</button><button class="tab" data-filter="Responsabilidad administrativa">Responsabilidad administrativa</button><button class="tab" data-filter="Aprehensión">Aprehensión</button></div>${groups.join('')}`;
  }
  return `<div class="page-title"><div><h2>Biblioteca normativa</h2><p>${state.libraryCatalog?.metadatos?.documentos_totales||0} documentos estructurados para consulta rápida y offline.</p></div></div>${body}`;
};

function documentCardV22(meta){
  const data=state.libraryDocs[meta.id];
  const count=data?.articulos?.length||0;
  const warning=data?.metadatos?.advertencia_vigencia||data?.metadatos?.nota_vigencia||'';
  return `<article class="card doc-card-v22"><div class="doc-icon-v22">${icon(meta.icono||'book')}</div><div class="card-main"><p class="eyebrow">${escapeHtml(meta.abreviatura||meta.categoria)}</p><h3>${escapeHtml(meta.titulo)}</h3><p>${escapeHtml(data?.metadatos?.subtitulo||meta.categoria)}</p><div class="card-meta"><span class="badge">${count} artículo${count!==1?'s':''}</span>${meta.pdf?'<span class="badge gold">Documento original</span>':''}</div>${warning?`<p class="legal-note">${escapeHtml(excerpt(warning,150))}</p>`:''}<button class="btn primary full" data-doc="${attr(meta.id)}">Abrir</button></div></article>`;
}

function renderDocumentListV22(docId){
  const data=state.libraryDocs[docId];
  const meta=catalogDocV22(docId);
  if(!data)return `<div class="card danger"><p>Documento no disponible.</p></div>`;
  const warning=data.metadatos?.advertencia_vigencia||data.metadatos?.nota_vigencia||'';
  return `<div class="actions page-back"><button class="btn secondary small" data-action="library-back">${icon('back')} Biblioteca</button></div>
    <article class="card document-header-v22"><div class="doc-icon-v22 large">${icon(meta?.icono||'book')}</div><div class="card-main"><p class="eyebrow">${escapeHtml(meta?.abreviatura||'DOCUMENTO')}</p><h2>${escapeHtml(meta?.titulo||data.metadatos?.titulo||'Documento')}</h2>${data.metadatos?.subtitulo?`<p>${escapeHtml(data.metadatos.subtitulo)}</p>`:''}<div class="card-meta"><span class="badge">${data.articulos?.length||0} artículos</span>${meta?.pdf?`<a class="badge badge-link" href="./${attr(meta.pdf)}" target="_blank" rel="noopener">Abrir PDF</a>`:''}</div>${warning?`<div class="legal-warning">${icon('alert')}<span>${escapeHtml(warning)}</span></div>`:''}</div></article>
    <label class="search-box section-search">${icon('search')}<input id="documentSearchV22" type="search" placeholder="Buscar dentro de ${attr(meta?.abreviatura||'este documento')}…"></label>
    <div id="documentArticlesV22" class="search-results">${(data.articulos||[]).slice(0,100).map(a=>articleCardV22({...a,_doc:docId})).join('')}</div>
    ${(data.articulos?.length||0)>100?`<p class="muted center">Se muestran los primeros 100. Usa el buscador para encontrar otros artículos.</p>`:''}`;
}

renderDocumentList=renderDocumentListV22;

function articleCardV22(a){
  const visual=a.imagen_principal||'';
  return `<article class="article-card article-card-v22"><button type="button" data-article-doc="${attr(a._doc)}" data-article-id="${attr(a.id)}">${visual?`<img class="article-visual-top" src="./${attr(visual)}" alt="${escapeHtml(a.titulo||a.numero)}" loading="lazy">`:''}<div class="article-card-copy"><div class="article-number">${escapeHtml(a.numero||'Artículo')} · ${escapeHtml(docShortNameV22(a._doc))}</div><h4>${escapeHtml(a.titulo||'Sin título')}</h4><p>${escapeHtml(excerpt(a.texto,250))}</p>${a.pagina_inicio?`<div class="card-meta"><span class="badge">Página ${a.pagina_inicio}${a.pagina_fin&&a.pagina_fin>a.pagina_inicio?`–${a.pagina_fin}`:''}</span></div>`:''}</div></button></article>`;
}
articleCard=articleCardV22;

renderLibraryResults=function(term){
  const q=normalize(term),qc=compact(term);
  const stop=new Set(['articulo','art','numero','nro','n','del','de','la','el','los','las','y']);
  const tokens=q.split(' ').filter(t=>t&&!stop.has(t));
  const requestedArticle=(q.match(/(?:articulo|art)\s*(\d+[a-z-]*)/i)||[])[1]||'';
  const results=allArticlesV22().map(a=>{
    const data=state.libraryDocs[a._doc];
    const aliases=[...(a.alias_busqueda||[]),...(a.aliases||[]),a.codigo,a.variante,a.manga,data?.metadatos?.abreviatura].filter(Boolean);
    const hay=[a.numero,a.titulo,a.texto,...aliases,...(a.palabras_clave||[]),docDisplayNameV22(a._doc)].join(' ');
    const n=normalize(hay),c=compact(hay);let score=0;
    if(normalize(a.numero)===q)score+=100;
    if(requestedArticle&&normalize(a.numero).match(/\d+[a-z-]*/)?.[0]===requestedArticle)score+=120;
    if(normalize(a.titulo)===q)score+=90;
    if(normalize(a.titulo).includes(q))score+=45;
    if(n.includes(q))score+=28;
    if(qc.length>=2&&c.includes(qc))score+=25;
    aliases.forEach(x=>{if(normalize(x)===q||compact(x)===qc)score+=70;});
    tokens.forEach(t=>{if(n.includes(t))score+=4;});
    if(q.includes('tropical')&&normalize(a.titulo).includes('tropical'))score+=120;
    if(q.includes('tropical')&&!normalize(a.titulo).includes('tropical')&&a._doc==='uniformes')score-=50;
    return{a,score};
  }).filter(x=>x.score>=8).sort((a,b)=>b.score-a.score).slice(0,150);
  return `<div class="actions page-back"><button class="btn secondary small" data-action="library-back">${icon('back')} Biblioteca</button></div><div class="section-title"><h3>Resultados para “${escapeHtml(term)}”</h3><small>${results.length}</small></div><div class="search-results">${results.length?results.map(x=>articleCardV22(x.a)).join(''):`<div class="card empty">${icon('search')}<p>No se encontraron coincidencias.</p></div>`}</div>`;
};

async function renderFavoriteArticlesV22(){
  const favs=await dbGet('favorites',[]);
  const results=allArticlesV22().filter(a=>favs.includes(`${a._doc}:${a.id}`));
  return `<div class="actions page-back"><button class="btn secondary small" data-action="library-back">${icon('back')} Biblioteca</button></div><div class="section-title"><h3>Favoritos</h3><small>${results.length}</small></div><div class="search-results">${results.map(articleCardV22).join('')||'<div class="card empty"><p>No guardaste artículos favoritos.</p></div>'}</div>`;
}

function renderQuickFilterV22(filter){
  const specific={
    'Faltas leves':[{doc:'sumario',nums:[53]}],
    'Faltas graves':[{doc:'sumario',nums:[54]}],
    'Faltas gravísimas':[{doc:'sumario',nums:[55]}],
    'Responsabilidad administrativa':[{doc:'ley1178',nums:[28,29,30,31,32,33,34,35]},{doc:'ds23318a',nums:[13,14,15,16,17,18,19,20,21]}],
  };
  let results=[];
  if(specific[filter]){
    for(const s of specific[filter])results.push(...(state.libraryDocs[s.doc]?.articulos||[]).filter(a=>s.nums.includes(Number((a.numero.match(/\d+/)||[])[0]))).map(a=>({...a,_doc:s.doc})));
  }else{
    const q=normalize(filter);
    results=allArticlesV22().filter(a=>normalize(`${a.numero} ${a.titulo} ${a.texto}`).includes(q)).slice(0,100);
  }
  return `<div class="actions page-back"><button class="btn secondary small" data-action="library-back">${icon('back')} Biblioteca</button></div><div class="section-title"><h3>${escapeHtml(filter)}</h3><small>${results.length}</small></div><div class="search-results">${results.map(articleCardV22).join('')||'<div class="card empty"><p>No se encontraron artículos.</p></div>'}</div>`;
}

openArticle=function(doc,id){
  const data=state.libraryDocs[doc];
  const a=data?.articulos?.find(x=>x.id===id);
  if(!a)return;
  const meta=catalogDocV22(doc)||{};
  const favKey=`${doc}:${id}`;
  dbGet('favorites',[]).then(favs=>{
    const isFav=favs.includes(favKey);
    const related=(a.imagenes_asociadas||[]).filter(Boolean);
    const primary=a.imagen_principal||related[0]||'';
    const warning=data.metadatos?.advertencia_vigencia||data.metadatos?.nota_vigencia||'';
    modal(`<div class="modal-header"><div><div class="article-number">${escapeHtml(a.numero||'Artículo')}</div><h3>${escapeHtml(a.titulo||'')}</h3></div><button class="modal-close" data-close-modal aria-label="Cerrar">${icon('close')}</button></div>
      ${primary?`<figure class="uniform-main-figure"><img id="articleMainImage" src="./${attr(primary)}" alt="${escapeHtml(a.titulo||a.numero)}"><figcaption>Referencia visual del documento oficial.</figcaption></figure>`:''}
      <div class="card-meta"><span class="badge">${escapeHtml(meta.abreviatura||meta.titulo||doc)}</span>${a.pagina_inicio?`<span class="badge">Página ${a.pagina_inicio}${a.pagina_fin&&a.pagina_fin>a.pagina_inicio?`–${a.pagina_fin}`:''}</span>`:''}${a.modificado_por?.length?`<span class="badge gold">Modificado por ${escapeHtml(a.modificado_por.join(', '))}</span>`:''}</div>
      ${warning?`<div class="legal-warning">${icon('alert')}<span>${escapeHtml(warning)}</span></div>`:''}
      <div class="article-body">${escapeHtml(a.texto||'')}</div>
      ${related.length>1?`<div class="section-title"><h3>Referencias visuales relacionadas</h3></div><div class="image-strip">${related.map(img=>`<button data-image-src="./${attr(img)}"><img src="./${attr(img)}" alt="Página relacionada" loading="lazy"></button>`).join('')}</div>`:''}
      <div class="actions"><button class="btn ${isFav?'gold':'secondary'}" id="favoriteBtn" data-fav-key="${attr(favKey)}">${isFav?'★ Favorito':'☆ Agregar a favoritos'}</button>${meta.pdf?`<a class="btn ghost" href="./${attr(meta.pdf)}${a.pagina_inicio?`#page=${a.pagina_inicio}`:''}" target="_blank" rel="noopener">Abrir documento original</a>`:''}</div>`,()=>bindArticleModal());
  });
};

/* ---------------- Tareas, notas, consignas y notificaciones -------------- */
function recordTypeV22(r){const t=r.recordType||'';return t==='pending'?'task':t||'task';}
function activeRecordsV22(records,type){return records.filter(r=>recordTypeV22(r)===type&&!r.archived&&!r.done&&(type!=='consigna'||r.active!==false));}

renderReminders=async function(){
  const records=await dbGet('pendientes',[]);
  const tabs=[['tasks','Tareas'],['notes','Notas'],['consignas','Consignas'],['notifications','Notificaciones'],['history','Historial']];
  const current=tabs.some(x=>x[0]===state.reminderTab)?state.reminderTab:'tasks';
  let list=[];
  if(current==='history')list=records.filter(r=>r.done||r.archived).sort((a,b)=>(b.resolvedAt||b.updated||b.created||'').localeCompare(a.resolvedAt||a.updated||a.created||''));
  else list=activeRecordsV22(records,current.slice(0,-1)==='consigna'?'consigna':current==='tasks'?'task':current==='notes'?'note':'notification').sort(sortReminders);
  const descriptions={tasks:'Lista para marcar lo que debes realizar.',notes:'Información libre que puedes editar, fijar o archivar.',consignas:'Indicaciones permanentes disponibles para consulta.',notifications:'Mensajes e instrucciones recibidas.',history:'Tareas cumplidas y elementos archivados.'};
  return `<div class="page-title"><div><h2>Pendientes y Notificaciones</h2><p>${descriptions[current]}</p></div></div>
    <div class="tabs record-tabs">${tabs.map(([id,label])=>`<button class="tab ${current===id?'active':''}" data-record-tab="${id}">${label}</button>`).join('')}</div>
    <div class="section-title"><h3>${tabs.find(x=>x[0]===current)?.[1]}</h3><small>${list.length}</small></div>
    <div class="stack">${list.length?list.map(renderRecordCardV22).join(''):`<div class="card empty">${icon(current==='notes'?'note':current==='consignas'?'pin':'checklist')}<p>${current==='tasks'?'No tienes tareas pendientes.':current==='notes'?'No guardaste notas activas.':current==='consignas'?'No registraste consignas permanentes.':current==='notifications'?'No hay notificaciones guardadas.':'El historial está vacío.'}</p></div>`}</div>`;
};

function renderRecordCardV22(r){
  const type=recordTypeV22(r);
  const overdue=type==='task'&&isOverdueV21(r);
  const label={task:'Tarea',note:'Nota',consigna:'Consigna',notification:'Notificación'}[type]||'Registro';
  const subtasks=r.subtasks||[];
  const completedSub=subtasks.filter(s=>s.done).length;
  const options=[optionButtonV21('Editar',`data-edit-record="${attr(r.id)}"`,false,'edit')];
  if(type==='note')options.push(optionButtonV21(r.pinned?'Desfijar':'Fijar',`data-pin-record="${attr(r.id)}"`,false,'pin'));
  if(type==='consigna')options.push(optionButtonV21(r.active===false?'Activar':'Desactivar',`data-toggle-consigna="${attr(r.id)}"`,false,'check'));
  if(!r.archived&&!r.done)options.push(optionButtonV21('Archivar',`data-archive-reminder="${attr(r.id)}"`,false,'archive'));
  if(r.archived||r.done)options.push(optionButtonV21('Restaurar',`data-unarchive-reminder="${attr(r.id)}"`,false,'history'));
  options.push(optionButtonV21('Eliminar',`data-delete-reminder="${attr(r.id)}"`,true,'trash'));
  return `<article class="card compact record-card-v22 ${overdue?'overdue':''} ${r.pinned?'pinned':''}"><div class="record-main-row">${type==='task'&&!r.done?`<button class="check-btn ${r.done?'checked':''}" data-toggle-task="${attr(r.id)}" aria-label="Marcar tarea como cumplida">${r.done?icon('check'):''}</button>`:`<div class="record-type-icon">${icon(type==='note'?'note':type==='consigna'?'pin':type==='notification'?'bell':'checklist')}</div>`}<div class="card-main"><div class="activity-title-row"><div><h4>${escapeHtml(r.title||'Sin título')}</h4><div class="card-meta"><span class="badge ${type==='consigna'?'gold':type==='notification'?'blue':''}">${label}</span>${r.date?`<span class="badge ${overdue?'red':''}">${escapeHtml(formatDate(r.date))}${overdue?' · Vencida':''}</span>`:''}${r.time?`<span class="badge">${escapeHtml(r.time)}</span>`:''}${r.prio&&r.prio!=='Normal'?`<span class="badge ${r.prio==='Urgente'?'red':'gold'}">${escapeHtml(r.prio)}</span>`:''}${subtasks.length?`<span class="badge">${completedSub}/${subtasks.length} subtareas</span>`:''}</div></div>${optionsMenuV21(options)}</div>${r.obs||r.raw?`<p>${escapeHtml(excerpt(r.obs||r.raw,260))}</p>`:''}${subtasks.length?`<details class="subtasks"><summary>Ver subtareas</summary><div>${subtasks.map(s=>`<label class="subtask-row"><input type="checkbox" data-toggle-subtask="${attr(r.id)}" data-subtask-id="${attr(s.id)}" ${s.done?'checked':''}><span>${escapeHtml(s.text)}</span></label>`).join('')}</div></details>`:''}${r.done||r.archived?`<p class="history-state">${r.done?'Cumplida':'Archivada'}${r.resolvedAt?` · ${escapeHtml(formatDate(r.resolvedAt.slice(0,10)))}`:''}</p>`:''}</div></div></article>`;
}

openQuickCreateV21=function(){
  modal(`<div class="modal-header"><div><h3>Agregar rápidamente</h3><p class="muted">Elige el tipo de información.</p></div><button class="modal-close" data-close-modal>${icon('close')}</button></div><div class="quick-create-grid"><button data-quick-kind="task">☐<strong>Nueva tarea</strong><span>Ayuda memoria para marcar y cumplir</span></button><button data-quick-kind="note">📝<strong>Nueva nota</strong><span>Texto libre, editable y sin fecha obligatoria</span></button><button data-quick-kind="consigna">📌<strong>Nueva consigna</strong><span>Indicación permanente</span></button><button data-quick-kind="activity">📅<strong>Formación / actividad</strong><span>Servicio, reunión o evento con horas</span></button><button data-quick-kind="whatsapp">💬<strong>Mensaje WhatsApp inteligente</strong><span>Guardar o convertir un comunicado</span></button></div>`,()=>{
    document.querySelector('[data-close-modal]').onclick=closeModal;
    document.querySelectorAll('[data-quick-kind]').forEach(b=>b.onclick=()=>{const k=b.dataset.quickKind;closeModal();if(k==='activity')openActivityFormV21();else if(k==='whatsapp')openInstructionModal();else if(k==='task')openTaskFormV22();else if(k==='note')openNoteFormV22();else openConsignaFormV22();});
  });
};

function draftKeyV22(type){return `draft:${type}`;}
function bindDraftV22(form,type,fields){
  let timer;
  form.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(async()=>{const data={};fields.forEach(id=>{const el=document.getElementById(id);if(el)data[id]=el.value;});await dbSet(draftKeyV22(type),{data,savedAt:nowISO()});},350);});
}
async function clearDraftV22(type){await dbDelete(draftKeyV22(type));}

async function openTaskFormV22(item={}){
  const draft=!item.id?await dbGet(draftKeyV22('task'),null):null;
  const d=draft?.data||{};
  const subtasks=item.subtasks||[];
  modal(`<div class="modal-header"><div><h3>${item.id?'Editar tarea':'Nueva tarea'}</h3><p class="muted">La fecha y las subtareas son opcionales.</p></div><button class="modal-close" data-close-modal>${icon('close')}</button></div><form id="taskFormV22"><input type="hidden" id="taskIdV22" value="${attr(item.id||'')}"><div class="field"><label>Tarea</label><input class="input" id="taskTitleV22" required value="${attr(item.title||d.taskTitleV22||'')}" placeholder="Ej.: Presentar documentación"></div><div class="form-grid"><div class="field"><label>Fecha límite</label><input class="input" type="date" id="taskDateV22" value="${attr(item.date||d.taskDateV22||'')}"></div><div class="field"><label>Hora</label><input class="input" type="time" id="taskTimeV22" value="${attr(item.time||d.taskTimeV22||'')}"></div><div class="field full"><label>Prioridad</label><select id="taskPriorityV22"><option>Normal</option><option ${item.prio==='Importante'?'selected':''}>Importante</option><option ${item.prio==='Urgente'?'selected':''}>Urgente</option></select></div><div class="field full"><label>Observación</label><textarea id="taskTextV22">${escapeHtml(item.obs||d.taskTextV22||'')}</textarea></div></div><div class="field"><div class="field-title-row"><label>Subtareas</label><button type="button" class="btn ghost small" id="addSubtaskV22">${icon('plus')} Agregar</button></div><div id="subtaskEditorV22">${subtasks.map(subtaskEditorRowV22).join('')}</div></div><button class="btn primary full" type="submit">Guardar tarea</button></form>`,()=>{
    document.querySelector('[data-close-modal]').onclick=closeModal;
    document.getElementById('addSubtaskV22').onclick=()=>document.getElementById('subtaskEditorV22').insertAdjacentHTML('beforeend',subtaskEditorRowV22({}));
    document.getElementById('subtaskEditorV22').addEventListener('click',e=>{const b=e.target.closest('[data-remove-subtask]');if(b)b.closest('.subtask-editor-row').remove();});
    document.getElementById('taskFormV22').onsubmit=saveTaskV22;
    bindDraftV22(document.getElementById('taskFormV22'),'task',['taskTitleV22','taskDateV22','taskTimeV22','taskTextV22']);
  });
}
function subtaskEditorRowV22(s={}){return `<div class="subtask-editor-row"><input type="hidden" class="sub-id" value="${attr(s.id||'')}"><input class="input sub-text" placeholder="Subtarea" value="${attr(s.text||'')}"><button type="button" class="icon-btn danger" data-remove-subtask aria-label="Quitar">${icon('close')}</button></div>`;}
async function saveTaskV22(e){
  e.preventDefault();let list=await dbGet('pendientes',[]);const id=document.getElementById('taskIdV22').value||uid('task');const prev=list.find(x=>x.id===id)||{};
  const subtasks=[...document.querySelectorAll('.subtask-editor-row')].map(r=>({id:r.querySelector('.sub-id').value||uid('sub'),text:r.querySelector('.sub-text').value.trim(),done:(prev.subtasks||[]).find(s=>s.id===r.querySelector('.sub-id').value)?.done||false})).filter(s=>s.text);
  const item={...prev,id,title:document.getElementById('taskTitleV22').value.trim(),date:document.getElementById('taskDateV22').value,time:document.getElementById('taskTimeV22').value,prio:document.getElementById('taskPriorityV22').value,obs:document.getElementById('taskTextV22').value.trim(),recordType:'task',tipo:'Tarea',subtasks,done:false,archived:false,created:prev.created||nowISO(),updated:nowISO()};
  const i=list.findIndex(x=>x.id===id);if(i>=0)list[i]=item;else list.unshift(item);await dbSet('pendientes',list);await clearDraftV22('task');closeModal();state.view='reminders';state.reminderTab='tasks';toast('Tarea guardada');render();
}

async function openNoteFormV22(item={}){
  const draft=!item.id?await dbGet(draftKeyV22('note'),null):null;const d=draft?.data||{};
  modal(`<div class="modal-header"><div><h3>${item.id?'Editar nota':'Nueva nota'}</h3><p class="muted">Guarda una idea o información sin convertirla en tarea.</p></div><button class="modal-close" data-close-modal>${icon('close')}</button></div><form id="noteFormV22"><input type="hidden" id="noteIdV22" value="${attr(item.id||'')}"><div class="field"><label>Título</label><input class="input" id="noteTitleV22" required value="${attr(item.title||d.noteTitleV22||'')}"></div><div class="field"><label>Texto</label><textarea id="noteTextV22" rows="9">${escapeHtml(item.obs||item.raw||d.noteTextV22||'')}</textarea></div><label class="check-option"><input type="checkbox" id="notePinnedV22" ${item.pinned?'checked':''}><span>Fijar como importante</span></label><button class="btn primary full" type="submit">Guardar nota</button></form>`,()=>{document.querySelector('[data-close-modal]').onclick=closeModal;document.getElementById('noteFormV22').onsubmit=saveNoteV22;bindDraftV22(document.getElementById('noteFormV22'),'note',['noteTitleV22','noteTextV22']);});
}
async function saveNoteV22(e){e.preventDefault();let list=await dbGet('pendientes',[]);const id=document.getElementById('noteIdV22').value||uid('note');const prev=list.find(x=>x.id===id)||{};const item={...prev,id,title:document.getElementById('noteTitleV22').value.trim(),obs:document.getElementById('noteTextV22').value.trim(),recordType:'note',tipo:'Nota',pinned:document.getElementById('notePinnedV22').checked,done:false,archived:false,created:prev.created||nowISO(),updated:nowISO()};const i=list.findIndex(x=>x.id===id);if(i>=0)list[i]=item;else list.unshift(item);await dbSet('pendientes',list);await clearDraftV22('note');closeModal();state.view='reminders';state.reminderTab='notes';toast('Nota guardada');render();}

async function openConsignaFormV22(item={}){
  modal(`<div class="modal-header"><div><h3>${item.id?'Editar consigna':'Nueva consigna'}</h3><p class="muted">Una indicación permanente no aparece en Inicio.</p></div><button class="modal-close" data-close-modal>${icon('close')}</button></div><form id="consignaFormV22"><input type="hidden" id="consignaIdV22" value="${attr(item.id||'')}"><div class="field"><label>Título</label><input class="input" id="consignaTitleV22" required value="${attr(item.title||'')}"></div><div class="field"><label>Indicación o instrucción</label><textarea id="consignaTextV22" rows="7">${escapeHtml(item.obs||'')}</textarea></div><div class="field"><label>Categoría</label><input class="input" id="consignaCategoryV22" value="${attr(item.category||'')}" placeholder="Ej.: Formación, presentación, aula"></div><label class="check-option"><input type="checkbox" id="consignaActiveV22" ${item.active!==false?'checked':''}><span>Consigna vigente</span></label><button class="btn primary full" type="submit">Guardar consigna</button></form>`,()=>{document.querySelector('[data-close-modal]').onclick=closeModal;document.getElementById('consignaFormV22').onsubmit=saveConsignaV22;});
}
async function saveConsignaV22(e){e.preventDefault();let list=await dbGet('pendientes',[]);const id=document.getElementById('consignaIdV22').value||uid('consigna');const prev=list.find(x=>x.id===id)||{};const item={...prev,id,title:document.getElementById('consignaTitleV22').value.trim(),obs:document.getElementById('consignaTextV22').value.trim(),category:document.getElementById('consignaCategoryV22').value.trim(),recordType:'consigna',tipo:'Consigna',active:document.getElementById('consignaActiveV22').checked,done:false,archived:false,created:prev.created||nowISO(),updated:nowISO()};const i=list.findIndex(x=>x.id===id);if(i>=0)list[i]=item;else list.unshift(item);await dbSet('pendientes',list);closeModal();state.view='reminders';state.reminderTab='consignas';toast('Consigna guardada');render();}

async function editRecordV22(id){const list=await dbGet('pendientes',[]);const item=list.find(x=>x.id===id);if(!item)return;const t=recordTypeV22(item);if(t==='task')openTaskFormV22(item);else if(t==='note')openNoteFormV22(item);else if(t==='consigna')openConsignaFormV22(item);else viewReminder(id);}
async function toggleTaskV22(id){let list=await dbGet('pendientes',[]);const i=list.findIndex(x=>x.id===id);if(i<0)return;list[i].done=true;list[i].archived=true;list[i].resolvedAt=nowISO();list[i].updated=nowISO();await dbSet('pendientes',list);toast('Tarea cumplida · Deshacer disponible en Historial');render();}
async function toggleSubtaskV22(recordId,subId,checked){let list=await dbGet('pendientes',[]);const i=list.findIndex(x=>x.id===recordId);if(i<0)return;const s=(list[i].subtasks||[]).find(x=>x.id===subId);if(s)s.done=checked;list[i].updated=nowISO();if(list[i].subtasks?.length&&list[i].subtasks.every(x=>x.done)){list[i].done=true;list[i].archived=true;list[i].resolvedAt=nowISO();toast('Todas las subtareas fueron cumplidas');}await dbSet('pendientes',list);render();}
async function pinRecordV22(id){let list=await dbGet('pendientes',[]);const i=list.findIndex(x=>x.id===id);if(i>=0){list[i].pinned=!list[i].pinned;list[i].updated=nowISO();await dbSet('pendientes',list);render();}}
async function toggleConsignaV22(id){let list=await dbGet('pendientes',[]);const i=list.findIndex(x=>x.id===id);if(i>=0){list[i].active=list[i].active===false;list[i].updated=nowISO();await dbSet('pendientes',list);toast(list[i].active?'Consigna activada':'Consigna desactivada');render();}}

/* Mensajes existentes: ajustar los tipos guardados. */
const saveRawInstructionV21Base=saveRawInstructionV21;
saveRawInstructionV21=async function(){await saveRawInstructionV21Base();state.reminderTab='notes';render();};
splitActionsV21=async function(actions,raw){let l=await dbGet('pendientes',[]);actions.forEach(x=>l.unshift({id:uid('task'),title:x.slice(0,90),obs:raw,raw,recordType:'task',tipo:'Tarea',prio:'Normal',done:false,archived:false,created:nowISO(),updated:nowISO()}));await dbSet('pendientes',l);closeModal();state.view='reminders';state.reminderTab='tasks';toast(`${actions.length} tareas creadas`);render();};

/* -------------------------------- Inicio -------------------------------- */
renderHome=async function(){
  const agenda=await dbGet('agenda',[]),records=await dbGet('pendientes',[]),schedule=await dbGet('horarioSemanal',[]);
  const timeline=buildTodayTimelineV21(schedule,agenda);const current=timeline.find(x=>timelineStatusV21(x.inicio,x.fin)==='current');const next=timeline.find(x=>timelineStatusV21(x.inicio,x.fin)==='upcoming');const completed=timeline.filter(x=>timelineStatusV21(x.inicio,x.fin)==='completed');
  const tasks=records.filter(r=>recordTypeV22(r)==='task'&&!r.done&&!r.archived).sort(sortReminders);const overdue=tasks.filter(isOverdueV21);const latestNotification=records.filter(r=>recordTypeV22(r)==='notification'&&!r.archived).sort((a,b)=>(b.updated||b.created||'').localeCompare(a.updated||a.created||''))[0];
  const lastBackup=await dbGet('lastBackup',null);const backupDue=!lastBackup||Date.now()-new Date(lastBackup).getTime()>7*86400000;
  return `<div class="page-title"><div><h2>Hoy</h2><p>${escapeHtml(formatDate(todayISO(),true))}</p></div></div><div class="stack">
    ${current?timelineCardV21(current,'current'):next?`<div class="card info compact"><strong>No hay una actividad en curso.</strong><p>La siguiente comienza a las ${escapeHtml(next.inicio)}.</p></div>`:`<div class="card empty">${icon('calendar')}<p>No hay actividades registradas para este momento.</p></div>`}
    ${next?timelineCardV21(next,'upcoming'):''}
    <div class="summary-grid"><button class="summary-card" data-nav="reminders"><b>${tasks.length}</b><span>Tareas vigentes</span><small>${overdue.length?`${overdue.length} vencida(s)`:'Todo al día'}</small></button><button class="summary-card" data-nav="activities"><b>${timeline.length}</b><span>Actividades de hoy</span><small>${completed.length} finalizada(s)</small></button></div>
    <article class="card"><div class="section-title" style="margin-top:0"><h3>Tareas vigentes</h3><button class="btn ghost small" data-nav="reminders">Ver todas</button></div>${tasks.length?tasks.slice(0,5).map(r=>`<button type="button" class="mini-reminder ${isOverdueV21(r)?'overdue':''}" data-view-reminder="${attr(r.id)}"><span>☐</span><div><strong>${escapeHtml(r.title)}</strong><small>${r.date?escapeHtml(formatDate(r.date)):'Sin fecha'}${isOverdueV21(r)?' · Vencida':''}</small></div></button>`).join(''):'<div class="empty compact"><p>No tienes tareas activas.</p></div>'}</article>
    ${latestNotification?`<article class="card info compact"><div class="card-head"><div class="icon-tile">${icon('bell')}</div><div class="card-main"><h3>Última notificación</h3><p><strong>${escapeHtml(latestNotification.title)}</strong></p><p>${escapeHtml(excerpt(latestNotification.obs||latestNotification.raw||'',180))}</p></div></div></article>`:''}
    ${backupDue?`<article class="card warn compact"><div class="card-head"><div class="icon-tile">${icon('download')}</div><div class="card-main"><h3>Respaldo recomendado</h3><p>${lastBackup?'Pasaron más de 7 días desde el último respaldo.':'Todavía no realizaste un respaldo.'}</p><button class="btn secondary small" data-action="export-backup">Crear respaldo</button></div></div></article>`:''}
    ${completed.length?`<details class="completed-list"><summary>Ver actividades anteriores de hoy (${completed.length})</summary><div class="stack">${completed.map(x=>timelineCardV21(x,'completed')).join('')}</div></details>`:''}
  </div>`;
};

/* -------------------- Fotografía y reconocimiento del horario ------------ */
const renderSchedulePageV21Base=renderSchedulePage;
renderSchedulePage=async function(){
  const schedule=await dbGet('horarioSemanal',[]);const meta=await dbGet('scheduleMeta',state.baseSchedule.metadatos);const photo=await dbGet('schedulePhoto',null);const items=schedule.filter(x=>x.dia===state.scheduleDay).sort((a,b)=>(a.inicio||'').localeCompare(b.inicio||''));
  return `<div class="actions page-back"><button class="btn secondary small" data-academic-sub="overview">${icon('back')} Académico</button></div><div class="page-title"><div><h2>Horario semanal</h2><p>${escapeHtml(meta?.curso||'Horario vigente')} · editable por parcial o curso.</p></div></div>
    <article class="card schedule-photo-card"><div class="card-head"><div class="icon-tile gold">${icon('camera')}</div><div class="card-main"><h3>Fotografía del horario</h3><p>${photo?'La fotografía puede reemplazarse, girarse o analizarse nuevamente.':'Toma una foto o elige una imagen para convertirla en horario digital.'}</p></div></div>${photo?`<button class="schedule-photo-preview" data-action="view-schedule-photo"><img src="${attr(photo.dataUrl)}" alt="Fotografía del horario cargado"><span>Ver imagen completa</span></button><div class="card-meta"><span class="badge">${escapeHtml(photo.name||'Horario')}</span><span class="badge">${photo.uploadedAt?escapeHtml(formatDate(photo.uploadedAt.slice(0,10))):''}</span></div>`:''}<div class="actions"><label class="btn primary small" for="schedulePhotoInput">${icon('camera')} ${photo?'Cambiar foto':'Subir foto'}</label><input class="file-input" id="schedulePhotoInput" type="file" accept="image/*" capture="environment">${photo?`<button class="btn secondary small" data-action="analyze-schedule-photo">${icon('search')} Reconocer horario</button><button class="btn ghost small" data-action="manual-schedule-text">Pegar texto</button>${optionsMenuV21([optionButtonV21('Girar imagen',`data-action="rotate-schedule-photo"`,false,'rotate'),optionButtonV21('Eliminar fotografía',`data-action="delete-schedule-photo"`,true,'trash')])}`:''}</div><p class="helper-text">El reconocimiento propone datos. Siempre podrás revisar y corregir antes de reemplazar el horario.</p></article>
    <div class="tabs">${WEEK_DAYS.map(d=>`<button class="tab ${d===state.scheduleDay?'active':''}" data-schedule-day="${d}">${d.slice(0,3)}</button>`).join('')}</div><article class="card"><div class="section-title" style="margin-top:0"><h3>${escapeHtml(state.scheduleDay)}</h3><button class="btn primary small" data-action="add-schedule">${icon('plus')} Agregar</button></div>${items.length?items.map(x=>scheduleRow(x)).join(''):`<div class="empty">${icon('calendar')}<p>No hay actividades este día.</p></div>`}</article><div class="actions"><button class="btn secondary" data-action="save-schedule-history">${icon('history')} Guardar horario en historial</button></div>`;
};

async function handleSchedulePhotoV22(file){
  if(!file)return;if(!file.type.startsWith('image/'))return toast('Selecciona una imagen válida');
  try{const dataUrl=await compressImageV22(file,1800,.82);await dbSet('schedulePhoto',{dataUrl,name:file.name||'Horario',uploadedAt:nowISO(),ocrText:''});toast('Fotografía guardada');render();}catch(e){console.error(e);toast('No se pudo procesar la fotografía');}
}
function compressImageV22(file,maxSize=1800,quality=.82){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(reader.error);reader.onload=()=>{const img=new Image();img.onerror=reject;img.onload=()=>{let w=img.width,h=img.height;const ratio=Math.min(1,maxSize/Math.max(w,h));w=Math.round(w*ratio);h=Math.round(h*ratio);const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);resolve(c.toDataURL('image/webp',quality));};img.src=reader.result;};reader.readAsDataURL(file);});}
async function viewSchedulePhotoV22(){const p=await dbGet('schedulePhoto',null);if(!p)return;modal(`<div class="modal-header"><h3>Fotografía del horario</h3><button class="modal-close" data-close-modal>${icon('close')}</button></div><div class="schedule-photo-full"><img src="${attr(p.dataUrl)}" alt="Horario"></div><div class="actions"><button class="btn secondary" data-action="rotate-photo-modal">${icon('rotate')} Girar 90°</button></div>`,()=>{document.querySelector('[data-close-modal]').onclick=closeModal;document.querySelector('[data-action="rotate-photo-modal"]').onclick=async()=>{closeModal();await rotateSchedulePhotoV22();};});}
async function rotateSchedulePhotoV22(){const p=await dbGet('schedulePhoto',null);if(!p)return;const img=new Image();img.onload=async()=>{const c=document.createElement('canvas');c.width=img.height;c.height=img.width;const ctx=c.getContext('2d');ctx.translate(c.width/2,c.height/2);ctx.rotate(Math.PI/2);ctx.drawImage(img,-img.width/2,-img.height/2);p.dataUrl=c.toDataURL('image/webp',.84);p.updatedAt=nowISO();await dbSet('schedulePhoto',p);toast('Imagen girada');render();};img.src=p.dataUrl;}
async function deleteSchedulePhotoV22(){if(!confirm('¿Eliminar la fotografía del horario? El horario digital se conservará.'))return;await dbDelete('schedulePhoto');toast('Fotografía eliminada');render();}

async function recognizeSchedulePhotoV22(){
  const p=await dbGet('schedulePhoto',null);if(!p)return toast('Primero carga una fotografía');
  modal(`<div class="modal-header"><div><h3>Reconociendo horario</h3><p class="muted">La imagen no reemplazará nada sin tu confirmación.</p></div></div><div class="ocr-progress"><div id="ocrProgressBar"><span style="width:5%"></span></div><p id="ocrProgressText">Preparando imagen…</p></div>`);
  try{
    let text='';
    if('TextDetector' in window){
      const detector=new TextDetector();const blob=await (await fetch(p.dataUrl)).blob();const bitmap=await createImageBitmap(blob);const blocks=await detector.detect(bitmap);text=blocks.map(b=>b.rawValue).join('\n');
    }else{
      if(!navigator.onLine)throw new Error('El reconocimiento OCR adicional requiere conexión en este dispositivo. Puedes pegar el texto manualmente.');
      await loadExternalScriptV22('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js');
      if(!window.Tesseract)throw new Error('No se pudo cargar el motor de reconocimiento');
      const result=await Tesseract.recognize(p.dataUrl,'spa',{logger:m=>{const pct=Math.round((m.progress||0)*100);const bar=document.querySelector('#ocrProgressBar span');const txt=document.getElementById('ocrProgressText');if(bar)bar.style.width=`${Math.max(5,pct)}%`;if(txt)txt.textContent=m.status?`${m.status} · ${pct}%`:`${pct}%`;}});text=result.data?.text||'';
    }
    p.ocrText=text;p.ocrAt=nowISO();await dbSet('schedulePhoto',p);closeModal();openScheduleTextReviewV22(text);
  }catch(e){console.error(e);closeModal();toast(e.message||'No se pudo reconocer el texto');openScheduleTextReviewV22(p.ocrText||'');}
}
function loadExternalScriptV22(src){return new Promise((resolve,reject)=>{if(document.querySelector(`script[src="${src}"]`))return resolve();const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error('No se pudo cargar el reconocimiento OCR'));document.head.appendChild(s);});}
function manualScheduleTextV22(){dbGet('schedulePhoto',{}).then(p=>openScheduleTextReviewV22(p.ocrText||''));}
function openScheduleTextReviewV22(text=''){
  modal(`<div class="modal-header"><div><h3>Revisar texto del horario</h3><p class="muted">Corrige el texto reconocido o pega una transcripción antes de interpretarlo.</p></div><button class="modal-close" data-close-modal>${icon('close')}</button></div><div class="field"><label>Texto reconocido</label><textarea id="scheduleOcrTextV22" rows="14" placeholder="Ej.: Lunes 07:30 08:10 Planificación Estratégica…">${escapeHtml(text)}</textarea></div><div class="actions"><button class="btn primary full" id="interpretScheduleTextV22">Interpretar y revisar filas</button></div>`,()=>{document.querySelector('[data-close-modal]').onclick=closeModal;document.getElementById('interpretScheduleTextV22').onclick=()=>{const t=document.getElementById('scheduleOcrTextV22').value;const rows=parseScheduleTextV22(t);closeModal();openScheduleRowsReviewV22(rows,t);};});
}
function parseTimeV22(v=''){const m=String(v).match(/\b([0-2]?\d)[:.]([0-5]\d)\b/);return m?`${String(Number(m[1])).padStart(2,'0')}:${m[2]}`:'';}
function parseScheduleTextV22(text=''){
  const lines=String(text).replace(/\r/g,'').split('\n').map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);const rows=[];
  const dayPattern='(Lunes|Martes|Mi[eé]rcoles|Jueves|Viernes)';
  for(const line of lines){
    let m=line.match(new RegExp(`^${dayPattern}\\s+([0-2]?\\d[:.]\\d{2})\\s*(?:-|a|–)\\s*([0-2]?\\d[:.]\\d{2})\\s+(.+)$`,'i'));
    if(m){rows.push({id:uid('ocrrow'),dia:capitalizeDayV22(m[1]),inicio:parseTimeV22(m[2]),fin:parseTimeV22(m[3]),materia:m[4].trim(),docente:'',tipo:normalize(m[4]).includes('descanso')?'descanso':'clase'});continue;}
    m=line.match(/\b([0-2]?\d[:.]\d{2})\s*(?:-|a|–)\s*([0-2]?\d[:.]\d{2})\b\s*(.*)$/i);
    if(m){const cells=(m[3]||'').split(/\s{2,}|\s*\|\s*|\t+/).map(x=>x.trim()).filter(Boolean);if(cells.length>1){cells.slice(0,5).forEach((cell,i)=>rows.push({id:uid('ocrrow'),dia:WEEK_DAYS[i],inicio:parseTimeV22(m[1]),fin:parseTimeV22(m[2]),materia:cell,docente:'',tipo:normalize(cell).includes('descanso')?'descanso':'clase'}));}else if(cells[0])rows.push({id:uid('ocrrow'),dia:state.scheduleDay,inicio:parseTimeV22(m[1]),fin:parseTimeV22(m[2]),materia:cells[0],docente:'',tipo:normalize(cells[0]).includes('descanso')?'descanso':'clase'});}
  }
  return rows;
}
function capitalizeDayV22(v=''){const n=normalize(v);return WEEK_DAYS.find(d=>normalize(d)===n)||v;}
function scheduleReviewRowV22(r={}){return `<div class="ocr-schedule-row"><button type="button" class="icon-btn danger" data-remove-ocr-row aria-label="Quitar">${icon('close')}</button><select class="ocr-day">${WEEK_DAYS.map(d=>`<option ${d===(r.dia||state.scheduleDay)?'selected':''}>${d}</option>`).join('')}</select><input class="input ocr-start" type="time" value="${attr(r.inicio||'')}"><input class="input ocr-end" type="time" value="${attr(r.fin||'')}"><input class="input ocr-subject" placeholder="Materia o actividad" value="${attr(r.materia||'')}"><input class="input ocr-teacher" placeholder="Docente (opcional)" value="${attr(r.docente||'')}"></div>`;}
function openScheduleRowsReviewV22(rows=[],originalText=''){
  modal(`<div class="modal-header"><div><h3>Revisar horario digital</h3><p class="muted">Corrige cada fila. La fotografía y el texto original quedarán guardados como respaldo.</p></div><button class="modal-close" data-close-modal>${icon('close')}</button></div>${!rows.length?`<div class="card warn compact"><strong>No se detectaron filas completas.</strong><p>Agrega las filas manualmente usando el texto reconocido como referencia.</p></div>`:''}<div class="field"><label>Cómo guardar</label><select id="scheduleImportModeV22"><option value="replace">Reemplazar horario actual</option><option value="new">Crear nuevo horario / parcial</option></select></div><label class="check-option"><input type="checkbox" id="scheduleSaveOldV22" checked><span>Guardar el horario actual en el historial antes de reemplazarlo</span></label><div class="field-title-row"><h4>Filas detectadas</h4><button class="btn ghost small" id="addOcrRowV22">${icon('plus')} Agregar fila</button></div><div id="ocrRowsV22">${rows.map(scheduleReviewRowV22).join('')}</div><details class="source-text"><summary>Ver texto original reconocido</summary><pre>${escapeHtml(originalText)}</pre></details><button class="btn primary full" id="saveOcrScheduleV22">Guardar horario revisado</button>`,()=>{document.querySelector('[data-close-modal]').onclick=closeModal;const box=document.getElementById('ocrRowsV22');document.getElementById('addOcrRowV22').onclick=()=>box.insertAdjacentHTML('beforeend',scheduleReviewRowV22({}));box.addEventListener('click',e=>{const b=e.target.closest('[data-remove-ocr-row]');if(b)b.closest('.ocr-schedule-row').remove();});document.getElementById('saveOcrScheduleV22').onclick=()=>saveImportedScheduleV22(originalText);});
}
async function saveImportedScheduleV22(originalText){
  const rows=[...document.querySelectorAll('.ocr-schedule-row')].map(r=>({id:uid('schedule'),dia:r.querySelector('.ocr-day').value,inicio:r.querySelector('.ocr-start').value,fin:r.querySelector('.ocr-end').value,materia:r.querySelector('.ocr-subject').value.trim(),docente:r.querySelector('.ocr-teacher').value.trim(),tipo:normalize(r.querySelector('.ocr-subject').value).includes('descanso')?'descanso':'clase',source:'photo-ocr',created:nowISO(),updated:nowISO()})).filter(r=>r.materia);
  if(!rows.length)return toast('Agrega al menos una fila de horario');const current=await dbGet('horarioSemanal',[]);const saveOld=document.getElementById('scheduleSaveOldV22').checked;const mode=document.getElementById('scheduleImportModeV22').value;
  if(current.length&&(saveOld||mode==='new')){let h=await dbGet('historialHorarios',[]);h.unshift({id:uid('history'),nombre:`Horario anterior · ${formatDate(todayISO())}`,items:current,sourceText:originalText,created:nowISO()});await dbSet('historialHorarios',h);}
  await dbSet('horarioSemanal',rows);let p=await dbGet('schedulePhoto',{});p.ocrText=originalText;p.importedAt=nowISO();p.importedRows=rows.length;await dbSet('schedulePhoto',p);closeModal();toast(`${rows.length} actividades guardadas en el horario`);render();
}

/* ----------------------------- Kardex personal --------------------------- */
function calculateAgeV22(date){if(!date)return'';const b=new Date(`${date}T12:00:00`);if(Number.isNaN(b.getTime()))return'';const n=new Date();let a=n.getFullYear()-b.getFullYear();if(n.getMonth()<b.getMonth()||(n.getMonth()===b.getMonth()&&n.getDate()<b.getDate()))a--;return String(a);}
function parseKardexTextV22(text=''){
  const result={};const lines=String(text).split(/\n+/).map(x=>x.trim()).filter(Boolean);
  const defs=[
    ['listNumber',/^(?:n[uú]mero\s+de\s+lista|nro\.?\s*lista|lista)\s*[:.-]?\s*(.+)$/i],['name',/^(?:nombre)\s*[:.-]?\s*(.+)$/i],['ci',/^(?:c\.?\s*i\.?|c[eé]dula(?:\s+de\s+identidad)?)\s*[:.-]?\s*(.+)$/i],['scale',/^(?:esc\.?|escalaf[oó]n)\s*[:.-]?\s*(.+)$/i],['phone',/^(?:cel\.?|celular|tel[eé]fono)\s*[:.-]?\s*(.+)$/i],['birthDateText',/^(?:nac\.?|fecha\s+de\s+nacimiento|nacimiento)\s*[:.-]?\s*(.+)$/i],['bloodType',/^(?:tipo\s+de\s+sangre|sangre)\s*[:.-]?\s*(.+)$/i],['insuredNumber',/^(?:n[uú]m\.?\s+asegurado|n[uú]mero\s+de\s+asegurado)\s*[:.-]?\s*(.+)$/i],['employerNumber',/^(?:n[uú]m\.?\s+empleador|n[uú]mero\s+de\s+empleador)\s*[:.-]?\s*(.+)$/i],['address',/^(?:domicilio|direcci[oó]n)\s*[:.-]?\s*(.+)$/i],['email',/^(?:correo|email|e-mail)\s*[:.-]?\s*(.+)$/i],['grade',/^(?:grado)\s*[:.-]?\s*(.+)$/i],['unit',/^(?:unidad|destino)\s*[:.-]?\s*(.+)$/i],['course',/^(?:curso)\s*[:.-]?\s*(.+)$/i],['parallel',/^(?:paralelo)\s*[:.-]?\s*(.+)$/i],['shift',/^(?:turno)\s*[:.-]?\s*(.+)$/i]
  ];
  for(const line of lines){for(const [key,re] of defs){const m=line.match(re);if(m){result[key]=m[1].trim();break;}}}
  if(result.name){const gradeMatch=result.name.match(/^((?:GRAL\.|CNL\.|TCNL\.|MY\.|CAP\.|TTE\.|SBTTE\.|SOF\.|SGTO\.)[^A-ZÁÉÍÓÚÑ]*?)\s+(.+)$/i);if(gradeMatch){result.grade=result.grade||gradeMatch[1].trim();result.name=gradeMatch[2].trim();}}
  if(result.birthDateText){const m=result.birthDateText.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);if(m)result.birthDate=`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;}
  return result;
}

openProfileV21=function(){
  dbGet('profile',{custom:[]}).then(p=>modal(`<div class="modal-header"><div><h3>Ficha Kardex personal</h3><p class="muted">Todos los datos son voluntarios y se guardan en este dispositivo.</p></div><button class="modal-close" data-close-modal>${icon('close')}</button></div><div class="card info compact"><strong>Importar desde texto</strong><p>Pega una ficha recibida y revisa lo interpretado antes de guardar.</p><textarea id="profileImportTextV22" rows="6" placeholder="Pega aquí el bloque de identificación…">${escapeHtml(p.originalText||'')}</textarea><div class="actions"><button class="btn secondary small" id="analyzeProfileTextV22">Analizar texto</button></div></div><form id="profileForm"><div class="section-title"><h3>Identificación</h3></div><div class="form-grid kardex-grid"><div class="field"><label>Número de lista</label><input class="input" id="profileListNumber" value="${attr(p.listNumber||'')}"></div><div class="field"><label>Grado</label><input class="input" id="profileGrade" value="${attr(p.grade||'')}"></div><div class="field full"><label>Nombre completo</label><input class="input" id="profileName" value="${attr(p.name||'')}"></div><div class="field"><label>Cédula de identidad</label><input class="input" id="profileCI" value="${attr(p.ci||'')}"></div><div class="field"><label>Lugar de expedición</label><input class="input" id="profileCIPlace" value="${attr(p.ciPlace||'')}"></div><div class="field"><label>Número de escalafón</label><input class="input" id="profileScale" value="${attr(p.scale||'')}"></div><div class="field"><label>Celular</label><input class="input" id="profilePhone" inputmode="tel" value="${attr(p.phone||'')}"></div><div class="field"><label>Fecha de nacimiento</label><input class="input" id="profileBirthDate" type="date" value="${attr(p.birthDate||'')}"></div><div class="field"><label>Edad</label><input class="input" id="profileAge" readonly value="${attr(calculateAgeV22(p.birthDate))}"></div><div class="field"><label>Tipo de sangre</label><input class="input" id="profileBlood" value="${attr(p.bloodType||'')}"></div></div><div class="section-title"><h3>Información institucional y contacto</h3></div><div class="form-grid kardex-grid"><div class="field"><label>Número de asegurado</label><input class="input" id="profileInsured" value="${attr(p.insuredNumber||'')}"></div><div class="field"><label>Número de empleador</label><input class="input" id="profileEmployer" value="${attr(p.employerNumber||'')}"></div><div class="field"><label>Unidad o destino</label><input class="input" id="profileUnit" value="${attr(p.unit||'')}"></div><div class="field"><label>Curso</label><input class="input" id="profileCourse" value="${attr(p.course||'')}"></div><div class="field"><label>Paralelo</label><input class="input" id="profileParallel" value="${attr(p.parallel||'')}"></div><div class="field"><label>Turno</label><input class="input" id="profileShift" value="${attr(p.shift||'')}"></div><div class="field full"><label>Domicilio</label><input class="input" id="profileAddress" value="${attr(p.address||'')}"></div><div class="field full"><label>Correo electrónico</label><input class="input" id="profileEmail" type="email" value="${attr(p.email||'')}"></div></div><div class="field"><div class="field-title-row"><label>Otros datos</label><button type="button" class="btn ghost small" id="addProfileField">${icon('plus')} Agregar dato</button></div><div id="profileCustom">${(p.custom||[]).map(profileCustomRowV21).join('')}</div></div><button class="btn primary full" type="submit">Guardar Kardex</button></form>`,()=>{
    document.querySelector('[data-close-modal]').onclick=closeModal;document.getElementById('addProfileField').onclick=()=>document.getElementById('profileCustom').insertAdjacentHTML('beforeend',profileCustomRowV21({}));document.getElementById('profileBirthDate').onchange=e=>document.getElementById('profileAge').value=calculateAgeV22(e.target.value);document.getElementById('analyzeProfileTextV22').onclick=analyzeProfileImportV22;document.getElementById('profileForm').onsubmit=saveProfileV22;
  }));
};
function analyzeProfileImportV22(){const text=document.getElementById('profileImportTextV22').value.trim();if(!text)return toast('Pega el texto de identificación');const d=parseKardexTextV22(text);const map={listNumber:'profileListNumber',name:'profileName',grade:'profileGrade',ci:'profileCI',scale:'profileScale',phone:'profilePhone',birthDate:'profileBirthDate',bloodType:'profileBlood',insuredNumber:'profileInsured',employerNumber:'profileEmployer',address:'profileAddress',email:'profileEmail',unit:'profileUnit',course:'profileCourse',parallel:'profileParallel',shift:'profileShift'};Object.entries(map).forEach(([k,id])=>{if(d[k]&&document.getElementById(id))document.getElementById(id).value=d[k];});document.getElementById('profileAge').value=calculateAgeV22(document.getElementById('profileBirthDate').value);toast('Información detectada. Revisa antes de guardar.');}
async function saveProfileV22(e){e.preventDefault();const custom=[...document.querySelectorAll('.profile-custom-row')].map(r=>({label:r.querySelector('.custom-label').value.trim(),value:r.querySelector('.custom-value').value.trim()})).filter(x=>x.label||x.value);const p={listNumber:document.getElementById('profileListNumber').value.trim(),name:document.getElementById('profileName').value.trim(),grade:document.getElementById('profileGrade').value.trim(),ci:document.getElementById('profileCI').value.trim(),ciPlace:document.getElementById('profileCIPlace').value.trim(),scale:document.getElementById('profileScale').value.trim(),phone:document.getElementById('profilePhone').value.trim(),birthDate:document.getElementById('profileBirthDate').value,bloodType:document.getElementById('profileBlood').value.trim(),insuredNumber:document.getElementById('profileInsured').value.trim(),employerNumber:document.getElementById('profileEmployer').value.trim(),unit:document.getElementById('profileUnit').value.trim(),course:document.getElementById('profileCourse').value.trim(),parallel:document.getElementById('profileParallel').value.trim(),shift:document.getElementById('profileShift').value.trim(),address:document.getElementById('profileAddress').value.trim(),email:document.getElementById('profileEmail').value.trim(),originalText:document.getElementById('profileImportTextV22').value.trim(),custom,updatedAt:nowISO()};await dbSet('profile',p);closeModal();toast('Kardex guardado');render();}
saveProfileV21=saveProfileV22;

/* ---------------------- Respaldo e importación 2.2 ----------------------- */
exportBackupV21=async function(){const keys=['agenda','horarioSemanal','historialHorarios','pendientes','favorites','settings','scheduleMeta','schedulePhoto','profile','lastBackup'];const data={app:'PoliAgenda Pro',version:APP_VERSION,exportedAt:nowISO(),data:{}};for(const key of keys)data.data[key]=await dbGet(key,key==='settings'?{}:key==='schedulePhoto'||key==='profile'?null:[]);const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`respaldo-poliagenda-${todayISO()}.json`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);await dbSet('lastBackup',nowISO());toast('Respaldo exportado');render();};
exportBackup=exportBackupV21;
importBackup=async function(file){if(!file)return;try{const parsed=JSON.parse(await file.text());if(parsed.app&&parsed.app!=='PoliAgenda Pro')throw new Error('Aplicación no compatible');const data=parsed.data||parsed;if(!data||typeof data!=='object')throw new Error('Estructura inválida');if(!confirm('La importación reemplazará los datos actuales. ¿Continuar?'))return;const keys=['agenda','horarioSemanal','historialHorarios','pendientes','favorites','settings','scheduleMeta','schedulePhoto','profile','lastBackup'];for(const key of keys)if(Object.prototype.hasOwnProperty.call(data,key))await dbSet(key,data[key]);state.settings=await dbGet('settings',{academicMode:true,scheduleInitialized:true,initialModeChosen:true});state.settings.scheduleInitialized=true;state.settings.initialModeChosen=true;await dbSet('settings',state.settings);toast('Respaldo restaurado correctamente');render();}catch(e){console.error(e);toast('El archivo no es un respaldo válido');}};

/* -------------------------- Configuración 2.2 ---------------------------- */
const renderSettingsV21Base=renderSettingsV21;
renderSettingsV21=async function(){
  const profile=await dbGet('profile',{}),lastBackup=await dbGet('lastBackup',null),lastCheck=await dbGet('lastUpdateCheck',null),media=await dbGet('offlineMedia',null);
  return `<div class="actions page-back"><button class="btn secondary small" data-nav="home">${icon('back')} Volver</button></div><div class="page-title"><div><h2>Configuración</h2><p>Modo de uso, Kardex, actualización y respaldo.</p></div></div><div class="stack"><article class="card"><div class="switch-row"><div><h3>Modo académico</h3><p>Al desactivarlo, se ocultan horario y clases. Formaciones, servicios, Biblioteca y tareas se conservan.</p></div><label class="switch"><input id="academicModeSwitch" type="checkbox" ${state.settings.academicMode?'checked':''}><span class="slider"></span></label></div></article><article class="card"><div class="card-head"><div class="icon-tile">${icon('user')}</div><div class="card-main"><h3>Ficha Kardex voluntaria</h3><p>${profile?.name?`${escapeHtml(profile.grade||'')} ${escapeHtml(profile.name)}`:'Guarda datos que necesitas consultar o copiar con frecuencia.'}</p><button class="btn secondary small" data-action="edit-profile">Abrir Kardex</button></div></div></article><article class="card"><div class="card-head"><div class="icon-tile gold">${icon('download')}</div><div class="card-main"><h3>Actualizaciones</h3><p>La app consulta GitHub cuando existe conexión. La actualización no debe interrumpir un registro.</p><div class="card-meta"><span class="badge">Versión ${APP_VERSION}</span><span class="badge">Última revisión: ${lastCheck?escapeHtml(new Date(lastCheck).toLocaleString('es-BO')):'Nunca'}</span></div><button class="btn secondary small" data-action="check-update">Buscar actualización</button></div></div></article><article class="card"><div class="card-head"><div class="icon-tile">${icon('download')}</div><div class="card-main"><h3>Respaldo integral</h3><p>Incluye horario, fotografía, tareas, notas, consignas, actividades y Kardex.</p><div class="card-meta"><span class="badge">Último: ${lastBackup?escapeHtml(new Date(lastBackup).toLocaleString('es-BO')):'Nunca'}</span></div><div class="actions"><button class="btn primary small" data-action="export-backup">Exportar</button><label class="btn secondary small" for="backupInput">Importar</label><input class="file-input" id="backupInput" type="file" accept="application/json,.json"></div></div></div></article><article class="card"><div class="card-head"><div class="icon-tile">${icon('install')}</div><div class="card-main"><h3>${isStandalone()?'Aplicación instalada':'Instalar aplicación'}</h3><p>${isStandalone()?'Se abre como aplicación independiente.':'En iPhone usa Safari → Compartir → Agregar a pantalla de inicio.'}</p>${!isStandalone()?'<button class="btn secondary small" id="installAppBtn">Instalar en Android</button>':''}</div></div></article><article class="card danger"><h3>Eliminar datos académicos</h3><p>Elimina horario, fotografía e historial. No elimina tareas, actividades, Biblioteca ni Kardex.</p><button class="btn danger small" data-action="clear-academic">Eliminar</button></article></div>`;
};
clearAcademicData=async function(){if(!confirm('Se borrarán el horario vigente, su fotografía y el historial académico. ¿Continuar?'))return;const word=prompt('Escribe ELIMINAR para confirmar');if(word!=='ELIMINAR')return toast('Operación cancelada');await dbSet('horarioSemanal',[]);await dbSet('historialHorarios',[]);await dbDelete('schedulePhoto');state.settings.scheduleInitialized=true;await dbSet('settings',state.settings);toast('Datos académicos eliminados');render();};

/* ------------------------------ Enlaces UI ------------------------------- */
const bindPageEventsV22Base=bindPageEventsV21;
bindPageEventsV21=function(){
  bindPageEventsV22Base();
  document.getElementById('documentSearchV22')?.addEventListener('input',e=>{const q=normalize(e.target.value);const box=document.getElementById('documentArticlesV22');const data=state.libraryDocs[state.libraryDoc];const items=(data?.articulos||[]).filter(a=>!q||normalize(`${a.numero} ${a.titulo} ${a.texto}`).includes(q)).slice(0,150);box.innerHTML=items.map(a=>articleCardV22({...a,_doc:state.libraryDoc})).join('')||'<div class="card empty"><p>No se encontraron artículos.</p></div>';box.querySelectorAll('[data-article-id]').forEach(b=>b.onclick=()=>openArticle(b.dataset.articleDoc,b.dataset.articleId));});
  document.querySelectorAll('[data-record-tab]').forEach(b=>b.onclick=()=>{state.reminderTab=b.dataset.recordTab;render();});
  document.querySelectorAll('[data-toggle-task]').forEach(b=>b.onclick=()=>toggleTaskV22(b.dataset.toggleTask));
  document.querySelectorAll('[data-toggle-subtask]').forEach(b=>b.onchange=()=>toggleSubtaskV22(b.dataset.toggleSubtask,b.dataset.subtaskId,b.checked));
  document.querySelectorAll('[data-edit-record]').forEach(b=>b.onclick=()=>editRecordV22(b.dataset.editRecord));
  document.querySelectorAll('[data-pin-record]').forEach(b=>b.onclick=()=>pinRecordV22(b.dataset.pinRecord));
  document.querySelectorAll('[data-toggle-consigna]').forEach(b=>b.onclick=()=>toggleConsignaV22(b.dataset.toggleConsigna));
  document.getElementById('schedulePhotoInput')?.addEventListener('change',e=>handleSchedulePhotoV22(e.target.files[0]));
  document.querySelector('[data-action="view-schedule-photo"]')?.addEventListener('click',viewSchedulePhotoV22);
  document.querySelector('[data-action="analyze-schedule-photo"]')?.addEventListener('click',recognizeSchedulePhotoV22);
  document.querySelector('[data-action="manual-schedule-text"]')?.addEventListener('click',manualScheduleTextV22);
  document.querySelector('[data-action="rotate-schedule-photo"]')?.addEventListener('click',rotateSchedulePhotoV22);
  document.querySelector('[data-action="delete-schedule-photo"]')?.addEventListener('click',deleteSchedulePhotoV22);
};


const saveParsedInstructionV21BaseV22=saveParsedInstructionV21;
saveParsedInstructionV21=async function(e){
  const type=document.getElementById('parsedType')?.value||'';
  await saveParsedInstructionV21BaseV22(e);
  if(!['Formación','Servicio','Reunión'].includes(type)){state.reminderTab=type==='Nota'?'notes':type==='Pendiente'||type==='Requisito'?'tasks':'notifications';render();}
};
archiveReminder=async function(id,archived=true){
  let list=await dbGet('pendientes',[]);const i=list.findIndex(x=>x.id===id);if(i<0)return;
  list[i].archived=archived;
  if(!archived){list[i].done=false;list[i].resolvedAt='';}
  list[i].updated=nowISO();await dbSet('pendientes',list);toast(archived?'Archivado':'Restaurado');render();
};

/* Lanzamiento después de aplicar todas las extensiones. */
if(typeof window!=='undefined'&&!window.__POLI_TEST__)init();
