(()=>{
'use strict';
const VERSION='2.23.9';
const SKEY='agenda-academic-session';
const CATALOG=[
 ['lector','👤','Sin función específica / Lector','lector',null],
 ['encargado_curso','🎓','Encargado de curso','encargado_curso',null],
 ['organizador_academico','🗂️','Organizador académico','administrador_academico',null],
 ['asistente_academico','🤝','Asistente académico','asistente_academico',null],
 ['disciplina','📋','Encargado de disciplina','lector','disciplina'],
 ['formaciones_servicio','🛡️','Encargado de formaciones / servicio','lector','formaciones_servicio'],
 ['tareas','✅','Encargado de tareas','lector','tareas'],
 ['examenes','📝','Encargado de exámenes','lector','examenes'],
 ['resumenes','📚','Encargado de resúmenes','lector','resumenes'],
 ['banco_preguntas','❓','Encargado de banco de preguntas','lector','banco_preguntas']
];
const LABEL=Object.fromEntries(CATALOG.map(([c,i,l])=>[c,`${i} ${l}`]));LABEL.administrador_general='⭐ Administrador general';
const ROLE=Object.fromEntries(CATALOG.map(([c,i,l,r])=>[c,r]));ROLE.administrador_general='administrador_general';
let assignmentMap=new Map(),patchQueued=false;
const session=()=>{try{return JSON.parse(localStorage.getItem(SKEY)||'null')}catch{return null}};
const token=()=>session()?.session_token||null;
const rpc=(fn,args={})=>window.academicRPC?.(fn,args);
const toast=m=>{try{window.toast?.(m)}catch{}};
function style(){if(document.getElementById('academicUnified2239Style'))return;const s=document.createElement('style');s.id='academicUnified2239Style';s.textContent=`
.ap-unified2239{margin:12px 0}.ap-unified2239 select{width:100%;box-sizing:border-box;padding:13px;border:1px solid #cdd8d1;border-radius:13px;background:#fff;font:inherit;font-weight:800;color:#263a2e}.ap-unified2239 small{display:block;margin-top:6px;color:#6c776f;line-height:1.35}.user-role.assignment2239{max-width:150px!important}.academic-user-row[data-role="disciplina"] .user-role,.academic-user-row[data-role="formaciones_servicio"] .user-role,.academic-user-row[data-role="tareas"] .user-role,.academic-user-row[data-role="examenes"] .user-role,.academic-user-row[data-role="resumenes"] .user-role,.academic-user-row[data-role="banco_preguntas"] .user-role{background:#fff2cf;color:#69500b}
`;document.head.appendChild(s)}
async function getCurrent(userId){return await rpc('academic_unified_assignment_get_v2239',{p_token:token(),p_user_id:userId})||'lector'}
async function listAssignments(){if(session()?.role!=='administrador_general'||!token())return;try{const rows=await rpc('academic_unified_assignments_list_v2239',{p_token:token()})||[];assignmentMap=new Map(rows.map(x=>[String(x.user_id),x.assignment_code]));patchRoster()}catch(e){console.warn('Asignaciones unificadas',e)}}
function optionHtml(current,isSelf){if(isSelf)return `<option value="administrador_general">⭐ Administrador general</option>`;return CATALOG.map(([c,i,l])=>`<option value="${c}" ${c===current?'selected':''}>${i} ${l}</option>`).join('')}
async function augment(userId){style();const form=document.getElementById('academicUserForm');if(!form||!userId||form.dataset.unified2239==='1')return;form.dataset.unified2239='1';form.querySelectorAll('.ap-functions-v2235,.ap-functions-v2236,.ap-unified2239').forEach(x=>x.remove());const original=form.querySelector('select[name="role"]');const originalLabel=original?.closest('label');const isSelf=String(userId)===String(session()?.user_id);let current='lector';try{current=await getCurrent(userId)}catch(e){console.warn(e)};
const box=document.createElement('label');box.className='ap-unified2239';box.innerHTML=`Asignación / función<select id="academicUnifiedAssignment2239" ${isSelf?'disabled':''}>${optionHtml(current,isSelf)}</select><small>Una sola asignación por integrante. Aquí se integran encargado de curso, organizador, asistente, disciplina y las funciones que se agreguen después.</small>`;
if(originalLabel)originalLabel.replaceWith(box);else{const active=form.querySelector('input[name="active"]')?.closest('label');active?.insertAdjacentElement('beforebegin',box)}
let hidden=form.querySelector('input[name="role"][data-unified-role]');if(!hidden){hidden=document.createElement('input');hidden.type='hidden';hidden.name='role';hidden.dataset.unifiedRole='1';form.appendChild(hidden)}hidden.value=ROLE[current]||'lector';
const select=box.querySelector('select');select.value=isSelf?'administrador_general':current;select.onchange=()=>{hidden.value=ROLE[select.value]||'lector'};
const baseSubmit=form.onsubmit;if(baseSubmit&&!baseSubmit.__unified2239){const wrapped=async function(e){e.preventDefault();const choice=select.value;hidden.value=ROLE[choice]||'lector';if(!isSelf){const submit=e.submitter||form.querySelector('button[type="submit"]');if(submit)submit.disabled=true;try{await rpc('academic_unified_assignment_set_v2239',{p_token:token(),p_user_id:userId,p_assignment:choice})}catch(err){console.error(err);toast('No se pudo guardar la asignación');if(submit)submit.disabled=false;return}}const out=baseSubmit.call(form,e);Promise.resolve(out).finally(()=>setTimeout(()=>{listAssignments();window.AgendaAdminRosterMeta?.refresh?.()},250));return out};wrapped.__unified2239=true;form.onsubmit=wrapped}}
function userIdFromRow(row){const s=row.getAttribute('onclick')||'';return (s.match(/openAcademicUserForm\(['"]([^'"]+)/)||[])[1]||''}
function patchFilter(){const select=document.getElementById('academicRoleFilter');if(!select||select.dataset.unified2239==='1')return;select.dataset.unified2239='1';const label=select.closest('label');if(label){for(const n of label.childNodes){if(n.nodeType===3&&/Rol/i.test(n.textContent||'')){n.textContent='Asignación ';break}}}select.innerHTML='<option value="">Todas</option>'+CATALOG.map(([c,i,l])=>`<option value="${c}">${i} ${l}</option>`).join('')}
function patchRoster(){patchFilter();document.querySelectorAll('.academic-user-row').forEach(row=>{const id=userIdFromRow(row);if(!id)return;const code=assignmentMap.get(String(id));if(!code)return;row.dataset.role=code;const badge=row.querySelector('.user-role');if(badge){badge.classList.add('assignment2239');badge.textContent=(LABEL[code]||code).replace(/^\S+\s/,'')}});document.querySelectorAll('.online-module-head h3,.academic-manage-card b').forEach(x=>{if(/Nómina y roles|Integrantes y roles/i.test(x.textContent||''))x.textContent='Nómina y funciones'});document.querySelectorAll('.academic-subnav button').forEach(x=>{if(/^👥\s*Roles/i.test(x.textContent||''))x.textContent='👥 Funciones'})}
function wrap(){if(typeof window.openAcademicUserForm!=='function'||window.openAcademicUserForm.__unified2239)return;const base=window.openAcademicUserForm;const w=function(id=''){const out=base.apply(this,arguments);if(id)setTimeout(()=>augment(id),0);return out};w.__unified2239=true;window.openAcademicUserForm=w}
function boot(){style();wrap();listAssignments();const root=document.getElementById('app')||document.body;new MutationObserver(()=>{if(patchQueued)return;patchQueued=true;requestAnimationFrame(()=>{patchQueued=false;wrap();patchRoster()})}).observe(root,{childList:true,subtree:true});window.addEventListener('pageshow',listAssignments)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.AgendaAcademicFunctions={version:VERSION,catalog:CATALOG,get:getCurrent,refresh:listAssignments,augmentUserForm:augment};
})();