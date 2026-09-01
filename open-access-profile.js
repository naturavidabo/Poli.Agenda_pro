(()=>{
'use strict';
const VERSION='2.21.3';
const PROFILE_KEY='agenda-user-identity-v2213';
const COHORT_KEY='agenda-install-cohort-v2213';
const PROMPTED_KEY='agenda-identity-prompted-v2213';
const DEVICE_KEY='agenda-open-device-id-v2212';

/* Detectar instalaciones anteriores ANTES de habilitar el acceso abierto. */
const hadPreviousInstall = localStorage.getItem('agenda-policial-activated')==='true' || !!localStorage.getItem(COHORT_KEY);
if(!localStorage.getItem(COHORT_KEY)) localStorage.setItem(COHORT_KEY,hadPreviousInstall?'existing':'new');
const cohort=()=>localStorage.getItem(COHORT_KEY)||'new';

function deviceId(){let id=localStorage.getItem(DEVICE_KEY);if(!id){id='ap_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,12);localStorage.setItem(DEVICE_KEY,id)}return id}
function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]))}
function toastMsg(msg){if(typeof window.toast==='function')window.toast(msg);else{const t=document.getElementById('toast');if(t){t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}}}
function openAccess(){try{localStorage.setItem('agenda-policial-activated','true');localStorage.setItem('agenda-policial-activation-type','open-access-2026');if(typeof state!=='undefined'){state.activated=true;save?.().catch?.(()=>{})}}catch{}}
openAccess();

function identity(){try{return JSON.parse(localStorage.getItem(PROFILE_KEY)||'null')}catch{return null}}
function identityComplete(){const p=identity();return !!(p?.grade&&p?.full_name&&p?.phone)}
function onlineSession(){try{return JSON.parse(localStorage.getItem('agenda-academic-session')||'null')}catch{return null}}
function onlineIdentityActive(){const s=onlineSession();if(!s)return false;if(s.active===false||s.module_enabled===false)return false;const token=String(s.session_token||'');return /^local:/.test(token)||/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)}
function serviceAuthorized(){return cohort()==='existing'||onlineIdentityActive()||identityComplete()}

