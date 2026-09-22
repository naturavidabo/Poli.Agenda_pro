
(function(){
'use strict';

const VERSION='2.24.0';
const DB_NAME='agenda-reader-v240';
const DB_STORE='progress';
const LS_PREFIX='agenda-reader-v240-progress-';
const LS_LAST='agenda-reader-v240-last';
const VOICE_PREF='agenda-reader-v240-voice';
let dbPromise=null;
let sessionSeq=0;
let boundarySaveTimer=0;
let wakeLock=null;
let dashboardLoadRunning=false;
let dashboardLoadPending=false;
let dashboardCourseTouchAt=0;
let lastOnlineRenderKey='';

const reader={
  session:0,file:null,type:null,docKey:'',fingerprint:'',blocks:[],chunks:[],
  chunkIndex:0,charOffset:0,rate:1,voiceName:'',playing:false,paused:false,
  completed:false,loading:false,utterance:null,speechToken:0,lastBlock:-1,
  savedAt:0,openedFrom:'',autoplay:false
};

function q(sel,root){return (root||document).querySelector(sel)}
function qa(sel,root){return Array.from((root||document).querySelectorAll(sel))}
function safeEsc(value){
  try{if(typeof esc==='function')return esc(value==null?'':String(value))}catch(_){}
  return String(value==null?'':value).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]});
}
function sayToast(msg){try{toast(msg)}catch(_){console.log(msg)}}
function clamp(n,min,max){return Math.max(min,Math.min(max,n))}
function hashText(input){
  let h=2166136261,s=String(input||'');
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}
  return (h>>>0).toString(36);
}
function cleanUrl(url){return String(url||'').split('#')[0].split('?')[0]}
function fileType(file){
  try{if(typeof academicReaderFileTypeV290==='function')return academicReaderFileTypeV290(file)}catch(_){}
  const name=String(file&&file.name||'').toLowerCase();
  const mime=String(file&&file.type||file&&file.mime||'').toLowerCase();
  if(name.endsWith('.docx')||mime.indexOf('wordprocessingml')>=0)return 'docx';
  if(name.endsWith('.pdf')||mime==='application/pdf')return 'pdf';
  return '';
}
function snapshotFile(file){
  return {
    url:String(file&&file.url||''),path:String(file&&file.path||''),
    name:String(file&&file.name||'Documento'),type:String(file&&file.type||file&&file.mime||''),
    mime:String(file&&file.mime||file&&file.type||''),size:Number(file&&file.size||0),
    subject:String(file&&file.subject||''),subject_code:String(file&&file.subject_code||''),
    teacher:String(file&&file.teacher||'')
  };
}
function documentKey(file){
  const stable=String(file&&file.path||'').trim()||
    cleanUrl(file&&file.url||'')||
    [file&&file.subject||'',file&&file.name||'Documento',file&&file.size||0].join('|');
  return hashText(String(stable).toLowerCase());
}
function progressKey(key){return LS_PREFIX+key}
function nowIso(){return new Date().toISOString()}

function openDb(){
  if(dbPromise)return dbPromise;
  dbPromise=new Promise(function(resolve){
    if(!('indexedDB' in window))return resolve(null);
    try{
      const req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=function(){if(!req.result.objectStoreNames.contains(DB_STORE))req.result.createObjectStore(DB_STORE)};
      req.onsuccess=function(){resolve(req.result)};
      req.onerror=function(){resolve(null)};
    }catch(_){resolve(null)}
  });
  return dbPromise;
}
async function dbGet(key){
  const db=await openDb();if(!db)return null;
  return new Promise(function(resolve){
    try{
      const tx=db.transaction(DB_STORE,'readonly'),req=tx.objectStore(DB_STORE).get(key);
      req.onsuccess=function(){resolve(req.result||null)};req.onerror=function(){resolve(null)};
    }catch(_){resolve(null)}
  });
}
async function dbSet(key,value){
  const db=await openDb();if(!db)return false;
  return new Promise(function(resolve){
    try{
      const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).put(value,key);
      tx.oncomplete=function(){resolve(true)};tx.onerror=function(){resolve(false)};
    }catch(_){resolve(false)}
  });
}
async function dbDelete(key){
  const db=await openDb();if(!db)return false;
  return new Promise(function(resolve){
    try{
      const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).delete(key);
      tx.oncomplete=function(){resolve(true)};tx.onerror=function(){resolve(false)};
    }catch(_){resolve(false)}
  });
}
function localRead(key){
  try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):null}catch(_){return null}
}
function localWrite(key,value){
  try{localStorage.setItem(key,JSON.stringify(value));return true}catch(_){return false}
}
function localDelete(key){try{localStorage.removeItem(key)}catch(_){}}

