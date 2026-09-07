(()=>{
'use strict';
const VERSION='2.23.5';
const SKEY='agenda-academic-session';
const ROLE_BACKUP='agenda-discipline-role-backup-v2235';
const FUNCTIONS=[
  ['disciplina','📋','Encargado de disciplina'],
  ['formaciones_servicio','🛡️','Encargado de formaciones / servicio'],
  ['tareas','✅','Encargado de tareas'],
  ['examenes','📝','Encargado de exámenes'],
  ['resumenes','📚','Encargado de resúmenes'],
  ['banco_preguntas','❓','Encargado de banco de preguntas']
];
const session=()=>{try{return JSON.parse(localStorage.getItem(SKEY)||'null')}catch{return null}};
const token=()=>session()?.session_token||null;
const rpc=(fn,args={})=>window.academicRPC?.(fn,args);
const toast=m=>{try{window.toast?.(m)}catch{}};
function style(){if(document.getElementById('academicFunctions2235Style'))return;const s=document.createElement('style');s.id='academicFunctions2235Style';s.textContent=`
.ap-functions-v2235{margin:14px 0;padding:13px;border:1px solid #d6e0d8;border-radius:15px;background:#f7faf7}.ap-functions-v2235 h3{margin:0 0 3px;font-size:14px;color:#21462f}.ap-functions-v2235>small{display:block;color:#6c776f;line-height:1.35;margin-bottom:10px}.ap-function-grid-v2235{display:grid;grid-template-columns:1fr 1fr;gap:7px}.ap-function-option-v2235{display:flex!important;align-items:center;gap:8px!important;margin:0!important;padding:9px 10px;border:1px solid #d9e2da;border-radius:12px;background:#fff;font-size:11px!important;font-weight:850!important}.ap-function-option-v2235 input{width:18px!important;height:18px!important;margin:0!important}.ap-function-save-v2235{width:100%;margin-top:10px}.ap-function-note-v2235{margin-top:8px;font-size:10px;color:#6c776f}.ap-function-status-v2235{display:inline-flex;align-items:center;gap:5px;margin-top:7px;padding:5px 8px;border-radius:999px;background:#e8f3eb;color:#27623a;font-size:9px;font-weight:900}@media(max-width:520px){.ap-function-grid-v2235{grid-template-columns:1fr}}
`;document.head.appendChild(s)}
async function getFunctions(userId){if(!token()||!rpc)return[];try{const rows=await rpc('academic_user_functions_get_v2235',{p_token:token(),p_user_id:userId||null});return (rows||[]).map(x=>x.function_code).filter(Boolean)}catch(e){console.warn('Funciones académicas: lectura',e);return[]}}
async function setFunctions(userId,codes){if(!userId||!token())throw new Error('Integrante no disponible');await rpc('academic_user_functions_set_v2235',{p_token:token(),p_user_id:userId,p_functions:codes})}
async function augmentUserForm(userId){
  style();
  const form=document.getElementById('academicUserForm');
  if(!form||!userId||form.querySelector('.ap-functions-v2235'))return;
  const box=document.createElement('section');box.className='ap-functions-v2235';
  box.innerHTML=`<h3>Funciones asignadas</h3><small>Estas funciones complementan el rol de acceso. Una misma persona puede tener más de una responsabilidad.</small><div class="ap-function-grid-v2235">${FUNCTIONS.map(([code,icon,label])=>`<label class="ap-function-option-v2235"><input type="checkbox" data-function="${code}"><span>${icon} ${label}</span></label>`).join('')}</div><button type="button" class="btn academic-main-btn ap-function-save-v2235">Guardar funciones</button><div class="ap-function-note-v2235">Disciplina: los borradores son privados para su encargado, el encargado de curso y el administrador general. Al publicar, pasan a ser visibles para el paralelo.</div>`;
  const active=form.querySelector('input[name="active"]')?.closest('label');
  if(active)active.insertAdjacentElement('beforebegin',box);else form.querySelector('.form-actions,button[type="submit"]')?.insertAdjacentElement('beforebegin',box);
  const selected=new Set(await getFunctions(userId));box.querySelectorAll('[data-function]').forEach(c=>c.checked=selected.has(c.dataset.function));
  box.querySelector('.ap-function-save-v2235').onclick=async()=>{const btn=box.querySelector('.ap-function-save-v2235');const codes=[...box.querySelectorAll('[data-function]:checked')].map(x=>x.dataset.function);btn.disabled=true;try{await setFunctions(userId,codes);toast('Funciones actualizadas');box.querySelector('.ap-function-status-v2235')?.remove();const ok=document.createElement('span');ok.className='ap-function-status-v2235';ok.textContent='✓ Funciones guardadas';box.appendChild(ok)}catch(e){console.error(e);toast('No se pudieron guardar las funciones')}finally{btn.disabled=false}};
}
function wrapUserEditor(){
  if(typeof window.openAcademicUserForm!=='function'||window.openAcademicUserForm.__functions2235)return;
  const base=window.openAcademicUserForm;
  const wrapped=function(id=''){const out=base.apply(this,arguments);if(id)setTimeout(()=>augmentUserForm(id),0);return out};
  wrapped.__functions2235=true;window.openAcademicUserForm=wrapped;
}
function restoreDisciplineRole(){
  try{const raw=sessionStorage.getItem(ROLE_BACKUP);if(!raw)return;const backup=JSON.parse(raw);if(backup)localStorage.setItem(SKEY,JSON.stringify(backup));sessionStorage.removeItem(ROLE_BACKUP)}catch{}
}
async function bridgeDisciplineOpen(){
  const s=session();if(!s)return window.AgendaDisciplineQuick?.open?.();
  const normal=['administrador_general','encargado_curso','administrador_academico','asistente_academico','lector'].includes(s.role);
  let canManage=false;try{canManage=Boolean(await rpc('academic_discipline_can_manage_v2235',{p_token:s.session_token}))}catch{}
  if(canManage&&!['administrador_general','encargado_curso','administrador_academico'].includes(s.role)){
    sessionStorage.setItem(ROLE_BACKUP,JSON.stringify(s));
    localStorage.setItem(SKEY,JSON.stringify({...s,role:'encargado_curso',functional_role_bridge:'disciplina'}));
  }
  const out=window.AgendaDisciplineQuick?.open?.();
  if(!canManage&&s.role==='lector'&&normal)return out;
  return out;
}
function installDisciplineBridge(){
  if(!window.AgendaDisciplineQuick?.open||window.AgendaDisciplineQuick.open.__functions2235)return;
  const base=window.AgendaDisciplineQuick.open;
  window.AgendaDisciplineQuick._baseOpenV2235=base;
  const wrapped=async function(){const s=session();if(!s)return base();let can=false;try{can=Boolean(await rpc('academic_discipline_can_manage_v2235',{p_token:s.session_token}))}catch{}if(can&&!['administrador_general','encargado_curso','administrador_academico'].includes(s.role)){sessionStorage.setItem(ROLE_BACKUP,JSON.stringify(s));localStorage.setItem(SKEY,JSON.stringify({...s,role:'encargado_curso',functional_role_bridge:'disciplina'}))}return base()};
  wrapped.__functions2235=true;window.AgendaDisciplineQuick.open=wrapped;
}
function observeShell(){new MutationObserver(()=>{if(!document.getElementById('disciplineQuickShell'))restoreDisciplineRole()}).observe(document.body,{childList:true,subtree:false})}
function boot(){restoreDisciplineRole();style();wrapUserEditor();installDisciplineBridge();observeShell();const root=document.getElementById('app')||document.body;new MutationObserver(()=>{wrapUserEditor();installDisciplineBridge()}).observe(root,{childList:true,subtree:true});window.addEventListener('pagehide',restoreDisciplineRole)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.AgendaAcademicFunctions={version:VERSION,get:getFunctions,set:setFunctions,augmentUserForm};
})();