function gradeOptions(selected=''){const grades=['Capitán','Teniente','Subteniente','Suboficial Mayor','Suboficial Superior','Suboficial Primero','Suboficial Segundo','Sargento Primero','Sargento Segundo','Sargento','Policía','Civil / Otro'];return grades.map(g=>`<option value="${esc(g)}" ${selected===g?'selected':''}>${esc(g)}</option>`).join('')}
function openIdentityForm(options={}){
  const required=!!options.required;
  document.getElementById('openProfileSheetV2212')?.remove();
  const p=identity()||{};
  const host=document.createElement('div');host.id='openProfileSheetV2212';host.className='open-profile-sheet';
  host.innerHTML=`<div class="open-profile-card"><button class="open-profile-x" type="button" data-close>×</button><span class="open-profile-kicker">IDENTIFICACIÓN AGENDA</span><h2>${required?'Identifíquese para abrir Servicios':'Configure su identificación'}</h2><p>${required?'Para consultar los grupos Alfa y Bravo necesitamos identificar al usuario de esta instalación.':'Esta identificación corresponde únicamente a las instalaciones nuevas. El resto de la Agenda Policial continúa disponible libremente.'}</p><label>Grado<select id="openProfileGrade"><option value="">Seleccione su grado</option>${gradeOptions(p.grade||'')}</select></label><label>Apellidos y nombres<input id="openProfileName" type="text" autocomplete="name" placeholder="Apellidos y nombres" value="${esc(p.full_name||'')}"></label><label>Número de celular<input id="openProfilePhone" inputmode="tel" autocomplete="tel" placeholder="Ej. 7XXXXXXX" value="${esc(p.phone||'')}"></label><div class="open-profile-actions">${required?'':'<button type="button" data-later>Ahora no</button>'}<button type="button" data-save>Guardar identificación</button></div><small>Los datos se guardan en este dispositivo para el acceso offline a Servicios. Cuando exista conexión, se sincronizan con Agenda Policial.</small></div>`;
  document.body.appendChild(host);
  const close=()=>host.remove();host.querySelector('[data-close]').onclick=close;host.querySelector('[data-later]')?.addEventListener('click',()=>{localStorage.setItem(PROMPTED_KEY,'1');close()});host.querySelector('[data-save]').onclick=()=>saveIdentity(host,options.onSuccess);
}
async function saveIdentity(host,onSuccess){
  const grade=String(host.querySelector('#openProfileGrade')?.value||'').trim();
  const fullName=String(host.querySelector('#openProfileName')?.value||'').replace(/\s+/g,' ').trim();
  const phone=String(host.querySelector('#openProfilePhone')?.value||'').replace(/[^0-9+]/g,'').trim();
  if(!grade)return toastMsg('Seleccione su grado');
  if(fullName.length<4)return toastMsg('Ingrese sus apellidos y nombres');
  if(phone.replace(/\D/g,'').length<7)return toastMsg('Revise el número de celular');
  const data={grade,full_name:fullName,phone,device_id:deviceId(),updated_at:new Date().toISOString(),synced:false};
  localStorage.setItem(PROFILE_KEY,JSON.stringify(data));localStorage.setItem(PROMPTED_KEY,'1');
  host.remove();installHomeCard();toastMsg('Identificación guardada');
  syncIdentity().catch(()=>{});
  if(typeof onSuccess==='function')setTimeout(onSuccess,120);
}
async function syncIdentity(){
  const p=identity();if(!p||p.synced||typeof academicRPC!=='function'||!navigator.onLine)return false;
  try{await academicRPC('app_register_identity',{p_device_id:p.device_id||deviceId(),p_grade:p.grade,p_full_name:p.full_name,p_phone:p.phone,p_source:'offline_service'});p.synced=true;p.synced_at=new Date().toISOString();localStorage.setItem(PROFILE_KEY,JSON.stringify(p));return true}catch(e){console.warn('Identificación pendiente de sincronización',e);return false}
}
function isHome(){try{return typeof state!=='undefined'&&state.view==='inicio'&&!!document.querySelector('main')}catch{return false}}
function installHomeCard(){
  const old=document.getElementById('openProfileAccessV2212');
  if(cohort()!=='new'||!isHome()){old?.remove();return}
  if(old)return;
  const main=document.querySelector('main');if(!main)return;
  const p=identity();const b=document.createElement('button');b.id='openProfileAccessV2212';b.className='open-profile-access';b.type='button';b.onclick=()=>openIdentityForm();
  b.innerHTML=`<span>👤</span><span><b>${identityComplete()?'Mi identificación':'Identificación de usuario'}</b><small>${identityComplete()?`${esc(p.grade)} · ${esc(p.full_name)}`:'Grado · nombre · celular'}</small></span><strong>›</strong>`;main.appendChild(b);
}
function maybePromptNewInstall(){if(cohort()!=='new'||identityComplete()||localStorage.getItem(PROMPTED_KEY)==='1')return;setTimeout(()=>{if(isHome()&&!document.getElementById('openProfileSheetV2212'))openIdentityForm()},1500)}
function serviceClickTarget(target){return target?.closest?.('#serviceGroupsTile,#serviceGroupsQuick,.sg-integrated,.sg-quick')||null}
function gateServices(event){const target=serviceClickTarget(event.target);if(!target||serviceAuthorized())return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();openIdentityForm({required:true,onSuccess:()=>window.AgendaServiceGroups?.open?.()})}
document.addEventListener('click',gateServices,true);

window.AgendaIdentity={version:VERSION,identity,identityComplete,onlineIdentityActive,serviceAuthorized,openIdentityForm,syncIdentity};
window.addEventListener('online',()=>syncIdentity());
window.addEventListener('DOMContentLoaded',()=>{openAccess();setTimeout(()=>{try{render?.()}catch{}installHomeCard();maybePromptNewInstall();syncIdentity()},150);let pending=false;new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;installHomeCard()})}).observe(document.body,{childList:true,subtree:true})});
})();