function sanitizeSpeech(text){
  return String(text||'')
    .replace(/(?:-{1,3}>|={1,3}>|<-{1,3}|<={1,3})/g,', ')
    .replace(/[→➜➝➞➟➠➡⟶⟹⇒⇢↦←⬅⟵⇐⇠↤↑⬆⇧↓⬇⇩↕↔↗↘↙↖]/g,', ')
    .replace(/[•●▪◦■◆◇►▶◀✓✔☑]/g,', ')
    .replace(/\s*,\s*(?:,\s*)+/g,', ')
    .replace(/\s{2,}/g,' ')
    .replace(/\s+([,.;:!?])/g,'$1')
    .trim();
}
function normalizeAnchor(text){
  return String(text||'').toLowerCase().replace(/\s+/g,' ').trim();
}
function sentencePieces(text){
  const raw=String(text||'').replace(/\s+/g,' ').trim();
  if(!raw)return [];
  const matches=raw.match(/[^.!?;:]+[.!?;:]?|.+$/g)||[raw];
  const out=[];
  matches.forEach(function(part){
    let p=part.trim();if(!p)return;
    while(p.length>360){
      let cut=p.lastIndexOf(' ',360);if(cut<180)cut=360;
      out.push(p.slice(0,cut).trim());p=p.slice(cut).trim();
    }
    if(p)out.push(p);
  });
  return out;
}
function buildChunks(blocks){
  const chunks=[];
  blocks.forEach(function(block,blockIndex){
    const pieces=sentencePieces(block.text);
    let buf='';
    function flush(){
      const text=buf.trim();
      if(text)chunks.push({text:text,speech:sanitizeSpeech(text),blockIndex:blockIndex});
      buf='';
    }
    pieces.forEach(function(piece){
      const candidate=(buf+' '+piece).trim();
      if(candidate.length>420&&buf){flush();buf=piece}else buf=candidate;
      if(buf.length>520)flush();
    });
    flush();
  });
  return chunks.filter(function(x){return x.speech.length>0});
}
function fingerprintChunks(chunks){
  const head=chunks.slice(0,24).map(function(c){return c.speech}).join('|');
  const tail=chunks.slice(-8).map(function(c){return c.speech}).join('|');
  return hashText(chunks.length+'|'+head+'|'+tail);
}
function currentChunk(){return reader.chunks[reader.chunkIndex]||null}
function currentBlock(){
  const c=currentChunk();return c?Number(c.blockIndex||0):0;
}
function currentAnchor(){
  const c=currentChunk();if(!c)return '';
  const text=c.speech||'',at=clamp(Number(reader.charOffset||0),0,text.length);
  return text.slice(Math.max(0,at-24),Math.min(text.length,at+96));
}
function progressPayload(reason){
  const c=currentChunk();
  return {
    version:VERSION,docKey:reader.docKey,fingerprint:reader.fingerprint,
    chunkIndex:Math.max(0,Number(reader.chunkIndex||0)),
    blockIndex:Math.max(0,currentBlock()),
    charOffset:Math.max(0,Number(reader.charOffset||0)),
    anchor:currentAnchor(),rate:Number(reader.rate||1),
    voiceName:String(reader.voiceName||voicePreference()||''),
    completed:Boolean(reader.completed),totalChunks:reader.chunks.length,
    reason:String(reason||'activity'),at:Date.now(),updatedAt:nowIso(),
    title:String(reader.file&&reader.file.name||'Documento')
  };
}
function renderSavedIndicator(payload){
  const el=q('#ar240Saved');if(!el)return;
  const total=reader.chunks.length||Number(payload&&payload.totalChunks||0)||0;
  const pos=reader.completed?total:Math.min(total,Math.max(1,Number(reader.chunkIndex||0)+1));
  const time=payload&&payload.at?new Date(payload.at).toLocaleTimeString('es-BO',{hour:'2-digit',minute:'2-digit'}):'';
  el.textContent=total?'Guardado: '+pos+'/'+total+(time?' · '+time:''):'Sin posición guardada';
}
function renderCapsule(){
  const old=q('#ar240Capsule');if(old)old.remove();
  let last=localRead(LS_LAST);
  if(!last||!last.file||!last.progress)return;
  try{
    if(typeof state!=='undefined'&&state&&state.view!=='online')return;
  }catch(_){}
  if(q('#ar240Root'))return;
  const p=last.progress,total=Number(p.totalChunks||0),pos=p.completed?total:Math.min(total,Math.max(1,Number(p.chunkIndex||0)+1));
  const div=document.createElement('div');div.id='ar240Capsule';div.className='ar240-capsule';
  div.innerHTML='<button class="ar240-capsule-main" type="button"><span>🔊</span><span><small>CONTINUAR LECTURA</small><b>'+safeEsc(last.file.name||'Documento')+'</b><em>'+safeEsc(p.completed?'Finalizado':'Punto '+pos+' de '+total)+'</em></span><strong>Continuar</strong></button><button class="ar240-capsule-x" type="button" aria-label="Quitar">×</button>';
  div.querySelector('.ar240-capsule-main').onclick=function(){api.resumeLast()};
  div.querySelector('.ar240-capsule-x').onclick=function(e){e.stopPropagation();clearLast()};
  document.body.appendChild(div);
}
function saveProgress(reason,immediate){
  if(!reader.file||!reader.docKey||!reader.chunks.length)return;
  const payload=progressPayload(reason);
  reader.savedAt=payload.at;
  localWrite(progressKey(reader.docKey),payload);
  localWrite(LS_LAST,{file:snapshotFile(reader.file),progress:payload,at:payload.at});
  renderSavedIndicator(payload);
  if(immediate)dbSet(reader.docKey,payload);
  else{
    clearTimeout(boundarySaveTimer);
    boundarySaveTimer=setTimeout(function(){dbSet(reader.docKey,payload)},650);
  }
  setTimeout(renderCapsule,30);
}
async function loadProgress(key){
  const local=localRead(progressKey(key));
  const db=await dbGet(key);
  if(local&&db)return Number(local.at||0)>=Number(db.at||0)?local:db;
  return local||db||null;
}
function clearLast(){
  const last=localRead(LS_LAST);
  localDelete(LS_LAST);
  if(last&&last.progress&&last.progress.docKey){
    localDelete(progressKey(last.progress.docKey));
    dbDelete(last.progress.docKey);
  }
  renderCapsule();
}
function voicePreference(){try{return localStorage.getItem(VOICE_PREF)||''}catch(_){return ''}}
function setVoicePreference(name){try{name?localStorage.setItem(VOICE_PREF,name):localStorage.removeItem(VOICE_PREF)}catch(_){}}
function spanishVoices(){
  const voices=(window.speechSynthesis&&window.speechSynthesis.getVoices?window.speechSynthesis.getVoices():[])||[];
  const seen=new Set(),out=[];
  voices.forEach(function(v){
    const lang=String(v.lang||'');
    if(!/^es(?:[-_]|$)/i.test(lang))return;
    const key=(String(v.name||'')+'|'+lang).toLowerCase();
    if(seen.has(key))return;seen.add(key);out.push(v);
  });
  return out;
}
function autoVoice(){
  const voices=spanishVoices();if(!voices.length)return null;
  function score(v){
    const lang=String(v.lang||'').replace('_','-').toLowerCase(),name=String(v.name||'').toLowerCase();
    let s=0;
    if(/neural|natural|premium|enhanced|studio/.test(name))s+=100;
    if(/google|microsoft|samsung/.test(name))s+=35;
    if(lang==='es-bo')s+=28;
    else if(/^es-(419|mx|us|ar|cl|co|pe|es)$/.test(lang))s+=24;
    else if(lang.indexOf('es-')===0)s+=18;
    return s;
  }
  return voices.map(function(v){return {v:v,s:score(v)}}).sort(function(a,b){return b.s-a.s})[0].v;
}
function selectedVoice(){
  const voices=spanishVoices(),pref=reader.voiceName||voicePreference();
  if(pref){const found=voices.find(function(v){return String(v.name||'')===pref});if(found)return found}
  return autoVoice();
}
function voiceOptions(){
  const voices=spanishVoices(),pref=reader.voiceName||voicePreference();
  let html='<option value="">Automática</option>';
  voices.forEach(function(v){
    const name=String(v.name||'Voz'),selected=pref===name?' selected':'';
    html+='<option value="'+safeEsc(name)+'"'+selected+'>'+safeEsc(name+' · '+(v.lang||'es'))+'</option>';
  });
  return html;
}
function updateVoiceUi(){
  const sel=q('#ar240Voice');if(sel)sel.innerHTML=voiceOptions();
  if(sel)sel.value=reader.voiceName||voicePreference()||'';
  const label=q('#ar240VoiceActual'),v=selectedVoice();
  if(label)label.textContent=v?'Disponible: '+(v.name||v.lang):'Usando la voz predeterminada de Android';
}

