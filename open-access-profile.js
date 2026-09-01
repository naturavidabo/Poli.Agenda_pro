(()=>{
'use strict';
const VERSION='2.21.2';
const PROFILE_KEY='agenda-open-profile-v2212';
const DISMISS_KEY='agenda-open-profile-dismissed-v2212';
const DEVICE_KEY='agenda-open-device-id-v2212';

function deviceId(){
  let id=localStorage.getItem(DEVICE_KEY);
  if(!id){id='ap_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,12);localStorage.setItem(DEVICE_KEY,id)}
  return id;
}
function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function toastMsg(msg){if(typeof window.toast==='function')window.toast(msg);else{const t=document.getElementById('toast');if(t){t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}}}
function openAccess(){
  try{
    localStorage.setItem('agenda-policial-activated','true');
    localStorage.setItem('agenda-policial-activation-type','open-access-2026');
    if(typeof state!=='undefined'){state.activated=true;save?.().catch?.(()=>{})}
  }catch{}
}
openAccess();

function saved(){try{return JSON.parse(localStorage.getItem(PROFILE_KEY)||'null')}catch{return null}}
function dismissed(){return localStorage.getItem(DISMISS_KEY)==='1'}
function isHome(){try{return typeof state!=='undefined'&&state.view==='inicio'&&!!document.querySelector('main')}catch{return false}}
function registered(){const p=saved();return !!(p?.phone||p?.travel_destination)}

function openProfileForm(){
  const old=document.getElementById('openProfileSheetV2212');old?.remove();
  const p=saved()||{};
  const host=document.createElement('div');host.id='openProfileSheetV2212';host.className='open-profile-sheet';
  host.innerHTML=`<div class="open-profile-card"><button class="open-profile-x" type="button" data-close>×</button><span class="open-profile-kicker">ACCESO ABIERTO</span><h2>Ayúdanos a mejorar Agenda Policial</h2><p>Si deseas, registra dos datos útiles para organizar futuras funciones de viaje y comunicación. No pedimos nombre ni C.I.</p><label>Celular<input id="openProfilePhone" inputmode="tel" autocomplete="tel" placeholder="Ej. 7XXXXXXX" value="${esc(p.phone||'')}"></label><label>¿A qué lugar viajas o piensas viajar?<input id="openProfileDestination" autocomplete="address-level2" placeholder="Ej. Santa Cruz, La Paz, Cochabamba…" value="${esc(p.travel_destination||'')}"></label><label class="open-profile-consent"><input id="openProfileConsent" type="checkbox"> <span>Acepto enviar estos datos voluntariamente para mejorar Agenda Policial.</span></label><div class="open-profile-actions"><button type="button" data-later>Ahora no</button><button type="button" data-save>Guardar</button></div><small>Podrás actualizar estos datos después. El acceso a la aplicación no depende de completar este formulario.</small></div>`;
  document.body.appendChild(host);
  host.querySelector('[data-close]').onclick=()=>host.remove();
  host.querySelector('[data-later]').onclick=()=>{localStorage.setItem(DISMISS_KEY,'1');host.remove()};
  host.querySelector('[data-save]').onclick=()=>submit(host);
}
async function submit(host){
  const phone=String(host.querySelector('#openProfilePhone')?.value||'').trim();
  const destination=String(host.querySelector('#openProfileDestination')?.value||'').trim();
  const consent=!!host.querySelector('#openProfileConsent')?.checked;
  if(!consent)return toastMsg('Marque la autorización para enviar los datos');
  if(!phone&&!destination)return toastMsg('Ingrese celular o destino de viaje');
  const cleanPhone=phone.replace(/[^0-9+]/g,'');
  if(cleanPhone&&cleanPhone.replace(/\D/g,'').length<7)return toastMsg('Revise el número de celular');
  if(destination.length>120)return toastMsg('El destino es demasiado largo');
  const btn=host.querySelector('[data-save]');if(btn){btn.disabled=true;btn.textContent='Guardando…'}
  try{
    if(typeof academicRPC!=='function')throw new Error('Conexión no disponible');
    await academicRPC('app_register_interest',{p_device_id:deviceId(),p_phone:cleanPhone||null,p_travel_destination:destination||null,p_consent_version:'v1'});
    localStorage.setItem(PROFILE_KEY,JSON.stringify({phone:cleanPhone,travel_destination:destination,updated_at:new Date().toISOString()}));
    localStorage.removeItem(DISMISS_KEY);
    host.remove();installHomeCard();toastMsg('Datos guardados. Gracias por apoyar la mejora de Agenda Policial');
  }catch(e){console.error(e);toastMsg('No se pudo enviar ahora. Intente con conexión a internet');if(btn){btn.disabled=false;btn.textContent='Guardar'}}
}
function installHomeCard(){
  const old=document.getElementById('openProfileAccessV2212');
  if(!isHome()){old?.remove();return}
  if(old)return;
  const main=document.querySelector('main');if(!main)return;
  const p=saved();
  const b=document.createElement('button');b.id='openProfileAccessV2212';b.className='open-profile-access';b.type='button';b.onclick=openProfileForm;
  b.innerHTML=`<span>◉</span><span><b>${registered()?'Datos de viaje':'Registro voluntario'}</b><small>${registered()?`${esc(p?.travel_destination||'Destino pendiente')} · actualizar datos`:'Celular y destino de viaje · acceso abierto'}</small></span><strong>›</strong>`;
  main.appendChild(b);
}
function maybePrompt(){
  if(registered()||dismissed())return;
  setTimeout(()=>{if(isHome()&&!document.getElementById('openProfileSheetV2212'))openProfileForm()},1800);
}
window.AgendaOpenAccess={openProfileForm,version:VERSION};
window.addEventListener('DOMContentLoaded',()=>{
  openAccess();setTimeout(()=>{try{render?.()}catch{}installHomeCard();maybePrompt()},120);
  let pending=false;new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;installHomeCard()})}).observe(document.body,{childList:true,subtree:true});
});
})();