(()=>{
'use strict';
const VERSION='2.23.3';
let metaRows=[];
let metaPromise=null;
let lastToken='';
let rawRPC=null;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
function session(){try{return typeof academicSession!=='undefined'&&academicSession?academicSession:JSON.parse(localStorage.getItem('agenda-academic-session')||'null')}catch{return null}}
function selectedCourse(){
  const candidates=[...document.querySelectorAll('select')];
  for(const s of candidates){
    const v=String(s.value||'').trim();
    if(/^(capitanes|suboficiales|sargentos)-[a-f]-2026-2$/i.test(v))return v.toLowerCase();
  }
  const txt=candidates.map(s=>s.selectedOptions?.[0]?.textContent||'').join(' | ');
  const m=txt.match(/(capitanes|suboficiales|sargentos)(?:\s+2\.?º?)?\s*([a-f])/i);
  if(m){const level=m[1].toLowerCase();return`${level}-${m[2].toLowerCase()}-2026-2`}
  return session()?.selected_course_code||session()?.course_code||null;
}
function zodiac(md){
  const m=Number(String(md||'').slice(0,2)),d=Number(String(md||'').slice(3,5));
  if(!m||!d)return null;
  const n=m*100+d;
  if(n>=321&&n<=419)return{name:'Aries',icon:'♈'};
  if(n>=420&&n<=520)return{name:'Tauro',icon:'♉'};
  if(n>=521&&n<=620)return{name:'Géminis',icon:'♊'};
  if(n>=621&&n<=722)return{name:'Cáncer',icon:'♋'};
  if(n>=723&&n<=822)return{name:'Leo',icon:'♌'};
  if(n>=823&&n<=922)return{name:'Virgo',icon:'♍'};
  if(n>=923&&n<=1022)return{name:'Libra',icon:'♎'};
  if(n>=1023&&n<=1121)return{name:'Escorpio',icon:'♏'};
  if(n>=1122&&n<=1221)return{name:'Sagitario',icon:'♐'};
  if(n>=1222||n<=119)return{name:'Capricornio',icon:'♑'};
  if(n>=120&&n<=218)return{name:'Acuario',icon:'♒'};
  return{name:'Piscis',icon:'♓'};
}
function birthLabel(md){const m=Number(String(md||'').slice(0,2)),d=Number(String(md||'').slice(3,5));if(!m||!d)return'';const months=['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];return`${String(d).padStart(2,'0')} ${months[m-1]}`}
function installStyles(){if(document.getElementById('personMetaUi2233'))return;const s=document.createElement('style');s.id='personMetaUi2233';s.textContent=`
.ap-person-meta{display:flex!important;flex-wrap:wrap!important;gap:4px!important;margin-top:5px!important;align-items:center!important}.ap-person-meta .pm-chip{display:inline-flex!important;align-items:center!important;gap:3px!important;border-radius:999px!important;padding:3px 6px!important;font-size:9px!important;line-height:1.1!important;font-weight:800!important;white-space:nowrap!important;background:#edf4ee!important;color:#28523a!important;border:1px solid #d8e5da!important}.ap-person-meta .pm-blood{background:#fff0ef!important;color:#8b302b!important;border-color:#f0d3cf!important}.ap-person-meta .pm-bday{background:#fff7df!important;color:#7a5b17!important;border-color:#eadba8!important}.ap-bday-person .ap-person-meta{margin-top:6px!important}.gps-roster-name .ap-person-meta,.sg18-name .ap-person-meta{margin-top:5px!important}
`;
document.head.appendChild(s)}
function clearBirthdayCache(){try{for(let i=sessionStorage.length-1;i>=0;i--){const k=sessionStorage.key(i);if(k&&k.startsWith('agenda-birthdays-v2221:'))sessionStorage.removeItem(k)}}catch{}}
function wrapRPC(){
  if(window.__agendaPersonMetaRpcWrapped)return;
  if(typeof window.academicRPC!=='function')return;
  rawRPC=window.academicRPC.bind(window);
  window.academicRPC=async function(fn,body={}){
    if(fn==='academic_birthdays_v2'&&session()?.role==='administrador_general'){
      const c=selectedCourse();
      if(c)body={...body,p_course_code:c};
    }
    return rawRPC(fn,body);
  };
  window.__agendaPersonMetaRpcWrapped=true;
}
async function loadMeta(force=false){
  wrapRPC();
  const s=session(),token=String(s?.session_token||'');
  if(!token||typeof window.academicRPC!=='function')return[];
  if(token!==lastToken){lastToken=token;metaRows=[];metaPromise=null}
  if(metaRows.length&&!force)return metaRows;
  if(metaPromise&&!force)return metaPromise;
  metaPromise=(async()=>{
    try{
      const data=await window.academicRPC('academic_personnel_meta_v1',{p_token:s.session_token,p_course_code:null});
      metaRows=Array.isArray(data)?data:[];
      return metaRows;
    }catch(e){console.warn('Metadatos de personal: no se pudieron sincronizar',e);return metaRows}
    finally{metaPromise=null}
  })();
  return metaPromise;
}
function matchMeta(name){
  const key=norm(name);if(!key)return null;
  let best=null,bestLen=0;
  for(const r of metaRows){const n=norm(r.full_name);if(!n)continue;if(key===n||key.includes(n)||n.includes(key)){if(n.length>bestLen){best=r;bestLen=n.length}}}
  if(best)return best;
  const words=key.split(' ').filter(x=>x.length>2);let score=0;
  for(const r of metaRows){const rw=norm(r.full_name).split(' ').filter(x=>x.length>2);const common=words.filter(w=>rw.includes(w)).length;const s=common/Math.max(words.length,rw.length,1);if(s>score){score=s;best=r}}
  return score>=.66?best:null;
}
function chips(row){
  if(!row)return'';const z=zodiac(row.birthday_md),parts=[];
  if(z)parts.push(`<span class="pm-chip pm-zodiac" title="Signo zodiacal">${z.icon} ${esc(z.name)}</span>`);
  if(row.blood_type)parts.push(`<span class="pm-chip pm-blood" title="Tipo de sangre">🩸 ${esc(row.blood_type)}</span>`);
  const bd=birthLabel(row.birthday_md);if(bd)parts.push(`<span class="pm-chip pm-bday" title="Cumpleaños">🎂 ${esc(bd)}</span>`);
  return parts.join('');
}
function enrichNode(root,nameSelector,hostSelector){
  root.querySelectorAll(nameSelector).forEach(nameEl=>{
    const host=nameEl.closest(hostSelector)||nameEl.parentElement;if(!host||host.querySelector(':scope .ap-person-meta'))return;
    const row=matchMeta(nameEl.textContent);if(!row)return;
    const html=chips(row);if(!html)return;
    const box=document.createElement('span');box.className='ap-person-meta';box.innerHTML=html;
    nameEl.parentElement?.appendChild(box);
  })
}
function patchBirthdayHeader(){
  const h=document.querySelector('#apBirthdayModal .ap-bday-head small');if(!h)return;
  const c=selectedCourse();if(c)h.textContent=`CUMPLEAÑOS · ${c}`;
}
function enrichAll(){
  if(!metaRows.length)return;
  enrichNode(document,'.ap-person-card .ap-person-main b','.ap-person-card');
  enrichNode(document,'.sg18-card .sg18-name b','.sg18-card');
  enrichNode(document,'.gps-roster-row .gps-roster-name b','.gps-roster-row');
  enrichNode(document,'.ap-bday-person b','.ap-bday-person');
  patchBirthdayHeader();
}
let queued=false;
function queueEnrich(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enrichAll()})}
async function refresh(force=false){await loadMeta(force);enrichAll();return metaRows}
function bindCourseRefresh(){
  document.addEventListener('change',e=>{
    const s=e.target;if(!(s instanceof HTMLSelectElement))return;
    const v=String(s.value||'');if(!/^(capitanes|suboficiales|sargentos)-[a-f]-2026-2$/i.test(v))return;
    clearBirthdayCache();
    setTimeout(()=>window.AgendaBirthdays?.refresh?.(),0);
    setTimeout(queueEnrich,120);
  },true);
}
function boot(){installStyles();wrapRPC();bindCourseRefresh();loadMeta(false).then(enrichAll);new MutationObserver(()=>{wrapRPC();queueEnrich();if(!metaRows.length)loadMeta(false).then(enrichAll)}).observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.AgendaPersonMeta={version:VERSION,refresh,zodiac,selectedCourse};
})();