async function ensureDependencies(type){
  if(typeof academicReaderDepsV290==='function')return academicReaderDepsV290(type);
  throw new Error('No está disponible el cargador de documentos');
}
async function fetchBuffer(file){
  if(typeof academicReaderFetchV290==='function')return academicReaderFetchV290(file);
  const response=await fetch(file.url,{cache:'no-store'});
  if(!response.ok)throw new Error('No se pudo descargar el documento');
  return response.arrayBuffer();
}
function docxBlocksFromHtml(html){
  const doc=new DOMParser().parseFromString(String(html||''),'text/html'),blocks=[];
  const nodes=doc.body.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,tr');
  nodes.forEach(function(node){
    const tag=node.tagName.toLowerCase();
    if((tag==='p'||tag==='li')&&node.closest('td,th'))return;
    let text='';
    if(tag==='tr'){
      text=Array.from(node.querySelectorAll(':scope > td,:scope > th')).map(function(cell){return String(cell.textContent||'').replace(/\s+/g,' ').trim()}).filter(Boolean).join(' — ');
    }else text=String(node.textContent||'').replace(/\s+/g,' ').trim();
    if(!text)return;
    let kind='p';if(/^h[1-6]$/.test(tag))kind='h';else if(tag==='li')kind='li';else if(tag==='tr')kind='table';
    blocks.push({text:text,kind:kind});
  });
  return blocks;
}
async function loadDocx(buffer){
  if(!window.mammoth)throw new Error('No se cargó el lector Word');
  const result=await window.mammoth.convertToHtml({arrayBuffer:buffer},{includeDefaultStyleMap:true});
  let blocks=docxBlocksFromHtml(result&&result.value||'');
  if(!blocks.length){
    const raw=await window.mammoth.extractRawText({arrayBuffer:buffer});
    blocks=String(raw&&raw.value||'').split(/\n+/).map(function(x){return x.trim()}).filter(Boolean).map(function(text){return {text:text,kind:'p'}});
  }
  return blocks;
}
async function loadPdf(buffer){
  if(!window.pdfjsLib)throw new Error('No se cargó el lector PDF');
  const task=window.pdfjsLib.getDocument({data:new Uint8Array(buffer)}),pdf=await task.promise,blocks=[];
  for(let pageNum=1;pageNum<=pdf.numPages;pageNum++){
    const loading=q('#ar240LoadingText');if(loading)loading.textContent='Preparando PDF · página '+pageNum+' de '+pdf.numPages;
    const page=await pdf.getPage(pageNum),content=await page.getTextContent();
    let line='';
    (content.items||[]).forEach(function(item){
      const value=String(item&&item.str||'').trim();
      if(value)line+=(line?' ':'')+value;
      if(item&&item.hasEOL&&line.trim()){blocks.push({text:line.replace(/\s+/g,' ').trim(),kind:'p',page:pageNum});line=''}
    });
    if(line.trim())blocks.push({text:line.replace(/\s+/g,' ').trim(),kind:'p',page:pageNum});
    if(pageNum%4===0)await new Promise(function(resolve){setTimeout(resolve,0)});
  }
  try{pdf.destroy()}catch(_){}
  return blocks;
}
async function loadDocument(file,type){
  await ensureDependencies(type);
  const buffer=await fetchBuffer(file);
  return type==='docx'?loadDocx(buffer):loadPdf(buffer);
}

