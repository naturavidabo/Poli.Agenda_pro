(()=>{
'use strict';
const VERSION='2.23.11';
function session(){try{return JSON.parse(localStorage.getItem('agenda-academic-session')||'null')}catch{return null}}
function isAdminGeneral(){return session()?.role==='administrador_general'}
function installStyle(){
  if(document.getElementById('serviceGroupsPrivacy22311'))return;
  const s=document.createElement('style');
  s.id='serviceGroupsPrivacy22311';
  s.textContent='#serviceGroupsModal .sg27-zodiac{display:none!important} html:not(.agenda-general-admin) #serviceGroupsModal .pm-zodiac,html:not(.agenda-general-admin) #serviceGroupsModal .pm-blood{display:none!important}';
  document.head.appendChild(s);
}
function protect(){
  const admin=isAdminGeneral();
  document.documentElement.classList.toggle('agenda-general-admin',admin);
  document.querySelectorAll('#serviceGroupsModal .sg27-zodiac').forEach(el=>el.remove());
  if(!admin)document.querySelectorAll('#serviceGroupsModal .pm-zodiac,#serviceGroupsModal .pm-blood').forEach(el=>el.remove());
}
let queued=false;
function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;protect()})}
function start(){installStyle();protect();new MutationObserver(queue).observe(document.body,{childList:true,subtree:true});window.addEventListener('storage',queue)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.AgendaServiceGroupsPrivacy={version:VERSION,refresh:queue};
})();
