(()=>{
'use strict';
const VERSION='2.18.2';
const VERSION_RE=/\bv?2\.(?:14\.1|16\.\d+|17\.\d+|18\.[01])\b/g;
function patchVersions(root=document.body){
  if(!root)return;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  let n;const list=[];
  while((n=walker.nextNode())){VERSION_RE.lastIndex=0;if(VERSION_RE.test(n.nodeValue||''))list.push(n)}
  list.forEach(node=>{VERSION_RE.lastIndex=0;node.nodeValue=(node.nodeValue||'').replace(VERSION_RE,m=>m.startsWith('v')?'v'+VERSION:VERSION)});
  const kicker=document.querySelector('.sg-kicker');if(kicker)kicker.textContent='GRUPOS DE SERVICIO · OFFLINE · v'+VERSION;
  try{if(window.AgendaServiceGroups)window.AgendaServiceGroups.version=VERSION}catch{}
}
function activeNavLabel(){return (document.querySelector('.bottom-nav .nav-btn.active')?.textContent||'').trim().toLowerCase()}
function isHome(){return activeNavLabel().includes('inicio')}
function isHorario(){return activeNavLabel().includes('horario')||/Horario/i.test(document.querySelector('main h2,.section-title')?.textContent||'')}
function ensureSentinel(){
  let s=document.getElementById('serviceGroupsTile');
  if(s && !s.dataset.sgSentinel){s.remove();s=null}
  if(!s){s=document.createElement('span');s.id='serviceGroupsTile';s.dataset.sgSentinel='1';s.hidden=true;document.body.appendChild(s)}
}
function hideBadFloating(){
  document.getElementById('serviceGroupsQuick')?.remove();
  document.querySelectorAll('.sg-quick').forEach(x=>x.remove());
  if(!isHorario())return;
  document.querySelectorAll('button').forEach(b=>{
    const t=(b.textContent||'').trim(),cs=getComputedStyle(b),r=b.getBoundingClientRect();
    const floating=cs.position==='fixed'||cs.position==='absolute';
    if(floating&&(t==='+'||/agregar|nuevo/i.test((b.getAttribute('aria-label')||'')+' '+(b.title||'')))&&r.width>=45&&r.height>=45)b.style.setProperty('display','none','important');
  });
}
function installGroupAccess(){
  const old=document.getElementById('serviceGroupsHomeAccess');
  if(!isHome()){old?.remove();return}
  if(typeof window.AgendaServiceGroups?.open!=='function')return;
  const main=document.querySelector('.app>main,main');if(!main)return;
  if(old&&old.parentElement===main)return;
  old?.remove();
  const card=document.createElement('button');card.id='serviceGroupsHomeAccess';card.type='button';card.className='service-groups-home-access';
  card.innerHTML='<span class="sgha-icon" aria-hidden="true">👥</span><span class="sgha-copy"><b>Mi grupo de servicio</b><small>Alfa y Bravo · nómina completa · offline</small></span><span class="sgha-arrow" aria-hidden="true">›</span>';
  card.onclick=()=>window.AgendaServiceGroups.open();
  main.prepend(card);
}
function styleGroupPage(){
  const modal=document.getElementById('serviceGroupsModal');
  document.body.classList.toggle('sg-page-open',!!modal);
  if(!modal)return;
  const close=modal.querySelector('.sg-close');if(close){close.textContent='←';close.setAttribute('aria-label','Volver')}
  const panel=modal.querySelector('.sg-panel');if(panel)panel.classList.add('sg-page-panel');
}
function maintain(){patchVersions();ensureSentinel();hideBadFloating();installGroupAccess();styleGroupPage();document.body.classList.toggle('core-horario-2181',isHorario())}
async function checkVersion(){
  try{const r=await fetch('./version.json?t='+Date.now(),{cache:'no-store'});if(!r.ok)return;const j=await r.json(),remote=j.appVersion||j.version;if(remote&&remote!==VERSION){const key='agenda-reload-'+remote;if(!sessionStorage.getItem(key)){sessionStorage.setItem(key,'1');location.replace('./index.html?v='+encodeURIComponent(remote)+'&t='+Date.now())}}}catch{}
}
window.addEventListener('DOMContentLoaded',()=>{
  maintain();checkVersion();
  let queued=false;
  new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;maintain()})}).observe(document.body,{childList:true,subtree:true,characterData:true});
  window.addEventListener('online',checkVersion);setInterval(checkVersion,5*60*1000);
});
window.AgendaCore2181={version:VERSION,refresh:maintain,checkVersion};
})();