function showLoading(file){
  const subject=String(file&&file.subject||file&&file.subject_code||'Material académico');
  const html='<div id="ar240Root" class="ar240-root"><header class="ar240-head"><div class="ar240-doc"><span>📘</span><div><small>'+safeEsc(subject)+'</small><b>'+safeEsc(file&&file.name||'Documento')+'</b></div></div><button class="ar240-exit" type="button" onclick="AcademicReader240.close()">✕ Salir</button></header><main class="ar240-loading"><span class="ar240-spinner"></span><b id="ar240LoadingText">Preparando lectura…</b><small>La posición guardada se recupera antes de habilitar la voz.</small></main></div>';
  showModal(html);
  const root=q('#ar240Root'),host=root&&root.closest('.modal'),bg=root&&root.closest('.modal-bg');
  if(host)host.classList.add('ar240-modal-host');
  if(bg){bg.classList.add('ar240-bg');bg.onclick=function(e){if(e.target===bg)api.close()}}
  const cap=q('#ar240Capsule');if(cap)cap.remove();
}
function blockHtml(block,index){
  const cls='ar240-block ar240-'+(block.kind||'p');
  const tag=block.kind==='h'?'h3':block.kind==='li'?'div':block.kind==='table'?'div':'p';
  const prefix=block.kind==='li'?'<span class="ar240-bullet">•</span>':'';
  return '<'+tag+' id="ar240Block_'+index+'" class="'+cls+'" data-block="'+index+'" onclick="AcademicReader240.startBlock('+index+')">'+prefix+safeEsc(block.text)+'</'+tag+'>';
}
function controlsHtml(){
  return '<section class="ar240-controls">'+
    '<div class="ar240-main-controls">'+
      '<button type="button" class="ar240-small" onclick="AcademicReader240.previous()"><span>⏮</span><b>Atrás</b></button>'+
      '<button id="ar240Play" type="button" class="ar240-play" onclick="AcademicReader240.toggle()"><span>▶</span><b>Escuchar</b></button>'+
      '<button type="button" class="ar240-small" onclick="AcademicReader240.next()"><span>⏭</span><b>Adelante</b></button>'+
      '<label class="ar240-rate"><span>Velocidad</span><select id="ar240Rate" onchange="AcademicReader240.setRate(this.value)">'+[0.8,1,1.1,1.15,1.2,1.25,1.4,1.6].map(function(v){return '<option value="'+v+'"'+(Math.abs(reader.rate-v)<0.001?' selected':'')+'>'+v+'×</option>'}).join('')+'</select></label>'+
      '<button type="button" class="ar240-more-btn" onclick="AcademicReader240.toggleMore()"><span>•••</span><b>Más</b></button>'+
    '</div>'+
    '<div class="ar240-progress-row"><div><b id="ar240Status">Listo para leer</b><small id="ar240Saved">Sin posición guardada</small></div><progress id="ar240Progress" max="'+Math.max(1,reader.chunks.length)+'" value="'+Math.min(reader.chunks.length,reader.chunkIndex+1)+'"></progress></div>'+
    '<div id="ar240More" class="ar240-more" hidden>'+
      '<label class="ar240-voice-field"><span>Voz del dispositivo</span><select id="ar240Voice" onchange="AcademicReader240.setVoice(this.value)">'+voiceOptions()+'</select><small id="ar240VoiceActual"></small></label>'+
      '<div class="ar240-more-actions"><button type="button" onclick="AcademicReader240.saveNow()">Guardar ahora</button><button type="button" onclick="AcademicReader240.restart()">Reiniciar lectura</button><button type="button" class="danger" onclick="AcademicReader240.forget()">Olvidar posición</button></div>'+
      '<p>La voz depende de las voces TTS que Android entregue al navegador. El lector conserva el punto exacto aunque la voz local sea la misma.</p>'+
    '</div>'+
  '</section>';
}
function renderDocument(){
  const root=q('#ar240Root');if(!root)return;
  const subject=String(reader.file&&reader.file.subject||reader.file&&reader.file.subject_code||'Material académico');
  root.innerHTML='<header class="ar240-head"><div class="ar240-doc"><span>📘</span><div><small>'+safeEsc(subject)+'</small><b>'+safeEsc(reader.file&&reader.file.name||'Documento')+'</b></div></div><button class="ar240-exit" type="button" onclick="AcademicReader240.close()">✕ Salir</button></header>'+
    controlsHtml()+
    '<div class="ar240-structure"><span>📖</span><div><b>Lectura estructurada</b><small>'+reader.blocks.length+' bloques · '+reader.chunks.length+' fragmentos de voz</small></div></div>'+
    '<article id="ar240Text" class="ar240-text">'+reader.blocks.map(blockHtml).join('')+'</article>';
  updateVoiceUi();updateUi();highlightCurrent(false);
}
function updateUi(){
  const total=reader.chunks.length,pos=total?Math.min(total,reader.chunkIndex+1):0;
  const play=q('#ar240Play');
  if(play){
    if(reader.playing)play.innerHTML='<span>⏸</span><b>Pausar</b>';
    else if(reader.completed)play.innerHTML='<span>✓</span><b>Finalizado</b>';
    else play.innerHTML='<span>▶</span><b>Escuchar</b>';
    play.disabled=reader.loading||!total;
  }
  const status=q('#ar240Status');
  if(status){
    if(reader.loading)status.textContent='Preparando lectura…';
    else if(reader.completed)status.textContent='Lectura finalizada · '+total+' de '+total;
    else if(reader.playing)status.textContent='Leyendo '+pos+' de '+total;
    else if(reader.paused)status.textContent='Pausado en '+pos+' de '+total;
    else status.textContent='Listo en '+pos+' de '+total;
  }
  const prog=q('#ar240Progress');if(prog){prog.max=Math.max(1,total);prog.value=Math.max(0,pos)}
  const rate=q('#ar240Rate');if(rate)rate.value=String(reader.rate);
}
function highlightCurrent(scroll){
  qa('.ar240-block').forEach(function(el){el.classList.toggle('current',Number(el.dataset.block)===currentBlock())});
  const block=currentBlock();
  if(block!==reader.lastBlock){
    reader.lastBlock=block;
    if(scroll){
      const el=q('#ar240Block_'+block);if(el)el.scrollIntoView({block:'center',behavior:'auto'});
    }
  }
}
function findResume(progress){
  if(!progress||!reader.chunks.length)return {chunkIndex:0,charOffset:0,completed:false};
  let idx=Number(progress.chunkIndex),offset=Number(progress.charOffset||0);
  const sameFingerprint=progress.fingerprint&&progress.fingerprint===reader.fingerprint;
  if(!sameFingerprint||!Number.isFinite(idx)||idx<0||idx>=reader.chunks.length){
    idx=-1;
    const anchor=normalizeAnchor(progress.anchor||'');
    if(anchor.length>=12){
      const needle=anchor.slice(0,Math.min(anchor.length,72));
      for(let i=0;i<reader.chunks.length;i++){
        const hay=normalizeAnchor(reader.chunks[i].speech);
        const at=hay.indexOf(needle);
        if(at>=0){idx=i;offset=at;break}
      }
    }
    if(idx<0&&Number.isFinite(Number(progress.blockIndex))){
      idx=reader.chunks.findIndex(function(c){return Number(c.blockIndex)===Number(progress.blockIndex)});
    }
    if(idx<0)idx=0;
  }
  const max=(reader.chunks[idx]&&reader.chunks[idx].speech.length)||0;
  offset=clamp(Number.isFinite(offset)?offset:0,0,max);
  return {chunkIndex:idx,charOffset:offset,completed:Boolean(progress.completed&&idx>=reader.chunks.length-1)};
}
function applyProgress(progress){
  const p=findResume(progress);
  reader.chunkIndex=p.chunkIndex;reader.charOffset=p.charOffset;reader.completed=p.completed;
  if(progress&&Number.isFinite(Number(progress.rate)))reader.rate=clamp(Number(progress.rate),0.6,2);
  if(progress&&progress.voiceName&&!voicePreference())reader.voiceName=String(progress.voiceName);
}
function stopSpeechOnly(){
  reader.speechToken++;
  try{window.speechSynthesis&&window.speechSynthesis.cancel()}catch(_){}
  reader.utterance=null;
}
async function acquireWake(){
  try{
    if('wakeLock' in navigator&&document.visibilityState==='visible'){wakeLock=await navigator.wakeLock.request('screen')}
  }catch(_){}
}
function releaseWake(){try{wakeLock&&wakeLock.release()}catch(_){}wakeLock=null}

function speakCurrent(){
  if(!reader.file||!reader.chunks.length||reader.completed)return;
  if(reader.chunkIndex>=reader.chunks.length){
    reader.completed=true;reader.playing=false;reader.paused=false;saveProgress('completed',true);updateUi();releaseWake();return;
  }
  const chunk=currentChunk();if(!chunk){reader.completed=true;updateUi();return}
  const full=chunk.speech||'',start=clamp(reader.charOffset,0,full.length);
  if(start>=full.length){
    reader.chunkIndex++;reader.charOffset=0;saveProgress('advance',true);return speakCurrent();
  }
  const text=full.slice(start).trimStart(),leading=full.slice(start).length-text.length,base=start+leading;
  if(!text){reader.chunkIndex++;reader.charOffset=0;saveProgress('advance',true);return speakCurrent()}
  stopSpeechOnly();
  const token=++reader.speechToken,utter=new SpeechSynthesisUtterance(text),voice=selectedVoice();
  reader.utterance=utter;reader.playing=true;reader.paused=false;
  if(voice){utter.voice=voice;utter.lang=voice.lang||'es-BO'}else utter.lang='es-BO';
  utter.rate=Number(reader.rate||1);utter.pitch=1;utter.volume=1;
  utter.onstart=function(){
    if(token!==reader.speechToken)return;
    reader.charOffset=base;saveProgress('start',true);updateUi();highlightCurrent(true);acquireWake();
  };
  utter.onboundary=function(event){
    if(token!==reader.speechToken||!reader.playing)return;
    if(Number.isFinite(Number(event.charIndex))){
      reader.charOffset=clamp(base+Number(event.charIndex),0,full.length);
      saveProgress('boundary',false);
    }
  };
  utter.onend=function(){
    if(token!==reader.speechToken||!reader.playing)return;
    reader.chunkIndex++;reader.charOffset=0;
    if(reader.chunkIndex>=reader.chunks.length){
      reader.chunkIndex=Math.max(0,reader.chunks.length-1);
      reader.charOffset=(currentChunk()&&currentChunk().speech.length)||0;
      reader.completed=true;reader.playing=false;reader.paused=false;
      saveProgress('completed',true);updateUi();highlightCurrent(true);releaseWake();sayToast('Lectura finalizada');return;
    }
    saveProgress('advance',true);updateUi();highlightCurrent(true);setTimeout(speakCurrent,45);
  };
  utter.onerror=function(event){
    if(token!==reader.speechToken)return;
    if(event&&['canceled','interrupted'].indexOf(event.error)>=0)return;
    reader.playing=false;reader.paused=true;saveProgress('speech-error',true);updateUi();releaseWake();
    sayToast('La voz fue pausada por Android. Puede continuar desde el mismo punto.');
  };
  updateUi();highlightCurrent(true);saveProgress('speech',true);
  setTimeout(function(){if(token===reader.speechToken&&reader.playing)try{window.speechSynthesis.speak(utter)}catch(_){reader.playing=false;reader.paused=true;updateUi()}},50);
}
function play(){
  if(reader.loading||!reader.chunks.length)return;
  if(reader.completed){sayToast('La lectura ya terminó. Use “Reiniciar lectura” si desea comenzar nuevamente.');return}
  reader.playing=true;reader.paused=false;updateUi();speakCurrent();
}
function pause(reason){
  if(!reader.file)return;
  reader.playing=false;reader.paused=true;saveProgress(reason||'pause',true);stopSpeechOnly();releaseWake();updateUi();
}
function move(delta){
  if(!reader.chunks.length)return;
  const wasPlaying=reader.playing;
  if(reader.playing)pause('move');else stopSpeechOnly();
  reader.completed=false;reader.paused=false;
  reader.chunkIndex=clamp(reader.chunkIndex+delta,0,reader.chunks.length-1);reader.charOffset=0;
  saveProgress(delta<0?'previous':'next',true);updateUi();highlightCurrent(true);
  if(wasPlaying)setTimeout(play,90);
}
function startBlock(blockIndex){
  const idx=reader.chunks.findIndex(function(c){return Number(c.blockIndex)===Number(blockIndex)});
  if(idx<0)return;
  const wasPlaying=reader.playing;
  if(reader.playing)pause('tap');else stopSpeechOnly();
  reader.chunkIndex=idx;reader.charOffset=0;reader.completed=false;reader.paused=false;
  saveProgress('tap',true);updateUi();highlightCurrent(true);
  if(wasPlaying)setTimeout(play,80);
}
function setRate(value){
  const rate=clamp(Number(value)||1,0.6,2),was=reader.playing;
  if(was)pause('rate');
  reader.rate=rate;saveProgress('rate',true);updateUi();
  if(was)setTimeout(play,90);
}
function setVoice(name){
  const was=reader.playing;if(was)pause('voice');
  reader.voiceName=String(name||'');setVoicePreference(reader.voiceName);updateVoiceUi();saveProgress('voice',true);
  const v=selectedVoice();sayToast(v?'Voz: '+(v.name||v.lang):'Voz automática');
  if(was)setTimeout(play,100);
}
function toggleMore(){
  const panel=q('#ar240More');if(panel)panel.hidden=!panel.hidden;
}
function saveNow(){saveProgress('manual',true);sayToast('Punto de lectura guardado')}
function restart(){
  if(!reader.chunks.length)return;
  if(!confirm('¿Reiniciar este documento desde el principio?'))return;
  stopSpeechOnly();reader.playing=false;reader.paused=false;reader.completed=false;reader.chunkIndex=0;reader.charOffset=0;
  saveProgress('restart',true);updateUi();highlightCurrent(true);setTimeout(play,90);
}
async function forget(){
  if(!reader.docKey)return;
  if(!confirm('¿Olvidar la posición guardada de este documento?'))return;
  pause('forget');
  localDelete(progressKey(reader.docKey));await dbDelete(reader.docKey);
  const last=localRead(LS_LAST);if(last&&last.progress&&last.progress.docKey===reader.docKey)localDelete(LS_LAST);
  reader.chunkIndex=0;reader.charOffset=0;reader.completed=false;reader.paused=false;renderSavedIndicator(null);updateUi();highlightCurrent(true);renderCapsule();sayToast('Posición eliminada');
}
function closeReader(){
  if(reader.file)saveProgress('close',true);
  stopSpeechOnly();reader.playing=false;reader.paused=false;releaseWake();
  const modalRoot=q('#modalRoot');if(modalRoot)modalRoot.innerHTML='';
  setTimeout(renderCapsule,50);
}
async function openFile(file,options){
  options=options||{};
  if(!file)return sayToast('Archivo no disponible');
  const type=fileType(file);
  if(['docx','pdf'].indexOf(type)<0)return sayToast('El lector estructurado admite Word DOCX y PDF con texto');
  stopSpeechOnly();releaseWake();
  reader.session=++sessionSeq;const session=reader.session;
  reader.file=file;reader.type=type;reader.docKey=documentKey(file);reader.blocks=[];reader.chunks=[];reader.chunkIndex=0;reader.charOffset=0;
  reader.rate=1;reader.voiceName=voicePreference();reader.playing=false;reader.paused=false;reader.completed=false;reader.loading=true;reader.lastBlock=-1;reader.autoplay=Boolean(options.autoplay);
  showLoading(file);
  try{
    const progressPromise=loadProgress(reader.docKey);
    const blocks=await loadDocument(file,type);
    if(reader.session!==session)return;
    reader.blocks=blocks;reader.chunks=buildChunks(blocks);reader.fingerprint=fingerprintChunks(reader.chunks);
    if(!reader.chunks.length)throw new Error('El documento no contiene texto suficiente para lectura por voz');
    const progress=await progressPromise;
    if(reader.session!==session)return;
    applyProgress(progress);
    reader.loading=false;renderDocument();renderSavedIndicator(progress);
    if(progress){
      highlightCurrent(true);
      const status=q('#ar240Status'),total=reader.chunks.length,pos=progress.completed?total:Math.min(total,reader.chunkIndex+1);
      if(status)status.textContent=progress.completed?'Lectura finalizada · '+total+' de '+total:'Recuperado: '+pos+' de '+total;
    }
    if(reader.autoplay){
      if(reader.completed)sayToast('Este documento quedó marcado como finalizado. Puede reiniciarlo desde “Más”.');
      else setTimeout(play,140);
    }
  }catch(error){
    console.error('[Reader 2.24]',error);
    if(reader.session!==session)return;
    reader.loading=false;
    const root=q('#ar240Root');if(root)root.innerHTML='<header class="ar240-head"><div class="ar240-doc"><span>📘</span><div><small>Error de lectura</small><b>'+safeEsc(file.name||'Documento')+'</b></div></div><button class="ar240-exit" type="button" onclick="AcademicReader240.close()">✕ Salir</button></header><div class="ar240-error"><span>⚠️</span><h3>No se pudo preparar este documento</h3><p>'+safeEsc(error&&error.message||'Compruebe su conexión e intente nuevamente.')+'</p></div>';
  }
}
async function openByKey(key,options){
  let file=null;
  try{file=academicReaderRegistryV290.get(key)}catch(_){}
  return openFile(file,options);
}
async function resumeLast(){
  const last=localRead(LS_LAST);
  if(!last||!last.file)return sayToast('No existe una lectura guardada');
  return openFile(last.file,{autoplay:true,from:'last'});
}

function currentOnlineKey(){
  try{
    if(typeof state==='undefined'||!state||state.view!=='online')return '';
    const session=typeof academicSession!=='undefined'&&academicSession?academicSession:{};
    return ['online',String(typeof academicTab!=='undefined'?academicTab:'panel'),String(session.user_id||''),String(session.role||''),String(session.course_id||session.course_code||''),String(session.full_name||'')].join('|');
  }catch(_){return ''}
}
async function loadCurrentOnlineTab(){
  if(dashboardLoadRunning){dashboardLoadPending=true;return}
  dashboardLoadRunning=true;
  try{
    if(typeof state==='undefined'||!state||state.view!=='online'||typeof academicSession==='undefined'||!academicSession)return;
    const tab=typeof academicTab!=='undefined'?academicTab:'panel';
    if(typeof ACADEMIC_TYPES!=='undefined'&&ACADEMIC_TYPES&&ACADEMIC_TYPES[tab]&&typeof loadAcademicPosts==='function')await Promise.resolve(loadAcademicPosts());
    else if(tab==='panel'&&typeof loadAcademicDashboard==='function')await Promise.resolve(loadAcademicDashboard());
    else if(tab==='banco'&&typeof loadAcademicBanksV279==='function')await Promise.resolve(loadAcademicBanksV279());
    else if(tab==='usuarios'&&typeof loadAcademicUsers==='function')await Promise.resolve(loadAcademicUsers());
    else if(tab==='cursos'&&typeof loadAcademicCoursesViewV277==='function')await Promise.resolve(loadAcademicCoursesViewV277());
    if(typeof academicLoadMyCoursesV277==='function'&&Date.now()-dashboardCourseTouchAt>45000){
      dashboardCourseTouchAt=Date.now();Promise.resolve(academicLoadMyCoursesV277()).catch(function(){});
    }
  }catch(error){console.warn('[Online 2.24] carga:',error)}
  finally{
    dashboardLoadRunning=false;
    if(dashboardLoadPending){dashboardLoadPending=false;setTimeout(loadCurrentOnlineTab,80)}
  }
}
function installStableOnlineRender(){
  try{
    const previousRender=render;
    render=function renderV240(){
      if(typeof state!=='undefined'&&state&&state.activated&&state.mode&&state.view==='online'){
        const key=currentOnlineKey(),app=q('#app');
        if(key&&key===lastOnlineRenderKey&&app&&app.querySelector('.online-page')){
          setTimeout(loadCurrentOnlineTab,0);setTimeout(renderCapsule,40);return;
        }
        lastOnlineRenderKey=key;
        app.innerHTML=appShell(renderOnline());
        try{wireView()}catch(_){}
        setTimeout(loadCurrentOnlineTab,0);setTimeout(renderCapsule,60);return;
      }
      lastOnlineRenderKey='';
      return previousRender();
    };
    setAcademicTab=async function setAcademicTabV240(tab){
      academicTab=tab;
      try{if(typeof ACADEMIC_TYPES!=='undefined'&&ACADEMIC_TYPES[tab])academicFilter=academicDefaultFilter(tab)}catch(_){}
      lastOnlineRenderKey='';
      render();
    };
  }catch(error){console.warn('[Online 2.24] no se pudo instalar render estable:',error)}
}

const api={
  version:VERSION,
  open:function(key,options){return openByKey(key,options||{})},
  openFile:openFile,
  listen:function(key){return openByKey(key,{autoplay:true})},
  resumeLast:resumeLast,
  toggle:function(){reader.playing?pause('pause'):play()},
  play:play,pause:function(){pause('pause')},
  previous:function(){move(-1)},next:function(){move(1)},
  startBlock:startBlock,setRate:setRate,setVoice:setVoice,toggleMore:toggleMore,
  saveNow:saveNow,restart:restart,forget:forget,close:closeReader,
  clearLast:clearLast,state:reader
};
window.AcademicReader240=api;

try{openAcademicReaderV290=function(key){return api.open(key,{autoplay:false})}}catch(_){}
try{academicListenAttachmentV22312=function(key){return api.listen(key)}}catch(_){}
try{academicReaderResumeLastV2141=function(){return api.resumeLast()}}catch(_){}
try{closeAcademicReaderV290=function(){return api.close()}}catch(_){}

installStableOnlineRender();

document.addEventListener('visibilitychange',function(){
  if(document.hidden&&reader.file){
    if(reader.playing)pause('hidden');else saveProgress('hidden',true);
  }
});
window.addEventListener('pagehide',function(){if(reader.file)saveProgress('pagehide',true)});
window.addEventListener('beforeunload',function(){if(reader.file)saveProgress('beforeunload',false)});
window.addEventListener('pageshow',function(){setTimeout(renderCapsule,100)});
window.addEventListener('online',function(){if(currentOnlineKey())setTimeout(loadCurrentOnlineTab,120)});
try{
  if(window.speechSynthesis&&window.speechSynthesis.addEventListener)window.speechSynthesis.addEventListener('voiceschanged',function(){if(q('#ar240Root'))updateVoiceUi()});
}catch(_){}
setTimeout(renderCapsule,450);
})();
